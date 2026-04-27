import { useEffect, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import {
  ShieldCheck,
  LayoutDashboard,
  Building2,
  Users,
  Tag,
  DollarSign,
  Bug,
  ArrowLeft,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

const items: ReadonlyArray<{ to: string; icon: typeof LayoutDashboard; label: string; exact?: boolean }> = [
  { to: "/admin", icon: LayoutDashboard, label: "Dashboard", exact: true },
  { to: "/admin/organizacoes", icon: Building2, label: "Organizações" },
  { to: "/admin/usuarios", icon: Users, label: "Usuários" },
  { to: "/admin/planos", icon: Tag, label: "Planos" },
  { to: "/admin/financeiro", icon: DollarSign, label: "Financeiro" },
  { to: "/admin/bugs", icon: Bug, label: "Bugs / Suporte" },
];

export function AdminLayout({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  const { session, loading, isSuperAdmin, profile } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/login" });
    else if (!loading && session && profile && !isSuperAdmin) navigate({ to: "/" });
  }, [loading, session, isSuperAdmin, profile, navigate]);

  if (loading || !session || !profile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="text-xs">Carregando…</span>
        </div>
      </div>
    );
  }

  if (!isSuperAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-foreground p-6">
        <div className="max-w-md text-center space-y-3">
          <ShieldCheck className="h-10 w-10 mx-auto text-destructive" />
          <h1 className="text-xl font-semibold">Acesso restrito</h1>
          <p className="text-sm text-muted-foreground">
            Esta área é exclusiva para super administradores da plataforma.
          </p>
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-primary hover:underline">
            <ArrowLeft className="h-4 w-4" /> Voltar para o app
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background text-foreground">
      <aside className="hidden md:flex w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
        <div className="flex h-16 items-center gap-2 px-5 border-b border-sidebar-border">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-destructive/20 border border-destructive/40">
            <ShieldCheck className="h-5 w-5 text-destructive" />
          </div>
          <div className="leading-tight">
            <div className="text-sm font-semibold tracking-tight">Admin GeoTerra</div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Painel da Plataforma</div>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {items.map((it) => {
            const active = it.exact ? pathname === it.to : pathname.startsWith(it.to);
            const Icon = it.icon;
            return (
              <Link
                key={it.to}
                to={it.to as never}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium border-l-2 border-destructive pl-[10px]"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                {it.label}
              </Link>
            );
          })}
          <Link
            to="/"
            className="mt-4 flex items-center gap-3 rounded-md px-3 py-2 text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent/40 border-t border-sidebar-border pt-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar ao app
          </Link>
        </nav>
        <div className="p-4 border-t border-sidebar-border text-xs text-muted-foreground">
          <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3">
            <div className="font-medium text-destructive">Super Admin</div>
            <div className="mt-1 text-[11px]">{profile.email}</div>
          </div>
        </div>
      </aside>
      <div className="flex flex-1 flex-col min-w-0">
        <header className="h-16 border-b border-border bg-card/60 backdrop-blur px-6 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          </div>
          <div className="text-[11px] uppercase tracking-widest text-destructive font-medium">
            Modo Plataforma
          </div>
        </header>
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
