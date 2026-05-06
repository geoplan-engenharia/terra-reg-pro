
-- Recursive bbox computer for arbitrary GeoJSON geometry
CREATE OR REPLACE FUNCTION public._coords_minmax(node jsonb, INOUT mn numeric[], INOUT mx numeric[])
LANGUAGE plpgsql IMMUTABLE
AS $$
DECLARE
  child jsonb;
  lng numeric;
  lat numeric;
BEGIN
  IF jsonb_typeof(node) <> 'array' THEN RETURN; END IF;
  IF jsonb_array_length(node) >= 2
     AND jsonb_typeof(node->0) = 'number'
     AND jsonb_typeof(node->1) = 'number' THEN
    lng := (node->>0)::numeric;
    lat := (node->>1)::numeric;
    IF mn IS NULL THEN mn := ARRAY[lng, lat]; mx := ARRAY[lng, lat];
    ELSE
      IF lng < mn[1] THEN mn[1] := lng; END IF;
      IF lat < mn[2] THEN mn[2] := lat; END IF;
      IF lng > mx[1] THEN mx[1] := lng; END IF;
      IF lat > mx[2] THEN mx[2] := lat; END IF;
    END IF;
  ELSE
    FOR child IN SELECT * FROM jsonb_array_elements(node) LOOP
      SELECT * FROM public._coords_minmax(child, mn, mx) INTO mn, mx;
    END LOOP;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.geojson_bbox(geom jsonb)
RETURNS numeric[]
LANGUAGE plpgsql IMMUTABLE
AS $$
DECLARE
  coords jsonb;
  mn numeric[];
  mx numeric[];
BEGIN
  IF geom IS NULL THEN RETURN NULL; END IF;
  coords := geom->'coordinates';
  IF coords IS NULL THEN RETURN NULL; END IF;
  SELECT * FROM public._coords_minmax(coords, NULL::numeric[], NULL::numeric[]) INTO mn, mx;
  IF mn IS NULL THEN RETURN NULL; END IF;
  RETURN ARRAY[mn[1], mn[2], mx[1], mx[2]];
END $$;

ALTER TABLE public.data_layer_features
  ADD COLUMN IF NOT EXISTS bbox_min_lng numeric,
  ADD COLUMN IF NOT EXISTS bbox_min_lat numeric,
  ADD COLUMN IF NOT EXISTS bbox_max_lng numeric,
  ADD COLUMN IF NOT EXISTS bbox_max_lat numeric;

CREATE OR REPLACE FUNCTION public.tg_data_layer_features_bbox()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  b numeric[];
BEGIN
  IF NEW.geometry_geojson IS NOT NULL
     AND (TG_OP = 'INSERT'
          OR NEW.geometry_geojson IS DISTINCT FROM OLD.geometry_geojson
          OR NEW.bbox_min_lng IS NULL) THEN
    b := public.geojson_bbox(NEW.geometry_geojson);
    IF b IS NOT NULL THEN
      NEW.bbox_min_lng := b[1];
      NEW.bbox_min_lat := b[2];
      NEW.bbox_max_lng := b[3];
      NEW.bbox_max_lat := b[4];
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS data_layer_features_bbox_trg ON public.data_layer_features;
CREATE TRIGGER data_layer_features_bbox_trg
BEFORE INSERT OR UPDATE ON public.data_layer_features
FOR EACH ROW EXECUTE FUNCTION public.tg_data_layer_features_bbox();

CREATE INDEX IF NOT EXISTS data_layer_features_layer_bbox_idx
  ON public.data_layer_features (layer_id, bbox_min_lng, bbox_max_lng, bbox_min_lat, bbox_max_lat);

CREATE OR REPLACE FUNCTION public.get_features_in_bbox(
  _layer_id uuid,
  _min_lng numeric,
  _min_lat numeric,
  _max_lng numeric,
  _max_lat numeric,
  _zoom int
)
RETURNS SETOF public.data_layer_features
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _limit int;
  _sample boolean := false;
  _allowed boolean;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  SELECT (l.visible_to_users = true) OR public.is_super_admin()
    INTO _allowed
  FROM public.data_layers l
  WHERE l.id = _layer_id;
  IF NOT COALESCE(_allowed, false) THEN
    RAISE EXCEPTION 'Camada não acessível';
  END IF;

  IF _zoom < 8 THEN
    _limit := 500;
    _sample := true;
  ELSIF _zoom > 12 THEN
    _limit := 5000;
  ELSE
    _limit := 2000;
  END IF;

  IF _sample THEN
    RETURN QUERY
    SELECT * FROM public.data_layer_features f
    WHERE f.layer_id = _layer_id
      AND f.bbox_min_lng IS NOT NULL
      AND f.bbox_max_lng >= _min_lng
      AND f.bbox_min_lng <= _max_lng
      AND f.bbox_max_lat >= _min_lat
      AND f.bbox_min_lat <= _max_lat
    ORDER BY random()
    LIMIT _limit;
  ELSE
    RETURN QUERY
    SELECT * FROM public.data_layer_features f
    WHERE f.layer_id = _layer_id
      AND f.bbox_min_lng IS NOT NULL
      AND f.bbox_max_lng >= _min_lng
      AND f.bbox_min_lng <= _max_lng
      AND f.bbox_max_lat >= _min_lat
      AND f.bbox_min_lat <= _max_lat
    LIMIT _limit;
  END IF;
END $$;

GRANT EXECUTE ON FUNCTION public.get_features_in_bbox(uuid, numeric, numeric, numeric, numeric, int) TO authenticated;
