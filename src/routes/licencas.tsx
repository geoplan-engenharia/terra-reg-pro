import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { useLicenses } from "@/lib/queries";
import { Plus, Calendar, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/licencas")({
  head: () => ({ meta: [{ title: "Licenças Ambientais — GeoTerra" }] }),
  component: Licencas,
});

function diasAte(date: string | null): number | null {
  if (!date) return null;
  const d = new Date(date); const t = new Date();
  return Math.ceil((d.getTime() - t.getTime()) / (1000 * 60 * 60 * 24));
}

function getNivel(dias: number | null) {
  if (dias === null) return { label: "Sem vencimento", classes: "border-border bg-muted/30 text-muted-foreground" };
  if (dias < 0) return { label: "Vencida", classes: "border-destructive/40 bg-destructive/10 text-destructive" };
  if (dias <= 30) return { label: `Crítico (${dias}d)`, classes: "border-destructive/40 bg-destructive/10 text-destructive" };
  if (dias <= 90) return { label: `Atenção (${dias}d)`, classes: "border-warning/40 bg-warning/10 text-warning" };
  if (dias <= 180) return { label: `Aviso (${dias}d)`, classes: "border-info/40 bg-info/10 text-info" };
  return { label: `Em dia (${dias}d)`, classes: "border-success/40 bg-success/10 text-success" };
}

function Licencas() {
  const { data: licencas = [], isLoading } = useLicenses();

  return (
    <AppLayout title="Controle de Licenças Ambientais" subtitle="Alertas automáticos a 180, 90 e 30 dias do vencimento">
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-xs text-muted-foreground">{licencas.length} licença{licencas.length !== 1 ? "s" : ""}</div>
          <button className="inline-flex items-center gap-2 rounded-md bg-primary text-primary-foreground h-9 px-4 text-sm font-medium hover:opacity-90 shadow-glow">
            <Plus className="h-4 w-4" /> Nova licença
          </button>
        </div>

        <div className="rounded-xl border border-border bg-card overflow-hidden">
          {isLoading ? (
            <div className="p-10 text-center text-sm text-muted-foreground">Carregando…</div>
          ) : licencas.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">Nenhuma licença cadastrada.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-background/40 text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr className="text-left">
                  <th className="px-5 py-3 font-medium">Tipo</th>
                  <th className="px-3 py-3 font-medium">Imóvel</th>
                  <th className="px-3 py-3 font-medium">Cliente</th>
                  <th className="px-3 py-3 font-medium">Emissão</th>
                  <th className="px-3 py-3 font-medium">Vencimento</th>
                  <th className="px-5 py-3 font-medium text-right">Status</th>
                </tr>
              </thead>
              <tbody>
                {licencas.map((l) => {
                  const dias = diasAte(l.expiration_date);
                  const nivel = getNivel(dias);
                  return (
                    <tr key={l.id} className="border-t border-border hover:bg-accent/5">
                      <td className="px-5 py-3">
                        <span className="inline-flex items-center justify-center font-mono text-[11px] font-semibold h-6 px-2 rounded bg-primary/15 text-primary border border-primary/30">{l.license_type}</span>
                      </td>
                      <td className="px-3 py-3 text-xs font-medium">{l.property_name ?? "—"}</td>
                      <td className="px-3 py-3 text-xs text-muted-foreground">{l.client_name ?? "—"}</td>
                      <td className="px-3 py-3 text-xs font-mono">{l.issue_date ? new Date(l.issue_date).toLocaleDateString("pt-BR") : "—"}</td>
                      <td className="px-3 py-3 text-xs font-mono">
                        <div className="inline-flex items-center gap-1.5">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          {l.expiration_date ? new Date(l.expiration_date).toLocaleDateString("pt-BR") : "—"}
                        </div>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <span className={cn("inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px]", nivel.classes)}>
                          {dias !== null && dias <= 90 && <AlertTriangle className="h-3 w-3" />}
                          {nivel.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
