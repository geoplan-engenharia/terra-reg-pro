import { createFileRoute } from "@tanstack/react-router";
import { AdminLayout } from "@/components/AdminLayout";
import { usePlatformOverview, useAdminOrganizations } from "@/lib/admin-queries";
import { DollarSign, TrendingUp, Loader2, AlertCircle, Calendar } from "lucide-react";

export const Route = createFileRoute("/admin/financeiro")({
  head: () => ({ meta: [{ title: "Admin — Financeiro" }] }),
  component: AdminFinancialPage,
});

function fmtBRL(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 2 });
}

function fmtDate(s: string | null) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("pt-BR");
}

function AdminFinancialPage() {
  const { data: overview, isLoading: lo } = usePlatformOverview();
  const { data: orgs, isLoading: lO } = useAdminOrganizations();

  const now = Date.now();
  const trialsExpiringSoon = (orgs ?? []).filter((o) => {
    if (o.subscription_status !== "trial" || !o.expires_at) return false;
    const ms = new Date(o.expires_at).getTime() - now;
    return ms > 0 && ms < 7 * 24 * 60 * 60 * 1000;
  });
  const canceled = (orgs ?? []).filter((o) => o.subscription_status === "cancelado" || o.subscription_status === "expirado");

  return (
    <AdminLayout title="Financeiro" subtitle="MRR, ARR e saúde de assinaturas">
      <div className="p-6 max-w-7xl space-y-6">
        {(lo || lO) && (
          <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Carregando…</div>
        )}

        {overview && (
          <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-5">
              <div className="flex items-center justify-between text-xs uppercase tracking-widest text-muted-foreground">
                MRR estimado
                <DollarSign className="h-4 w-4" />
              </div>
              <div className="mt-2 text-2xl font-semibold">{fmtBRL(Number(overview.mrr_estimated))}</div>
              <div className="text-[11px] text-muted-foreground mt-1">Receita mensal recorrente</div>
            </div>
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-5">
              <div className="flex items-center justify-between text-xs uppercase tracking-widest text-muted-foreground">
                ARR estimado
                <TrendingUp className="h-4 w-4" />
              </div>
              <div className="mt-2 text-2xl font-semibold">{fmtBRL(Number(overview.arr_estimated))}</div>
              <div className="text-[11px] text-muted-foreground mt-1">Projeção 12 meses</div>
            </div>
            <div className="rounded-xl border border-border bg-card p-5">
              <div className="text-xs uppercase tracking-widest text-muted-foreground">Assinaturas</div>
              <div className="mt-2 grid grid-cols-3 gap-2 text-center">
                <div>
                  <div className="text-lg font-semibold text-primary">{overview.active_subscriptions}</div>
                  <div className="text-[10px] text-muted-foreground uppercase">Ativos</div>
                </div>
                <div>
                  <div className="text-lg font-semibold text-amber-500">{overview.trial_subscriptions}</div>
                  <div className="text-[10px] text-muted-foreground uppercase">Trial</div>
                </div>
                <div>
                  <div className="text-lg font-semibold text-destructive">{overview.canceled_subscriptions}</div>
                  <div className="text-[10px] text-muted-foreground uppercase">Cancelados</div>
                </div>
              </div>
            </div>
          </section>
        )}

        {overview && (
          <section>
            <h2 className="text-sm font-medium text-muted-foreground mb-3">Organizações por plano</h2>
            <div className="rounded-xl border border-border bg-card p-5">
              {overview.plans_distribution.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma assinatura.</p>
              ) : (
                <div className="space-y-2">
                  {overview.plans_distribution.map((p) => (
                    <div key={p.plan_key} className="flex items-center justify-between text-sm">
                      <span className="capitalize">{p.plan_key}</span>
                      <span className="tabular-nums font-medium">{p.count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-5">
            <h3 className="flex items-center gap-2 text-sm font-medium text-amber-500 mb-3">
              <Calendar className="h-4 w-4" /> Trials próximos do vencimento (7d)
            </h3>
            {trialsExpiringSoon.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nenhum trial vencendo nos próximos 7 dias.</p>
            ) : (
              <ul className="text-sm space-y-2">
                {trialsExpiringSoon.map((o) => (
                  <li key={o.id} className="flex items-center justify-between">
                    <span>{o.name}</span>
                    <span className="text-xs text-muted-foreground">{fmtDate(o.expires_at)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-5">
            <h3 className="flex items-center gap-2 text-sm font-medium text-destructive mb-3">
              <AlertCircle className="h-4 w-4" /> Assinaturas canceladas / expiradas
            </h3>
            {canceled.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nenhuma assinatura cancelada.</p>
            ) : (
              <ul className="text-sm space-y-2">
                {canceled.map((o) => (
                  <li key={o.id} className="flex items-center justify-between">
                    <span>{o.name}</span>
                    <span className="text-xs text-muted-foreground capitalize">{o.subscription_status}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <p className="text-[11px] text-muted-foreground">
          * Valores estimados a partir da tabela de assinaturas atuais. Integração com checkout real ainda não implementada.
        </p>
      </div>
    </AdminLayout>
  );
}
