import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import type { Map as MLMap, StyleSpecification } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useProperties } from "@/lib/queries";
import type { RuralProperty } from "@/lib/types";
import { ImovelPanel } from "./ImovelPanel";
import { PropertyForm } from "./PropertyForm";
import { LayerFeaturePanel } from "./LayerFeaturePanel";
import { LayerControl } from "./LayerControl";
import { PlaceSearch } from "./PlaceSearch";
import { MapLegend } from "./MapLegend";
import { useAuth } from "@/lib/auth";
import { ChevronRight, Search, Loader2, Plus, Layers as LayersIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useGuardTrial } from "./TrialGuard";
import { useDataLayers, type DataLayer, type DataLayerFeature } from "@/lib/layer-queries";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const LAYER_PREFS_KEY = "geoterra:active-layers";
const BASEMAP_PREFS_KEY = "geoterra:basemap";

type BasemapId = "satellite" | "hybrid" | "streets" | "topo";

const ESRI_IMG = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
const BASEMAPS: Record<BasemapId, { label: string; tiles: string[]; attribution: string; labels?: string }> = {
  satellite: { label: "Satélite", tiles: [ESRI_IMG], attribution: "Imagery © Esri, Maxar, Earthstar Geographics" },
  hybrid: {
    label: "Satélite + rótulos",
    tiles: [ESRI_IMG],
    attribution: "Imagery © Esri, Maxar, Earthstar Geographics",
    labels: "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
  },
  streets: {
    label: "Ruas (OSM)",
    tiles: ["https://a.tile.openstreetmap.org/{z}/{x}/{y}.png", "https://b.tile.openstreetmap.org/{z}/{x}/{y}.png"],
    attribution: "© OpenStreetMap contributors",
  },
  topo: {
    label: "Topográfico",
    tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}"],
    attribution: "Topo © Esri",
  },
};

function colorForProperty(p: RuralProperty): string {
  if (p.car_status === "cancelado" || p.car_status === "suspenso") return "#e85d4a";
  if (p.car_status === "nao_cadastrado" || p.sigef_status !== "certificado") return "#f4a02b";
  return "#5fbb6f";
}

function geomBounds(geom: GeoJSON.Geometry): [[number, number], [number, number]] | null {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const walk = (c: unknown): void => {
    if (Array.isArray(c) && typeof c[0] === "number") {
      const [x, y] = c as number[];
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
    } else if (Array.isArray(c)) c.forEach(walk);
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  walk((geom as any).coordinates);
  return Number.isFinite(minX) ? [[minX, minY], [maxX, maxY]] : null;
}

function buildStyle(id: BasemapId): StyleSpecification {
  const b = BASEMAPS[id];
  const style: StyleSpecification = {
    version: 8,
    sources: { base: { type: "raster", tiles: b.tiles, tileSize: 256, attribution: b.attribution, maxzoom: 19 } },
    layers: [{ id: "base", type: "raster", source: "base" }],
  };
  if (b.labels) {
    style.sources.labels = { type: "raster", tiles: [b.labels], tileSize: 256, maxzoom: 19 };
    style.layers.push({ id: "labels", type: "raster", source: "labels" });
  }
  return style;
}

const tileUrl = (layerId: string) =>
  `${window.location.origin}/api/public/vector-tile?z={z}&x={x}&y={y}&layer_id=${layerId}`;

export function MapaInterativo() {
  const { canEditProperties } = useAuth();
  const guardTrial = useGuardTrial();
  const { data: properties = [], isLoading } = useProperties();
  const { data: dataLayers = [] } = useDataLayers();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeLayerIds, setActiveLayerIds] = useState<Record<string, boolean>>({});
  const [busca, setBusca] = useState("");
  const [formMode, setFormMode] = useState<"create" | "edit" | null>(null);
  const [editTarget, setEditTarget] = useState<RuralProperty | null>(null);
  const [selectedFeature, setSelectedFeature] = useState<{ feature: DataLayerFeature; layer: DataLayer } | null>(null);
  const [basemap, setBasemap] = useState<BasemapId>("hybrid");
  const [zoomLevel, setZoomLevel] = useState(4);
  const [styleVersion, setStyleVersion] = useState(0);
  const [prefsLoaded, setPrefsLoaded] = useState(false);

  const hostRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MLMap | null>(null);
  const styleReady = useRef(false);

  // Load prefs after hydration
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(LAYER_PREFS_KEY);
      if (raw) setActiveLayerIds(JSON.parse(raw));
      const bm = window.localStorage.getItem(BASEMAP_PREFS_KEY) as BasemapId | null;
      if (bm && BASEMAPS[bm]) setBasemap(bm);
    } catch { /* ignore */ }
    setPrefsLoaded(true);
  }, []);
  useEffect(() => {
    if (!prefsLoaded) return;
    try {
      window.localStorage.setItem(LAYER_PREFS_KEY, JSON.stringify(activeLayerIds));
      window.localStorage.setItem(BASEMAP_PREFS_KEY, basemap);
    } catch { /* ignore */ }
  }, [activeLayerIds, basemap, prefsLoaded]);

  const selected = useMemo(() => properties.find((p) => p.id === selectedId) ?? null, [properties, selectedId]);
  const georef = useMemo(() => properties.filter((p) => p.centroid_lat != null && p.centroid_lng != null), [properties]);
  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return georef;
    return georef.filter(
      (i) =>
        i.name.toLowerCase().includes(q) ||
        (i.owner_name ?? "").toLowerCase().includes(q) ||
        (i.car_code ?? "").toLowerCase().includes(q) ||
        (i.matricula_number ?? "").toLowerCase().includes(q)
    );
  }, [busca, georef]);

  const visibleLayers = useMemo(() => dataLayers.filter((l) => l.visible_to_users && l.status === "ativa"), [dataLayers]);
  const activeLayersList = useMemo(() => visibleLayers.filter((l) => activeLayerIds[l.id]), [visibleLayers, activeLayerIds]);

  // Latest values for map event handlers
  const stateRef = useRef({ activeLayersList, properties });
  stateRef.current = { activeLayersList, properties };

  const flyTo = useCallback((lat: number, lng: number, zoom = 14) => {
    mapRef.current?.flyTo({ center: [lng, lat], zoom, duration: 1200 });
  }, []);
  const fitBounds = useCallback((b: [[number, number], [number, number]], maxZoom = 15) => {
    mapRef.current?.fitBounds(b, { padding: 60, maxZoom, duration: 1000 });
  }, []);

  // Init map once
  useEffect(() => {
    if (!hostRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: hostRef.current,
      style: buildStyle(basemap),
      center: [-51.9253, -14.235],
      zoom: 4,
      attributionControl: { compact: true },
      canvasContextAttributes: { preserveDrawingBuffer: true },
    });
    map.addControl(new maplibregl.NavigationControl({ visualizePitch: false }), "bottom-left");
    map.addControl(new maplibregl.ScaleControl({ unit: "metric" }), "bottom-left");
    map.on("zoomend", () => setZoomLevel(map.getZoom()));
    map.on("style.load", () => { styleReady.current = true; setStyleVersion((v) => v + 1); });

    map.on("click", async (e: maplibregl.MapMouseEvent) => {
      // Properties first
      const props = map.queryRenderedFeatures(e.point, { layers: map.getLayer("props-circle") ? ["props-circle"] : [] });
      if (props.length) {
        setSelectedId(String(props[0].properties?.id));
        setSelectedFeature(null);
        return;
      }
      const fillIds = stateRef.current.activeLayersList.map((l) => `dl-fill-${l.id}`).filter((id) => map.getLayer(id));
      const ptIds = stateRef.current.activeLayersList.map((l) => `dl-pts-${l.id}`).filter((id) => map.getLayer(id));
      const hits = map.queryRenderedFeatures(e.point, { layers: [...fillIds, ...ptIds] });
      if (!hits.length) return;
      const hit = hits[0];
      const layerId = String(hit.layer.id).replace(/^dl-(fill|pts)-/, "");
      const layer = stateRef.current.activeLayersList.find((l) => l.id === layerId);
      const featId = hit.properties?.id as string | undefined;
      if (!featId || !layer) {
        map.easeTo({ center: e.lngLat, zoom: Math.max(map.getZoom() + 3, 10) });
        toast.info("Aproxime o mapa para clicar em um imóvel individual.");
        return;
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any).rpc("get_feature_by_id", { _feature_id: featId });
      const row = (Array.isArray(data) ? data[0] : data) as DataLayerFeature | undefined;
      if (error || !row) { toast.error("Não foi possível carregar os dados da feição."); return; }
      setSelectedFeature({ feature: row, layer });
      setSelectedId(null);
      const b = geomBounds(row.geometry_geojson);
      if (b) map.fitBounds(b, { padding: 80, maxZoom: 16, duration: 800 });
    });

    map.on("mousemove", (e: maplibregl.MapMouseEvent) => {
      const ids = [
        "props-circle",
        ...stateRef.current.activeLayersList.flatMap((l) => [`dl-fill-${l.id}`, `dl-pts-${l.id}`]),
      ].filter((id) => map.getLayer(id));
      const f = ids.length ? map.queryRenderedFeatures(e.point, { layers: ids }) : [];
      map.getCanvas().style.cursor = f.length ? "pointer" : "";
    });

    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Basemap change
  const firstBasemap = useRef(true);
  useEffect(() => {
    if (firstBasemap.current) { firstBasemap.current = false; return; }
    styleReady.current = false;
    mapRef.current?.setStyle(buildStyle(basemap));
  }, [basemap]);

  // Data layers (vector tiles)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !styleReady.current) return;
    const wanted = new Set(activeLayersList.map((l) => l.id));
    // remove stale
    for (const l of map.getStyle().layers ?? []) {
      const m = /^dl-(?:fill|line|sel|pts)-(.+)$/.exec(l.id);
      if (m && !wanted.has(m[1])) map.removeLayer(l.id);
    }
    for (const id of Object.keys(map.getStyle().sources ?? {})) {
      const m = /^dl-src-(.+)$/.exec(id);
      if (m && !wanted.has(m[1])) map.removeSource(id);
    }
    const before = map.getLayer("props-circle") ? "props-circle" : undefined;
    for (const l of activeLayersList) {
      const src = `dl-src-${l.id}`;
      if (!map.getSource(src)) {
        map.addSource(src, { type: "vector", tiles: [tileUrl(l.id)], minzoom: 2, maxzoom: 16 });
        map.addLayer({
          id: `dl-pts-${l.id}`, type: "circle", source: src, "source-layer": "points", maxzoom: 9,
          paint: {
            "circle-color": l.color,
            "circle-opacity": 0.75,
            "circle-radius": ["interpolate", ["linear"], ["zoom"], 4, 1, 8, 2.5],
          },
        }, before);
        map.addLayer({
          id: `dl-fill-${l.id}`, type: "fill", source: src, "source-layer": "features", minzoom: 9,
          paint: { "fill-color": l.color, "fill-opacity": 0.35 },
        }, before);
        map.addLayer({
          id: `dl-line-${l.id}`, type: "line", source: src, "source-layer": "features", minzoom: 9,
          paint: { "line-color": l.color, "line-width": ["interpolate", ["linear"], ["zoom"], 9, 0.4, 14, 1.2] },
        }, before);
        map.addLayer({
          id: `dl-sel-${l.id}`, type: "line", source: src, "source-layer": "features", minzoom: 9,
          filter: ["==", ["get", "id"], ""],
          paint: { "line-color": "#ffffff", "line-width": 3 },
        }, before);
      }
    }
  }, [activeLayersList, styleVersion]);

  // Selected feature highlight
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !styleReady.current) return;
    const sel = selectedFeature?.feature.id ?? "";
    for (const l of activeLayersList) {
      if (map.getLayer(`dl-sel-${l.id}`)) map.setFilter(`dl-sel-${l.id}`, ["==", ["get", "id"], sel]);
    }
  }, [selectedFeature, activeLayersList, styleVersion]);

  // Properties (GeoJSON points)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !styleReady.current) return;
    const fc: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: filtrados.map((p) => ({
        type: "Feature",
        geometry: { type: "Point", coordinates: [Number(p.centroid_lng), Number(p.centroid_lat)] },
        properties: { id: p.id, color: colorForProperty(p), active: p.id === selectedId ? 1 : 0, name: p.name },
      })),
    };
    const src = map.getSource("props") as maplibregl.GeoJSONSource | undefined;
    if (src) src.setData(fc);
    else {
      map.addSource("props", { type: "geojson", data: fc });
      map.addLayer({
        id: "props-circle", type: "circle", source: "props",
        paint: {
          "circle-color": ["get", "color"],
          "circle-opacity": ["case", ["==", ["get", "active"], 1], 0.9, 0.6],
          "circle-radius": ["case", ["==", ["get", "active"], 1], 11, 7],
          "circle-stroke-color": ["case", ["==", ["get", "active"], 1], "#ffffff", ["get", "color"]],
          "circle-stroke-width": 2,
        },
      });
    }
  }, [filtrados, selectedId, styleVersion]);

  const toggleLayer = (id: string) => setActiveLayerIds((prev) => ({ ...prev, [id]: !prev[id] }));
  const activateAll = () => {
    const next: Record<string, boolean> = {};
    visibleLayers.forEach((l) => { next[l.id] = true; });
    setActiveLayerIds(next);
  };
  const clearAll = () => setActiveLayerIds({});
  const resetLayers = () => {
    try { window.localStorage.removeItem(LAYER_PREFS_KEY); } catch { /* ignore */ }
    setActiveLayerIds({});
  };

  const zoomToLayer = useCallback(async (layer: DataLayer) => {
    setActiveLayerIds((prev) => ({ ...prev, [layer.id]: true }));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any;
    const pick = async (col: string, asc: boolean) => {
      const { data } = await sb.from("data_layer_features").select(col).eq("layer_id", layer.id)
        .not(col, "is", null).order(col, { ascending: asc }).limit(1);
      return data?.[0]?.[col] as number | undefined;
    };
    const [w, s, e, n] = await Promise.all([
      pick("bbox_min_lng", true), pick("bbox_min_lat", true), pick("bbox_max_lng", false), pick("bbox_max_lat", false),
    ]);
    if ([w, s, e, n].every((v) => v != null)) fitBounds([[Number(w), Number(s)], [Number(e), Number(n)]], 12);
  }, [fitBounds]);

  return (
    <div className="geoterra-map-host relative h-full w-full">
      <div ref={hostRef} className="h-full w-full" />

      <div className="absolute top-4 left-4 w-80 max-h-[calc(100%-2rem)] flex flex-col gap-3 z-[999]">
        <div className="rounded-lg border border-border bg-card/95 backdrop-blur shadow-panel p-3 space-y-2">
          <PlaceSearch
            onSelect={(place) => {
              const isState = place.type === "state" || place.type === "administrative";
              if (isState && place.bbox) {
                const [s, n, w, e] = place.bbox;
                fitBounds([[w, s], [e, n]], 10);
              } else flyTo(place.lat, place.lon, 14);
            }}
          />
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar imóvel, CAR ou matrícula"
              className="h-9 w-full rounded-md border border-input bg-input/40 pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          {canEditProperties && (
            <button
              type="button"
              onClick={() => { if (guardTrial()) return; setEditTarget(null); setFormMode("create"); }}
              className="w-full inline-flex items-center justify-center gap-2 h-9 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition"
            >
              <Plus className="h-4 w-4" /> Novo imóvel
            </button>
          )}
        </div>

        <LayerControl
          layers={visibleLayers}
          activeIds={activeLayerIds}
          onToggle={toggleLayer}
          onZoom={zoomToLayer}
          onActivateAll={activateAll}
          onClearAll={clearAll}
          onReset={resetLayers}
        />

        <div className="rounded-lg border border-border bg-card/95 backdrop-blur shadow-panel overflow-hidden flex flex-col min-h-0">
          <div className="px-3 py-2.5 border-b border-border flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Imóveis ({filtrados.length}/{properties.length})
            </span>
          </div>
          <div className="overflow-auto max-h-72">
            {isLoading ? (
              <div className="p-4 flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Carregando imóveis...
              </div>
            ) : properties.length === 0 ? (
              <div className="p-4 text-xs text-muted-foreground">Nenhum imóvel cadastrado.</div>
            ) : georef.length === 0 ? (
              <div className="p-4 text-xs text-muted-foreground">Nenhum imóvel possui coordenadas geográficas registradas.</div>
            ) : (
              filtrados.map((p) => {
                const active = p.id === selectedId;
                return (
                  <button
                    key={p.id}
                    onClick={() => {
                      setSelectedId(p.id);
                      setSelectedFeature(null);
                      flyTo(Number(p.centroid_lat), Number(p.centroid_lng));
                    }}
                    className={cn(
                      "w-full text-left px-3 py-2.5 border-b border-border last:border-b-0 hover:bg-accent/10 flex items-start gap-2.5 transition",
                      active && "bg-accent/10"
                    )}
                  >
                    <span className="mt-1 h-2.5 w-2.5 rounded-full shrink-0" style={{ background: colorForProperty(p) }} />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium truncate">{p.name}</div>
                      <div className="text-[11px] text-muted-foreground truncate">
                        {p.municipio ?? "—"}/{p.uf ?? "—"}
                        {p.area_ha != null ? ` · ${Number(p.area_ha).toLocaleString("pt-BR")} ha` : ""}
                      </div>
                    </div>
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground mt-1 shrink-0" />
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>

      <MapLegend activeLayers={activeLayersList} zoom={zoomLevel} />

      <div className="absolute top-4 right-4 z-[999] rounded-lg border border-border bg-card/95 backdrop-blur shadow-panel p-2 flex items-center gap-1">
        <LayersIcon className="h-3.5 w-3.5 text-muted-foreground ml-1 mr-1" />
        {(Object.keys(BASEMAPS) as BasemapId[]).map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setBasemap(id)}
            className={cn(
              "px-2.5 py-1 text-xs rounded-md transition",
              basemap === id ? "bg-primary text-primary-foreground font-medium" : "text-muted-foreground hover:bg-accent/10"
            )}
          >
            {BASEMAPS[id].label}
          </button>
        ))}
      </div>

      {selectedId && !selectedFeature && (
        <ImovelPanel
          propertyId={selectedId}
          onClose={() => setSelectedId(null)}
          onEdit={() => { if (selected) { setEditTarget(selected); setFormMode("edit"); } }}
        />
      )}

      {selectedFeature && (
        <LayerFeaturePanel
          feature={selectedFeature.feature}
          layer={selectedFeature.layer}
          onClose={() => setSelectedFeature(null)}
          onImported={(id) => {
            setSelectedFeature(null);
            setSelectedId(id);
            const p = properties.find((x) => x.id === id);
            if (p?.centroid_lat != null && p?.centroid_lng != null) flyTo(Number(p.centroid_lat), Number(p.centroid_lng));
          }}
        />
      )}

      {formMode && (
        <PropertyForm
          mode={formMode}
          property={editTarget}
          onClose={() => { setFormMode(null); setEditTarget(null); }}
          onSaved={(id) => {
            setSelectedId(id);
            const p = properties.find((x) => x.id === id);
            if (p?.centroid_lat != null && p?.centroid_lng != null) flyTo(Number(p.centroid_lat), Number(p.centroid_lng));
          }}
        />
      )}
    </div>
  );
}
