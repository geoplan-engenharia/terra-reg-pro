import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PlatformOverview {
  total_organizations: number;
  total_users: number;
  total_properties: number;
  total_licenses: number;
  active_subscriptions: number;
  trial_subscriptions: number;
  canceled_subscriptions: number;
  mrr_estimated: number;
  arr_estimated: number;
  plans_distribution: Array<{ plan_key: string; count: number }>;
}

export function usePlatformOverview() {
  return useQuery({
    queryKey: ["admin", "platform_overview"],
    queryFn: async (): Promise<PlatformOverview> => {
      const { data, error } = await (supabase as any).rpc("admin_platform_overview");
      if (error) throw error;
      return data as PlatformOverview;
    },
  });
}

export interface AdminOrganization {
  id: string;
  name: string;
  slug: string;
  created_at: string;
  plan_key: string | null;
  billing_cycle: string | null;
  subscription_status: string | null;
  expires_at: string | null;
  users_count: number;
  properties_count: number;
  licenses_count: number;
}

export function useAdminOrganizations() {
  return useQuery({
    queryKey: ["admin", "organizations"],
    queryFn: async (): Promise<AdminOrganization[]> => {
      const { data, error } = await (supabase as any).rpc("admin_organizations_overview");
      if (error) throw error;
      return (data ?? []) as AdminOrganization[];
    },
  });
}

export interface AdminUser {
  id: string;
  full_name: string | null;
  email: string | null;
  organization_id: string | null;
  organization_name: string | null;
  roles: string[];
  created_at: string;
  is_super_admin: boolean;
}

export function useAdminUsers() {
  return useQuery({
    queryKey: ["admin", "users"],
    queryFn: async (): Promise<AdminUser[]> => {
      const { data, error } = await (supabase as any).rpc("admin_users_overview");
      if (error) throw error;
      return (data ?? []) as AdminUser[];
    },
  });
}

export function useAdminOrgDetails(orgId: string | null) {
  return useQuery({
    queryKey: ["admin", "org_details", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("admin_organization_details", {
        _org_id: orgId,
      });
      if (error) throw error;
      return data as {
        organization: { id: string; name: string; slug: string; created_at: string };
        subscription: {
          id: string;
          plan_key: string;
          billing_cycle: string;
          status: string;
          started_at: string;
          expires_at: string | null;
          notes: string | null;
        } | null;
        plan: {
          key: string;
          name: string;
          max_properties: number;
          max_users: number;
          max_licenses: number;
          price_monthly: number;
          price_yearly: number;
        } | null;
        users: Array<{ id: string; full_name: string | null; email: string | null; roles: string[]; created_at: string }>;
        usage: { properties: number; users: number; licenses: number };
      };
    },
  });
}

export function useUpdateSubscription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      organization_id: string;
      plan_key?: string;
      billing_cycle?: "mensal" | "anual";
      status?: "ativo" | "trial" | "pausado" | "cancelado" | "expirado" | "vitalicio";
      expires_at?: string | null;
    }) => {
      const updates: Record<string, unknown> = {};
      if (input.plan_key !== undefined) updates.plan_key = input.plan_key;
      if (input.billing_cycle !== undefined) updates.billing_cycle = input.billing_cycle;
      if (input.status !== undefined) updates.status = input.status;
      if (input.expires_at !== undefined) updates.expires_at = input.expires_at;
      const { error } = await (supabase as any)
        .from("organization_subscriptions")
        .update(updates)
        .eq("organization_id", input.organization_id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["admin", "org_details", vars.organization_id] });
      qc.invalidateQueries({ queryKey: ["admin", "organizations"] });
      qc.invalidateQueries({ queryKey: ["admin", "platform_overview"] });
    },
  });
}

export function useUpdatePlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      key: string;
      name?: string;
      max_properties?: number;
      max_users?: number;
      max_licenses?: number;
      price_monthly?: number;
      price_yearly?: number;
      is_active?: boolean;
      can_use_custom_rules?: boolean;
      can_use_simulated_sync?: boolean;
      can_export_reports?: boolean;
    }) => {
      const { key, ...updates } = input;
      const { error } = await (supabase as any)
        .from("subscription_plans")
        .update(updates)
        .eq("key", key);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["subscription_plans"] });
      qc.invalidateQueries({ queryKey: ["admin"] });
    },
  });
}

export function useUpdateUserRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { user_id: string; organization_id: string; role: "admin" | "tecnico" | "financeiro" | "visualizador" }) => {
      // Replace all roles for that user in that org with the new single role
      const { error: delErr } = await (supabase as any)
        .from("user_roles")
        .delete()
        .eq("user_id", input.user_id)
        .eq("organization_id", input.organization_id);
      if (delErr) throw delErr;
      const { error: insErr } = await (supabase as any).from("user_roles").insert({
        user_id: input.user_id,
        organization_id: input.organization_id,
        role: input.role,
      });
      if (insErr) throw insErr;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "users"] });
      qc.invalidateQueries({ queryKey: ["admin", "org_details"] });
    },
  });
}

// Support reports
export interface SupportReport {
  id: string;
  organization_id: string | null;
  user_id: string | null;
  report_type: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  created_at: string;
  updated_at: string;
  organization_name?: string | null;
  user_email?: string | null;
}

export function useSupportReports() {
  return useQuery({
    queryKey: ["admin", "support_reports"],
    queryFn: async (): Promise<SupportReport[]> => {
      const { data, error } = await (supabase as any)
        .from("support_reports")
        .select("*, organizations(name), profiles(email, full_name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return ((data ?? []) as any[]).map((r) => ({
        ...r,
        organization_name: r.organizations?.name ?? null,
        user_email: r.profiles?.email ?? r.profiles?.full_name ?? null,
      })) as SupportReport[];
    },
  });
}

export function useCreateSupportReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { title: string; description: string; report_type: string; priority: string; organization_id: string; user_id: string }) => {
      const { error } = await (supabase as any).from("support_reports").insert(input);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "support_reports"] });
    },
  });
}

export function useUpdateSupportReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; status?: string; priority?: string }) => {
      const { id, ...updates } = input;
      const { error } = await (supabase as any).from("support_reports").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "support_reports"] });
    },
  });
}
