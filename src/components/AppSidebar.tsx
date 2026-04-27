import { Link, useLocation } from "@tanstack/react-router";
import { LayoutDashboard, Map, Eye, FileCheck2, Users, Bell, Leaf, UserCog, History, Database, Sliders, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";

const items = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/mapa", icon: Map, label: "Mapa" },
  { to: "/monitoramento", icon: Eye, label: "Monitoramento" },
  { to: "/licencas", icon: FileCheck2, label: "Licenças" },
  { to: "/clientes", icon: Users, label: "Clientes" },
  { to: "/alertas", icon: Bell, label: "Alertas" },
  { to: "/historico", icon: History, label: "Histórico" },
  { to: "/fontes-dados", icon: Database, label: "Fontes de Dados" },
  { to: "/regras-diagnostico", icon: Sliders, label: "Regras de Diagnóstico" },
  { to: "/configuracoes", icon: Settings, label: "Configurações" },
] as const;

export function AppSidebar() {
  const { pathname } = useLocation();
  const { isAdmin, profile } = useAuth();
  return (
    <aside className="hidden md:flex w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
      <div className="flex h-16 items-center gap-2 px-5 border-b border-sidebar-border">
        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-gradient-primary shadow-glow">
          <Leaf className="h-5 w-5 text-primary-foreground" />
        </div>
        <div className="leading-tight">
          <div className="text-sm font-semibold tracking-tight">GeoTerra</div>
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Inteligência Territorial</div>
        </div>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {items.map((it) => {
          const active = it.to === "/" ? pathname === "/" : pathname.startsWith(it.to);
          const Icon = it.icon;
          return (
            <Link
              key={it.to}
              to={it.to}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium border-l-2 border-primary pl-[10px]"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {it.label}
            </Link>
          );
        })}
        {isAdmin && (
          <Link
            to="/membros"
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors mt-4 border-t border-sidebar-border pt-4",
              pathname.startsWith("/membros")
                ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
            )}
          >
            <UserCog className="h-4 w-4" />
            Membros
          </Link>
        )}
      </nav>
      <div className="p-4 border-t border-sidebar-border text-xs text-muted-foreground">
        <div className="rounded-md border border-sidebar-border bg-sidebar-accent/30 p-3">
          <div className="font-medium text-sidebar-foreground truncate">{profile?.organization_name ?? "Organização"}</div>
          <div className="mt-1 text-[11px]">{profile?.full_name ?? profile?.email}</div>
        </div>
      </div>
    </aside>
  );
}
