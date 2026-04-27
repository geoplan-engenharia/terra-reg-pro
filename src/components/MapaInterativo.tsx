import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, CircleMarker, Tooltip, useMap } from "react-leaflet";
import L from "leaflet";
import type { Imovel, Camada } from "@/lib/mock-data";
import { camadasIniciais, imoveis } from "@/lib/mock-data";
import { ImovelPanel } from "./ImovelPanel";
import { Layers, ChevronRight, Search } from "lucide-react";
import { cn } from "@/lib/utils";

// Fix default marker icons (not actually used since we use CircleMarker, but safe)
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;

function FlyTo({ target }: { target: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (target) map.flyTo(target, 9, { duration: 1.2 });
  }, [target, map]);
  return null;
}

function colorForImovel(im: Imovel) {
  const top = im.diagnosticos[0]?.severidade ?? "baixa";
  if (top === "alta") return "#e85d4a";
  if (top === "media") return "#f4a02b";
  return "#5fbb6f";
}

export function MapaInterativo() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [camadas, setCamadas] = useState<Camada[]>(camadasIniciais);
  const [flyTarget, setFlyTarget] = useState<[number, number] | null>(null);
  const [busca, setBusca] = useState("");

  const selected = useMemo(() => imoveis.find((i) => i.id === selectedId) ?? null, [selectedId]);
  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return imoveis;
    return imoveis.filter(
      (i) =>
        i.nome.toLowerCase().includes(q) ||
        i.proprietario.toLowerCase().includes(q) ||
        i.car_codigo.toLowerCase().includes(q) ||
        (i.matricula.numero ?? "").toLowerCase().includes(q)
    );
  }, [busca]);

  const toggleCamada = (id: string) =>
    setCamadas((c) => c.map((x) => (x.id === id ? { ...x, ativo: !x.ativo } : x)));

  return (
    <div className="relative h-full w-full">
      <MapContainer
        center={[-14.235, -51.9253]}
        zoom={4}
        scrollWheelZoom
        className="h-full w-full"
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FlyTo target={flyTarget} />
        {filtrados.map((im) => {
          const color = colorForImovel(im);
          const isActive = im.id === selectedId;
          return (
            <CircleMarker
              key={im.id}
              center={im.coordenadas}
              radius={isActive ? 12 : 8}
              pathOptions={{
                color,
                weight: isActive ? 3 : 2,
                fillColor: color,
                fillOpacity: isActive ? 0.85 : 0.55,
              }}
              eventHandlers={{ click: () => setSelectedId(im.id) }}
            >
              <Tooltip direction="top" offset={[0, -8]}>
                <strong>{im.nome}</strong>
                <br />
                {im.area_ha.toLocaleString("pt-BR")} ha · {im.municipio}/{im.uf}
              </Tooltip>
            </CircleMarker>
          );
        })}
      </MapContainer>

      {/* Painel esquerdo — busca + camadas + lista */}
      <div className="absolute top-4 left-4 w-80 max-h-[calc(100%-2rem)] flex flex-col gap-3 z-[999]">
        <div className="rounded-lg border border-border bg-card/95 backdrop-blur shadow-panel p-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar imóvel, CAR ou matrícula"
              className="h-9 w-full rounded-md border border-input bg-input/40 pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card/95 backdrop-blur shadow-panel">
          <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border">
            <Layers className="h-4 w-4 text-primary" />
            <span className="text-xs font-semibold uppercase tracking-wider">Camadas</span>
          </div>
          <div className="p-2 space-y-1">
            {camadas.map((c) => (
              <label
                key={c.id}
                className="flex items-center gap-2.5 rounded-md px-2 py-1.5 hover:bg-accent/10 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={c.ativo}
                  onChange={() => toggleCamada(c.id)}
                  className="h-3.5 w-3.5 accent-primary"
                />
                <span className="h-2.5 w-2.5 rounded-sm shrink-0" style={{ background: c.cor }} />
                <span className="text-xs flex-1 leading-tight">{c.nome}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card/95 backdrop-blur shadow-panel overflow-hidden flex flex-col min-h-0">
          <div className="px-3 py-2.5 border-b border-border flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider">Imóveis ({filtrados.length})</span>
          </div>
          <div className="overflow-auto max-h-72">
            {filtrados.map((im) => {
              const color = colorForImovel(im);
              const active = im.id === selectedId;
              return (
                <button
                  key={im.id}
                  onClick={() => {
                    setSelectedId(im.id);
                    setFlyTarget(im.coordenadas);
                  }}
                  className={cn(
                    "w-full text-left px-3 py-2.5 border-b border-border last:border-b-0 hover:bg-accent/10 flex items-start gap-2.5 transition",
                    active && "bg-accent/10"
                  )}
                >
                  <span className="mt-1 h-2.5 w-2.5 rounded-full shrink-0" style={{ background: color }} />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium truncate">{im.nome}</div>
                    <div className="text-[11px] text-muted-foreground truncate">
                      {im.municipio}/{im.uf} · {im.area_ha.toLocaleString("pt-BR")} ha
                    </div>
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground mt-1 shrink-0" />
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {selected && <ImovelPanel imovel={selected} onClose={() => setSelectedId(null)} />}
    </div>
  );
}
