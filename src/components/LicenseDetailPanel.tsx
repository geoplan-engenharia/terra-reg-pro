import { X, FileText, Calendar, Building2, User, MapPin, AlertTriangle, Download, Pencil, Trash2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useLicense, useLicenseAlerts, useDeleteLicense, getLicenseAttachmentUrl } from "@/lib/queries";
import type { LicenseAlertKind } from "@/lib/types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Props {
  licenseId: string | null;
  open: boolean;
  onClose: () => void;
  onEdit: () => void;
}

const KIND_LABEL: Record<LicenseAlertKind, string> = {
  "180_dias": "180 dias para vencer",
  "90_dias": "90 dias para vencer",
  "30_dias": "30 dias para vencer",
  vencida: "Licença vencida",
};

const KIND_CLASSES: Record<LicenseAlertKind, string> = {
  "180_dias": "border-info/40 bg-info/10 text-info",
  "90_dias": "border-warning/40 bg-warning/10 text-warning",
  "30_dias": "border-destructive/40 bg-destructive/10 text-destructive",
  vencida: "border-destructive/40 bg-destructive/10 text-destructive",
};

export function LicenseDetailPanel({ licenseId, open, onClose, onEdit }: Props) {
  const { isAdmin } = useAuth();
  const { data: license } = useLicense(licenseId);
  const { data: alerts = [] } = useLicenseAlerts(licenseId);
  const del = useDeleteLicense();

  if (!open || !licenseId) return null;

  const handleDownload = async () => {
    if (!license?.attachment_url) return;
    const url = await getLicenseAttachmentUrl(license.attachment_url);
    if (url) window.open(url, "_blank");
    else toast.error("Falha ao gerar link de download");
  };

  const handleDelete = async () => {
    if (!license) return;
    if (!confirm(`Excluir licença ${license.license_type}${license.license_number ? ` ${license.license_number}` : ""}?`)) return;
    try {
      await del.mutateAsync(license.id);
      toast.success("Licença excluída");
      onClose();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-xl border border-border bg-card shadow-2xl">
        <div className="sticky top-0 flex items-center justify-between border-b border-border bg-card/95 backdrop-blur px-5 py-3">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold">
              Licença {license?.license_type ?? "—"}
              {license?.license_number ? ` · ${license.license_number}` : ""}
            </h2>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={onEdit} className="inline-flex items-center gap-1 px-2.5 h-8 rounded-md border border-border text-xs hover:bg-accent/10">
              <Pencil className="h-3.5 w-3.5" /> Editar
            </button>
            {isAdmin && (
              <button onClick={handleDelete} className="inline-flex items-center gap-1 px-2.5 h-8 rounded-md border border-destructive/40 text-destructive text-xs hover:bg-destructive/10">
                <Trash2 className="h-3.5 w-3.5" /> Excluir
              </button>
            )}
            <button onClick={onClose} className="rounded-md p-1 hover:bg-accent/10">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {!license ? (
          <div className="p-10 text-center text-sm text-muted-foreground">Carregando…</div>
        ) : (
          <div className="p-5 space-y-5">
            <Section title="Dados principais">
              <div className="grid grid-cols-2 gap-3">
                <Item label="Tipo" value={license.license_type} />
                <Item label="Status" value={statusLabel(license.status)} />
                <Item label="Número" value={license.license_number ?? "—"} />
                <Item label="Órgão emissor" value={license.issuing_body ?? "—"} icon={Building2} />
                <Item label="Atividade licenciada" value={license.licensed_activity ?? "—"} colSpan />
                <Item label="Emissão" value={fmt(license.issue_date)} icon={Calendar} />
                <Item label="Vencimento" value={fmt(license.expiration_date)} icon={Calendar} />
              </div>
            </Section>

            <Section title="Vínculos">
              <div className="grid grid-cols-2 gap-3">
                <Item label="Cliente" value={license.client_name ?? "—"} icon={User} />
                <Item label="Imóvel rural" value={license.property_name ?? "—"} icon={MapPin} />
              </div>
            </Section>

            <Section title="Alertas automáticos">
              {alerts.length === 0 ? (
                <div className="text-xs text-muted-foreground italic">Nenhum alerta gerado.</div>
              ) : (
                <div className="space-y-1.5">
                  {alerts.map((a) => (
                    <div
                      key={a.id}
                      className={cn(
                        "flex items-center justify-between rounded-md border px-3 py-2 text-xs",
                        KIND_CLASSES[a.kind]
                      )}
                    >
                      <div className="inline-flex items-center gap-2">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        {KIND_LABEL[a.kind]}
                      </div>
                      <span className="font-mono text-[10px] opacity-80">
                        {new Date(a.triggered_at).toLocaleDateString("pt-BR")}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Section>

            <Section title="Anexo">
              {license.attachment_url ? (
                <div className="flex items-center justify-between rounded-md border border-border bg-background/40 px-3 py-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="h-4 w-4 text-primary shrink-0" />
                    <div className="min-w-0">
                      <div className="text-xs font-medium truncate">{license.attachment_name ?? "arquivo"}</div>
                      <div className="text-[10px] text-muted-foreground">
                        {license.attachment_uploaded_at ? new Date(license.attachment_uploaded_at).toLocaleString("pt-BR") : "—"}
                      </div>
                    </div>
                  </div>
                  <button onClick={handleDownload} className="inline-flex items-center gap-1 px-2.5 h-8 rounded-md border border-border text-xs hover:bg-accent/10">
                    <Download className="h-3.5 w-3.5" /> Baixar
                  </button>
                </div>
              ) : (
                <div className="text-xs text-muted-foreground italic">Sem anexo.</div>
              )}
            </Section>

            {license.notes && (
              <Section title="Observações">
                <div className="text-xs whitespace-pre-wrap rounded-md border border-border bg-background/30 p-3">
                  {license.notes}
                </div>
              </Section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">{title}</div>
      {children}
    </div>
  );
}

function Item({
  label,
  value,
  icon: Icon,
  colSpan,
}: {
  label: string;
  value: string;
  icon?: React.ComponentType<{ className?: string }>;
  colSpan?: boolean;
}) {
  return (
    <div className={cn("space-y-0.5", colSpan && "col-span-2")}>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-xs font-medium inline-flex items-center gap-1.5">
        {Icon && <Icon className="h-3 w-3 text-muted-foreground" />}
        {value}
      </div>
    </div>
  );
}

function fmt(d: string | null) {
  return d ? new Date(d).toLocaleDateString("pt-BR") : "—";
}

function statusLabel(s: string) {
  const map: Record<string, string> = {
    ativa: "Vigente",
    em_renovacao: "Renovação necessária",
    vencida: "Vencida",
    suspensa: "Suspensa",
    cancelada: "Cancelada",
  };
  return map[s] ?? s;
}
