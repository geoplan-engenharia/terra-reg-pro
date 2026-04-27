
-- Tables
CREATE TABLE public.simulated_sync_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  data_source_key TEXT NOT NULL,
  property_id UUID,
  status TEXT NOT NULL DEFAULT 'sucesso',
  message TEXT,
  findings_count INT NOT NULL DEFAULT 0,
  raw_payload JSONB,
  triggered_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sim_runs_org_created ON public.simulated_sync_runs(organization_id, created_at DESC);
CREATE INDEX idx_sim_runs_source ON public.simulated_sync_runs(data_source_key);
CREATE INDEX idx_sim_runs_property ON public.simulated_sync_runs(property_id);

CREATE TABLE public.simulated_sync_findings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES public.simulated_sync_runs(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL,
  data_source_key TEXT NOT NULL,
  property_id UUID,
  finding_type TEXT NOT NULL,
  severidade public.severidade NOT NULL DEFAULT 'baixa',
  title TEXT NOT NULL,
  description TEXT,
  data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sim_findings_org ON public.simulated_sync_findings(organization_id, created_at DESC);
CREATE INDEX idx_sim_findings_run ON public.simulated_sync_findings(run_id);

ALTER TABLE public.simulated_sync_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.simulated_sync_findings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "members read sim runs"
  ON public.simulated_sync_runs FOR SELECT
  USING (organization_id = current_org_id());

CREATE POLICY "admin deletes sim runs"
  ON public.simulated_sync_runs FOR DELETE
  USING (organization_id = current_org_id() AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "members read sim findings"
  ON public.simulated_sync_findings FOR SELECT
  USING (organization_id = current_org_id());

CREATE POLICY "admin deletes sim findings"
  ON public.simulated_sync_findings FOR DELETE
  USING (organization_id = current_org_id() AND has_role(auth.uid(), 'admin'::app_role));

-- Function: run_simulated_sync
CREATE OR REPLACE FUNCTION public.run_simulated_sync(
  _data_source_key TEXT,
  _property_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  org_id UUID;
  user_id UUID;
  run_id UUID;
  prop public.rural_properties%ROWTYPE;
  source RECORD;
  rnd FLOAT;
  i INT;
  count_findings INT := 0;
  payload JSONB := '{}'::jsonb;
  ufs TEXT[] := ARRAY['MT','PA','RO','MA','TO','GO','BA','MS'];
  classes TEXT[] := ARRAY['Floresta','Pastagem','Agricultura','Mosaico','Solo Exposto'];
BEGIN
  user_id := auth.uid();
  org_id := public.current_org_id();
  IF org_id IS NULL THEN
    RAISE EXCEPTION 'Sem organização ativa';
  END IF;

  -- Permission: only admin or tecnico can trigger
  IF NOT public.has_any_role(user_id, ARRAY['admin'::app_role, 'tecnico'::app_role]) THEN
    RAISE EXCEPTION 'Permissão negada para executar sincronização simulada';
  END IF;

  -- Validate source exists & belongs to system
  SELECT * INTO source FROM public.data_sources WHERE key = _data_source_key LIMIT 1;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Fonte de dados não encontrada: %', _data_source_key;
  END IF;

  IF _property_id IS NOT NULL THEN
    SELECT * INTO prop FROM public.rural_properties WHERE id = _property_id AND organization_id = org_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Imóvel não encontrado nesta organização';
    END IF;
  END IF;

  -- Create run record (initially)
  INSERT INTO public.simulated_sync_runs (organization_id, data_source_key, property_id, status, message, triggered_by)
  VALUES (org_id, _data_source_key, _property_id, 'sucesso', 'Execução simulada concluída', user_id)
  RETURNING id INTO run_id;

  -- Branch by data source key (case-insensitive contains)
  IF _data_source_key ILIKE '%car%' THEN
    -- Generate fake CAR record
    payload := jsonb_build_object(
      'car_code', 'SIM-' || upper(substr(md5(run_id::text), 1, 4)) || '-' || floor(random()*9999)::int::text,
      'status', (ARRAY['ativo','pendente','suspenso'])[1 + floor(random()*3)::int],
      'area_ha', round((100 + random()*1500)::numeric, 2),
      'modulos_fiscais', round((1 + random()*15)::numeric, 1)
    );
    INSERT INTO public.simulated_sync_findings (run_id, organization_id, data_source_key, property_id, finding_type, severidade, title, description, data)
    VALUES (run_id, org_id, _data_source_key, _property_id, 'cadastro_car',
      CASE payload->>'status' WHEN 'suspenso' THEN 'alta'::severidade WHEN 'pendente' THEN 'media'::severidade ELSE 'baixa'::severidade END,
      'Cadastro CAR simulado: ' || (payload->>'car_code'),
      'Status simulado: ' || (payload->>'status') || ' — área ' || (payload->>'area_ha') || ' ha',
      payload);
    count_findings := 1;

    IF _property_id IS NOT NULL THEN
      UPDATE public.rural_properties
      SET car_code = payload->>'car_code',
          car_status = (CASE payload->>'status'
            WHEN 'ativo' THEN 'ativo'
            WHEN 'pendente' THEN 'pendente'
            WHEN 'suspenso' THEN 'suspenso'
            ELSE 'pendente' END)::car_status,
          last_consultation_at = now()
      WHERE id = _property_id;
    END IF;

  ELSIF _data_source_key ILIKE '%sigef%' THEN
    payload := jsonb_build_object(
      'sigef_code', 'SIM-SIGEF-' || floor(random()*999999)::int::text,
      'status', (ARRAY['certificado','em_analise','nao_certificado'])[1 + floor(random()*3)::int],
      'data_certificacao', (CURRENT_DATE - (floor(random()*1500)::int))::text
    );
    INSERT INTO public.simulated_sync_findings (run_id, organization_id, data_source_key, property_id, finding_type, severidade, title, description, data)
    VALUES (run_id, org_id, _data_source_key, _property_id, 'certificacao_sigef',
      CASE payload->>'status' WHEN 'certificado' THEN 'baixa'::severidade ELSE 'media'::severidade END,
      'Certificação SIGEF simulada',
      'Status: ' || (payload->>'status'),
      payload);
    count_findings := 1;

    IF _property_id IS NOT NULL THEN
      UPDATE public.rural_properties
      SET sigef_status = (payload->>'status')::sigef_status,
          last_consultation_at = now()
      WHERE id = _property_id;
    END IF;

  ELSIF _data_source_key ILIKE '%mapbiomas%' THEN
    -- Generate 2-4 land use samples
    FOR i IN 1..(2 + floor(random()*3)::int) LOOP
      payload := jsonb_build_object(
        'classe', classes[1 + floor(random()*array_length(classes,1))::int],
        'ano', 2018 + floor(random()*7)::int,
        'area_ha', round((random()*500)::numeric, 2)
      );
      INSERT INTO public.simulated_sync_findings (run_id, organization_id, data_source_key, property_id, finding_type, severidade, title, description, data)
      VALUES (run_id, org_id, _data_source_key, _property_id, 'cobertura_mapbiomas', 'baixa'::severidade,
        'Cobertura ' || (payload->>'classe') || ' (' || (payload->>'ano') || ')',
        'Área simulada: ' || (payload->>'area_ha') || ' ha',
        payload);
      count_findings := count_findings + 1;
    END LOOP;

  ELSIF _data_source_key ILIKE '%deter%' OR _data_source_key ILIKE '%prodes%' THEN
    rnd := random();
    IF rnd < 0.7 THEN
      payload := jsonb_build_object(
        'tipo_alerta', (ARRAY['CR','DS','MN','CICATRIZ_DE_QUEIMADA'])[1 + floor(random()*4)::int],
        'area_ha', round((0.5 + random()*30)::numeric, 2),
        'data_deteccao', (CURRENT_DATE - floor(random()*60)::int)::text,
        'uf', ufs[1 + floor(random()*array_length(ufs,1))::int]
      );
      INSERT INTO public.simulated_sync_findings (run_id, organization_id, data_source_key, property_id, finding_type, severidade, title, description, data)
      VALUES (run_id, org_id, _data_source_key, _property_id, 'alerta_desmatamento', 'alta'::severidade,
        'Alerta DETER simulado — ' || (payload->>'tipo_alerta'),
        'Área detectada: ' || (payload->>'area_ha') || ' ha em ' || (payload->>'data_deteccao'),
        payload);
      count_findings := 1;

      IF _property_id IS NOT NULL THEN
        INSERT INTO public.monitoring_alerts (property_id, organization_id, alert_type, title, description, severidade, source, alert_date)
        VALUES (_property_id, org_id, 'desmatamento',
          'Alerta DETER simulado',
          'Área de ' || (payload->>'area_ha') || ' ha detectada em ' || (payload->>'data_deteccao'),
          'alta', 'simulacao_deter', now());
      END IF;
    ELSE
      INSERT INTO public.simulated_sync_findings (run_id, organization_id, data_source_key, property_id, finding_type, severidade, title, description, data)
      VALUES (run_id, org_id, _data_source_key, _property_id, 'sem_alerta', 'baixa'::severidade,
        'Nenhum alerta detectado', 'Consulta simulada sem ocorrências.', '{}'::jsonb);
      count_findings := 1;
    END IF;

  ELSIF _data_source_key ILIKE '%ibama%' OR _data_source_key ILIKE '%embargo%' THEN
    rnd := random();
    IF rnd < 0.5 THEN
      payload := jsonb_build_object(
        'numero_ato', 'TAD-' || floor(random()*99999)::int::text,
        'area_embargada_ha', round((0.5 + random()*50)::numeric, 2),
        'data_embargo', (CURRENT_DATE - floor(random()*365)::int)::text,
        'motivo', 'Desmatamento ilegal (simulado)'
      );
      INSERT INTO public.simulated_sync_findings (run_id, organization_id, data_source_key, property_id, finding_type, severidade, title, description, data)
      VALUES (run_id, org_id, _data_source_key, _property_id, 'embargo_ibama', 'alta'::severidade,
        'Embargo IBAMA simulado — ' || (payload->>'numero_ato'),
        'Área: ' || (payload->>'area_embargada_ha') || ' ha — ' || (payload->>'motivo'),
        payload);
      count_findings := 1;

      IF _property_id IS NOT NULL THEN
        INSERT INTO public.monitoring_alerts (property_id, organization_id, alert_type, title, description, severidade, source, alert_date)
        VALUES (_property_id, org_id, 'embargo',
          'Embargo IBAMA simulado',
          'Ato ' || (payload->>'numero_ato') || ' — ' || (payload->>'area_embargada_ha') || ' ha',
          'alta', 'simulacao_ibama', now());
      END IF;
    ELSE
      INSERT INTO public.simulated_sync_findings (run_id, organization_id, data_source_key, property_id, finding_type, severidade, title, description, data)
      VALUES (run_id, org_id, _data_source_key, _property_id, 'sem_embargo', 'baixa'::severidade,
        'Nenhum embargo encontrado', 'Consulta simulada sem ocorrências.', '{}'::jsonb);
      count_findings := 1;
    END IF;

  ELSE
    -- Generic simulation
    INSERT INTO public.simulated_sync_findings (run_id, organization_id, data_source_key, property_id, finding_type, severidade, title, description, data)
    VALUES (run_id, org_id, _data_source_key, _property_id, 'consulta_generica', 'baixa'::severidade,
      'Consulta simulada concluída',
      'Esta fonte não tem simulação especializada. Geração genérica.',
      jsonb_build_object('timestamp', now()));
    count_findings := 1;
  END IF;

  -- Update run findings count and source last_sync_at
  UPDATE public.simulated_sync_runs SET findings_count = count_findings WHERE id = run_id;
  UPDATE public.data_sources SET last_sync_at = now() WHERE key = _data_source_key;

  -- Re-run diagnostics if a property is involved (CAR/SIGEF changes affect rules)
  IF _property_id IS NOT NULL THEN
    PERFORM public.run_property_diagnostics(_property_id);
  END IF;

  -- Log in consultation_history
  INSERT INTO public.consultation_history (organization_id, user_id, property_id, data_source_key, query_params, result_summary)
  VALUES (org_id, user_id, _property_id, _data_source_key,
    jsonb_build_object('mode', 'simulated', 'run_id', run_id),
    'Sincronização simulada — ' || count_findings || ' achado(s).');

  RETURN run_id;
END $$;

GRANT EXECUTE ON FUNCTION public.run_simulated_sync(TEXT, UUID) TO authenticated;
