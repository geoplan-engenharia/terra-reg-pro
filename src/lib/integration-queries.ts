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
  geojson_path: string | null;
  uf: string | null;
  source_label: string | null;
  features_imported: number;
  properties_linked: number;
  total_features: number | null;
  processed_features: number;
  failed_features: number;
  layer_id: string | null;
  log: string | null;
  error_message: string | null;
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ImportProgress {
  phase: "uploading" | "starting" | "processing" | "finalizing" | "done";
  processed: number;
  total: number;
  failed: number;
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

const CHUNK_SIZE = 500;
const CHUNK_DELAY_MS = 300;

export function useUploadAndIngestSicar(
  onProgress?: (p: ImportProgress) => void
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      provider: IntegrationProvider; file: File; uf: string; label?: string;
    }) => {
      const { provider, file, uf, label } = input;
      const ts = Date.now();
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${provider.key}/${uf}/${ts}-${safeName}`;

      onProgress?.({ phase: "uploading", processed: 0, total: 0, failed: 0 });

      // 1) Upload do ZIP
      const { error: upErr } = await sb.storage.from("integration-uploads").upload(path, file, {
        contentType: file.type || "application/zip",
        upsert: false,
      });
      if (upErr) throw new Error(`Upload falhou: ${upErr.message}`);

      // 2) Cria registro do job
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

      // 3) START leve: cria camada e prepara o job
      onProgress?.({ phase: "starting", processed: 0, total: 0, failed: 0 });
      const { data: startRes, error: startErr } = await sb.functions.invoke("ingest-sicar", {
        body: { job_id: job.id },
      });
      if (startErr) throw new Error(`Inicialização falhou: ${startErr.message}`);

      // 4) Parse único do ZIP para GeoJSON intermediário no storage
      const { data: parseRes, error: parseErr } = await sb.functions.invoke("parse-shapefile-to-geojson", {
        body: { job_id: job.id },
      });
      if (parseErr) throw new Error(`Conversão GeoJSON falhou: ${parseErr.message}`);
      if (parseRes?.cancelled) throw new Error("Importação cancelada pelo usuário");
      let total: number = parseRes?.total_features ?? startRes?.total_features ?? 0;
      if (total === 0) throw new Error("Shapefile sem feições");

      // 5) Loop de chunks
      let offset = 0;
      let totalFailed = 0;
      onProgress?.({ phase: "processing", processed: 0, total, failed: 0 });

      while (true) {
        // Verifica cancelamento (lê status atualizado do job)
        const { data: cur } = await sb
          .from("integration_jobs").select("status").eq("id", job.id).maybeSingle();
        if (cur?.status === "cancelado") {
          throw new Error("Importação cancelada pelo usuário");
        }

        const { data: chunkRes, error: chunkErr } = await sb.functions.invoke(
          "process-shapefile-chunk",
          { body: { job_id: job.id, offset, limit: CHUNK_SIZE } }
        );
        if (chunkErr) {
          if (offset === 0 || total === 0) {
            throw new Error(`Primeiro lote falhou: ${chunkErr.message}`);
          }
          // Falha de um chunk inteiro: registra e tenta próximo
          console.error("Chunk error:", chunkErr);
          totalFailed += CHUNK_SIZE;
          offset += CHUNK_SIZE;
          if (offset >= total) break;
          await new Promise((r) => setTimeout(r, CHUNK_DELAY_MS));
          continue;
        }
        if (chunkRes?.cancelled) {
          throw new Error("Importação cancelada pelo usuário");
        }
        if (typeof chunkRes?.total === "number") {
          total = chunkRes.total;
        }
        if (offset === 0 && total === 0) throw new Error("Shapefile sem feições");
        totalFailed += chunkRes?.failed ?? 0;
        offset = chunkRes?.nextOffset ?? offset + CHUNK_SIZE;
        onProgress?.({
          phase: "processing",
          processed: total > 0 ? Math.min(offset, total) : offset,
          total,
          failed: totalFailed,
        });
        if (!chunkRes?.hasMore) break;
        await new Promise((r) => setTimeout(r, CHUNK_DELAY_MS));
      }

      // 6) Finaliza: cruza com imóveis e marca sucesso
      onProgress?.({ phase: "finalizing", processed: total, total, failed: totalFailed });
      const { data: finRes, error: finErr } = await sb.functions.invoke(
        "finalize-shapefile-import",
        { body: { job_id: job.id } }
      );
      if (finErr) throw new Error(`Finalização falhou: ${finErr.message}`);

      onProgress?.({ phase: "done", processed: total, total, failed: totalFailed });
      return finRes;
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

// Cancela um job em andamento: marca como 'cancelado' (a edge function que já está rodando
// não pode ser interrompida no meio, mas o job sai da lista de "em processamento" e
// novas atualizações de log são ignoradas pela UI; depois pode ser excluído normalmente).
export function useCancelIntegrationJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (job: IntegrationJob) => {
      if (job.status !== "pendente" && job.status !== "processando") {
        throw new Error("Apenas execuções pendentes ou em processamento podem ser canceladas");
      }
      const { error } = await sb.from("integration_jobs").update({
        status: "cancelado",
        error_message: "Cancelado manualmente pelo administrador",
        finished_at: new Date().toISOString(),
      }).eq("id", job.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["integration_jobs"] });
    },
  });
}

// Exclui um job: remove arquivo do storage + feições + camada (se órfã) + o registro do job
export function useDeleteIntegrationJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { job: IntegrationJob; alsoDeleteLayer?: boolean }) => {
      const { job, alsoDeleteLayer = true } = input;

      // 1) Remove arquivo do storage (se existir)
      const filesToRemove = [job.storage_path, job.geojson_path].filter(Boolean) as string[];
      if (filesToRemove.length > 0) {
        await sb.storage.from("integration-uploads").remove(filesToRemove);
      }

      // 2) Remove camada + feições associadas (cascade via FK não existe, então faz manual)
      if (alsoDeleteLayer && job.layer_id) {
        await sb.from("data_layer_features").delete().eq("layer_id", job.layer_id);
        await sb.from("data_layers").delete().eq("id", job.layer_id);
      }

      // 3) Remove o job
      const { error } = await sb.from("integration_jobs").delete().eq("id", job.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["integration_jobs"] });
      qc.invalidateQueries({ queryKey: ["data_layers"] });
    },
  });
}

// Limpa arquivos órfãos do bucket (que não estão referenciados por nenhum job atual)
export function useCleanupOrphanFiles() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (): Promise<{ removed: number; kept: number }> => {
      // 1) Lista todos os jobs com storage_path
      const { data: jobs, error: jobsErr } = await sb
        .from("integration_jobs").select("storage_path, geojson_path");
      if (jobsErr) throw jobsErr;
      const referenced = new Set<string>((jobs ?? []).flatMap((j: { storage_path: string | null; geojson_path: string | null }) => (
        [j.storage_path, j.geojson_path].filter(Boolean) as string[]
      )));

      // 2) Lista arquivos do bucket recursivamente
      const allFiles: string[] = [];
      const walk = async (prefix: string) => {
        const { data, error } = await sb.storage.from("integration-uploads").list(prefix, { limit: 1000 });
        if (error) throw error;
        for (const item of data ?? []) {
          const path = prefix ? `${prefix}/${item.name}` : item.name;
          if (item.id) allFiles.push(path); // arquivo
          else await walk(path); // pasta
        }
      };
      await walk("");

      // 3) Remove os que não têm referência
      const orphans = allFiles.filter((p) => !referenced.has(p));
      if (orphans.length > 0) {
        const { error: rmErr } = await sb.storage.from("integration-uploads").remove(orphans);
        if (rmErr) throw rmErr;
      }
      return { removed: orphans.length, kept: allFiles.length - orphans.length };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["integration_jobs"] });
    },
  });
}
