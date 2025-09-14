-- Ensure projects.created_by exists and references auth.users(id)
ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

COMMENT ON COLUMN public.projects.created_by IS 'プロジェクト作成者 (auth.users.id)';

-- Optional: backfill created_by from existing owner_id/creator_id if present (no-op if columns missing)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'projects' AND column_name = 'owner_id'
  ) THEN
    UPDATE public.projects SET created_by = owner_id WHERE created_by IS NULL;
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'projects' AND column_name = 'creator_id'
  ) THEN
    UPDATE public.projects SET created_by = creator_id WHERE created_by IS NULL;
  END IF;
END $$;

