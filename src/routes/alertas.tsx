import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import {
  useUnifiedAlerts,
  useUpdateUnifiedAlertStatus,
  useProperties,
  type UnifiedAlert,
  type UnifiedAlertCategory,
  type UnifiedAlertStatus,
} from "@/lib/queries";
import { Bell, AlertTriangle, Eye, Check, FileText, Map as MapIcon, Leaf, ShieldAlert, Filter } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMemo, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/alertas")({
  head: () => ({ meta: [{ title: "Central de Alertas — GeoTerra" }] }),
  component: Alertas,
});

const CATEGORY_OPTIONS: { value: UnifiedAlertCategory; label: string; Icon: React.ComponentType<{ className?: string }> }[] = [
  { value: "ambiental", label: "Ambiental", Icon: Leaf },
  { value: "fundiario", label: "Fundiário", Icon: ShieldAlert },
  { value: "licenca", label: "Licença", Icon: FileText },
  { value: "monitoramento", label: "Monitoramento", Icon: MapIcon },
];

const SEV_OPTIONS = [
  { value: "alta", label: "Alta" },
  { value: "media", label: "Média" },
  { value: "baixa", label: "Baixa" },
] as const;

const STATUS_OPTIONS: { value: UnifiedAlertStatus; label: string }[] = [
  { value: "novo", label: "Novo" },
  { value: "visualizado", label: "Visualizado" },
  { value: "resolvido", label: "Resolvido" },
];

const PERIOD_OPTIONS = [
  { value: "7", label: "Últimos 7 dias" },
  { value: "30", label: "Últimos 30 dias" },
  { value: "90", label: "Últimos 90 dias" },
  { value: "all", label: "Todo período" },
] as const;

function Alertas() {
  const { data: alertas = [], isLoading } = useUnifiedAlerts();
  const { data: properties = [] } = useProperties();
  const updateStatus = useUpdateUnifiedAlertStatus();

  const [category, setCategory] = useState<"all" | UnifiedAlertCategory>("all");
  const [severity, setSeverity] = useState<"all" | "alta" | "media" | "baixa">("all");
  const [status, setStatus] = useState<"all" | UnifiedAlertStatus>("all");
  const [propertyId, setPropertyId] = useState<string>("all");
  const [period, setPeriod] = useState<(typeof PERIOD_OPTIONS)[number]["value"]>("30");

  const filtered = useMemo(() => {
    const cutoff = period === "all" ? null : Date.now() - Number(period) * 24 * 60 * 60 * 1000;
    return alertas.filter((a) => {
      if (category !== "all" && a.category !== category) return false;
      if (severity !== "all" && a.severidade !== severity) return false;
      if (status !== "all" && a.status !== status) return false;
      if (propertyId !== "all" && a.property_id !== propertyId) return false;
      if (cutoff !== null && new Date(a.date).getTime() < cutoff) return false;
      return true;
    });
  }, [alertas, category, severity, status, propertyId, period]);

  const handleStatusChange = async (a: UnifiedAlert, newStatus: UnifiedAlertStatus) => {
    if (a.source_table === "property_diagnostics") {
      toast.info("Diagnósticos são gerados automaticamente pelas regras.");
      return;
    }
    try {
      await updateStatus.mutateAsync({ id: a.id, source_table: a.source_table, status: newStatus });
      toast.success("Status atualizado");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <AppLayout title="Central de Alertas" subtitle="Monitoramento, licenças e diagnósticos críticos consolidados">
      <div className="p-6 space-y-4">
        {/* Filters */}
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-muted-foreground mb-3">
            <Filter className="h-3.5 w-3.5" /> Filtros
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <FilterField label="Tipo">
              <select value={category} onChange={(e) => setCategory(e.target.value as typeof category)} className="w-full h-9 rounded-md border border-border bg-background px-2 text-xs">
                <option value="all">Todos os tipos</option>
                {CATEGORY_OPTIONS.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </FilterField>
            <FilterField label="Severidade">
              <select value={severity} onChange={(e) => setSeverity(e.target.value as typeof severity)} className="w-full h-9 rounded-md border border-border bg-background px-2 text-xs">
                <option value="all">Todas</option>
                {SEV_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </FilterField>
            <FilterField label="Status">
              <select value={status} onChange={(e) => setStatus(e.target.value as typeof status)} className="w-full h-9 rounded-md border border-border bg-background px-2 text-xs">
                <option value="all">Todos</option>
                {STATUS_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </FilterField>
            <FilterField label="Imóvel">
              <select value={propertyId} onChange={(e) => setPropertyId(e.target.value)} className="w-full h-9 rounded-md border border-border bg-background px-2 text-xs">
                <option value="all">Todos</option>
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </FilterField>
            <FilterField label="Período">
              <select value={period} onChange={(e) => setPeriod(e.target.value as typeof period)} className="w-full h-9 rounded-md border border-border bg-background px-2 text-xs">
                {PERIOD_OPTIONS.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </FilterField>
          </div>
          <div className="mt-3 text-[11px] text-muted-foreground">
            {filtered.length} alerta{filtered.length !== 1 ? "s" : ""} • {alertas.length} no total
          </div>
        </div>

        {/* List */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          {isLoading ? (
            <div className="p-10 text-center text-sm text-muted-foreground">Carregando…</div>
          ) : filtered.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">Sem alertas para os filtros selecionados.</div>
          ) : (
            <ul className="divide-y divide-border">
              {filtered.map((a) => {
                const cat = CATEGORY_OPTIONS.find((c) => c.value === a.category);
                const Icon = cat?.Icon ?? Bell;
                return (
                  <li key={`${a.source_table}-${a.id}`} className="px-5 py-4 flex items-start gap-4 hover:bg-accent/5 transition">
                    <div className={cn(
                      "h-9 w-9 rounded-md grid place-items-center shrink-0",
                      a.severidade === "alta" ? "bg-destructive/15 text-destructive"
                        : a.severidade === "media" ? "bg-warning/15 text-warning"
                        : "bg-success/15 text-success"
                    )}>
                      {a.severidade === "baixa" ? <Icon className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold">{a.title}</span>
                        <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider rounded border border-border bg-muted/30 px-1.5 py-0.5">
                          <Icon className="h-2.5 w-2.5" />
                          {cat?.label ?? a.category}
                        </span>
                        <StatusBadge status={a.status} />
                      </div>
                      {a.property_name && (
                        <div className="text-xs text-muted-foreground mt-0.5">{a.property_name}</div>
                      )}
                      {a.description && (
                        <p className="text-xs text-foreground/80 mt-1.5">{a.description}</p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <div className="text-[11px] text-muted-foreground font-mono whitespace-nowrap">
                        {new Date(a.date).toLocaleDateString("pt-BR")}
                      </div>
                      {a.source_table !== "property_diagnostics" && (
                        <div className="flex items-center gap-1">
                          {a.status !== "visualizado" && a.status !== "resolvido" && (
                            <button
                              onClick={() => handleStatusChange(a, "visualizado")}
                              title="Marcar como visualizado"
                              className="inline-flex items-center gap-1 px-2 h-7 rounded border border-border text-[11px] hover:bg-accent/10"
                            >
                              <Eye className="h-3 w-3" /> Visto
                            </button>
                          )}
                          {a.status !== "resolvido" && (
                            <button
                              onClick={() => handleStatusChange(a, "resolvido")}
                              title="Marcar como resolvido"
                              className="inline-flex items-center gap-1 px-2 h-7 rounded border border-success/40 bg-success/10 text-success text-[11px] hover:bg-success/20"
                            >
                              <Check className="h-3 w-3" /> Resolver
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </AppLayout>
  );
}

function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}

function StatusBadge({ status }: { status: UnifiedAlertStatus }) {
  const map: Record<UnifiedAlertStatus, string> = {
    novo: "border-info/40 bg-info/10 text-info",
    visualizado: "border-warning/40 bg-warning/10 text-warning",
    resolvido: "border-success/40 bg-success/10 text-success",
  };
  return (
    <span className={cn("text-[10px] uppercase tracking-wider rounded border px-1.5 py-0.5", map[status])}>
      {status}
    </span>
  );
}
