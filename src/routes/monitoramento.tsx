import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { imoveis } from "@/lib/mock-data";
import { Eye, EyeOff, Bell, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/monitoramento")({
  head: () => ({ meta: [{ title: "Monitoramento — GeoTerra" }] }),
  component: Monitoramento,
});

function Monitoramento() {
  return (
    <AppLayout title="Monitoramento de Imóveis" subtitle="Verificação contínua de mudanças relevantes">
      <div className="p-6 space-y-4">
        <div className="rounded-xl border border-border bg-gradient-surface p-5">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-md bg-primary/15 text-primary grid place-items-center">
              <Bell className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold">Verificação automática diária</h3>
              <p className="text-xs text-muted-foreground">Você é notificado sobre alterações no CAR, novos alertas de desmatamento, alterações fundiárias e interseções com áreas embargadas.</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {imoveis.map((im) => (
            <div key={im.id} className="rounded-xl border border-border bg-card p-4 flex flex-col gap-3">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-sm font-semibold">{im.nome}</div>
                  <div className="text-[11px] text-muted-foreground inline-flex items-center gap-1 mt-0.5">
                    <MapPin className="h-3 w-3" /> {im.municipio}/{im.uf}
                  </div>
                </div>
                {im.monitorado ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-success/30 bg-success/10 text-success text-[10px] px-2 py-0.5">
                    <Eye className="h-3 w-3" /> Ativo
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/30 text-muted-foreground text-[10px] px-2 py-0.5">
                    <EyeOff className="h-3 w-3" /> Pausado
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="rounded-md border border-border bg-background/40 p-2">
                  <div className="text-muted-foreground">Área</div>
                  <div className="font-mono mt-0.5">{im.area_ha.toLocaleString("pt-BR")} ha</div>
                </div>
                <div className="rounded-md border border-border bg-background/40 p-2">
                  <div className="text-muted-foreground">Alertas</div>
                  <div className={cn("mt-0.5 font-mono", im.desmatamento_alertas ? "text-warning" : "")}>
                    {im.desmatamento_alertas ?? 0}
                  </div>
                </div>
              </div>
              <button className={cn(
                "h-9 rounded-md text-xs font-medium transition",
                im.monitorado
                  ? "border border-border bg-card hover:bg-accent/10"
                  : "bg-primary text-primary-foreground hover:opacity-90"
              )}>
                {im.monitorado ? "Pausar monitoramento" : "Ativar monitoramento"}
              </button>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
