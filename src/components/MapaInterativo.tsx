import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, CircleMarker, Tooltip, useMap } from "react-leaflet";
import L from "leaflet";
import { useProperties } from "@/lib/queries";
import type { RuralProperty } from "@/lib/types";
import { ImovelPanel } from "./ImovelPanel";
import { PropertyForm } from "./PropertyForm";
import { useAuth } from "@/lib/auth";
import { Layers, ChevronRight, Search, Loader2, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useGuardTrial } from "./TrialGuard";

delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;

interface Camada {
  id: string;
  nome: string;
  cor: string;
  ativo: boolean;
  source_key: string;
}

const camadasIniciais: Camada[] = [
  { id: "car", nome: "Imóveis CAR/SICAR", cor: "#5fbb6f", ativo: true, source_key: "car" },
  { id: "sigef", nome: "Parcelas SIGEF/INCRA", cor: "#3b9bff", ativo: false, source_key: "sigef" },
  { id: "desmatamento", nome: "Alertas de desmatamento", cor: "#e85d4a", ativo: false, source_key: "prodes" },
  { id: "embargos", nome: "Áreas embargadas IBAMA", cor: "#f4a02b", ativo: false, source_key: "ibama" },
  { id: "mapbiomas", nome: "Cobertura MapBiomas", cor: "#a78bfa", ativo: false, source_key: "mapbiomas" },
];

function FlyTo({ target }: { target: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (target) map.flyTo(target, 9, { duration: 1.2 });
  }, [target, map]);
  return null;
}

function colorForProperty(p: RuralProperty): string {
  if (p.car_status === "cancelado" || p.car_status === "suspenso") return "#e85d4a";
  if (p.car_status === "nao_cadastrado" || p.sigef_status !== "certificado") return "#f4a02b";
  return "#5fbb6f";
}

export function MapaInterativo() {
  const { canEditProperties } = useAuth();
  const { data: properties = [], isLoading } = useProperties();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [camadas, setCamadas] = useState<Camada[]>(camadasIniciais);
  const [flyTarget, setFlyTarget] = useState<[number, number] | null>(null);
  const [busca, setBusca] = useState("");
  const [formMode, setFormMode] = useState<"create" | "edit" | null>(null);
  const [editTarget, setEditTarget] = useState<RuralProperty | null>(null);

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
              eventHandlers={{ click: () => setSelectedId(p.id) }}
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

        <div className="rounded-lg border border-border bg-card/95 backdrop-blur shadow-panel">
          <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border">
            <Layers className="h-4 w-4 text-primary" />
            <span className="text-xs font-semibold uppercase tracking-wider">Camadas geoespaciais</span>
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
            <p className="text-[10px] text-muted-foreground px-2 pt-1">
              Integração com fontes oficiais será habilitada em breve.
            </p>
          </div>
        </div>

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

      {selectedId && (
        <ImovelPanel
          propertyId={selectedId}
          onClose={() => setSelectedId(null)}
          onEdit={() => { if (selected) { setEditTarget(selected); setFormMode("edit"); } }}
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
