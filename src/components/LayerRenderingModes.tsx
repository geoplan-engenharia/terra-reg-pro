import { useEffect, useMemo, useRef } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet.heat";
import "leaflet.markercluster";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import type { FeatureDensityPoint } from "@/lib/layer-queries";

// Heatmap (zoom < 8)
export function HeatLayer({ points, color }: { points: FeatureDensityPoint[]; color: string }) {
  const map = useMap();
  const layerRef = useRef<L.Layer | null>(null);
  useEffect(() => {
    if (points.length === 0) return;
    // gradient anchored on layer color
    const heatPoints = points.map((p) => [p.lat, p.lng, 0.5] as [number, number, number]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const heat = (L as any).heatLayer(heatPoints, {
      radius: 18,
      blur: 22,
      maxZoom: 9,
      minOpacity: 0.35,
      gradient: { 0.2: "#1e3a5c", 0.4: color, 0.7: "#f4a02b", 1.0: "#e85d4a" },
    });
    heat.addTo(map);
    layerRef.current = heat;
    return () => {
      if (layerRef.current) map.removeLayer(layerRef.current);
      layerRef.current = null;
    };
  }, [map, points, color]);
  return null;
}

// Cluster (zoom 8..11)
export function ClusterLayer({ points, color }: { points: FeatureDensityPoint[]; color: string }) {
  const map = useMap();
  const groupRef = useRef<L.MarkerClusterGroup | null>(null);
  const dotIcon = useMemo(
    () =>
      L.divIcon({
        className: "geoterra-cluster-dot",
        html: `<span style="display:block;width:10px;height:10px;border-radius:9999px;background:${color};border:1px solid rgba(0,0,0,0.4);box-shadow:0 0 4px rgba(0,0,0,0.4)"></span>`,
        iconSize: [10, 10],
        iconAnchor: [5, 5],
      }),
    [color],
  );
  useEffect(() => {
    if (points.length === 0) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const group = (L as any).markerClusterGroup({
      chunkedLoading: true,
      showCoverageOnHover: false,
      spiderfyOnMaxZoom: false,
      maxClusterRadius: 60,
      iconCreateFunction: (cluster: L.MarkerCluster) => {
        const count = cluster.getChildCount();
        const size = count < 100 ? 36 : count < 1000 ? 44 : 54;
        return L.divIcon({
          html: `<div style="background:${color};color:#fff;border-radius:9999px;width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:600;border:2px solid rgba(255,255,255,0.85);box-shadow:0 2px 8px rgba(0,0,0,0.45)">${count.toLocaleString("pt-BR")}</div>`,
          className: "geoterra-cluster",
          iconSize: [size, size],
        });
      },
    }) as L.MarkerClusterGroup;
    points.forEach((p) => {
      group.addLayer(L.marker([p.lat, p.lng], { icon: dotIcon }));
    });
    group.addTo(map);
    groupRef.current = group;
    return () => {
      if (groupRef.current) map.removeLayer(groupRef.current);
      groupRef.current = null;
    };
  }, [map, points, color, dotIcon]);
  return null;
}
