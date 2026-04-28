import { useEffect, useRef, useState } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import { Ruler, Hexagon, Trash2, FileUp, Camera, ScanSearch, MapPinned } from "lucide-react";
import { cn } from "@/lib/utils";
import { kml as kmlToGeoJSON } from "@tmcw/togeojson";
import { toPng } from "html-to-image";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type ToolMode = "none" | "measure-distance" | "measure-area";

// ---------- Measurement tool (distance / area) ----------
function MeasureLayer({
  mode,
  clearSignal,
}: {
  mode: ToolMode;
  clearSignal: number;
}) {
  const map = useMap();
  const groupRef = useRef<L.FeatureGroup | null>(null);
  const pointsRef = useRef<L.LatLng[]>([]);
  const tempLineRef = useRef<L.Polyline | null>(null);
  const tempShapeRef = useRef<L.Polygon | L.Polyline | null>(null);
  const labelRef = useRef<L.Marker | null>(null);

  // init group
  useEffect(() => {
    const g = L.featureGroup().addTo(map);
    groupRef.current = g;
    return () => {
      g.remove();
      groupRef.current = null;
    };
  }, [map]);

  // clear all
  useEffect(() => {
    groupRef.current?.clearLayers();
    pointsRef.current = [];
    tempLineRef.current = null;
    tempShapeRef.current = null;
    labelRef.current = null;
  }, [clearSignal]);

  // reset on mode change
  useEffect(() => {
    pointsRef.current = [];
    tempLineRef.current = null;
    tempShapeRef.current = null;
    labelRef.current = null;
    if (mode === "none") {
      map.getContainer().style.cursor = "";
    } else {
      map.getContainer().style.cursor = "crosshair";
    }
    return () => {
      map.getContainer().style.cursor = "";
    };
  }, [mode, map]);

  useEffect(() => {
    if (mode === "none") return;

    function distMeters(pts: L.LatLng[]): number {
      let d = 0;
      for (let i = 1; i < pts.length; i++) d += pts[i - 1].distanceTo(pts[i]);
      return d;
    }
    // Spherical excess area for polygon (m^2)
    function polygonAreaM2(pts: L.LatLng[]): number {
      if (pts.length < 3) return 0;
      const R = 6378137;
      const toRad = (x: number) => (x * Math.PI) / 180;
      let total = 0;
      for (let i = 0; i < pts.length; i++) {
        const p1 = pts[i];
        const p2 = pts[(i + 1) % pts.length];
        total +=
          (toRad(p2.lng) - toRad(p1.lng)) *
          (2 + Math.sin(toRad(p1.lat)) + Math.sin(toRad(p2.lat)));
      }
      return Math.abs((total * R * R) / 2);
    }

    function fmtDist(m: number) {
      if (m < 1000) return `${m.toFixed(1)} m`;
      return `${(m / 1000).toFixed(3)} km`;
    }
    function fmtArea(m2: number) {
      const ha = m2 / 10_000;
      if (ha < 1) return `${m2.toFixed(0)} m²`;
      return `${ha.toLocaleString("pt-BR", { maximumFractionDigits: 3 })} ha`;
    }

    function updateLabel(latlng: L.LatLng, text: string) {
      const icon = L.divIcon({
        className: "measure-label",
        html: `<div style="background:rgba(15,23,42,.92);color:#fff;font-size:11px;padding:3px 6px;border-radius:4px;white-space:nowrap;font-weight:600">${text}</div>`,
        iconSize: undefined as unknown as L.PointExpression,
      });
      if (labelRef.current) {
        labelRef.current.setLatLng(latlng).setIcon(icon);
      } else {
        labelRef.current = L.marker(latlng, { icon, interactive: false }).addTo(groupRef.current!);
      }
    }

    function onClick(e: L.LeafletMouseEvent) {
      pointsRef.current.push(e.latlng);
      L.circleMarker(e.latlng, { radius: 4, color: "#fbbf24", fillColor: "#fbbf24", fillOpacity: 1, weight: 1 }).addTo(groupRef.current!);

      if (mode === "measure-distance") {
        if (!tempLineRef.current) {
          tempLineRef.current = L.polyline(pointsRef.current, { color: "#fbbf24", weight: 3, dashArray: "4 4" }).addTo(groupRef.current!);
        } else {
          tempLineRef.current.setLatLngs(pointsRef.current);
        }
        updateLabel(e.latlng, fmtDist(distMeters(pointsRef.current)));
      } else if (mode === "measure-area") {
        if (pointsRef.current.length >= 3) {
          if (tempShapeRef.current && tempShapeRef.current instanceof L.Polygon) {
            tempShapeRef.current.setLatLngs(pointsRef.current);
          } else {
            tempShapeRef.current?.remove();
            tempShapeRef.current = L.polygon(pointsRef.current, { color: "#fbbf24", weight: 2, fillColor: "#fbbf24", fillOpacity: 0.2 }).addTo(groupRef.current!);
          }
          updateLabel(e.latlng, fmtArea(polygonAreaM2(pointsRef.current)));
        } else {
          if (tempShapeRef.current) tempShapeRef.current.remove();
          tempShapeRef.current = L.polyline(pointsRef.current, { color: "#fbbf24", weight: 2, dashArray: "4 4" }).addTo(groupRef.current!);
        }
      }
    }

    function onDblClick() {
      // finaliza medição
      pointsRef.current = [];
      tempLineRef.current = null;
      tempShapeRef.current = null;
      labelRef.current = null;
    }

    map.on("click", onClick);
    map.on("dblclick", onDblClick);
    map.doubleClickZoom.disable();
    return () => {
      map.off("click", onClick);
      map.off("dblclick", onDblClick);
      map.doubleClickZoom.enable();
    };
  }, [mode, map]);

  return null;
}

// ---------- KML import ----------
function KmlLayer({
  kmlData,
}: {
  kmlData: GeoJSON.FeatureCollection | null;
}) {
  const map = useMap();
  const layerRef = useRef<L.GeoJSON | null>(null);

  useEffect(() => {
    if (layerRef.current) {
      layerRef.current.remove();
      layerRef.current = null;
    }
    if (!kmlData) return;
    const layer = L.geoJSON(kmlData, {
      style: { color: "#22d3ee", weight: 2, fillColor: "#22d3ee", fillOpacity: 0.2 },
      pointToLayer: (_f, latlng) => L.circleMarker(latlng, { radius: 6, color: "#22d3ee", fillColor: "#22d3ee", fillOpacity: 0.9, weight: 1 }),
    }).addTo(map);
    layerRef.current = layer;
    try {
      const b = layer.getBounds();
      if (b.isValid()) map.flyToBounds(b, { padding: [40, 40], duration: 1.2, maxZoom: 16 });
    } catch { /* ignore */ }
    return () => {
      layer.remove();
    };
  }, [kmlData, map]);

  return null;
}

// ---------- Property search by CAR / SIGEF / CCIR ----------
type CodeSearchHit = {
  kind: "property" | "feature";
  label: string;
  sublabel?: string;
  lat: number;
  lon: number;
  bounds?: L.LatLngBoundsExpression;
};

function CodeSearchPanel({
  onClose,
  onPick,
}: {
  onClose: () => void;
  onPick: (hit: CodeSearchHit) => void;
}) {
  const [code, setCode] = useState("");
  const [kind, setKind] = useState<"car" | "sigef" | "ccir">("car");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<CodeSearchHit[]>([]);
  const [error, setError] = useState<string | null>(null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;

  async function run() {
    const q = code.trim();
    if (!q) return;
    setLoading(true);
    setError(null);
    setResults([]);
    try {
      const hits: CodeSearchHit[] = [];
      // 1) properties
      if (kind === "car") {
        const { data } = await sb
          .from("properties")
          .select("id,name,car_code,municipio,uf,centroid_lat,centroid_lng")
          .ilike("car_code", `%${q}%`)
          .limit(15);
        for (const p of data ?? []) {
          if (p.centroid_lat != null && p.centroid_lng != null) {
            hits.push({
              kind: "property",
              label: p.name,
              sublabel: `CAR ${p.car_code ?? "—"} · ${p.municipio ?? ""}/${p.uf ?? ""}`,
              lat: Number(p.centroid_lat),
              lon: Number(p.centroid_lng),
            });
          }
        }
      } else if (kind === "sigef") {
        const { data } = await sb
          .from("properties")
          .select("id,name,matricula_number,matricula_source,municipio,uf,centroid_lat,centroid_lng")
          .ilike("matricula_number", `%${q}%`)
          .limit(15);
        for (const p of data ?? []) {
          if (p.centroid_lat != null && p.centroid_lng != null) {
            hits.push({
              kind: "property",
              label: p.name,
              sublabel: `SIGEF ${p.matricula_number ?? "—"} · ${p.municipio ?? ""}/${p.uf ?? ""}`,
              lat: Number(p.centroid_lat),
              lon: Number(p.centroid_lng),
            });
          }
        }
      }

      // 2) data_layer_features by external_id (CAR/SIGEF) or properties_json (CCIR)
      const layerTypeFilter = kind === "car" ? "car" : kind === "sigef" ? "sigef" : null;
      let featQuery = sb
        .from("data_layer_features")
        .select("id,external_id,properties_json,municipality,uf,geometry_geojson,layer_id,data_layers!inner(layer_type,name)")
        .limit(15);
      if (layerTypeFilter) {
        featQuery = featQuery.eq("data_layers.layer_type", layerTypeFilter).ilike("external_id", `%${q}%`);
      } else {
        // CCIR: search via properties_json text
        featQuery = featQuery.or(`external_id.ilike.%${q}%,properties_json->>ccir.ilike.%${q}%`);
      }
      const { data: feats } = await featQuery;
      for (const f of feats ?? []) {
        try {
          const geom = f.geometry_geojson as GeoJSON.Geometry;
          const layer = L.geoJSON(geom);
          const b = layer.getBounds();
          if (!b.isValid()) continue;
          const c = b.getCenter();
          const layerName = (f.data_layers as { name?: string } | null)?.name ?? "Camada";
          hits.push({
            kind: "feature",
            label: f.external_id ?? "Feição",
            sublabel: `${layerName} · ${f.municipality ?? ""}/${f.uf ?? ""}`,
            lat: c.lat,
            lon: c.lng,
            bounds: b,
          });
        } catch { /* ignore */ }
      }

      if (hits.length === 0) setError("Nenhum resultado encontrado.");
      setResults(hits);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="absolute top-20 right-20 z-[1000] w-80 rounded-lg border border-border bg-card/95 backdrop-blur shadow-panel p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider">Buscar por código</span>
        <button onClick={onClose} className="text-xs text-muted-foreground hover:text-foreground">Fechar</button>
      </div>
      <div className="flex gap-1">
        {(["car", "sigef", "ccir"] as const).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setKind(k)}
            className={cn(
              "flex-1 px-2 py-1 text-xs rounded-md transition",
              kind === k ? "bg-primary text-primary-foreground font-medium" : "bg-accent/10 text-muted-foreground hover:bg-accent/20"
            )}
          >
            {k.toUpperCase()}
          </button>
        ))}
      </div>
      <form onSubmit={(e) => { e.preventDefault(); run(); }}>
        <input
          autoFocus
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder={kind === "car" ? "Código CAR..." : kind === "sigef" ? "Nº certificação SIGEF..." : "Código CCIR..."}
          className="h-9 w-full rounded-md border border-input bg-input/40 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </form>
      <button
        type="button"
        onClick={run}
        disabled={loading || !code.trim()}
        className="w-full h-9 rounded-md bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
      >
        {loading ? "Buscando..." : "Buscar"}
      </button>
      {error && <div className="text-xs text-destructive">{error}</div>}
      {results.length > 0 && (
        <div className="max-h-64 overflow-auto border-t border-border pt-2 space-y-1">
          {results.map((r, i) => (
            <button
              key={i}
              type="button"
              onClick={() => onPick(r)}
              className="w-full text-left p-2 rounded-md hover:bg-accent/10"
            >
              <div className="text-xs font-medium truncate">{r.label}</div>
              {r.sublabel && <div className="text-[11px] text-muted-foreground truncate">{r.sublabel}</div>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------- Coordinates panel ----------
function CoordsPanel({
  onClose,
  onGo,
}: {
  onClose: () => void;
  onGo: (lat: number, lon: number) => void;
}) {
  const [raw, setRaw] = useState("");
  const [error, setError] = useState<string | null>(null);

  function parse(input: string): { lat: number; lon: number } | null {
    const cleaned = input.trim().replace(/;/g, ",");
    // Try "lat, lon" decimal
    const m = cleaned.match(/^(-?\d{1,2}(?:[.,]\d+)?)[ ,/]+(-?\d{1,3}(?:[.,]\d+)?)$/);
    if (m) {
      const lat = parseFloat(m[1].replace(",", "."));
      const lon = parseFloat(m[2].replace(",", "."));
      if (!Number.isNaN(lat) && !Number.isNaN(lon)) return { lat, lon };
    }
    // DMS: 15°47'12.3"S 47°52'03.1"W
    const dms = cleaned.match(/(\d+)[°º\s]+(\d+)['′\s]+([\d.]+)["″\s]*([NSns])\s*[, ]\s*(\d+)[°º\s]+(\d+)['′\s]+([\d.]+)["″\s]*([EWew])/);
    if (dms) {
      const toDec = (d: string, m: string, s: string, h: string) =>
        (parseFloat(d) + parseFloat(m) / 60 + parseFloat(s) / 3600) * (/[SsWw]/.test(h) ? -1 : 1);
      return {
        lat: toDec(dms[1], dms[2], dms[3], dms[4]),
        lon: toDec(dms[5], dms[6], dms[7], dms[8]),
      };
    }
    return null;
  }

  function submit() {
    const p = parse(raw);
    if (!p) {
      setError("Formato inválido. Use: -15.78, -47.92 ou 15°47'12\"S 47°52'03\"W");
      return;
    }
    if (p.lat < -90 || p.lat > 90 || p.lon < -180 || p.lon > 180) {
      setError("Coordenadas fora do intervalo válido.");
      return;
    }
    setError(null);
    onGo(p.lat, p.lon);
  }

  return (
    <div className="absolute top-20 right-20 z-[1000] w-80 rounded-lg border border-border bg-card/95 backdrop-blur shadow-panel p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider">Buscar por coordenadas</span>
        <button onClick={onClose} className="text-xs text-muted-foreground hover:text-foreground">Fechar</button>
      </div>
      <form onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <input
          autoFocus
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          placeholder='Ex: -15.78, -47.92'
          className="h-9 w-full rounded-md border border-input bg-input/40 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </form>
      <div className="text-[11px] text-muted-foreground">
        Aceita decimal (lat, lon) ou DMS (15°47'12"S 47°52'03"W).
      </div>
      {error && <div className="text-xs text-destructive">{error}</div>}
      <button
        type="button"
        onClick={submit}
        className="w-full h-9 rounded-md bg-primary text-primary-foreground text-sm font-medium"
      >
        Ir para o local
      </button>
    </div>
  );
}

// ---------- Toolbar (parent) ----------
export function MapTools({
  mapContainerRef,
  onFlyTo,
  onFlyBounds,
}: {
  mapContainerRef: React.RefObject<HTMLDivElement | null>;
  onFlyTo: (lat: number, lon: number, zoom?: number) => void;
  onFlyBounds: (b: L.LatLngBoundsExpression) => void;
}) {
  const [mode, setMode] = useState<ToolMode>("none");
  const [clearSignal, setClearSignal] = useState(0);
  const [kmlData, setKmlData] = useState<GeoJSON.FeatureCollection | null>(null);
  const [openPanel, setOpenPanel] = useState<"none" | "code" | "coords">("none");
  const fileRef = useRef<HTMLInputElement | null>(null);

  function handleKmlFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = String(reader.result);
        const dom = new DOMParser().parseFromString(text, "text/xml");
        const fc = kmlToGeoJSON(dom) as GeoJSON.FeatureCollection;
        if (!fc.features?.length) {
          toast.error("KML sem feições válidas.");
          return;
        }
        setKmlData(fc);
        toast.success(`KML importado: ${fc.features.length} feição(ões).`);
      } catch (e) {
        toast.error("Falha ao ler KML: " + (e as Error).message);
      }
    };
    reader.readAsText(file);
  }

  async function takeScreenshot() {
    const el = mapContainerRef.current;
    if (!el) return;
    try {
      toast.info("Gerando print do mapa...");
      const dataUrl = await toPng(el, {
        cacheBust: true,
        pixelRatio: 2,
        filter: (node) => {
          // Excluir tiles com erro/cors quebrado é difícil; manter tudo.
          return !(node instanceof HTMLElement && node.dataset?.exclude === "1");
        },
      });
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `mapa-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.png`;
      a.click();
      toast.success("Print salvo.");
    } catch (e) {
      toast.error("Não foi possível gerar o print: " + (e as Error).message);
    }
  }

  return (
    <>
      {/* Render-only children inside map */}
      <MeasureLayer mode={mode} clearSignal={clearSignal} />
      <KmlLayer kmlData={kmlData} />

      {/* Toolbar UI lives outside map but we need a portal-free approach via map container's parent */}
      <ToolbarPortal>
        <div className="absolute top-20 right-4 z-[1000] flex flex-col gap-1.5 rounded-lg border border-border bg-card/95 backdrop-blur shadow-panel p-1.5" data-exclude="1">
          <ToolBtn
            title="Medir distância"
            active={mode === "measure-distance"}
            onClick={() => setMode(mode === "measure-distance" ? "none" : "measure-distance")}
            icon={<Ruler className="h-4 w-4" />}
          />
          <ToolBtn
            title="Medir área"
            active={mode === "measure-area"}
            onClick={() => setMode(mode === "measure-area" ? "none" : "measure-area")}
            icon={<Hexagon className="h-4 w-4" />}
          />
          <ToolBtn
            title="Limpar medições"
            onClick={() => { setClearSignal((x) => x + 1); setMode("none"); }}
            icon={<Trash2 className="h-4 w-4" />}
          />
          <div className="h-px bg-border my-0.5" />
          <ToolBtn
            title="Importar KML"
            onClick={() => fileRef.current?.click()}
            icon={
              <span className="relative inline-flex items-center justify-center">
                <FileUp className="h-4 w-4" />
                <span className="absolute -bottom-1 -right-1 text-[7px] font-bold leading-none bg-primary text-primary-foreground rounded px-0.5">KML</span>
              </span>
            }
          />
          <ToolBtn
            title="Print do mapa"
            onClick={takeScreenshot}
            icon={<Camera className="h-4 w-4" />}
          />
          <div className="h-px bg-border my-0.5" />
          <ToolBtn
            title="Buscar por CAR/SIGEF/CCIR"
            active={openPanel === "code"}
            onClick={() => setOpenPanel(openPanel === "code" ? "none" : "code")}
            icon={<ScanSearch className="h-4 w-4" />}
          />
          <ToolBtn
            title="Buscar por coordenadas"
            active={openPanel === "coords"}
            onClick={() => setOpenPanel(openPanel === "coords" ? "none" : "coords")}
            icon={<MapPinned className="h-4 w-4" />}
          />
        </div>

        {openPanel === "code" && (
          <CodeSearchPanel
            onClose={() => setOpenPanel("none")}
            onPick={(hit) => {
              if (hit.bounds) onFlyBounds(hit.bounds);
              else onFlyTo(hit.lat, hit.lon, 15);
              setOpenPanel("none");
            }}
          />
        )}
        {openPanel === "coords" && (
          <CoordsPanel
            onClose={() => setOpenPanel("none")}
            onGo={(lat, lon) => {
              onFlyTo(lat, lon, 15);
              setOpenPanel("none");
            }}
          />
        )}
      </ToolbarPortal>

      <input
        ref={fileRef}
        type="file"
        accept=".kml,.kmz,application/vnd.google-earth.kml+xml"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleKmlFile(f);
          e.target.value = "";
        }}
      />
    </>
  );
}

function ToolBtn({
  icon,
  title,
  onClick,
  active,
}: {
  icon: React.ReactNode;
  title: string;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={cn(
        "h-9 w-9 rounded-md flex items-center justify-center transition",
        active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent/15 hover:text-foreground"
      )}
    >
      {icon}
    </button>
  );
}

// Render children into document.body via React portal-ish approach so they sit above MapContainer
import { createPortal } from "react-dom";
function ToolbarPortal({ children }: { children: React.ReactNode }) {
  const [host, setHost] = useState<HTMLElement | null>(null);
  useEffect(() => {
    // Anchor inside the map wrapper (parent of MapContainer) — find via class
    const el = document.querySelector(".geoterra-map-host") as HTMLElement | null;
    setHost(el);
  }, []);
  if (!host) return null;
  return createPortal(children, host);
}
