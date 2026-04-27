// Dados mockados realistas de imóveis rurais brasileiros.
// Estrutura preparada para substituição por APIs reais (CAR, SIGEF, etc).

export type Confiabilidade = "alta" | "media" | "baixa";
export type StatusCAR = "ativo" | "pendente" | "cancelado" | "suspenso";
export type DiagnosticoTipo = "irregularidade" | "sem_certificacao" | "conflito" | "regularizacao" | "regular";

export interface Imovel {
  id: string;
  nome: string;
  proprietario: string;
  municipio: string;
  uf: string;
  coordenadas: [number, number]; // [lat, lng]
  area_ha: number;
  // Dados fundiários
  car_codigo: string;
  car_status: StatusCAR;
  sigef_certificado: boolean;
  matricula: {
    numero: string | null;
    fonte: "CAR" | "SIGEF" | "nao_identificado";
    confiabilidade: Confiabilidade;
  };
  // Dados ambientais
  app_ha: number;
  reserva_legal_ha: number;
  area_embargada: boolean;
  area_embargada_ha?: number;
  desmatamento_recente: boolean;
  desmatamento_alertas?: number;
  uso_solo: { categoria: string; percentual: number }[];
  // Diagnóstico
  diagnosticos: { tipo: DiagnosticoTipo; titulo: string; descricao: string; severidade: "alta" | "media" | "baixa" }[];
  ultima_consulta: string;
  monitorado: boolean;
}

export const imoveis: Imovel[] = [
  {
    id: "im-001",
    nome: "Fazenda Boa Vista",
    proprietario: "João Carlos Pereira",
    municipio: "Sorriso",
    uf: "MT",
    coordenadas: [-12.5453, -55.7211],
    area_ha: 1245.8,
    car_codigo: "MT-5107909-A1B2C3D4E5F6G7H8I9J0",
    car_status: "ativo",
    sigef_certificado: true,
    matricula: { numero: "12.456", fonte: "SIGEF", confiabilidade: "alta" },
    app_ha: 142.3,
    reserva_legal_ha: 498.32,
    area_embargada: false,
    desmatamento_recente: false,
    uso_solo: [
      { categoria: "Agricultura", percentual: 58 },
      { categoria: "Pastagem", percentual: 18 },
      { categoria: "Vegetação Nativa", percentual: 22 },
      { categoria: "Outros", percentual: 2 },
    ],
    diagnosticos: [
      { tipo: "regular", titulo: "Imóvel em conformidade", descricao: "CAR ativo, certificação SIGEF válida e sem alertas ambientais ativos.", severidade: "baixa" },
    ],
    ultima_consulta: "2026-04-26T14:23:00Z",
    monitorado: true,
  },
  {
    id: "im-002",
    nome: "Sítio Três Irmãos",
    proprietario: "Maria Aparecida Souza",
    municipio: "Altamira",
    uf: "PA",
    coordenadas: [-3.2031, -52.2056],
    area_ha: 387.4,
    car_codigo: "PA-1500602-X9Y8Z7W6V5U4T3S2R1Q0",
    car_status: "pendente",
    sigef_certificado: false,
    matricula: { numero: "8.221", fonte: "CAR", confiabilidade: "media" },
    app_ha: 41.2,
    reserva_legal_ha: 154.96,
    area_embargada: true,
    area_embargada_ha: 23.7,
    desmatamento_recente: true,
    desmatamento_alertas: 4,
    uso_solo: [
      { categoria: "Pastagem", percentual: 62 },
      { categoria: "Vegetação Nativa", percentual: 28 },
      { categoria: "Solo Exposto", percentual: 8 },
      { categoria: "Outros", percentual: 2 },
    ],
    diagnosticos: [
      { tipo: "irregularidade", titulo: "Potencial irregularidade ambiental", descricao: "4 alertas de desmatamento ativos no último trimestre.", severidade: "alta" },
      { tipo: "conflito", titulo: "Sobreposição com área embargada", descricao: "23,7 ha do imóvel intersectam com áreas embargadas pelo IBAMA.", severidade: "alta" },
      { tipo: "sem_certificacao", titulo: "Sem certificação fundiária", descricao: "Imóvel não consta como certificado no SIGEF.", severidade: "media" },
      { tipo: "regularizacao", titulo: "Necessidade de regularização", descricao: "CAR pendente de análise há mais de 24 meses.", severidade: "media" },
    ],
    ultima_consulta: "2026-04-27T09:11:00Z",
    monitorado: true,
  },
  {
    id: "im-003",
    nome: "Estância Santa Clara",
    proprietario: "Agropecuária Horizonte Ltda.",
    municipio: "Dourados",
    uf: "MS",
    coordenadas: [-22.2231, -54.812],
    area_ha: 2890.12,
    car_codigo: "MS-5003702-K1L2M3N4O5P6Q7R8S9T0",
    car_status: "ativo",
    sigef_certificado: true,
    matricula: { numero: "34.789", fonte: "SIGEF", confiabilidade: "alta" },
    app_ha: 312.5,
    reserva_legal_ha: 578.0,
    area_embargada: false,
    desmatamento_recente: false,
    uso_solo: [
      { categoria: "Agricultura", percentual: 71 },
      { categoria: "Pastagem", percentual: 9 },
      { categoria: "Vegetação Nativa", percentual: 20 },
    ],
    diagnosticos: [
      { tipo: "regular", titulo: "Imóvel em conformidade", descricao: "Sem pendências relevantes identificadas.", severidade: "baixa" },
    ],
    ultima_consulta: "2026-04-25T16:40:00Z",
    monitorado: false,
  },
  {
    id: "im-004",
    nome: "Fazenda Capão Alto",
    proprietario: "Roberto Mendes Silva",
    municipio: "Querência",
    uf: "MT",
    coordenadas: [-12.612, -52.18],
    area_ha: 762.05,
    car_codigo: "MT-5107107-B2C3D4E5F6G7H8I9J0K1",
    car_status: "ativo",
    sigef_certificado: false,
    matricula: { numero: null, fonte: "nao_identificado", confiabilidade: "baixa" },
    app_ha: 88.4,
    reserva_legal_ha: 304.82,
    area_embargada: false,
    desmatamento_recente: true,
    desmatamento_alertas: 1,
    uso_solo: [
      { categoria: "Pastagem", percentual: 48 },
      { categoria: "Vegetação Nativa", percentual: 39 },
      { categoria: "Agricultura", percentual: 12 },
      { categoria: "Outros", percentual: 1 },
    ],
    diagnosticos: [
      { tipo: "sem_certificacao", titulo: "Sem certificação fundiária", descricao: "Imóvel sem registro no SIGEF e matrícula não identificada.", severidade: "media" },
      { tipo: "irregularidade", titulo: "Alerta de desmatamento recente", descricao: "1 alerta de supressão de vegetação detectado nos últimos 30 dias.", severidade: "media" },
    ],
    ultima_consulta: "2026-04-27T11:55:00Z",
    monitorado: true,
  },
  {
    id: "im-005",
    nome: "Sítio Recanto Verde",
    proprietario: "Cooperativa Rural União",
    municipio: "Rio Verde",
    uf: "GO",
    coordenadas: [-17.795, -50.928],
    area_ha: 154.7,
    car_codigo: "GO-5218805-Z0Y9X8W7V6U5T4S3R2Q1",
    car_status: "ativo",
    sigef_certificado: true,
    matricula: { numero: "5.118", fonte: "SIGEF", confiabilidade: "alta" },
    app_ha: 21.4,
    reserva_legal_ha: 30.94,
    area_embargada: false,
    desmatamento_recente: false,
    uso_solo: [
      { categoria: "Agricultura", percentual: 65 },
      { categoria: "Vegetação Nativa", percentual: 23 },
      { categoria: "Infraestrutura", percentual: 12 },
    ],
    diagnosticos: [
      { tipo: "regular", titulo: "Imóvel em conformidade", descricao: "Documentação e situação ambiental regulares.", severidade: "baixa" },
    ],
    ultima_consulta: "2026-04-24T08:02:00Z",
    monitorado: false,
  },
];

export interface AlertaSistema {
  id: string;
  imovel_id: string;
  imovel_nome: string;
  tipo: "desmatamento" | "embargo" | "car" | "fundiario" | "licenca";
  titulo: string;
  descricao: string;
  severidade: "alta" | "media" | "baixa";
  data: string;
}

export const alertas: AlertaSistema[] = [
  { id: "al-1", imovel_id: "im-002", imovel_nome: "Sítio Três Irmãos", tipo: "desmatamento", titulo: "Novo alerta de desmatamento", descricao: "Polígono de 4,2 ha detectado pelo DETER.", severidade: "alta", data: "2026-04-27T08:30:00Z" },
  { id: "al-2", imovel_id: "im-004", imovel_nome: "Fazenda Capão Alto", tipo: "desmatamento", titulo: "Supressão de vegetação", descricao: "1,8 ha de vegetação nativa removidos.", severidade: "media", data: "2026-04-26T19:14:00Z" },
  { id: "al-3", imovel_id: "im-002", imovel_nome: "Sítio Três Irmãos", tipo: "embargo", titulo: "Atualização em área embargada", descricao: "Limite de embargo expandido em 2,3 ha.", severidade: "alta", data: "2026-04-25T13:22:00Z" },
  { id: "al-4", imovel_id: "im-001", imovel_nome: "Fazenda Boa Vista", tipo: "car", titulo: "CAR retificado", descricao: "Retificação de Reserva Legal aprovada.", severidade: "baixa", data: "2026-04-23T10:11:00Z" },
  { id: "al-5", imovel_id: "im-003", imovel_nome: "Estância Santa Clara", tipo: "licenca", titulo: "Licença próxima do vencimento", descricao: "LO vence em 89 dias.", severidade: "media", data: "2026-04-22T15:45:00Z" },
];

export interface Camada {
  id: string;
  nome: string;
  descricao: string;
  cor: string;
  ativo: boolean;
}

export const camadasIniciais: Camada[] = [
  { id: "car", nome: "Cadastro Ambiental Rural (CAR)", descricao: "Polígonos do CAR", cor: "#5fbb6f", ativo: true },
  { id: "sigef", nome: "Áreas certificadas (SIGEF)", descricao: "Imóveis certificados", cor: "#3aa3d9", ativo: true },
  { id: "desmatamento", nome: "Alertas de desmatamento", descricao: "DETER / PRODES", cor: "#e85d4a", ativo: false },
  { id: "embargo", nome: "Áreas embargadas", descricao: "IBAMA / ICMBio", cor: "#d97706", ativo: false },
  { id: "uso_solo", nome: "Uso e cobertura do solo", descricao: "MapBiomas", cor: "#a78bfa", ativo: false },
];
