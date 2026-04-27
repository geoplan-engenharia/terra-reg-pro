import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { useConsultationHistory, type ConsultationHistoryRow } from "@/lib/history";
import { useProperties } from "@/lib/queries";
import { useMemo, useState } from "react";
import { History as HistoryIcon, FileText, Filter, X, MapPin, User as UserIcon, Calendar, Eye, FileDown, Loader2 } from "lucide-react";
import { ReportModal } from "@/components/ReportModal";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/historico")({
  head: () => ({ meta: [{ title: "Histórico — GeoTerra" }] }),
  component: HistoricoPage,
});

const sourceLabel: Record<string, { label: string; cls: string }> = {
  relatorio: { label: "Relatório", cls: "border-primary/40 bg-primary/10 text-primary" },
  car: { label: "Consulta CAR", cls: "border-info/40 bg-info/10 text-info" },
  sigef: { label: "Consulta SIGEF", cls: "border-info/40 bg-info/10 text-info" },
  mapbiomas: { label: "MapBiomas", cls: "border-warning/40 bg-warning/10 text-warning" },
};

function HistoricoPage() {
  const [propertyId, setPropertyId] = useState<string>("");
  const [userFilter, setUserFilter] = useState<string>("");
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const [detail, setDetail] = useState<ConsultationHistoryRow | null>(null);
  const [reopenPropertyId, setReopenPropertyId] = useState<string | null>(null);

  const filter = useMemo(
    () => ({
      propertyId: propertyId || undefined,
      from: from ? new Date(from + "T00:00:00").toISOString() : undefined,
      to: to ? new Date(to + "T23:59:59").toISOString() : undefined,
    }),
    [propertyId, from, to]
  );

  const { data: rows = [], isLoading } = useConsultationHistory(filter);
  const { data: properties = [] } = useProperties();

  const filteredByUser = useMemo(() => {
    if (!userFilter) return rows;
    const q = userFilter.toLowerCase();
    return rows.filter(
      (r) =>
        (r.user_name ?? "").toLowerCase().includes(q) ||
        (r.user_email ?? "").toLowerCase().includes(q)
    );
  }, [rows, userFilter]);

  const clearFilters = () => {
    setPropertyId("");
    setUserFilter("");
    setFrom("");
    setTo("");
  };

  const hasFilter = propertyId || userFilter || from || to;

  return (
    <AppLayout title="Histórico" subtitle="Consultas e relatórios emitidos pela equipe">
      <div className="p-6 space-y-4">
        {/* Filters */}
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Filter className="h-3.5 w-3.5" /> Filtros
          </div>
          <div className="grid gap-3 md:grid-cols-4">
            <div>
              <label className="text-[11px] font-medium text-muted-foreground">Imóvel</label>
              <select
                value={propertyId}
                onChange={(e) => setPropertyId(e.target.value)}
                className="mt-1 h-9 w-full rounded-md border border-input bg-input/40 px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Todos</option>
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-medium text-muted-foreground">Usuário</label>
              <input
                value={userFilter}
                onChange={(e) => setUserFilter(e.target.value)}
                placeholder="Nome ou e-mail"
                className="mt-1 h-9 w-full rounded-md border border-input bg-input/40 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-muted-foreground">De</label>
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="mt-1 h-9 w-full rounded-md border border-input bg-input/40 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-muted-foreground">Até</label>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="mt-1 h-9 w-full rounded-md border border-input bg-input/40 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
          {hasFilter && (
            <button onClick={clearFilters} className="mt-3 text-xs text-primary hover:underline inline-flex items-center gap-1">
              <X className="h-3 w-3" /> Limpar filtros
            </button>
          )}
        </div>

        {/* Results */}
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {filteredByUser.length} registro{filteredByUser.length !== 1 ? "s" : ""} encontrado{filteredByUser.length !== 1 ? "s" : ""}
          </p>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground text-sm">
            <Loader2 className="h-5 w-5 animate-spin inline" />
          </div>
        ) : filteredByUser.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-border rounded-xl">
            <HistoryIcon className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <div className="text-sm text-muted-foreground">Nenhuma consulta registrada {hasFilter ? "com os filtros aplicados" : "ainda"}.</div>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredByUser.map((row) => {
              const src = row.data_source_key
                ? sourceLabel[row.data_source_key] ?? { label: row.data_source_key, cls: "border-border bg-muted/30 text-muted-foreground" }
                : { label: "Consulta", cls: "border-border bg-muted/30 text-muted-foreground" };
              return (
                <div key={row.id} className="rounded-lg border border-border bg-card p-4 flex flex-wrap gap-3 items-start hover:border-primary/40 transition">
                  <div className="h-10 w-10 rounded-md bg-gradient-primary text-primary-foreground grid place-items-center shrink-0">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wider", src.cls)}>
                        {src.label}
                      </span>
                      <div className="text-sm font-semibold truncate">{row.property_name ?? "Imóvel removido"}</div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{row.result_summary ?? "—"}</p>
                    <div className="mt-2 flex items-center gap-4 text-[11px] text-muted-foreground flex-wrap">
                      <span className="inline-flex items-center gap-1"><UserIcon className="h-3 w-3" /> {row.user_name ?? row.user_email ?? "—"}</span>
                      <span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3" /> {new Date(row.created_at).toLocaleString("pt-BR")}</span>
                      {row.property_name && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {row.property_name}</span>}
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => setDetail(row)}
                      className="h-8 px-2.5 inline-flex items-center gap-1.5 rounded-md border border-border text-xs hover:bg-accent/10"
                    >
                      <Eye className="h-3.5 w-3.5" /> Ver resumo
                    </button>
                    {row.property_id && row.data_source_key === "relatorio" && (
                      <button
                        onClick={() => setReopenPropertyId(row.property_id)}
                        className="h-8 px-2.5 inline-flex items-center gap-1.5 rounded-md bg-primary text-primary-foreground text-xs hover:opacity-90"
                      >
                        <FileDown className="h-3.5 w-3.5" /> Reemitir
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Detail modal */}
      {detail && (
        <div className="fixed inset-0 z-[2000] grid place-items-center bg-background/80 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-lg shadow-panel w-full max-w-lg p-5 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-[10px] uppercase tracking-widest text-primary">Resumo da consulta</div>
                <h3 className="text-base font-semibold mt-0.5">{detail.property_name ?? "—"}</h3>
              </div>
              <button onClick={() => setDetail(null)} className="h-7 w-7 grid place-items-center rounded hover:bg-accent/10"><X className="h-4 w-4" /></button>
            </div>
            <div className="grid gap-2 text-sm">
              <div className="flex justify-between border-b border-border/50 py-1.5">
                <span className="text-muted-foreground text-xs">Tipo</span>
                <span className="font-medium">{detail.data_source_key ?? "—"}</span>
              </div>
              <div className="flex justify-between border-b border-border/50 py-1.5">
                <span className="text-muted-foreground text-xs">Usuário</span>
                <span className="font-medium">{detail.user_name ?? detail.user_email ?? "—"}</span>
              </div>
              <div className="flex justify-between border-b border-border/50 py-1.5">
                <span className="text-muted-foreground text-xs">Data</span>
                <span className="font-medium">{new Date(detail.created_at).toLocaleString("pt-BR")}</span>
              </div>
              <div className="border-b border-border/50 py-1.5">
                <div className="text-muted-foreground text-xs mb-1">Resumo</div>
                <div className="text-sm whitespace-pre-wrap">{detail.result_summary ?? "—"}</div>
              </div>
              {detail.query_params && Object.keys(detail.query_params).length > 0 && (
                <div className="py-1.5">
                  <div className="text-muted-foreground text-xs mb-1">Parâmetros</div>
                  <pre className="text-[11px] font-mono bg-background/40 border border-border rounded p-2 overflow-auto">
                    {JSON.stringify(detail.query_params, null, 2)}
                  </pre>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setDetail(null)} className="h-9 px-3 rounded-md border border-border text-sm hover:bg-accent/10">Fechar</button>
              {detail.property_id && (
                <button
                  onClick={() => { setReopenPropertyId(detail.property_id); setDetail(null); }}
                  className="h-9 px-3 rounded-md bg-primary text-primary-foreground text-sm font-medium inline-flex items-center gap-1.5 hover:opacity-90"
                >
                  <FileDown className="h-4 w-4" /> Reemitir relatório
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {reopenPropertyId && <ReportModal propertyId={reopenPropertyId} onClose={() => setReopenPropertyId(null)} />}
    </AppLayout>
  );
}
