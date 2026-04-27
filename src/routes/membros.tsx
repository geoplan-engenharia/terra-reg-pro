import { createFileRoute, Link } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { RequireAuth } from "@/components/RequireAuth";
import { useAuth, ROLE_LABEL, type AppRole } from "@/lib/auth";
import { useInvites, useCreateInvite, useRevokeInvite, useOrgMembers } from "@/lib/invites";
import { useState } from "react";
import { Mail, UserPlus, Copy, ShieldCheck, Loader2, X, Users } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/membros")({
  head: () => ({ meta: [{ title: "Membros & Convites — GeoTerra" }] }),
  component: () => (
    <RequireAuth>
      <MembrosPage />
    </RequireAuth>
  ),
});

function MembrosPage() {
  const { profile, isAdmin } = useAuth();
  const { data: invites = [], isLoading: loadingInv } = useInvites();
  const { data: members = [], isLoading: loadingMem } = useOrgMembers();
  const create = useCreateInvite();
  const revoke = useRevokeInvite();

  const [email, setEmail] = useState("");
  const [role, setRole] = useState<AppRole>("tecnico");

  if (!isAdmin) {
    return (
      <AppLayout title="Membros" subtitle="Apenas administradores">
        <div className="rounded-lg border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          Você precisa ser administrador para gerir membros e convites.
        </div>
      </AppLayout>
    );
  }

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    try {
      await create.mutateAsync({ email, role, organization_id: profile.organization_id });
      toast.success("Convite criado. Compartilhe o link com a pessoa.");
      setEmail("");
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const inviteLink = (token: string) => `${window.location.origin}/accept-invite/${token}`;

  return (
    <AppLayout title="Membros & Convites" subtitle="Gerencie quem acessa o escritório">
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <div className="rounded-lg border border-border bg-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <UserPlus className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold">Convidar membro</h2>
            </div>
            <form onSubmit={handleInvite} className="space-y-3">
              <div>
                <label className="text-xs font-medium">E-mail</label>
                <input
                  type="email" required value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 h-10 w-full rounded-md border border-input bg-input/40 px-3 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-medium">Perfil de acesso</label>
                <select
                  value={role} onChange={(e) => setRole(e.target.value as AppRole)}
                  className="mt-1 h-10 w-full rounded-md border border-input bg-input/40 px-3 text-sm"
                >
                  {(Object.keys(ROLE_LABEL) as AppRole[]).map((r) => (
                    <option key={r} value={r}>{ROLE_LABEL[r]}</option>
                  ))}
                </select>
              </div>
              <button
                type="submit" disabled={create.isPending}
                className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-primary text-primary-foreground h-10 text-sm font-medium hover:opacity-90 disabled:opacity-60"
              >
                {create.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Gerar convite
              </button>
            </form>
            <p className="mt-3 text-[11px] text-muted-foreground">
              O convite expira em 14 dias e cria automaticamente o vínculo ao escritório no primeiro acesso.
            </p>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          {/* Convites */}
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <div className="px-5 py-3 border-b border-border flex items-center gap-2">
              <Mail className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold">Convites ({invites.length})</h2>
            </div>
            {loadingInv ? (
              <div className="p-6 text-sm text-muted-foreground">Carregando...</div>
            ) : invites.length === 0 ? (
              <div className="p-6 text-sm text-muted-foreground">Nenhum convite enviado ainda.</div>
            ) : (
              <ul className="divide-y divide-border">
                {invites.map((i) => {
                  const expired = new Date(i.expires_at) < new Date();
                  const status = expired && i.status === "pendente" ? "expirado" : i.status;
                  return (
                    <li key={i.id} className="px-5 py-3 flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{i.email}</div>
                        <div className="text-[11px] text-muted-foreground">
                          {ROLE_LABEL[i.role]} · expira {new Date(i.expires_at).toLocaleDateString("pt-BR")}
                        </div>
                      </div>
                      <span className={cn(
                        "text-[11px] px-2 py-0.5 rounded-full border",
                        status === "pendente" && "border-warning/40 bg-warning/10 text-warning",
                        status === "aceito" && "border-success/40 bg-success/10 text-success",
                        status === "revogado" && "border-muted bg-muted/30 text-muted-foreground",
                        status === "expirado" && "border-destructive/40 bg-destructive/10 text-destructive",
                      )}>{status}</span>
                      {i.status === "pendente" && !expired && (
                        <>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(inviteLink(i.token));
                              toast.success("Link copiado!");
                            }}
                            className="inline-flex items-center gap-1.5 text-xs px-2.5 h-8 rounded-md border border-border hover:bg-accent/10"
                          >
                            <Copy className="h-3.5 w-3.5" /> Copiar link
                          </button>
                          <button
                            onClick={() => revoke.mutate(i.id)}
                            className="inline-flex items-center gap-1.5 text-xs px-2.5 h-8 rounded-md border border-border hover:bg-destructive/10 hover:text-destructive"
                          >
                            <X className="h-3.5 w-3.5" /> Revogar
                          </button>
                        </>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Membros */}
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <div className="px-5 py-3 border-b border-border flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold">Membros ativos ({members.length})</h2>
            </div>
            {loadingMem ? (
              <div className="p-6 text-sm text-muted-foreground">Carregando...</div>
            ) : (
              <ul className="divide-y divide-border">
                {members.map((m) => (
                  <li key={m.id} className="px-5 py-3 flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-gradient-primary grid place-items-center text-primary-foreground text-xs font-semibold">
                      {(m.full_name ?? m.email ?? "?").slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{m.full_name ?? "—"}</div>
                      <div className="text-[11px] text-muted-foreground truncate">{m.email}</div>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {m.roles.map((r) => (
                        <span key={r} className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border border-primary/30 bg-primary/10 text-primary">
                          <ShieldCheck className="h-3 w-3" /> {ROLE_LABEL[r]}
                        </span>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="text-xs text-muted-foreground">
            <Link to="/" className="text-primary hover:underline">← Voltar ao dashboard</Link>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
