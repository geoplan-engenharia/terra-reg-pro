import { useEffect, useRef, useState } from "react";
import { X, Loader2, Save, FileText, Upload, Trash2, Download, Calendar } from "lucide-react";
import { useAuth } from "@/lib/auth";
import {
  useClients,
  useProperties,
  useUpsertLicense,
  useUploadLicenseAttachment,
  useRemoveLicenseAttachment,
  getLicenseAttachmentUrl,
  type LicenseUpsertInput,
} from "@/lib/queries";
import type { EnvironmentalLicense, LicenseStatus } from "@/lib/types";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { PlanLimitNotice } from "@/components/PlanLimitNotice";

const LICENSE_TYPES = ["LP", "LI", "LO", "LAS", "LAC", "DLAM", "Outorga", "Autorização Ambiental", "Outro"];
const STATUS_OPTIONS: { value: LicenseStatus; label: string }[] = [
  { value: "ativa", label: "Vigente" },
  { value: "em_renovacao", label: "Renovação necessária" },
  { value: "vencida", label: "Vencida" },
  { value: "suspensa", label: "Suspensa" },
  { value: "cancelada", label: "Cancelada" },
];

interface Props {
  license: EnvironmentalLicense | null;
  open: boolean;
  onClose: () => void;
}

export function LicenseModal({ license, open, onClose }: Props) {
  const { profile } = useAuth();
  const { data: clients = [] } = useClients();
  const { data: properties = [] } = useProperties();
  const upsert = useUpsertLicense();
  const upload = useUploadLicenseAttachment();
  const remove = useRemoveLicenseAttachment();
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<Partial<EnvironmentalLicense>>({});

  useEffect(() => {
    if (open) {
      setForm(
        license ?? {
          license_type: "LP",
          status: "ativa" as LicenseStatus,
          license_number: "",
          issuing_body: "",
          licensed_activity: "",
          notes: "",
        }
      );
    }
  }, [license, open]);

  if (!open) return null;

  const set = <K extends keyof EnvironmentalLicense>(k: K, v: EnvironmentalLicense[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!profile) return;
    if (!form.license_type) {
      toast.error("Tipo da licença é obrigatório");
      return;
    }
    try {
      const payload: LicenseUpsertInput = {
        ...form,
        license_type: form.license_type,
        organization_id: profile.organization_id,
      };
      await upsert.mutateAsync(payload);
      toast.success(license ? "Licença atualizada" : "Licença criada");
      onClose();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const handleUpload = async (file: File) => {
    if (!license || !profile) {
      toast.error("Salve a licença antes de anexar arquivo");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      toast.error("Arquivo deve ter no máximo 20 MB");
      return;
    }
    const okType = file.type === "application/pdf" || file.type.startsWith("image/");
    if (!okType) {
      toast.error("Apenas PDF ou imagens são aceitos");
      return;
    }
    try {
      await upload.mutateAsync({ licenseId: license.id, organizationId: profile.organization_id, file });
      toast.success("Anexo enviado");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const handleRemoveAttachment = async () => {
    if (!license?.attachment_url) return;
    try {
      await remove.mutateAsync({ licenseId: license.id, path: license.attachment_url });
      toast.success("Anexo removido");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const handleDownload = async () => {
    if (!license?.attachment_url) return;
    const url = await getLicenseAttachmentUrl(license.attachment_url);
    if (url) window.open(url, "_blank");
    else toast.error("Não foi possível gerar link de download");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-xl border border-border bg-card shadow-2xl">
        <div className="sticky top-0 flex items-center justify-between border-b border-border bg-card/95 backdrop-blur px-5 py-3">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold">{license ? "Editar licença ambiental" : "Nova licença ambiental"}</h2>
          </div>
          <button onClick={onClose} className="rounded-md p-1 hover:bg-accent/10">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {!license && <PlanLimitNotice resource="licenses" />}
          {/* Tipo + Status */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Tipo de licença *">
              <select
                value={form.license_type ?? ""}
                onChange={(e) => set("license_type", e.target.value)}
                className="w-full h-9 rounded-md border border-border bg-background px-3 text-sm"
              >
                {LICENSE_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </Field>
            <Field label="Status">
              <select
                value={form.status ?? "ativa"}
                onChange={(e) => set("status", e.target.value as LicenseStatus)}
                className="w-full h-9 rounded-md border border-border bg-background px-3 text-sm"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </Field>
          </div>

          {/* Número + Órgão */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Número da licença">
              <input
                value={form.license_number ?? ""}
                onChange={(e) => set("license_number", e.target.value)}
                className="w-full h-9 rounded-md border border-border bg-background px-3 text-sm"
                placeholder="Ex.: LP 123/2024"
              />
            </Field>
            <Field label="Órgão emissor">
              <input
                value={form.issuing_body ?? ""}
                onChange={(e) => set("issuing_body", e.target.value)}
                className="w-full h-9 rounded-md border border-border bg-background px-3 text-sm"
                placeholder="Ex.: IBAMA, SEMA-MT"
              />
            </Field>
          </div>

          {/* Atividade */}
          <Field label="Atividade licenciada">
            <input
              value={form.licensed_activity ?? ""}
              onChange={(e) => set("licensed_activity", e.target.value)}
              className="w-full h-9 rounded-md border border-border bg-background px-3 text-sm"
              placeholder="Ex.: Suinocultura, mineração, etc."
            />
          </Field>

          {/* Cliente + Imóvel */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Cliente vinculado">
              <select
                value={form.client_id ?? ""}
                onChange={(e) => set("client_id", e.target.value || null)}
                className="w-full h-9 rounded-md border border-border bg-background px-3 text-sm"
              >
                <option value="">— Sem cliente —</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </Field>
            <Field label="Imóvel rural vinculado">
              <select
                value={form.property_id ?? ""}
                onChange={(e) => set("property_id", e.target.value || null)}
                className="w-full h-9 rounded-md border border-border bg-background px-3 text-sm"
              >
                <option value="">— Sem imóvel —</option>
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </Field>
          </div>

          {/* Datas */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Data de emissão">
              <input
                type="date"
                value={form.issue_date ?? ""}
                onChange={(e) => set("issue_date", e.target.value || null)}
                className="w-full h-9 rounded-md border border-border bg-background px-3 text-sm"
              />
            </Field>
            <Field label="Data de vencimento">
              <input
                type="date"
                value={form.expiration_date ?? ""}
                onChange={(e) => set("expiration_date", e.target.value || null)}
                className="w-full h-9 rounded-md border border-border bg-background px-3 text-sm"
              />
            </Field>
          </div>

          {/* Observações */}
          <Field label="Observações">
            <textarea
              value={form.notes ?? ""}
              onChange={(e) => set("notes", e.target.value)}
              rows={3}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm resize-none"
              placeholder="Notas internas, condicionantes, etc."
            />
          </Field>

          {/* Anexo */}
          <div className="space-y-2">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Anexo (PDF ou imagem)</div>
            {license ? (
              license.attachment_url ? (
                <div className="flex items-center justify-between rounded-md border border-border bg-background/40 px-3 py-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="h-4 w-4 text-primary shrink-0" />
                    <div className="min-w-0">
                      <div className="text-xs font-medium truncate">{license.attachment_name ?? "arquivo"}</div>
                      <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {license.attachment_uploaded_at
                          ? new Date(license.attachment_uploaded_at).toLocaleString("pt-BR")
                          : "—"}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={handleDownload} className="p-1.5 rounded hover:bg-accent/10" title="Baixar">
                      <Download className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={handleRemoveAttachment} className="p-1.5 rounded hover:bg-destructive/10 text-destructive" title="Remover">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="application/pdf,image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleUpload(f);
                      e.target.value = "";
                    }}
                  />
                  <button
                    onClick={() => fileRef.current?.click()}
                    disabled={upload.isPending}
                    className="w-full inline-flex items-center justify-center gap-2 h-9 rounded-md border border-dashed border-border bg-background/30 text-xs text-muted-foreground hover:bg-accent/5"
                  >
                    {upload.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                    Enviar arquivo (PDF ou imagem)
                  </button>
                </>
              )
            ) : (
              <div className="text-[11px] text-muted-foreground italic">
                Salve a licença para habilitar o envio de anexo.
              </div>
            )}
          </div>
        </div>

        <div className="sticky bottom-0 flex items-center justify-end gap-2 border-t border-border bg-card/95 backdrop-blur px-5 py-3">
          <button onClick={onClose} className="h-9 px-4 rounded-md border border-border text-xs font-medium hover:bg-accent/10">
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={upsert.isPending}
            className={cn(
              "h-9 px-4 rounded-md bg-primary text-primary-foreground text-xs font-medium inline-flex items-center gap-2 hover:opacity-90",
              upsert.isPending && "opacity-50"
            )}
          >
            {upsert.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Salvar licença
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}
