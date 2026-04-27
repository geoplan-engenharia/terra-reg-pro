import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { alertas } from "@/lib/mock-data";
import { Bell, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/alertas")({
  head: () => ({ meta: [{ title: "Alertas — GeoTerra" }] }),
  component: Alertas,
});

const tipoLabel = {
  desmatamento: "Desmatamento",
  embargo: "Embargo",
  car: "CAR",
  fundiario: "Fundiário",
  licenca: "Licença",
} as const;

function Alertas() {
  return (
    <AppLayout title="Central de Alertas" subtitle="Histórico de notificações automáticas">
      <div className="p-6">
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <ul className="divide-y divide-border">
            {alertas.map((a) => (
              <li key={a.id} className="px-5 py-4 flex items-start gap-4 hover:bg-accent/5 transition">
                <div className={cn("h-9 w-9 rounded-md grid place-items-center shrink-0",
                  a.severidade === "alta" ? "bg-destructive/15 text-destructive"
                    : a.severidade === "media" ? "bg-warning/15 text-warning"
                    : "bg-success/15 text-success"
                )}>
                  {a.severidade === "baixa" ? <Bell className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold">{a.titulo}</span>
                    <span className="text-[10px] uppercase tracking-wider rounded border border-border bg-muted/30 px-1.5 py-0.5">
                      {tipoLabel[a.tipo]}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">{a.imovel_nome}</div>
                  <p className="text-xs text-foreground/80 mt-1.5">{a.descricao}</p>
                </div>
                <div className="text-[11px] text-muted-foreground font-mono whitespace-nowrap">
                  {new Date(a.data).toLocaleDateString("pt-BR")}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </AppLayout>
  );
}
