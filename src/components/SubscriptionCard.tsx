import { Link } from "@tanstack/react-router";
import { Crown, AlertTriangle, ArrowUpRight, Sparkles } from "lucide-react";
import { useCurrentSubscription, useUsageCounts } from "@/lib/queries";
import { cn } from "@/lib/utils";

const WARN_THRESHOLD = 0.8; // 80% of limit triggers warning

function pct(used: number, max: number) {
  if (!max || max <= 0) return 0;
  return Math.min(1, used / max);
}

function formatLimit(max: number) {
  if (max >= 100000) return "Ilimitado";
  return max.toLocaleString("pt-BR");
}

function UsageBar({ label, used, max }: { label: string; used: number; max: number }) {
  const ratio = pct(used, max);
  const warn = ratio >= WARN_THRESHOLD && max < 100000;
  const danger = ratio >= 1 && max < 100000;
  const barColor = danger ? "bg-destructive" : warn ? "bg-warning" : "bg-primary";
  return (
    <div>
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-muted-foreground">{label}</span>
        <span className={cn("font-mono", danger ? "text-destructive" : warn ? "text-warning" : "text-foreground/80")}>
          {used.toLocaleString("pt-BR")} / {formatLimit(max)}
        </span>
      </div>
      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted/40">
        <div
          className={cn("h-full rounded-full transition-all", barColor)}
          style={{ width: `${Math.max(2, ratio * 100)}%` }}
        />
      </div>
    </div>
  );
}

export function SubscriptionCard() {
  const sub = useCurrentSubscription();
  const usage = useUsageCounts();

  const plan = sub.data?.plan;
  const subscription = sub.data?.subscription;
  const u = usage.data ?? { properties: 0, users: 0, licenses: 0 };

  const limits = plan
    ? [
        { label: "Imóveis", used: u.properties, max: plan.max_properties },
        { label: "Usuários", used: u.users, max: plan.max_users },
        { label: "Licenças", used: u.licenses, max: plan.max_licenses },
      ]
    : [];

  const nearLimit = plan
    ? limits.some((l) => l.max < 100000 && pct(l.used, l.max) >= WARN_THRESHOLD)
    : false;

  const isTrial = subscription?.status === "trial";
  const expiresInDays = subscription?.expires_at
    ? Math.ceil((new Date(subscription.expires_at).getTime() - Date.now()) / 86400000)
    : null;

  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-card p-5">
      <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-gradient-primary opacity-10 blur-2xl" />
      <div className="relative">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/15 text-primary">
              <Crown className="h-4 w-4" />
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Plano atual</div>
              <div className="text-sm font-semibold">
                {sub.isLoading ? "—" : plan?.name ?? "Sem plano"}
                {isTrial && (
                  <span className="ml-2 rounded-full border border-info/40 bg-info/10 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-info">
                    Trial
                  </span>
                )}
              </div>
              {isTrial && expiresInDays !== null && (
                <div className="mt-0.5 text-[11px] text-muted-foreground">
                  {expiresInDays > 0
                    ? `Expira em ${expiresInDays} dia${expiresInDays === 1 ? "" : "s"}`
                    : "Trial expirado"}
                </div>
              )}
            </div>
          </div>
          <Link
            to="/precos"
            className="inline-flex items-center gap-1 rounded-md border border-primary/30 bg-primary/5 px-2.5 py-1 text-[11px] font-medium text-primary hover:bg-primary/10"
          >
            <Sparkles className="h-3 w-3" /> Ver planos
            <ArrowUpRight className="h-3 w-3" />
          </Link>
        </div>

        {plan && (
          <div className="mt-4 space-y-3">
            {limits.map((l) => (
              <UsageBar key={l.label} label={l.label} used={l.used} max={l.max} />
            ))}
          </div>
        )}

        {nearLimit && (
          <div className="mt-4 flex items-start gap-2 rounded-md border border-warning/40 bg-warning/10 p-2.5 text-[11px] text-warning">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>
              Você está próximo do limite do plano. Considere fazer upgrade para evitar
              interrupções.
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
