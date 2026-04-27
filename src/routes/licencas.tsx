import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { Plus, Calendar, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/licencas")({
  head: () => ({ meta: [{ title: "Licenças Ambientais — GeoTerra" }] }),
  component: Licencas,
});

const licencas = [
  { id: "lc-1", tipo: "LO", imovel: "Estância Santa Clara", cliente: "Agropecuária Horizonte Ltda.", emissao: "2023-07-15", vencimento: "2026-07-25", diasRestantes: 89 },
  { id: "lc-2", tipo: "LI", imovel: "Fazenda Boa Vista", cliente: "João Carlos Pereira", emissao: "2024-02-10", vencimento: "2026-08-10", diasRestantes: 105 },
  { id: "lc-3", tipo: "LP", imovel: "Sítio Recanto Verde", cliente: "Cooperativa Rural União", emissao: "2025-01-20", vencimento: "2027-01-20", diasRestantes: 268 },
  { id: "lc-4", tipo: "LO", imovel: "Sítio Três Irmãos", cliente: "Maria Aparecida Souza", emissao: "2022-05-30", vencimento: "2026-05-12", diasRestantes: 15 },
];

function getNivel(dias: number) {
  if (dias <= 30) return { label: "Crítico (30d)", classes: "border-destructive/40 bg-destructive/10 text-destructive" };
  if (dias <= 90) return { label: "Atenção (90d)", classes: "border-warning/40 bg-warning/10 text-warning" };
  if (dias <= 180) return { label: "Aviso (180d)", classes: "border-info/40 bg-info/10 text-info" };
  return { label: "Em dia", classes: "border-success/40 bg-success/10 text-success" };
}

function Licencas() {
  return (
    <AppLayout title="Controle de Licenças Ambientais" subtitle="Alertas automáticos a 180, 90 e 30 dias do vencimento">
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            {["Todas", "LP", "LI", "LO"].map((f, i) => (
              <button key={f} className={cn(
                "h-8 px-3 rounded-md text-xs border transition",
                i === 0 ? "bg-primary text-primary-foreground border-primary" : "border-border bg-card hover:bg-accent/10"
              )}>{f}</button>
            ))}
          </div>
          <button className="inline-flex items-center gap-2 rounded-md bg-primary text-primary-foreground h-9 px-4 text-sm font-medium hover:opacity-90 transition shadow-glow">
            <Plus className="h-4 w-4" /> Nova licença
          </button>
        </div>

        <div className="rounded-xl border border-border bg-card overflow-hidden">
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
                const nivel = getNivel(l.diasRestantes);
                return (
                  <tr key={l.id} className="border-t border-border hover:bg-accent/5">
                    <td className="px-5 py-3">
                      <span className="inline-flex items-center justify-center font-mono text-[11px] font-semibold h-6 px-2 rounded bg-primary/15 text-primary border border-primary/30">{l.tipo}</span>
                    </td>
                    <td className="px-3 py-3 text-xs font-medium">{l.imovel}</td>
                    <td className="px-3 py-3 text-xs text-muted-foreground">{l.cliente}</td>
                    <td className="px-3 py-3 text-xs font-mono">{new Date(l.emissao).toLocaleDateString("pt-BR")}</td>
                    <td className="px-3 py-3 text-xs font-mono">
                      <div className="inline-flex items-center gap-1.5">
                        <Calendar className="h-3 w-3 text-muted-foreground" />
                        {new Date(l.vencimento).toLocaleDateString("pt-BR")}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <span className={cn("inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px]", nivel.classes)}>
                        {l.diasRestantes <= 90 && <AlertTriangle className="h-3 w-3" />}
                        {nivel.label} · {l.diasRestantes}d
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </AppLayout>
  );
}
