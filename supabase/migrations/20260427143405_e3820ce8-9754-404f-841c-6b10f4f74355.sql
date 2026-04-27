-- Enum for rule category
DO $$ BEGIN
  CREATE TYPE public.rule_category AS ENUM ('fundiaria', 'ambiental', 'licenciamento', 'monitoramento');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Table: diagnostic_rules
CREATE TABLE IF NOT EXISTS public.diagnostic_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  key TEXT NOT NULL,
  category public.rule_category NOT NULL,
  severity public.severidade NOT NULL DEFAULT 'media',
  description TEXT,
  report_message TEXT NOT NULL,
  condition_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, key)
);

ALTER TABLE public.diagnostic_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members read rules" ON public.diagnostic_rules
  FOR SELECT USING (organization_id = current_org_id());

CREATE POLICY "admin manages rules" ON public.diagnostic_rules
  FOR ALL USING (organization_id = current_org_id() AND has_role(auth.uid(), 'admin'))
  WITH CHECK (organization_id = current_org_id() AND has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_diagnostic_rules_updated
  BEFORE UPDATE ON public.diagnostic_rules
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX IF NOT EXISTS idx_diagnostic_rules_org ON public.diagnostic_rules(organization_id);
CREATE INDEX IF NOT EXISTS idx_diagnostic_rules_key ON public.diagnostic_rules(key);

-- Function to seed default rules into an organization
CREATE OR REPLACE FUNCTION public.seed_default_diagnostic_rules(_org_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.diagnostic_rules (organization_id, name, key, category, severity, description, report_message, condition_json) VALUES
    (_org_id, 'Imóvel sem certificação SIGEF', 'sigef_nao_certificado', 'fundiaria', 'media',
      'Verifica se o imóvel possui certificação SIGEF/INCRA.',
      'O imóvel não possui certificação SIGEF/INCRA.',
      '{"field":"sigef_status","op":"neq","value":"certificado"}'::jsonb),
    (_org_id, 'Matrícula com baixa confiabilidade', 'matricula_baixa_confiabilidade', 'fundiaria', 'media',
      'Identifica matrículas com fonte pouco confiável.',
      'A matrícula informada possui baixa confiabilidade documental.',
      '{"field":"matricula_confiabilidade","op":"eq","value":"baixa"}'::jsonb),
    (_org_id, 'CAR pendente', 'car_pendente', 'fundiaria', 'media',
      'Identifica imóveis com CAR em análise/pendente.',
      'O Cadastro Ambiental Rural (CAR) encontra-se pendente de análise.',
      '{"field":"car_status","op":"eq","value":"pendente"}'::jsonb),
    (_org_id, 'CAR suspenso ou cancelado', 'car_suspenso_cancelado', 'fundiaria', 'alta',
      'Identifica CARs suspensos ou cancelados.',
      'O Cadastro Ambiental Rural (CAR) encontra-se suspenso ou cancelado.',
      '{"field":"car_status","op":"in","value":["suspenso","cancelado"]}'::jsonb),
    (_org_id, 'Alerta de desmatamento', 'desmatamento', 'ambiental', 'alta',
      'Detecta indícios de desmatamento na área do imóvel.',
      'Foram detectados indícios de desmatamento na área do imóvel.',
      '{"source":"environmental_analysis","field":"has_desmatamento","op":"eq","value":true}'::jsonb),
    (_org_id, 'Área embargada', 'embargo', 'ambiental', 'alta',
      'Identifica sobreposição com áreas embargadas (IBAMA).',
      'O imóvel possui sobreposição com áreas embargadas.',
      '{"source":"environmental_analysis","field":"has_embargo","op":"eq","value":true}'::jsonb),
    (_org_id, 'Possível déficit de Reserva Legal', 'reserva_legal_deficit', 'ambiental', 'media',
      'Identifica possível déficit de Reserva Legal.',
      'Possível déficit de Reserva Legal identificado pelas regras automáticas.',
      '{"source":"environmental_analysis","field":"has_reserva_legal_deficit","op":"eq","value":true}'::jsonb),
    (_org_id, 'Possível intervenção em APP', 'app_violation', 'ambiental', 'media',
      'Identifica possível ocupação/intervenção em Área de Preservação Permanente.',
      'Possível intervenção em Área de Preservação Permanente (APP).',
      '{"source":"environmental_analysis","field":"has_app_violation","op":"eq","value":true}'::jsonb)
  ON CONFLICT (organization_id, key) DO NOTHING;
END $$;

-- Seed defaults for existing orgs
DO $$
DECLARE org RECORD;
BEGIN
  FOR org IN SELECT id FROM public.organizations LOOP
    PERFORM public.seed_default_diagnostic_rules(org.id);
  END LOOP;
END $$;

-- Trigger: seed defaults for new orgs
CREATE OR REPLACE FUNCTION public.trg_seed_rules_for_new_org()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.seed_default_diagnostic_rules(NEW.id);
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_seed_rules_after_org ON public.organizations;
CREATE TRIGGER trg_seed_rules_after_org
  AFTER INSERT ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.trg_seed_rules_for_new_org();

-- Updated diagnostics function honoring active rules
CREATE OR REPLACE FUNCTION public.run_property_diagnostics(_property_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  prop public.rural_properties%ROWTYPE;
  env  public.environmental_analysis%ROWTYPE;
  has_active_lic BOOLEAN;
  rule RECORD;
  trigger_match BOOLEAN;
BEGIN
  SELECT * INTO prop FROM public.rural_properties WHERE id = _property_id;
  IF NOT FOUND THEN RETURN; END IF;

  -- Refresh matricula confiabilidade based on source
  IF prop.matricula_source IN ('sigef','cartorio') THEN
    UPDATE public.rural_properties SET matricula_confiabilidade = 'alta' WHERE id = _property_id;
    prop.matricula_confiabilidade := 'alta';
  ELSIF prop.matricula_source = 'car' THEN
    UPDATE public.rural_properties SET matricula_confiabilidade = 'media' WHERE id = _property_id;
    prop.matricula_confiabilidade := 'media';
  ELSE
    UPDATE public.rural_properties SET matricula_confiabilidade = 'baixa' WHERE id = _property_id;
    prop.matricula_confiabilidade := 'baixa';
  END IF;

  -- Latest environmental analysis
  SELECT * INTO env FROM public.environmental_analysis
  WHERE property_id = _property_id ORDER BY analyzed_at DESC LIMIT 1;

  -- Clear previous auto-generated diagnostics
  DELETE FROM public.property_diagnostics WHERE property_id = _property_id AND rule_key IS NOT NULL;

  -- Iterate active rules of the org
  FOR rule IN
    SELECT * FROM public.diagnostic_rules
    WHERE organization_id = prop.organization_id AND is_active = true
  LOOP
    trigger_match := false;

    IF rule.key = 'sigef_nao_certificado' THEN
      trigger_match := COALESCE(prop.sigef_status::text, 'desconhecido') <> 'certificado';
    ELSIF rule.key = 'matricula_baixa_confiabilidade' THEN
      trigger_match := prop.matricula_confiabilidade::text = 'baixa';
    ELSIF rule.key = 'car_pendente' THEN
      trigger_match := prop.car_status::text = 'pendente';
    ELSIF rule.key = 'car_suspenso_cancelado' THEN
      trigger_match := prop.car_status::text IN ('suspenso','cancelado');
    ELSIF rule.key = 'desmatamento' THEN
      trigger_match := env.id IS NOT NULL AND COALESCE(env.has_desmatamento, false);
    ELSIF rule.key = 'embargo' THEN
      trigger_match := env.id IS NOT NULL AND COALESCE(env.has_embargo, false);
    ELSIF rule.key = 'reserva_legal_deficit' THEN
      trigger_match := env.id IS NOT NULL AND COALESCE(env.has_reserva_legal_deficit, false);
    ELSIF rule.key = 'app_violation' THEN
      trigger_match := env.id IS NOT NULL AND COALESCE(env.has_app_violation, false);
    END IF;

    IF trigger_match THEN
      INSERT INTO public.property_diagnostics
        (property_id, organization_id, kind, title, description, severidade, rule_key)
      VALUES
        (_property_id, prop.organization_id,
         CASE rule.category
           WHEN 'ambiental' THEN 'irregularidade_ambiental'::diagnostic_kind
           WHEN 'fundiaria' THEN 'sem_certificacao'::diagnostic_kind
           ELSE 'sem_certificacao'::diagnostic_kind
         END,
         rule.name,
         rule.report_message,
         rule.severity,
         rule.key);
    END IF;
  END LOOP;

  -- If no negative diagnostics, mark as regular
  IF NOT EXISTS (
    SELECT 1 FROM public.property_diagnostics
    WHERE property_id = _property_id AND severidade IN ('alta','media')
  ) THEN
    INSERT INTO public.property_diagnostics
      (property_id, organization_id, kind, title, description, severidade, rule_key)
    VALUES
      (_property_id, prop.organization_id, 'regular', 'Imóvel regular',
       'Sem pendências detectadas pelas regras automáticas.', 'baixa', 'regular');
  END IF;
END $$;