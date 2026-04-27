import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type {
  Client,
  RuralProperty,
  Diagnostic,
  MonitoringAlert,
  EnvironmentalLicense,
  DataSource,
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
      const patch: Record<string, unknown> = { status };
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
