// Edge function: ingest-sicar (START)
// Starter leve do job de importação:
//   1. Busca o job e provider
//   2. Cria/atualiza data_layers e data_sources
//   3. Limpa feições antigas da camada
//   4. Atualiza o job com total_features=null e status='processando'
// O download/parse do shapefile acontece apenas em `process-shapefile-chunk`.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface StartPayload { job_id: string }

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

    const body = (await req.json()) as StartPayload;
    if (!body.job_id) throw new Error("job_id é obrigatório");

    const { data: job, error: jobErr } = await admin
      .from("integration_jobs").select("*").eq("id", body.job_id).single();
    if (jobErr || !job) throw new Error("Job não encontrado");

    const { data: provider } = await admin
      .from("integration_providers").select("*").eq("id", job.provider_id).single();
    if (!provider) throw new Error("Provider não encontrado");
    if (!job.storage_path) throw new Error("Job sem storage_path");

    const layerKey = provider.data_source_key ?? `sicar-${job.uf?.toLowerCase() ?? "br"}`;
    const layerName = `SICAR — ${job.uf ?? "Federal"}${job.source_label ? ` (${job.source_label})` : ""}`;

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

    // Deduplicação: limpa feições antigas da camada antes de reimportar
    await admin.from("data_layer_features").delete().eq("layer_id", layer.id);

    await admin.from("integration_jobs").update({
      status: "processando",
      started_at: new Date().toISOString(),
      total_features: null,
      processed_features: 0,
      failed_features: 0,
      layer_id: layer.id,
      log: "Importação iniciada. O total de feições será identificado no primeiro lote.",
    }).eq("id", job.id);

    console.log(`[ingest-sicar] start ok: job=${job.id} layer=${layer.id}`);

    return new Response(JSON.stringify({
      ok: true, job_id: job.id, layer_id: layer.id, total_features: null,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err) {
    const message = (err as Error).message ?? String(err);
    console.error("ingest-sicar error:", message);
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
