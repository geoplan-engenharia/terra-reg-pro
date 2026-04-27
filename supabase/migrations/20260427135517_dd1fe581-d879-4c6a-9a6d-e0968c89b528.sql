
-- =========================================================
-- ENUMS
-- =========================================================
CREATE TYPE public.app_role AS ENUM ('admin', 'tecnico', 'financeiro', 'visualizador');
CREATE TYPE public.car_status AS ENUM ('ativo', 'pendente', 'cancelado', 'suspenso', 'nao_cadastrado');
CREATE TYPE public.sigef_status AS ENUM ('certificado', 'em_analise', 'nao_certificado', 'desconhecido');
CREATE TYPE public.matricula_source AS ENUM ('cartorio', 'sigef', 'car', 'declarado', 'desconhecida');
CREATE TYPE public.confiabilidade AS ENUM ('alta', 'media', 'baixa');
CREATE TYPE public.severidade AS ENUM ('alta', 'media', 'baixa');
CREATE TYPE public.diagnostic_kind AS ENUM ('regular', 'irregularidade_ambiental', 'sem_certificacao', 'embargo', 'desmatamento', 'sobreposicao', 'documental', 'outro');
CREATE TYPE public.alert_status AS ENUM ('novo', 'visualizado', 'resolvido');
CREATE TYPE public.license_status AS ENUM ('ativa', 'vencida', 'em_renovacao', 'suspensa', 'cancelada');
CREATE TYPE public.license_alert_kind AS ENUM ('180_dias', '90_dias', '30_dias', 'vencida');
CREATE TYPE public.invite_status AS ENUM ('pendente', 'aceito', 'expirado', 'revogado');

-- =========================================================
-- ORGANIZATIONS
-- =========================================================
CREATE TABLE public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- =========================================================
-- PROFILES
-- =========================================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE INDEX ON public.profiles(organization_id);

-- =========================================================
-- USER ROLES (separate table — security best practice)
-- =========================================================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, organization_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE INDEX ON public.user_roles(user_id);

-- =========================================================
-- SECURITY DEFINER HELPERS (avoid RLS recursion)
-- =========================================================
CREATE OR REPLACE FUNCTION public.current_org_id()
RETURNS UUID
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id FROM public.profiles WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.has_any_role(_user_id UUID, _roles public.app_role[])
RETURNS BOOLEAN
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = ANY(_roles)
  )
$$;

CREATE OR REPLACE FUNCTION public.is_org_member(_org_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND organization_id = _org_id
  )
$$;

-- =========================================================
-- ORG INVITES
-- =========================================================
CREATE TABLE public.org_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role public.app_role NOT NULL DEFAULT 'visualizador',
  token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(24), 'hex'),
  status public.invite_status NOT NULL DEFAULT 'pendente',
  invited_by UUID REFERENCES auth.users(id),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '14 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.org_invites ENABLE ROW LEVEL SECURITY;
CREATE INDEX ON public.org_invites(organization_id);
CREATE INDEX ON public.org_invites(token);

-- =========================================================
-- CLIENTS
-- =========================================================
CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  document TEXT,
  email TEXT,
  phone TEXT,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
CREATE INDEX ON public.clients(organization_id);

-- =========================================================
-- RURAL PROPERTIES
-- =========================================================
CREATE TABLE public.rural_properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  owner_name TEXT,
  municipio TEXT,
  uf TEXT,
  area_ha NUMERIC(14,4),
  car_code TEXT,
  car_status public.car_status DEFAULT 'nao_cadastrado',
  sigef_status public.sigef_status DEFAULT 'desconhecido',
  matricula_number TEXT,
  matricula_source public.matricula_source DEFAULT 'desconhecida',
  matricula_confiabilidade public.confiabilidade DEFAULT 'baixa',
  centroid_lat NUMERIC(10,7),
  centroid_lng NUMERIC(10,7),
  monitorado BOOLEAN NOT NULL DEFAULT false,
  last_consultation_at TIMESTAMPTZ,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.rural_properties ENABLE ROW LEVEL SECURITY;
CREATE INDEX ON public.rural_properties(organization_id);
CREATE INDEX ON public.rural_properties(client_id);
CREATE INDEX ON public.rural_properties(monitorado) WHERE monitorado = true;

-- =========================================================
-- PROPERTY GEOMETRIES (GeoJSON for now; ready for PostGIS later)
-- =========================================================
CREATE TABLE public.property_geometries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.rural_properties(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  source TEXT,
  geojson JSONB NOT NULL,
  bbox JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.property_geometries ENABLE ROW LEVEL SECURITY;
CREATE INDEX ON public.property_geometries(property_id);

-- =========================================================
-- PROPERTY REGISTRY (cartório)
-- =========================================================
CREATE TABLE public.property_registry_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.rural_properties(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  cartorio_name TEXT,
  livro TEXT,
  folha TEXT,
  matricula_number TEXT,
  data_emissao DATE,
  observacoes TEXT,
  raw_payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.property_registry_data ENABLE ROW LEVEL SECURITY;
CREATE INDEX ON public.property_registry_data(property_id);

-- =========================================================
-- ENVIRONMENTAL ANALYSIS
-- =========================================================
CREATE TABLE public.environmental_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.rural_properties(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  has_desmatamento BOOLEAN DEFAULT false,
  has_embargo BOOLEAN DEFAULT false,
  has_app_violation BOOLEAN DEFAULT false,
  has_reserva_legal_deficit BOOLEAN DEFAULT false,
  desmatamento_area_ha NUMERIC(14,4),
  embargo_area_ha NUMERIC(14,4),
  raw_payload JSONB,
  analyzed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.environmental_analysis ENABLE ROW LEVEL SECURITY;
CREATE INDEX ON public.environmental_analysis(property_id);

-- =========================================================
-- PROPERTY DIAGNOSTICS
-- =========================================================
CREATE TABLE public.property_diagnostics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.rural_properties(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  kind public.diagnostic_kind NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  severidade public.severidade NOT NULL DEFAULT 'baixa',
  rule_key TEXT,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.property_diagnostics ENABLE ROW LEVEL SECURITY;
CREATE INDEX ON public.property_diagnostics(property_id);

-- =========================================================
-- MONITORING ALERTS
-- =========================================================
CREATE TABLE public.monitoring_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.rural_properties(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  severidade public.severidade NOT NULL DEFAULT 'media',
  status public.alert_status NOT NULL DEFAULT 'novo',
  source TEXT,
  alert_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.monitoring_alerts ENABLE ROW LEVEL SECURITY;
CREATE INDEX ON public.monitoring_alerts(organization_id);
CREATE INDEX ON public.monitoring_alerts(property_id);

-- =========================================================
-- ENVIRONMENTAL LICENSES
-- =========================================================
CREATE TABLE public.environmental_licenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  property_id UUID REFERENCES public.rural_properties(id) ON DELETE SET NULL,
  license_type TEXT NOT NULL,
  license_number TEXT,
  issuing_body TEXT,
  licensed_activity TEXT,
  issue_date DATE,
  expiration_date DATE,
  attachment_url TEXT,
  status public.license_status NOT NULL DEFAULT 'ativa',
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.environmental_licenses ENABLE ROW LEVEL SECURITY;
CREATE INDEX ON public.environmental_licenses(organization_id);
CREATE INDEX ON public.environmental_licenses(expiration_date);

-- =========================================================
-- LICENSE ALERTS
-- =========================================================
CREATE TABLE public.license_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  license_id UUID NOT NULL REFERENCES public.environmental_licenses(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  kind public.license_alert_kind NOT NULL,
  triggered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status public.alert_status NOT NULL DEFAULT 'novo',
  UNIQUE(license_id, kind)
);
ALTER TABLE public.license_alerts ENABLE ROW LEVEL SECURITY;
CREATE INDEX ON public.license_alerts(organization_id);

-- =========================================================
-- DATA SOURCES (CAR, SIGEF, MapBiomas, PRODES, IBAMA, etc.)
-- =========================================================
CREATE TABLE public.data_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  endpoint_url TEXT,
  enabled BOOLEAN NOT NULL DEFAULT true,
  config JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.data_sources ENABLE ROW LEVEL SECURITY;

-- Seed default data sources
INSERT INTO public.data_sources (key, name, category, description, enabled) VALUES
('car', 'CAR/SICAR', 'fundiario', 'Cadastro Ambiental Rural', true),
('sigef', 'SIGEF/INCRA', 'fundiario', 'Sistema de Gestão Fundiária', true),
('mapbiomas', 'MapBiomas', 'ambiental', 'Cobertura e uso do solo', true),
('prodes', 'PRODES/DETER', 'desmatamento', 'Monitoramento de desmatamento', true),
('ibama', 'IBAMA', 'fiscalizacao', 'Embargos e autuações', true),
('estadual_licenciamento', 'Bases estaduais', 'licenciamento', 'Órgãos estaduais de licenciamento', true);

-- =========================================================
-- CONSULTATION HISTORY
-- =========================================================
CREATE TABLE public.consultation_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  property_id UUID REFERENCES public.rural_properties(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id),
  data_source_key TEXT,
  query_params JSONB,
  result_summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.consultation_history ENABLE ROW LEVEL SECURITY;
CREATE INDEX ON public.consultation_history(organization_id);
CREATE INDEX ON public.consultation_history(property_id);

-- =========================================================
-- updated_at trigger
-- =========================================================
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

CREATE TRIGGER trg_touch_org BEFORE UPDATE ON public.organizations FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_touch_profile BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_touch_clients BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_touch_props BEFORE UPDATE ON public.rural_properties FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_touch_lic BEFORE UPDATE ON public.environmental_licenses FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- =========================================================
-- AUTO-CREATE PROFILE + ORGANIZATION ON SIGNUP
-- =========================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_org_id UUID;
  org_name TEXT;
  org_slug TEXT;
  invite_token TEXT;
  invite_row public.org_invites%ROWTYPE;
BEGIN
  invite_token := NEW.raw_user_meta_data->>'invite_token';

  IF invite_token IS NOT NULL AND invite_token <> '' THEN
    SELECT * INTO invite_row FROM public.org_invites
    WHERE token = invite_token AND status = 'pendente' AND expires_at > now()
    LIMIT 1;

    IF invite_row.id IS NOT NULL THEN
      INSERT INTO public.profiles (id, organization_id, full_name, email)
      VALUES (NEW.id, invite_row.organization_id,
              COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), NEW.email);

      INSERT INTO public.user_roles (user_id, organization_id, role)
      VALUES (NEW.id, invite_row.organization_id, invite_row.role);

      UPDATE public.org_invites SET status = 'aceito' WHERE id = invite_row.id;
      RETURN NEW;
    END IF;
  END IF;

  -- No valid invite → create new organization, user becomes admin
  org_name := COALESCE(NEW.raw_user_meta_data->>'org_name',
                       NEW.raw_user_meta_data->>'full_name',
                       'Escritório de ' || split_part(NEW.email, '@', 1));
  org_slug := lower(regexp_replace(org_name, '[^a-zA-Z0-9]+', '-', 'g')) || '-' || substr(NEW.id::text, 1, 8);

  INSERT INTO public.organizations (name, slug) VALUES (org_name, org_slug) RETURNING id INTO new_org_id;

  INSERT INTO public.profiles (id, organization_id, full_name, email)
  VALUES (NEW.id, new_org_id,
          COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), NEW.email);

  INSERT INTO public.user_roles (user_id, organization_id, role)
  VALUES (NEW.id, new_org_id, 'admin');

  RETURN NEW;
END $$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =========================================================
-- DIAGNOSTIC RULES ENGINE
-- =========================================================
CREATE OR REPLACE FUNCTION public.run_property_diagnostics(_property_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  prop public.rural_properties%ROWTYPE;
  env  public.environmental_analysis%ROWTYPE;
BEGIN
  SELECT * INTO prop FROM public.rural_properties WHERE id = _property_id;
  IF NOT FOUND THEN RETURN; END IF;

  -- Clear previous auto-generated diagnostics
  DELETE FROM public.property_diagnostics WHERE property_id = _property_id AND rule_key IS NOT NULL;

  -- Rule: SIGEF não certificado
  IF prop.sigef_status <> 'certificado' THEN
    INSERT INTO public.property_diagnostics (property_id, organization_id, kind, title, description, severidade, rule_key)
    VALUES (_property_id, prop.organization_id, 'sem_certificacao',
            'Sem certificação fundiária',
            'O imóvel não possui certificação SIGEF/INCRA.',
            'media', 'sigef_nao_certificado');
  END IF;

  -- Rule: confiabilidade da matrícula
  IF prop.matricula_source = 'sigef' THEN
    UPDATE public.rural_properties SET matricula_confiabilidade = 'alta' WHERE id = _property_id;
  ELSIF prop.matricula_source = 'cartorio' THEN
    UPDATE public.rural_properties SET matricula_confiabilidade = 'alta' WHERE id = _property_id;
  ELSIF prop.matricula_source = 'car' THEN
    UPDATE public.rural_properties SET matricula_confiabilidade = 'media' WHERE id = _property_id;
  ELSE
    UPDATE public.rural_properties SET matricula_confiabilidade = 'baixa' WHERE id = _property_id;
  END IF;

  SELECT * INTO env FROM public.environmental_analysis
  WHERE property_id = _property_id ORDER BY analyzed_at DESC LIMIT 1;

  IF FOUND THEN
    IF env.has_desmatamento THEN
      INSERT INTO public.property_diagnostics (property_id, organization_id, kind, title, description, severidade, rule_key)
      VALUES (_property_id, prop.organization_id, 'desmatamento',
              'Alerta de desmatamento detectado',
              COALESCE('Área desmatada: ' || env.desmatamento_area_ha::text || ' ha', 'Indícios de desmatamento.'),
              'alta', 'desmatamento');
    END IF;

    IF env.has_embargo THEN
      INSERT INTO public.property_diagnostics (property_id, organization_id, kind, title, description, severidade, rule_key)
      VALUES (_property_id, prop.organization_id, 'embargo',
              'Área embargada',
              'O imóvel possui sobreposição com áreas embargadas.',
              'alta', 'embargo');
    END IF;

    IF env.has_app_violation OR env.has_reserva_legal_deficit THEN
      INSERT INTO public.property_diagnostics (property_id, organization_id, kind, title, description, severidade, rule_key)
      VALUES (_property_id, prop.organization_id, 'irregularidade_ambiental',
              'Potencial irregularidade ambiental',
              'Possível déficit de Reserva Legal ou ocupação de APP.',
              'media', 'irregularidade_ambiental');
    END IF;
  END IF;

  -- If no negative diagnostics, mark as regular
  IF NOT EXISTS (SELECT 1 FROM public.property_diagnostics WHERE property_id = _property_id AND severidade IN ('alta','media')) THEN
    INSERT INTO public.property_diagnostics (property_id, organization_id, kind, title, description, severidade, rule_key)
    VALUES (_property_id, prop.organization_id, 'regular',
            'Imóvel regular',
            'Sem pendências detectadas pelas regras automáticas.',
            'baixa', 'regular');
  END IF;
END $$;

-- =========================================================
-- LICENSE ALERTS GENERATOR
-- =========================================================
CREATE OR REPLACE FUNCTION public.refresh_license_alerts(_license_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  lic public.environmental_licenses%ROWTYPE;
  days_left INT;
BEGIN
  SELECT * INTO lic FROM public.environmental_licenses WHERE id = _license_id;
  IF NOT FOUND OR lic.expiration_date IS NULL THEN RETURN; END IF;

  days_left := (lic.expiration_date - CURRENT_DATE);

  IF days_left < 0 THEN
    INSERT INTO public.license_alerts (license_id, organization_id, kind)
    VALUES (_license_id, lic.organization_id, 'vencida')
    ON CONFLICT (license_id, kind) DO NOTHING;
    UPDATE public.environmental_licenses SET status = 'vencida' WHERE id = _license_id AND status <> 'vencida';
  ELSIF days_left <= 30 THEN
    INSERT INTO public.license_alerts (license_id, organization_id, kind)
    VALUES (_license_id, lic.organization_id, '30_dias')
    ON CONFLICT (license_id, kind) DO NOTHING;
  ELSIF days_left <= 90 THEN
    INSERT INTO public.license_alerts (license_id, organization_id, kind)
    VALUES (_license_id, lic.organization_id, '90_dias')
    ON CONFLICT (license_id, kind) DO NOTHING;
  ELSIF days_left <= 180 THEN
    INSERT INTO public.license_alerts (license_id, organization_id, kind)
    VALUES (_license_id, lic.organization_id, '180_dias')
    ON CONFLICT (license_id, kind) DO NOTHING;
  END IF;
END $$;

-- Trigger to refresh alerts when license changes
CREATE OR REPLACE FUNCTION public.trg_refresh_license_alerts()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  PERFORM public.refresh_license_alerts(NEW.id);
  RETURN NEW;
END $$;

CREATE TRIGGER on_license_change
AFTER INSERT OR UPDATE OF expiration_date ON public.environmental_licenses
FOR EACH ROW EXECUTE FUNCTION public.trg_refresh_license_alerts();

-- =========================================================
-- ROW LEVEL SECURITY POLICIES
-- =========================================================

-- ORGANIZATIONS
CREATE POLICY "members read own org" ON public.organizations FOR SELECT
  USING (public.is_org_member(id));
CREATE POLICY "admin updates org" ON public.organizations FOR UPDATE
  USING (public.is_org_member(id) AND public.has_role(auth.uid(), 'admin'));

-- PROFILES
CREATE POLICY "members read org profiles" ON public.profiles FOR SELECT
  USING (organization_id = public.current_org_id());
CREATE POLICY "user updates own profile" ON public.profiles FOR UPDATE
  USING (id = auth.uid());

-- USER ROLES
CREATE POLICY "members read org roles" ON public.user_roles FOR SELECT
  USING (organization_id = public.current_org_id());
CREATE POLICY "admin manages roles" ON public.user_roles FOR ALL
  USING (organization_id = public.current_org_id() AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (organization_id = public.current_org_id() AND public.has_role(auth.uid(), 'admin'));

-- ORG INVITES
CREATE POLICY "admin reads invites" ON public.org_invites FOR SELECT
  USING (organization_id = public.current_org_id() AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin manages invites" ON public.org_invites FOR ALL
  USING (organization_id = public.current_org_id() AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (organization_id = public.current_org_id() AND public.has_role(auth.uid(), 'admin'));

-- Helper macro pattern for org-scoped tables
-- CLIENTS — read all members, write: admin/tecnico/financeiro
CREATE POLICY "members read clients" ON public.clients FOR SELECT
  USING (organization_id = public.current_org_id());
CREATE POLICY "staff writes clients" ON public.clients FOR INSERT
  WITH CHECK (organization_id = public.current_org_id()
    AND public.has_any_role(auth.uid(), ARRAY['admin','tecnico','financeiro']::public.app_role[]));
CREATE POLICY "staff updates clients" ON public.clients FOR UPDATE
  USING (organization_id = public.current_org_id()
    AND public.has_any_role(auth.uid(), ARRAY['admin','tecnico','financeiro']::public.app_role[]));
CREATE POLICY "admin deletes clients" ON public.clients FOR DELETE
  USING (organization_id = public.current_org_id() AND public.has_role(auth.uid(), 'admin'));

-- RURAL PROPERTIES — read all, write admin/tecnico
CREATE POLICY "members read props" ON public.rural_properties FOR SELECT
  USING (organization_id = public.current_org_id());
CREATE POLICY "tech writes props" ON public.rural_properties FOR INSERT
  WITH CHECK (organization_id = public.current_org_id()
    AND public.has_any_role(auth.uid(), ARRAY['admin','tecnico']::public.app_role[]));
CREATE POLICY "tech updates props" ON public.rural_properties FOR UPDATE
  USING (organization_id = public.current_org_id()
    AND public.has_any_role(auth.uid(), ARRAY['admin','tecnico']::public.app_role[]));
CREATE POLICY "admin deletes props" ON public.rural_properties FOR DELETE
  USING (organization_id = public.current_org_id() AND public.has_role(auth.uid(), 'admin'));

-- Generic helper: all org-scoped child tables follow same pattern
-- PROPERTY GEOMETRIES
CREATE POLICY "members read geom" ON public.property_geometries FOR SELECT USING (organization_id = public.current_org_id());
CREATE POLICY "tech writes geom" ON public.property_geometries FOR INSERT
  WITH CHECK (organization_id = public.current_org_id() AND public.has_any_role(auth.uid(), ARRAY['admin','tecnico']::public.app_role[]));
CREATE POLICY "tech updates geom" ON public.property_geometries FOR UPDATE
  USING (organization_id = public.current_org_id() AND public.has_any_role(auth.uid(), ARRAY['admin','tecnico']::public.app_role[]));
CREATE POLICY "admin deletes geom" ON public.property_geometries FOR DELETE
  USING (organization_id = public.current_org_id() AND public.has_role(auth.uid(), 'admin'));

-- REGISTRY
CREATE POLICY "members read registry" ON public.property_registry_data FOR SELECT USING (organization_id = public.current_org_id());
CREATE POLICY "tech writes registry" ON public.property_registry_data FOR INSERT
  WITH CHECK (organization_id = public.current_org_id() AND public.has_any_role(auth.uid(), ARRAY['admin','tecnico']::public.app_role[]));
CREATE POLICY "tech updates registry" ON public.property_registry_data FOR UPDATE
  USING (organization_id = public.current_org_id() AND public.has_any_role(auth.uid(), ARRAY['admin','tecnico']::public.app_role[]));
CREATE POLICY "admin deletes registry" ON public.property_registry_data FOR DELETE
  USING (organization_id = public.current_org_id() AND public.has_role(auth.uid(), 'admin'));

-- ENV ANALYSIS
CREATE POLICY "members read env" ON public.environmental_analysis FOR SELECT USING (organization_id = public.current_org_id());
CREATE POLICY "tech writes env" ON public.environmental_analysis FOR INSERT
  WITH CHECK (organization_id = public.current_org_id() AND public.has_any_role(auth.uid(), ARRAY['admin','tecnico']::public.app_role[]));
CREATE POLICY "tech updates env" ON public.environmental_analysis FOR UPDATE
  USING (organization_id = public.current_org_id() AND public.has_any_role(auth.uid(), ARRAY['admin','tecnico']::public.app_role[]));
CREATE POLICY "admin deletes env" ON public.environmental_analysis FOR DELETE
  USING (organization_id = public.current_org_id() AND public.has_role(auth.uid(), 'admin'));

-- DIAGNOSTICS
CREATE POLICY "members read diag" ON public.property_diagnostics FOR SELECT USING (organization_id = public.current_org_id());
CREATE POLICY "tech writes diag" ON public.property_diagnostics FOR INSERT
  WITH CHECK (organization_id = public.current_org_id() AND public.has_any_role(auth.uid(), ARRAY['admin','tecnico']::public.app_role[]));
CREATE POLICY "tech updates diag" ON public.property_diagnostics FOR UPDATE
  USING (organization_id = public.current_org_id() AND public.has_any_role(auth.uid(), ARRAY['admin','tecnico']::public.app_role[]));
CREATE POLICY "admin deletes diag" ON public.property_diagnostics FOR DELETE
  USING (organization_id = public.current_org_id() AND public.has_role(auth.uid(), 'admin'));

-- MONITORING ALERTS
CREATE POLICY "members read malerts" ON public.monitoring_alerts FOR SELECT USING (organization_id = public.current_org_id());
CREATE POLICY "tech writes malerts" ON public.monitoring_alerts FOR INSERT
  WITH CHECK (organization_id = public.current_org_id() AND public.has_any_role(auth.uid(), ARRAY['admin','tecnico']::public.app_role[]));
CREATE POLICY "tech updates malerts" ON public.monitoring_alerts FOR UPDATE
  USING (organization_id = public.current_org_id() AND public.has_any_role(auth.uid(), ARRAY['admin','tecnico']::public.app_role[]));
CREATE POLICY "admin deletes malerts" ON public.monitoring_alerts FOR DELETE
  USING (organization_id = public.current_org_id() AND public.has_role(auth.uid(), 'admin'));

-- LICENSES
CREATE POLICY "members read lic" ON public.environmental_licenses FOR SELECT USING (organization_id = public.current_org_id());
CREATE POLICY "staff writes lic" ON public.environmental_licenses FOR INSERT
  WITH CHECK (organization_id = public.current_org_id() AND public.has_any_role(auth.uid(), ARRAY['admin','tecnico','financeiro']::public.app_role[]));
CREATE POLICY "staff updates lic" ON public.environmental_licenses FOR UPDATE
  USING (organization_id = public.current_org_id() AND public.has_any_role(auth.uid(), ARRAY['admin','tecnico','financeiro']::public.app_role[]));
CREATE POLICY "admin deletes lic" ON public.environmental_licenses FOR DELETE
  USING (organization_id = public.current_org_id() AND public.has_role(auth.uid(), 'admin'));

-- LICENSE ALERTS
CREATE POLICY "members read lalerts" ON public.license_alerts FOR SELECT USING (organization_id = public.current_org_id());
CREATE POLICY "staff updates lalerts" ON public.license_alerts FOR UPDATE
  USING (organization_id = public.current_org_id() AND public.has_any_role(auth.uid(), ARRAY['admin','tecnico','financeiro']::public.app_role[]));

-- DATA SOURCES — readable by all authenticated, manageable only by admin
CREATE POLICY "auth reads data sources" ON public.data_sources FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "admin manages data sources" ON public.data_sources FOR ALL
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- CONSULTATION HISTORY
CREATE POLICY "members read history" ON public.consultation_history FOR SELECT USING (organization_id = public.current_org_id());
CREATE POLICY "members write history" ON public.consultation_history FOR INSERT
  WITH CHECK (organization_id = public.current_org_id() AND user_id = auth.uid());
