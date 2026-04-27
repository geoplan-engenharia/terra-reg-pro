-- Subscription plans catalog
CREATE TABLE public.subscription_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  max_properties INTEGER NOT NULL DEFAULT 0,
  max_users INTEGER NOT NULL DEFAULT 0,
  max_licenses INTEGER NOT NULL DEFAULT 0,
  can_use_custom_rules BOOLEAN NOT NULL DEFAULT false,
  can_use_simulated_sync BOOLEAN NOT NULL DEFAULT false,
  can_export_reports BOOLEAN NOT NULL DEFAULT true,
  price_monthly NUMERIC(10,2) NOT NULL DEFAULT 0,
  price_yearly NUMERIC(10,2) NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth reads plans" ON public.subscription_plans
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "admin manages plans" ON public.subscription_plans
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_subscription_plans_updated_at
  BEFORE UPDATE ON public.subscription_plans
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Subscription status enum
CREATE TYPE public.subscription_status AS ENUM ('ativo', 'trial', 'pausado', 'cancelado', 'expirado');
CREATE TYPE public.billing_cycle AS ENUM ('mensal', 'anual');

-- Organization subscriptions
CREATE TABLE public.organization_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL UNIQUE,
  plan_key TEXT NOT NULL REFERENCES public.subscription_plans(key),
  billing_cycle public.billing_cycle NOT NULL DEFAULT 'mensal',
  status public.subscription_status NOT NULL DEFAULT 'trial',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.organization_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members read own subscription" ON public.organization_subscriptions
  FOR SELECT USING (organization_id = current_org_id());

CREATE POLICY "admin updates own subscription" ON public.organization_subscriptions
  FOR UPDATE USING (organization_id = current_org_id() AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "admin inserts own subscription" ON public.organization_subscriptions
  FOR INSERT WITH CHECK (organization_id = current_org_id() AND has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_org_subscriptions_updated_at
  BEFORE UPDATE ON public.organization_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Seed default plans (matching /precos page)
INSERT INTO public.subscription_plans
  (key, name, max_properties, max_users, max_licenses, can_use_custom_rules, can_use_simulated_sync, can_export_reports, price_monthly, price_yearly, sort_order)
VALUES
  ('starter',       'Starter',       25,  3,  50,  false, true,  true, 149.00, 1428.00, 1),
  ('profissional',  'Profissional',  150, 10, 300, true,  true,  true, 449.00, 4308.00, 2),
  ('enterprise',    'Enterprise',    100000, 100000, 100000, true, true, true, 0, 0, 3);

-- Auto-assign trial of profissional plan when an organization is created
CREATE OR REPLACE FUNCTION public.trg_seed_subscription_for_new_org()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.organization_subscriptions (organization_id, plan_key, billing_cycle, status, started_at, expires_at)
  VALUES (NEW.id, 'profissional', 'mensal', 'trial', now(), now() + INTERVAL '14 days')
  ON CONFLICT (organization_id) DO NOTHING;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_org_seed_subscription
  AFTER INSERT ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.trg_seed_subscription_for_new_org();

-- Backfill subscriptions for existing organizations
INSERT INTO public.organization_subscriptions (organization_id, plan_key, billing_cycle, status, started_at, expires_at)
SELECT id, 'profissional', 'mensal', 'trial', now(), now() + INTERVAL '14 days'
FROM public.organizations
ON CONFLICT (organization_id) DO NOTHING;