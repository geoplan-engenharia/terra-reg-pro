CREATE OR REPLACE FUNCTION public.admin_platform_overview()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  result jsonb;
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  SELECT jsonb_build_object(
    'total_organizations', (SELECT COUNT(*) FROM public.organizations),
    'total_users', (SELECT COUNT(*) FROM public.profiles),
    'total_properties', (SELECT COUNT(*) FROM public.rural_properties),
    'total_licenses', (SELECT COUNT(*) FROM public.environmental_licenses),
    'active_subscriptions', (SELECT COUNT(*) FROM public.organization_subscriptions WHERE status = 'ativo'),
    'trial_subscriptions', (SELECT COUNT(*) FROM public.organization_subscriptions WHERE status = 'trial'),
    'canceled_subscriptions', (SELECT COUNT(*) FROM public.organization_subscriptions WHERE status IN ('cancelado','expirado','pausado')),
    'mrr_estimated', (
      SELECT COALESCE(SUM(
        CASE WHEN os.billing_cycle = 'mensal' THEN sp.price_monthly
             WHEN os.billing_cycle = 'anual' THEN sp.price_yearly / 12.0
             ELSE 0 END
      ), 0)
      FROM public.organization_subscriptions os
      JOIN public.subscription_plans sp ON sp.key = os.plan_key
      WHERE os.status = 'ativo'
    ),
    'arr_estimated', (
      SELECT COALESCE(SUM(
        CASE WHEN os.billing_cycle = 'mensal' THEN sp.price_monthly * 12
             WHEN os.billing_cycle = 'anual' THEN sp.price_yearly
             ELSE 0 END
      ), 0)
      FROM public.organization_subscriptions os
      JOIN public.subscription_plans sp ON sp.key = os.plan_key
      WHERE os.status = 'ativo'
    ),
    'plans_distribution', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('plan_key', plan_key, 'count', cnt)), '[]'::jsonb)
      FROM (
        SELECT plan_key, COUNT(*) AS cnt
        FROM public.organization_subscriptions
        GROUP BY plan_key
      ) t
    )
  ) INTO result;

  RETURN result;
END $function$;