import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AdminLayout } from "@/components/AdminLayout";
import {
  useAdminOrganizations,
  useAdminOrgDetails,
  useUpdateSubscription,
} from "@/lib/admin-queries";
import { useSubscriptionPlans } from "@/lib/queries";
import { Building2, Loader2, ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/organizacoes")({
  head: () => ({ meta: [{ title: "Admin — Organizações" }] }),
  component: AdminOrganizationsPage,
});

function fmtDate(s: string | null) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("pt-BR");
}

function StatusBadge({ status }: { status: string | null }) {
  const map: Record<string, string> = {
    ativo: "bg-primary/15 text-primary border-primary/30",
    trial: "bg-amber-500/15 text-amber-500 border-amber-500/30",
    pausado: "bg-muted text-muted-foreground border-border",
    cancelado: "bg-destructive/15 text-destructive border-destructive/30",
    expirado: "bg-destructive/15 text-destructive border-destructive/30",
  };
  const cls = map[status ?? ""] ?? "bg-muted text-muted-foreground border-border";
  return <span className={`text-[11px] px-2 py-0.5 rounded-full border capitalize ${cls}`}>{status ?? "—"}</span>;
}

function OrgDetailsPanel({ orgId, onClose }: { orgId: string; onClose: () => void }) {
  const { data, isLoading } = useAdminOrgDetails(orgId);
  const { data: plans } = useSubscriptionPlans();
  const update = useUpdateSubscription();

  const [planKey, setPlanKey] = useState<string>("");
  const [billingCycle, setBillingCycle] = useState<string>("");
  const [status, setStatus] = useState<string>("");
  const [expiresAt, setExpiresAt] = useState<string>("");

  // initialize fields when data loads
  if (data?.subscription && !planKey) {
    setPlanKey(data.subscription.plan_key);
    setBillingCycle(data.subscription.billing_cycle);
    setStatus(data.subscription.status);
    setExpiresAt(data.subscription.expires_at ? data.subscription.expires_at.slice(0, 10) : "");
  }

  const save = async () => {
    try {
      await update.mutateAsync({
        organization_id: orgId,
        plan_key: planKey || undefined,
        billing_cycle: (billingCycle as "mensal" | "anual") || undefined,
        status: (status as "ativo" | "trial" | "pausado" | "cancelado" | "expirado") || undefined,
        expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
      });
      toast.success("Assinatura atualizada");
    } catch (e) {
      toast.error("Falha ao atualizar", { description: (e as Error).message });
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur flex">
      <div className="ml-auto w-full max-w-2xl h-full overflow-auto bg-card border-l border-border">
        <div className="sticky top-0 z-10 flex items-center justify-between p-4 border-b border-border bg-card">
          <h2 className="text-base font-semibold">Detalhes da organização</h2>
          <Button size="icon" variant="ghost" onClick={onClose}><X className="h-4 w-4" /></Button>
        </div>
        {isLoading || !data ? (
          <div className="p-6 flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Carregando…</div>
        ) : (
          <div className="p-5 space-y-6">
            <section>
              <h3 className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Dados</h3>
              <div className="rounded-md border border-border p-4 space-y-1 text-sm">
                <div><span className="text-muted-foreground">Nome:</span> <span className="font-medium">{data.organization?.name}</span></div>
                <div><span className="text-muted-foreground">Slug:</span> {data.organization?.slug}</div>
                <div><span className="text-muted-foreground">Criada em:</span> {fmtDate(data.organization?.created_at ?? null)}</div>
              </div>
            </section>

            <section>
              <h3 className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Uso atual</h3>
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div className="rounded-md border border-border p-3">
                  <div className="text-[10px] uppercase text-muted-foreground">Imóveis</div>
                  <div className="text-lg font-semibold tabular-nums">{data.usage.properties}{data.plan ? ` / ${data.plan.max_properties}` : ""}</div>
                </div>
                <div className="rounded-md border border-border p-3">
                  <div className="text-[10px] uppercase text-muted-foreground">Usuários</div>
                  <div className="text-lg font-semibold tabular-nums">{data.usage.users}{data.plan ? ` / ${data.plan.max_users}` : ""}</div>
                </div>
                <div className="rounded-md border border-border p-3">
                  <div className="text-[10px] uppercase text-muted-foreground">Licenças</div>
                  <div className="text-lg font-semibold tabular-nums">{data.usage.licenses}{data.plan ? ` / ${data.plan.max_licenses}` : ""}</div>
                </div>
              </div>
            </section>

            <section>
              <h3 className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Assinatura</h3>
              <div className="rounded-md border border-border p-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <label className="text-xs">
                    <span className="text-muted-foreground">Plano</span>
                    <select className="mt-1 w-full bg-background border border-border rounded-md h-9 px-2 text-sm" value={planKey} onChange={(e) => setPlanKey(e.target.value)}>
                      <option value="">—</option>
                      {(plans ?? []).map((p) => (
                        <option key={p.key} value={p.key}>{p.name}</option>
                      ))}
                    </select>
                  </label>
                  <label className="text-xs">
                    <span className="text-muted-foreground">Ciclo</span>
                    <select className="mt-1 w-full bg-background border border-border rounded-md h-9 px-2 text-sm" value={billingCycle} onChange={(e) => setBillingCycle(e.target.value)}>
                      <option value="mensal">Mensal</option>
                      <option value="anual">Anual</option>
                    </select>
                  </label>
                  <label className="text-xs">
                    <span className="text-muted-foreground">Status</span>
                    <select className="mt-1 w-full bg-background border border-border rounded-md h-9 px-2 text-sm" value={status} onChange={(e) => setStatus(e.target.value)}>
                      <option value="trial">Trial</option>
                      <option value="ativo">Ativo</option>
                      <option value="pausado">Pausado</option>
                      <option value="cancelado">Cancelado</option>
                      <option value="expirado">Expirado</option>
                    </select>
                  </label>
                  <label className="text-xs">
                    <span className="text-muted-foreground">Validade</span>
                    <input type="date" className="mt-1 w-full bg-background border border-border rounded-md h-9 px-2 text-sm" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
                  </label>
                </div>
                <Button onClick={save} disabled={update.isPending} className="w-full">
                  {update.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Salvar alterações
                </Button>
              </div>
            </section>

            <section>
              <h3 className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Usuários ({data.users.length})</h3>
              <div className="rounded-md border border-border divide-y divide-border">
                {data.users.length === 0 && (
                  <div className="p-3 text-sm text-muted-foreground">Nenhum usuário.</div>
                )}
                {data.users.map((u) => (
                  <div key={u.id} className="p-3 text-sm flex items-center justify-between">
                    <div>
                      <div className="font-medium">{u.full_name ?? "—"}</div>
                      <div className="text-xs text-muted-foreground">{u.email}</div>
                    </div>
                    <div className="text-[11px] text-muted-foreground capitalize">{u.roles.join(", ") || "—"}</div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}

function AdminOrganizationsPage() {
  const { data, isLoading } = useAdminOrganizations();
  const [openOrgId, setOpenOrgId] = useState<string | null>(null);

  return (
    <AdminLayout title="Organizações" subtitle="Todos os escritórios da plataforma">
      <div className="p-6 max-w-7xl">
        {isLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Carregando…</div>
        ) : (
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 text-xs uppercase tracking-widest text-muted-foreground">
                <tr>
                  <th className="text-left p-3">Organização</th>
                  <th className="text-left p-3">Criada</th>
                  <th className="text-left p-3">Plano</th>
                  <th className="text-left p-3">Status</th>
                  <th className="text-right p-3">Usuários</th>
                  <th className="text-right p-3">Imóveis</th>
                  <th className="text-right p-3">Licenças</th>
                  <th className="text-right p-3"></th>
                </tr>
              </thead>
              <tbody>
                {(data ?? []).map((o) => (
                  <tr key={o.id} className="border-t border-border hover:bg-muted/20">
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="font-medium">{o.name}</div>
                          <div className="text-[11px] text-muted-foreground">{o.slug}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-3">{fmtDate(o.created_at)}</td>
                    <td className="p-3 capitalize">{o.plan_key ?? "—"}</td>
                    <td className="p-3"><StatusBadge status={o.subscription_status} /></td>
                    <td className="p-3 text-right tabular-nums">{o.users_count}</td>
                    <td className="p-3 text-right tabular-nums">{o.properties_count}</td>
                    <td className="p-3 text-right tabular-nums">{o.licenses_count}</td>
                    <td className="p-3 text-right">
                      <Button size="sm" variant="ghost" onClick={() => setOpenOrgId(o.id)}>
                        Detalhes <ChevronRight className="h-3 w-3 ml-1" />
                      </Button>
                    </td>
                  </tr>
                ))}
                {(data ?? []).length === 0 && (
                  <tr><td colSpan={8} className="p-6 text-center text-sm text-muted-foreground">Nenhuma organização.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {openOrgId && <OrgDetailsPanel orgId={openOrgId} onClose={() => setOpenOrgId(null)} />}
    </AdminLayout>
  );
}
