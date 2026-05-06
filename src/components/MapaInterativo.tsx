import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, CircleMarker, Tooltip, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import { MapTools } from "./MapTools";
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
import { VectorTileLayer } from "./VectorTileLayer";

delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;

const LAYER_PREFS_KEY = "geoterra:active-layers";
const BASEMAP_PREFS_KEY = "geoterra:basemap";

type BasemapId = "satellite" | "hybrid" | "streets" | "topo";

const BASEMAPS: Record<BasemapId, { label: string; url: string; attribution: string; maxZoom?: number; overlayLabels?: string }> = {
  satellite: {
    label: "Satélite",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: 'Imagery &copy; Esri, Maxar, Earthstar Geographics, USDA, USGS, AeroGRID, IGN, GIS User Community',
    maxZoom: 19,
  },
  hybrid: {
    label: "Satélite + rótulos",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: 'Imagery &copy; Esri, Maxar, Earthstar Geographics',
    maxZoom: 19,
    overlayLabels: "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
  },
  streets: {
    label: "Ruas (OSM)",
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 19,
  },
  topo: {
    label: "Topográfico",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}",
    attribution: 'Topo &copy; Esri',
    maxZoom: 19,
  },
};

function FlyTo({ target, zoom }: { target: [number, number] | null; zoom?: number }) {
  const map = useMap();
  useEffect(() => {
    if (target) map.flyTo(target, zoom ?? 14, { duration: 1.2 });
  }, [target, map, zoom]);
  return null;
}

function FitBoundsTo({ bounds }: { bounds: L.LatLngBoundsExpression | null }) {
  const map = useMap();
  useEffect(() => {
    if (bounds) map.flyToBounds(bounds, { padding: [40, 40], duration: 1.0, maxZoom: 13 });
  }, [bounds, map]);
  return null;
}

function colorForProperty(p: RuralProperty): string {
  if (p.car_status === "cancelado" || p.car_status === "suspenso") return "#e85d4a";
  if (p.car_status === "nao_cadastrado" || p.sigef_status !== "certificado") return "#f4a02b";
  return "#5fbb6f";
}

function geometryBounds(geom: GeoJSON.Geometry): L.LatLngBoundsExpression | null {
  try {
    const layer = L.geoJSON(geom as GeoJSON.GeoJsonObject);
    const b = layer.getBounds();
    return b.isValid() ? b : null;
  } catch {
    return null;
  }
}

function ViewportZoomTracker({ onZoom }: { onZoom: (z: number) => void }) {
  const map = useMapEvents({
    zoomend: () => onZoom(map.getZoom()),
    load: () => onZoom(map.getZoom()),
  });
  useEffect(() => { onZoom(map.getZoom()); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

export function MapaInterativo() {
  const { canEditProperties } = useAuth();
  const guardTrial = useGuardTrial();
  const { data: properties = [], isLoading } = useProperties();
  const { data: dataLayers = [] } = useDataLayers();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeLayerIds, setActiveLayerIds] = useState<Record<string, boolean>>(() => {
    if (typeof window === "undefined") return {};
    try {
      const raw = window.localStorage.getItem(LAYER_PREFS_KEY);
      return raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
    } catch {
      return {};
    }
  });
  const [flyTarget, setFlyTarget] = useState<[number, number] | null>(null);
  const [flyZoom, setFlyZoom] = useState<number | undefined>(undefined);
  const [flyBounds, setFlyBounds] = useState<L.LatLngBoundsExpression | null>(null);
  const [busca, setBusca] = useState("");
  const [formMode, setFormMode] = useState<"create" | "edit" | null>(null);
  const [editTarget, setEditTarget] = useState<RuralProperty | null>(null);
  const [selectedFeature, setSelectedFeature] = useState<{ feature: DataLayerFeature; layer: DataLayer } | null>(null);
  const [basemap, setBasemap] = useState<BasemapId>(() => {
    if (typeof window === "undefined") return "hybrid";
    try {
      const raw = window.localStorage.getItem(BASEMAP_PREFS_KEY) as BasemapId | null;
      return raw && BASEMAPS[raw] ? raw : "hybrid";
    } catch {
      return "hybrid";
    }
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    try { window.localStorage.setItem(BASEMAP_PREFS_KEY, basemap); } catch { /* ignore */ }
  }, [basemap]);

  // Persist layer state
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(LAYER_PREFS_KEY, JSON.stringify(activeLayerIds));
    } catch {
      /* ignore */
    }
  }, [activeLayerIds]);

  const selected = useMemo(() => properties.find((p) => p.id === selectedId) ?? null, [properties, selectedId]);

  const georef = useMemo(
    () => properties.filter((p) => p.centroid_lat != null && p.centroid_lng != null),
    [properties]
  );

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

  const visibleLayers = useMemo(
    () => dataLayers.filter((l) => l.visible_to_users && l.status === "ativa"),
    [dataLayers]
  );

  const activeLayersList = useMemo(
    () => visibleLayers.filter((l) => activeLayerIds[l.id]),
    [visibleLayers, activeLayerIds]
  );

  const toggleLayer = (id: string) =>
    setActiveLayerIds((prev) => ({ ...prev, [id]: !prev[id] }));

  const activateAll = () => {
    const next: Record<string, boolean> = {};
    visibleLayers.forEach((l) => { next[l.id] = true; });
    setActiveLayerIds(next);
  };
  const clearAll = () => setActiveLayerIds({});

  const zoomToLayer = useCallback(async (layer: DataLayer) => {
    if (!activeLayerIds[layer.id]) {
      setActiveLayerIds((prev) => ({ ...prev, [layer.id]: true }));
    }
    // Fetch a quick sample to compute bbox
    const { data } = await (await import("@/integrations/supabase/client")).supabase
      .from("data_layer_features")
      .select("geometry_geojson")
      .eq("layer_id", layer.id)
      .limit(1000);
    const feats = ((data ?? []) as unknown as Array<{ geometry_geojson: GeoJSON.Geometry }>);
    if (feats.length === 0) return;
    try {
      const fc: GeoJSON.FeatureCollection = {
        type: "FeatureCollection",
        features: feats.map((f) => ({ type: "Feature", geometry: f.geometry_geojson, properties: {} })),
      };
      const lyr = L.geoJSON(fc as GeoJSON.GeoJsonObject);
      const b = lyr.getBounds();
      if (b.isValid()) setFlyBounds(b);
    } catch { /* ignore */ }
  }, [activeLayerIds]);

  const mapHostRef = useRef<HTMLDivElement | null>(null);

  // Zoom is tracked only for the legend hints
  const [zoomLevel, setZoomLevel] = useState<number>(4);

  const resetLayers = useCallback(() => {
    try { window.localStorage.removeItem(LAYER_PREFS_KEY); } catch { /* ignore */ }
    setActiveLayerIds({});
  }, []);



  return (
    <div ref={mapHostRef} className="geoterra-map-host relative h-full w-full">
      <MapContainer
        center={[-14.235, -51.9253]}
        zoom={4}
        scrollWheelZoom
        className="h-full w-full"
        zoomControl={false}
      >
        <TileLayer
          key={basemap}
          attribution={BASEMAPS[basemap].attribution}
          url={BASEMAPS[basemap].url}
          maxZoom={BASEMAPS[basemap].maxZoom ?? 19}
        />
        {BASEMAPS[basemap].overlayLabels && (
          <TileLayer
            key={basemap + ":labels"}
            url={BASEMAPS[basemap].overlayLabels!}
            attribution=""
            maxZoom={BASEMAPS[basemap].maxZoom ?? 19}
          />
        )}
        <FlyTo target={flyTarget} zoom={flyZoom} />
        <FitBoundsTo bounds={flyBounds} />
        <MapTools
          mapContainerRef={mapHostRef}
          onFlyTo={(lat, lon, zoom) => {
            setFlyBounds(null);
            setFlyZoom(zoom);
            // força novo target mesmo se coords iguais
            setFlyTarget([lat + Math.random() * 1e-9, lon]);
          }}
          onFlyBounds={(b) => setFlyBounds(b)}
        />

        <ViewportZoomTracker onZoom={setZoomLevel} />

        {activeLayersList.map((l) => (
          <VectorTileLayer
            key={l.id}
            layer={l}
            selectedFeatureId={selectedFeature?.feature.id ?? null}
            onFeatureClick={(feature, layer) => {
              setSelectedFeature({ feature, layer });
              setSelectedId(null);
              const b = geometryBounds(feature.geometry_geojson);
              if (b) setFlyBounds(b);
            }}
          />
        ))}

        {filtrados.map((p) => {
          const color = colorForProperty(p);
          const isActive = p.id === selectedId;
          const center: [number, number] = [Number(p.centroid_lat), Number(p.centroid_lng)];
          return (
            <CircleMarker
              key={p.id}
              center={center}
              radius={isActive ? 12 : 8}
              pathOptions={{
                color,
                weight: isActive ? 3 : 2,
                fillColor: color,
                fillOpacity: isActive ? 0.85 : 0.55,
              }}
              eventHandlers={{ click: () => { setSelectedId(p.id); setSelectedFeature(null); } }}
            >
              <Tooltip direction="top" offset={[0, -8]}>
                <strong>{p.name}</strong>
                <br />
                {p.area_ha != null ? `${Number(p.area_ha).toLocaleString("pt-BR")} ha` : "Área —"}
                {p.municipio ? ` · ${p.municipio}/${p.uf ?? ""}` : ""}
              </Tooltip>
            </CircleMarker>
          );
        })}
      </MapContainer>

      <div className="absolute top-4 left-4 w-80 max-h-[calc(100%-2rem)] flex flex-col gap-3 z-[999]">
        <div className="rounded-lg border border-border bg-card/95 backdrop-blur shadow-panel p-3 space-y-2">
          <PlaceSearch
            onSelect={(place) => {
              // Estados (regiões muito grandes) usam bbox; municípios e demais vão direto ao centro com zoom próximo
              const isState = place.type === "state" || place.type === "administrative";
              if (isState && place.bbox) {
                const [s, n, w, e] = place.bbox;
                setFlyBounds([[s, w], [n, e]] as L.LatLngBoundsExpression);
              } else {
                setFlyBounds(null);
                setFlyTarget([place.lat, place.lon]);
              }
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
          layerStatus={layerStatus}
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
              <div className="p-4 text-xs text-muted-foreground">
                Nenhum imóvel cadastrado. Use o botão de dados de demonstração no dashboard.
              </div>
            ) : georef.length === 0 ? (
              <div className="p-4 text-xs text-muted-foreground">
                Nenhum imóvel possui coordenadas geográficas registradas.
              </div>
            ) : (
              filtrados.map((p) => {
                const color = colorForProperty(p);
                const active = p.id === selectedId;
                return (
                  <button
                    key={p.id}
                    onClick={() => {
                      setSelectedId(p.id);
                      setSelectedFeature(null);
                      setFlyTarget([Number(p.centroid_lat), Number(p.centroid_lng)]);
                    }}
                    className={cn(
                      "w-full text-left px-3 py-2.5 border-b border-border last:border-b-0 hover:bg-accent/10 flex items-start gap-2.5 transition",
                      active && "bg-accent/10"
                    )}
                  >
                    <span className="mt-1 h-2.5 w-2.5 rounded-full shrink-0" style={{ background: color }} />
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
              basemap === id
                ? "bg-primary text-primary-foreground font-medium"
                : "text-muted-foreground hover:bg-accent/10"
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
            if (p?.centroid_lat != null && p?.centroid_lng != null) {
              setFlyTarget([Number(p.centroid_lat), Number(p.centroid_lng)]);
            }
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
            if (p?.centroid_lat != null && p?.centroid_lng != null) {
              setFlyTarget([Number(p.centroid_lat), Number(p.centroid_lng)]);
            }
          }}
        />
      )}
    </div>
  );
}
