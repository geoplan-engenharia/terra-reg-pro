DROP POLICY IF EXISTS "auth reads providers" ON public.integration_providers;
DROP POLICY IF EXISTS "auth reads jobs" ON public.integration_jobs;

DROP POLICY IF EXISTS "auth reads data sources" ON public.data_sources;
CREATE POLICY "read enabled data sources" ON public.data_sources FOR SELECT TO authenticated
  USING (enabled = true OR public.is_super_admin());

DROP POLICY IF EXISTS "auth reads plans" ON public.subscription_plans;
CREATE POLICY "read active plans" ON public.subscription_plans FOR SELECT TO authenticated
  USING (is_active = true OR public.is_super_admin());