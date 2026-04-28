import { Link } from "@tanstack/react-router";
import { Check, Users, MapPin, Activity, FileText, X, Sparkles } from "lucide-react";
import { useOnboardingProgress, useUpdateOnboarding } from "@/lib/trial";
import { cn } from "@/lib/utils";

export function OnboardingModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const progress = useOnboardingProgress();
  const update = useUpdateOnboarding();

  if (!open) return null;

  const steps = [
    { key: "has_created_client", label: "Criar cliente", icon: Users, to: "/clientes" },
    { key: "has_created_property", label: "Criar imóvel rural", icon: MapPin, to: "/mapa" },
    { key: "has_run_diagnosis", label: "Rodar diagnóstico", icon: Activity, to: "/mapa" },
    { key: "has_generated_report", label: "Gerar relatório", icon: FileText, to: "/mapa" },
  ] as const;

  const data = progress.data;

  const handleSkip = async () => {
    await update.mutateAsync({ onboarding_dismissed: true });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-background/80 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-lg rounded-2xl border border-border bg-card p-7 shadow-2xl">
        <button
          onClick={onClose}
          aria-label="Fechar"
          className="absolute top-4 right-4 grid h-8 w-8 place-items-center rounded-md hover:bg-accent/20"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-xl bg-gradient-primary shadow-glow">
            <Sparkles className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h2 className="text-xl font-semibold tracking-tight">Bem-vindo ao GeoTerra 👋</h2>
            <p className="text-xs text-muted-foreground">Vamos guiar você nos primeiros passos</p>
          </div>
        </div>

        <p className="mt-4 text-sm text-muted-foreground">
          Vamos te guiar para configurar seu primeiro imóvel e gerar seu primeiro relatório técnico.
        </p>

        <ol className="mt-5 space-y-2.5">
          {steps.map((s, i) => {
            const done = Boolean(data?.[s.key]);
            const Icon = s.icon;
            return (
              <li
                key={s.key}
                className={cn(
                  "flex items-center gap-3 rounded-lg border p-3",
                  done ? "border-success/40 bg-success/5" : "border-border bg-background/40"
                )}
              >
                <div
                  className={cn(
                    "grid h-8 w-8 place-items-center rounded-md text-xs font-semibold",
                    done ? "bg-success/20 text-success" : "bg-primary/10 text-primary"
                  )}
                >
                  {done ? <Check className="h-4 w-4" /> : i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">{s.label}</div>
                </div>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </li>
            );
          })}
        </ol>

        <div className="mt-6 flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
          <button
            onClick={handleSkip}
            className="h-10 rounded-md border border-border bg-card px-4 text-sm hover:bg-accent/10"
          >
            Pular por enquanto
          </button>
          <Link
            to="/clientes"
            onClick={onClose}
            className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground hover:opacity-90 shadow-glow"
          >
            Começar agora
          </Link>
        </div>
      </div>
    </div>
  );
}
