import { useMemo } from "react";
import type { RuralProperty, Diagnostic, Confiabilidade } from "@/lib/types";
import { useProperty, usePropertyDiagnostics, useToggleMonitor, usePropertyGeometry } from "@/lib/queries";
import { X, MapPin, Ruler, FileText, AlertTriangle, ShieldCheck, Hash, Activity, Eye, Loader2, Pencil, FileJson } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

const confiabilidadeMap: Record<Confiabilidade, { label: string; classes: string; dot: string }> = {
  alta: { label: "Alta", classes: "bg-success/15 text-success border-success/30", dot: "bg-success" },
  media: { label: "Média", classes: "bg-warning/15 text-warning border-warning/30", dot: "bg-warning" },
  baixa: { label: "Baixa", classes: "bg-destructive/15 text-destructive border-destructive/30", dot: "bg-destructive" },
};

const severidadeMap = {
  alta: "border-destructive/40 bg-destructive/10 text-destructive",
  media: "border-warning/40 bg-warning/10 text-warning",
  baixa: "border-success/40 bg-success/10 text-success",
} as const;

function StatCard({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-card/60 p-3">
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3 w-3" />
        {label}
      </div>
      <div className="mt-1.5 text-base font-semibold tracking-tight">{value}</div>
    </div>
  );
}

function Section({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <section className="px-5 py-4 border-b border-border last:border-b-0">
      <div className="flex items-center gap-2 mb-3">
        <Icon className="h-4 w-4 text-primary" />
        <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground">{title}</h3>
      </div>
      {children}
    </section>
  );
}

const carStatusLabel: Record<string, { label: string; cls: string }> = {
  ativo: { label: "Ativo", cls: "border-success/40 bg-success/10 text-success" },
  pendente: { label: "Pendente", cls: "border-warning/40 bg-warning/10 text-warning" },
  cancelado: { label: "Cancelado", cls: "border-destructive/40 bg-destructive/10 text-destructive" },
  suspenso: { label: "Suspenso", cls: "border-destructive/40 bg-destructive/10 text-destructive" },
  nao_cadastrado: { label: "Não cadastrado", cls: "border-muted bg-muted/30 text-muted-foreground" },
};

export function ImovelPanel({ propertyId, onClose, onEdit }: { propertyId: string; onClose: () => void; onEdit?: () => void }) {
  const { canEditProperties } = useAuth();
  const { data: imovel, isLoading } = useProperty(propertyId);
  const { data: diagnostics = [] } = usePropertyDiagnostics(propertyId);
  const { data: geometry } = usePropertyGeometry(propertyId);
  const toggleMonitor = useToggleMonitor();

  const sortedDiag = useMemo(() => {
    const order: Record<string, number> = { alta: 0, media: 1, baixa: 2 };
    return [...diagnostics].sort((a, b) => order[a.severidade] - order[b.severidade]);
  }, [diagnostics]);

  if (isLoading || !imovel) {
    return (
      <aside className="absolute top-0 right-0 h-full w-full sm:w-[420px] bg-card border-l border-border shadow-panel z-[1000] flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </aside>
    );
  }

  const conf = confiabilidadeMap[imovel.matricula_confiabilidade];
  const carInfo = carStatusLabel[imovel.car_status] ?? carStatusLabel.nao_cadastrado;

  const handleMonitor = async () => {
    try {
      await toggleMonitor.mutateAsync({ id: imovel.id, monitorado: !imovel.monitorado });
      toast.success(imovel.monitorado ? "Monitoramento desativado" : "Imóvel agora está sendo monitorado");
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  return (
    <aside className="absolute top-0 right-0 h-full w-full sm:w-[420px] bg-card border-l border-border shadow-panel z-[1000] flex flex-col animate-in slide-in-from-right duration-300">
      <div className="relative bg-gradient-surface border-b border-border px-5 py-4">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 h-8 w-8 grid place-items-center rounded-md hover:bg-accent/10 text-muted-foreground hover:text-foreground"
          aria-label="Fechar painel"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-primary font-medium">
          <MapPin className="h-3 w-3" /> Relatório do imóvel
        </div>
        <h2 className="mt-1 text-lg font-semibold tracking-tight">{imovel.name}</h2>
        <p className="text-xs text-muted-foreground">
          {imovel.owner_name ?? "Sem proprietário cadastrado"}{imovel.municipio || imovel.uf ? ` · ${imovel.municipio ?? "—"}/${imovel.uf ?? "—"}` : ""}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {imovel.area_ha != null && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/40 px-2.5 py-1 text-[11px]">
              <Ruler className="h-3 w-3" /> {Number(imovel.area_ha).toLocaleString("pt-BR")} ha
            </span>
          )}
          <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px]", carInfo.cls)}>
            CAR {carInfo.label}
          </span>
          {imovel.sigef_status === "certificado" ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-info/40 bg-info/10 text-info px-2.5 py-1 text-[11px]">
              <ShieldCheck className="h-3 w-3" /> SIGEF certificado
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-muted bg-muted/30 px-2.5 py-1 text-[11px] text-muted-foreground">
              SIGEF {imovel.sigef_status}
            </span>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <Section title="Diagnóstico automático" icon={Activity}>
          {sortedDiag.length === 0 ? (
            <div className="text-xs text-muted-foreground">
              Nenhum diagnóstico gerado ainda. Atualize os dados do imóvel para gerar.
            </div>
          ) : (
            <div className="space-y-2">
              {sortedDiag.map((d: Diagnostic) => (
                <div key={d.id} className={cn("rounded-md border px-3 py-2.5", severidadeMap[d.severidade])}>
                  <div className="flex items-start gap-2">
                    {d.kind === "regular" ? <ShieldCheck className="h-4 w-4 mt-0.5 shrink-0" /> : <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />}
                    <div className="min-w-0">
                      <div className="text-xs font-semibold">{d.title}</div>
                      {d.description && <div className="text-[11px] opacity-90 mt-0.5 leading-relaxed">{d.description}</div>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>

        <Section title="Dados fundiários" icon={FileText}>
          <div className="grid grid-cols-2 gap-2">
            <StatCard icon={Ruler} label="Área total" value={imovel.area_ha != null ? `${Number(imovel.area_ha).toLocaleString("pt-BR")} ha` : "—"} />
            <StatCard icon={ShieldCheck} label="SIGEF" value={imovel.sigef_status === "certificado" ? "Certificado" : "Não cert."} />
          </div>
          <div className="mt-3 space-y-2 text-xs">
            <div className="flex items-start justify-between gap-3 rounded-md border border-border bg-background/30 p-2.5">
              <span className="text-muted-foreground shrink-0">Código CAR</span>
              <span className="font-mono text-[11px] text-right break-all">{imovel.car_code ?? "—"}</span>
            </div>
          </div>
        </Section>

        <Section title="Matrícula" icon={Hash}>
          <div className="rounded-md border border-border bg-background/30 p-3 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Número</span>
              <span className="font-mono text-sm">{imovel.matricula_number ?? "—"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Fonte</span>
              <span className="text-xs font-medium capitalize">{imovel.matricula_source.replace("_", " ")}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Confiabilidade</span>
              <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px]", conf.classes)}>
                <span className={cn("h-1.5 w-1.5 rounded-full", conf.dot)} /> {conf.label}
              </span>
            </div>
          </div>
        </Section>

        <Section title="Geometria vinculada" icon={FileJson}>
          {geometry ? (
            <div className="rounded-md border border-border bg-background/30 p-3 text-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Arquivo</span>
                <span className="font-mono text-[11px] truncate max-w-[60%] text-right">
                  {geometry.geojson._meta?.filename ?? "geometria.geojson"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Enviada em</span>
                <span>{new Date(geometry.created_at).toLocaleString("pt-BR")}</span>
              </div>
              {canEditProperties && onEdit && (
                <button onClick={onEdit} className="mt-2 w-full inline-flex items-center justify-center gap-1.5 text-[11px] h-8 rounded-md border border-border hover:bg-accent/10">
                  Substituir geometria
                </button>
              )}
            </div>
          ) : (
            <div className="text-xs text-muted-foreground">
              Nenhuma geometria vinculada.
              {canEditProperties && onEdit && (
                <button onClick={onEdit} className="ml-1 text-primary hover:underline">Importar GeoJSON</button>
              )}
            </div>
          )}
        </Section>

        {(imovel.notes || imovel.last_consultation_at) && (
          <Section title="Observações" icon={FileText}>
            {imovel.notes && <p className="text-xs text-muted-foreground leading-relaxed">{imovel.notes}</p>}
            {imovel.last_consultation_at && (
              <p className="text-[11px] text-muted-foreground mt-2">
                Última consulta: {new Date(imovel.last_consultation_at).toLocaleString("pt-BR")}
              </p>
            )}
          </Section>
        )}
      </div>

      <div className="border-t border-border p-3 flex gap-2">
        {canEditProperties && onEdit && (
          <button
            onClick={onEdit}
            className="inline-flex items-center justify-center gap-2 rounded-md border border-border bg-card text-sm font-medium h-9 px-3 hover:bg-accent/10 transition"
          >
            <Pencil className="h-4 w-4" /> Editar
          </button>
        )}
        <button
          onClick={handleMonitor}
          disabled={!canEditProperties || toggleMonitor.isPending}
          className={cn(
            "flex-1 inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium h-9 transition disabled:opacity-50",
            imovel.monitorado
              ? "bg-success/20 text-success border border-success/40"
              : "bg-primary text-primary-foreground hover:opacity-90"
          )}
        >
          <Eye className="h-4 w-4" /> {imovel.monitorado ? "Monitorando" : "Monitorar"}
        </button>
      </div>
    </aside>
  );
}

export type { RuralProperty as Imovel };
