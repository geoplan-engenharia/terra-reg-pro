// Edge function: process-shapefile-chunk
// Processa apenas as feições enviadas pelo frontend, sem baixar/parsear arquivos do storage.
// Input:  { job_id: string, layer_id: string, features: Feature[], offset: number, total: number }
// Output: { processed, inserted, failed, total, hasMore, nextOffset }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface ChunkPayload {
  job_id: string;
  layer_id: string;
  features: any[];
  offset: number;
  total: number;
}

function firstValue(props: Record<string, any>, keys: string[]): any {
  for (const key of keys) {
    const value = props[key];
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return null;
}

function numericValue(value: any): number | null {
  if (value === undefined || value === null || value === "") return null;
  const parsed = typeof value === "number" ? value : Number(String(value).replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
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

    const { job_id, layer_id, features, offset, total } = (await req.json()) as ChunkPayload;
    if (!job_id) throw new Error("job_id é obrigatório");
    if (!layer_id) throw new Error("layer_id é obrigatório");
    if (!Array.isArray(features)) throw new Error("features deve ser um array");
    if (features.length > 500) throw new Error("Máximo de 500 feições por lote");
    const safeOffset = Math.max(offset ?? 0, 0);
    const safeTotal = Math.max(total ?? features.length, features.length);

    const { data: job, error: jobErr } = await admin
      .from("integration_jobs").select("*").eq("id", job_id).single();
    if (jobErr || !job) throw new Error("Job não encontrado");

    // Aborta se cancelado
    if (job.status === "cancelado") {
      return new Response(JSON.stringify({
        processed: 0, inserted: 0, failed: 0,
        total: job.total_features ?? safeTotal, hasMore: false, nextOffset: safeOffset,
        cancelled: true,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (job.layer_id && job.layer_id !== layer_id) throw new Error("layer_id não pertence ao job");

    if (safeOffset === 0) {
      await admin.from("integration_jobs").update({
        total_features: safeTotal,
        log: `Total identificado: ${safeTotal.toLocaleString("pt-BR")} feições. Processando em lotes...`,
      }).eq("id", job.id);
    }

    const { data: layerRow } = await admin
      .from("data_layers").select("data_source_key").eq("id", layer_id).maybeSingle();
    if (!layerRow?.data_source_key) throw new Error("Camada não encontrada");
    const layerKey = layerRow.data_source_key;

    // Constrói rows do lote
    const rows: any[] = [];
    let failed = 0;
    for (const f of features) {
      try {
        if (!f?.geometry) { failed++; continue; }
        const props = f.properties ?? {};
        const externalId = firstValue(props, ["cod_imovel", "COD_IMOVEL", "car_code", "CAR", "id", "ID", "external_id"]);
        const muni = firstValue(props, ["municipality", "municipio", "MUNICIPIO", "NM_MUN", "NOM_MUNICI", "nome_mun"]);
        const uf = firstValue(props, ["uf", "UF", "SIGLA_UF", "estado", "ESTADO"]) ?? job.uf ?? null;
        const area = numericValue(firstValue(props, ["area_ha", "AREA_HA", "num_area", "NUM_AREA", "AREA", "area"])) ?? areaHa(f.geometry);
        rows.push({
          layer_id,
          data_source_key: layerKey,
          external_id: externalId,
          geometry_geojson: f.geometry,
          properties_json: props,
          municipality: muni,
          uf,
          area_ha: area,
        });
      } catch {
        failed++;
      }
    }

    let inserted = 0;
    if (rows.length > 0) {
      // Insere em sub-lotes de 100 para manter payload e CPU baixos
      const SUB = 100;
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

    const processedNow = features.length;
    const newProcessed = Math.max((job.processed_features ?? 0) + processedNow, safeOffset + processedNow);
    const newFailed = (job.failed_features ?? 0) + failed;
    const nextOffset = safeOffset + processedNow;
    const hasMore = nextOffset < safeTotal;

    await admin.from("integration_jobs").update({
      processed_features: newProcessed,
      failed_features: newFailed,
      total_features: safeTotal,
      log: `Processadas ${newProcessed.toLocaleString("pt-BR")}/${safeTotal.toLocaleString("pt-BR")} feições${newFailed > 0 ? ` (${newFailed} com erro)` : ""}.`,
    }).eq("id", job.id);

    return new Response(JSON.stringify({
      processed: processedNow,
      inserted,
      failed,
      total: safeTotal,
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
