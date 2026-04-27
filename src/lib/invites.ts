import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { AppRole } from "./auth";

export interface OrgInvite {
  id: string;
  organization_id: string;
  email: string;
  role: AppRole;
  status: "pendente" | "aceito" | "expirado" | "revogado";
  token: string;
  invited_by: string | null;
  created_at: string;
  expires_at: string;
}

export interface OrgMember {
  id: string;
  full_name: string | null;
  email: string | null;
  roles: AppRole[];
  created_at: string;
}

export function useInvites() {
  return useQuery({
    queryKey: ["org_invites"],
    queryFn: async (): Promise<OrgInvite[]> => {
      const { data, error } = await supabase
        .from("org_invites")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as OrgInvite[];
    },
  });
}

export function useCreateInvite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { email: string; role: AppRole; organization_id: string }) => {
      const { data, error } = await supabase
        .from("org_invites")
        .insert({
          email: input.email.trim().toLowerCase(),
          role: input.role,
          organization_id: input.organization_id,
          invited_by: (await supabase.auth.getUser()).data.user?.id ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return data as OrgInvite;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["org_invites"] }),
  });
}

export function useRevokeInvite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("org_invites").update({ status: "revogado" }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["org_invites"] }),
  });
}

export function useOrgMembers() {
  return useQuery({
    queryKey: ["org_members"],
    queryFn: async (): Promise<OrgMember[]> => {
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, created_at")
        .order("created_at", { ascending: true });
      if (error) throw error;
      const ids = (profiles ?? []).map((p) => p.id);
      const { data: roles } = ids.length
        ? await supabase.from("user_roles").select("user_id, role").in("user_id", ids)
        : { data: [] as { user_id: string; role: string }[] };
      return (profiles ?? []).map((p) => ({
        ...p,
        roles: (roles ?? []).filter((r) => r.user_id === p.id).map((r) => r.role as AppRole),
      }));
    },
  });
}

export async function fetchInviteByToken(token: string) {
  const { data, error } = await supabase
    .from("org_invites")
    .select("id, email, role, status, expires_at, organization_id, organizations(name)")
    .eq("token", token)
    .maybeSingle();
  if (error) throw error;
  return data as
    | (Omit<OrgInvite, "token" | "invited_by" | "created_at"> & { organizations: { name: string } | null })
    | null;
}
