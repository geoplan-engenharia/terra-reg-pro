-- Add status, source_type, update_frequency, last_sync_at to data_sources
DO $$ BEGIN
  CREATE TYPE public.data_source_status AS ENUM ('planejada','ativa','instavel','indisponivel');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.data_sources
  ADD COLUMN IF NOT EXISTS status public.data_source_status NOT NULL DEFAULT 'planejada',
  ADD COLUMN IF NOT EXISTS source_type text,
  ADD COLUMN IF NOT EXISTS update_frequency text,
  ADD COLUMN IF NOT EXISTS last_sync_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Trigger to keep updated_at fresh
DROP TRIGGER IF EXISTS trg_data_sources_touch ON public.data_sources;
CREATE TRIGGER trg_data_sources_touch
BEFORE UPDATE ON public.data_sources
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Seed catalog of common Brazilian geospatial sources (only if not present)
INSERT INTO public.data_sources (key, name, description, category, source_type, endpoint_url, update_frequency, status, enabled)
VALUES
  ('car_sicar', 'CAR / SICAR', 'Cadastro Ambiental Rural — Sistema Nacional de Cadastro Ambiental Rural.', 'fundiario', 'rest_api', 'https://www.car.gov.br/publico/imoveis/index', 'mensal', 'planejada', true),
  ('sigef_incra', 'SIGEF / INCRA', 'Sistema de Gestão Fundiária do INCRA — certificação de imóveis rurais.', 'fundiario', 'wfs', 'https://sigef.incra.gov.br', 'mensal', 'planejada', true),
  ('mapbiomas', 'MapBiomas', 'Mapeamento anual de cobertura e uso da terra no Brasil.', 'ambiental', 'wms', 'https://plataforma.mapbiomas.org', 'anual', 'planejada', true),
  ('prodes', 'PRODES / INPE', 'Monitoramento do desmatamento da Amazônia Legal.', 'ambiental', 'wms', 'http://terrabrasilis.dpi.inpe.br/app/map/deforestation', 'anual', 'planejada', true),
  ('deter', 'DETER / INPE', 'Sistema de detecção de alertas de desmatamento em tempo quase real.', 'ambiental', 'wms', 'http://terrabrasilis.dpi.inpe.br/app/map/alerts', 'diario', 'planejada', true),
  ('ibama_embargos', 'IBAMA — Áreas Embargadas', 'Lista oficial de áreas embargadas pelo IBAMA por infrações ambientais.', 'fiscalizacao', 'rest_api', 'https://servicos.ibama.gov.br/ctf/publico/areasembargadas/ConsultaPublicaAreasEmbargadas.php', 'mensal', 'planejada', true)
ON CONFLICT (key) DO NOTHING;