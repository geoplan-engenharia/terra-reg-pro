import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type LayerType = "car" | "sigef" | "embargo" | "desmatamento" | "uso_solo" | "outros";
export type LayerGeometryType = "polygon" | "multipolygon" | "point" | "line";
export type DataLayerStatus = "ativa" | "planejada" | "indisponivel";
export type DataSourceKind = "geoespacial" | "documental";

export interface DataLayer {
  id: string;
  data_source_key: string;
  name: string;
  description: string | null;
  layer_type: LayerType;
  geometry_type: LayerGeometryType;
  status: DataLayerStatus;
  color: string;
  last_sync_at: string | null;
  visible_to_users: boolean;
  created_at: string;
  updated_at: string;
  features_count?: number;
}

export interface DataLayerFeature {
  id: string;
  layer_id: string;
  data_source_key: string;
  external_id: string | null;
  geometry_geojson: GeoJSON.Geometry;
  properties_json: Record<string, unknown>;
  municipality: string | null;
  uf: string | null;
  area_ha: number | null;
  source_updated_at: string | null;
  created_at: string;
}

const sb = supabase as any; // eslint-disable-line @typescript-eslint/no-explicit-any

export function useDataLayers() {
  return useQuery({
    queryKey: ["data_layers"],
    queryFn: async (): Promise<DataLayer[]> => {
      const { data, error } = await sb.from("data_layers").select("*").order("name");
      if (error) throw error;
      const layers = (data ?? []) as DataLayer[];
      // counts
      const ids = layers.map((l) => l.id);
      if (ids.length === 0) return layers;
      const counts: Record<string, number> = {};
      await Promise.all(
        ids.map(async (id) => {
          const { count } = await sb
            .from("data_layer_features")
            .select("id", { count: "exact", head: true })
            .eq("layer_id", id);
          counts[id] = count ?? 0;
        })
      );
      return layers.map((l) => ({ ...l, features_count: counts[l.id] ?? 0 }));
    },
  });
}

export function useLayerFeatures(layerId: string | null) {
  return useQuery({
    queryKey: ["layer_features", layerId],
    enabled: !!layerId,
    queryFn: async (): Promise<DataLayerFeature[]> => {
      const PAGE = 1000;
      const all: DataLayerFeature[] = [];
      let from = 0;
      const HARD_CEILING = 500_000;
      while (from < HARD_CEILING) {
        const to = from + PAGE - 1;
        const { data, error } = await sb
          .from("data_layer_features")
          .select("*")
          .eq("layer_id", layerId!)
          .range(from, to);
        if (error) throw error;
        const rows = (data ?? []) as DataLayerFeature[];
        all.push(...rows);
        if (rows.length < PAGE) break;
        from += PAGE;
      }
      return all;
    },
  });
}

// Busca feições da camada que intersectam o bbox visível atual.
// O backend limita a 500 (zoom<8, amostradas), 2000 (intermediário) ou 5000 (zoom>12).
export interface ViewportBbox {
  minLng: number; minLat: number; maxLng: number; maxLat: number;
}
export function useFeaturesInBbox(
  layerId: string | null,
  bbox: ViewportBbox | null,
  zoom: number,
) {
  // arredondamos o bbox para reduzir refetches em micro-movimentos
  const r = (n: number) => Math.round(n * 100) / 100;
  const key = bbox
    ? `${r(bbox.minLng)},${r(bbox.minLat)},${r(bbox.maxLng)},${r(bbox.maxLat)}`
    : null;
  return useQuery({
    queryKey: ["layer_features_bbox", layerId, key, zoom < 6 ? "off" : zoom < 8 ? "low" : zoom > 12 ? "high" : "mid"],
    enabled: !!layerId && !!bbox && zoom >= 6,
    staleTime: 30_000,
    queryFn: async (): Promise<DataLayerFeature[]> => {
      const { data, error } = await sb.rpc("get_features_in_bbox", {
        _layer_id: layerId,
        _min_lng: bbox!.minLng,
        _min_lat: bbox!.minLat,
        _max_lng: bbox!.maxLng,
        _max_lat: bbox!.maxLat,
        _zoom: Math.round(zoom),
      });
      if (error) throw error;
      return (data ?? []) as DataLayerFeature[];
    },
  });
}

export function useSyncDataLayer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      data_source_key: string;
      layer_type: LayerType;
      layer_name?: string;
      color?: string;
    }) => {
      const { data, error } = await sb.rpc("sync_data_layer_simulated", {
        _data_source_key: input.data_source_key,
        _layer_type: input.layer_type,
        _layer_name: input.layer_name ?? null,
        _color: input.color ?? "#3b9bff",
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["data_layers"] });
      qc.invalidateQueries({ queryKey: ["layer_features"] });
      qc.invalidateQueries({ queryKey: ["data_sources"] });
    },
  });
}

export function useUpdateLayer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; patch: Partial<DataLayer> }) => {
      const { error } = await sb.from("data_layers").update(input.patch).eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["data_layers"] }),
  });
}

export function useDeleteLayer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb.from("data_layers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["data_layers"] }),
  });
}

export function useImportFeatureAsProperty() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { feature_id: string; client_id?: string | null; name?: string }) => {
      const { data, error } = await sb.rpc("import_layer_feature_as_property", {
        _feature_id: input.feature_id,
        _client_id: input.client_id ?? null,
        _name: input.name ?? null,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["properties"] });
      qc.invalidateQueries({ queryKey: ["onboarding_progress"] });
    },
  });
}

export interface DocumentalSearchResult {
  source_key: string;
  source_name: string;
  identifier: string;
  id_type: string;
  found: boolean;
  severidade: "alta" | "media" | "baixa";
  title: string;
  description: string;
  data: Record<string, unknown>;
}

export function useSearchDocumental() {
  return useMutation({
    mutationFn: async (input: { identifier: string; id_type?: string }): Promise<DocumentalSearchResult[]> => {
      const { data, error } = await sb.rpc("search_documental_sources", {
        _identifier: input.identifier,
        _id_type: input.id_type ?? "cpf_cnpj",
      });
      if (error) throw error;
      return (data ?? []) as DocumentalSearchResult[];
    },
  });
}
