import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentSubscription } from "@/lib/queries";

export interface TrialStatus {
  isTrial: boolean;
  isExpired: boolean;
  daysLeft: number | null;
  expiresAt: string | null;
  /** True se conta está em trial e ainda não expirou */
  isActiveTrial: boolean;
  /** True se trial expirou e não há outro plano ativo (bloqueio leve) */
  isBlocked: boolean;
}

export function useTrialStatus(): TrialStatus {
  const sub = useCurrentSubscription();
  const subscription = sub.data?.subscription ?? null;
  const status = subscription?.status;
  const expiresAt = subscription?.expires_at ?? null;

  const now = Date.now();
  const expMs = expiresAt ? new Date(expiresAt).getTime() : null;
  const daysLeft = expMs !== null ? Math.ceil((expMs - now) / 86400000) : null;
  const isTrial = status === "trial";
  const isExpired = isTrial && expMs !== null && now > expMs;
  const isActiveTrial = isTrial && !isExpired;
  // Bloqueio: trial expirado OU status já marcado como expirado/cancelado/pausado
  const blockedStatuses: Array<typeof status> = ["expirado", "cancelado", "pausado"];
  const isBlocked = isExpired || blockedStatuses.includes(status as typeof status);

  return {
    isTrial,
    isExpired,
    daysLeft,
    expiresAt,
    isActiveTrial,
    isBlocked,
  };
}

// =====================
// ONBOARDING PROGRESS
// =====================
export interface OnboardingProgress {
  organization_id: string;
  has_created_client: boolean;
  has_created_property: boolean;
  has_run_diagnosis: boolean;
  has_generated_report: boolean;
  onboarding_dismissed: boolean;
  onboarding_completed_at: string | null;
}

export function useOnboardingProgress() {
  return useQuery({
    queryKey: ["onboarding_progress"],
    queryFn: async (): Promise<OnboardingProgress | null> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("organization_onboarding")
        .select("*")
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as OnboardingProgress | null;
    },
  });
}

export function useUpdateOnboarding() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<Omit<OnboardingProgress, "organization_id">>) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const client = supabase as any;
      const { data: existing } = await client
        .from("organization_onboarding")
        .select("organization_id")
        .maybeSingle();
      if (!existing) {
        // Need org_id; fetch from profile
        const { data: prof } = await client
          .from("profiles")
          .select("organization_id")
          .eq("id", (await supabase.auth.getUser()).data.user?.id ?? "")
          .maybeSingle();
        if (!prof?.organization_id) throw new Error("Organização não encontrada");
        const { error } = await client
          .from("organization_onboarding")
          .insert({ organization_id: prof.organization_id, ...patch });
        if (error) throw error;
      } else {
        const { error } = await client
          .from("organization_onboarding")
          .update(patch)
          .eq("organization_id", existing.organization_id);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["onboarding_progress"] }),
  });
}
