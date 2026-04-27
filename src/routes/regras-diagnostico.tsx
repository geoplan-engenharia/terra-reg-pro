import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/lib/auth";
import { useDiagnosticRules, useUpsertDiagnosticRule, useDeleteDiagnosticRule } from "@/lib/queries";
import type { DiagnosticRule, RuleCategory, Severidade } from "@/lib/types";
import { useMemo, useState } from "react";
import { Sliders, Plus, Pencil, Trash2, X, Loader2, Lock, Power, ShieldAlert, Leaf, FileCheck2, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/regras-diagnostico")({
  head: () => ({
    meta: [
      { title: "Regras de Diagnóstico — GeoTerra" },
      { name: "description", content: "Configure regras técnicas que geram diagnósticos automáticos para imóveis rurais." },
    ],
  }),
  component: RulesPage,
});

const categoryMap: Record<RuleCategory, { label: string; icon: React.ElementType; cls: string }> = {
  fundiaria: { label: "Fundiária", icon: FileCheck2, cls: "border-info/40 bg-info/10 text-info" },
  ambiental: { label: "Ambiental", icon: Leaf, cls: "border-success/40 bg-success/10 text-success" },
  licenciamento: { label: "Licenciamento", icon: ShieldAlert, cls: "border-warning/40 bg-warning/10 text-warning" },
  monitoramento: { label: "Monitoramento", icon: Eye, cls: "border-primary/40 bg-primary/10 text-primary" },
};

const severityMap: Record<Severidade, { label: string; cls: string }> = {
  alta: { label: "Alta", cls: "border-destructive/40 bg-destructive/10 text-destructive" },
  media: { label: "Média", cls: "border-warning/40 bg-warning/10 text-warning" },
  baixa: { label: "Baixa", cls: "border-success/40 bg-success/10 text-success" },
};

interface FormState {
  id?: string;
  key: string;
  name: string;
  category: RuleCategory;
  severity: Severidade;
  description: string;
  report_message: string;
  is_active: boolean;
}

const blankForm: FormState = {
  key: "",
  name: "",
  category: "fundiaria",
  severity: "media",
  description: "",
  report_message: "",
  is_active: true,
};

function RulesPage() {
  const { isAdmin, profile } = useAuth();
  const { data: rules = [], isLoading } = useDiagnosticRules();
  const upsert = useUpsertDiagnosticRule();
  const remove = useDeleteDiagnosticRule();

  const [filterCat, setFilterCat] = useState<RuleCategory | "all">("all");
  const [editing, setEditing] = useState<FormState | null>(null);

  const filtered = useMemo(
    () => (filterCat === "all" ? rules : rules.filter((r) => r.category === filterCat)),
    [rules, filterCat]
  );

  const stats = useMemo(() => {
    const total = rules.length;
    const ativas = rules.filter((r) => r.is_active).length;
    const altas = rules.filter((r) => r.severity === "alta").length;
    return { total, ativas, inativas: total - ativas, altas };
  }, [rules]);

  const handleToggleActive = async (rule: DiagnosticRule) => {
    if (!isAdmin) return;
    try {
      await upsert.mutateAsync({
        id: rule.id,
        key: rule.key,
        name: rule.name,
        category: rule.category,
        report_message: rule.report_message,
        is_active: !rule.is_active,
      });
      toast.success(rule.is_active ? "Regra desativada" : "Regra ativada");
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const handleSave = async (form: FormState) => {
    if (!profile) return;
    try {
      await upsert.mutateAsync({
        ...(form.id ? { id: form.id } : {}),
        organization_id: profile.organization_id,
        name: form.name,
        key: form.key,
        category: form.category,
        severity: form.severity,
        description: form.description || null,
        report_message: form.report_message,
        is_active: form.is_active,
      } as Partial<DiagnosticRule> & { name: string; key: string; category: string; report_message: string });
      toast.success(form.id ? "Regra atualizada" : "Regra criada");
      setEditing(null);
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const handleDelete = async (rule: DiagnosticRule) => {
    if (!isAdmin) return;
    if (!confirm(`Excluir a regra "${rule.name}"? Esta ação não pode ser desfeita.`)) return;
    try {
      await remove.mutateAsync(rule.id);
      toast.success("Regra excluída");
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  return (
    <AppLayout title="Regras de Diagnóstico" subtitle="Configuração das regras técnicas que geram diagnósticos automáticos">
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        <header className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-primary font-medium">
              <Sliders className="h-3 w-3" /> Configuração técnica
            </div>
            <h1 className="text-2xl font-semibold tracking-tight mt-1">Regras de Diagnóstico</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Regras técnicas que geram automaticamente os diagnósticos de cada imóvel rural.
            </p>
          </div>
          {isAdmin ? (
            <button
              onClick={() => setEditing({ ...blankForm })}
              className="inline-flex items-center gap-2 rounded-md bg-gradient-primary text-primary-foreground text-sm font-medium h-9 px-4 hover:opacity-90 transition shadow-glow"
            >
              <Plus className="h-4 w-4" /> Nova regra
            </button>
          ) : (
            <span className="inline-flex items-center gap-2 rounded-md border border-border bg-muted/30 text-xs text-muted-foreground h-9 px-3">
              <Lock className="h-3 w-3" /> Somente admin pode editar
            </span>
          )}
        </header>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatTile label="Regras totais" value={stats.total} />
          <StatTile label="Ativas" value={stats.ativas} accent="success" />
          <StatTile label="Inativas" value={stats.inativas} accent="muted" />
          <StatTile label="Severidade alta" value={stats.altas} accent="destructive" />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <FilterChip active={filterCat === "all"} onClick={() => setFilterCat("all")}>Todas</FilterChip>
          {(Object.keys(categoryMap) as RuleCategory[]).map((c) => (
            <FilterChip key={c} active={filterCat === c} onClick={() => setFilterCat(c)}>
              {categoryMap[c].label}
            </FilterChip>
          ))}
        </div>

        <div className="rounded-lg border border-border bg-card overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              Nenhuma regra encontrada nesta categoria.
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {filtered.map((rule) => {
                const cat = categoryMap[rule.category];
                const sev = severityMap[rule.severity];
                const Icon = cat.icon;
                return (
                  <li key={rule.id} className={cn("p-4 flex items-start gap-4 hover:bg-muted/20 transition", !rule.is_active && "opacity-60")}>
                    <div className={cn("h-9 w-9 grid place-items-center rounded-md border", cat.cls)}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-semibold tracking-tight truncate">{rule.name}</h3>
                        <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wider", sev.cls)}>
                          {sev.label}
                        </span>
                        <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[10px]", cat.cls)}>
                          {cat.label}
                        </span>
                        {!rule.is_active && (
                          <span className="inline-flex items-center rounded-full border border-muted bg-muted/30 px-2 py-0.5 text-[10px] text-muted-foreground">
                            Inativa
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                        {rule.description ?? "—"}
                      </p>
                      <div className="mt-2 grid md:grid-cols-2 gap-2 text-[11px]">
                        <div className="rounded border border-border bg-background/30 px-2 py-1.5">
                          <span className="text-muted-foreground">Chave: </span>
                          <span className="font-mono">{rule.key}</span>
                        </div>
                        <div className="rounded border border-border bg-background/30 px-2 py-1.5">
                          <span className="text-muted-foreground">Mensagem: </span>
                          <span>{rule.report_message}</span>
                        </div>
                      </div>
                    </div>
                    {isAdmin && (
                      <div className="flex flex-col gap-1.5 shrink-0">
                        <button
                          onClick={() => handleToggleActive(rule)}
                          title={rule.is_active ? "Desativar" : "Ativar"}
                          className="h-8 w-8 grid place-items-center rounded-md border border-border hover:bg-accent/10"
                        >
                          <Power className={cn("h-3.5 w-3.5", rule.is_active ? "text-success" : "text-muted-foreground")} />
                        </button>
                        <button
                          onClick={() => setEditing({
                            id: rule.id,
                            key: rule.key,
                            name: rule.name,
                            category: rule.category,
                            severity: rule.severity,
                            description: rule.description ?? "",
                            report_message: rule.report_message,
                            is_active: rule.is_active,
                          })}
                          title="Editar"
                          className="h-8 w-8 grid place-items-center rounded-md border border-border hover:bg-accent/10"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(rule)}
                          title="Excluir"
                          className="h-8 w-8 grid place-items-center rounded-md border border-destructive/40 text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {editing && <RuleFormModal initial={editing} onClose={() => setEditing(null)} onSave={handleSave} saving={upsert.isPending} />}
    </AppLayout>
  );
}

function StatTile({ label, value, accent }: { label: string; value: number; accent?: "success" | "destructive" | "muted" }) {
  const cls =
    accent === "success" ? "text-success"
    : accent === "destructive" ? "text-destructive"
    : accent === "muted" ? "text-muted-foreground"
    : "text-foreground";
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={cn("mt-1 text-2xl font-semibold tracking-tight", cls)}>{value}</div>
    </div>
  );
}

function FilterChip({ children, active, onClick }: { children: React.ReactNode; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1 text-xs transition",
        active ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}

function RuleFormModal({ initial, onClose, onSave, saving }: { initial: FormState; onClose: () => void; onSave: (f: FormState) => void; saving: boolean }) {
  const [form, setForm] = useState<FormState>(initial);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.key.trim() || !form.report_message.trim()) {
      toast.error("Preencha nome, chave e mensagem do relatório.");
      return;
    }
    onSave(form);
  };

  return (
    <div className="fixed inset-0 z-[2000] bg-background/70 backdrop-blur-sm flex items-center justify-center p-4">
      <form onSubmit={submit} className="w-full max-w-lg bg-card border border-border rounded-lg shadow-panel max-h-[90vh] overflow-auto">
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <h2 className="text-sm font-semibold">{form.id ? "Editar regra" : "Nova regra"}</h2>
          <button type="button" onClick={onClose} className="h-8 w-8 grid place-items-center rounded-md hover:bg-accent/10 text-muted-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-5 space-y-3">
          <Field label="Nome">
            <input
              required value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="input" placeholder="Ex.: Imóvel sem certificação SIGEF"
            />
          </Field>
          <Field label="Chave interna" hint="Identificador técnico, sem espaços">
            <input
              required value={form.key}
              onChange={(e) => setForm({ ...form, key: e.target.value.replace(/\s+/g, "_").toLowerCase() })}
              className="input font-mono" placeholder="ex_sigef_nao_certificado"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Categoria">
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value as RuleCategory })}
                className="input"
              >
                {(Object.keys(categoryMap) as RuleCategory[]).map((c) => (
                  <option key={c} value={c}>{categoryMap[c].label}</option>
                ))}
              </select>
            </Field>
            <Field label="Severidade">
              <select
                value={form.severity}
                onChange={(e) => setForm({ ...form, severity: e.target.value as Severidade })}
                className="input"
              >
                <option value="baixa">Baixa</option>
                <option value="media">Média</option>
                <option value="alta">Alta</option>
              </select>
            </Field>
          </div>
          <Field label="Descrição">
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="input min-h-[60px]" placeholder="Descrição interna da regra"
            />
          </Field>
          <Field label="Mensagem gerada no relatório">
            <textarea
              required value={form.report_message}
              onChange={(e) => setForm({ ...form, report_message: e.target.value })}
              className="input min-h-[60px]" placeholder="Frase exibida no diagnóstico do imóvel"
            />
          </Field>
          <label className="flex items-center gap-2 text-xs">
            <input
              type="checkbox" checked={form.is_active}
              onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
              className="h-4 w-4 rounded border-border"
            />
            Regra ativa
          </label>
        </div>
        <div className="flex justify-end gap-2 border-t border-border px-5 py-3">
          <button type="button" onClick={onClose} className="h-9 px-3 rounded-md border border-border text-sm hover:bg-accent/10">
            Cancelar
          </button>
          <button type="submit" disabled={saving} className="h-9 px-4 rounded-md bg-gradient-primary text-primary-foreground text-sm font-medium shadow-glow hover:opacity-90 disabled:opacity-60 inline-flex items-center gap-2">
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Salvar
          </button>
        </div>
      </form>
      <style>{`
        .input { width: 100%; background: hsl(var(--background) / 0.5); border: 1px solid hsl(var(--border)); border-radius: 6px; padding: 8px 10px; font-size: 13px; color: hsl(var(--foreground)); }
        .input:focus { outline: none; border-color: hsl(var(--primary)); box-shadow: 0 0 0 1px hsl(var(--primary) / 0.3); }
      `}</style>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">{label}</div>
      {children}
      {hint && <div className="text-[10px] text-muted-foreground mt-1">{hint}</div>}
    </label>
  );
}
