import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type {
  Client,
  RuralProperty,
  Diagnostic,
  MonitoringAlert,
  EnvironmentalLicense,
  DataSource,
  DiagnosticRule,
  EnvironmentalAnalysis,
  LicenseAlert,
} from "./types";

// =====================
// CLIENTS
// =====================
export function useClients() {
  return useQuery({
    queryKey: ["clients"],
    queryFn: async (): Promise<Client[]> => {
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Client[];
    },
  });
}

export function useCreateClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; document?: string; email?: string; phone?: string; notes?: string; organization_id: string }) => {
      const { data, error } = await supabase.from("clients").insert(input).select().single();
      if (error) throw error;
      return data as Client;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["clients"] }),
  });
}

// =====================
// PROPERTIES
// =====================
export function useProperties() {
  return useQuery({
    queryKey: ["properties"],
    queryFn: async (): Promise<RuralProperty[]> => {
      const { data, error } = await supabase
        .from("rural_properties")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as RuralProperty[];
    },
  });
}

export function useProperty(id: string | null) {
  return useQuery({
    queryKey: ["property", id],
    enabled: !!id,
    queryFn: async (): Promise<RuralProperty | null> => {
      if (!id) return null;
      const { data, error } = await supabase.from("rural_properties").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return (data ?? null) as RuralProperty | null;
    },
  });
}

export function usePropertyDiagnostics(id: string | null) {
  return useQuery({
    queryKey: ["diagnostics", id],
    enabled: !!id,
    queryFn: async (): Promise<Diagnostic[]> => {
      if (!id) return [];
      const { data, error } = await supabase
        .from("property_diagnostics")
        .select("*")
        .eq("property_id", id)
        .order("severidade", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Diagnostic[];
    },
  });
}

export function useToggleMonitor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, monitorado }: { id: string; monitorado: boolean }) => {
      const { error } = await supabase.from("rural_properties").update({ monitorado }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["properties"] });
      qc.invalidateQueries({ queryKey: ["property", vars.id] });
    },
  });
}

export function useUpdateProperty() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<RuralProperty> }) => {
      const { data, error } = await supabase.from("rural_properties").update(patch).eq("id", id).select().single();
      if (error) throw error;
      // Re-run diagnostics
      await supabase.rpc("run_property_diagnostics", { _property_id: id });
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["properties"] });
      qc.invalidateQueries({ queryKey: ["property", vars.id] });
      qc.invalidateQueries({ queryKey: ["diagnostics", vars.id] });
    },
  });
}

export function useCreateProperty() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<RuralProperty> & { name: string; organization_id: string }) => {
      const { data, error } = await supabase.from("rural_properties").insert(input).select().single();
      if (error) throw error;
      await supabase.rpc("run_property_diagnostics", { _property_id: data.id });
      return data as RuralProperty;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["properties"] }),
  });
}

export function useDeleteProperty() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      // Cascade: remove dependents first (no FK CASCADE in schema)
      await supabase.from("property_geometries").delete().eq("property_id", id);
      await supabase.from("property_diagnostics").delete().eq("property_id", id);
      await supabase.from("monitoring_alerts").delete().eq("property_id", id);
      await supabase.from("environmental_analysis").delete().eq("property_id", id);
      await supabase.from("property_registry_data").delete().eq("property_id", id);
      const { error } = await supabase.from("rural_properties").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["properties"] });
      qc.invalidateQueries({ queryKey: ["monitoring_alerts"] });
    },
  });
}

// =====================
// GEOMETRIES
// =====================
export interface PropertyGeometry {
  id: string;
  property_id: string;
  organization_id: string;
  geojson: GeoJSON.GeoJsonObject & { _meta?: { filename?: string; filetype?: string } };
  bbox: [number, number, number, number] | null;
  source: string | null;
  created_at: string;
}

export function usePropertyGeometry(propertyId: string | null) {
  return useQuery({
    queryKey: ["geometry", propertyId],
    enabled: !!propertyId,
    queryFn: async (): Promise<PropertyGeometry | null> => {
      if (!propertyId) return null;
      const { data, error } = await supabase
        .from("property_geometries")
        .select("*")
        .eq("property_id", propertyId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as unknown as PropertyGeometry | null;
    },
  });
}

export function useUpsertGeometry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      property_id: string;
      organization_id: string;
      geojson: GeoJSON.GeoJsonObject;
      bbox: [number, number, number, number] | null;
      source: string;
      filename: string;
      filetype: string;
    }) => {
      // Replace previous geometry (keep history minimal: latest only)
      await supabase.from("property_geometries").delete().eq("property_id", input.property_id);
      const payload = {
        property_id: input.property_id,
        organization_id: input.organization_id,
        geojson: { ...input.geojson, _meta: { filename: input.filename, filetype: input.filetype } },
        bbox: input.bbox,
        source: input.source,
      };
      const { data, error } = await supabase.from("property_geometries").insert(payload).select().single();
      if (error) throw error;
      return data as unknown as PropertyGeometry;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["geometry", vars.property_id] });
      qc.invalidateQueries({ queryKey: ["properties"] });
    },
  });
}

// =====================
// MONITORING ALERTS
// =====================
export function useMonitoringAlerts() {
  return useQuery({
    queryKey: ["monitoring_alerts"],
    queryFn: async (): Promise<(MonitoringAlert & { property_name?: string })[]> => {
      const { data, error } = await supabase
        .from("monitoring_alerts")
        .select("*, rural_properties(name)")
        .order("alert_date", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []).map((r) => ({
        ...(r as MonitoringAlert),
        property_name: (r as { rural_properties?: { name: string } }).rural_properties?.name,
      }));
    },
  });
}

export function useUpdateAlertStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "novo" | "visualizado" | "resolvido" }) => {
      const patch: { status: typeof status; resolved_at?: string } = { status };
      if (status === "resolvido") patch.resolved_at = new Date().toISOString();
      const { error } = await supabase.from("monitoring_alerts").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["monitoring_alerts"] });
      qc.invalidateQueries({ queryKey: ["unified_alerts"] });
    },
  });
}

// =====================
// UNIFIED ALERTS (monitoring + license + critical diagnostics)
// =====================
export type UnifiedAlertCategory = "ambiental" | "fundiario" | "licenca" | "monitoramento";
export type UnifiedAlertStatus = "novo" | "visualizado" | "resolvido";

export interface UnifiedAlert {
  id: string;
  source_table: "monitoring_alerts" | "license_alerts" | "property_diagnostics";
  category: UnifiedAlertCategory;
  severidade: "alta" | "media" | "baixa";
  status: UnifiedAlertStatus;
  title: string;
  description: string | null;
  date: string;
  property_id: string | null;
  property_name: string | null;
  license_id: string | null;
  license_label: string | null;
  raw_kind: string | null;
}

function diagnosticToCategory(kind: string): UnifiedAlertCategory {
  if (kind === "irregularidade_ambiental" || kind === "embargo" || kind === "desmatamento") return "ambiental";
  if (kind === "sem_certificacao" || kind === "documental" || kind === "sobreposicao") return "fundiario";
  return "ambiental";
}

export function useUnifiedAlerts() {
  return useQuery({
    queryKey: ["unified_alerts"],
    queryFn: async (): Promise<UnifiedAlert[]> => {
      const [mon, lic, diag] = await Promise.all([
        supabase
          .from("monitoring_alerts")
          .select("*, rural_properties(name)")
          .order("alert_date", { ascending: false })
          .limit(200),
        supabase
          .from("license_alerts")
          .select("*, environmental_licenses(license_type, license_number, property_id, rural_properties(name))")
          .order("triggered_at", { ascending: false })
          .limit(200),
        supabase
          .from("property_diagnostics")
          .select("*, rural_properties(name)")
          .eq("severidade", "alta")
          .order("generated_at", { ascending: false })
          .limit(200),
      ]);

      if (mon.error) throw mon.error;
      if (lic.error) throw lic.error;
      if (diag.error) throw diag.error;

      const list: UnifiedAlert[] = [];

      for (const r of (mon.data ?? []) as unknown as Array<{
        id: string; alert_type: string; title: string; description: string | null;
        severidade: "alta" | "media" | "baixa"; status: UnifiedAlertStatus;
        alert_date: string; property_id: string;
        rural_properties?: { name: string } | null;
      }>) {
        list.push({
          id: r.id,
          source_table: "monitoring_alerts",
          category: "monitoramento",
          severidade: r.severidade,
          status: r.status,
          title: r.title,
          description: r.description,
          date: r.alert_date,
          property_id: r.property_id,
          property_name: r.rural_properties?.name ?? null,
          license_id: null,
          license_label: null,
          raw_kind: r.alert_type,
        });
      }

      const KIND_LABEL: Record<string, { title: string; sev: "alta" | "media" | "baixa" }> = {
        "180_dias": { title: "Licença vence em até 180 dias", sev: "baixa" },
        "90_dias": { title: "Licença vence em até 90 dias", sev: "media" },
        "30_dias": { title: "Licença vence em até 30 dias", sev: "alta" },
        vencida: { title: "Licença vencida", sev: "alta" },
      };

      for (const r of (lic.data ?? []) as unknown as Array<{
        id: string; license_id: string; kind: string; status: UnifiedAlertStatus; triggered_at: string;
        environmental_licenses?: {
          license_type: string; license_number: string | null; property_id: string | null;
          rural_properties?: { name: string } | null;
        } | null;
      }>) {
        const meta = KIND_LABEL[r.kind] ?? { title: `Alerta de licença (${r.kind})`, sev: "media" as const };
        const lbl = r.environmental_licenses
          ? `${r.environmental_licenses.license_type}${r.environmental_licenses.license_number ? ` ${r.environmental_licenses.license_number}` : ""}`
          : null;
        list.push({
          id: r.id,
          source_table: "license_alerts",
          category: "licenca",
          severidade: meta.sev,
          status: r.status,
          title: meta.title,
          description: lbl ? `Licença ${lbl}` : null,
          date: r.triggered_at,
          property_id: r.environmental_licenses?.property_id ?? null,
          property_name: r.environmental_licenses?.rural_properties?.name ?? null,
          license_id: r.license_id,
          license_label: lbl,
          raw_kind: r.kind,
        });
      }

      for (const r of (diag.data ?? []) as unknown as Array<{
        id: string; kind: string; title: string; description: string | null;
        severidade: "alta" | "media" | "baixa"; generated_at: string; property_id: string;
        rural_properties?: { name: string } | null;
      }>) {
        list.push({
          id: r.id,
          source_table: "property_diagnostics",
          category: diagnosticToCategory(r.kind),
          severidade: r.severidade,
          status: "novo",
          title: r.title,
          description: r.description,
          date: r.generated_at,
          property_id: r.property_id,
          property_name: r.rural_properties?.name ?? null,
          license_id: null,
          license_label: null,
          raw_kind: r.kind,
        });
      }

      list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      return list;
    },
  });
}

export function useUpdateUnifiedAlertStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      source_table,
      status,
    }: {
      id: string;
      source_table: UnifiedAlert["source_table"];
      status: UnifiedAlertStatus;
    }) => {
      if (source_table === "property_diagnostics") {
        // diagnostics have no status column — no-op
        return;
      }
      if (source_table === "monitoring_alerts") {
        const patch: { status: UnifiedAlertStatus; resolved_at?: string } = { status };
        if (status === "resolvido") patch.resolved_at = new Date().toISOString();
        const { error } = await supabase.from("monitoring_alerts").update(patch).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("license_alerts").update({ status }).eq("id", id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["unified_alerts"] });
      qc.invalidateQueries({ queryKey: ["monitoring_alerts"] });
    },
  });
}

// =====================
// LICENSES
// =====================
export function useLicenses() {
  return useQuery({
    queryKey: ["licenses"],
    queryFn: async (): Promise<(EnvironmentalLicense & { property_name?: string; client_name?: string })[]> => {
      const { data, error } = await supabase
        .from("environmental_licenses")
        .select("*, rural_properties(name), clients(name)")
        .order("expiration_date", { ascending: true });
      if (error) throw error;
      return (data ?? []).map((r) => ({
        ...(r as EnvironmentalLicense),
        property_name: (r as { rural_properties?: { name: string } }).rural_properties?.name,
        client_name: (r as { clients?: { name: string } }).clients?.name,
      }));
    },
  });
}

export function useLicense(id: string | null) {
  return useQuery({
    queryKey: ["license", id],
    enabled: !!id,
    queryFn: async (): Promise<(EnvironmentalLicense & { property_name?: string; client_name?: string }) | null> => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("environmental_licenses")
        .select("*, rural_properties(name), clients(name)")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return {
        ...(data as EnvironmentalLicense),
        property_name: (data as { rural_properties?: { name: string } }).rural_properties?.name,
        client_name: (data as { clients?: { name: string } }).clients?.name,
      };
    },
  });
}

export function useLicenseAlerts(licenseId: string | null) {
  return useQuery({
    queryKey: ["license_alerts", licenseId],
    enabled: !!licenseId,
    queryFn: async (): Promise<LicenseAlert[]> => {
      if (!licenseId) return [];
      const { data, error } = await supabase
        .from("license_alerts")
        .select("*")
        .eq("license_id", licenseId)
        .order("triggered_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as LicenseAlert[];
    },
  });
}

export type LicenseUpsertInput = Partial<EnvironmentalLicense> & {
  license_type: string;
  organization_id: string;
};

export function useUpsertLicense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: LicenseUpsertInput) => {
      if (input.id) {
        const { id, created_at: _c, updated_at: _u, ...patch } = input;
        const { data, error } = await supabase
          .from("environmental_licenses")
          .update(patch)
          .eq("id", id)
          .select()
          .single();
        if (error) throw error;
        return data as EnvironmentalLicense;
      }
      const { data, error } = await supabase
        .from("environmental_licenses")
        .insert(input)
        .select()
        .single();
      if (error) throw error;
      return data as EnvironmentalLicense;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["licenses"] });
      qc.invalidateQueries({ queryKey: ["license", data.id] });
      qc.invalidateQueries({ queryKey: ["license_alerts", data.id] });
      qc.invalidateQueries({ queryKey: ["monitoring_alerts"] });
    },
  });
}

export function useDeleteLicense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      // Try to remove attached file if any
      const { data: lic } = await supabase
        .from("environmental_licenses")
        .select("attachment_url")
        .eq("id", id)
        .maybeSingle();
      const path = (lic as { attachment_url?: string | null } | null)?.attachment_url;
      if (path) {
        await supabase.storage.from("license-attachments").remove([path]);
      }
      await supabase.from("license_alerts").delete().eq("license_id", id);
      const { error } = await supabase.from("environmental_licenses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["licenses"] });
    },
  });
}

export function useUploadLicenseAttachment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      licenseId,
      organizationId,
      file,
    }: {
      licenseId: string;
      organizationId: string;
      file: File;
    }) => {
      const ext = file.name.split(".").pop() || "bin";
      const path = `${organizationId}/${licenseId}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("license-attachments")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (upErr) throw upErr;
      const { data, error } = await supabase
        .from("environmental_licenses")
        .update({
          attachment_url: path,
          attachment_name: file.name,
          attachment_uploaded_at: new Date().toISOString(),
        })
        .eq("id", licenseId)
        .select()
        .single();
      if (error) throw error;
      return data as EnvironmentalLicense;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["licenses"] });
      qc.invalidateQueries({ queryKey: ["license", data.id] });
    },
  });
}

export function useRemoveLicenseAttachment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ licenseId, path }: { licenseId: string; path: string }) => {
      await supabase.storage.from("license-attachments").remove([path]);
      const { error } = await supabase
        .from("environmental_licenses")
        .update({ attachment_url: null, attachment_name: null, attachment_uploaded_at: null })
        .eq("id", licenseId);
      if (error) throw error;
      return licenseId;
    },
    onSuccess: (licenseId) => {
      qc.invalidateQueries({ queryKey: ["licenses"] });
      qc.invalidateQueries({ queryKey: ["license", licenseId] });
    },
  });
}

export async function getLicenseAttachmentUrl(path: string): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from("license-attachments")
    .createSignedUrl(path, 60 * 10);
  if (error) return null;
  return data?.signedUrl ?? null;
}

// =====================
// DATA SOURCES
// =====================
export function useDataSources() {
  return useQuery({
    queryKey: ["data_sources"],
    queryFn: async (): Promise<DataSource[]> => {
      const { data, error } = await supabase.from("data_sources").select("*").order("name");
      if (error) throw error;
      return (data ?? []) as DataSource[];
    },
  });
}

export function useUpsertDataSource() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<DataSource> & { key: string; name: string }) => {
      if (input.id) {
        const { id, ...patch } = input;
        const { data, error } = await supabase.from("data_sources").update(patch).eq("id", id).select().single();
        if (error) throw error;
        return data as DataSource;
      }
      const { data, error } = await supabase.from("data_sources").insert(input).select().single();
      if (error) throw error;
      return data as DataSource;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["data_sources"] }),
  });
}

export function useDeleteDataSource() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("data_sources").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["data_sources"] }),
  });
}

// =====================
// SIMULATED SYNC
// =====================
export interface SimulatedSyncRun {
  id: string;
  organization_id: string;
  data_source_key: string;
  property_id: string | null;
  status: string;
  message: string | null;
  findings_count: number;
  raw_payload: unknown;
  triggered_by: string | null;
  created_at: string;
}

export interface SimulatedSyncFinding {
  id: string;
  run_id: string;
  organization_id: string;
  data_source_key: string;
  property_id: string | null;
  finding_type: string;
  severidade: "alta" | "media" | "baixa";
  title: string;
  description: string | null;
  data: unknown;
  created_at: string;
}

export function useSimulatedSyncRuns(opts?: { sourceKey?: string; limit?: number }) {
  return useQuery({
    queryKey: ["simulated_sync_runs", opts?.sourceKey ?? "all", opts?.limit ?? 50],
    queryFn: async (): Promise<SimulatedSyncRun[]> => {
      let q = supabase.from("simulated_sync_runs").select("*").order("created_at", { ascending: false }).limit(opts?.limit ?? 50);
      if (opts?.sourceKey) q = q.eq("data_source_key", opts.sourceKey);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as SimulatedSyncRun[];
    },
  });
}

export function useSimulatedSyncFindings(runId: string | null) {
  return useQuery({
    queryKey: ["simulated_sync_findings", runId],
    enabled: !!runId,
    queryFn: async (): Promise<SimulatedSyncFinding[]> => {
      const { data, error } = await supabase
        .from("simulated_sync_findings")
        .select("*")
        .eq("run_id", runId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as SimulatedSyncFinding[];
    },
  });
}

export function useRunSimulatedSync() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { dataSourceKey: string; propertyId?: string | null }) => {
      const { data, error } = await supabase.rpc("run_simulated_sync", {
        _data_source_key: input.dataSourceKey,
        _property_id: input.propertyId ?? undefined,
      });
      if (error) throw error;
      return data as string; // run_id
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["simulated_sync_runs"] });
      qc.invalidateQueries({ queryKey: ["data_sources"] });
      qc.invalidateQueries({ queryKey: ["monitoring_alerts"] });
      qc.invalidateQueries({ queryKey: ["unified_alerts"] });
      qc.invalidateQueries({ queryKey: ["properties"] });
      qc.invalidateQueries({ queryKey: ["property_diagnostics"] });
    },
  });
}

// =====================
// DIAGNOSTIC RULES
// =====================
export function useDiagnosticRules() {
  return useQuery({
    queryKey: ["diagnostic_rules"],
    queryFn: async (): Promise<DiagnosticRule[]> => {
      const { data, error } = await supabase
        .from("diagnostic_rules")
        .select("*")
        .order("category")
        .order("name");
      if (error) throw error;
      return (data ?? []) as unknown as DiagnosticRule[];
    },
  });
}

export function useUpsertDiagnosticRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<DiagnosticRule> & { name: string; key: string; category: string; report_message: string; organization_id?: string }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const client = supabase as any;
      if (input.id) {
        const { id, created_at: _c, updated_at: _u, ...patch } = input;
        const { data, error } = await client.from("diagnostic_rules").update(patch).eq("id", id).select().single();
        if (error) throw error;
        return data as DiagnosticRule;
      }
      const { data, error } = await client.from("diagnostic_rules").insert(input).select().single();
      if (error) throw error;
      return data as DiagnosticRule;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["diagnostic_rules"] }),
  });
}

export function useDeleteDiagnosticRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("diagnostic_rules").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["diagnostic_rules"] }),
  });
}

export function useReprocessDiagnostics() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (propertyId: string) => {
      const { error } = await supabase.rpc("run_property_diagnostics", { _property_id: propertyId });
      if (error) throw error;
      return propertyId;
    },
    onSuccess: (propertyId) => {
      qc.invalidateQueries({ queryKey: ["diagnostics", propertyId] });
      qc.invalidateQueries({ queryKey: ["property", propertyId] });
      qc.invalidateQueries({ queryKey: ["properties"] });
    },
  });
}

// =====================
// ENVIRONMENTAL ANALYSIS
// =====================
export function usePropertyEnvironmentalAnalyses(propertyId: string | null) {
  return useQuery({
    queryKey: ["env_analyses", propertyId],
    enabled: !!propertyId,
    queryFn: async (): Promise<EnvironmentalAnalysis[]> => {
      if (!propertyId) return [];
      const { data, error } = await supabase
        .from("environmental_analysis")
        .select("*")
        .eq("property_id", propertyId)
        .order("analyzed_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as EnvironmentalAnalysis[];
    },
  });
}

export function useUpsertEnvironmentalAnalysis() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id?: string;
      property_id: string;
      organization_id: string;
      has_desmatamento: boolean;
      desmatamento_area_ha: number | null;
      has_embargo: boolean;
      embargo_area_ha: number | null;
      has_reserva_legal_deficit: boolean;
      has_app_violation: boolean;
      analyzed_at?: string;
    }) => {
      const payload = {
        property_id: input.property_id,
        organization_id: input.organization_id,
        has_desmatamento: input.has_desmatamento,
        desmatamento_area_ha: input.desmatamento_area_ha,
        has_embargo: input.has_embargo,
        embargo_area_ha: input.embargo_area_ha,
        has_reserva_legal_deficit: input.has_reserva_legal_deficit,
        has_app_violation: input.has_app_violation,
        analyzed_at: input.analyzed_at ?? new Date().toISOString(),
      };
      if (input.id) {
        const { data, error } = await supabase
          .from("environmental_analysis")
          .update(payload)
          .eq("id", input.id)
          .select()
          .single();
        if (error) throw error;
        await supabase.rpc("run_property_diagnostics", { _property_id: input.property_id });
        return data as EnvironmentalAnalysis;
      }
      const { data, error } = await supabase
        .from("environmental_analysis")
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      await supabase.rpc("run_property_diagnostics", { _property_id: input.property_id });
      return data as EnvironmentalAnalysis;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["env_analyses", vars.property_id] });
      qc.invalidateQueries({ queryKey: ["diagnostics", vars.property_id] });
      qc.invalidateQueries({ queryKey: ["property", vars.property_id] });
    },
  });
}

// =====================
// SUBSCRIPTIONS & PLANS
// =====================
export type SubscriptionPlan = {
  id: string;
  key: string;
  name: string;
  max_properties: number;
  max_users: number;
  max_licenses: number;
  can_use_custom_rules: boolean;
  can_use_simulated_sync: boolean;
  can_export_reports: boolean;
  price_monthly: number;
  price_yearly: number;
  is_active: boolean;
  sort_order: number;
};

export type OrganizationSubscription = {
  id: string;
  organization_id: string;
  plan_key: string;
  billing_cycle: "mensal" | "anual";
  status: "ativo" | "trial" | "pausado" | "cancelado" | "expirado";
  started_at: string;
  expires_at: string | null;
  notes: string | null;
};

export function useSubscriptionPlans() {
  return useQuery({
    queryKey: ["subscription_plans"],
    queryFn: async (): Promise<SubscriptionPlan[]> => {
      const { data, error } = await (supabase as any)
        .from("subscription_plans")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as SubscriptionPlan[];
    },
  });
}

export function useCurrentSubscription() {
  return useQuery({
    queryKey: ["current_subscription"],
    queryFn: async (): Promise<{ subscription: OrganizationSubscription | null; plan: SubscriptionPlan | null }> => {
      const { data: sub, error } = await (supabase as any)
        .from("organization_subscriptions")
        .select("*")
        .maybeSingle();
      if (error) throw error;
      if (!sub) return { subscription: null, plan: null };
      const { data: plan, error: pErr } = await (supabase as any)
        .from("subscription_plans")
        .select("*")
        .eq("key", sub.plan_key)
        .maybeSingle();
      if (pErr) throw pErr;
      return { subscription: sub as OrganizationSubscription, plan: (plan ?? null) as SubscriptionPlan | null };
    },
  });
}

export function useUsageCounts() {
  return useQuery({
    queryKey: ["usage_counts"],
    queryFn: async (): Promise<{ properties: number; users: number; licenses: number }> => {
      const [p, u, l] = await Promise.all([
        supabase.from("rural_properties").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("environmental_licenses").select("id", { count: "exact", head: true }),
      ]);
      return {
        properties: p.count ?? 0,
        users: u.count ?? 0,
        licenses: l.count ?? 0,
      };
    },
  });
}
