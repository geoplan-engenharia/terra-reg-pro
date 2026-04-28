import { Link } from "@tanstack/react-router";
import { Check, Circle, Sparkles } from "lucide-react";
import { useOnboardingProgress } from "@/lib/trial";
import { cn } from "@/lib/utils";

export function OnboardingChecklist() {
  const progress = useOnboardingProgress();
  const data = progress.data;
  if (!data) return null;

  const steps = [
    { key: "has_created_client" as const, label: "Criou cliente", to: "/clientes" },
    { key: "has_created_property" as const, label: "Criou imóvel", to: "/mapa" },
    { key: "has_run_diagnosis" as const, label: "Rodou diagnóstico", to: "/mapa" },
    { key: "has_generated_report" as const, label: "Gerou relatório", to: "/mapa" },
  ];

  const completed = steps.filter((s) => data[s.key]).length;
  const total = steps.length;
  if (completed === total) return null; // ocultar quando 100%

  const pct = Math.round((completed / total) * 100);

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">Seu progresso no GeoTerra</h3>
        </div>
        <span className="text-xs text-muted-foreground font-mono">{completed}/{total}</span>
      </div>
      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted/40">
        <div className="h-full rounded-full bg-gradient-primary transition-all" style={{ width: `${Math.max(4, pct)}%` }} />
      </div>
      <ul className="mt-4 space-y-2">
        {steps.map((s) => {
          const done = Boolean(data[s.key]);
          return (
            <li key={s.key}>
              <Link
                to={s.to}
                className={cn(
                  "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
                  done ? "text-muted-foreground line-through" : "hover:bg-accent/10"
                )}
              >
                {done ? (
                  <Check className="h-4 w-4 text-success" />
                ) : (
                  <Circle className="h-4 w-4 text-muted-foreground" />
                )}
                {s.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
