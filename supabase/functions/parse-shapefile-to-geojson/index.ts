// Edge function: parse-shapefile-to-geojson
// Parseia o ZIP do shapefile uma única vez e salva as features como JSON
// intermediário em integration-uploads/geojson/{job_id}/features.json.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import shp from "https://esm.sh/shpjs@4.0.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface ParsePayload { job_id: string }

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  let jobId: string | undefined;

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

    const body = (await req.json()) as ParsePayload;
    jobId = body.job_id;
    if (!jobId) throw new Error("job_id é obrigatório");

    const { data: job, error: jobErr } = await admin
      .from("integration_jobs").select("*").eq("id", jobId).single();
    if (jobErr || !job) throw new Error("Job não encontrado");
    if (job.status === "cancelado") {
      return new Response(JSON.stringify({ ok: false, cancelled: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!job.storage_path) throw new Error("Job sem storage_path");

    await admin.from("integration_jobs").update({
      status: "processando",
      log: "Convertendo shapefile para GeoJSON intermediário...",
    }).eq("id", job.id);

    const { data: fileBlob, error: dlErr } = await admin.storage
      .from("integration-uploads").download(job.storage_path);
    if (dlErr || !fileBlob) throw new Error(`Falha no download: ${dlErr?.message}`);

    const parsed: any = await shp(await fileBlob.arrayBuffer());
    const collections = Array.isArray(parsed) ? parsed : [parsed];
    const features: any[] = [];
    for (const fc of collections) {
      if (fc?.features?.length) features.push(...fc.features);
    }

    const geojsonPath = `geojson/${job.id}/features.json`;
    const { error: uploadErr } = await admin.storage
      .from("integration-uploads")
      .upload(geojsonPath, JSON.stringify(features), {
        contentType: "application/json",
        upsert: true,
      });
    if (uploadErr) throw new Error(`Falha ao salvar GeoJSON: ${uploadErr.message}`);

    await admin.from("integration_jobs").update({
      total_features: features.length,
      geojson_path: geojsonPath,
      processed_features: 0,
      failed_features: 0,
      log: `GeoJSON pronto: ${features.length.toLocaleString("pt-BR")} feições. Processando em lotes...`,
    }).eq("id", job.id);

    console.log(`[parse-shapefile-to-geojson] ok: job=${job.id} total=${features.length}`);

    return new Response(JSON.stringify({
      ok: true,
      job_id: job.id,
      total_features: features.length,
      geojson_path: geojsonPath,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err) {
    const message = (err as Error).message ?? String(err);
    console.error("parse-shapefile-to-geojson error:", message);
    if (jobId) {
      try {
        const admin = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
        );
        await admin.from("integration_jobs").update({
          status: "erro",
          error_message: message,
          finished_at: new Date().toISOString(),
        }).eq("id", jobId);
      } catch { /* ignore */ }
    }
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});