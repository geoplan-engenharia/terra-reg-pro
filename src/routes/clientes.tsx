import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { useClients, useCreateClient } from "@/lib/queries";
import { useAuth } from "@/lib/auth";
import { Plus, Building2, User, X, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/clientes")({
  head: () => ({ meta: [{ title: "Clientes — GeoTerra" }] }),
  component: Clientes,
});

function Clientes() {
  const { data: clientes = [], isLoading } = useClients();
  const create = useCreateClient();
  const { profile, canEditClients } = useAuth();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", document: "", email: "", phone: "" });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    try {
      await create.mutateAsync({ ...form, organization_id: profile.organization_id });
      toast.success("Cliente cadastrado!");
      setOpen(false); setForm({ name: "", document: "", email: "", phone: "" });
    } catch (e) { toast.error((e as Error).message); }
  };

  return (
    <AppLayout title="Clientes" subtitle="Cadastro de clientes e vínculo com imóveis">
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">{clientes.length} cliente{clientes.length !== 1 ? "s" : ""} cadastrado{clientes.length !== 1 ? "s" : ""}</p>
          {canEditClients && (
            <button onClick={() => setOpen(true)} className="inline-flex items-center gap-2 rounded-md bg-primary text-primary-foreground h-9 px-4 text-sm font-medium hover:opacity-90 shadow-glow">
              <Plus className="h-4 w-4" /> Novo cliente
            </button>
          )}
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground text-sm">Carregando…</div>
        ) : clientes.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-border rounded-xl text-sm text-muted-foreground">
            Nenhum cliente cadastrado.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {clientes.map((c) => {
              const isPJ = (c.document ?? "").includes("CNPJ");
              return (
                <div key={c.id} className="rounded-xl border border-border bg-card p-4 flex gap-3 hover:border-primary/40 transition">
                  <div className="h-11 w-11 rounded-md bg-gradient-primary text-primary-foreground grid place-items-center shrink-0">
                    {isPJ ? <Building2 className="h-5 w-5" /> : <User className="h-5 w-5" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold truncate">{c.name}</div>
                    <div className="text-[11px] text-muted-foreground font-mono mt-0.5">{c.document ?? "—"}</div>
                    {c.email && <div className="text-[11px] text-muted-foreground mt-0.5 truncate">{c.email}</div>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 backdrop-blur-sm p-4">
          <form onSubmit={submit} className="w-full max-w-md rounded-xl border border-border bg-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Novo cliente</h2>
              <button type="button" onClick={() => setOpen(false)} className="h-7 w-7 grid place-items-center rounded hover:bg-accent/10"><X className="h-4 w-4" /></button>
            </div>
            <div className="space-y-3">
              {(["name", "document", "email", "phone"] as const).map((k) => (
                <div key={k}>
                  <label className="text-xs font-medium capitalize">{k === "name" ? "Nome" : k === "document" ? "CPF/CNPJ" : k === "email" ? "E-mail" : "Telefone"}</label>
                  <input required={k === "name"} value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })}
                    className="mt-1 h-9 w-full rounded-md border border-input bg-input/40 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
              ))}
            </div>
            <button type="submit" disabled={create.isPending}
              className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-primary text-primary-foreground h-9 text-sm font-medium hover:opacity-90 disabled:opacity-60">
              {create.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Salvar
            </button>
          </form>
        </div>
      )}
    </AppLayout>
  );
}
