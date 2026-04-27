import { useMemo, useState } from "react";
import { X, FileDown, Loader2, ShieldCheck, AlertTriangle, MapPin, FileText, Hash, FileJson, Leaf } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { useProperty, usePropertyDiagnostics, usePropertyGeometry, usePropertyEnvironmentalAnalyses } from "@/lib/queries";
import { useLogConsultation } from "@/lib/history";
import { buildReportSummary, downloadBlob, exportReportPDF, reportFilename } from "@/lib/report";
import { toast } from "sonner";

const carLabel: Record<string, string> = {
  ativo: "Ativo",
  pendente: "Pendente",
  cancelado: "Cancelado",
  suspenso: "Suspenso",
  nao_cadastrado: "Não cadastrado",
};
const sigefLabel: Record<string, string> = {
  certificado: "Certificado",
  em_analise: "Em análise",
  nao_certificado: "Não certificado",
  desconhecido: "Desconhecido",
};
const confLabel: Record<string, string> = { alta: "Alta", media: "Média", baixa: "Baixa" };

const sevColor: Record<string, string> = {
  alta: "border-destructive/40 bg-destructive/10 text-destructive",
  media: "border-warning/40 bg-warning/10 text-warning",
  baixa: "border-success/40 bg-success/10 text-success",
};

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 py-1.5 border-b border-border/50 last:border-b-0">
      <span className="text-[11px] uppercase tracking-wider text-muted-foreground shrink-0">{label}</span>
      <span className="text-sm text-right font-medium">{value || "—"}</span>
    </div>
  );
}

function Block({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <section className="rounded-md border border-border bg-background/40 p-4">
      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-border">
        <Icon className="h-4 w-4 text-primary" />
        <h3 className="text-xs font-semibold uppercase tracking-wider">{title}</h3>
      </div>
      {children}
    </section>
  );
}

export function ReportModal({ propertyId, onClose }: { propertyId: string; onClose: () => void }) {
  const { profile } = useAuth();
  const { data: property, isLoading: lp } = useProperty(propertyId);
  const { data: diagnostics = [], isLoading: ld } = usePropertyDiagnostics(propertyId);
  const { data: geometry } = usePropertyGeometry(propertyId);
  const { data: envHistory = [] } = usePropertyEnvironmentalAnalyses(propertyId);
  const environmental = envHistory[0] ?? null;
  const logConsult = useLogConsultation();
  const [exporting, setExporting] = useState(false);
  const emittedAt = useMemo(() => new Date(), []);

  const handleExport = async () => {
    if (!property || !profile) return;
    setExporting(true);
    try {
      const ctx = {
        property,
        diagnostics,
        geometry: geometry ?? null,
        environmental,
        organizationName: profile.organization_name,
        emittedBy: profile.full_name ?? profile.email ?? "Usuário",
        emittedAt,
      };
      const blob = exportReportPDF(ctx);
      const summary = buildReportSummary(ctx);
      await logConsult.mutateAsync({
        organization_id: profile.organization_id,
        user_id: profile.id,
        property_id: property.id,
        data_source_key: "relatorio",
        query_params: {
          diagnostics_count: diagnostics.length,
          has_geometry: !!geometry,
        },
        result_summary: summary,
      });
      downloadBlob(blob, reportFilename(property.name, emittedAt));
      toast.success("Relatório exportado");
      onClose();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setExporting(false);
    }
  };

  const isLoading = lp || ld;

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-lg shadow-panel w-full max-w-3xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-gradient-surface">
          <div>
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-primary font-medium">
              <FileText className="h-3 w-3" /> Pré-visualização do relatório
            </div>
            <h2 className="text-base font-semibold mt-0.5">{property?.name ?? "Carregando…"}</h2>
          </div>
          <button onClick={onClose} className="h-8 w-8 grid place-items-center rounded-md hover:bg-accent/10 text-muted-foreground hover:text-foreground" aria-label="Fechar">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-5 space-y-4">
          {isLoading || !property ? (
            <div className="h-48 grid place-items-center text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : (
            <>
              <div className="rounded-md border border-border bg-background/30 p-4">
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Cabeçalho</div>
                <div className="mt-1 flex items-baseline justify-between gap-4 flex-wrap">
                  <div>
                    <div className="font-semibold text-lg">{profile?.organization_name}</div>
                    <div className="text-xs text-muted-foreground">
                      Emitido por {profile?.full_name ?? profile?.email} · {emittedAt.toLocaleString("pt-BR")}
                    </div>
                  </div>
                </div>
              </div>

              <Block title="Identificação" icon={MapPin}>
                <div className="space-y-0">
                  <Field label="Imóvel" value={property.name} />
                  <Field label="Proprietário" value={property.owner_name ?? "—"} />
                  <Field label="Município/UF" value={`${property.municipio ?? "—"} / ${property.uf ?? "—"}`} />
                  <Field label="Área" value={property.area_ha != null ? `${Number(property.area_ha).toLocaleString("pt-BR")} ha` : "—"} />
                </div>
              </Block>

              <div className="grid md:grid-cols-2 gap-4">
                <Block title="Cadastro fundiário" icon={FileText}>
                  <div className="space-y-0">
                    <Field label="Código CAR" value={<span className="font-mono text-xs break-all">{property.car_code ?? "—"}</span>} />
                    <Field label="Status CAR" value={carLabel[property.car_status] ?? property.car_status} />
                    <Field label="Status SIGEF" value={sigefLabel[property.sigef_status] ?? property.sigef_status} />
                  </div>
                </Block>

                <Block title="Matrícula" icon={Hash}>
                  <div className="space-y-0">
                    <Field label="Número" value={<span className="font-mono text-xs">{property.matricula_number ?? "—"}</span>} />
                    <Field label="Fonte" value={<span className="capitalize">{property.matricula_source.replace("_", " ")}</span>} />
                    <Field label="Confiabilidade" value={confLabel[property.matricula_confiabilidade] ?? property.matricula_confiabilidade} />
                  </div>
                </Block>
              </div>

              <Block title="Geometria vinculada" icon={FileJson}>
                {geometry ? (
                  <div className="space-y-0">
                    <Field label="Arquivo" value={<span className="font-mono text-xs">{(geometry.geojson as { _meta?: { filename?: string } })._meta?.filename ?? "geometria.geojson"}</span>} />
                    <Field label="Origem" value={geometry.source ?? "—"} />
                    <Field label="Enviada em" value={new Date(geometry.created_at).toLocaleString("pt-BR")} />
                    {property.centroid_lat != null && property.centroid_lng != null && (
                      <Field label="Centróide" value={`${Number(property.centroid_lat).toFixed(5)}, ${Number(property.centroid_lng).toFixed(5)}`} />
                    )}
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground">Nenhuma geometria vinculada ao imóvel.</div>
                )}
              </Block>

              <Block title={`Diagnósticos automáticos (${diagnostics.length})`} icon={AlertTriangle}>
                {diagnostics.length === 0 ? (
                  <div className="text-xs text-muted-foreground">Nenhum diagnóstico gerado.</div>
                ) : (
                  <div className="space-y-2">
                    {diagnostics.map((d) => (
                      <div key={d.id} className={cn("rounded-md border px-3 py-2", sevColor[d.severidade])}>
                        <div className="flex items-start gap-2">
                          {d.kind === "regular" ? <ShieldCheck className="h-4 w-4 mt-0.5 shrink-0" /> : <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />}
                          <div className="min-w-0">
                            <div className="text-xs font-semibold">{d.title}</div>
                            {d.description && <div className="text-[11px] opacity-90 mt-0.5">{d.description}</div>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Block>

              {property.notes && (
                <Block title="Observações" icon={FileText}>
                  <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">{property.notes}</p>
                </Block>
              )}
            </>
          )}
        </div>

        <div className="border-t border-border p-3 flex items-center justify-end gap-2">
          <button onClick={onClose} className="h-9 px-3 rounded-md border border-border text-sm hover:bg-accent/10">
            Cancelar
          </button>
          <button
            onClick={handleExport}
            disabled={!property || exporting}
            className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium inline-flex items-center gap-2 hover:opacity-90 disabled:opacity-50"
          >
            {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
            Exportar PDF
          </button>
        </div>
      </div>
    </div>
  );
}
