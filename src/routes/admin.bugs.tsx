import { createFileRoute } from "@tanstack/react-router";
import { AdminLayout } from "@/components/AdminLayout";
import { useSupportReports, useUpdateSupportReport } from "@/lib/admin-queries";
import { Bug, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/bugs")({
  head: () => ({ meta: [{ title: "Admin — Bugs e Suporte" }] }),
  component: AdminBugsPage,
});

function fmtDate(s: string) {
  return new Date(s).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

function PriorityBadge({ p }: { p: string }) {
  const map: Record<string, string> = {
    alta: "bg-destructive/15 text-destructive border-destructive/30",
    media: "bg-amber-500/15 text-amber-500 border-amber-500/30",
    baixa: "bg-muted text-muted-foreground border-border",
  };
  return <span className={`text-[10px] px-2 py-0.5 rounded-full border capitalize ${map[p] ?? map.baixa}`}>{p}</span>;
}

function AdminBugsPage() {
  const { data, isLoading } = useSupportReports();
  const update = useUpdateSupportReport();

  const setStatus = async (id: string, status: string) => {
    try {
      await update.mutateAsync({ id, status });
      toast.success("Status atualizado");
    } catch (e) {
      toast.error("Falha", { description: (e as Error).message });
    }
  };

  return (
    <AdminLayout title="Bugs / Suporte" subtitle="Reports enviados pelos usuários">
      <div className="p-6 max-w-7xl">
        {isLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Carregando…</div>
        ) : (
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 text-xs uppercase tracking-widest text-muted-foreground">
                <tr>
                  <th className="text-left p-3">Report</th>
                  <th className="text-left p-3">Org / Usuário</th>
                  <th className="text-left p-3">Tipo</th>
                  <th className="text-left p-3">Prio</th>
                  <th className="text-left p-3">Status</th>
                  <th className="text-left p-3">Data</th>
                </tr>
              </thead>
              <tbody>
                {(data ?? []).map((r) => (
                  <tr key={r.id} className="border-t border-border align-top hover:bg-muted/20">
                    <td className="p-3">
                      <div className="flex items-start gap-2">
                        <Bug className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <div>
                          <div className="font-medium">{r.title}</div>
                          {r.description && <div className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{r.description}</div>}
                        </div>
                      </div>
                    </td>
                    <td className="p-3">
                      <div>{r.organization_name ?? "—"}</div>
                      <div className="text-[11px] text-muted-foreground">{r.user_email ?? "—"}</div>
                    </td>
                    <td className="p-3 capitalize">{r.report_type}</td>
                    <td className="p-3"><PriorityBadge p={r.priority} /></td>
                    <td className="p-3">
                      <select
                        className="bg-background border border-border rounded-md h-8 px-2 text-xs"
                        value={r.status}
                        onChange={(e) => setStatus(r.id, e.target.value)}
                      >
                        <option value="aberto">Aberto</option>
                        <option value="em_analise">Em análise</option>
                        <option value="resolvido">Resolvido</option>
                        <option value="rejeitado">Rejeitado</option>
                      </select>
                    </td>
                    <td className="p-3 text-muted-foreground text-xs">{fmtDate(r.created_at)}</td>
                  </tr>
                ))}
                {(data ?? []).length === 0 && (
                  <tr><td colSpan={6} className="p-6 text-center text-sm text-muted-foreground">Nenhum report enviado.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
