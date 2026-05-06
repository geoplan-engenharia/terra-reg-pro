import type { DataLayer } from "@/lib/layer-queries";

const LAYER_LABELS: Record<string, string> = {
  car: "CAR — Cadastro Ambiental Rural",
  sigef: "SIGEF — Certificação INCRA",
  embargo: "Embargos IBAMA",
  desmatamento: "Alertas de desmatamento",
  uso_solo: "Uso e cobertura do solo",
  outros: "Outras camadas",
};

export function MapLegend({
  activeLayers,
  zoom,
}: {
  activeLayers: DataLayer[];
  zoom?: number;
}) {
  if (activeLayers.length === 0) return null;
  const hasLargeLayer = activeLayers.some((l) => (l.features_count ?? 0) > 5000);
  const tooFarOut = zoom != null && zoom < 6;
  return (
    <div className="absolute bottom-4 right-4 z-[999] rounded-lg border border-border bg-card/95 backdrop-blur shadow-panel p-3 max-w-xs">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">
        Legenda
      </div>
      <ul className="space-y-1.5">
        {activeLayers.map((l) => (
          <li
            key={l.id}
            className="flex items-center gap-2 text-xs"
            title={l.description ?? LAYER_LABELS[l.layer_type] ?? l.name}
          >
            <span
              className="h-3 w-3 rounded-sm border border-border/50 shrink-0"
              style={{ background: l.color, opacity: 0.7 }}
            />
            <span className="truncate">{l.name}</span>
          </li>
        ))}
      </ul>
      {tooFarOut && (
        <div className="mt-2 pt-2 border-t border-border text-[10px] text-amber-500">
          Aproxime o zoom para ver as feições do CAR.
        </div>
      )}
      {!tooFarOut && hasLargeLayer && (
        <div className="mt-2 pt-2 border-t border-border text-[10px] text-muted-foreground">
          Camada grande — feições carregadas conforme você navega.
        </div>
      )}
    </div>
  );
}
