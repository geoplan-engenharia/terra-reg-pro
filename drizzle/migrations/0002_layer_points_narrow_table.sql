CREATE TABLE IF NOT EXISTS public.data_layer_points (
  feature_id uuid PRIMARY KEY REFERENCES public.data_layer_features(id) ON DELETE CASCADE,
  layer_id uuid NOT NULL,
  geom geometry(Point,3857) NOT NULL
);
GRANT ALL ON public.data_layer_points TO service_role;
ALTER TABLE public.data_layer_points ENABLE ROW LEVEL SECURITY;

INSERT INTO public.data_layer_points (feature_id, layer_id, geom)
SELECT id, layer_id, centroid_3857 FROM public.data_layer_features WHERE centroid_3857 IS NOT NULL
ON CONFLICT (feature_id) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_dlp_layer_geom ON public.data_layer_points USING gist (geom);
CREATE INDEX IF NOT EXISTS idx_dlp_layer ON public.data_layer_points (layer_id);

CREATE OR REPLACE FUNCTION public.data_layer_points_sync()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.centroid_3857 IS NULL THEN
    DELETE FROM public.data_layer_points WHERE feature_id = NEW.id;
  ELSE
    INSERT INTO public.data_layer_points (feature_id, layer_id, geom)
    VALUES (NEW.id, NEW.layer_id, NEW.centroid_3857)
    ON CONFLICT (feature_id) DO UPDATE SET geom = EXCLUDED.geom, layer_id = EXCLUDED.layer_id;
  END IF;
  RETURN NULL;
END $$;
DROP TRIGGER IF EXISTS trg_dlp_sync ON public.data_layer_features;
CREATE TRIGGER trg_dlp_sync AFTER INSERT OR UPDATE OF geometry ON public.data_layer_features
FOR EACH ROW EXECUTE FUNCTION public.data_layer_points_sync();

CREATE OR REPLACE FUNCTION public.get_vector_tile_bin(_layer_id uuid, _z integer, _x integer, _y integer)
RETURNS bytea LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE _allowed boolean; _tile bytea; _env geometry; _px double precision;
BEGIN
  SELECT (l.visible_to_users = true) OR public.is_super_admin() INTO _allowed
  FROM public.data_layers l WHERE l.id = _layer_id;
  IF NOT COALESCE(_allowed, false) THEN RETURN NULL; END IF;
  _env := ST_TileEnvelope(_z, _x, _y);
  IF _z < 9 THEN
    _px := (ST_XMax(_env) - ST_XMin(_env)) / 512;
    SELECT ST_AsMVT(m.*, 'points', 512, 'geom') INTO _tile FROM (
      SELECT ST_AsMVTGeom(g, _env, 512, 0, false) AS geom, n FROM (
        SELECT ST_SnapToGrid(p.geom, _px) AS g, count(*)::int AS n
        FROM public.data_layer_points p
        WHERE p.layer_id = _layer_id AND p.geom && _env
        GROUP BY 1
      ) s
    ) m WHERE m.geom IS NOT NULL;
  ELSIF _z < 11 THEN
    SELECT ST_AsMVT(m.*, 'features', 2048, 'geom') INTO _tile FROM (
      SELECT ST_AsMVTGeom(f.geometry_3857_low, _env, 2048, 16, true) AS geom,
             f.id::text AS id, COALESCE(f.external_id,'') AS cod_imovel
      FROM public.data_layer_features f
      WHERE f.layer_id = _layer_id AND f.geometry_3857_low && _env
    ) m WHERE m.geom IS NOT NULL;
  ELSE
    SELECT ST_AsMVT(m.*, 'features', 4096, 'geom') INTO _tile FROM (
      SELECT ST_AsMVTGeom(f.geometry_3857, _env, 4096, 64, true) AS geom,
             f.id::text AS id, COALESCE(f.external_id,'') AS cod_imovel,
             COALESCE(f.area_ha,0)::float AS area_ha, COALESCE(f.municipality,'') AS municipio
      FROM public.data_layer_features f
      WHERE f.layer_id = _layer_id AND f.geometry_3857 && _env
    ) m WHERE m.geom IS NOT NULL;
  END IF;
  RETURN COALESCE(_tile, ''::bytea);
END $$;