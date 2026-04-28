import { createFileRoute } from "@tanstack/react-router";
import { AdminLayout } from "@/components/AdminLayout";
import { useDataSources, useUpsertDataSource, useDeleteDataSource } from "@/lib/queries";
import { useDataLayers, useSyncDataLayer, useUpdateLayer, useDeleteLayer, type LayerType } from "@/lib/layer-queries";
import type { DataSource, DataSourceStatus, DataSourceKind } from "@/lib/types";
import { useMemo, useState } from "react";
import { Database, Plus, RefreshCw, Pencil, Trash2, X, Loader2, ExternalLink, Calendar, Tag, Activity, Sparkles, Layers, Eye, EyeOff, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { SimulatedSyncModal } from "@/components/SimulatedSyncModal";

export const Route = createFileRoute("/admin/fontes-dados")({
  head: () => ({
    meta: [
      { title: "Fontes de Dados — Admin GeoTerra" },
      { name: "description", content: "Catálogo de fontes geoespaciais — gerenciado pelo super administrador da plataforma." },
    ],
  }),
  component: DataSourcesPage,
});

const statusMap: Record<DataSourceStatus, { label: string; cls: string; dot: string }> = {
  ativa: { label: "Ativa", cls: "border-success/40 bg-success/10 text-success", dot: "bg-success" },
  planejada: { label: "Planejada", cls: "border-info/40 bg-info/10 text-info", dot: "bg-info" },
  instavel: { label: "Instável", cls: "border-warning/40 bg-warning/10 text-warning", dot: "bg-warning" },
  indisponivel: { label: "Indisponível", cls: "border-destructive/40 bg-destructive/10 text-destructive", dot: "bg-destructive" },
};

const sourceTypeOptions = [
  { value: "rest_api", label: "REST API" },
  { value: "wms", label: "WMS" },
  { value: "wfs", label: "WFS" },
  { value: "scraping", label: "Scraping" },
  { value: "arquivo", label: "Arquivo (CSV/SHP)" },
  { value: "manual", label: "Manual" },
];

const frequencyOptions = ["diario", "semanal", "mensal", "trimestral", "anual", "sob_demanda"];
const categoryOptions = ["fundiario", "ambiental", "fiscalizacao", "cartorial", "estadual", "outro"];

interface FormState {
  id?: string;
  key: string;
  name: string;
  description: string;
  category: string;
  source_type: string;
  source_kind: DataSourceKind;
  endpoint_url: string;
  update_frequency: string;
  status: DataSourceStatus;
  enabled: boolean;
}

const emptyForm: FormState = {
  key: "",
  name: "",
  description: "",
  category: "",
  source_type: "",
  source_kind: "geoespacial",
  endpoint_url: "",
  update_frequency: "",
  status: "planejada",
  enabled: true,
};

const layerTypeColors: Record<LayerType, string> = {
  car: "#5fbb6f",
  sigef: "#3b9bff",
  embargo: "#f4a02b",
  desmatamento: "#e85d4a",
  uso_solo: "#a78bfa",
  outros: "#94a3b8",
};

function inferLayerType(source: DataSource): LayerType {
  const k = source.key.toLowerCase();
  if (k.includes("car")) return "car";
  if (k.includes("sigef")) return "sigef";
  if (k.includes("ibama") || k.includes("embargo")) return "embargo";
  if (k.includes("deter") || k.includes("prodes") || k.includes("desmat")) return "desmatamento";
  if (k.includes("mapbiomas") || k.includes("uso")) return "uso_solo";
  return "outros";
}

function DataSourcesPage() {
  const { data: sources = [], isLoading } = useDataSources();
  const { data: layers = [], isLoading: loadingLayers } = useDataLayers();
  const upsert = useUpsertDataSource();
  const remove = useDeleteDataSource();
  const syncLayer = useSyncDataLayer();
  const updateLayer = useUpdateLayer();
  const deleteLayer = useDeleteLayer();

  const [editing, setEditing] = useState<FormState | null>(null);
  const [statusFilter, setStatusFilter] = useState<DataSourceStatus | "all">("all");
  const [simSource, setSimSource] = useState<DataSource | null>(null);

  const handleSyncAsLayer = async (s: DataSource) => {
    try {
      const lt = inferLayerType(s);
      await syncLayer.mutateAsync({
        data_source_key: s.key,
        layer_type: lt,
        layer_name: s.name,
        color: layerTypeColors[lt],
      });
      toast.success(`Camada "${s.name}" sincronizada com features simuladas.`);
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const filtered = useMemo(
    () => (statusFilter === "all" ? sources : sources.filter((s) => s.status === statusFilter)),
    [sources, statusFilter]
  );

  const counts = useMemo(() => {
    const c: Record<DataSourceStatus | "total", number> = { ativa: 0, planejada: 0, instavel: 0, indisponivel: 0, total: sources.length };
    for (const s of sources) c[s.status]++;
    return c;
  }, [sources]);

  const handleSync = (s: DataSource) => setSimSource(s);

  const openNew = () => setEditing({ ...emptyForm });
  const openEdit = (s: DataSource) =>
    setEditing({
      id: s.id,
      key: s.key,
      name: s.name,
      description: s.description ?? "",
      category: s.category ?? "",
      source_type: s.source_type ?? "",
      source_kind: s.source_kind ?? "geoespacial",
      endpoint_url: s.endpoint_url ?? "",
      update_frequency: s.update_frequency ?? "",
      status: s.status,
      enabled: s.enabled,
    });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    try {
      await upsert.mutateAsync({
        id: editing.id,
        key: editing.key.trim(),
        name: editing.name.trim(),
        description: editing.description || null,
        category: editing.category || null,
        source_type: editing.source_type || null,
        source_kind: editing.source_kind,
        endpoint_url: editing.endpoint_url || null,
        update_frequency: editing.update_frequency || null,
        status: editing.status,
        enabled: editing.enabled,
      });
      toast.success(editing.id ? "Fonte atualizada" : "Fonte cadastrada");
      setEditing(null);
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const handleDelete = async (s: DataSource) => {
    if (!confirm(`Excluir a fonte "${s.name}"?`)) return;
    try {
      await remove.mutateAsync(s.id);
      toast.success("Fonte removida");
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  return (
    <AdminLayout title="Fontes de Dados" subtitle="Catálogo global de integrações geoespaciais da plataforma">
      <div className="p-6 space-y-5">
        {/* Stats */}
        <div className="grid gap-3 grid-cols-2 md:grid-cols-5">
          <button
            onClick={() => setStatusFilter("all")}
            className={cn(
              "rounded-xl border p-4 text-left transition",
              statusFilter === "all" ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/40"
            )}
          >
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Total</div>
            <div className="text-2xl font-semibold mt-1">{counts.total}</div>
          </button>
          {(Object.keys(statusMap) as DataSourceStatus[]).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={cn(
                "rounded-xl border p-4 text-left transition",
                statusFilter === st ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/40"
              )}
            >
              <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                <span className={cn("h-1.5 w-1.5 rounded-full", statusMap[st].dot)} />
                {statusMap[st].label}
              </div>
              <div className="text-2xl font-semibold mt-1">{counts[st]}</div>
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {filtered.length} fonte{filtered.length !== 1 ? "s" : ""} listada{filtered.length !== 1 ? "s" : ""}
          </p>
          <button
            onClick={openNew}
            className="inline-flex items-center gap-2 rounded-md bg-primary text-primary-foreground h-9 px-4 text-sm font-medium hover:opacity-90 shadow-glow"
          >
            <Plus className="h-4 w-4" /> Nova fonte
          </button>
        </div>

        {/* List */}
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground text-sm">
            <Loader2 className="h-5 w-5 animate-spin inline" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-border rounded-xl">
            <Database className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <div className="text-sm text-muted-foreground">Nenhuma fonte cadastrada nesta visão.</div>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {filtered.map((s) => {
              const st = statusMap[s.status];
              return (
                <div key={s.id} className="rounded-xl border border-border bg-card p-4 hover:border-primary/40 transition">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-md bg-gradient-primary text-primary-foreground grid place-items-center shrink-0">
                      <Database className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-semibold truncate">{s.name}</h3>
                        <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wider", st.cls)}>
                          <span className={cn("h-1.5 w-1.5 rounded-full", st.dot)} /> {st.label}
                        </span>
                      </div>
                      <div className="text-[11px] text-muted-foreground font-mono mt-0.5">{s.key}</div>
                      {s.description && <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">{s.description}</p>}
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
                    {s.source_type && (
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Tag className="h-3 w-3" /> {s.source_type}
                      </div>
                    )}
                    {s.category && (
                      <div className="flex items-center gap-1.5 text-muted-foreground capitalize">
                        <Activity className="h-3 w-3" /> {s.category}
                      </div>
                    )}
                    {s.update_frequency && (
                      <div className="flex items-center gap-1.5 text-muted-foreground capitalize">
                        <RefreshCw className="h-3 w-3" /> {s.update_frequency.replace("_", " ")}
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Calendar className="h-3 w-3" />{" "}
                      {s.last_sync_at ? new Date(s.last_sync_at).toLocaleString("pt-BR") : "Nunca sincronizada"}
                    </div>
                  </div>

                  {s.endpoint_url && (
                    <a
                      href={s.endpoint_url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-flex items-center gap-1 text-[11px] text-primary hover:underline truncate max-w-full"
                    >
                      <ExternalLink className="h-3 w-3 shrink-0" /> <span className="truncate">{s.endpoint_url}</span>
                    </a>
                  )}

                  <div className="mt-3 pt-3 border-t border-border flex items-center gap-2">
                    <button
                      onClick={() => handleSync(s)}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-md border border-border h-8 text-xs hover:bg-accent/10"
                    >
                      <Sparkles className="h-3.5 w-3.5" /> Sincronização simulada
                    </button>
                    <button
                      onClick={() => openEdit(s)}
                      className="h-8 w-8 grid place-items-center rounded-md border border-border hover:bg-accent/10"
                      aria-label="Editar"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(s)}
                      className="h-8 w-8 grid place-items-center rounded-md border border-border hover:bg-destructive/10 hover:text-destructive hover:border-destructive/40"
                      aria-label="Remover"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Simulated sync modal */}
      {simSource && (
        <SimulatedSyncModal source={simSource} onClose={() => setSimSource(null)} canRun={true} />
      )}

      {/* Edit modal */}
      {editing && (
        <div className="fixed inset-0 z-[2000] grid place-items-center bg-background/80 backdrop-blur-sm p-4">
          <form onSubmit={submit} className="w-full max-w-lg rounded-xl border border-border bg-card p-5 space-y-4 max-h-[90vh] overflow-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">{editing.id ? "Editar fonte" : "Nova fonte de dados"}</h2>
              <button type="button" onClick={() => setEditing(null)} className="h-7 w-7 grid place-items-center rounded hover:bg-accent/10">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid gap-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground">Chave interna *</label>
                  <input
                    required
                    value={editing.key}
                    onChange={(e) => setEditing({ ...editing, key: e.target.value })}
                    placeholder="ex: car_sicar"
                    className="mt-1 h-9 w-full rounded-md border border-input bg-input/40 px-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground">Nome *</label>
                  <input
                    required
                    value={editing.name}
                    onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                    className="mt-1 h-9 w-full rounded-md border border-input bg-input/40 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>
              <div>
                <label className="text-[11px] font-medium text-muted-foreground">Descrição</label>
                <textarea
                  rows={2}
                  value={editing.description}
                  onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                  className="mt-1 w-full rounded-md border border-input bg-input/40 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground">Tipo</label>
                  <select
                    value={editing.source_type}
                    onChange={(e) => setEditing({ ...editing, source_type: e.target.value })}
                    className="mt-1 h-9 w-full rounded-md border border-input bg-input/40 px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="">—</option>
                    {sourceTypeOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground">Categoria</label>
                  <select
                    value={editing.category}
                    onChange={(e) => setEditing({ ...editing, category: e.target.value })}
                    className="mt-1 h-9 w-full rounded-md border border-input bg-input/40 px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="">—</option>
                    {categoryOptions.map((c) => <option key={c} value={c} className="capitalize">{c}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-[11px] font-medium text-muted-foreground">URL/base de referência</label>
                <input
                  type="url"
                  value={editing.endpoint_url}
                  onChange={(e) => setEditing({ ...editing, endpoint_url: e.target.value })}
                  placeholder="https://..."
                  className="mt-1 h-9 w-full rounded-md border border-input bg-input/40 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground">Frequência</label>
                  <select
                    value={editing.update_frequency}
                    onChange={(e) => setEditing({ ...editing, update_frequency: e.target.value })}
                    className="mt-1 h-9 w-full rounded-md border border-input bg-input/40 px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="">—</option>
                    {frequencyOptions.map((f) => <option key={f} value={f} className="capitalize">{f.replace("_", " ")}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground">Status</label>
                  <select
                    value={editing.status}
                    onChange={(e) => setEditing({ ...editing, status: e.target.value as DataSourceStatus })}
                    className="mt-1 h-9 w-full rounded-md border border-input bg-input/40 px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    {(Object.keys(statusMap) as DataSourceStatus[]).map((st) => (
                      <option key={st} value={st}>{statusMap[st].label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <label className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={editing.enabled}
                  onChange={(e) => setEditing({ ...editing, enabled: e.target.checked })}
                  className="h-4 w-4 rounded border-input"
                />
                Fonte habilitada para uso
              </label>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <button type="button" onClick={() => setEditing(null)} className="h-9 px-3 rounded-md border border-border text-sm hover:bg-accent/10">
                Cancelar
              </button>
              <button
                type="submit"
                disabled={upsert.isPending}
                className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium inline-flex items-center gap-2 hover:opacity-90 disabled:opacity-60"
              >
                {upsert.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Salvar
              </button>
            </div>
          </form>
        </div>
      )}
    </AdminLayout>
  );
}
