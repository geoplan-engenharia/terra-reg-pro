import type { Imovel, Confiabilidade } from "@/lib/mock-data";
import { X, MapPin, Ruler, FileText, Leaf, AlertTriangle, ShieldCheck, Layers, Hash, Activity, Eye } from "lucide-react";
import { cn } from "@/lib/utils";

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

function StatCard({ icon: Icon, label, value, sub }: { icon: React.ElementType; label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border border-border bg-card/60 p-3">
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3 w-3" />
        {label}
      </div>
      <div className="mt-1.5 text-base font-semibold tracking-tight">{value}</div>
      {sub && <div className="text-[11px] text-muted-foreground mt-0.5">{sub}</div>}
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

export function ImovelPanel({ imovel, onClose }: { imovel: Imovel; onClose: () => void }) {
  const conf = confiabilidadeMap[imovel.matricula.confiabilidade];

  return (
    <aside className="absolute top-0 right-0 h-full w-full sm:w-[420px] bg-card border-l border-border shadow-panel z-[1000] flex flex-col animate-in slide-in-from-right duration-300">
      {/* Header */}
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
        <h2 className="mt-1 text-lg font-semibold tracking-tight">{imovel.nome}</h2>
        <p className="text-xs text-muted-foreground">
          {imovel.proprietario} · {imovel.municipio}/{imovel.uf}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/40 px-2.5 py-1 text-[11px]">
            <Ruler className="h-3 w-3" /> {imovel.area_ha.toLocaleString("pt-BR")} ha
          </span>
          <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] capitalize",
            imovel.car_status === "ativo" ? "border-success/40 bg-success/10 text-success"
              : imovel.car_status === "pendente" ? "border-warning/40 bg-warning/10 text-warning"
              : "border-destructive/40 bg-destructive/10 text-destructive"
          )}>
            CAR {imovel.car_status}
          </span>
          {imovel.sigef_certificado ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-info/40 bg-info/10 text-info px-2.5 py-1 text-[11px]">
              <ShieldCheck className="h-3 w-3" /> SIGEF certificado
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-muted bg-muted/30 px-2.5 py-1 text-[11px] text-muted-foreground">
              SIGEF não certificado
            </span>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {/* Diagnóstico */}
        <Section title="Diagnóstico automático" icon={Activity}>
          <div className="space-y-2">
            {imovel.diagnosticos.map((d, i) => (
              <div key={i} className={cn("rounded-md border px-3 py-2.5", severidadeMap[d.severidade])}>
                <div className="flex items-start gap-2">
                  {d.tipo === "regular" ? <ShieldCheck className="h-4 w-4 mt-0.5 shrink-0" /> : <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />}
                  <div className="min-w-0">
                    <div className="text-xs font-semibold">{d.titulo}</div>
                    <div className="text-[11px] opacity-90 mt-0.5 leading-relaxed">{d.descricao}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* Dados fundiários */}
        <Section title="Dados fundiários" icon={FileText}>
          <div className="grid grid-cols-2 gap-2">
            <StatCard icon={Ruler} label="Área total" value={`${imovel.area_ha.toLocaleString("pt-BR")} ha`} />
            <StatCard icon={ShieldCheck} label="SIGEF" value={imovel.sigef_certificado ? "Certificado" : "Não cert."} />
          </div>
          <div className="mt-3 space-y-2 text-xs">
            <div className="flex items-start justify-between gap-3 rounded-md border border-border bg-background/30 p-2.5">
              <span className="text-muted-foreground shrink-0">Código CAR</span>
              <span className="font-mono text-[11px] text-right break-all">{imovel.car_codigo}</span>
            </div>
          </div>
        </Section>

        {/* Matrícula com confiabilidade */}
        <Section title="Matrícula" icon={Hash}>
          <div className="rounded-md border border-border bg-background/30 p-3 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Número</span>
              <span className="font-mono text-sm">{imovel.matricula.numero ?? "—"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Fonte</span>
              <span className="text-xs font-medium">
                {imovel.matricula.fonte === "nao_identificado" ? "Não identificado" : imovel.matricula.fonte}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Confiabilidade</span>
              <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px]", conf.classes)}>
                <span className={cn("h-1.5 w-1.5 rounded-full", conf.dot)} /> {conf.label}
              </span>
            </div>
          </div>
        </Section>

        {/* Dados ambientais */}
        <Section title="Dados ambientais" icon={Leaf}>
          <div className="grid grid-cols-2 gap-2">
            <StatCard icon={Leaf} label="APP estimada" value={`${imovel.app_ha.toLocaleString("pt-BR")} ha`} />
            <StatCard icon={Leaf} label="Reserva Legal" value={`${imovel.reserva_legal_ha.toLocaleString("pt-BR")} ha`} />
            <StatCard icon={AlertTriangle} label="Embargo" value={imovel.area_embargada ? `${imovel.area_embargada_ha} ha` : "Nenhum"} />
            <StatCard icon={Activity} label="Desmatamento" value={imovel.desmatamento_recente ? `${imovel.desmatamento_alertas} alertas` : "Sem alertas"} />
          </div>
        </Section>

        {/* Uso do solo */}
        <Section title="Uso e cobertura do solo" icon={Layers}>
          <div className="space-y-2">
            {imovel.uso_solo.map((u) => (
              <div key={u.categoria}>
                <div className="flex justify-between text-[11px] mb-1">
                  <span>{u.categoria}</span>
                  <span className="text-muted-foreground">{u.percentual}%</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                  <div className="h-full bg-gradient-primary" style={{ width: `${u.percentual}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Section>
      </div>

      <div className="border-t border-border p-3 flex gap-2">
        <button className="flex-1 inline-flex items-center justify-center gap-2 rounded-md bg-primary text-primary-foreground text-sm font-medium h-9 hover:opacity-90 transition">
          <Eye className="h-4 w-4" /> {imovel.monitorado ? "Monitorando" : "Monitorar"}
        </button>
        <button className="flex-1 inline-flex items-center justify-center gap-2 rounded-md border border-border bg-card text-sm h-9 hover:bg-accent/10 transition">
          <FileText className="h-4 w-4" /> Exportar PDF
        </button>
      </div>
    </aside>
  );
}
