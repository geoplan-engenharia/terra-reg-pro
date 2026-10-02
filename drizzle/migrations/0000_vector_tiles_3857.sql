ALTER TABLE public.data_layer_features ADD COLUMN IF NOT EXISTS geometry_3857 geometry(Geometry,3857);
ALTER TABLE public.data_layer_features ADD COLUMN IF NOT EXISTS geometry_3857_low geometry(Geometry,3857);

CREATE OR REPLACE FUNCTION public.data_layer_features_set_3857()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.geometry IS NOT NULL THEN
    NEW.geometry_3857 := ST_Transform(NEW.geometry, 3857);
    NEW.geometry_3857_low := ST_SimplifyPreserveTopology(NEW.geometry_3857, 150);
  ELSE
    NEW.geometry_3857 := NULL; NEW.geometry_3857_low := NULL;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_dlf_3857 ON public.data_layer_features;
CREATE TRIGGER trg_dlf_3857 BEFORE INSERT OR UPDATE OF geometry ON public.data_layer_features
FOR EACH ROW EXECUTE FUNCTION public.data_layer_features_set_3857();

UPDATE public.data_layer_features
SET geometry_3857 = ST_Transform(geometry, 3857),
    geometry_3857_low = ST_SimplifyPreserveTopology(ST_Transform(geometry, 3857), 150)
WHERE geometry IS NOT NULL AND geometry_3857 IS NULL;

CREATE INDEX IF NOT EXISTS idx_dlf_geom3857_gist ON public.data_layer_features USING gist (geometry_3857);
CREATE INDEX IF NOT EXISTS idx_dlf_geom3857low_gist ON public.data_layer_features USING gist (geometry_3857_low);

CREATE OR REPLACE FUNCTION public.get_vector_tile_bin(_layer_id uuid, _z integer, _x integer, _y integer)
RETURNS bytea LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE _allowed boolean; _tile bytea; _env geometry; _tol double precision;
BEGIN
  SELECT (l.visible_to_users = true) OR public.is_super_admin() INTO _allowed
  FROM public.data_layers l WHERE l.id = _layer_id;
  IF NOT COALESCE(_allowed, false) THEN RETURN NULL; END IF;
  _env := ST_TileEnvelope(_z, _x, _y);
  IF _z < 10 THEN
    _tol := 40075016.0 / (256 * 2 ^ _z);  -- ~1 pixel
    SELECT ST_AsMVT(m.*, 'features', 4096, 'geom') INTO _tile FROM (
      SELECT ST_AsMVTGeom(ST_Simplify(f.geometry_3857_low, _tol, true), _env, 4096, 16, true) AS geom,
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
GRANT EXECUTE ON FUNCTION public.get_vector_tile_bin(uuid,int,int,int) TO service_role, authenticated, anon;