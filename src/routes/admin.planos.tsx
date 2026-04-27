import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AdminLayout } from "@/components/AdminLayout";
import { useSubscriptionPlans } from "@/lib/queries";
import { useUpdatePlan } from "@/lib/admin-queries";
import { Loader2, Save, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/planos")({
  head: () => ({ meta: [{ title: "Admin — Planos" }] }),
  component: AdminPlansPage,
});

interface PlanForm {
  name: string;
  max_properties: number;
  max_users: number;
  max_licenses: number;
  price_monthly: number;
  price_yearly: number;
  is_active: boolean;
  can_use_custom_rules: boolean;
  can_use_simulated_sync: boolean;
  can_export_reports: boolean;
}

function PlanCard({ plan }: { plan: { key: string; name: string; max_properties: number; max_users: number; max_licenses: number; price_monthly: number; price_yearly: number; is_active: boolean; can_use_custom_rules: boolean; can_use_simulated_sync: boolean; can_export_reports: boolean } }) {
  const update = useUpdatePlan();
  const [form, setForm] = useState<PlanForm>({
    name: plan.name,
    max_properties: plan.max_properties,
    max_users: plan.max_users,
    max_licenses: plan.max_licenses,
    price_monthly: Number(plan.price_monthly),
    price_yearly: Number(plan.price_yearly),
    is_active: plan.is_active,
    can_use_custom_rules: plan.can_use_custom_rules,
    can_use_simulated_sync: plan.can_use_simulated_sync,
    can_export_reports: plan.can_export_reports,
  });

  const save = async () => {
    try {
      await update.mutateAsync({ key: plan.key, ...form });
      toast.success(`Plano ${plan.name} atualizado`);
    } catch (e) {
      toast.error("Falha", { description: (e as Error).message });
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Tag className="h-4 w-4 text-primary" />
          <div>
            <div className="font-semibold">{plan.name}</div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{plan.key}</div>
          </div>
        </div>
        <label className="flex items-center gap-2 text-xs">
          <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
          Ativo
        </label>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="text-xs">
          <span className="text-muted-foreground">Nome</span>
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1 h-9" />
        </label>
        <label className="text-xs">
          <span className="text-muted-foreground">Mensal (R$)</span>
          <Input type="number" value={form.price_monthly} onChange={(e) => setForm({ ...form, price_monthly: Number(e.target.value) })} className="mt-1 h-9" />
        </label>
        <label className="text-xs">
          <span className="text-muted-foreground">Anual (R$)</span>
          <Input type="number" value={form.price_yearly} onChange={(e) => setForm({ ...form, price_yearly: Number(e.target.value) })} className="mt-1 h-9" />
        </label>
        <label className="text-xs">
          <span className="text-muted-foreground">Máx. imóveis</span>
          <Input type="number" value={form.max_properties} onChange={(e) => setForm({ ...form, max_properties: Number(e.target.value) })} className="mt-1 h-9" />
        </label>
        <label className="text-xs">
          <span className="text-muted-foreground">Máx. usuários</span>
          <Input type="number" value={form.max_users} onChange={(e) => setForm({ ...form, max_users: Number(e.target.value) })} className="mt-1 h-9" />
        </label>
        <label className="text-xs">
          <span className="text-muted-foreground">Máx. licenças</span>
          <Input type="number" value={form.max_licenses} onChange={(e) => setForm({ ...form, max_licenses: Number(e.target.value) })} className="mt-1 h-9" />
        </label>
      </div>

      <div className="space-y-2 text-xs border-t border-border pt-3">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={form.can_use_custom_rules} onChange={(e) => setForm({ ...form, can_use_custom_rules: e.target.checked })} />
          Regras personalizadas
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={form.can_use_simulated_sync} onChange={(e) => setForm({ ...form, can_use_simulated_sync: e.target.checked })} />
          Sincronização simulada
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={form.can_export_reports} onChange={(e) => setForm({ ...form, can_export_reports: e.target.checked })} />
          Exportar relatórios
        </label>
      </div>

      <Button onClick={save} disabled={update.isPending} className="w-full" size="sm">
        {update.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
        Salvar plano
      </Button>
    </div>
  );
}

function AdminPlansPage() {
  const { data, isLoading } = useSubscriptionPlans();

  return (
    <AdminLayout title="Planos" subtitle="Gerencie preços, limites e recursos por plano">
      <div className="p-6 max-w-7xl">
        {isLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Carregando…</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(data ?? []).map((p) => <PlanCard key={p.key} plan={p as never} />)}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
