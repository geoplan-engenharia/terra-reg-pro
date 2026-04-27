import { supabase } from "@/integrations/supabase/client";

// Seeds the current organization with demo clients, rural properties,
// environmental analysis, monitoring alerts, and licenses. Idempotent-ish:
// it skips seeding if any client already exists in the org.

export async function seedDemoData(orgId: string): Promise<{ inserted: boolean; reason?: string }> {
  const { count: existing } = await supabase
    .from("clients")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", orgId);

  if ((existing ?? 0) > 0) return { inserted: false, reason: "Já existem dados nesta organização." };

  // Clients
  const { data: clients, error: cErr } = await supabase
    .from("clients")
    .insert([
      { organization_id: orgId, name: "João Carlos Pereira", document: "CPF 123.456.789-00", email: "joao@example.com" },
      { organization_id: orgId, name: "Maria Aparecida Souza", document: "CPF 987.654.321-00" },
      { organization_id: orgId, name: "Agropecuária Horizonte Ltda.", document: "CNPJ 12.345.678/0001-90" },
      { organization_id: orgId, name: "Roberto Mendes Silva", document: "CPF 222.333.444-55" },
      { organization_id: orgId, name: "Cooperativa Rural União", document: "CNPJ 98.765.432/0001-10" },
    ])
    .select("id, name");
  if (cErr) throw cErr;

  const byName = (n: string) => clients?.find((c) => c.name === n)?.id ?? null;

  // Properties
  const props = [
    {
      organization_id: orgId, client_id: byName("João Carlos Pereira"),
      name: "Fazenda Boa Vista", owner_name: "João Carlos Pereira",
      municipio: "Sorriso", uf: "MT", area_ha: 1245.8,
      car_code: "MT-5107909-A1B2C3D4E5F6G7H8I9J0",
      car_status: "ativo" as const, sigef_status: "certificado" as const,
      matricula_number: "12.456", matricula_source: "sigef" as const,
      centroid_lat: -12.5453, centroid_lng: -55.7211, monitorado: true,
      last_consultation_at: new Date().toISOString(),
    },
    {
      organization_id: orgId, client_id: byName("Maria Aparecida Souza"),
      name: "Sítio Três Irmãos", owner_name: "Maria Aparecida Souza",
      municipio: "Altamira", uf: "PA", area_ha: 387.4,
      car_code: "PA-1500602-X9Y8Z7W6V5U4T3S2R1Q0",
      car_status: "pendente" as const, sigef_status: "nao_certificado" as const,
      matricula_number: "8.221", matricula_source: "car" as const,
      centroid_lat: -3.2031, centroid_lng: -52.2056, monitorado: true,
      last_consultation_at: new Date().toISOString(),
    },
    {
      organization_id: orgId, client_id: byName("Agropecuária Horizonte Ltda."),
      name: "Estância Santa Clara", owner_name: "Agropecuária Horizonte Ltda.",
      municipio: "Dourados", uf: "MS", area_ha: 2890.12,
      car_code: "MS-5003702-K1L2M3N4O5P6Q7R8S9T0",
      car_status: "ativo" as const, sigef_status: "certificado" as const,
      matricula_number: "34.789", matricula_source: "sigef" as const,
      centroid_lat: -22.2231, centroid_lng: -54.812, monitorado: false,
      last_consultation_at: new Date().toISOString(),
    },
    {
      organization_id: orgId, client_id: byName("Roberto Mendes Silva"),
      name: "Fazenda Capão Alto", owner_name: "Roberto Mendes Silva",
      municipio: "Querência", uf: "MT", area_ha: 762.05,
      car_code: "MT-5107107-B2C3D4E5F6G7H8I9J0K1",
      car_status: "ativo" as const, sigef_status: "nao_certificado" as const,
      matricula_number: null, matricula_source: "desconhecida" as const,
      centroid_lat: -12.612, centroid_lng: -52.18, monitorado: true,
      last_consultation_at: new Date().toISOString(),
    },
    {
      organization_id: orgId, client_id: byName("Cooperativa Rural União"),
      name: "Sítio Recanto Verde", owner_name: "Cooperativa Rural União",
      municipio: "Rio Verde", uf: "GO", area_ha: 154.7,
      car_code: "GO-5218805-Z0Y9X8W7V6U5T4S3R2Q1",
      car_status: "ativo" as const, sigef_status: "certificado" as const,
      matricula_number: "5.118", matricula_source: "sigef" as const,
      centroid_lat: -17.795, centroid_lng: -50.928, monitorado: false,
      last_consultation_at: new Date().toISOString(),
    },
  ];
  const { data: insertedProps, error: pErr } = await supabase.from("rural_properties").insert(props).select("id, name");
  if (pErr) throw pErr;

  const propByName = (n: string) => insertedProps?.find((p) => p.name === n)?.id ?? null;

  // Environmental analysis (drives diagnostics)
  await supabase.from("environmental_analysis").insert([
    { organization_id: orgId, property_id: propByName("Sítio Três Irmãos"), has_desmatamento: true, desmatamento_area_ha: 4.2, has_embargo: true, embargo_area_ha: 23.7, has_app_violation: true },
    { organization_id: orgId, property_id: propByName("Fazenda Capão Alto"), has_desmatamento: true, desmatamento_area_ha: 1.8 },
    { organization_id: orgId, property_id: propByName("Fazenda Boa Vista") },
    { organization_id: orgId, property_id: propByName("Estância Santa Clara") },
    { organization_id: orgId, property_id: propByName("Sítio Recanto Verde") },
  ]);

  // Run diagnostics for each property
  for (const p of insertedProps ?? []) {
    await supabase.rpc("run_property_diagnostics", { _property_id: p.id });
  }

  // Monitoring alerts
  await supabase.from("monitoring_alerts").insert([
    { organization_id: orgId, property_id: propByName("Sítio Três Irmãos"), alert_type: "desmatamento", title: "Novo alerta de desmatamento", description: "Polígono de 4,2 ha detectado pelo DETER.", severidade: "alta" as const, source: "DETER" },
    { organization_id: orgId, property_id: propByName("Fazenda Capão Alto"), alert_type: "desmatamento", title: "Supressão de vegetação", description: "1,8 ha de vegetação nativa removidos.", severidade: "media" as const, source: "DETER" },
    { organization_id: orgId, property_id: propByName("Sítio Três Irmãos"), alert_type: "embargo", title: "Atualização em área embargada", description: "Limite de embargo expandido em 2,3 ha.", severidade: "alta" as const, source: "IBAMA" },
    { organization_id: orgId, property_id: propByName("Fazenda Boa Vista"), alert_type: "car", title: "CAR retificado", description: "Retificação de Reserva Legal aprovada.", severidade: "baixa" as const, source: "SICAR" },
  ]);

  // Licenses
  const today = new Date();
  const inDays = (n: number) => {
    const d = new Date(today); d.setDate(d.getDate() + n);
    return d.toISOString().slice(0, 10);
  };
  await supabase.from("environmental_licenses").insert([
    { organization_id: orgId, client_id: byName("Agropecuária Horizonte Ltda."), property_id: propByName("Estância Santa Clara"), license_type: "LO", license_number: "LO-2023/045", issuing_body: "SEMAS-MS", licensed_activity: "Cultura agrícola", issue_date: "2023-07-15", expiration_date: inDays(89) },
    { organization_id: orgId, client_id: byName("João Carlos Pereira"), property_id: propByName("Fazenda Boa Vista"), license_type: "LI", license_number: "LI-2024/021", issuing_body: "SEMA-MT", licensed_activity: "Implantação de armazém", issue_date: "2024-02-10", expiration_date: inDays(105) },
    { organization_id: orgId, client_id: byName("Cooperativa Rural União"), property_id: propByName("Sítio Recanto Verde"), license_type: "LP", license_number: "LP-2025/008", issuing_body: "SEMAD-GO", licensed_activity: "Estudo de viabilidade", issue_date: "2025-01-20", expiration_date: inDays(268) },
    { organization_id: orgId, client_id: byName("Maria Aparecida Souza"), property_id: propByName("Sítio Três Irmãos"), license_type: "LO", license_number: "LO-2022/112", issuing_body: "SEMAS-PA", licensed_activity: "Atividade agropecuária", issue_date: "2022-05-30", expiration_date: inDays(15) },
  ]);

  return { inserted: true };
}
