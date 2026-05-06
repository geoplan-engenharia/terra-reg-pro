import { Layers, Eye, EyeOff, Crosshair, RotateCcw } from "lucide-react";
import type { DataLayer } from "@/lib/layer-queries";

export function LayerControl({
  layers,
  activeIds,
  loadedCounts,
  onToggle,
  onZoom,
  onActivateAll,
  onClearAll,
  onReset,
}: {
  layers: DataLayer[];
  activeIds: Record<string, boolean>;
  loadedCounts?: Record<string, number>;
  onToggle: (id: string) => void;
  onZoom: (layer: DataLayer) => void;
  onActivateAll: () => void;
  onClearAll: () => void;
  onReset?: () => void;
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
        {onReset && (
          <button
            type="button"
            onClick={onReset}
            title="Resetar estado das camadas (limpa cache local)"
            className="p-1 rounded-md hover:bg-accent/30 text-muted-foreground hover:text-foreground transition"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        )}
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
          const loaded = loadedCounts?.[c.id];
          const total = c.features_count ?? 0;
          const isLarge = total > 5000;
          return (
            <div
              key={c.id}
              className={`flex items-center gap-1 rounded-md transition ${
                active ? "bg-accent/15 ring-1 ring-primary/30" : "hover:bg-accent/10 opacity-70"
              }`}
            >
              <button
                type="button"
                onClick={() => onToggle(c.id)}
                title={c.description ?? c.name}
                className="flex-1 flex items-center gap-2.5 px-2 py-1.5 text-left min-w-0"
              >
                <span
                  className="h-3 w-3 rounded-sm shrink-0 border border-border/40"
                  style={{ background: c.color, opacity: active ? 1 : 0.4 }}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium leading-tight truncate">
                    {c.name}
                    {isLarge && (
                      <span className="ml-1.5 inline-block text-[9px] uppercase tracking-wider text-amber-500 font-semibold">
                        grande
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-muted-foreground capitalize">
                    {c.layer_type.replace("_", " ")} · {total.toLocaleString("pt-BR")} feições
                    {active && loaded != null ? ` · ${loaded.toLocaleString("pt-BR")} no mapa` : ""}
                  </div>
                </div>
                {active ? (
                  <Eye className="h-3.5 w-3.5 text-primary" />
                ) : (
                  <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
                )}
              </button>
              <button
                type="button"
                onClick={() => onZoom(c)}
                title="Zoom na camada"
                className="p-1.5 mr-1 rounded-md hover:bg-accent/30 text-muted-foreground hover:text-foreground transition"
              >
                <Crosshair className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
