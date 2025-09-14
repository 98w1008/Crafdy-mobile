-- Phase 0 schema for Chat-first (workers, worker_rates, labor_entries, site_billing_settings, progress_logs, milestones)
-- Preflight: RLS (company scope) first, then tables, then minimal seed

-- Ensure user_profiles with company_id exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'company_id'
  ) THEN
    RAISE EXCEPTION 'user_profiles.company_id is required';
  END IF;
END $$;

-- ENUM-like checks via CHECK constraints

-- workers --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.workers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('employee','support')),
  default_daily_rate NUMERIC(12,2),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workers_company_id ON public.workers(company_id);

-- worker_rates ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.worker_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  worker_id UUID NOT NULL REFERENCES public.workers(id) ON DELETE CASCADE,
  scope TEXT NOT NULL CHECK (scope IN ('company','client','site')),
  client_id UUID NULL,
  site_id UUID NULL,
  daily_rate NUMERIC(12,2) NOT NULL,
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_worker_rates_company_id ON public.worker_rates(company_id);
CREATE INDEX IF NOT EXISTS idx_worker_rates_worker_id ON public.worker_rates(worker_id);
CREATE INDEX IF NOT EXISTS idx_worker_rates_worker_scope_eff ON public.worker_rates(worker_id, scope, effective_from DESC);

-- labor_entries --------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.labor_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  report_id UUID NULL,
  site_id UUID NOT NULL REFERENCES public.work_sites(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  worker_id UUID NOT NULL REFERENCES public.workers(id) ON DELETE RESTRICT,
  unit NUMERIC(2,1) NOT NULL CHECK (unit IN (1.0, 0.5)),
  daily_rate_at_entry NUMERIC(12,2) NOT NULL,
  is_support BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_labor_entries_company_id ON public.labor_entries(company_id);
CREATE INDEX IF NOT EXISTS idx_labor_entries_site_id ON public.labor_entries(site_id);
CREATE INDEX IF NOT EXISTS idx_labor_entries_date ON public.labor_entries(date);
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='uq_labor_entries_site_worker_date'
  ) THEN
    EXECUTE 'CREATE UNIQUE INDEX uq_labor_entries_site_worker_date ON public.labor_entries(site_id, worker_id, date)';
  END IF;
END $$;

-- site_billing_settings ------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.site_billing_settings (
  site_id UUID PRIMARY KEY REFERENCES public.work_sites(id) ON DELETE CASCADE,
  company_id UUID NOT NULL,
  billing_mode TEXT NOT NULL CHECK (billing_mode IN (
    'progress_monthly','dayrate','milestone_plus_progress','milestone_only','delivery_each'
  )),
  closing_day TEXT NOT NULL, -- 'end' | '1'..'31' を文字列で保持
  rounding TEXT NOT NULL CHECK (rounding IN ('cut','round','ceil')) DEFAULT 'cut',
  tax_rule TEXT NOT NULL CHECK (tax_rule IN ('inclusive','exclusive')) DEFAULT 'inclusive',
  tax_rate NUMERIC(5,2) NOT NULL DEFAULT 10,
  overtime_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- progress_logs --------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.progress_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  site_id UUID NOT NULL REFERENCES public.work_sites(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  percent NUMERIC(5,2) NOT NULL CHECK (percent >= 0 AND percent <= 100),
  source TEXT NOT NULL CHECK (source IN ('ai','manual')),
  note TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_progress_logs_company_id ON public.progress_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_progress_logs_site_date ON public.progress_logs(site_id, date DESC);

-- milestones -----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  site_id UUID NOT NULL REFERENCES public.work_sites(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('percent','fixed')),
  value NUMERIC(12,2) NOT NULL,
  reached_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_milestones_company_id ON public.milestones(company_id);

-- RLS: enable and policies (company scope via user_profiles) -----------------
ALTER TABLE public.workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.worker_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.labor_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_billing_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progress_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.milestones ENABLE ROW LEVEL SECURITY;

-- helper policy predicate
CREATE OR REPLACE FUNCTION public.same_company(company_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles p
    WHERE p.user_id = auth.uid() AND p.company_id = $1
  );
$$;

-- policies (SELECT/INSERT/UPDATE/DELETE) per table using same_company()
DO $$
DECLARE t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY['workers','worker_rates','labor_entries','site_billing_settings','progress_logs','milestones'])
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I_select ON public.%I', t||'_select', t);
    EXECUTE format('DROP POLICY IF EXISTS %I_insert ON public.%I', t||'_insert', t);
    EXECUTE format('DROP POLICY IF EXISTS %I_update ON public.%I', t||'_update', t);
    EXECUTE format('DROP POLICY IF EXISTS %I_delete ON public.%I', t||'_delete', t);

    EXECUTE format('CREATE POLICY %I_select ON public.%I FOR SELECT USING (public.same_company(company_id))', t||'_select', t);
    EXECUTE format('CREATE POLICY %I_insert ON public.%I FOR INSERT WITH CHECK (public.same_company(company_id))', t||'_insert', t);
    EXECUTE format('CREATE POLICY %I_update ON public.%I FOR UPDATE USING (public.same_company(company_id))', t||'_update', t);
    EXECUTE format('CREATE POLICY %I_delete ON public.%I FOR DELETE USING (public.same_company(company_id))', t||'_delete', t);
  END LOOP;
END $$;

-- server-side company_id defaulting (do not trust client-provided)
CREATE OR REPLACE FUNCTION public.set_company_id()
RETURNS TRIGGER AS $$
DECLARE v_company UUID;
BEGIN
  IF NEW.company_id IS NULL THEN
    SELECT company_id INTO v_company FROM public.user_profiles WHERE user_id = auth.uid();
    NEW.company_id := v_company;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY['workers','worker_rates','labor_entries','site_billing_settings','progress_logs','milestones'])
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.%I', t||'_set_company_id', t);
    EXECUTE format('CREATE TRIGGER %I BEFORE INSERT ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_company_id()', t||'_set_company_id', t);
  END LOOP;
END $$;

-- minimal seed ---------------------------------------------------------------
DO $$
DECLARE v_company UUID;
DECLARE v_user UUID;
DECLARE v_site UUID;
BEGIN
  SELECT company_id, user_id INTO v_company, v_user FROM public.user_profiles ORDER BY created_at NULLS LAST LIMIT 1;
  IF v_company IS NULL THEN
    RAISE NOTICE 'No user_profiles to seed with';
    RETURN;
  END IF;

  -- Ensure at least 1 work_site exists for this company
  SELECT id INTO v_site FROM public.work_sites WHERE company_id = v_company LIMIT 1;
  IF v_site IS NULL THEN
    INSERT INTO public.work_sites (name, address, status, company_id, created_by)
    VALUES ('デモ現場A', '東京都千代田区', 'active', v_company, v_user)
    RETURNING id INTO v_site;
  END IF;

  -- workers: 2 employees + 1 support
  IF NOT EXISTS (SELECT 1 FROM public.workers WHERE company_id = v_company) THEN
    INSERT INTO public.workers (company_id, name, type, default_daily_rate)
    VALUES
      (v_company, '山田 太郎', 'employee', 20000),
      (v_company, '佐藤 花子', 'employee', 22000),
      (v_company, '応援A',     'support', 25000);
  END IF;

  -- site_billing_settings default (inclusive tax 10%, rounding cut)
  INSERT INTO public.site_billing_settings (site_id, company_id, billing_mode, closing_day, rounding, tax_rule, tax_rate, overtime_enabled)
  VALUES (v_site, v_company, 'dayrate', 'end', 'cut', 'inclusive', 10, FALSE)
  ON CONFLICT (site_id) DO NOTHING;
END $$;

SELECT 'chat-first phase0 schema created' AS status;
