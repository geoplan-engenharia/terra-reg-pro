-- 1) Super admin flag on profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN NOT NULL DEFAULT false;

-- 2) Helper function: is_super_admin
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((SELECT is_super_admin FROM public.profiles WHERE id = _user_id), false)
$$;

-- 3) Cross-org SELECT policies for super_admin
CREATE POLICY "super_admin reads all orgs"
  ON public.organizations FOR SELECT
  USING (public.is_super_admin());

CREATE POLICY "super_admin updates any org"
  ON public.organizations FOR UPDATE
  USING (public.is_super_admin());

CREATE POLICY "super_admin reads all profiles"
  ON public.profiles FOR SELECT
  USING (public.is_super_admin());

CREATE POLICY "super_admin updates any profile"
  ON public.profiles FOR UPDATE
  USING (public.is_super_admin());

CREATE POLICY "super_admin reads all subscriptions"
  ON public.organization_subscriptions FOR SELECT
  USING (public.is_super_admin());

CREATE POLICY "super_admin updates any subscription"
  ON public.organization_subscriptions FOR UPDATE
  USING (public.is_super_admin());

CREATE POLICY "super_admin inserts any subscription"
  ON public.organization_subscriptions FOR INSERT
  WITH CHECK (public.is_super_admin());

CREATE POLICY "super_admin reads all roles"
  ON public.user_roles FOR SELECT
  USING (public.is_super_admin());

CREATE POLICY "super_admin manages any role"
  ON public.user_roles FOR ALL
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY "super_admin reads all properties"
  ON public.rural_properties FOR SELECT
  USING (public.is_super_admin());

CREATE POLICY "super_admin reads all licenses"
  ON public.environmental_licenses FOR SELECT
  USING (public.is_super_admin());

CREATE POLICY "super_admin manages plans"
  ON public.subscription_plans FOR ALL
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- 4) Support reports table (bugs / suggestions)
CREATE TABLE IF NOT EXISTS public.support_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID,
  user_id UUID,
  report_type TEXT NOT NULL DEFAULT 'bug',
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'aberto',
  priority TEXT NOT NULL DEFAULT 'media',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_support_reports_org ON public.support_reports(organization_id);
CREATE INDEX IF NOT EXISTS idx_support_reports_status ON public.support_reports(status);

ALTER TABLE public.support_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members read own org reports"
  ON public.support_reports FOR SELECT
  USING (organization_id = public.current_org_id() OR public.is_super_admin());

CREATE POLICY "members create reports"
  ON public.support_reports FOR INSERT
  WITH CHECK (
    (organization_id = public.current_org_id() AND user_id = auth.uid())
    OR public.is_super_admin()
  );

CREATE POLICY "super_admin updates any report"
  ON public.support_reports FOR UPDATE
  USING (public.is_super_admin());

CREATE POLICY "super_admin deletes any report"
  ON public.support_reports FOR DELETE
  USING (public.is_super_admin());

CREATE TRIGGER trg_support_reports_updated
  BEFORE UPDATE ON public.support_reports
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 5) Aggregated RPCs for super_admin
CREATE OR REPLACE FUNCTION public.admin_platform_overview()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
    'canceled_subscriptions', (SELECT COUNT(*) FROM public.organization_subscriptions WHERE status IN ('cancelado','inativo','pausado')),
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
END $$;

CREATE OR REPLACE FUNCTION public.admin_organizations_overview()
RETURNS TABLE (
  id uuid,
  name text,
  slug text,
  created_at timestamptz,
  plan_key text,
  billing_cycle billing_cycle,
  subscription_status subscription_status,
  expires_at timestamptz,
  users_count bigint,
  properties_count bigint,
  licenses_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  RETURN QUERY
  SELECT
    o.id, o.name, o.slug, o.created_at,
    os.plan_key, os.billing_cycle, os.status, os.expires_at,
    (SELECT COUNT(*) FROM public.profiles p WHERE p.organization_id = o.id),
    (SELECT COUNT(*) FROM public.rural_properties rp WHERE rp.organization_id = o.id),
    (SELECT COUNT(*) FROM public.environmental_licenses el WHERE el.organization_id = o.id)
  FROM public.organizations o
  LEFT JOIN public.organization_subscriptions os ON os.organization_id = o.id
  ORDER BY o.created_at DESC;
END $$;

CREATE OR REPLACE FUNCTION public.admin_users_overview()
RETURNS TABLE (
  id uuid,
  full_name text,
  email text,
  organization_id uuid,
  organization_name text,
  roles text[],
  created_at timestamptz,
  is_super_admin boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  RETURN QUERY
  SELECT
    p.id, p.full_name, p.email, p.organization_id,
    o.name,
    COALESCE(ARRAY(SELECT ur.role::text FROM public.user_roles ur WHERE ur.user_id = p.id AND ur.organization_id = p.organization_id), ARRAY[]::text[]),
    p.created_at,
    p.is_super_admin
  FROM public.profiles p
  LEFT JOIN public.organizations o ON o.id = p.organization_id
  ORDER BY p.created_at DESC;
END $$;

CREATE OR REPLACE FUNCTION public.admin_organization_details(_org_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  SELECT jsonb_build_object(
    'organization', (SELECT to_jsonb(o.*) FROM public.organizations o WHERE o.id = _org_id),
    'subscription', (SELECT to_jsonb(os.*) FROM public.organization_subscriptions os WHERE os.organization_id = _org_id),
    'plan', (
      SELECT to_jsonb(sp.*) FROM public.subscription_plans sp
      WHERE sp.key = (SELECT plan_key FROM public.organization_subscriptions WHERE organization_id = _org_id)
    ),
    'users', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', p.id, 'full_name', p.full_name, 'email', p.email,
        'roles', COALESCE(ARRAY(SELECT ur.role::text FROM public.user_roles ur WHERE ur.user_id = p.id AND ur.organization_id = _org_id), ARRAY[]::text[]),
        'created_at', p.created_at
      )), '[]'::jsonb)
      FROM public.profiles p WHERE p.organization_id = _org_id
    ),
    'usage', jsonb_build_object(
      'properties', (SELECT COUNT(*) FROM public.rural_properties WHERE organization_id = _org_id),
      'users', (SELECT COUNT(*) FROM public.profiles WHERE organization_id = _org_id),
      'licenses', (SELECT COUNT(*) FROM public.environmental_licenses WHERE organization_id = _org_id)
    )
  ) INTO result;

  RETURN result;
END $$;