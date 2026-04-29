import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type IntegrationProviderKind = "shapefile_upload" | "rest_api" | "wms_wfs" | "scraping" | "manual";
export type IntegrationProviderStatus = "ativo" | "planejado" | "desativado";
export type IntegrationJobStatus = "pendente" | "processando" | "sucesso" | "erro" | "cancelado";

export interface IntegrationProvider {
  id: string;
  key: string;
  name: string;
  description: string | null;
  kind: IntegrationProviderKind;
  data_source_key: string | null;
  layer_type: string;
  default_color: string;
  config: Record<string, unknown>;
  status: IntegrationProviderStatus;
  created_at: string;
  updated_at: string;
}

export interface IntegrationJob {
  id: string;
  provider_id: string;
  organization_id: string | null;
  triggered_by: string | null;
  status: IntegrationJobStatus;
  storage_path: string | null;
  uf: string | null;
  source_label: string | null;
  features_imported: number;
  properties_linked: number;
  layer_id: string | null;
  log: string | null;
  error_message: string | null;
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
  updated_at: string;
}

const sb = supabase as any; // eslint-disable-line @typescript-eslint/no-explicit-any

export function useIntegrationProviders() {
  return useQuery({
    queryKey: ["integration_providers"],
    queryFn: async (): Promise<IntegrationProvider[]> => {
      const { data, error } = await sb.from("integration_providers").select("*").order("name");
      if (error) throw error;
      return (data ?? []) as IntegrationProvider[];
    },
  });
}

export function useIntegrationJobs(providerId?: string | null) {
  return useQuery({
    queryKey: ["integration_jobs", providerId ?? "all"],
    queryFn: async (): Promise<IntegrationJob[]> => {
      let q = sb.from("integration_jobs").select("*").order("created_at", { ascending: false }).limit(50);
      if (providerId) q = q.eq("provider_id", providerId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as IntegrationJob[];
    },
    refetchInterval: 4000,
  });
}

export function useUpsertProvider() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: Partial<IntegrationProvider> & { name: string; key: string }) => {
      const { data, error } = await sb.from("integration_providers").upsert(p, { onConflict: "key" }).select().single();
      if (error) throw error;
      return data as IntegrationProvider;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["integration_providers"] }),
  });
}

export function useUploadAndIngestSicar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { provider: IntegrationProvider; file: File; uf: string; label?: string }) => {
      const { provider, file, uf, label } = input;
      const ts = Date.now();
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${provider.key}/${uf}/${ts}-${safeName}`;

      // Upload
      const { error: upErr } = await sb.storage.from("integration-uploads").upload(path, file, {
        contentType: file.type || "application/zip",
        upsert: false,
      });
      if (upErr) throw new Error(`Upload falhou: ${upErr.message}`);

      // Cria job
      const { data: { user } } = await sb.auth.getUser();
      const { data: job, error: jobErr } = await sb.from("integration_jobs").insert({
        provider_id: provider.id,
        triggered_by: user?.id ?? null,
        status: "pendente",
        storage_path: path,
        uf: uf.toUpperCase(),
        source_label: label ?? null,
      }).select().single();
      if (jobErr) throw new Error(`Falha ao criar job: ${jobErr.message}`);

      // Invoca edge function
      const { data: result, error: invErr } = await sb.functions.invoke("ingest-sicar", {
        body: { job_id: job.id },
      });
      if (invErr) throw new Error(`Processamento falhou: ${invErr.message}`);
      return result;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["integration_jobs"] });
      qc.invalidateQueries({ queryKey: ["data_layers"] });
      qc.invalidateQueries({ queryKey: ["properties"] });
    },
  });
}

export function useLookupCarFeature() {
  // Consulta uma feature CAR pelo external_id (cod_imovel)
  return useMutation({
    mutationFn: async (carCode: string) => {
      const { data, error } = await sb
        .from("data_layer_features")
        .select("*, data_layers!inner(name, layer_type, color)")
        .eq("external_id", carCode.trim())
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}
