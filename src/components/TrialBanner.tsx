import { Link } from "@tanstack/react-router";
import { Clock, AlertTriangle, Ban, Sparkles } from "lucide-react";
import { useTrialStatus } from "@/lib/trial";
import { cn } from "@/lib/utils";

export function TrialBanner() {
  const trial = useTrialStatus();
  if (!trial.isTrial && !trial.isBlocked) return null;

  let tone: "info" | "warn" | "danger" = "info";
  let Icon = Clock;
  let message = "";

  if (trial.isBlocked) {
    tone = "danger";
    Icon = Ban;
    message = "🚫 Seu teste expirou — escolha um plano para continuar usando o GeoTerra.";
  } else if (trial.daysLeft !== null && trial.daysLeft <= 2) {
    tone = "warn";
    Icon = AlertTriangle;
    message = `⚠️ Últimos dias do seu teste grátis — ${trial.daysLeft} dia${trial.daysLeft === 1 ? "" : "s"} restante${trial.daysLeft === 1 ? "" : "s"}.`;
  } else if (trial.isActiveTrial && trial.daysLeft !== null) {
    tone = "info";
    Icon = Clock;
    message = `⏳ Teste grátis — ${trial.daysLeft} dia${trial.daysLeft === 1 ? "" : "s"} restante${trial.daysLeft === 1 ? "" : "s"}.`;
  } else {
    return null;
  }

  const styles = {
    info: "border-info/40 bg-info/10 text-info",
    warn: "border-warning/40 bg-warning/10 text-warning",
    danger: "border-destructive/40 bg-destructive/10 text-destructive",
  }[tone];

  return (
    <div className={cn("flex items-center justify-between gap-3 border-b px-6 py-2 text-sm", styles)}>
      <div className="flex items-center gap-2 min-w-0">
        <Icon className="h-4 w-4 shrink-0" />
        <span className="truncate">{message}</span>
      </div>
      <Link
        to="/precos"
        className="inline-flex shrink-0 items-center gap-1 rounded-md border border-current/40 bg-background/40 px-3 py-1 text-xs font-medium hover:bg-background/60"
      >
        <Sparkles className="h-3 w-3" /> Ver planos
      </Link>
    </div>
  );
}
