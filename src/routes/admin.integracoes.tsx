import { createFileRoute } from "@tanstack/react-router";
import { AdminLayout } from "@/components/AdminLayout";
import { useState, useRef, useMemo } from "react";
import {
  Plug, Plus, Upload, Loader2, CheckCircle2, XCircle, Clock,
  FileArchive, MapPin, Layers, AlertCircle, X, Trash2, Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  useIntegrationProviders, useIntegrationJobs, useUpsertProvider,
  useUploadAndIngestSicar, useDeleteIntegrationJob, useCleanupOrphanFiles,
  type IntegrationProvider, type IntegrationJobStatus, type IntegrationJob,
} from "@/lib/integration-queries";

export const Route = createFileRoute("/admin/integracoes")({
  head: () => ({
    meta: [
      { title: "Integrações — Admin GeoTerra" },
      { name: "description", content: "Gestão de integrações com fontes externas (SICAR, MapBiomas, IBAMA)." },
    ],
  }),
  component: IntegracoesPage,
});

const UFS = ["AC","AL","AM","AP","BA","CE","DF","ES","GO","MA","MG","MS","MT","PA","PB","PE","PI","PR","RJ","RN","RO","RR","RS","SC","SE","SP","TO"];

const statusBadge: Record<IntegrationJobStatus, { label: string; cls: string; Icon: typeof Clock }> = {
  pendente: { label: "Pendente", cls: "border-muted-foreground/40 bg-muted/30 text-muted-foreground", Icon: Clock },
  processando: { label: "Processando", cls: "border-info/40 bg-info/10 text-info", Icon: Loader2 },
  sucesso: { label: "Sucesso", cls: "border-success/40 bg-success/10 text-success", Icon: CheckCircle2 },
  erro: { label: "Erro", cls: "border-destructive/40 bg-destructive/10 text-destructive", Icon: XCircle },
  cancelado: { label: "Cancelado", cls: "border-muted-foreground/40 bg-muted/30 text-muted-foreground", Icon: X },
};

function IntegracoesPage() {
  const { data: providers = [], isLoading } = useIntegrationProviders();
  const { data: jobs = [] } = useIntegrationJobs();
  const upsert = useUpsertProvider();
  const ingest = useUploadAndIngestSicar();
  const deleteJob = useDeleteIntegrationJob();
  const cleanupOrphans = useCleanupOrphanFiles();
  const [newOpen, setNewOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<IntegrationProvider | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<IntegrationJob | null>(null);

  const sicarProviders = useMemo(
    () => providers.filter((p) => p.kind === "shapefile_upload"),
    [providers]
  );

  const handleSeed = async () => {
    try {
      await upsert.mutateAsync({
        key: "sicar-shapefile",
        name: "SICAR — Shapefile Estadual",
        description: "Importação de shapefiles oficiais do SICAR (download manual em car.gov.br/publico/imoveis/index).",
        kind: "shapefile_upload",
        data_source_key: "sicar-shapefile",
        layer_type: "car",
        default_color: "#5fbb6f",
        status: "ativo",
      });
      toast.success("Provedor SICAR criado");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <AdminLayout title="Integrações" subtitle="Gerencie provedores reais de dados e execute ingestões">
      <div className="p-6 space-y-6 max-w-7xl">
        {/* Header actions */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-md bg-primary/10 border border-primary/30 flex items-center justify-center">
              <Plug className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="text-sm font-semibold">Provedores configurados</div>
              <div className="text-xs text-muted-foreground">
                {providers.length} provedor(es) · {jobs.length} execução(ões) recente(s)
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {sicarProviders.length === 0 && (
              <button
                onClick={handleSeed}
                disabled={upsert.isPending}
                className="inline-flex items-center gap-2 h-9 px-3 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition disabled:opacity-50"
              >
                {upsert.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                Criar provedor SICAR
              </button>
            )}
            <button
              onClick={async () => {
                if (!confirm("Remover todos os arquivos órfãos do storage (que não estão associados a nenhuma execução)?")) return;
                try {
                  const r = await cleanupOrphans.mutateAsync();
                  toast.success(`Limpeza concluída: ${r.removed} arquivo(s) removido(s), ${r.kept} mantido(s).`);
                } catch (e) {
                  toast.error((e as Error).message);
                }
              }}
              disabled={cleanupOrphans.isPending}
              title="Remove arquivos do bucket que não estão referenciados em nenhuma execução"
              className="inline-flex items-center gap-2 h-9 px-3 rounded-md border border-warning/40 bg-warning/5 text-warning text-xs font-medium hover:bg-warning/10 transition disabled:opacity-50"
            >
              {cleanupOrphans.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              Limpar órfãos
            </button>
            <button
              onClick={() => setNewOpen(true)}
              className="inline-flex items-center gap-2 h-9 px-3 rounded-md border border-border bg-card text-xs font-medium hover:bg-accent/10 transition"
            >
              <Plus className="h-3.5 w-3.5" /> Novo provedor
            </button>
          </div>
        </div>

        {/* About SICAR */}
        <div className="rounded-lg border border-info/30 bg-info/5 p-4 flex gap-3">
          <AlertCircle className="h-5 w-5 text-info shrink-0 mt-0.5" />
          <div className="text-xs text-foreground/90 space-y-1.5">
            <div className="font-semibold text-sm text-info">Sobre a integração com o SICAR</div>
            <p>
              O SICAR oficial (car.gov.br) <strong>não disponibiliza API pública</strong>. A ingestão é feita
              através do <strong>download manual dos shapefiles estaduais</strong> diretamente no portal SICAR
              (área pública → "Base de downloads"). Após baixar o ZIP do estado desejado, faça o upload abaixo
              e o sistema irá:
            </p>
            <ol className="list-decimal pl-4 space-y-0.5">
              <li>Parsear o shapefile e extrair todos os polígonos CAR;</li>
              <li>Criar/atualizar a camada geoespacial visível no mapa;</li>
              <li>Cruzar automaticamente com imóveis cadastrados (via código CAR) e atualizar status, área e localização.</li>
            </ol>
          </div>
        </div>

        {/* Providers grid */}
        <div className="space-y-3">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Provedores</div>
          {isLoading ? (
            <div className="text-xs text-muted-foreground flex items-center gap-2">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Carregando...
            </div>
          ) : providers.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-8 text-center text-xs text-muted-foreground">
              Nenhum provedor configurado. Clique em "Criar provedor SICAR" para começar.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {providers.map((p) => (
                <ProviderCard
                  key={p.id}
                  provider={p}
                  onUpload={() => setSelectedProvider(p)}
                  jobsCount={jobs.filter((j) => j.provider_id === p.id).length}
                />
              ))}
            </div>
          )}
        </div>

        {/* Recent jobs */}
        <div className="space-y-3">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Execuções recentes</div>
          {jobs.length === 0 ? (
            <div className="text-xs text-muted-foreground">Nenhuma execução ainda.</div>
          ) : (
            <div className="rounded-lg border border-border bg-card overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-muted/30 text-muted-foreground">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium">Status</th>
                    <th className="text-left px-3 py-2 font-medium">UF</th>
                    <th className="text-left px-3 py-2 font-medium">Arquivo</th>
                    <th className="text-right px-3 py-2 font-medium">Feições</th>
                    <th className="text-right px-3 py-2 font-medium">Imóveis vinculados</th>
                    <th className="text-left px-3 py-2 font-medium">Quando</th>
                    <th className="text-right px-3 py-2 font-medium">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((j) => {
                    const s = statusBadge[j.status];
                    return (
                      <tr key={j.id} className="border-t border-border">
                        <td className="px-3 py-2">
                          <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] font-medium", s.cls)}>
                            <s.Icon className={cn("h-3 w-3", j.status === "processando" && "animate-spin")} />
                            {s.label}
                          </span>
                        </td>
                        <td className="px-3 py-2">{j.uf ?? "—"}</td>
                        <td className="px-3 py-2 max-w-xs truncate" title={j.storage_path ?? ""}>
                          {j.storage_path?.split("/").pop() ?? "—"}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">{j.features_imported.toLocaleString("pt-BR")}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{j.properties_linked}</td>
                        <td className="px-3 py-2 text-muted-foreground">
                          {new Date(j.created_at).toLocaleString("pt-BR")}
                          {j.error_message && (
                            <div className="text-destructive text-[10px] mt-0.5">{j.error_message}</div>
                          )}
                          {j.log && j.status === "processando" && (
                            <div className="text-info text-[10px] mt-0.5">{j.log}</div>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right">
                          <button
                            onClick={() => setConfirmDelete(j)}
                            disabled={j.status === "processando"}
                            title="Excluir execução, arquivo e camada associada"
                            className="inline-flex items-center justify-center h-7 w-7 rounded border border-border hover:bg-destructive/10 hover:text-destructive hover:border-destructive/40 transition disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {selectedProvider && (
        <UploadModal
          provider={selectedProvider}
          onClose={() => setSelectedProvider(null)}
          onSubmit={async (file, uf, label) => {
            try {
              toast.info("Enviando arquivo... isso pode levar alguns minutos.");
              const result = await ingest.mutateAsync({ provider: selectedProvider, file, uf, label });
              toast.success(`Ingestão concluída: ${result?.features ?? 0} feições, ${result?.linked ?? 0} imóveis vinculados.`);
              setSelectedProvider(null);
            } catch (e) {
              toast.error((e as Error).message);
            }
          }}
          isSubmitting={ingest.isPending}
        />
      )}

      {newOpen && (
        <NewProviderModal
          onClose={() => setNewOpen(false)}
          onCreate={async (input) => {
            try {
              await upsert.mutateAsync(input);
              toast.success("Provedor criado");
              setNewOpen(false);
            } catch (e) {
              toast.error((e as Error).message);
            }
          }}
          isPending={upsert.isPending}
        />
      )}
    </AdminLayout>
  );
}

function ProviderCard({ provider, onUpload, jobsCount }: { provider: IntegrationProvider; onUpload: () => void; jobsCount: number }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="h-9 w-9 rounded-md flex items-center justify-center" style={{ background: provider.default_color + "22", border: `1px solid ${provider.default_color}66` }}>
            <Layers className="h-4 w-4" style={{ color: provider.default_color }} />
          </div>
          <div>
            <div className="text-sm font-semibold">{provider.name}</div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wide">
              {provider.kind} · {provider.layer_type}
            </div>
          </div>
        </div>
        <span className={cn(
          "px-2 py-0.5 rounded text-[10px] font-medium border",
          provider.status === "ativo" ? "border-success/40 bg-success/10 text-success" :
          provider.status === "planejado" ? "border-info/40 bg-info/10 text-info" :
          "border-muted-foreground/40 bg-muted/30 text-muted-foreground"
        )}>{provider.status}</span>
      </div>
      {provider.description && (
        <p className="text-xs text-muted-foreground line-clamp-2">{provider.description}</p>
      )}
      <div className="flex items-center justify-between pt-2 border-t border-border">
        <span className="text-[11px] text-muted-foreground">{jobsCount} execução(ões)</span>
        {provider.kind === "shapefile_upload" && provider.status === "ativo" && (
          <button
            onClick={onUpload}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:opacity-90"
          >
            <Upload className="h-3.5 w-3.5" /> Enviar shapefile
          </button>
        )}
      </div>
    </div>
  );
}

function UploadModal({
  provider, onClose, onSubmit, isSubmitting,
}: {
  provider: IntegrationProvider;
  onClose: () => void;
  onSubmit: (file: File, uf: string, label?: string) => void;
  isSubmitting: boolean;
}) {
  const [uf, setUf] = useState("");
  const [label, setLabel] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card border border-border rounded-lg shadow-xl w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div>
            <div className="text-sm font-semibold">Enviar shapefile</div>
            <div className="text-[11px] text-muted-foreground">{provider.name}</div>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
        </div>
        <div className="p-4 space-y-3">
          <div>
            <label className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium flex items-center gap-1">
              <MapPin className="h-3 w-3" /> Estado (UF)
            </label>
            <select
              value={uf}
              onChange={(e) => setUf(e.target.value)}
              className="mt-1 w-full h-9 rounded-md border border-input bg-input/40 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Selecione...</option>
              {UFS.map((u) => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">
              Rótulo (opcional)
            </label>
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Ex: Atualização Out/2025"
              className="mt-1 w-full h-9 rounded-md border border-input bg-input/40 px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium flex items-center gap-1">
              <FileArchive className="h-3 w-3" /> Arquivo (.zip contendo .shp/.dbf/.prj)
            </label>
            <input
              ref={fileRef}
              type="file"
              accept=".zip"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="mt-1 w-full text-xs file:mr-3 file:rounded-md file:border-0 file:bg-primary file:text-primary-foreground file:px-3 file:py-1.5 file:text-xs file:font-medium hover:file:opacity-90"
            />
            {file && (
              <div className="text-[11px] text-muted-foreground mt-1">
                {file.name} · {(file.size / 1024 / 1024).toFixed(2)} MB
              </div>
            )}
          </div>
          <div className="rounded-md border border-warning/30 bg-warning/5 p-2.5 text-[11px] text-foreground/90">
            ⚠️ Arquivos do SICAR podem ter centenas de MB. O processamento ocorre em segundo plano e pode levar alguns minutos.
          </div>
        </div>
        <div className="p-4 border-t border-border flex items-center justify-end gap-2">
          <button onClick={onClose} className="h-9 px-3 rounded-md border border-border text-xs hover:bg-accent/10">Cancelar</button>
          <button
            disabled={!uf || !file || isSubmitting}
            onClick={() => file && onSubmit(file, uf, label || undefined)}
            className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 disabled:opacity-50 inline-flex items-center gap-2"
          >
            {isSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
            Enviar e processar
          </button>
        </div>
      </div>
    </div>
  );
}

function NewProviderModal({
  onClose, onCreate, isPending,
}: {
  onClose: () => void;
  onCreate: (input: { key: string; name: string; description?: string; kind: "shapefile_upload"; layer_type: string; default_color: string; status: "ativo"; data_source_key: string }) => void;
  isPending: boolean;
}) {
  const [name, setName] = useState("");
  const [key, setKey] = useState("");
  const [description, setDescription] = useState("");
  const [layerType, setLayerType] = useState("car");
  const [color, setColor] = useState("#5fbb6f");

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card border border-border rounded-lg shadow-xl w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="text-sm font-semibold">Novo provedor de integração</div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
        </div>
        <div className="p-4 space-y-3">
          <div>
            <label className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">Nome</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 w-full h-9 rounded-md border border-input bg-input/40 px-3 text-sm" />
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">Chave (única, sem espaços)</label>
            <input value={key} onChange={(e) => setKey(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, "-"))} className="mt-1 w-full h-9 rounded-md border border-input bg-input/40 px-3 text-sm font-mono" />
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">Descrição</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="mt-1 w-full rounded-md border border-input bg-input/40 px-3 py-2 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">Tipo de camada</label>
              <select value={layerType} onChange={(e) => setLayerType(e.target.value)} className="mt-1 w-full h-9 rounded-md border border-input bg-input/40 px-3 text-sm">
                <option value="car">CAR</option>
                <option value="sigef">SIGEF</option>
                <option value="embargo">Embargo</option>
                <option value="desmatamento">Desmatamento</option>
                <option value="uso_solo">Uso do Solo</option>
                <option value="outros">Outros</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">Cor</label>
              <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="mt-1 w-full h-9 rounded-md border border-input bg-input/40 px-1" />
            </div>
          </div>
        </div>
        <div className="p-4 border-t border-border flex items-center justify-end gap-2">
          <button onClick={onClose} className="h-9 px-3 rounded-md border border-border text-xs hover:bg-accent/10">Cancelar</button>
          <button
            disabled={!name || !key || isPending}
            onClick={() => onCreate({
              key, name, description, kind: "shapefile_upload",
              layer_type: layerType, default_color: color, status: "ativo",
              data_source_key: key,
            })}
            className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 disabled:opacity-50 inline-flex items-center gap-2"
          >
            {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
            Criar
          </button>
        </div>
      </div>
    </div>
  );
}
