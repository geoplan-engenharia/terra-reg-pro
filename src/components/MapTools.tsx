import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import * as maplibregl from "maplibre-gl";
import type { Map as MLMap, GeoJSONSource } from "maplibre-gl";
import { Ruler, Hexagon, Trash2, FileUp, Camera, ScanSearch, MapPinned } from "lucide-react";
import { cn } from "@/lib/utils";
import { kml as kmlToGeoJSON } from "@tmcw/togeojson";
import { toPng } from "html-to-image";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type ToolMode = "none" | "measure-distance" | "measure-area";
export type LngLatBounds = [[number, number], [number, number]];

const EMPTY_FC: GeoJSON.FeatureCollection = { type: "FeatureCollection", features: [] };

function boundsOf(geom: GeoJSON.Geometry | GeoJSON.FeatureCollection): LngLatBounds | null {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const walk = (c: unknown): void => {
    if (Array.isArray(c) && typeof c[0] === "number") {
      const [x, y] = c as number[];
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
    } else if (Array.isArray(c)) c.forEach(walk);
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const visit = (g: any) => {
    if (!g) return;
    if (g.type === "FeatureCollection") g.features.forEach((f: { geometry: unknown }) => visit(f.geometry));
    else if (g.type === "GeometryCollection") g.geometries.forEach(visit);
    else walk(g.coordinates);
  };
  visit(geom);
  return Number.isFinite(minX) ? [[minX, minY], [maxX, maxY]] : null;
}

// ---------- geo math ----------
function haversine(a: [number, number], b: [number, number]) {
  const R = 6371008.8, toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(b[1] - a[1]), dLng = toRad(b[0] - a[0]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a[1])) * Math.cos(toRad(b[1])) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
function distMeters(pts: [number, number][]) {
  let d = 0;
  for (let i = 1; i < pts.length; i++) d += haversine(pts[i - 1], pts[i]);
  return d;
}
function polygonAreaM2(pts: [number, number][]) {
  if (pts.length < 3) return 0;
  const R = 6378137, toRad = (x: number) => (x * Math.PI) / 180;
  let total = 0;
  for (let i = 0; i < pts.length; i++) {
    const p1 = pts[i], p2 = pts[(i + 1) % pts.length];
    total += (toRad(p2[0]) - toRad(p1[0])) * (2 + Math.sin(toRad(p1[1])) + Math.sin(toRad(p2[1])));
  }
  return Math.abs((total * R * R) / 2);
}
const fmtDist = (m: number) => (m < 1000 ? `${m.toFixed(1)} m` : `${(m / 1000).toFixed(3)} km`);
const fmtArea = (m2: number) => {
  const ha = m2 / 10_000;
  if (ha < 1) return `${m2.toFixed(0)} m²`;
  return `${ha.toLocaleString("pt-BR", { maximumFractionDigits: 3 })} ha`;
};

// Ensures measurement + KML sources/layers exist (re-run after basemap change)
function ensureToolLayers(map: MLMap) {
  if (!map.getSource("measure")) {
    map.addSource("measure", { type: "geojson", data: EMPTY_FC });
    map.addLayer({ id: "measure-fill", type: "fill", source: "measure", filter: ["==", ["geometry-type"], "Polygon"],
      paint: { "fill-color": "#fbbf24", "fill-opacity": 0.2 } });
    map.addLayer({ id: "measure-line", type: "line", source: "measure", filter: ["!=", ["geometry-type"], "Point"],
      paint: { "line-color": "#fbbf24", "line-width": 3, "line-dasharray": [2, 2] } });
    map.addLayer({ id: "measure-pts", type: "circle", source: "measure", filter: ["==", ["geometry-type"], "Point"],
      paint: { "circle-radius": 4, "circle-color": "#fbbf24", "circle-stroke-color": "#fbbf24", "circle-stroke-width": 1 } });
  }
  if (!map.getSource("kml")) {
    map.addSource("kml", { type: "geojson", data: EMPTY_FC });
    map.addLayer({ id: "kml-fill", type: "fill", source: "kml", filter: ["==", ["geometry-type"], "Polygon"],
      paint: { "fill-color": "#22d3ee", "fill-opacity": 0.2 } });
    map.addLayer({ id: "kml-line", type: "line", source: "kml", filter: ["!=", ["geometry-type"], "Point"],
      paint: { "line-color": "#22d3ee", "line-width": 2 } });
    map.addLayer({ id: "kml-pts", type: "circle", source: "kml", filter: ["==", ["geometry-type"], "Point"],
      paint: { "circle-radius": 6, "circle-color": "#22d3ee", "circle-opacity": 0.9 } });
  }
}

// ---------- Property search by CAR / SIGEF / CCIR ----------
type CodeSearchHit = { kind: "property" | "feature"; label: string; sublabel?: string; lat: number; lon: number; bounds?: LngLatBounds };

function CodeSearchPanel({ onClose, onPick }: { onClose: () => void; onPick: (hit: CodeSearchHit) => void }) {
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
    setLoading(true); setError(null); setResults([]);
    try {
      const hits: CodeSearchHit[] = [];
      if (kind === "car" || kind === "sigef") {
        const col = kind === "car" ? "car_code" : "matricula_number";
        const { data } = await sb.from("rural_properties")
          .select("id,name,car_code,matricula_number,municipio,uf,centroid_lat,centroid_lng")
          .ilike(col, `%${q}%`).limit(15);
        for (const p of data ?? []) {
          if (p.centroid_lat != null && p.centroid_lng != null) {
            hits.push({
              kind: "property", label: p.name,
              sublabel: `${kind === "car" ? "CAR" : "SIGEF"} ${(kind === "car" ? p.car_code : p.matricula_number) ?? "—"} · ${p.municipio ?? ""}/${p.uf ?? ""}`,
              lat: Number(p.centroid_lat), lon: Number(p.centroid_lng),
            });
          }
        }
      }
      const layerTypeFilter = kind === "car" ? "car" : kind === "sigef" ? "sigef" : null;
      let featQuery = sb.from("data_layer_features")
        .select("id,external_id,properties_json,municipality,uf,geometry_geojson,layer_id,data_layers!inner(layer_type,name)")
        .limit(15);
      if (layerTypeFilter) featQuery = featQuery.eq("data_layers.layer_type", layerTypeFilter).ilike("external_id", `%${q}%`);
      else featQuery = featQuery.or(`external_id.ilike.%${q}%,properties_json->>ccir.ilike.%${q}%`);
      const { data: feats } = await featQuery;
      for (const f of feats ?? []) {
        const b = boundsOf(f.geometry_geojson as GeoJSON.Geometry);
        if (!b) continue;
        const layerName = (f.data_layers as { name?: string } | null)?.name ?? "Camada";
        hits.push({
          kind: "feature", label: f.external_id ?? "Feição",
          sublabel: `${layerName} · ${f.municipality ?? ""}/${f.uf ?? ""}`,
          lat: (b[0][1] + b[1][1]) / 2, lon: (b[0][0] + b[1][0]) / 2, bounds: b,
        });
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
          <button key={k} type="button" onClick={() => setKind(k)}
            className={cn("flex-1 px-2 py-1 text-xs rounded-md transition",
              kind === k ? "bg-primary text-primary-foreground font-medium" : "bg-accent/10 text-muted-foreground hover:bg-accent/20")}>
            {k.toUpperCase()}
          </button>
        ))}
      </div>
      <form onSubmit={(e) => { e.preventDefault(); run(); }}>
        <input autoFocus value={code} onChange={(e) => setCode(e.target.value)}
          placeholder={kind === "car" ? "Código CAR..." : kind === "sigef" ? "Nº certificação SIGEF..." : "Código CCIR..."}
          className="h-9 w-full rounded-md border border-input bg-input/40 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
      </form>
      <button type="button" onClick={run} disabled={loading || !code.trim()}
        className="w-full h-9 rounded-md bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50">
        {loading ? "Buscando..." : "Buscar"}
      </button>
      {error && <div className="text-xs text-destructive">{error}</div>}
      {results.length > 0 && (
        <div className="max-h-64 overflow-auto border-t border-border pt-2 space-y-1">
          {results.map((r, i) => (
            <button key={i} type="button" onClick={() => onPick(r)} className="w-full text-left p-2 rounded-md hover:bg-accent/10">
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
function CoordsPanel({ onClose, onGo }: { onClose: () => void; onGo: (lat: number, lon: number) => void }) {
  const [raw, setRaw] = useState("");
  const [error, setError] = useState<string | null>(null);

  function parse(input: string): { lat: number; lon: number } | null {
    const cleaned = input.trim().replace(/;/g, ",");
    const m = cleaned.match(/^(-?\d{1,2}(?:[.,]\d+)?)[ ,/]+(-?\d{1,3}(?:[.,]\d+)?)$/);
    if (m) {
      const lat = parseFloat(m[1].replace(",", "."));
      const lon = parseFloat(m[2].replace(",", "."));
      if (!Number.isNaN(lat) && !Number.isNaN(lon)) return { lat, lon };
    }
    const dms = cleaned.match(/(\d+)[°º\s]+(\d+)['′\s]+([\d.]+)["″\s]*([NSns])\s*[, ]\s*(\d+)[°º\s]+(\d+)['′\s]+([\d.]+)["″\s]*([EWew])/);
    if (dms) {
      const toDec = (d: string, mm: string, s: string, h: string) =>
        (parseFloat(d) + parseFloat(mm) / 60 + parseFloat(s) / 3600) * (/[SsWw]/.test(h) ? -1 : 1);
      return { lat: toDec(dms[1], dms[2], dms[3], dms[4]), lon: toDec(dms[5], dms[6], dms[7], dms[8]) };
    }
    return null;
  }

  function submit() {
    const p = parse(raw);
    if (!p) { setError("Formato inválido. Use: -15.78, -47.92 ou 15°47'12\"S 47°52'03\"W"); return; }
    if (p.lat < -90 || p.lat > 90 || p.lon < -180 || p.lon > 180) { setError("Coordenadas fora do intervalo válido."); return; }
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
        <input autoFocus value={raw} onChange={(e) => setRaw(e.target.value)} placeholder="Ex: -15.78, -47.92"
          className="h-9 w-full rounded-md border border-input bg-input/40 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
      </form>
      <div className="text-[11px] text-muted-foreground">Aceita decimal (lat, lon) ou DMS (15°47'12"S 47°52'03"W).</div>
      {error && <div className="text-xs text-destructive">{error}</div>}
      <button type="button" onClick={submit} className="w-full h-9 rounded-md bg-primary text-primary-foreground text-sm font-medium">
        Ir para o local
      </button>
    </div>
  );
}

// ---------- Toolbar (parent) ----------
export function MapTools({
  map,
  styleVersion,
  mapContainerRef,
  onModeChange,
  onFlyTo,
  onFlyBounds,
}: {
  map: MLMap | null;
  styleVersion: number;
  mapContainerRef: RefObject<HTMLDivElement | null>;
  onModeChange?: (mode: ToolMode) => void;
  onFlyTo: (lat: number, lon: number, zoom?: number) => void;
  onFlyBounds: (b: LngLatBounds) => void;
}) {
  const [mode, setMode] = useState<ToolMode>("none");
  const [kmlData, setKmlData] = useState<GeoJSON.FeatureCollection | null>(null);
  const [openPanel, setOpenPanel] = useState<"none" | "code" | "coords">("none");
  const fileRef = useRef<HTMLInputElement | null>(null);

  // Finished measurements + current one
  const doneRef = useRef<GeoJSON.Feature[]>([]);
  const ptsRef = useRef<[number, number][]>([]);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const liveLabelRef = useRef<maplibregl.Marker | null>(null);

  useEffect(() => { onModeChange?.(mode); }, [mode, onModeChange]);

  const redraw = () => {
    if (!map) return;
    const src = map.getSource("measure") as GeoJSONSource | undefined;
    if (!src) return;
    const pts = ptsRef.current;
    const cur: GeoJSON.Feature[] = pts.map((p) => ({ type: "Feature", geometry: { type: "Point", coordinates: p }, properties: {} }));
    if (mode === "measure-area" && pts.length >= 3) {
      cur.push({ type: "Feature", geometry: { type: "Polygon", coordinates: [[...pts, pts[0]]] }, properties: {} });
    } else if (pts.length >= 2) {
      cur.push({ type: "Feature", geometry: { type: "LineString", coordinates: pts }, properties: {} });
    }
    src.setData({ type: "FeatureCollection", features: [...doneRef.current, ...cur] });
  };

  // Ensure layers after map init/basemap change, restore data
  useEffect(() => {
    if (!map) return;
    ensureToolLayers(map);
    redraw();
    (map.getSource("kml") as GeoJSONSource | undefined)?.setData(kmlData ?? EMPTY_FC);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, styleVersion]);

  // Measurement interaction
  useEffect(() => {
    if (!map) return;
    const canvas = map.getCanvasContainer();
    if (mode === "none") { canvas.style.cursor = ""; return; }
    canvas.style.cursor = "crosshair";
    map.doubleClickZoom.disable();

    const labelEl = (text: string) => {
      const el = document.createElement("div");
      el.style.cssText = "background:rgba(15,23,42,.92);color:#fff;font-size:11px;padding:3px 6px;border-radius:4px;white-space:nowrap;font-weight:600;pointer-events:none;transform:translateY(-14px)";
      el.textContent = text;
      return el;
    };

    const onClick = (e: maplibregl.MapMouseEvent) => {
      const p: [number, number] = [e.lngLat.lng, e.lngLat.lat];
      ptsRef.current.push(p);
      redraw();
      const pts = ptsRef.current;
      let text: string | null = null;
      if (mode === "measure-distance") text = fmtDist(distMeters(pts));
      else if (pts.length >= 3) text = fmtArea(polygonAreaM2(pts));
      if (text) {
        if (liveLabelRef.current) {
          liveLabelRef.current.setLngLat(p);
          liveLabelRef.current.getElement().firstElementChild
            ? (liveLabelRef.current.getElement().firstElementChild!.textContent = text)
            : (liveLabelRef.current.getElement().textContent = text);
        } else {
          const wrap = document.createElement("div");
          wrap.appendChild(labelEl(text));
          liveLabelRef.current = new maplibregl.Marker({ element: wrap }).setLngLat(p).addTo(map);
          markersRef.current.push(liveLabelRef.current);
        }
      }
    };
    const onDbl = () => {
      // finaliza medição atual
      const pts = ptsRef.current;
      if (mode === "measure-area" && pts.length >= 3) {
        doneRef.current.push({ type: "Feature", geometry: { type: "Polygon", coordinates: [[...pts, pts[0]]] }, properties: {} });
      } else if (pts.length >= 2) {
        doneRef.current.push({ type: "Feature", geometry: { type: "LineString", coordinates: [...pts] }, properties: {} });
      }
      pts.forEach((pt) => doneRef.current.push({ type: "Feature", geometry: { type: "Point", coordinates: pt }, properties: {} }));
      ptsRef.current = [];
      liveLabelRef.current = null;
      redraw();
    };

    map.on("click", onClick);
    map.on("dblclick", onDbl);
    return () => {
      map.off("click", onClick);
      map.off("dblclick", onDbl);
      map.doubleClickZoom.enable();
      canvas.style.cursor = "";
      ptsRef.current = [];
      liveLabelRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, map]);

  function clearMeasurements() {
    doneRef.current = [];
    ptsRef.current = [];
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];
    liveLabelRef.current = null;
    setMode("none");
    (map?.getSource("measure") as GeoJSONSource | undefined)?.setData(EMPTY_FC);
  }

  function handleKmlFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const dom = new DOMParser().parseFromString(String(reader.result), "text/xml");
        const fc = kmlToGeoJSON(dom) as GeoJSON.FeatureCollection;
        if (!fc.features?.length) { toast.error("KML sem feições válidas."); return; }
        setKmlData(fc);
        (map?.getSource("kml") as GeoJSONSource | undefined)?.setData(fc);
        const b = boundsOf(fc);
        if (b && map) map.fitBounds(b, { padding: 40, duration: 1200, maxZoom: 16 });
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
      map?.triggerRepaint();
      const dataUrl = await toPng(el, {
        cacheBust: true,
        pixelRatio: 2,
        filter: (node) => !(node instanceof HTMLElement && node.dataset?.exclude === "1"),
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
      <div className="absolute top-20 right-4 z-[1000] flex flex-col gap-1.5 rounded-lg border border-border bg-card/95 backdrop-blur shadow-panel p-1.5" data-exclude="1">
        <ToolBtn title="Medir distância" active={mode === "measure-distance"}
          onClick={() => setMode(mode === "measure-distance" ? "none" : "measure-distance")} icon={<Ruler className="h-4 w-4" />} />
        <ToolBtn title="Medir área" active={mode === "measure-area"}
          onClick={() => setMode(mode === "measure-area" ? "none" : "measure-area")} icon={<Hexagon className="h-4 w-4" />} />
        <ToolBtn title="Limpar medições" onClick={clearMeasurements} icon={<Trash2 className="h-4 w-4" />} />
        <div className="h-px bg-border my-0.5" />
        <ToolBtn title="Importar KML" onClick={() => fileRef.current?.click()}
          icon={
            <span className="relative inline-flex items-center justify-center">
              <FileUp className="h-4 w-4" />
              <span className="absolute -bottom-1 -right-1 text-[7px] font-bold leading-none bg-primary text-primary-foreground rounded px-0.5">KML</span>
            </span>
          } />
        <ToolBtn title="Print do mapa" onClick={takeScreenshot} icon={<Camera className="h-4 w-4" />} />
        <div className="h-px bg-border my-0.5" />
        <ToolBtn title="Buscar por CAR/SIGEF/CCIR" active={openPanel === "code"}
          onClick={() => setOpenPanel(openPanel === "code" ? "none" : "code")} icon={<ScanSearch className="h-4 w-4" />} />
        <ToolBtn title="Buscar por coordenadas" active={openPanel === "coords"}
          onClick={() => setOpenPanel(openPanel === "coords" ? "none" : "coords")} icon={<MapPinned className="h-4 w-4" />} />
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
        <CoordsPanel onClose={() => setOpenPanel("none")} onGo={(lat, lon) => { onFlyTo(lat, lon, 15); setOpenPanel("none"); }} />
      )}

      <input ref={fileRef} type="file" accept=".kml,.kmz,application/vnd.google-earth.kml+xml" className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleKmlFile(f);
          e.target.value = "";
        }} />
    </>
  );
}

function ToolBtn({ icon, title, onClick, active }: { icon: ReactNode; title: string; onClick: () => void; active?: boolean }) {
  return (
    <button type="button" title={title} onClick={onClick}
      className={cn("h-9 w-9 rounded-md flex items-center justify-center transition",
        active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent/15 hover:text-foreground")}>
      {icon}
    </button>
  );
}
