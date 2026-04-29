// Edge function: ingest-sicar
// Recebe um shapefile/ZIP do SICAR (já enviado para o bucket integration-uploads),
// parseia para GeoJSON, popula data_layer_features e cruza com rural_properties.
// CORS aberto; auth obrigatória; apenas super_admin pode acionar.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
// shpjs aceita ArrayBuffer de um .zip contendo .shp/.dbf/.prj
import shp from "https://esm.sh/shpjs@4.0.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface IngestPayload {
  job_id: string;
}

function centroidOf(geom: any): [number | null, number | null] {
  try {
    let coords: number[][] = [];
    if (geom.type === "Polygon") {
      coords = geom.coordinates[0];
    } else if (geom.type === "MultiPolygon") {
      coords = geom.coordinates[0][0];
    } else {
      return [null, null];
    }
    let sx = 0, sy = 0;
    for (const [x, y] of coords) { sx += x; sy += y; }
    return [sy / coords.length, sx / coords.length];
  } catch {
    return [null, null];
  }
}

// Aproximação de área via fórmula esférica (em hectares)
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
    if (geom.type === "Polygon") {
      total = ringArea(geom.coordinates[0]);
    } else if (geom.type === "MultiPolygon") {
      for (const poly of geom.coordinates) total += ringArea(poly[0]);
    } else return null;
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

    // Verifica usuário e papel super_admin
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

    const body = (await req.json()) as IngestPayload;
    if (!body.job_id) throw new Error("job_id é obrigatório");

    // Busca job + provider
    const { data: job, error: jobErr } = await admin
      .from("integration_jobs").select("*").eq("id", body.job_id).single();
    if (jobErr || !job) throw new Error("Job não encontrado");

    const { data: provider } = await admin
      .from("integration_providers").select("*").eq("id", job.provider_id).single();
    if (!provider) throw new Error("Provider não encontrado");
    if (!job.storage_path) throw new Error("Job sem storage_path");

    await admin.from("integration_jobs").update({
      status: "processando", started_at: new Date().toISOString(),
      log: "Baixando arquivo...",
    }).eq("id", job.id);

    // Download do arquivo
    const { data: fileBlob, error: dlErr } = await admin.storage
      .from("integration-uploads").download(job.storage_path);
    if (dlErr || !fileBlob) throw new Error(`Falha no download: ${dlErr?.message}`);

    const buffer = await fileBlob.arrayBuffer();
    await admin.from("integration_jobs").update({
      log: `Arquivo baixado (${(buffer.byteLength / 1024 / 1024).toFixed(2)} MB). Parseando shapefile...`,
    }).eq("id", job.id);

    // Parse shapefile (zip contendo .shp/.dbf/.prj)
    let parsed: any;
    try {
      parsed = await shp(buffer);
    } catch (e) {
      throw new Error(`Falha ao parsear shapefile: ${(e as Error).message}`);
    }

    // shp() pode retornar FeatureCollection ou array delas
    const collections = Array.isArray(parsed) ? parsed : [parsed];
    const features: any[] = [];
    for (const fc of collections) {
      if (fc?.features?.length) features.push(...fc.features);
    }
    if (features.length === 0) throw new Error("Nenhuma feature encontrada no shapefile");

    await admin.from("integration_jobs").update({
      log: `Shapefile parseado: ${features.length} feições. Criando camada...`,
    }).eq("id", job.id);

    // Upsert da camada (data_layers) — chave única é data_source_key
    const layerKey = provider.data_source_key ?? `sicar-${job.uf?.toLowerCase() ?? "br"}`;
    const layerName = `SICAR — ${job.uf ?? "Federal"}${job.source_label ? ` (${job.source_label})` : ""}`;

    // Garante data_source no catálogo
    await admin.from("data_sources").upsert({
      key: layerKey,
      name: `SICAR ${job.uf ?? ""}`.trim(),
      source_kind: "geoespacial",
      source_type: "arquivo",
      category: "ambiental",
      status: "ativa",
      enabled: true,
      last_sync_at: new Date().toISOString(),
    }, { onConflict: "key" });

    const { data: layer, error: layerErr } = await admin.from("data_layers").upsert({
      data_source_key: layerKey,
      name: layerName,
      layer_type: provider.layer_type ?? "car",
      geometry_type: "polygon",
      status: "ativa",
      color: provider.default_color ?? "#5fbb6f",
      visible_to_users: true,
      last_sync_at: new Date().toISOString(),
    }, { onConflict: "data_source_key" }).select().single();
    if (layerErr) throw new Error(`Erro ao criar camada: ${layerErr.message}`);

    // Log explícito do total parseado para diagnóstico (descobrir se shpjs truncou)
    console.log(`[ingest-sicar] parsed features=${features.length}`);
    await admin.from("integration_jobs").update({
      log: `Shapefile parseado: ${features.length} feições totais. Iniciando ingestão...`,
    }).eq("id", job.id);

    // Limpa features antigas
    await admin.from("data_layer_features").delete().eq("layer_id", layer.id);

    // Stream-insere em lotes para evitar duplicar tudo em memória.
    // Constrói cada linha sob demanda e libera referência da feature original.
    const BATCH = 300;
    const total = features.length;
    let inserted = 0;
    let batch: any[] = [];

    const flush = async () => {
      if (batch.length === 0) return;
      const toInsert = batch;
      batch = [];
      const { error: insErr } = await admin.from("data_layer_features").insert(toInsert);
      if (insErr) throw new Error(`Erro ao inserir lote: ${insErr.message}`);
      inserted += toInsert.length;
    };

    for (let i = 0; i < total; i++) {
      const f = features[i];
      features[i] = null as any; // libera referência para GC
      if (!f?.geometry) continue;
      const props = f.properties ?? {};
      const externalId = props.cod_imovel ?? props.COD_IMOVEL ?? props.car_code ?? props.CAR ?? null;
      const muni = props.municipio ?? props.MUNICIPIO ?? props.NM_MUN ?? null;
      const uf = props.uf ?? props.UF ?? props.SIGLA_UF ?? job.uf ?? null;
      batch.push({
        layer_id: layer.id,
        data_source_key: layerKey,
        external_id: externalId,
        geometry_geojson: f.geometry,
        properties_json: props,
        municipality: muni,
        uf,
        area_ha: areaHa(f.geometry),
      });

      if (batch.length >= BATCH) {
        await flush();
        if (inserted % 3000 === 0) {
          await admin.from("integration_jobs").update({
            features_imported: inserted,
            log: `Inseridas ${inserted}/${total} feições...`,
          }).eq("id", job.id);
        }
      }
    }
    await flush();

    // Cruza com rural_properties via código CAR
    await admin.from("integration_jobs").update({
      log: `Cruzando ${inserted} feições com imóveis cadastrados...`,
    }).eq("id", job.id);

    const { data: linked } = await admin.rpc("link_car_features_to_properties", {
      _layer_id: layer.id,
    });

    await admin.from("integration_jobs").update({
      status: "sucesso",
      features_imported: inserted,
      properties_linked: linked ?? 0,
      layer_id: layer.id,
      finished_at: new Date().toISOString(),
      log: `Sucesso: ${inserted} feições importadas, ${linked ?? 0} imóveis atualizados.`,
    }).eq("id", job.id);

    return new Response(JSON.stringify({
      ok: true, layer_id: layer.id, features: inserted, linked: linked ?? 0,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err) {
    const message = (err as Error).message ?? String(err);
    console.error("ingest-sicar error:", message);

    // Marca job como erro se possível
    try {
      const body = await req.clone().json().catch(() => ({}));
      if (body.job_id) {
        const admin = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
        );
        await admin.from("integration_jobs").update({
          status: "erro", error_message: message,
          finished_at: new Date().toISOString(),
        }).eq("id", body.job_id);
      }
    } catch { /* ignore */ }

    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
