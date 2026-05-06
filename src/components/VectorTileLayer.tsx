import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet.vectorgrid";
import { supabase } from "@/integrations/supabase/client";
import type { DataLayer, DataLayerFeature } from "@/lib/layer-queries";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Lany = L as any;

export function VectorTileLayer({
  layer,
  selectedFeatureId,
  onFeatureClick,
}: {
  layer: DataLayer;
  selectedFeatureId: string | null;
  onFeatureClick: (f: DataLayerFeature, l: DataLayer) => void;
}) {
  const map = useMap();
  const layerRef = useRef<L.Layer | null>(null);
  const selectedRef = useRef<string | null>(selectedFeatureId);

  useEffect(() => {
    selectedRef.current = selectedFeatureId;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const lyr = layerRef.current as any;
    try {
      lyr?.redraw?.();
    } catch {
      /* ignore */
    }
  }, [selectedFeatureId]);

  useEffect(() => {
    const url = `/api/public/vector-tile?z={z}&x={x}&y={y}&layer_id=${layer.id}`;
    const baseStyle = (props: { id?: string } | undefined, zoom: number) => {
      const id = props?.id;
      const isSelected = id != null && id === selectedRef.current;
      const fillOpacity = isSelected ? 0.55 : zoom < 8 ? 0.4 : 0.6;
      return {
        fill: true,
        fillColor: layer.color,
        fillOpacity,
        color: isSelected ? "#ffffff" : layer.color,
        weight: isSelected ? 2.5 : 0.6,
        opacity: 1,
      };
    };
    const grid = Lany.vectorGrid.protobuf(url, {
      rendererFactory: Lany.canvas.tile,
      interactive: true,
      maxNativeZoom: 16,
      minZoom: 2,
      vectorTileLayerStyles: {
        // PostGIS layer name in ST_AsMVT is "features"
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        features: (props: any, zoom: number) => baseStyle(props, zoom),
      },
      getFeatureId: (f: { properties?: { id?: string } }) => f.properties?.id,
    });

    grid.on("click", async (e: L.LeafletMouseEvent & { layer?: { properties?: { id?: string } } }) => {
      L.DomEvent.stop(e);
      const id = e.layer?.properties?.id;
      if (!id) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sb = supabase as any;
      const { data, error } = await sb.rpc("get_feature_by_id", { _feature_id: id });
      if (error || !data || (Array.isArray(data) && data.length === 0)) return;
      const row = (Array.isArray(data) ? data[0] : data) as DataLayerFeature;
      onFeatureClick(row, layer);
    });

    grid.addTo(map);
    layerRef.current = grid;

    return () => {
      try {
        map.removeLayer(grid);
      } catch {
        /* ignore */
      }
      layerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, layer.id, layer.color]);

  return null;
}
