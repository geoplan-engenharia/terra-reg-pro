import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ConsultationHistoryRow {
  id: string;
  organization_id: string;
  user_id: string | null;
  property_id: string | null;
  data_source_key: string | null;
  query_params: Record<string, unknown> | null;
  result_summary: string | null;
  created_at: string;
  property_name?: string | null;
  user_name?: string | null;
  user_email?: string | null;
}

export interface HistoryFilter {
  propertyId?: string;
  userId?: string;
  from?: string;
  to?: string;
}

export function useConsultationHistory(filter: HistoryFilter = {}) {
  return useQuery({
    queryKey: ["consultation_history", filter],
    queryFn: async (): Promise<ConsultationHistoryRow[]> => {
      let q = supabase
        .from("consultation_history")
        .select("*, rural_properties(name)")
        .order("created_at", { ascending: false })
        .limit(200);
      if (filter.propertyId) q = q.eq("property_id", filter.propertyId);
      if (filter.userId) q = q.eq("user_id", filter.userId);
      if (filter.from) q = q.gte("created_at", filter.from);
      if (filter.to) q = q.lte("created_at", filter.to);
      const { data, error } = await q;
      if (error) throw error;

      const rows = (data ?? []) as Array<{
        id: string;
        organization_id: string;
        user_id: string | null;
        property_id: string | null;
        data_source_key: string | null;
        query_params: unknown;
        result_summary: string | null;
        created_at: string;
        rural_properties: { name: string } | null;
      }>;

      // Fetch profiles for unique user_ids
      const userIds = Array.from(new Set(rows.map((r) => r.user_id).filter((x): x is string => !!x)));
      let profileMap = new Map<string, { full_name: string | null; email: string | null }>();
      if (userIds.length > 0) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .in("id", userIds);
        for (const p of profs ?? []) {
          profileMap.set(p.id, { full_name: p.full_name, email: p.email });
        }
      }

      return rows.map((r) => ({
        id: r.id,
        organization_id: r.organization_id,
        user_id: r.user_id,
        property_id: r.property_id,
        data_source_key: r.data_source_key,
        query_params: (r.query_params as Record<string, unknown> | null) ?? null,
        result_summary: r.result_summary,
        created_at: r.created_at,
        property_name: r.rural_properties?.name ?? null,
        user_name: r.user_id ? profileMap.get(r.user_id)?.full_name ?? null : null,
        user_email: r.user_id ? profileMap.get(r.user_id)?.email ?? null : null,
      }));
    },
  });
}

export function useLogConsultation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      organization_id: string;
      user_id: string;
      property_id: string | null;
      data_source_key: string;
      query_params?: Record<string, unknown>;
      result_summary: string;
    }) => {
      const payload = {
        organization_id: input.organization_id,
        user_id: input.user_id,
        property_id: input.property_id,
        data_source_key: input.data_source_key,
        query_params: (input.query_params ?? {}) as never,
        result_summary: input.result_summary,
      };
      const { data, error } = await supabase
        .from("consultation_history")
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      if (input.property_id) {
        await supabase
          .from("rural_properties")
          .update({ last_consultation_at: new Date().toISOString() })
          .eq("id", input.property_id);
      }
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["consultation_history"] });
      qc.invalidateQueries({ queryKey: ["properties"] });
    },
  });
}
