
ALTER TABLE public.integration_jobs
  ADD COLUMN IF NOT EXISTS total_features integer,
  ADD COLUMN IF NOT EXISTS processed_features integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS failed_features integer NOT NULL DEFAULT 0;
