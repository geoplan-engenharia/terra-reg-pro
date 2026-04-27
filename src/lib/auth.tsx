import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "tecnico" | "financeiro" | "visualizador";

export interface ProfileInfo {
  id: string;
  organization_id: string;
  full_name: string | null;
  email: string | null;
  organization_name: string;
  roles: AppRole[];
}

interface AuthState {
  session: Session | null;
  user: User | null;
  profile: ProfileInfo | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  hasRole: (role: AppRole) => boolean;
  hasAnyRole: (roles: AppRole[]) => boolean;
  canEditProperties: boolean;
  canEditClients: boolean;
  canEditLicenses: boolean;
  isAdmin: boolean;
}

const Ctx = createContext<AuthState | null>(null);

async function loadProfile(userId: string): Promise<ProfileInfo | null> {
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, organization_id, full_name, email, organizations(name)")
    .eq("id", userId)
    .maybeSingle();
  if (error || !profile) return null;

  const { data: roleRows } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);

  return {
    id: profile.id,
    organization_id: profile.organization_id,
    full_name: profile.full_name,
    email: profile.email,
    organization_name: (profile.organizations as { name: string } | null)?.name ?? "Organização",
    roles: (roleRows ?? []).map((r) => r.role as AppRole),
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<ProfileInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async (uid: string | null) => {
    if (!uid) { setProfile(null); return; }
    // Retry briefly (trigger may take a moment after signup)
    for (let i = 0; i < 4; i++) {
      const p = await loadProfile(uid);
      if (p) { setProfile(p); return; }
      await new Promise((r) => setTimeout(r, 350));
    }
    setProfile(null);
  };

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, s) => {
      setSession(s);
      // Defer Supabase calls outside the listener
      setTimeout(() => { void refresh(s?.user.id ?? null); }, 0);
    });
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      await refresh(data.session?.user.id ?? null);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
  };

  const hasRole = (r: AppRole) => profile?.roles.includes(r) ?? false;
  const hasAnyRole = (rs: AppRole[]) => rs.some((r) => hasRole(r));
  const isAdmin = hasRole("admin");

  const value: AuthState = {
    session,
    user: session?.user ?? null,
    profile,
    loading,
    signOut,
    refreshProfile: () => refresh(session?.user.id ?? null),
    hasRole,
    hasAnyRole,
    isAdmin,
    canEditProperties: hasAnyRole(["admin", "tecnico"]),
    canEditClients: hasAnyRole(["admin", "tecnico", "financeiro"]),
    canEditLicenses: hasAnyRole(["admin", "tecnico", "financeiro"]),
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used inside <AuthProvider>");
  return v;
}

export const ROLE_LABEL: Record<AppRole, string> = {
  admin: "Administrador",
  tecnico: "Técnico",
  financeiro: "Financeiro",
  visualizador: "Visualizador",
};
