import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Leaf, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/signup")({
  head: () => ({ meta: [{ title: "Criar conta — GeoTerra" }] }),
  validateSearch: (s: Record<string, unknown>) => ({ invite: typeof s.invite === "string" ? s.invite : undefined }),
  component: SignupPage,
});

function SignupPage() {
  const navigate = useNavigate();
  const { invite } = useSearch({ from: "/signup" });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [orgName, setOrgName] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email, password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: {
          full_name: fullName,
          org_name: invite ? undefined : orgName,
          invite_token: invite,
        },
      },
    });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success(invite ? "Conta criada! Você foi adicionado ao escritório." : "Escritório criado com sucesso!");
    navigate({ to: "/" });
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      <div className="hidden lg:flex relative overflow-hidden bg-gradient-surface border-r border-border">
        <div className="absolute inset-0 bg-gradient-primary opacity-10 blur-3xl" />
        <div className="relative z-10 p-12 flex flex-col justify-between">
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-md bg-gradient-primary grid place-items-center shadow-glow"><Leaf className="h-5 w-5 text-primary-foreground" /></div>
            <div>
              <div className="text-base font-semibold">GeoTerra</div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Inteligência Territorial</div>
            </div>
          </div>
          <div>
            <h2 className="text-3xl font-semibold tracking-tight">Crie seu escritório.</h2>
            <p className="mt-3 text-sm text-muted-foreground max-w-md">Cadastre clientes, imóveis, monitore licenças e gere diagnósticos automatizados.</p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center p-6">
        <form onSubmit={submit} className="w-full max-w-sm space-y-5">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{invite ? "Aceitar convite" : "Criar conta"}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {invite ? "Você foi convidado para um escritório." : "Você se torna admin do novo escritório."}
            </p>
          </div>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium">Nome completo</label>
              <input required value={fullName} onChange={(e) => setFullName(e.target.value)}
                className="mt-1 h-10 w-full rounded-md border border-input bg-input/40 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            {!invite && (
              <div>
                <label className="text-xs font-medium">Nome do escritório</label>
                <input required value={orgName} onChange={(e) => setOrgName(e.target.value)}
                  className="mt-1 h-10 w-full rounded-md border border-input bg-input/40 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
            )}
            <div>
              <label className="text-xs font-medium">E-mail</label>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                className="mt-1 h-10 w-full rounded-md border border-input bg-input/40 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="text-xs font-medium">Senha</label>
              <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)}
                className="mt-1 h-10 w-full rounded-md border border-input bg-input/40 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
          </div>
          <button type="submit" disabled={loading}
            className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-primary text-primary-foreground h-10 text-sm font-medium hover:opacity-90 transition disabled:opacity-60">
            {loading && <Loader2 className="h-4 w-4 animate-spin" />} Criar conta
          </button>
          <p className="text-xs text-muted-foreground text-center">
            Já tem conta? <Link to="/login" className="text-primary hover:underline">Entrar</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
