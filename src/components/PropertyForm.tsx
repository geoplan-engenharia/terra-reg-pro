import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { X, Save, Loader2, Upload, MapPin, Trash2, FileJson, AlertTriangle } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useClients } from "@/lib/queries";
import {
  useCreateProperty,
  useUpdateProperty,
  useDeleteProperty,
  useUpsertGeometry,
  usePropertyGeometry,
} from "@/lib/queries";
import type { RuralProperty, CarStatus, SigefStatus, MatriculaSource, Confiabilidade } from "@/lib/types";
import { parseGeoJSON } from "@/lib/geojson";
import { cn } from "@/lib/utils";
import { PlanLimitNotice } from "@/components/PlanLimitNotice";

const UFS = ["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"] as const;

const formSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome do imóvel").max(160),
  client_id: z.string().nullable(),
  owner_name: z.string().trim().max(160).optional().or(z.literal("")),
  municipio: z.string().trim().max(120).optional().or(z.literal("")),
  uf: z.string().length(2).optional().or(z.literal("")),
  area_ha: z.string().optional(),
  car_code: z.string().trim().max(64).optional().or(z.literal("")),
  car_status: z.enum(["ativo","pendente","cancelado","suspenso","nao_cadastrado"] as const),
  sigef_status: z.enum(["certificado","em_analise","nao_certificado","desconhecido"] as const),
  matricula_number: z.string().trim().max(64).optional().or(z.literal("")),
  matricula_source: z.enum(["cartorio","sigef","car","declarado","desconhecida"] as const),
  matricula_confiabilidade: z.enum(["alta","media","baixa"] as const),
  centroid_lat: z.string().optional(),
  centroid_lng: z.string().optional(),
  notes: z.string().max(2000).optional().or(z.literal("")),
});

type Mode = "create" | "edit";

interface Props {
  mode: Mode;
  property?: RuralProperty | null;
  onClose: () => void;
  onSaved?: (id: string) => void;
}

const num = (v: string | undefined): number | null => {
  if (v == null || v.trim() === "") return null;
  const n = Number(v.replace(",", "."));
  return Number.isFinite(n) ? n : null;
};

export function PropertyForm({ mode, property, onClose, onSaved }: Props) {
  const { profile, canEditProperties, isAdmin } = useAuth();
  const { data: clients = [] } = useClients();
  const create = useCreateProperty();
  const update = useUpdateProperty();
  const del = useDeleteProperty();
  const upsertGeom = useUpsertGeometry();
  const { data: geometry } = usePropertyGeometry(mode === "edit" ? property?.id ?? null : null);

  const fileRef = useRef<HTMLInputElement>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pendingGeo, setPendingGeo] = useState<{
    geojson: GeoJSON.GeoJsonObject;
    bbox: [number, number, number, number] | null;
    filename: string;
    filetype: string;
    centroid: { lat: number; lng: number } | null;
    featureCount: number;
  } | null>(null);

  const [form, setForm] = useState({
    name: property?.name ?? "",
    client_id: property?.client_id ?? null as string | null,
    owner_name: property?.owner_name ?? "",
    municipio: property?.municipio ?? "",
    uf: property?.uf ?? "",
    area_ha: property?.area_ha != null ? String(property.area_ha) : "",
    car_code: property?.car_code ?? "",
    car_status: (property?.car_status ?? "nao_cadastrado") as CarStatus,
    sigef_status: (property?.sigef_status ?? "desconhecido") as SigefStatus,
    matricula_number: property?.matricula_number ?? "",
    matricula_source: (property?.matricula_source ?? "desconhecida") as MatriculaSource,
    matricula_confiabilidade: (property?.matricula_confiabilidade ?? "baixa") as Confiabilidade,
    centroid_lat: property?.centroid_lat != null ? String(property.centroid_lat) : "",
    centroid_lng: property?.centroid_lng != null ? String(property.centroid_lng) : "",
    notes: property?.notes ?? "",
  });

  // ESC fecha
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!canEditProperties) {
    return (
      <ModalShell onClose={onClose} title="Sem permissão">
        <p className="text-sm text-muted-foreground">Seu perfil não permite editar imóveis.</p>
      </ModalShell>
    );
  }

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const handleFile = async (file: File) => {
    const ext = file.name.toLowerCase().split(".").pop() ?? "";
    if (ext === "kml") {
      toast.error("Importação de KML será habilitada em breve. Use GeoJSON por enquanto.");
      return;
    }
    if (!["geojson", "json"].includes(ext)) {
      toast.error("Formato não suportado. Envie um arquivo .geojson ou .json.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast.error("Arquivo maior que 8 MB.");
      return;
    }
    try {
      const text = await file.text();
      const parsed = parseGeoJSON(text);
      setPendingGeo({
        geojson: parsed.geojson,
        bbox: parsed.bbox,
        filename: file.name,
        filetype: "geojson",
        centroid: parsed.centroid,
        featureCount: parsed.featureCount,
      });
      if (parsed.centroid) {
        set("centroid_lat", parsed.centroid.lat.toFixed(6));
        set("centroid_lng", parsed.centroid.lng.toFixed(6));
      }
      toast.success(`Geometria carregada (${parsed.featureCount} feição${parsed.featureCount === 1 ? "" : "s"}).`);
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    const parsed = formSchema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Verifique os campos");
      return;
    }
    const v = parsed.data;
    const lat = num(v.centroid_lat);
    const lng = num(v.centroid_lng);
    if ((lat == null) !== (lng == null)) {
      toast.error("Informe latitude e longitude juntas, ou deixe ambas em branco.");
      return;
    }
    if (lat != null && (lat < -90 || lat > 90)) { toast.error("Latitude fora do intervalo"); return; }
    if (lng != null && (lng < -180 || lng > 180)) { toast.error("Longitude fora do intervalo"); return; }

    const payload = {
      name: v.name,
      client_id: v.client_id || null,
      owner_name: v.owner_name || null,
      municipio: v.municipio || null,
      uf: v.uf || null,
      area_ha: num(v.area_ha),
      car_code: v.car_code || null,
      car_status: v.car_status,
      sigef_status: v.sigef_status,
      matricula_number: v.matricula_number || null,
      matricula_source: v.matricula_source,
      matricula_confiabilidade: v.matricula_confiabilidade,
      centroid_lat: lat,
      centroid_lng: lng,
      notes: v.notes || null,
    };

    try {
      let propId: string;
      if (mode === "create") {
        const created = await create.mutateAsync({
          ...payload,
          organization_id: profile.organization_id,
        });
        propId = created.id;
      } else {
        await update.mutateAsync({ id: property!.id, patch: payload });
        propId = property!.id;
      }

      if (pendingGeo) {
        await upsertGeom.mutateAsync({
          property_id: propId,
          organization_id: profile.organization_id,
          geojson: pendingGeo.geojson,
          bbox: pendingGeo.bbox,
          source: "upload",
          filename: pendingGeo.filename,
          filetype: pendingGeo.filetype,
        });
      }

      toast.success(mode === "create" ? "Imóvel criado com sucesso" : "Imóvel atualizado");
      onSaved?.(propId);
      onClose();
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const handleDelete = async () => {
    if (!property) return;
    try {
      await del.mutateAsync(property.id);
      toast.success("Imóvel excluído");
      onSaved?.(property.id);
      onClose();
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const saving = create.isPending || update.isPending || upsertGeom.isPending;

  return (
    <ModalShell onClose={onClose} title={mode === "create" ? "Novo imóvel rural" : "Editar imóvel"}>
      <form onSubmit={submit} className="flex flex-col max-h-[calc(90vh-3.5rem)]">
        <div className="overflow-auto px-6 py-5 space-y-6">
          {mode === "create" && <PlanLimitNotice resource="properties" />}
          {/* Identificação */}

          <Section title="Identificação">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Nome do imóvel *" className="col-span-2">
                <input required value={form.name} onChange={(e) => set("name", e.target.value)} className={inputCls} />
              </Field>
              <Field label="Cliente vinculado" className="col-span-2">
                <select value={form.client_id ?? ""} onChange={(e) => set("client_id", e.target.value || null)} className={inputCls}>
                  <option value="">— Sem cliente —</option>
                  {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </Field>
              <Field label="Proprietário/Responsável" className="col-span-2">
                <input value={form.owner_name} onChange={(e) => set("owner_name", e.target.value)} className={inputCls} />
              </Field>
              <Field label="Município">
                <input value={form.municipio} onChange={(e) => set("municipio", e.target.value)} className={inputCls} />
              </Field>
              <Field label="UF">
                <select value={form.uf} onChange={(e) => set("uf", e.target.value)} className={inputCls}>
                  <option value="">—</option>
                  {UFS.map((u) => <option key={u} value={u}>{u}</option>)}
                </select>
              </Field>
              <Field label="Área (hectares)">
                <input inputMode="decimal" value={form.area_ha} onChange={(e) => set("area_ha", e.target.value)} placeholder="0,00" className={inputCls} />
              </Field>
            </div>
          </Section>

          {/* CAR / SIGEF */}
          <Section title="Cadastro Ambiental e Fundiário">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Código CAR" className="col-span-2">
                <input value={form.car_code} onChange={(e) => set("car_code", e.target.value)} placeholder="UF-1234567-XXXX..." className={cn(inputCls, "font-mono text-xs")} />
              </Field>
              <Field label="Status CAR">
                <select value={form.car_status} onChange={(e) => set("car_status", e.target.value as CarStatus)} className={inputCls}>
                  <option value="ativo">Ativo</option>
                  <option value="pendente">Pendente</option>
                  <option value="suspenso">Suspenso</option>
                  <option value="cancelado">Cancelado</option>
                  <option value="nao_cadastrado">Não cadastrado</option>
                </select>
              </Field>
              <Field label="Status SIGEF">
                <select value={form.sigef_status} onChange={(e) => set("sigef_status", e.target.value as SigefStatus)} className={inputCls}>
                  <option value="certificado">Certificado</option>
                  <option value="em_analise">Em análise</option>
                  <option value="nao_certificado">Não certificado</option>
                  <option value="desconhecido">Desconhecido</option>
                </select>
              </Field>
            </div>
          </Section>

          {/* Matrícula */}
          <Section title="Matrícula">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Número da matrícula">
                <input value={form.matricula_number} onChange={(e) => set("matricula_number", e.target.value)} className={cn(inputCls, "font-mono text-xs")} />
              </Field>
              <Field label="Fonte">
                <select value={form.matricula_source} onChange={(e) => set("matricula_source", e.target.value as MatriculaSource)} className={inputCls}>
                  <option value="cartorio">Cartório</option>
                  <option value="sigef">SIGEF</option>
                  <option value="car">CAR</option>
                  <option value="declarado">Declarado</option>
                  <option value="desconhecida">Desconhecida</option>
                </select>
              </Field>
              <Field label="Confiabilidade" className="col-span-2">
                <div className="grid grid-cols-3 gap-2">
                  {(["alta","media","baixa"] as const).map((c) => (
                    <button
                      key={c} type="button"
                      onClick={() => set("matricula_confiabilidade", c)}
                      className={cn(
                        "h-9 rounded-md border text-xs font-medium capitalize transition",
                        form.matricula_confiabilidade === c
                          ? c === "alta" ? "border-success bg-success/15 text-success"
                            : c === "media" ? "border-warning bg-warning/15 text-warning"
                            : "border-destructive bg-destructive/15 text-destructive"
                          : "border-border bg-background/30 text-muted-foreground hover:bg-accent/10"
                      )}
                    >
                      {c === "media" ? "Média" : c}
                    </button>
                  ))}
                </div>
              </Field>
            </div>
          </Section>

          {/* Geolocalização */}
          <Section title="Localização">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Latitude (centroide)">
                <input inputMode="decimal" value={form.centroid_lat} onChange={(e) => set("centroid_lat", e.target.value)} placeholder="-15.78" className={inputCls} />
              </Field>
              <Field label="Longitude (centroide)">
                <input inputMode="decimal" value={form.centroid_lng} onChange={(e) => set("centroid_lng", e.target.value)} placeholder="-47.92" className={inputCls} />
              </Field>
            </div>

            {/* Geometria */}
            <div className="mt-4 rounded-md border border-border bg-background/30 p-3">
              <div className="flex items-center gap-2 mb-2">
                <FileJson className="h-4 w-4 text-primary" />
                <span className="text-xs font-semibold uppercase tracking-wider">Geometria do imóvel</span>
              </div>
              {pendingGeo ? (
                <div className="rounded-md border border-primary/40 bg-primary/5 p-2.5 text-xs">
                  <div className="font-medium text-foreground">Pronto para enviar: {pendingGeo.filename}</div>
                  <div className="text-muted-foreground mt-1">
                    {pendingGeo.featureCount} feição(ões){pendingGeo.centroid ? ` · centroide ${pendingGeo.centroid.lat.toFixed(4)}, ${pendingGeo.centroid.lng.toFixed(4)}` : ""}
                  </div>
                  <button type="button" onClick={() => setPendingGeo(null)} className="mt-2 text-[11px] text-muted-foreground hover:text-destructive inline-flex items-center gap-1">
                    <X className="h-3 w-3" /> Descartar
                  </button>
                </div>
              ) : geometry ? (
                <div className="text-xs text-muted-foreground">
                  Geometria atual: <span className="text-foreground font-medium">{(geometry.geojson._meta?.filename) ?? "geometria.geojson"}</span>
                  <div>Enviada em {new Date(geometry.created_at).toLocaleString("pt-BR")}</div>
                </div>
              ) : (
                <div className="text-xs text-muted-foreground">Nenhuma geometria vinculada.</div>
              )}
              <div className="mt-3 flex items-center gap-2">
                <input
                  ref={fileRef} type="file" accept=".geojson,.json,application/geo+json,application/json,.kml"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.currentTarget.value = ""; }}
                  className="hidden"
                />
                <button type="button" onClick={() => fileRef.current?.click()}
                  className="inline-flex items-center gap-1.5 text-xs h-8 px-3 rounded-md border border-border bg-card hover:bg-accent/10">
                  <Upload className="h-3.5 w-3.5" /> {geometry || pendingGeo ? "Substituir geometria" : "Importar GeoJSON"}
                </button>
                {pendingGeo?.centroid && (
                  <span className="inline-flex items-center gap-1 text-[11px] text-primary">
                    <MapPin className="h-3 w-3" /> Centroide preenchido automaticamente
                  </span>
                )}
              </div>
              <p className="mt-2 text-[10px] text-muted-foreground">Formatos aceitos: GeoJSON / JSON. Suporte a KML será adicionado em breve.</p>
            </div>
          </Section>

          {/* Observações */}
          <Section title="Observações">
            <Field label="Notas técnicas">
              <textarea rows={3} value={form.notes} onChange={(e) => set("notes", e.target.value)} className={cn(inputCls, "resize-none py-2")} />
            </Field>
          </Section>
        </div>

        {/* Footer */}
        <div className="border-t border-border px-6 py-3 flex items-center gap-2 bg-card">
          {mode === "edit" && isAdmin && (
            <button type="button" onClick={() => setConfirmDelete(true)}
              className="inline-flex items-center gap-1.5 text-xs h-9 px-3 rounded-md border border-destructive/40 text-destructive hover:bg-destructive/10">
              <Trash2 className="h-3.5 w-3.5" /> Excluir imóvel
            </button>
          )}
          <div className="flex-1" />
          <button type="button" onClick={onClose} className="text-xs h-9 px-3 rounded-md border border-border hover:bg-accent/10">
            Cancelar
          </button>
          <button type="submit" disabled={saving}
            className="inline-flex items-center gap-2 text-sm h-9 px-4 rounded-md bg-primary text-primary-foreground font-medium hover:opacity-90 disabled:opacity-60">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {mode === "create" ? "Criar imóvel" : "Salvar alterações"}
          </button>
        </div>
      </form>

      {confirmDelete && property && (
        <div className="absolute inset-0 grid place-items-center bg-background/80 backdrop-blur-sm">
          <div className="rounded-lg border border-destructive/40 bg-card p-5 max-w-sm shadow-panel">
            <div className="flex items-start gap-3">
              <div className="h-9 w-9 rounded-full bg-destructive/15 grid place-items-center text-destructive shrink-0">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold">Excluir “{property.name}”?</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Esta ação remove o imóvel, sua geometria, diagnósticos e alertas. Não pode ser desfeita.
                </p>
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setConfirmDelete(false)} className="text-xs h-9 px-3 rounded-md border border-border hover:bg-accent/10">Cancelar</button>
              <button onClick={handleDelete} disabled={del.isPending}
                className="inline-flex items-center gap-1.5 text-xs h-9 px-3 rounded-md bg-destructive text-destructive-foreground hover:opacity-90 disabled:opacity-60">
                {del.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Excluir definitivamente
              </button>
            </div>
          </div>
        </div>
      )}
    </ModalShell>
  );
}

const inputCls = "h-9 w-full rounded-md border border-input bg-input/40 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring";

function Field({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <label className={cn("block", className)}>
      <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground mb-3">{title}</h3>
      {children}
    </section>
  );
}

function ModalShell({ onClose, title, children }: { onClose: () => void; title: string; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[2000] grid place-items-center bg-background/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-card border border-border rounded-lg shadow-panel overflow-hidden">
        <div className="flex items-center justify-between px-6 h-14 border-b border-border bg-gradient-surface">
          <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
          <button onClick={onClose} className="h-8 w-8 grid place-items-center rounded-md hover:bg-accent/10 text-muted-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
