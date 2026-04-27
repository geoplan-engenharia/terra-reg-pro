import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { Plus, Building2, User } from "lucide-react";

export const Route = createFileRoute("/clientes")({
  head: () => ({ meta: [{ title: "Clientes — GeoTerra" }] }),
  component: Clientes,
});

const clientes = [
  { id: "c-1", nome: "João Carlos Pereira", doc: "CPF 123.456.789-00", tipo: "PF", imoveis: 1, ativo: true },
  { id: "c-2", nome: "Maria Aparecida Souza", doc: "CPF 987.654.321-00", tipo: "PF", imoveis: 1, ativo: true },
  { id: "c-3", nome: "Agropecuária Horizonte Ltda.", doc: "CNPJ 12.345.678/0001-90", tipo: "PJ", imoveis: 1, ativo: true },
  { id: "c-4", nome: "Roberto Mendes Silva", doc: "CPF 222.333.444-55", tipo: "PF", imoveis: 1, ativo: true },
  { id: "c-5", nome: "Cooperativa Rural União", doc: "CNPJ 98.765.432/0001-10", tipo: "PJ", imoveis: 1, ativo: true },
];

function Clientes() {
  return (
    <AppLayout title="Clientes" subtitle="Cadastro de clientes e vínculo com imóveis">
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">{clientes.length} clientes cadastrados</p>
          <button className="inline-flex items-center gap-2 rounded-md bg-primary text-primary-foreground h-9 px-4 text-sm font-medium hover:opacity-90 transition shadow-glow">
            <Plus className="h-4 w-4" /> Novo cliente
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {clientes.map((c) => (
            <div key={c.id} className="rounded-xl border border-border bg-card p-4 flex gap-3 hover:border-primary/40 transition">
              <div className="h-11 w-11 rounded-md bg-gradient-primary text-primary-foreground grid place-items-center shrink-0">
                {c.tipo === "PJ" ? <Building2 className="h-5 w-5" /> : <User className="h-5 w-5" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold truncate">{c.nome}</div>
                <div className="text-[11px] text-muted-foreground font-mono mt-0.5">{c.doc}</div>
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-[10px] uppercase tracking-wider rounded border border-border bg-muted/30 px-1.5 py-0.5">{c.tipo}</span>
                  <span className="text-[11px] text-muted-foreground">{c.imoveis} imóvel{c.imoveis > 1 ? "is" : ""} vinculado{c.imoveis > 1 ? "s" : ""}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
