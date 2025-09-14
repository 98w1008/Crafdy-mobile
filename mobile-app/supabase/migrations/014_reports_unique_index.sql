-- Ensure unique (project_id, work_date) for reports if project_id exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_name='reports' AND column_name='project_id'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='uq_reports_project_workdate'
    ) THEN
      EXECUTE 'CREATE UNIQUE INDEX uq_reports_project_workdate ON public.reports(project_id, work_date)';
    END IF;
  END IF;
END $$;

SELECT 'reports unique index ensured' AS status;

