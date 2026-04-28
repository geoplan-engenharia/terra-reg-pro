-- Trial: 7 dias (em vez de 14)
CREATE OR REPLACE FUNCTION public.trg_seed_subscription_for_new_org()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.organization_subscriptions (organization_id, plan_key, billing_cycle, status, started_at, expires_at)
  VALUES (NEW.id, 'profissional', 'mensal', 'trial', now(), now() + INTERVAL '7 days')
  ON CONFLICT (organization_id) DO NOTHING;
  RETURN NEW;
END $function$;

-- Tabela de progresso de onboarding por organização
CREATE TABLE IF NOT EXISTS public.organization_onboarding (
  organization_id uuid PRIMARY KEY,
  has_created_client boolean NOT NULL DEFAULT false,
  has_created_property boolean NOT NULL DEFAULT false,
  has_run_diagnosis boolean NOT NULL DEFAULT false,
  has_generated_report boolean NOT NULL DEFAULT false,
  onboarding_dismissed boolean NOT NULL DEFAULT false,
  onboarding_completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.organization_onboarding ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members read onboarding"
  ON public.organization_onboarding FOR SELECT
  USING (organization_id = current_org_id() OR is_super_admin());

CREATE POLICY "members upsert onboarding insert"
  ON public.organization_onboarding FOR INSERT
  WITH CHECK (organization_id = current_org_id());

CREATE POLICY "members update onboarding"
  ON public.organization_onboarding FOR UPDATE
  USING (organization_id = current_org_id());

CREATE TRIGGER trg_touch_onboarding_updated
  BEFORE UPDATE ON public.organization_onboarding
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Seed onboarding row when org is created
CREATE OR REPLACE FUNCTION public.trg_seed_onboarding_for_new_org()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.organization_onboarding (organization_id)
  VALUES (NEW.id)
  ON CONFLICT (organization_id) DO NOTHING;
  RETURN NEW;
END $function$;

DROP TRIGGER IF EXISTS trg_seed_onboarding ON public.organizations;
CREATE TRIGGER trg_seed_onboarding
  AFTER INSERT ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.trg_seed_onboarding_for_new_org();

-- Backfill para orgs existentes
INSERT INTO public.organization_onboarding (organization_id, has_created_client, has_created_property, has_run_diagnosis)
SELECT o.id,
  EXISTS(SELECT 1 FROM public.clients c WHERE c.organization_id = o.id),
  EXISTS(SELECT 1 FROM public.rural_properties rp WHERE rp.organization_id = o.id),
  EXISTS(SELECT 1 FROM public.property_diagnostics pd WHERE pd.organization_id = o.id)
FROM public.organizations o
ON CONFLICT (organization_id) DO NOTHING;