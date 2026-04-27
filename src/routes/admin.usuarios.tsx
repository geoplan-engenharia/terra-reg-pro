import { createFileRoute } from "@tanstack/react-router";
import { AdminLayout } from "@/components/AdminLayout";
import { useAdminUsers, useUpdateUserRole } from "@/lib/admin-queries";
import { Loader2, User } from "lucide-react";
import { ROLE_LABEL } from "@/lib/auth";
import type { AppRole } from "@/lib/auth";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/usuarios")({
  head: () => ({ meta: [{ title: "Admin — Usuários" }] }),
  component: AdminUsersPage,
});

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString("pt-BR");
}

function AdminUsersPage() {
  const { data, isLoading } = useAdminUsers();
  const updateRole = useUpdateUserRole();

  const handleRoleChange = async (userId: string, orgId: string | null, role: AppRole) => {
    if (!orgId) {
      toast.error("Usuário sem organização");
      return;
    }
    try {
      await updateRole.mutateAsync({ user_id: userId, organization_id: orgId, role });
      toast.success("Papel atualizado");
    } catch (e) {
      toast.error("Falha", { description: (e as Error).message });
    }
  };

  return (
    <AdminLayout title="Usuários" subtitle="Todos os usuários da plataforma">
      <div className="p-6 max-w-7xl">
        {isLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Carregando…</div>
        ) : (
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 text-xs uppercase tracking-widest text-muted-foreground">
                <tr>
                  <th className="text-left p-3">Usuário</th>
                  <th className="text-left p-3">E-mail</th>
                  <th className="text-left p-3">Organização</th>
                  <th className="text-left p-3">Papel</th>
                  <th className="text-left p-3">Cadastro</th>
                </tr>
              </thead>
              <tbody>
                {(data ?? []).map((u) => (
                  <tr key={u.id} className="border-t border-border hover:bg-muted/20">
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="font-medium">{u.full_name ?? "—"}</div>
                          {u.is_super_admin && <span className="text-[10px] text-destructive font-medium uppercase tracking-widest">Super Admin</span>}
                        </div>
                      </div>
                    </td>
                    <td className="p-3 text-muted-foreground">{u.email}</td>
                    <td className="p-3">{u.organization_name ?? "—"}</td>
                    <td className="p-3">
                      <select
                        className="bg-background border border-border rounded-md h-8 px-2 text-xs"
                        value={u.roles[0] ?? ""}
                        onChange={(e) => handleRoleChange(u.id, u.organization_id, e.target.value as AppRole)}
                      >
                        <option value="">—</option>
                        {(["admin", "tecnico", "financeiro", "visualizador"] as AppRole[]).map((r) => (
                          <option key={r} value={r}>{ROLE_LABEL[r]}</option>
                        ))}
                      </select>
                    </td>
                    <td className="p-3 text-muted-foreground">{fmtDate(u.created_at)}</td>
                  </tr>
                ))}
                {(data ?? []).length === 0 && (
                  <tr><td colSpan={5} className="p-6 text-center text-sm text-muted-foreground">Nenhum usuário.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-3 text-[11px] text-muted-foreground">
          Para criar usuários manualmente em uma organização, use a área "Detalhes da Organização" ou peça ao admin do escritório enviar um convite.
        </p>
      </div>
    </AdminLayout>
  );
}
