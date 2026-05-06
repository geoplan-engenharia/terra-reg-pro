-- 1) PostGIS
CREATE EXTENSION IF NOT EXISTS postgis;

-- 2) Add native geometry column to data_layer_features (kept alongside geometry_geojson as fallback)
ALTER TABLE public.data_layer_features
  ADD COLUMN IF NOT EXISTS geometry geometry(Geometry, 4326);

-- 3) Trigger to keep geometry in sync from geometry_geojson
CREATE OR REPLACE FUNCTION public.tg_data_layer_features_geom()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.geometry_geojson IS NOT NULL
     AND (TG_OP = 'INSERT'
          OR NEW.geometry_geojson IS DISTINCT FROM OLD.geometry_geojson
          OR NEW.geometry IS NULL) THEN
    BEGIN
      NEW.geometry := ST_SetSRID(ST_GeomFromGeoJSON(NEW.geometry_geojson::text), 4326);
    EXCEPTION WHEN OTHERS THEN
      NEW.geometry := NULL;
    END;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS data_layer_features_geom_trg ON public.data_layer_features;
CREATE TRIGGER data_layer_features_geom_trg
BEFORE INSERT OR UPDATE ON public.data_layer_features
FOR EACH ROW EXECUTE FUNCTION public.tg_data_layer_features_geom();

-- 4) Backfill existing rows
UPDATE public.data_layer_features
SET geometry = ST_SetSRID(ST_GeomFromGeoJSON(geometry_geojson::text), 4326)
WHERE geometry IS NULL AND geometry_geojson IS NOT NULL;

-- 5) GIST index on geometry (web mercator transform expression too, for fast MVT)
CREATE INDEX IF NOT EXISTS idx_data_layer_features_geom_gist
  ON public.data_layer_features USING GIST (geometry);
CREATE INDEX IF NOT EXISTS idx_data_layer_features_layer_id
  ON public.data_layer_features (layer_id);

-- 6) MVT tile function. Returns base64-encoded MVT bytes for transport via PostgREST/RPC.
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
  -- Visibility/auth check (allow anonymous for visible layers; super_admin sees all)
  SELECT (l.visible_to_users = true) OR public.is_super_admin()
    INTO _allowed
  FROM public.data_layers l
  WHERE l.id = _layer_id;

  IF NOT COALESCE(_allowed, false) THEN
    RETURN NULL;
  END IF;

  -- Simplification tolerance (in meters @ web mercator) — coarser at low zoom
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
      SELECT f.id,
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
        s.id::text AS id,
        s.ext,
        s.area_ha
      FROM simplified s, bounds b
      WHERE s.geom_3857 IS NOT NULL
    )
  SELECT ST_AsMVT(m.*, 'features', 4096, 'geom', 'id')
    INTO _tile
  FROM mvtgeom m
  WHERE m.geom IS NOT NULL;

  IF _tile IS NULL THEN
    RETURN '';
  END IF;
  RETURN encode(_tile, 'base64');
END $$;

-- Allow anon + authenticated to call (visibility enforced inside function)
GRANT EXECUTE ON FUNCTION public.get_vector_tile(uuid, integer, integer, integer) TO anon, authenticated;

-- 7) Lookup full feature properties by id (for click panel)
CREATE OR REPLACE FUNCTION public.get_feature_by_id(_feature_id uuid)
RETURNS SETOF public.data_layer_features
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _allowed boolean;
BEGIN
  SELECT (l.visible_to_users = true) OR public.is_super_admin()
    INTO _allowed
  FROM public.data_layer_features f
  JOIN public.data_layers l ON l.id = f.layer_id
  WHERE f.id = _feature_id;
  IF NOT COALESCE(_allowed, false) THEN RETURN; END IF;
  RETURN QUERY SELECT * FROM public.data_layer_features WHERE id = _feature_id;
END $$;

GRANT EXECUTE ON FUNCTION public.get_feature_by_id(uuid) TO anon, authenticated;