import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { fetchInviteByToken } from "@/lib/invites";
import { ROLE_LABEL } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Leaf, Loader2, ShieldCheck, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/accept-invite/$token")({
  head: () => ({ meta: [{ title: "Aceitar convite — GeoTerra" }] }),
  component: AcceptInvitePage,
});

type InviteLite = {
  id: string;
  email: string;
  role: keyof typeof ROLE_LABEL;
  status: string;
  expires_at: string;
  organization_id: string;
  organizations: { name: string } | null;
};

function AcceptInvitePage() {
  const { token } = Route.useParams();
  const navigate = useNavigate();
  const [invite, setInvite] = useState<InviteLite | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    fetchInviteByToken(token)
      .then((i) => setInvite(i as InviteLite | null))
      .catch(() => setInvite(null))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center bg-background">
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <Loader2 className="h-4 w-4 animate-spin" /> Validando convite...
        </div>
      </div>
    );
  }

  const expired = invite && new Date(invite.expires_at) < new Date();
  const invalid = !invite || invite.status !== "pendente" || expired;

  if (invalid) {
    return (
      <div className="min-h-screen grid place-items-center bg-background px-4">
        <div className="max-w-md text-center">
          <div className="mx-auto h-12 w-12 rounded-full bg-destructive/15 grid place-items-center text-destructive">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <h1 className="mt-4 text-xl font-semibold">Convite inválido</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Este convite expirou, foi revogado ou já foi utilizado.
          </p>
          <Link to="/login" className="mt-6 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
            Ir para o login
          </Link>
        </div>
      </div>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await supabase.auth.signUp({
      email: invite!.email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: { full_name: fullName, invite_token: token },
      },
    });
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`Bem-vindo a ${invite!.organizations?.name ?? "sua nova organização"}!`);
    navigate({ to: "/" });
  };

  return (
    <div className="min-h-screen grid place-items-center bg-background px-4 py-10">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-2 mb-8 justify-center">
          <div className="h-10 w-10 rounded-md bg-gradient-primary grid place-items-center shadow-glow">
            <Leaf className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <div className="text-base font-semibold">GeoTerra</div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Inteligência Territorial</div>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-6 shadow-panel">
          <h1 className="text-xl font-semibold tracking-tight">Você foi convidado</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Para entrar em <strong className="text-foreground">{invite!.organizations?.name ?? "uma organização"}</strong> como{" "}
            <span className="inline-flex items-center gap-1 text-primary">
              <ShieldCheck className="h-3.5 w-3.5" /> {ROLE_LABEL[invite!.role]}
            </span>
          </p>

          <form onSubmit={submit} className="mt-5 space-y-4">
            <div>
              <label className="text-xs font-medium">E-mail</label>
              <input
                type="email" value={invite!.email} disabled
                className="mt-1 h-10 w-full rounded-md border border-input bg-muted/30 px-3 text-sm text-muted-foreground"
              />
            </div>
            <div>
              <label className="text-xs font-medium">Nome completo</label>
              <input
                required value={fullName} onChange={(e) => setFullName(e.target.value)}
                className="mt-1 h-10 w-full rounded-md border border-input bg-input/40 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="text-xs font-medium">Defina uma senha</label>
              <input
                type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)}
                className="mt-1 h-10 w-full rounded-md border border-input bg-input/40 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <button
              type="submit" disabled={submitting}
              className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-primary text-primary-foreground h-10 text-sm font-medium hover:opacity-90 disabled:opacity-60"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />} Aceitar e criar conta
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
