-- Storage bucket for license attachments (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('license-attachments', 'license-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies (path convention: {organization_id}/{license_id}/{filename})
DROP POLICY IF EXISTS "license attachments read" ON storage.objects;
CREATE POLICY "license attachments read"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'license-attachments'
  AND (storage.foldername(name))[1] = public.current_org_id()::text
);

DROP POLICY IF EXISTS "license attachments insert" ON storage.objects;
CREATE POLICY "license attachments insert"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'license-attachments'
  AND (storage.foldername(name))[1] = public.current_org_id()::text
  AND public.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'tecnico'::app_role, 'financeiro'::app_role])
);

DROP POLICY IF EXISTS "license attachments update" ON storage.objects;
CREATE POLICY "license attachments update"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'license-attachments'
  AND (storage.foldername(name))[1] = public.current_org_id()::text
  AND public.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'tecnico'::app_role, 'financeiro'::app_role])
);

DROP POLICY IF EXISTS "license attachments delete" ON storage.objects;
CREATE POLICY "license attachments delete"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'license-attachments'
  AND (storage.foldername(name))[1] = public.current_org_id()::text
  AND public.has_role(auth.uid(), 'admin'::app_role)
);

-- Add timestamp column for upload metadata
ALTER TABLE public.environmental_licenses
  ADD COLUMN IF NOT EXISTS attachment_name text,
  ADD COLUMN IF NOT EXISTS attachment_uploaded_at timestamptz;

-- Refresh license_alerts now also clears stale alerts so updates re-evaluate cleanly
CREATE OR REPLACE FUNCTION public.refresh_license_alerts(_license_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  lic public.environmental_licenses%ROWTYPE;
  days_left INT;
BEGIN
  SELECT * INTO lic FROM public.environmental_licenses WHERE id = _license_id;
  IF NOT FOUND THEN RETURN; END IF;

  -- Clear existing auto alerts to recompute cleanly when dates/status change
  DELETE FROM public.license_alerts WHERE license_id = _license_id;

  IF lic.expiration_date IS NULL THEN RETURN; END IF;
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
END $function$;

-- Trigger to auto-refresh alerts on insert/update
DROP TRIGGER IF EXISTS trg_license_refresh_alerts ON public.environmental_licenses;
CREATE TRIGGER trg_license_refresh_alerts
AFTER INSERT OR UPDATE OF expiration_date, status ON public.environmental_licenses
FOR EACH ROW
EXECUTE FUNCTION public.trg_refresh_license_alerts();