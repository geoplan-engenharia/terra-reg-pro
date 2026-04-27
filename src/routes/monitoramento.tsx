import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { useProperties, useToggleMonitor } from "@/lib/queries";
import { useAuth } from "@/lib/auth";
import { Eye, EyeOff, Bell, MapPin, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/monitoramento")({
  head: () => ({ meta: [{ title: "Monitoramento — GeoTerra" }] }),
  component: Monitoramento,
});

function Monitoramento() {
  const { data: items = [], isLoading } = useProperties();
  const toggle = useToggleMonitor();
  const { canEditProperties } = useAuth();

  const handle = async (id: string, monitorado: boolean) => {
    try { await toggle.mutateAsync({ id, monitorado }); toast.success(monitorado ? "Monitoramento ativo" : "Monitoramento pausado"); }
    catch (e) { toast.error((e as Error).message); }
  };

  return (
    <AppLayout title="Monitoramento de Imóveis" subtitle="Verificação contínua de mudanças relevantes">
      <div className="p-6 space-y-4">
        <div className="rounded-xl border border-border bg-gradient-surface p-5">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-md bg-primary/15 text-primary grid place-items-center"><Bell className="h-5 w-5" /></div>
            <div>
              <h3 className="text-sm font-semibold">Verificação automática</h3>
              <p className="text-xs text-muted-foreground">Acompanha alterações no CAR, novos alertas de desmatamento e interseções com áreas embargadas.</p>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-sm text-muted-foreground">Carregando…</div>
        ) : items.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-border rounded-xl text-sm text-muted-foreground">
            Nenhum imóvel cadastrado.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((im) => (
              <div key={im.id} className="rounded-xl border border-border bg-card p-4 flex flex-col gap-3">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-sm font-semibold">{im.name}</div>
                    <div className="text-[11px] text-muted-foreground inline-flex items-center gap-1 mt-0.5">
                      <MapPin className="h-3 w-3" /> {im.municipio}/{im.uf}
                    </div>
                  </div>
                  {im.monitorado ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-success/30 bg-success/10 text-success text-[10px] px-2 py-0.5"><Eye className="h-3 w-3" /> Ativo</span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/30 text-muted-foreground text-[10px] px-2 py-0.5"><EyeOff className="h-3 w-3" /> Pausado</span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="rounded-md border border-border bg-background/40 p-2">
                    <div className="text-muted-foreground">Área</div>
                    <div className="font-mono mt-0.5">{(im.area_ha ?? 0).toLocaleString("pt-BR")} ha</div>
                  </div>
                  <div className="rounded-md border border-border bg-background/40 p-2">
                    <div className="text-muted-foreground">CAR</div>
                    <div className="mt-0.5 capitalize">{im.car_status}</div>
                  </div>
                </div>
                <button disabled={!canEditProperties || toggle.isPending}
                  onClick={() => handle(im.id, !im.monitorado)}
                  className={cn(
                    "h-9 rounded-md text-xs font-medium transition inline-flex items-center justify-center gap-2 disabled:opacity-60",
                    im.monitorado ? "border border-border bg-card hover:bg-accent/10" : "bg-primary text-primary-foreground hover:opacity-90"
                  )}>
                  {toggle.isPending && <Loader2 className="h-3 w-3 animate-spin" />}
                  {im.monitorado ? "Pausar monitoramento" : "Ativar monitoramento"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
