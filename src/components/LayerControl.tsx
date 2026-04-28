import { Layers, Eye, EyeOff } from "lucide-react";
import type { DataLayer } from "@/lib/layer-queries";

export function LayerControl({
  layers,
  activeIds,
  onToggle,
  onActivateAll,
  onClearAll,
}: {
  layers: DataLayer[];
  activeIds: Record<string, boolean>;
  onToggle: (id: string) => void;
  onActivateAll: () => void;
  onClearAll: () => void;
}) {
  const activeCount = layers.filter((l) => activeIds[l.id]).length;

  return (
    <div className="rounded-lg border border-border bg-card/95 backdrop-blur shadow-panel">
      <div className="flex items-center justify-between gap-2 px-3 py-2.5 border-b border-border">
        <div className="flex items-center gap-2 min-w-0">
          <Layers className="h-4 w-4 text-primary shrink-0" />
          <span className="text-xs font-semibold uppercase tracking-wider truncate">
            Camadas ({activeCount}/{layers.length})
          </span>
        </div>
      </div>

      {layers.length > 0 && (
        <div className="flex border-b border-border">
          <button
            onClick={onActivateAll}
            disabled={activeCount === layers.length}
            className="flex-1 inline-flex items-center justify-center gap-1.5 h-8 text-[11px] font-medium hover:bg-accent/10 transition disabled:opacity-40 disabled:cursor-not-allowed border-r border-border"
          >
            <Eye className="h-3 w-3" /> Ativar todas
          </button>
          <button
            onClick={onClearAll}
            disabled={activeCount === 0}
            className="flex-1 inline-flex items-center justify-center gap-1.5 h-8 text-[11px] font-medium hover:bg-accent/10 transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <EyeOff className="h-3 w-3" /> Limpar mapa
          </button>
        </div>
      )}

      <div className="p-2 space-y-1 max-h-72 overflow-auto">
        {layers.length === 0 && (
          <p className="text-[11px] text-muted-foreground px-2 py-1.5">
            Nenhuma camada disponível. O Super Admin pode sincronizá-las em Fontes de Dados.
          </p>
        )}
        {layers.map((c) => {
          const active = !!activeIds[c.id];
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => onToggle(c.id)}
              title={c.description ?? c.name}
              className={`w-full flex items-center gap-2.5 rounded-md px-2 py-1.5 text-left transition ${
                active ? "bg-accent/15 ring-1 ring-primary/30" : "hover:bg-accent/10 opacity-70"
              }`}
            >
              <span
                className="h-3 w-3 rounded-sm shrink-0 border border-border/40"
                style={{ background: c.color, opacity: active ? 1 : 0.4 }}
              />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium leading-tight truncate">{c.name}</div>
                <div className="text-[10px] text-muted-foreground capitalize">
                  {c.layer_type.replace("_", " ")} · {c.features_count ?? 0} feições
                </div>
              </div>
              {active ? (
                <Eye className="h-3.5 w-3.5 text-primary" />
              ) : (
                <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
