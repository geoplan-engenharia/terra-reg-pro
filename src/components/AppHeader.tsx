import { Search, Bell } from "lucide-react";

export function AppHeader({ title, subtitle }: { title: string; subtitle?: string }) {
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
        <button className="relative h-9 w-9 rounded-md border border-border bg-card hover:bg-accent/10 grid place-items-center">
          <Bell className="h-4 w-4" />
          <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-destructive" />
        </button>
        <div className="h-9 w-9 rounded-full bg-gradient-primary grid place-items-center text-sm font-semibold text-primary-foreground">
          RA
        </div>
      </div>
    </header>
  );
}
