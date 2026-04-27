import { useState } from "react";
import { X, Loader2, Leaf, Save } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { usePropertyEnvironmentalAnalyses, useUpsertEnvironmentalAnalysis } from "@/lib/queries";
import type { EnvironmentalAnalysis } from "@/lib/types";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

function ToggleField({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-md border border-border bg-background/30 px-3 py-2.5 cursor-pointer hover:bg-accent/5">
      <span className="text-xs font-medium">{label}</span>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={cn(
          "relative inline-flex h-5 w-9 items-center rounded-full transition",
          checked ? "bg-primary" : "bg-muted"
        )}
        aria-pressed={checked}
      >
        <span className={cn("inline-block h-4 w-4 rounded-full bg-background shadow transition", checked ? "translate-x-4" : "translate-x-0.5")} />
      </button>
    </label>
  );
}

function NumberField({ label, value, onChange, disabled }: { label: string; value: number | null; onChange: (v: number | null) => void; disabled?: boolean }) {
  return (
    <div className="space-y-1">
      <label className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</label>
      <input
        type="number"
        step="0.01"
        min="0"
        disabled={disabled}
        value={value ?? ""}
        onChange={(e) => {
          const v = e.target.value;
          onChange(v === "" ? null : Number(v));
        }}
        className="w-full h-9 rounded-md border border-border bg-background px-3 text-sm disabled:opacity-50"
        placeholder="0,00"
      />
    </div>
  );
}

export function EnvironmentalAnalysisModal({
  propertyId,
  initial,
  onClose,
}: {
  propertyId: string;
  initial: EnvironmentalAnalysis | null;
  onClose: () => void;
}) {
  const { profile } = useAuth();
  const upsert = useUpsertEnvironmentalAnalysis();
  const { data: history = [] } = usePropertyEnvironmentalAnalyses(propertyId);

  const [hasDesmat, setHasDesmat] = useState(initial?.has_desmatamento ?? false);
  const [desmatArea, setDesmatArea] = useState<number | null>(initial?.desmatamento_area_ha ?? null);
  const [hasEmbargo, setHasEmbargo] = useState(initial?.has_embargo ?? false);
  const [embargoArea, setEmbargoArea] = useState<number | null>(initial?.embargo_area_ha ?? null);
  const [hasRL, setHasRL] = useState(initial?.has_reserva_legal_deficit ?? false);
  const [hasAPP, setHasAPP] = useState(initial?.has_app_violation ?? false);

  const handleSave = async () => {
    if (!profile) return;
    try {
      await upsert.mutateAsync({
        id: initial?.id,
        property_id: propertyId,
        organization_id: profile.organization_id,
        has_desmatamento: hasDesmat,
        desmatamento_area_ha: hasDesmat ? desmatArea : null,
        has_embargo: hasEmbargo,
        embargo_area_ha: hasEmbargo ? embargoArea : null,
        has_reserva_legal_deficit: hasRL,
        has_app_violation: hasAPP,
        analyzed_at: new Date().toISOString(),
      });
      toast.success("Análise ambiental salva e diagnósticos atualizados");
      onClose();
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-lg shadow-panel w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-gradient-surface">
          <div>
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-primary font-medium">
              <Leaf className="h-3 w-3" /> Análise ambiental
            </div>
            <h2 className="text-base font-semibold mt-0.5">{initial ? "Editar análise" : "Nova análise"}</h2>
          </div>
          <button onClick={onClose} className="h-8 w-8 grid place-items-center rounded-md hover:bg-accent/10 text-muted-foreground hover:text-foreground" aria-label="Fechar">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-5 space-y-5">
          <section className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Indicadores</h3>
            <div className="grid sm:grid-cols-2 gap-2">
              <ToggleField label="Alerta de desmatamento" checked={hasDesmat} onChange={setHasDesmat} />
              <ToggleField label="Área embargada" checked={hasEmbargo} onChange={setHasEmbargo} />
              <ToggleField label="Déficit de Reserva Legal" checked={hasRL} onChange={setHasRL} />
              <ToggleField label="Intervenção em APP" checked={hasAPP} onChange={setHasAPP} />
            </div>
          </section>

          <section className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Áreas afetadas (ha)</h3>
            <div className="grid sm:grid-cols-2 gap-3">
              <NumberField label="Desmatamento" value={desmatArea} onChange={setDesmatArea} disabled={!hasDesmat} />
              <NumberField label="Embargo" value={embargoArea} onChange={setEmbargoArea} disabled={!hasEmbargo} />
            </div>
          </section>

          {history.length > 0 && (
            <section className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Histórico</h3>
              <div className="rounded-md border border-border divide-y divide-border">
                {history.slice(0, 5).map((h, i) => (
                  <div key={h.id} className="flex items-center justify-between px-3 py-2 text-xs">
                    <div className="flex items-center gap-2">
                      <span>{new Date(h.analyzed_at).toLocaleString("pt-BR")}</span>
                      {i === 0 && (
                        <span className="inline-flex items-center rounded-full border border-success/40 bg-success/10 text-success px-1.5 py-0.5 text-[10px] uppercase tracking-wider">
                          Atual
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      {h.has_desmatamento && <span className="rounded bg-destructive/15 text-destructive px-1.5 py-0.5">Desmat</span>}
                      {h.has_embargo && <span className="rounded bg-destructive/15 text-destructive px-1.5 py-0.5">Embargo</span>}
                      {h.has_reserva_legal_deficit && <span className="rounded bg-warning/15 text-warning px-1.5 py-0.5">RL</span>}
                      {h.has_app_violation && <span className="rounded bg-warning/15 text-warning px-1.5 py-0.5">APP</span>}
                      {!h.has_desmatamento && !h.has_embargo && !h.has_reserva_legal_deficit && !h.has_app_violation && (
                        <span className="text-success">Regular</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        <div className="border-t border-border p-3 flex items-center justify-end gap-2">
          <button onClick={onClose} className="h-9 px-3 rounded-md border border-border text-sm hover:bg-accent/10">
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={upsert.isPending}
            className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium inline-flex items-center gap-2 hover:opacity-90 disabled:opacity-50"
          >
            {upsert.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Salvar análise
          </button>
        </div>
      </div>
    </div>
  );
}
