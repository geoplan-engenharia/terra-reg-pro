import { createFileRoute, Link } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { RequireAuth } from "@/components/RequireAuth";
import { useAuth, ROLE_LABEL } from "@/lib/auth";
import { useCurrentSubscription, useUsageCounts } from "@/lib/queries";
import { useOrgMembers } from "@/lib/invites";
import { SubscriptionCard } from "@/components/SubscriptionCard";
import {
  Building2,
  Crown,
  Users,
  Database,
  Sliders,
  ArrowUpRight,
  Mail,
  ShieldCheck,
  Bell,
  Tag,
  Loader2,
  Bug,
} from "lucide-react";
import { SupportReportForm } from "@/components/SupportReportForm";
import { useState } from "react";

export const Route = createFileRoute("/configuracoes")({
  head: () => ({ meta: [{ title: "Configurações — GeoTerra" }] }),
  component: () => (
    <RequireAuth>
      <ConfiguracoesPage />
    </RequireAuth>
  ),
});

function ConfiguracoesPage() {
  const { profile, isAdmin } = useAuth();
  const sub = useCurrentSubscription();
  const usage = useUsageCounts();
  const { data: members = [], isLoading: loadingMembers } = useOrgMembers();

  const [emailAlerts, setEmailAlerts] = useState(true);
  const [weeklyDigest, setWeeklyDigest] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(false);

  const plan = sub.data?.plan;
  const subscription = sub.data?.subscription;

  return (
    <AppLayout
      title="Configurações"
      subtitle="Gestão da organização, plano e preferências"
    >
      <div className="p-6 grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Coluna esquerda */}
        <div className="xl:col-span-2 space-y-6">
          {/* Dados da organização */}
          <section className="rounded-xl border border-border bg-card overflow-hidden">
            <header className="flex items-center gap-2 border-b border-border px-5 py-3">
              <Building2 className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold">Dados da organização</h2>
            </header>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-5">
              <Field label="Nome">
                <div className="text-sm">{profile?.organization_name ?? "—"}</div>
              </Field>
              <Field label="ID interno">
                <div className="text-xs font-mono text-muted-foreground truncate">
                  {profile?.organization_id ?? "—"}
                </div>
              </Field>
              <Field label="Administrador">
                <div className="text-sm">{profile?.full_name ?? "—"}</div>
              </Field>
              <Field label="E-mail de contato">
                <div className="text-sm inline-flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                  {profile?.email ?? "—"}
                </div>
              </Field>
            </div>
          </section>

          {/* Membros */}
          <section className="rounded-xl border border-border bg-card overflow-hidden">
            <header className="flex items-center justify-between border-b border-border px-5 py-3">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-semibold">Membros do escritório</h2>
                <span className="text-[11px] text-muted-foreground">({members.length})</span>
              </div>
              {isAdmin && (
                <Link
                  to="/membros"
                  className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                >
                  Gerenciar <ArrowUpRight className="h-3 w-3" />
                </Link>
              )}
            </header>
            <div className="overflow-x-auto">
              {loadingMembers ? (
                <div className="p-8 grid place-items-center">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                </div>
              ) : members.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  Nenhum membro cadastrado.
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-background/40">
                    <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                      <th className="px-5 py-2.5 font-medium">Nome</th>
                      <th className="px-3 py-2.5 font-medium">E-mail</th>
                      <th className="px-5 py-2.5 font-medium text-right">Perfil</th>
                    </tr>
                  </thead>
                  <tbody>
                    {members.slice(0, 8).map((m) => (
                      <tr key={m.id} className="border-t border-border">
                        <td className="px-5 py-3">{m.full_name ?? "—"}</td>
                        <td className="px-3 py-3 text-xs text-muted-foreground">{m.email ?? "—"}</td>
                        <td className="px-5 py-3 text-right">
                          <span className="inline-flex items-center gap-1 rounded-full border border-border bg-background/60 px-2 py-0.5 text-[11px] capitalize">
                            <ShieldCheck className="h-3 w-3 text-primary" />
                            {m.roles.length > 0 ? m.roles.map((r) => ROLE_LABEL[r]).join(", ") : "—"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </section>

          {/* Preferências básicas */}
          <section className="rounded-xl border border-border bg-card overflow-hidden">
            <header className="flex items-center gap-2 border-b border-border px-5 py-3">
              <Sliders className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold">Preferências</h2>
            </header>
            <div className="divide-y divide-border">
              <ToggleRow
                icon={Bell}
                label="Alertas por e-mail"
                desc="Receber notificações de novos alertas críticos."
                checked={emailAlerts}
                onChange={setEmailAlerts}
              />
              <ToggleRow
                icon={Mail}
                label="Resumo semanal"
                desc="Envio de resumo semanal de licenças e diagnósticos."
                checked={weeklyDigest}
                onChange={setWeeklyDigest}
              />
              <ToggleRow
                icon={Database}
                label="Sincronização automática"
                desc="Atualizar fontes simuladas automaticamente (em breve)."
                checked={autoRefresh}
                onChange={setAutoRefresh}
              />
            </div>
            <div className="border-t border-border bg-background/40 px-5 py-2.5 text-[11px] text-muted-foreground">
              Preferências locais — persistência completa em breve.
            </div>
          </section>
        </div>

        {/* Coluna direita */}
        <div className="space-y-6">
          {/* Plano atual */}
          <SubscriptionCard />

          <section className="rounded-xl border border-border bg-card overflow-hidden">
            <header className="flex items-center gap-2 border-b border-border px-5 py-3">
              <Crown className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold">Resumo do plano</h2>
            </header>
            <div className="p-5 space-y-2 text-xs">
              <Row label="Plano" value={plan?.name ?? "—"} />
              <Row label="Ciclo" value={subscription?.billing_cycle === "anual" ? "Anual" : "Mensal"} />
              <Row label="Status" value={subscription?.status ?? "—"} />
              <Row
                label="Imóveis"
                value={`${usage.data?.properties ?? 0} / ${formatLimit(plan?.max_properties)}`}
              />
              <Row
                label="Usuários"
                value={`${usage.data?.users ?? 0} / ${formatLimit(plan?.max_users)}`}
              />
              <Row
                label="Licenças"
                value={`${usage.data?.licenses ?? 0} / ${formatLimit(plan?.max_licenses)}`}
              />
            </div>
          </section>

          {/* Atalhos */}
          <section className="rounded-xl border border-border bg-card overflow-hidden">
            <header className="flex items-center gap-2 border-b border-border px-5 py-3">
              <ArrowUpRight className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold">Atalhos rápidos</h2>
            </header>
            <div className="p-3 space-y-1.5">
              <ShortcutLink to="/precos" icon={Tag} title="Planos e preços" desc="Compare planos e faça upgrade." />
              <ShortcutLink to="/fontes-dados" icon={Database} title="Fontes de dados" desc="CAR, SIGEF, MapBiomas, DETER, IBAMA." />
              <ShortcutLink to="/regras-diagnostico" icon={ShieldCheck} title="Regras de diagnóstico" desc="Configure as regras automáticas." />
              <ShortcutLink to="/membros" icon={Users} title="Membros & convites" desc="Gerencie acessos do escritório." />
            </div>
          </section>

          {/* Suporte */}
          <section className="rounded-xl border border-border bg-card p-5 space-y-3">
            <header className="flex items-center gap-2">
              <Bug className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold">Suporte</h2>
            </header>
            <p className="text-xs text-muted-foreground">Encontrou um problema ou tem uma sugestão? Envie para a equipe.</p>
            <SupportReportForm />
          </section>
        </div>
      </div>
    </AppLayout>
  );
}

function formatLimit(max?: number) {
  if (max === undefined || max === null) return "—";
  if (max >= 100000) return "Ilimitado";
  return max.toLocaleString("pt-BR");
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-border/50 pb-1.5 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium capitalize">{value}</span>
    </div>
  );
}

function ToggleRow({
  icon: Icon,
  label,
  desc,
  checked,
  onChange,
}: {
  icon: React.ElementType;
  label: string;
  desc: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 px-5 py-4">
      <div className="flex items-start gap-3">
        <div className="grid h-8 w-8 place-items-center rounded-md bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <div className="text-sm font-medium">{label}</div>
          <div className="text-xs text-muted-foreground">{desc}</div>
        </div>
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative h-5 w-9 rounded-full transition ${checked ? "bg-primary" : "bg-muted"}`}
        aria-pressed={checked}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-background shadow transition-all ${checked ? "left-[18px]" : "left-0.5"}`}
        />
      </button>
    </div>
  );
}

function ShortcutLink({
  to,
  icon: Icon,
  title,
  desc,
}: {
  to: "/precos" | "/fontes-dados" | "/regras-diagnostico" | "/membros";
  icon: React.ElementType;
  title: string;
  desc: string;
}) {
  return (
    <Link
      to={to}
      className="group flex items-center gap-3 rounded-md border border-transparent px-3 py-2.5 hover:border-primary/30 hover:bg-primary/5 transition"
    >
      <div className="grid h-8 w-8 place-items-center rounded-md bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition">
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs font-semibold">{title}</div>
        <div className="text-[11px] text-muted-foreground truncate">{desc}</div>
      </div>
      <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary" />
    </Link>
  );
}
