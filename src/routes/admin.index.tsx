import { createFileRoute } from "@tanstack/react-router";
import { AdminLayout } from "@/components/AdminLayout";
import { usePlatformOverview } from "@/lib/admin-queries";
import { Building2, Users, Map, FileCheck2, DollarSign, Loader2, TrendingUp, AlertCircle } from "lucide-react";

export const Route = createFileRoute("/admin/")({
  head: () => ({ meta: [{ title: "Admin — Visão geral" }] }),
  component: AdminDashboardPage,
});

function StatCard({ icon: Icon, label, value, hint, accent }: { icon: typeof Building2; label: string; value: string | number; hint?: string; accent?: "default" | "success" | "warning" | "danger" }) {
  const accentClass =
    accent === "success" ? "border-primary/30 bg-primary/5"
    : accent === "warning" ? "border-amber-500/30 bg-amber-500/5"
    : accent === "danger" ? "border-destructive/30 bg-destructive/5"
    : "border-border bg-card";
  return (
    <div className={`rounded-xl border ${accentClass} p-5`}>
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-widest text-muted-foreground">{label}</span>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="mt-2 text-2xl font-semibold tabular-nums">{value}</div>
      {hint && <div className="mt-1 text-[11px] text-muted-foreground">{hint}</div>}
    </div>
  );
}

function fmtBRL(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

function AdminDashboardPage() {
  const { data, isLoading, error } = usePlatformOverview();

  return (
    <AdminLayout title="Visão Geral da Plataforma" subtitle="Indicadores executivos do SaaS">
      <div className="p-6 space-y-6 max-w-7xl">
        {isLoading && (
          <div className="flex items-center gap-2 text-muted-foreground text-sm"><Loader2 className="h-4 w-4 animate-spin" /> Carregando indicadores…</div>
        )}
        {error && (
          <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4" /> Falha ao carregar indicadores.
          </div>
        )}
        {data && (
          <>
            <section>
              <h2 className="text-sm font-medium text-muted-foreground mb-3">Plataforma</h2>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard icon={Building2} label="Organizações" value={data.total_organizations} />
                <StatCard icon={Users} label="Usuários" value={data.total_users} />
                <StatCard icon={Map} label="Imóveis" value={data.total_properties} />
                <StatCard icon={FileCheck2} label="Licenças" value={data.total_licenses} />
              </div>
            </section>

            <section>
              <h2 className="text-sm font-medium text-muted-foreground mb-3">Assinaturas</h2>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                <StatCard icon={TrendingUp} label="Planos ativos" value={data.active_subscriptions} accent="success" />
                <StatCard icon={Users} label="Em trial" value={data.trial_subscriptions} accent="warning" />
                <StatCard icon={AlertCircle} label="Cancelados / Inativos" value={data.canceled_subscriptions} accent="danger" />
              </div>
            </section>

            <section>
              <h2 className="text-sm font-medium text-muted-foreground mb-3">Receita estimada</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <StatCard icon={DollarSign} label="MRR (Receita Mensal)" value={fmtBRL(Number(data.mrr_estimated))} hint="Soma das assinaturas ativas (mensal + anual / 12)" accent="success" />
                <StatCard icon={DollarSign} label="ARR (Receita Anual)" value={fmtBRL(Number(data.arr_estimated))} hint="Projeção 12 meses das assinaturas ativas" accent="success" />
              </div>
            </section>

            <section>
              <h2 className="text-sm font-medium text-muted-foreground mb-3">Distribuição por plano</h2>
              <div className="rounded-xl border border-border bg-card p-5">
                {data.plans_distribution.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhuma assinatura registrada.</p>
                ) : (
                  <div className="space-y-2">
                    {data.plans_distribution.map((p) => (
                      <div key={p.plan_key} className="flex items-center justify-between text-sm">
                        <span className="capitalize">{p.plan_key}</span>
                        <span className="tabular-nums font-medium">{p.count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
