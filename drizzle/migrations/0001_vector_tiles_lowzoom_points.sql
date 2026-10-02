ALTER TABLE public.data_layer_features ADD COLUMN IF NOT EXISTS centroid_3857 geometry(Point,3857);

CREATE OR REPLACE FUNCTION public.data_layer_features_set_3857()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.geometry IS NOT NULL THEN
    NEW.geometry_3857 := ST_Transform(NEW.geometry, 3857);
    NEW.geometry_3857_low := ST_SimplifyPreserveTopology(NEW.geometry_3857, 150);
    NEW.centroid_3857 := ST_PointOnSurface(NEW.geometry_3857);
  ELSE
    NEW.geometry_3857 := NULL; NEW.geometry_3857_low := NULL; NEW.centroid_3857 := NULL;
  END IF;
  RETURN NEW;
END $$;

UPDATE public.data_layer_features SET centroid_3857 = ST_Centroid(geometry_3857)
WHERE geometry_3857 IS NOT NULL AND centroid_3857 IS NULL;

CREATE INDEX IF NOT EXISTS idx_dlf_centroid3857_gist ON public.data_layer_features USING gist (centroid_3857);

CREATE OR REPLACE FUNCTION public.get_vector_tile_bin(_layer_id uuid, _z integer, _x integer, _y integer)
RETURNS bytea LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE _allowed boolean; _tile bytea; _env geometry; _px double precision;
BEGIN
  SELECT (l.visible_to_users = true) OR public.is_super_admin() INTO _allowed
  FROM public.data_layers l WHERE l.id = _layer_id;
  IF NOT COALESCE(_allowed, false) THEN RETURN NULL; END IF;
  _env := ST_TileEnvelope(_z, _x, _y);
  IF _z < 9 THEN
    -- Densidade: centroides agregados por pixel (grade de 512 px por tile)
    _px := (ST_XMax(_env) - ST_XMin(_env)) / 512;
    SELECT ST_AsMVT(m.*, 'points', 512, 'geom') INTO _tile FROM (
      SELECT ST_AsMVTGeom(ST_SnapToGrid(f.centroid_3857, _px), _env, 512, 0, false) AS geom,
             count(*)::int AS n
      FROM public.data_layer_features f
      WHERE f.layer_id = _layer_id AND f.centroid_3857 && _env
      GROUP BY ST_SnapToGrid(f.centroid_3857, _px)
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