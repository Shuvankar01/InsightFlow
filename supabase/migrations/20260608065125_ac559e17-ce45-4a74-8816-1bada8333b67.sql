
-- Severity enum for activity log
DO $$ BEGIN
  CREATE TYPE public.activity_severity AS ENUM ('info','success','warning','critical');
EXCEPTION WHEN duplicate_object THEN null; END $$;

ALTER TABLE public.activities
  ADD COLUMN IF NOT EXISTS severity public.activity_severity NOT NULL DEFAULT 'info',
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'success',
  ADD COLUMN IF NOT EXISTS device_info jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_active_at timestamptz;

-- Enable realtime on profiles
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Backfill last_active_at with created_at for existing rows
UPDATE public.profiles SET last_active_at = created_at WHERE last_active_at IS NULL;
