import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

// POST /api/public/pregenerate-tiles  { job_id, restart? }
// Pré-gera os recortes dos zooms 5–12 que cruzam a extensão da camada e grava
// no bucket vector-tiles-cache (layer_id/z/x/y.pbf), pulando recortes vazios.
// Roda em lotes com orçamento de tempo; o progresso fica em integration_jobs
// (tiles_done/tiles_total), então cada chamada continua de onde a anterior parou.
// Exige Bearer de um super admin (verificado no próprio handler).

const Z_MIN = 5, Z_MAX = 12, R = 20037508.342789244;
const TIME_BUDGET_MS = 20_000, CONCURRENCY = 6;
const UUID_RE = /^[0-9a-f-]{36}$/i;

type Ext = { xmin: number; ymin: number; xmax: number; ymax: number };
type Range = { z: number; x0: number; x1: number; y0: number; y1: number; count: number };

function tileRanges(e: Ext): Range[] {
  const out: Range[] = [];
  for (let z = Z_MIN; z <= Z_MAX; z++) {
    const n = 2 ** z;
    const tx = (X: number) => Math.min(n - 1, Math.max(0, Math.floor(((X + R) / (2 * R)) * n)));
    const ty = (Y: number) => Math.min(n - 1, Math.max(0, Math.floor(((R - Y) / (2 * R)) * n)));
    const x0 = tx(e.xmin), x1 = tx(e.xmax), y0 = ty(e.ymax), y1 = ty(e.ymin);
    out.push({ z, x0, x1, y0, y1, count: (x1 - x0 + 1) * (y1 - y0 + 1) });
  }
  return out;
}

function tileAt(ranges: Range[], idx: number) {
  for (const r of ranges) {
    if (idx < r.count) {
      const w = r.x1 - r.x0 + 1;
      return { z: r.z, x: r.x0 + (idx % w), y: r.y0 + Math.floor(idx / w) };
    }
    idx -= r.count;
  }
  return null;
}

function hexToBytes(hex: string): Uint8Array {
  const h = hex.startsWith("\\x") ? hex.slice(2) : hex;
  const out = new Uint8Array(h.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(h.substr(i * 2, 2), 16);
  return out;
}

const json = (b: unknown, status = 200) => Response.json(b, { status, headers: { "Cache-Control": "no-store" } });

export const Route = createFileRoute("/api/public/pregenerate-tiles")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const started = Date.now();
        const token = (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
        if (!token) return json({ error: "Não autenticado" }, 401);
        const url = process.env.SUPABASE_URL!;
        const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const user: any = createClient(url, key, {
          global: { headers: { Authorization: `Bearer ${token}` } },
          auth: { persistSession: false, autoRefreshToken: false },
        });
        const { data: claims } = await user.auth.getClaims(token);
        if (!claims?.claims?.sub) return json({ error: "Não autenticado" }, 401);
        const { data: isAdmin } = await user.rpc("is_super_admin");
        if (!isAdmin) return json({ error: "Apenas super admin" }, 403);

        let body: { job_id?: string; restart?: boolean };
        try { body = await request.json(); } catch { return json({ error: "JSON inválido" }, 400); }
        if (!body.job_id || !UUID_RE.test(body.job_id)) return json({ error: "job_id inválido" }, 400);

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const admin = supabaseAdmin as any;
        const { data: job } = await admin.from("integration_jobs")
          .select("id, layer_id, status, tiles_done, tiles_saved").eq("id", body.job_id).maybeSingle();
        if (!job?.layer_id) return json({ error: "Execução sem camada" }, 400);
        if (job.status !== "sucesso") return json({ error: "Só é possível gerar recortes de execuções concluídas" }, 400);

        try {
          const { data: extRows, error: extErr } = await user.rpc("get_layer_extent_3857", { _layer_id: job.layer_id });
          if (extErr) throw new Error(extErr.message);
          const ext = (extRows as Ext[] | null)?.[0];
          if (!ext) {
            await admin.from("integration_jobs").update({ tiles_status: "concluido", tiles_done: 0, tiles_total: 0 }).eq("id", job.id);
            return json({ done: 0, total: 0, saved: 0, finished: true });
          }
          const ranges = tileRanges(ext);
          const total = ranges.reduce((s, r) => s + r.count, 0);
          let done = body.restart ? 0 : Math.min(job.tiles_done ?? 0, total);
          let saved = body.restart ? 0 : (job.tiles_saved ?? 0);
          await admin.from("integration_jobs")
            .update({ tiles_status: "gerando", tiles_total: total, tiles_done: done, tiles_saved: saved }).eq("id", job.id);

          const bucket = admin.storage.from("vector-tiles-cache");
          const one = async (idx: number) => {
            const t = tileAt(ranges, idx)!;
            // Usa o cliente do super admin: gera também camadas ocultas.
            const { data, error } = await user.rpc("get_vector_tile_bin", { _layer_id: job.layer_id, _z: t.z, _x: t.x, _y: t.y });
            if (error) throw new Error(`z${t.z}/${t.x}/${t.y}: ${error.message}`);
            if (data == null) return 0;
            const bytes = hexToBytes(String(data));
            if (bytes.length === 0) return 0; // vazio: pula
            const { error: upErr } = await bucket.upload(`${job.layer_id}/${t.z}/${t.x}/${t.y}.pbf`, bytes, {
              contentType: "application/x-protobuf", upsert: true,
            });
            if (upErr) throw new Error(upErr.message);
            return 1;
          };

          while (done < total && Date.now() - started < TIME_BUDGET_MS) {
            const batch: number[] = [];
            for (let i = done; i < Math.min(total, done + CONCURRENCY); i++) batch.push(i);
            const res = await Promise.all(batch.map(one));
            saved += res.reduce((a, b) => a + b, 0);
            done += batch.length;
            await admin.from("integration_jobs").update({ tiles_done: done, tiles_saved: saved }).eq("id", job.id);
          }
          const finished = done >= total;
          await admin.from("integration_jobs")
            .update({ tiles_status: finished ? "concluido" : "parcial", tiles_done: done, tiles_saved: saved }).eq("id", job.id);
          return json({ done, total, saved, finished });
        } catch (e) {
          await admin.from("integration_jobs").update({ tiles_status: "parcial" }).eq("id", job.id);
          console.error("pregenerate-tiles", e);
          return json({ error: (e as Error).message }, 500);
        }
      },
    },
  },
});
