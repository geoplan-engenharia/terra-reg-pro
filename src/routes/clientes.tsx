import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { useClients, useCreateClient, useUpdateClient, useDeleteClient } from "@/lib/queries";
import { useAuth } from "@/lib/auth";
import { Plus, Building2, User, X, Loader2, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { CPFCNPJInput } from "@/components/CPFCNPJInput";
import { PhoneInput } from "@/components/PhoneInput";
import type { Client } from "@/lib/types";

export const Route = createFileRoute("/clientes")({
  head: () => ({ meta: [{ title: "Clientes — GeoTerra" }] }),
  component: Clientes,
});

type FormState = { name: string; document: string; email: string; phone: string };
const blank: FormState = { name: "", document: "", email: "", phone: "" };

function Clientes() {
  const { data: clientes = [], isLoading } = useClients();
  const create = useCreateClient();
  const update = useUpdateClient();
  const del = useDeleteClient();
  const { profile, canEditClients, isAdmin } = useAuth();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [form, setForm] = useState<FormState>(blank);
  const [confirmDel, setConfirmDel] = useState<Client | null>(null);

  const openNew = () => { setEditing(null); setForm(blank); setOpen(true); };
  const openEdit = (c: Client) => {
    setEditing(c);
    setForm({
      name: c.name ?? "",
      document: c.document ?? "",
      email: c.email ?? "",
      phone: c.phone ?? "",
    });
    setOpen(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    try {
      if (editing) {
        await update.mutateAsync({ id: editing.id, patch: form });
        toast.success("Cliente atualizado!");
      } else {
        await create.mutateAsync({ ...form, organization_id: profile.organization_id });
        toast.success("Cliente cadastrado!");
      }
      setOpen(false); setEditing(null); setForm(blank);
    } catch (err) { toast.error((err as Error).message); }
  };

  const handleDelete = async () => {
    if (!confirmDel) return;
    try {
      await del.mutateAsync(confirmDel.id);
      toast.success("Cliente excluído");
      setConfirmDel(null);
    } catch (err) { toast.error((err as Error).message); }
  };

  return (
    <AppLayout title="Clientes" subtitle="Cadastro de clientes e vínculo com imóveis">
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">{clientes.length} cliente{clientes.length !== 1 ? "s" : ""} cadastrado{clientes.length !== 1 ? "s" : ""}</p>
          {canEditClients && (
            <button onClick={openNew} className="inline-flex items-center gap-2 rounded-md bg-primary text-primary-foreground h-9 px-4 text-sm font-medium hover:opacity-90 shadow-glow">
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
                <div key={c.id} className="rounded-xl border border-border bg-card p-4 flex gap-3 hover:border-primary/40 transition group">
                  <div className="h-11 w-11 rounded-md bg-gradient-primary text-primary-foreground grid place-items-center shrink-0">
                    {isPJ ? <Building2 className="h-5 w-5" /> : <User className="h-5 w-5" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold truncate">{c.name}</div>
                    <div className="text-[11px] text-muted-foreground font-mono mt-0.5">{c.document ?? "—"}</div>
                    {c.email && <div className="text-[11px] text-muted-foreground mt-0.5 truncate">{c.email}</div>}
                    {c.phone && <div className="text-[11px] text-muted-foreground mt-0.5 truncate">{c.phone}</div>}
                  </div>
                  {canEditClients && (
                    <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition">
                      <button
                        onClick={() => openEdit(c)}
                        title="Editar"
                        className="h-7 w-7 grid place-items-center rounded-md border border-border hover:bg-accent/10"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      {isAdmin && (
                        <button
                          onClick={() => setConfirmDel(c)}
                          title="Excluir"
                          className="h-7 w-7 grid place-items-center rounded-md border border-destructive/40 text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  )}
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
              <h2 className="text-sm font-semibold">{editing ? "Editar cliente" : "Novo cliente"}</h2>
              <button type="button" onClick={() => { setOpen(false); setEditing(null); }} className="h-7 w-7 grid place-items-center rounded hover:bg-accent/10"><X className="h-4 w-4" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium">Nome</label>
                <input
                  required value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="mt-1 h-9 w-full rounded-md border border-input bg-input/40 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="text-xs font-medium">CPF/CNPJ</label>
                <div className="mt-1">
                  <CPFCNPJInput
                    value={form.document}
                    onChange={(v) => setForm({ ...form, document: v })}
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium">E-mail</label>
                <input
                  type="email" value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="mt-1 h-9 w-full rounded-md border border-input bg-input/40 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="text-xs font-medium">Telefone</label>
                <div className="mt-1">
                  <PhoneInput
                    value={form.phone}
                    onChange={(v) => setForm({ ...form, phone: v })}
                  />
                </div>
              </div>
            </div>
            <button type="submit" disabled={create.isPending || update.isPending}
              className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-primary text-primary-foreground h-9 text-sm font-medium hover:opacity-90 disabled:opacity-60">
              {(create.isPending || update.isPending) && <Loader2 className="h-4 w-4 animate-spin" />}
              {editing ? "Atualizar" : "Salvar"}
            </button>
          </form>
        </div>
      )}

      {confirmDel && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-xl border border-border bg-card p-5 space-y-4">
            <h2 className="text-sm font-semibold">Excluir cliente?</h2>
            <p className="text-xs text-muted-foreground">
              Esta ação removerá <strong className="text-foreground">{confirmDel.name}</strong> permanentemente. Imóveis e licenças vinculados podem ficar sem cliente.
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setConfirmDel(null)} className="h-9 px-3 rounded-md border border-border text-xs hover:bg-accent/10">
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={del.isPending}
                className="h-9 px-3 rounded-md bg-destructive text-destructive-foreground text-xs font-medium inline-flex items-center gap-1.5 hover:opacity-90 disabled:opacity-60"
              >
                {del.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                <Trash2 className="h-3.5 w-3.5" /> Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
