import { Link } from "@tanstack/react-router";
import { AlertTriangle, ArrowUpRight } from "lucide-react";
import { useCurrentSubscription, useUsageCounts } from "@/lib/queries";

type Resource = "properties" | "users" | "licenses";

const LABELS: Record<Resource, { name: string; key: "max_properties" | "max_users" | "max_licenses" }> = {
  properties: { name: "imóveis", key: "max_properties" },
  users: { name: "usuários", key: "max_users" },
  licenses: { name: "licenças", key: "max_licenses" },
};

export function PlanLimitNotice({ resource }: { resource: Resource }) {
  const sub = useCurrentSubscription();
  const usage = useUsageCounts();

  const plan = sub.data?.plan;
  const u = usage.data;
  if (!plan || !u) return null;

  const label = LABELS[resource];
  const max = plan[label.key];
  const used = u[resource];

  if (max >= 100000) return null; // unlimited
  if (used < max) return null;

  return (
    <div className="flex items-start gap-2.5 rounded-md border border-warning/40 bg-warning/10 p-3 text-xs text-warning">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="flex-1">
        <div className="font-medium">
          Você atingiu o limite de {label.name} do plano atual ({used}/{max}).
        </div>
        <div className="mt-0.5 text-warning/90">
          Por enquanto a ação continua liberada, mas considere fazer upgrade.
        </div>
      </div>
      <Link
        to="/precos"
        className="inline-flex items-center gap-1 rounded-md border border-warning/40 bg-background/40 px-2 py-1 text-[11px] font-medium text-warning hover:bg-background/60"
      >
        Ver planos <ArrowUpRight className="h-3 w-3" />
      </Link>
    </div>
  );
}
