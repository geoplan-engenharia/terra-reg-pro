import { createFileRoute, Link } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { useProperties, useMonitoringAlerts, useUnifiedAlerts, useLicenses } from "@/lib/queries";
import { useAuth } from "@/lib/auth";
import { seedDemoData } from "@/lib/seed-demo";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowUpRight, AlertTriangle, ShieldCheck, Map as MapIcon, Activity, TrendingUp, Eye, Bell, Sparkles, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "Dashboard — GeoTerra" }] }),
  component: Dashboard,
});

function KpiCard({ icon: Icon, label, value, delta, tone = "primary" }: { icon: React.ElementType; label: string; value: string; delta?: string; tone?: "primary" | "warn" | "danger" | "info" }) {
  const tones = {
    primary: "from-primary/20 to-primary/0 text-primary",
    warn: "from-warning/20 to-warning/0 text-warning",
    danger: "from-destructive/20 to-destructive/0 text-destructive",
    info: "from-info/20 to-info/0 text-info",
  } as const;
  const t = tones[tone];
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
  const { profile, isAdmin } = useAuth();
  const props = useProperties();
  const alerts = useMonitoringAlerts();
  const unified = useUnifiedAlerts();
  const licenses = useLicenses();
  const qc = useQueryClient();
  const [seeding, setSeeding] = useState(false);

  const items = props.data ?? [];
  const totalArea = items.reduce((s, i) => s + (i.area_ha ?? 0), 0);
  const comRisco = items.filter((i) => i.car_status === "pendente" || i.sigef_status === "nao_certificado").length;
  const monitorados = items.filter((i) => i.monitorado).length;

  const unifiedList = unified.data ?? [];
  const novos = unifiedList.filter((a) => a.status === "novo").length;
  const criticos = unifiedList.filter((a) => a.severidade === "alta" && a.status !== "resolvido").length;
  const licencas30 = (licenses.data ?? []).filter((l) => {
    if (!l.expiration_date) return false;
    const dias = Math.ceil((new Date(l.expiration_date).getTime() - Date.now()) / 86400000);
    return dias >= 0 && dias <= 30;
  }).length;
  const imoveisAltaSev = new Set(
    unifiedList
      .filter((a) => a.severidade === "alta" && a.source_table === "property_diagnostics" && a.property_id)
      .map((a) => a.property_id!)
  ).size;

  const loadDemo = async () => {
    if (!profile) return;
    setSeeding(true);
    try {
      const res = await seedDemoData(profile.organization_id);
      if (res.inserted) {
        toast.success("Dados de demonstração carregados!");
        qc.invalidateQueries();
      } else {
        toast.info(res.reason ?? "Nada a fazer.");
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally { setSeeding(false); }
  };

  const empty = !props.isLoading && items.length === 0;

  return (
    <AppLayout title="Visão Geral" subtitle="Inteligência territorial e diagnósticos automatizados">
      <div className="p-6 space-y-6">
        <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-surface p-6">
          <div className="absolute inset-y-0 right-0 w-1/2 bg-gradient-primary opacity-10 blur-3xl" />
          <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="text-[11px] uppercase tracking-widest text-primary font-medium">{profile?.organization_name}</div>
              <h2 className="mt-1 text-2xl font-semibold tracking-tight">Bem-vindo, {profile?.full_name?.split(" ")[0] ?? "usuário"}.</h2>
              <p className="text-sm text-muted-foreground mt-1 max-w-xl">Monitore CAR, SIGEF, alertas de desmatamento e licenças ambientais em um único lugar.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link to="/mapa" className="inline-flex items-center gap-2 rounded-md bg-primary text-primary-foreground px-4 h-10 text-sm font-medium hover:opacity-90 transition shadow-glow">
                <MapIcon className="h-4 w-4" /> Abrir mapa
              </Link>
              {empty && isAdmin && (
                <button onClick={loadDemo} disabled={seeding}
                  className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-4 h-10 text-sm hover:bg-accent/10 transition">
                  {seeding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4 text-primary" />}
                  Carregar dados de demonstração
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard icon={MapIcon} label="Imóveis cadastrados" value={String(items.length)} delta={`${totalArea.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} ha sob gestão`} />
          <KpiCard icon={ShieldCheck} label="Certificados SIGEF" value={String(items.filter((i) => i.sigef_status === "certificado").length)} delta="Sem pendência fundiária" tone="info" />
          <KpiCard icon={AlertTriangle} label="Com pendência" value={String(comRisco)} delta="CAR pendente ou SIGEF ausente" tone="danger" />
          <KpiCard icon={Eye} label="Monitorados" value={String(monitorados)} delta="Verificação contínua" tone="warn" />
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard icon={Bell} label="Alertas novos" value={String(novos)} delta="Aguardando triagem" tone="info" />
          <KpiCard icon={AlertTriangle} label="Alertas críticos" value={String(criticos)} delta="Severidade alta em aberto" tone="danger" />
          <KpiCard icon={ShieldCheck} label="Licenças vencendo" value={String(licencas30)} delta="Próximos 30 dias" tone="warn" />
          <KpiCard icon={Activity} label="Imóveis em risco alto" value={String(imoveisAltaSev)} delta="Diagnóstico crítico" tone="danger" />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className="xl:col-span-2 rounded-xl border border-border bg-card overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div>
                <h3 className="text-sm font-semibold">Imóveis recentes</h3>
                <p className="text-xs text-muted-foreground">Últimos cadastros e consultas</p>
              </div>
              <Link to="/mapa" className="text-xs text-primary hover:underline inline-flex items-center gap-1">Ver todos <ArrowUpRight className="h-3 w-3" /></Link>
            </div>
            <div className="overflow-x-auto">
              {empty ? (
                <div className="p-10 text-center text-sm text-muted-foreground">
                  Nenhum imóvel cadastrado ainda.
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-background/40">
                    <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                      <th className="px-5 py-2.5 font-medium">Imóvel</th>
                      <th className="px-3 py-2.5 font-medium">Localização</th>
                      <th className="px-3 py-2.5 font-medium">Área</th>
                      <th className="px-3 py-2.5 font-medium">CAR</th>
                      <th className="px-5 py-2.5 font-medium text-right">Confiabilidade</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.slice(0, 8).map((i) => (
                      <tr key={i.id} className="border-t border-border hover:bg-accent/5 transition">
                        <td className="px-5 py-3">
                          <div className="font-medium">{i.name}</div>
                          <div className="text-[11px] text-muted-foreground">{i.owner_name ?? "—"}</div>
                        </td>
                        <td className="px-3 py-3 text-xs">{i.municipio}/{i.uf}</td>
                        <td className="px-3 py-3 text-xs font-mono">{(i.area_ha ?? 0).toLocaleString("pt-BR")} ha</td>
                        <td className="px-3 py-3">
                          <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] capitalize",
                            i.car_status === "ativo" ? "border-success/40 bg-success/10 text-success"
                              : i.car_status === "pendente" ? "border-warning/40 bg-warning/10 text-warning"
                              : "border-destructive/40 bg-destructive/10 text-destructive"
                          )}>{i.car_status}</span>
                        </td>
                        <td className="px-5 py-3 text-right text-[11px] capitalize">
                          {i.matricula_confiabilidade}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
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
              {(alerts.data ?? []).slice(0, 6).map((a) => (
                <li key={a.id} className="px-5 py-3 hover:bg-accent/5 transition">
                  <div className="flex items-start gap-3">
                    <div className={cn("mt-1 h-2 w-2 rounded-full shrink-0",
                      a.severidade === "alta" ? "bg-destructive" : a.severidade === "media" ? "bg-warning" : "bg-success"
                    )} />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-medium truncate">{a.title}</div>
                      <div className="text-[11px] text-muted-foreground">{a.property_name ?? ""}</div>
                      <div className="text-[11px] text-muted-foreground/80 mt-0.5">{a.description}</div>
                    </div>
                  </div>
                </li>
              ))}
              {(alerts.data ?? []).length === 0 && (
                <li className="px-5 py-8 text-center text-xs text-muted-foreground">Sem alertas no momento.</li>
              )}
            </ul>
          </div>
        </div>

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
