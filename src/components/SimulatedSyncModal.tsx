import { useState, useMemo } from "react";
import { X, Loader2, Sparkles, MapPin, History, AlertTriangle, CheckCircle2, FileText } from "lucide-react";
import { useProperties, useRunSimulatedSync, useSimulatedSyncRuns, useSimulatedSyncFindings, type SimulatedSyncRun } from "@/lib/queries";
import type { DataSource } from "@/lib/types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Props {
  source: DataSource;
  onClose: () => void;
  canRun: boolean;
}

const sevColor: Record<"alta" | "media" | "baixa", string> = {
  alta: "border-destructive/40 bg-destructive/10 text-destructive",
  media: "border-warning/40 bg-warning/10 text-warning",
  baixa: "border-success/40 bg-success/10 text-success",
};

export function SimulatedSyncModal({ source, onClose, canRun }: Props) {
  const { data: properties = [] } = useProperties();
  const { data: runs = [], isLoading: loadingRuns } = useSimulatedSyncRuns({ sourceKey: source.key, limit: 20 });
  const runSync = useRunSimulatedSync();
  const [propertyId, setPropertyId] = useState<string>("");
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const { data: findings = [], isLoading: loadingFindings } = useSimulatedSyncFindings(selectedRunId);

  const propertyMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of properties) m.set(p.id, p.name);
    return m;
  }, [properties]);

  const handleRun = async () => {
    try {
      const runId = await runSync.mutateAsync({
        dataSourceKey: source.key,
        propertyId: propertyId || null,
      });
      toast.success("Sincronização simulada concluída");
      setSelectedRunId(runId);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <div className="fixed inset-0 z-[2000] grid place-items-center bg-background/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-3xl rounded-xl border border-border bg-card p-5 space-y-4 max-h-[90vh] overflow-auto">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold">Sincronização simulada</h2>
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {source.name} <span className="font-mono opacity-70">({source.key})</span>
            </div>
          </div>
          <button onClick={onClose} className="h-7 w-7 grid place-items-center rounded hover:bg-accent/10">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="rounded-lg border border-info/40 bg-info/5 p-3 text-xs text-muted-foreground">
          Este módulo gera <strong>dados fictícios determinísticos</strong> para validar fluxos de CAR, SIGEF, MapBiomas, DETER e IBAMA antes da integração real. Achados podem atualizar campos do imóvel e gerar alertas de monitoramento.
        </div>

        {/* Trigger panel */}
        {canRun && (
          <div className="rounded-lg border border-border p-3 space-y-3">
            <div>
              <label className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
                <MapPin className="h-3 w-3" /> Imóvel (opcional)
              </label>
              <select
                value={propertyId}
                onChange={(e) => setPropertyId(e.target.value)}
                className="mt-1 h-9 w-full rounded-md border border-input bg-input/40 px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">— Sem imóvel vinculado —</option>
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <button
              onClick={handleRun}
              disabled={runSync.isPending}
              className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-primary text-primary-foreground h-9 text-sm font-medium hover:opacity-90 disabled:opacity-50 shadow-glow"
            >
              {runSync.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Executar simulação
            </button>
          </div>
        )}

        {/* History */}
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold mb-2">
            <History className="h-3.5 w-3.5" /> Histórico de execuções
            <span className="text-muted-foreground font-normal">({runs.length})</span>
          </div>
          {loadingRuns ? (
            <div className="text-center py-6 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin inline" /></div>
          ) : runs.length === 0 ? (
            <div className="text-center py-6 border border-dashed border-border rounded-lg text-xs text-muted-foreground">
              Nenhuma execução registrada para esta fonte.
            </div>
          ) : (
            <div className="space-y-1.5">
              {runs.map((r) => (
                <RunRow
                  key={r.id}
                  run={r}
                  propertyName={r.property_id ? propertyMap.get(r.property_id) ?? "—" : null}
                  selected={selectedRunId === r.id}
                  onSelect={() => setSelectedRunId(selectedRunId === r.id ? null : r.id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Findings of selected run */}
        {selectedRunId && (
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold mb-2">
              <FileText className="h-3.5 w-3.5" /> Achados da execução
            </div>
            {loadingFindings ? (
              <div className="text-center py-6 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin inline" /></div>
            ) : (
              <div className="space-y-2">
                {findings.map((f) => (
                  <div key={f.id} className="rounded-lg border border-border p-3 text-xs">
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-medium text-sm">{f.title}</div>
                      <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wider", sevColor[f.severidade])}>
                        {f.severidade}
                      </span>
                    </div>
                    {f.description && <div className="text-muted-foreground mt-1">{f.description}</div>}
                    <div className="mt-1.5 text-[10px] font-mono text-muted-foreground">{f.finding_type}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function RunRow({ run, propertyName, selected, onSelect }: { run: SimulatedSyncRun; propertyName: string | null; selected: boolean; onSelect: () => void }) {
  const ok = run.status === "sucesso";
  return (
    <button
      onClick={onSelect}
      className={cn(
        "w-full text-left rounded-lg border p-2.5 transition flex items-center gap-3",
        selected ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
      )}
    >
      {ok ? <CheckCircle2 className="h-4 w-4 text-success shrink-0" /> : <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />}
      <div className="min-w-0 flex-1">
        <div className="text-xs font-medium">
          {new Date(run.created_at).toLocaleString("pt-BR")}
          {propertyName && <span className="text-muted-foreground font-normal"> · {propertyName}</span>}
        </div>
        <div className="text-[11px] text-muted-foreground truncate">{run.message ?? "—"}</div>
      </div>
      <div className="text-[11px] text-muted-foreground shrink-0">{run.findings_count} achado(s)</div>
    </button>
  );
}
