import { useState } from "react";
import { X, Download, Loader2, MapPin, Hash, Ruler, Layers as LayersIcon, Calendar, ChevronDown, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import type { DataLayer, DataLayerFeature } from "@/lib/layer-queries";
import { useImportFeatureAsProperty } from "@/lib/layer-queries";
import { useClients } from "@/lib/queries";
import { useGuardTrial } from "./TrialGuard";

const LAYER_BADGE: Record<string, { label: string; cls: string }> = {
  car: { label: "CAR", cls: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30" },
  sigef: { label: "SIGEF", cls: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30" },
  embargo: { label: "IBAMA", cls: "bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/30" },
  desmatamento: { label: "Desmatamento", cls: "bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30" },
  uso_solo: { label: "Uso do solo", cls: "bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30" },
  outros: { label: "Outros", cls: "bg-muted text-muted-foreground border-border" },
};

export function LayerFeaturePanel({
  feature,
  layer,
  onClose,
  onImported,
}: {
  feature: DataLayerFeature;
  layer: DataLayer;
  onClose: () => void;
  onImported?: (propertyId: string) => void;
}) {
  const importMut = useImportFeatureAsProperty();
  const { data: clients = [] } = useClients();
  const guardTrial = useGuardTrial();
  const [showForm, setShowForm] = useState(false);
  const [showRaw, setShowRaw] = useState(false);
  const [clientId, setClientId] = useState<string>("");
  const [name, setName] = useState<string>(
    `${layer.name} — ${feature.external_id ?? feature.id.slice(0, 6)}`
  );

  const handleImport = async () => {
    if (guardTrial()) return;
    try {
      const id = await importMut.mutateAsync({
        feature_id: feature.id,
        client_id: clientId || null,
        name: name || undefined,
      });
      toast.success("Imóvel monitorado salvo a partir da feição");
      onImported?.(id);
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao importar");
    }
  };

  const props = feature.properties_json ?? {};
  const badge = LAYER_BADGE[layer.layer_type] ?? LAYER_BADGE.outros;
  const sourceUpdated = feature.source_updated_at
    ? new Date(feature.source_updated_at).toLocaleDateString("pt-BR")
    : "—";

  return (
    <aside className="absolute top-0 right-0 h-full w-[26rem] bg-card/98 backdrop-blur border-l border-border shadow-panel z-[1000] flex flex-col">
      <header className="flex items-start justify-between gap-3 px-5 py-4 border-b border-border">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded border ${badge.cls}`}>
              {badge.label}
            </span>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground truncate">
              {layer.name}
            </span>
          </div>
          <h2 className="text-sm font-semibold mt-1.5 truncate">
            {feature.external_id ?? "Feição " + feature.id.slice(0, 8)}
          </h2>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-md hover:bg-accent/20 text-muted-foreground"
          aria-label="Fechar"
        >
          <X className="h-4 w-4" />
        </button>
      </header>

      <div className="flex-1 overflow-auto">
        <section className="px-5 py-4 border-b border-border">
          <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Dados principais
          </h3>
          <div className="grid grid-cols-2 gap-2">
            <Stat icon={Hash} label="Código externo" value={feature.external_id ?? "—"} />
            <Stat
              icon={Ruler}
              label="Área"
              value={feature.area_ha != null ? `${Number(feature.area_ha).toLocaleString("pt-BR")} ha` : "—"}
            />
            <Stat
              icon={MapPin}
              label="Município / UF"
              value={`${feature.municipality ?? "—"}/${feature.uf ?? "—"}`}
            />
            <Stat icon={Calendar} label="Última atualização" value={sourceUpdated} />
          </div>
        </section>

        <section className="px-5 py-3 border-b border-border">
          <button
            onClick={() => setShowRaw((v) => !v)}
            className="w-full flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition"
          >
            <span>Detalhes adicionais</span>
            {showRaw ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          </button>
          {showRaw && (
            <pre className="mt-2 text-[11px] bg-muted/30 rounded-md p-2 max-h-48 overflow-auto">
{JSON.stringify(props, null, 2)}
            </pre>
          )}
        </section>

        {!showForm ? (
          <section className="px-5 py-4 space-y-2">
            <button
              onClick={() => setShowForm(true)}
              className="w-full inline-flex items-center justify-center gap-2 h-10 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition"
            >
              <Download className="h-4 w-4" /> Salvar como imóvel monitorado
            </button>
            <p className="text-[10px] text-muted-foreground text-center">
              Cria um imóvel com a geometria desta feição e roda o diagnóstico automático.
            </p>
          </section>
        ) : (
          <section className="px-5 py-4 space-y-3">
            <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Salvar como imóvel monitorado
            </h3>
            <div className="space-y-1.5">
              <label className="block text-[11px] text-muted-foreground">Nome do imóvel</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-9 w-full rounded-md border border-input bg-input/40 px-3 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-[11px] text-muted-foreground">Vincular a cliente (opcional)</label>
              <select
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className="h-9 w-full rounded-md border border-input bg-input/40 px-3 text-sm"
              >
                <option value="">— Sem vínculo —</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setShowForm(false)}
                disabled={importMut.isPending}
                className="flex-1 h-10 rounded-md border border-border text-sm font-medium hover:bg-accent/10 transition disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleImport}
                disabled={importMut.isPending}
                className="flex-1 inline-flex items-center justify-center gap-2 h-10 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition disabled:opacity-50"
              >
                {importMut.isPending ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Salvando...</>
                ) : (
                  <>Salvar</>
                )}
              </button>
            </div>
          </section>
        )}
      </div>
    </aside>
  );
}

function Stat({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-card/60 p-2.5">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3 w-3" /> {label}
      </div>
      <div className="mt-1 text-xs font-semibold truncate">{value}</div>
    </div>
  );
}
