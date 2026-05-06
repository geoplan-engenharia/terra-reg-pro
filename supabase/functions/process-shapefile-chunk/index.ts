// Edge function: process-shapefile-chunk
// Processa um lote de feições do shapefile já enviado para o storage.
// Input:  { job_id: string, offset: number, limit: number }
// Output: { processed, inserted, failed, total, hasMore, nextOffset }
//
// Estratégia: re-baixa e re-parseia o ZIP a cada chunk (edge functions são
// stateless). Custa ~10-20s de parse por chunk para arquivos de 200MB, mas
// cabe no timeout e mantém uso de memória estável (não acumula entre chunks).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import shp from "https://esm.sh/shpjs@4.0.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface ChunkPayload {
  job_id: string;
  offset: number;
  limit: number;
}

function areaHa(geom: any): number | null {
  try {
    const R = 6378137;
    const toRad = (d: number) => (d * Math.PI) / 180;
    const ringArea = (ring: number[][]): number => {
      let area = 0;
      for (let i = 0; i < ring.length - 1; i++) {
        const [lon1, lat1] = ring[i];
        const [lon2, lat2] = ring[i + 1];
        area += toRad(lon2 - lon1) * (2 + Math.sin(toRad(lat1)) + Math.sin(toRad(lat2)));
      }
      return Math.abs((area * R * R) / 2);
    };
    let total = 0;
    if (geom.type === "Polygon") total = ringArea(geom.coordinates[0]);
    else if (geom.type === "MultiPolygon") for (const poly of geom.coordinates) total += ringArea(poly[0]);
    else return null;
    return Math.round((total / 10000) * 100) / 100;
  } catch { return null; }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authHeader = req.headers.get("Authorization") ?? "";

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userRes } = await userClient.auth.getUser();
    if (!userRes.user) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: profile } = await admin
      .from("profiles").select("is_super_admin").eq("id", userRes.user.id).maybeSingle();
    if (!profile?.is_super_admin) {
      return new Response(JSON.stringify({ error: "Apenas super admin" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { job_id, offset, limit } = (await req.json()) as ChunkPayload;
    if (!job_id) throw new Error("job_id é obrigatório");
    const safeLimit = Math.min(Math.max(limit ?? 500, 50), 1000);
    const safeOffset = Math.max(offset ?? 0, 0);

    const { data: job, error: jobErr } = await admin
      .from("integration_jobs").select("*").eq("id", job_id).single();
    if (jobErr || !job) throw new Error("Job não encontrado");

    // Aborta se cancelado
    if (job.status === "cancelado") {
      return new Response(JSON.stringify({
        processed: 0, inserted: 0, failed: 0,
        total: job.total_features ?? 0, hasMore: false, nextOffset: safeOffset,
        cancelled: true,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!job.layer_id) throw new Error("Job sem layer_id (rode start primeiro)");
    if (!job.storage_path) throw new Error("Job sem storage_path");

    // Download + parse
    const { data: fileBlob, error: dlErr } = await admin.storage
      .from("integration-uploads").download(job.storage_path);
    if (dlErr || !fileBlob) throw new Error(`Falha no download: ${dlErr?.message}`);
    const buffer = await fileBlob.arrayBuffer();

    const parsed: any = await shp(buffer);
    const collections = Array.isArray(parsed) ? parsed : [parsed];
    const allFeatures: any[] = [];
    for (const fc of collections) if (fc?.features?.length) allFeatures.push(...fc.features);
    const total = allFeatures.length;

    const slice = allFeatures.slice(safeOffset, safeOffset + safeLimit);
    const layerKey = job.storage_path.split("/")[0]; // provider.key

    // Constrói rows do lote
    const rows: any[] = [];
    let failed = 0;
    for (const f of slice) {
      try {
        if (!f?.geometry) { failed++; continue; }
        const props = f.properties ?? {};
        const externalId = props.cod_imovel ?? props.COD_IMOVEL ?? props.car_code ?? props.CAR ?? null;
        const muni = props.municipio ?? props.MUNICIPIO ?? props.NM_MUN ?? null;
        const uf = props.uf ?? props.UF ?? props.SIGLA_UF ?? job.uf ?? null;
        rows.push({
          layer_id: job.layer_id,
          data_source_key: layerKey,
          external_id: externalId,
          geometry_geojson: f.geometry,
          properties_json: props,
          municipality: muni,
          uf,
          area_ha: areaHa(f.geometry),
        });
      } catch {
        failed++;
      }
    }

    let inserted = 0;
    if (rows.length > 0) {
      // Insere em sub-lotes de 200 para evitar payload grande
      const SUB = 200;
      for (let i = 0; i < rows.length; i += SUB) {
        const part = rows.slice(i, i + SUB);
        const { error: insErr } = await admin.from("data_layer_features").insert(part);
        if (insErr) {
          console.error("[chunk] insert error:", insErr.message);
          failed += part.length;
        } else {
          inserted += part.length;
        }
      }
    }

    const newProcessed = (job.processed_features ?? 0) + slice.length;
    const newFailed = (job.failed_features ?? 0) + failed;
    const nextOffset = safeOffset + slice.length;
    const hasMore = nextOffset < total;

    await admin.from("integration_jobs").update({
      processed_features: newProcessed,
      failed_features: newFailed,
      total_features: total,
      log: `Processadas ${newProcessed.toLocaleString("pt-BR")}/${total.toLocaleString("pt-BR")} feições${newFailed > 0 ? ` (${newFailed} com erro)` : ""}.`,
    }).eq("id", job.id);

    return new Response(JSON.stringify({
      processed: slice.length,
      inserted,
      failed,
      total,
      hasMore,
      nextOffset,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err) {
    const message = (err as Error).message ?? String(err);
    console.error("process-shapefile-chunk error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
