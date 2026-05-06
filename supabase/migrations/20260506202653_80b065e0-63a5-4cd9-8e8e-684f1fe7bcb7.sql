CREATE OR REPLACE FUNCTION public.get_features_density(_layer_id uuid, _limit integer DEFAULT 50000)
RETURNS TABLE(id uuid, lng numeric, lat numeric)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
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

  RETURN QUERY
  SELECT f.id,
         ((f.bbox_min_lng + f.bbox_max_lng) / 2.0)::numeric AS lng,
         ((f.bbox_min_lat + f.bbox_max_lat) / 2.0)::numeric AS lat
  FROM public.data_layer_features f
  WHERE f.layer_id = _layer_id
    AND f.bbox_min_lng IS NOT NULL
  LIMIT GREATEST(_limit, 1);
END $function$;