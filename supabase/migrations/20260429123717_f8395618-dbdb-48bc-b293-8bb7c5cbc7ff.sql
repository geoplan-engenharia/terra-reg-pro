-- ============= INTEGRATION PROVIDERS =============
CREATE TYPE integration_provider_kind AS ENUM ('shapefile_upload','rest_api','wms_wfs','scraping','manual');
CREATE TYPE integration_provider_status AS ENUM ('ativo','planejado','desativado');

CREATE TABLE public.integration_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  kind integration_provider_kind NOT NULL DEFAULT 'shapefile_upload',
  data_source_key TEXT,
  layer_type layer_type NOT NULL DEFAULT 'outros',
  default_color TEXT NOT NULL DEFAULT '#3b9bff',
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  status integration_provider_status NOT NULL DEFAULT 'planejado',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.integration_providers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth reads providers" ON public.integration_providers
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "super_admin manages providers" ON public.integration_providers
  FOR ALL USING (is_super_admin()) WITH CHECK (is_super_admin());

CREATE TRIGGER trg_integration_providers_updated
  BEFORE UPDATE ON public.integration_providers
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============= INTEGRATION JOBS =============
CREATE TYPE integration_job_status AS ENUM ('pendente','processando','sucesso','erro','cancelado');

CREATE TABLE public.integration_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES public.integration_providers(id) ON DELETE CASCADE,
  organization_id UUID,
  triggered_by UUID,
  status integration_job_status NOT NULL DEFAULT 'pendente',
  storage_path TEXT,
  uf TEXT,
  source_label TEXT,
  features_imported INT NOT NULL DEFAULT 0,
  properties_linked INT NOT NULL DEFAULT 0,
  layer_id UUID,
  log TEXT,
  error_message TEXT,
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.integration_jobs ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_integration_jobs_provider ON public.integration_jobs(provider_id, created_at DESC);

CREATE POLICY "auth reads jobs" ON public.integration_jobs
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "super_admin manages jobs" ON public.integration_jobs
  FOR ALL USING (is_super_admin()) WITH CHECK (is_super_admin());

CREATE TRIGGER trg_integration_jobs_updated
  BEFORE UPDATE ON public.integration_jobs
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============= STORAGE BUCKET =============
INSERT INTO storage.buckets (id, name, public)
VALUES ('integration-uploads', 'integration-uploads', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "super_admin reads integration uploads" ON storage.objects
  FOR SELECT USING (bucket_id = 'integration-uploads' AND is_super_admin());

CREATE POLICY "super_admin writes integration uploads" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'integration-uploads' AND is_super_admin());

CREATE POLICY "super_admin updates integration uploads" ON storage.objects
  FOR UPDATE USING (bucket_id = 'integration-uploads' AND is_super_admin());

CREATE POLICY "super_admin deletes integration uploads" ON storage.objects
  FOR DELETE USING (bucket_id = 'integration-uploads' AND is_super_admin());

-- ============= LINK CAR FEATURES TO PROPERTIES =============
CREATE OR REPLACE FUNCTION public.link_car_features_to_properties(_layer_id UUID)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  feat RECORD;
  linked_count INT := 0;
  car_code_value TEXT;
  status_value TEXT;
  area_value NUMERIC;
BEGIN
  FOR feat IN
    SELECT id, external_id, properties_json, area_ha, geometry_geojson, municipality, uf
    FROM public.data_layer_features
    WHERE layer_id = _layer_id
  LOOP
    car_code_value := COALESCE(
      feat.external_id,
      feat.properties_json->>'cod_imovel',
      feat.properties_json->>'COD_IMOVEL',
      feat.properties_json->>'car_code'
    );
    IF car_code_value IS NULL OR length(trim(car_code_value)) = 0 THEN
      CONTINUE;
    END IF;

    status_value := lower(COALESCE(
      feat.properties_json->>'situacao',
      feat.properties_json->>'SITUACAO',
      feat.properties_json->>'status',
      'ativo'
    ));
    area_value := COALESCE(feat.area_ha, NULLIF(feat.properties_json->>'num_area','')::numeric);

    UPDATE public.rural_properties
    SET car_status = (CASE
          WHEN status_value LIKE '%cancel%' THEN 'cancelado'
          WHEN status_value LIKE '%suspen%' THEN 'suspenso'
          WHEN status_value LIKE '%pend%' OR status_value LIKE '%anal%' THEN 'pendente'
          WHEN status_value LIKE '%ativ%' THEN 'ativo'
          ELSE car_status
        END)::car_status,
        municipio = COALESCE(municipio, feat.municipality),
        uf = COALESCE(uf, feat.uf),
        area_ha = COALESCE(area_ha, area_value),
        last_consultation_at = now()
    WHERE car_code = car_code_value;

    IF FOUND THEN
      linked_count := linked_count + 1;
    END IF;
  END LOOP;

  RETURN linked_count;
END;
$$;