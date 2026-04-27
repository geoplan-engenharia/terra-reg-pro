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
    onSuccess: () => qc.invalidateQueries({ queryKey: ["monitoring_alerts"] }),
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

export function useCreateLicense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<EnvironmentalLicense> & { license_type: string; organization_id: string }) => {
      const { data, error } = await supabase.from("environmental_licenses").insert(input).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["licenses"] }),
  });
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
