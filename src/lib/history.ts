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
  // joined
  property_name?: string | null;
  user_name?: string | null;
  user_email?: string | null;
}

export interface HistoryFilter {
  propertyId?: string;
  userId?: string;
  from?: string; // ISO date
  to?: string;
}

export function useConsultationHistory(filter: HistoryFilter = {}) {
  return useQuery({
    queryKey: ["consultation_history", filter],
    queryFn: async (): Promise<ConsultationHistoryRow[]> => {
      let q = supabase
        .from("consultation_history")
        .select("*, rural_properties(name), profiles(full_name, email)")
        .order("created_at", { ascending: false })
        .limit(200);
      if (filter.propertyId) q = q.eq("property_id", filter.propertyId);
      if (filter.userId) q = q.eq("user_id", filter.userId);
      if (filter.from) q = q.gte("created_at", filter.from);
      if (filter.to) q = q.lte("created_at", filter.to);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []).map((r) => {
        const row = r as ConsultationHistoryRow & {
          rural_properties?: { name: string } | null;
          profiles?: { full_name: string | null; email: string | null } | null;
        };
        return {
          ...row,
          property_name: row.rural_properties?.name ?? null,
          user_name: row.profiles?.full_name ?? null,
          user_email: row.profiles?.email ?? null,
        };
      });
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
      const { data, error } = await supabase.from("consultation_history").insert(input).select().single();
      if (error) throw error;
      // Touch property's last_consultation_at
      if (input.property_id) {
        await supabase
          .from("rural_properties")
          .update({ last_consultation_at: new Date().toISOString() })
          .eq("id", input.property_id);
      }
      return data as ConsultationHistoryRow;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["consultation_history"] });
      qc.invalidateQueries({ queryKey: ["properties"] });
    },
  });
}
