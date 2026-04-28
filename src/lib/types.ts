// Domain types mirroring the database schema, used across the UI.

export type AppRole = "admin" | "tecnico" | "financeiro" | "visualizador";
export type Confiabilidade = "alta" | "media" | "baixa";
export type Severidade = "alta" | "media" | "baixa";
export type CarStatus = "ativo" | "pendente" | "cancelado" | "suspenso" | "nao_cadastrado";
export type SigefStatus = "certificado" | "em_analise" | "nao_certificado" | "desconhecido";
export type MatriculaSource = "cartorio" | "sigef" | "car" | "declarado" | "desconhecida";
export type AlertStatus = "novo" | "visualizado" | "resolvido";
export type LicenseStatus = "ativa" | "vencida" | "em_renovacao" | "suspensa" | "cancelada";
export type LicenseAlertKind = "180_dias" | "90_dias" | "30_dias" | "vencida";
export type DiagnosticKind =
  | "regular"
  | "irregularidade_ambiental"
  | "sem_certificacao"
  | "embargo"
  | "desmatamento"
  | "sobreposicao"
  | "documental"
  | "outro";

export interface Client {
  id: string;
  organization_id: string;
  name: string;
  document: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  created_at: string;
}

export interface RuralProperty {
  id: string;
  organization_id: string;
  client_id: string | null;
  name: string;
  owner_name: string | null;
  municipio: string | null;
  uf: string | null;
  area_ha: number | null;
  car_code: string | null;
  car_status: CarStatus;
  sigef_status: SigefStatus;
  matricula_number: string | null;
  matricula_source: MatriculaSource;
  matricula_confiabilidade: Confiabilidade;
  centroid_lat: number | null;
  centroid_lng: number | null;
  monitorado: boolean;
  last_consultation_at: string | null;
  notes: string | null;
  created_at: string;
}

export interface Diagnostic {
  id: string;
  property_id: string;
  kind: DiagnosticKind;
  title: string;
  description: string | null;
  severidade: Severidade;
  rule_key: string | null;
  generated_at: string;
}

export interface MonitoringAlert {
  id: string;
  property_id: string;
  organization_id: string;
  alert_type: string;
  title: string;
  description: string | null;
  severidade: Severidade;
  status: AlertStatus;
  source: string | null;
  alert_date: string;
}

export interface EnvironmentalLicense {
  id: string;
  organization_id: string;
  client_id: string | null;
  property_id: string | null;
  license_type: string;
  license_number: string | null;
  issuing_body: string | null;
  licensed_activity: string | null;
  issue_date: string | null;
  expiration_date: string | null;
  attachment_url: string | null;
  attachment_name: string | null;
  attachment_uploaded_at: string | null;
  status: LicenseStatus;
  notes: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface LicenseAlert {
  id: string;
  license_id: string;
  organization_id: string;
  kind: LicenseAlertKind;
  status: AlertStatus;
  triggered_at: string;
}

export type DataSourceStatus = "planejada" | "ativa" | "instavel" | "indisponivel";

export type RuleCategory = "fundiaria" | "ambiental" | "licenciamento" | "monitoramento";

export interface DiagnosticRule {
  id: string;
  organization_id: string;
  name: string;
  key: string;
  category: RuleCategory;
  severity: Severidade;
  description: string | null;
  report_message: string;
  condition_json: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface EnvironmentalAnalysis {
  id: string;
  property_id: string;
  organization_id: string;
  has_desmatamento: boolean;
  desmatamento_area_ha: number | null;
  has_embargo: boolean;
  embargo_area_ha: number | null;
  has_reserva_legal_deficit: boolean;
  has_app_violation: boolean;
  raw_payload: Record<string, unknown> | null;
  analyzed_at: string;
}

export type DataSourceKind = "geoespacial" | "documental";

export interface DataSource {
  id: string;
  key: string;
  name: string;
  description: string | null;
  category: string | null;
  source_type: string | null;
  source_kind: DataSourceKind;
  endpoint_url: string | null;
  update_frequency: string | null;
  last_sync_at: string | null;
  status: DataSourceStatus;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}
