import { Search, Bell, LogOut, HelpCircle } from "lucide-react";
import { useAuth, ROLE_LABEL } from "@/lib/auth";
import { useNavigate } from "@tanstack/react-router";

export function AppHeader({ title, subtitle, onOpenTutorial }: { title: string; subtitle?: string; onOpenTutorial?: () => void }) {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const initials = (profile?.full_name ?? profile?.email ?? "?")
    .split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();
  const role = profile?.roles[0];

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-card/50 backdrop-blur px-6">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-3">
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            placeholder="Buscar imóvel, CAR, matrícula..."
            className="h-9 w-80 rounded-md border border-input bg-input/40 pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        {onOpenTutorial && (
          <button
            onClick={onOpenTutorial}
            className="hidden sm:inline-flex items-center gap-1.5 h-9 rounded-md border border-border bg-card hover:bg-accent/10 px-3 text-xs"
            aria-label="Tutorial"
            title="Reabrir tutorial"
          >
            <HelpCircle className="h-4 w-4 text-primary" />
            Tutorial
          </button>
        )}
        <button className="relative h-9 w-9 rounded-md border border-border bg-card hover:bg-accent/10 grid place-items-center" aria-label="Notificações">
          <Bell className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-2 pl-2 border-l border-border">
          <div className="text-right hidden sm:block">
            <div className="text-xs font-medium leading-tight">{profile?.full_name ?? profile?.email ?? "Usuário"}</div>
            <div className="text-[10px] text-muted-foreground leading-tight">
              {profile?.organization_name}{role ? ` · ${ROLE_LABEL[role]}` : ""}
            </div>
          </div>
          <div className="h-9 w-9 rounded-full bg-gradient-primary grid place-items-center text-xs font-semibold text-primary-foreground">
            {initials}
          </div>
          <button onClick={async () => { await signOut(); navigate({ to: "/login" }); }}
            className="h-9 w-9 rounded-md border border-border bg-card hover:bg-accent/10 grid place-items-center" aria-label="Sair">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
