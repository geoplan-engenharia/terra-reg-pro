// Edge function: finalize-shapefile-import
// Cruza as feições com rural_properties (via código CAR) e marca o job como
// sucesso/erro parcial. Chamada após o último chunk pelo frontend.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

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

    const { job_id } = await req.json() as { job_id: string };
    if (!job_id) throw new Error("job_id é obrigatório");

    const { data: job, error: jobErr } = await admin
      .from("integration_jobs").select("*").eq("id", job_id).single();
    if (jobErr || !job) throw new Error("Job não encontrado");
    if (!job.layer_id) throw new Error("Job sem layer_id");

    // Cruza com rural_properties via código CAR
    const { data: linked } = await admin.rpc("link_car_features_to_properties", {
      _layer_id: job.layer_id,
    });

    const inserted = (job.processed_features ?? 0) - (job.failed_features ?? 0);
    const status = (job.failed_features ?? 0) > 0 && inserted === 0 ? "erro" : "sucesso";

    await admin.from("integration_jobs").update({
      status,
      features_imported: inserted,
      properties_linked: linked ?? 0,
      finished_at: new Date().toISOString(),
      log: `${inserted.toLocaleString("pt-BR")} feições importadas, ${linked ?? 0} imóveis vinculados${(job.failed_features ?? 0) > 0 ? `, ${job.failed_features} com erro` : ""}.`,
    }).eq("id", job.id);

    return new Response(JSON.stringify({
      ok: true, features: inserted, linked: linked ?? 0, failed: job.failed_features ?? 0,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err) {
    const message = (err as Error).message ?? String(err);
    console.error("finalize-shapefile-import error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
