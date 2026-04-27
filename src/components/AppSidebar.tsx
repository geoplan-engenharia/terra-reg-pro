import { Link, useLocation } from "@tanstack/react-router";
import { LayoutDashboard, Map, Eye, FileCheck2, Users, Bell, Leaf } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/mapa", icon: Map, label: "Mapa" },
  { to: "/monitoramento", icon: Eye, label: "Monitoramento" },
  { to: "/licencas", icon: FileCheck2, label: "Licenças" },
  { to: "/clientes", icon: Users, label: "Clientes" },
  { to: "/alertas", icon: Bell, label: "Alertas" },
] as const;

export function AppSidebar() {
  const { pathname } = useLocation();
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
      </nav>
      <div className="p-4 border-t border-sidebar-border text-xs text-muted-foreground">
        <div className="rounded-md border border-sidebar-border bg-sidebar-accent/30 p-3">
          <div className="font-medium text-sidebar-foreground">Plano Pro</div>
          <div className="mt-1">450 / 1000 consultas</div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-sidebar-border">
            <div className="h-full bg-gradient-primary" style={{ width: "45%" }} />
          </div>
        </div>
      </div>
    </aside>
  );
}
