import { createFileRoute, Link } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { imoveis, alertas } from "@/lib/mock-data";
import { ArrowUpRight, AlertTriangle, ShieldCheck, Map as MapIcon, Activity, TrendingUp, Eye, Bell } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — GeoTerra" },
      { name: "description", content: "Inteligência territorial e diagnóstico técnico de imóveis rurais." },
    ],
  }),
  component: Dashboard,
});

const severidadeBadge = {
  alta: "bg-destructive/15 text-destructive border-destructive/30",
  media: "bg-warning/15 text-warning border-warning/30",
  baixa: "bg-success/15 text-success border-success/30",
} as const;

function KpiCard({ icon: Icon, label, value, delta, tone }: { icon: React.ElementType; label: string; value: string; delta?: string; tone?: "primary" | "warn" | "danger" | "info" }) {
  const tones = {
    primary: "from-primary/20 to-primary/0 text-primary",
    warn: "from-warning/20 to-warning/0 text-warning",
    danger: "from-destructive/20 to-destructive/0 text-destructive",
    info: "from-info/20 to-info/0 text-info",
  } as const;
  const t = tones[tone ?? "primary"];
  return (
    <div className="relative rounded-xl border border-border bg-card p-5 overflow-hidden">
      <div className={cn("absolute -top-12 -right-12 h-32 w-32 rounded-full bg-gradient-to-br blur-2xl", t)} />
      <div className="relative">
        <div className="flex items-center justify-between">
          <span className="text-[11px] uppercase tracking-widest text-muted-foreground">{label}</span>
          <Icon className={cn("h-4 w-4", t.split(" ").pop())} />
        </div>
        <div className="mt-3 text-2xl font-semibold tracking-tight">{value}</div>
        {delta && <div className="mt-1 text-xs text-muted-foreground inline-flex items-center gap-1"><TrendingUp className="h-3 w-3" />{delta}</div>}
      </div>
    </div>
  );
}

function Dashboard() {
  const totalArea = imoveis.reduce((s, i) => s + i.area_ha, 0);
  const comRisco = imoveis.filter((i) => i.diagnosticos.some((d) => d.severidade === "alta")).length;
  const regulares = imoveis.filter((i) => i.diagnosticos.every((d) => d.tipo === "regular")).length;
  const monitorados = imoveis.filter((i) => i.monitorado).length;

  return (
    <AppLayout title="Visão Geral" subtitle="Inteligência territorial e diagnósticos automatizados">
      <div className="p-6 space-y-6">
        {/* Hero */}
        <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-surface p-6">
          <div className="absolute inset-y-0 right-0 w-1/2 bg-gradient-primary opacity-10 blur-3xl" />
          <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="text-[11px] uppercase tracking-widest text-primary font-medium">Plataforma ativa</div>
              <h2 className="mt-1 text-2xl font-semibold tracking-tight">Bem-vindo de volta, Rafael.</h2>
              <p className="text-sm text-muted-foreground mt-1 max-w-xl">
                Monitore CAR, SIGEF, alertas de desmatamento e licenças ambientais em um único lugar.
              </p>
            </div>
            <div className="flex gap-2">
              <Link to="/mapa" className="inline-flex items-center gap-2 rounded-md bg-primary text-primary-foreground px-4 h-10 text-sm font-medium hover:opacity-90 transition shadow-glow">
                <MapIcon className="h-4 w-4" /> Abrir mapa
              </Link>
              <Link to="/clientes" className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-4 h-10 text-sm hover:bg-accent/10 transition">
                Cadastrar cliente
              </Link>
            </div>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard icon={MapIcon} label="Imóveis cadastrados" value={String(imoveis.length)} delta={`${totalArea.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} ha sob gestão`} tone="primary" />
          <KpiCard icon={ShieldCheck} label="Regulares" value={String(regulares)} delta="Sem pendências" tone="info" />
          <KpiCard icon={AlertTriangle} label="Com risco" value={String(comRisco)} delta="Diagnóstico de alta severidade" tone="danger" />
          <KpiCard icon={Eye} label="Monitorados" value={String(monitorados)} delta="Verificação contínua" tone="warn" />
        </div>

        {/* Lista de imóveis + alertas */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className="xl:col-span-2 rounded-xl border border-border bg-card overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div>
                <h3 className="text-sm font-semibold">Imóveis consultados recentemente</h3>
                <p className="text-xs text-muted-foreground">Últimos diagnósticos automáticos</p>
              </div>
              <Link to="/mapa" className="text-xs text-primary hover:underline inline-flex items-center gap-1">
                Ver todos <ArrowUpRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-background/40">
                  <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                    <th className="px-5 py-2.5 font-medium">Imóvel</th>
                    <th className="px-3 py-2.5 font-medium">Localização</th>
                    <th className="px-3 py-2.5 font-medium">Área</th>
                    <th className="px-3 py-2.5 font-medium">Status</th>
                    <th className="px-5 py-2.5 font-medium text-right">Diagnóstico</th>
                  </tr>
                </thead>
                <tbody>
                  {imoveis.map((i) => {
                    const top = i.diagnosticos[0];
                    return (
                      <tr key={i.id} className="border-t border-border hover:bg-accent/5 transition">
                        <td className="px-5 py-3">
                          <div className="font-medium">{i.nome}</div>
                          <div className="text-[11px] text-muted-foreground">{i.proprietario}</div>
                        </td>
                        <td className="px-3 py-3 text-xs">{i.municipio}/{i.uf}</td>
                        <td className="px-3 py-3 text-xs font-mono">{i.area_ha.toLocaleString("pt-BR")} ha</td>
                        <td className="px-3 py-3">
                          <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] capitalize",
                            i.car_status === "ativo" ? "border-success/40 bg-success/10 text-success"
                              : i.car_status === "pendente" ? "border-warning/40 bg-warning/10 text-warning"
                              : "border-destructive/40 bg-destructive/10 text-destructive"
                          )}>
                            CAR {i.car_status}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right">
                          <span className={cn("inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px]", severidadeBadge[top.severidade])}>
                            {top.severidade === "baixa" ? <ShieldCheck className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
                            {top.titulo}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold">Alertas recentes</h3>
              </div>
              <Link to="/alertas" className="text-xs text-primary hover:underline">Ver todos</Link>
            </div>
            <ul className="divide-y divide-border">
              {alertas.map((a) => (
                <li key={a.id} className="px-5 py-3 hover:bg-accent/5 transition">
                  <div className="flex items-start gap-3">
                    <div className={cn("mt-1 h-2 w-2 rounded-full shrink-0",
                      a.severidade === "alta" ? "bg-destructive" : a.severidade === "media" ? "bg-warning" : "bg-success"
                    )} />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-medium truncate">{a.titulo}</div>
                      <div className="text-[11px] text-muted-foreground">{a.imovel_nome}</div>
                      <div className="text-[11px] text-muted-foreground/80 mt-0.5">{a.descricao}</div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Quick links */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { to: "/monitoramento", icon: Eye, title: "Monitoramento", desc: "Acompanhe imóveis em tempo real" },
            { to: "/licencas", icon: ShieldCheck, title: "Licenças ambientais", desc: "Controle de validade e alertas" },
            { to: "/clientes", icon: Activity, title: "Clientes", desc: "Cadastros e histórico" },
          ].map((q) => {
            const Icon = q.icon;
            return (
              <Link key={q.to} to={q.to} className="group rounded-xl border border-border bg-card p-5 hover:border-primary/50 hover:shadow-glow transition">
                <div className="flex items-start justify-between">
                  <div className="h-10 w-10 rounded-md bg-primary/10 text-primary grid place-items-center group-hover:bg-primary group-hover:text-primary-foreground transition">
                    <Icon className="h-5 w-5" />
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition" />
                </div>
                <div className="mt-4 text-sm font-semibold">{q.title}</div>
                <div className="text-xs text-muted-foreground mt-1">{q.desc}</div>
              </Link>
            );
          })}
        </div>
      </div>
    </AppLayout>
  );
}
