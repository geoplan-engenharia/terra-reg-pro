CREATE OR REPLACE FUNCTION public.get_vector_tile_bin(_layer_id uuid, _z integer, _x integer, _y integer)
RETURNS bytea LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE _allowed boolean; _tile bytea; _env geometry; _px double precision;
BEGIN
  SELECT (l.visible_to_users = true) OR public.is_super_admin() INTO _allowed
  FROM public.data_layers l WHERE l.id = _layer_id;
  IF NOT COALESCE(_allowed, false) THEN RETURN NULL; END IF;
  _env := ST_TileEnvelope(_z, _x, _y);
  IF _z < 8 THEN
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

-- Extensão da camada em EPSG:3857 (usada para pré-gerar recortes)
CREATE OR REPLACE FUNCTION public.get_layer_extent_3857(_layer_id uuid)
RETURNS TABLE(xmin double precision, ymin double precision, xmax double precision, ymax double precision)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_super_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY SELECT ST_XMin(e), ST_YMin(e), ST_XMax(e), ST_YMax(e)
  FROM (SELECT ST_Extent(p.geom)::geometry AS e FROM public.data_layer_points p WHERE p.layer_id = _layer_id) s
  WHERE e IS NOT NULL;
END $$;
REVOKE ALL ON FUNCTION public.get_layer_extent_3857(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_layer_extent_3857(uuid) TO authenticated, service_role;

ALTER TABLE public.integration_jobs
  ADD COLUMN IF NOT EXISTS tiles_status text,
  ADD COLUMN IF NOT EXISTS tiles_done integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tiles_total integer,
  ADD COLUMN IF NOT EXISTS tiles_saved integer NOT NULL DEFAULT 0;

REVOKE EXECUTE ON FUNCTION public.get_vector_tile_bin(uuid,integer,integer,integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_feature_by_id(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_vector_tile_bin(uuid,integer,integer,integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_feature_by_id(uuid) TO authenticated, service_role;

DROP FUNCTION IF EXISTS public.get_vector_tile(uuid,integer,integer,integer);