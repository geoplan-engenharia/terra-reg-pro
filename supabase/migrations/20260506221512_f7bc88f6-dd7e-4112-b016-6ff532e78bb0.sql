CREATE OR REPLACE FUNCTION public.get_vector_tile(_layer_id uuid, _z integer, _x integer, _y integer)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _allowed boolean;
  _tile bytea;
  _tol  double precision;
BEGIN
  SELECT (l.visible_to_users = true) OR public.is_super_admin()
    INTO _allowed
  FROM public.data_layers l
  WHERE l.id = _layer_id;
  IF NOT COALESCE(_allowed, false) THEN RETURN NULL; END IF;

  _tol := CASE
    WHEN _z < 6 THEN 5000
    WHEN _z < 9 THEN 1000
    WHEN _z < 12 THEN 200
    WHEN _z < 14 THEN 30
    ELSE 0
  END;

  WITH
    bounds AS (
      SELECT ST_TileEnvelope(_z, _x, _y) AS env_3857,
             ST_Transform(ST_TileEnvelope(_z, _x, _y, margin => (64.0/4096)), 4326) AS env_wgs
    ),
    src AS (
      SELECT f.id::text AS id,
             COALESCE(f.external_id, '') AS ext,
             COALESCE(f.area_ha, 0)::float AS area_ha,
             ST_Transform(f.geometry, 3857) AS geom_3857
      FROM public.data_layer_features f, bounds
      WHERE f.layer_id = _layer_id
        AND f.geometry IS NOT NULL
        AND f.geometry && bounds.env_wgs
    ),
    simplified AS (
      SELECT id, ext, area_ha,
             CASE WHEN _tol > 0
                  THEN ST_SimplifyPreserveTopology(geom_3857, _tol)
                  ELSE geom_3857
             END AS geom_3857
      FROM src
    ),
    mvtgeom AS (
      SELECT
        ST_AsMVTGeom(s.geom_3857, b.env_3857, 4096, 64, true) AS geom,
        s.id, s.ext, s.area_ha
      FROM simplified s, bounds b
      WHERE s.geom_3857 IS NOT NULL
    )
  SELECT ST_AsMVT(m.*, 'features', 4096, 'geom')
    INTO _tile
  FROM mvtgeom m
  WHERE m.geom IS NOT NULL;

  IF _tile IS NULL THEN RETURN ''; END IF;
  RETURN encode(_tile, 'base64');
END $$;