import { useState } from "react";
import { X, Download, Loader2, MapPin, Hash, Ruler, Layers as LayersIcon } from "lucide-react";
import { toast } from "sonner";
import type { DataLayer, DataLayerFeature } from "@/lib/layer-queries";
import { useImportFeatureAsProperty } from "@/lib/layer-queries";
import { useClients } from "@/lib/queries";
import { useGuardTrial } from "./TrialGuard";

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
  const [clientId, setClientId] = useState<string>("");
  const [name, setName] = useState<string>("");

  const handleImport = async () => {
    if (guardTrial()) return;
    try {
      const id = await importMut.mutateAsync({
        feature_id: feature.id,
        client_id: clientId || null,
        name: name || undefined,
      });
      toast.success("Feature importada como imóvel");
      onImported?.(id);
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao importar");
    }
  };

  const props = feature.properties_json ?? {};

  return (
    <aside className="absolute top-0 right-0 h-full w-[26rem] bg-card/98 backdrop-blur border-l border-border shadow-panel z-[1000] flex flex-col">
      <header className="flex items-start justify-between gap-3 px-5 py-4 border-b border-border">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-muted-foreground">
            <LayersIcon className="h-3 w-3" /> Camada · {layer.name}
          </div>
          <h2 className="text-sm font-semibold mt-1 truncate">
            {feature.external_id ?? "Feature " + feature.id.slice(0, 8)}
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
        <section className="px-5 py-4 border-b border-border space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <Stat icon={Hash} label="ID externo" value={feature.external_id ?? "—"} />
            <Stat
              icon={Ruler}
              label="Área"
              value={feature.area_ha != null ? `${Number(feature.area_ha).toLocaleString("pt-BR")} ha` : "—"}
            />
            <Stat
              icon={MapPin}
              label="Localização"
              value={`${feature.municipality ?? "—"}/${feature.uf ?? "—"}`}
            />
            <Stat icon={LayersIcon} label="Tipo" value={layer.layer_type} />
          </div>
        </section>

        <section className="px-5 py-4 border-b border-border">
          <h3 className="text-xs font-semibold uppercase tracking-wider mb-2">Dados da feature</h3>
          <pre className="text-[11px] bg-muted/30 rounded-md p-2 max-h-48 overflow-auto">
{JSON.stringify(props, null, 2)}
          </pre>
        </section>

        <section className="px-5 py-4 space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider">Importar como imóvel</h3>
          <div className="space-y-2">
            <label className="block text-[11px] text-muted-foreground">Nome (opcional)</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={`${layer.name} — ${feature.external_id ?? feature.id.slice(0, 6)}`}
              className="h-9 w-full rounded-md border border-input bg-input/40 px-3 text-sm"
            />
          </div>
          <div className="space-y-2">
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
          <button
            onClick={handleImport}
            disabled={importMut.isPending}
            className="w-full inline-flex items-center justify-center gap-2 h-10 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition disabled:opacity-50"
          >
            {importMut.isPending ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Importando...</>
            ) : (
              <><Download className="h-4 w-4" /> Importar como imóvel</>
            )}
          </button>
          <p className="text-[10px] text-muted-foreground">
            Cria um imóvel com a geometria desta feature, vincula ao cliente (se selecionado) e roda o diagnóstico automaticamente.
          </p>
        </section>
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
