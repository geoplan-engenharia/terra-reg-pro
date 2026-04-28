-- 1. Add source_kind to data_sources
DO $$ BEGIN
  CREATE TYPE public.data_source_kind AS ENUM ('geoespacial', 'documental');
EXCEPTION WHEN duplicate_object THEN null; END $$;

ALTER TABLE public.data_sources
  ADD COLUMN IF NOT EXISTS source_kind public.data_source_kind NOT NULL DEFAULT 'geoespacial';

-- 2. Layer type enums
DO $$ BEGIN
  CREATE TYPE public.layer_type AS ENUM ('car','sigef','embargo','desmatamento','uso_solo','outros');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE public.layer_geometry_type AS ENUM ('polygon','multipolygon','point','line');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE public.data_layer_status AS ENUM ('ativa','planejada','indisponivel');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 3. data_layers
CREATE TABLE IF NOT EXISTS public.data_layers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data_source_key TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  layer_type public.layer_type NOT NULL DEFAULT 'outros',
  geometry_type public.layer_geometry_type NOT NULL DEFAULT 'polygon',
  status public.data_layer_status NOT NULL DEFAULT 'planejada',
  color TEXT NOT NULL DEFAULT '#3b9bff',
  last_sync_at TIMESTAMPTZ,
  visible_to_users BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(data_source_key)
);

ALTER TABLE public.data_layers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth reads visible layers"
  ON public.data_layers FOR SELECT
  USING (auth.uid() IS NOT NULL AND (visible_to_users = true OR public.is_super_admin()));

CREATE POLICY "super_admin manages layers"
  ON public.data_layers FOR ALL
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE TRIGGER trg_data_layers_touch
  BEFORE UPDATE ON public.data_layers
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 4. data_layer_features
CREATE TABLE IF NOT EXISTS public.data_layer_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  layer_id UUID NOT NULL REFERENCES public.data_layers(id) ON DELETE CASCADE,
  data_source_key TEXT NOT NULL,
  external_id TEXT,
  geometry_geojson JSONB NOT NULL,
  properties_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  municipality TEXT,
  uf TEXT,
  area_ha NUMERIC,
  source_updated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_data_layer_features_layer ON public.data_layer_features(layer_id);

ALTER TABLE public.data_layer_features ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth reads features of visible layers"
  ON public.data_layer_features FOR SELECT
  USING (
    auth.uid() IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.data_layers l
      WHERE l.id = layer_id AND (l.visible_to_users = true OR public.is_super_admin())
    )
  );

CREATE POLICY "super_admin manages features"
  ON public.data_layer_features FOR ALL
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- 5. Function: simulated sync of a data source as geospatial layer
CREATE OR REPLACE FUNCTION public.sync_data_layer_simulated(
  _data_source_key TEXT,
  _layer_type public.layer_type DEFAULT 'outros',
  _layer_name TEXT DEFAULT NULL,
  _color TEXT DEFAULT '#3b9bff'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  layer_uuid UUID;
  source RECORD;
  prop RECORD;
  i INT;
  cx NUMERIC; cy NUMERIC; sz NUMERIC;
  ufs TEXT[] := ARRAY['MT','PA','RO','MA','TO','GO','BA','MS'];
  ext_id TEXT;
  base_lat NUMERIC; base_lng NUMERIC;
  feat_count INT := 0;
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Acesso negado: apenas super admin pode sincronizar camadas';
  END IF;

  SELECT * INTO source FROM public.data_sources WHERE key = _data_source_key;
  IF NOT FOUND THEN RAISE EXCEPTION 'Fonte de dados não encontrada: %', _data_source_key; END IF;

  -- Upsert layer
  INSERT INTO public.data_layers (data_source_key, name, layer_type, geometry_type, status, color, last_sync_at)
  VALUES (_data_source_key, COALESCE(_layer_name, source.name), _layer_type, 'polygon', 'ativa', _color, now())
  ON CONFLICT (data_source_key) DO UPDATE
    SET last_sync_at = now(), status = 'ativa', layer_type = EXCLUDED.layer_type, color = EXCLUDED.color, name = EXCLUDED.name
  RETURNING id INTO layer_uuid;

  -- Clear old features
  DELETE FROM public.data_layer_features WHERE layer_id = layer_uuid;

  -- Strategy: mix — features around existing properties + random across UFs
  -- 1) Around existing properties (up to 8)
  FOR prop IN
    SELECT centroid_lat, centroid_lng, municipio, uf
    FROM public.rural_properties
    WHERE centroid_lat IS NOT NULL AND centroid_lng IS NOT NULL
    ORDER BY random() LIMIT 8
  LOOP
    base_lat := prop.centroid_lat::numeric + (random() - 0.5) * 0.05;
    base_lng := prop.centroid_lng::numeric + (random() - 0.5) * 0.05;
    sz := 0.01 + random() * 0.03;
    ext_id := upper(_layer_type::text) || '-' || substr(md5(random()::text), 1, 8);
    INSERT INTO public.data_layer_features
      (layer_id, data_source_key, external_id, geometry_geojson, properties_json, municipality, uf, area_ha)
    VALUES (
      layer_uuid, _data_source_key, ext_id,
      jsonb_build_object(
        'type', 'Polygon',
        'coordinates', jsonb_build_array(jsonb_build_array(
          jsonb_build_array(base_lng - sz, base_lat - sz),
          jsonb_build_array(base_lng + sz, base_lat - sz),
          jsonb_build_array(base_lng + sz, base_lat + sz),
          jsonb_build_array(base_lng - sz, base_lat + sz),
          jsonb_build_array(base_lng - sz, base_lat - sz)
        ))
      ),
      jsonb_build_object('source', _data_source_key, 'layer_type', _layer_type::text, 'simulated', true),
      prop.municipio, prop.uf, round((50 + random()*1500)::numeric, 2)
    );
    feat_count := feat_count + 1;
  END LOOP;

  -- 2) Random across UFs (12 features)
  FOR i IN 1..12 LOOP
    cx := -65 + random() * 25; -- approx Brazil lng range
    cy := -20 + random() * 18; -- approx lat range
    sz := 0.05 + random() * 0.2;
    ext_id := upper(_layer_type::text) || '-' || substr(md5(random()::text), 1, 8);
    INSERT INTO public.data_layer_features
      (layer_id, data_source_key, external_id, geometry_geojson, properties_json, municipality, uf, area_ha)
    VALUES (
      layer_uuid, _data_source_key, ext_id,
      jsonb_build_object(
        'type', 'Polygon',
        'coordinates', jsonb_build_array(jsonb_build_array(
          jsonb_build_array(cx - sz, cy - sz),
          jsonb_build_array(cx + sz, cy - sz),
          jsonb_build_array(cx + sz, cy + sz),
          jsonb_build_array(cx - sz, cy + sz),
          jsonb_build_array(cx - sz, cy - sz)
        ))
      ),
      jsonb_build_object('source', _data_source_key, 'layer_type', _layer_type::text, 'simulated', true),
      NULL, ufs[1 + floor(random() * array_length(ufs,1))::int],
      round((100 + random()*5000)::numeric, 2)
    );
    feat_count := feat_count + 1;
  END LOOP;

  -- update data_sources last_sync_at
  UPDATE public.data_sources SET last_sync_at = now() WHERE key = _data_source_key;

  RETURN layer_uuid;
END $$;

-- 6. Function: import a feature as rural property
CREATE OR REPLACE FUNCTION public.import_layer_feature_as_property(
  _feature_id UUID,
  _client_id UUID DEFAULT NULL,
  _name TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  feat RECORD;
  layer RECORD;
  org_id UUID;
  new_prop_id UUID;
  centroid_lat NUMERIC;
  centroid_lng NUMERIC;
  coords JSONB;
  pt JSONB;
  sx NUMERIC := 0; sy NUMERIC := 0; n INT := 0;
BEGIN
  org_id := public.current_org_id();
  IF org_id IS NULL THEN RAISE EXCEPTION 'Sem organização ativa'; END IF;
  IF NOT public.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'tecnico'::app_role]) THEN
    RAISE EXCEPTION 'Permissão negada';
  END IF;

  SELECT * INTO feat FROM public.data_layer_features WHERE id = _feature_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Feature não encontrada'; END IF;
  SELECT * INTO layer FROM public.data_layers WHERE id = feat.layer_id;

  -- compute centroid (average of first ring for polygon)
  IF feat.geometry_geojson->>'type' = 'Polygon' THEN
    coords := feat.geometry_geojson->'coordinates'->0;
    FOR pt IN SELECT * FROM jsonb_array_elements(coords) LOOP
      sx := sx + (pt->>0)::numeric;
      sy := sy + (pt->>1)::numeric;
      n := n + 1;
    END LOOP;
    IF n > 0 THEN
      centroid_lng := sx / n;
      centroid_lat := sy / n;
    END IF;
  END IF;

  INSERT INTO public.rural_properties
    (organization_id, client_id, name, area_ha, municipio, uf, centroid_lat, centroid_lng,
     car_code, matricula_source, created_by)
  VALUES (
    org_id, _client_id,
    COALESCE(_name, layer.name || ' — ' || COALESCE(feat.external_id, substr(_feature_id::text, 1, 8))),
    feat.area_ha, feat.municipality, feat.uf, centroid_lat, centroid_lng,
    CASE WHEN layer.layer_type = 'car' THEN feat.external_id ELSE NULL END,
    CASE WHEN layer.layer_type = 'sigef' THEN 'sigef'::matricula_source
         WHEN layer.layer_type = 'car' THEN 'car'::matricula_source
         ELSE 'desconhecida'::matricula_source END,
    auth.uid()
  ) RETURNING id INTO new_prop_id;

  -- Save geometry
  INSERT INTO public.property_geometries (property_id, organization_id, geojson, source)
  VALUES (
    new_prop_id, org_id,
    jsonb_build_object(
      'type', 'Feature',
      'geometry', feat.geometry_geojson,
      'properties', feat.properties_json,
      '_meta', jsonb_build_object('filename', 'imported-from-layer-' || layer.name, 'filetype', 'geojson')
    ),
    layer.data_source_key
  );

  -- Run diagnostics
  PERFORM public.run_property_diagnostics(new_prop_id);

  -- Onboarding progress
  UPDATE public.organization_onboarding
    SET has_created_property = true, has_run_diagnosis = true
    WHERE organization_id = org_id;

  RETURN new_prop_id;
END $$;

-- 7. Function: documental search (simulated lookup by identifier)
CREATE OR REPLACE FUNCTION public.search_documental_sources(_identifier TEXT, _id_type TEXT DEFAULT 'cpf_cnpj')
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSONB := '[]'::jsonb;
  src RECORD;
  rnd FLOAT;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;
  IF _identifier IS NULL OR length(trim(_identifier)) < 3 THEN
    RAISE EXCEPTION 'Identificador inválido';
  END IF;

  FOR src IN SELECT * FROM public.data_sources WHERE source_kind = 'documental' AND enabled = true LOOP
    rnd := random();
    IF rnd < 0.4 THEN
      result := result || jsonb_build_array(jsonb_build_object(
        'source_key', src.key,
        'source_name', src.name,
        'identifier', _identifier,
        'id_type', _id_type,
        'found', true,
        'severidade', CASE WHEN rnd < 0.15 THEN 'alta' ELSE 'media' END,
        'title', src.name || ' — ocorrência encontrada',
        'description', 'Registro simulado vinculado ao identificador ' || _identifier,
        'data', jsonb_build_object('numero', 'SIM-' || floor(random()*999999)::int::text, 'data_referencia', (CURRENT_DATE - floor(random()*365)::int)::text)
      ));
    ELSE
      result := result || jsonb_build_array(jsonb_build_object(
        'source_key', src.key,
        'source_name', src.name,
        'identifier', _identifier,
        'id_type', _id_type,
        'found', false,
        'severidade', 'baixa',
        'title', src.name || ' — sem ocorrências',
        'description', 'Nenhum registro encontrado para o identificador informado.',
        'data', '{}'::jsonb
      ));
    END IF;
  END LOOP;

  RETURN result;
END $$;