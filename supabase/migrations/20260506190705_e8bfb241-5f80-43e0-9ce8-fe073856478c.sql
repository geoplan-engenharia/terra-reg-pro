ALTER TABLE public.integration_jobs
ADD COLUMN IF NOT EXISTS geojson_path TEXT;