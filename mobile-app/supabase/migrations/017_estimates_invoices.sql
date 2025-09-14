-- Non-destructive setup for estimates/invoices (create if not exists; add columns if missing)

-- Ensure site_billing_settings has billing_mode
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='site_billing_settings') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns WHERE table_name='site_billing_settings' AND column_name='billing_mode'
    ) THEN
      ALTER TABLE public.site_billing_settings ADD COLUMN billing_mode TEXT NULL;
    END IF;
  END IF;
END $$;

-- estimates
CREATE TABLE IF NOT EXISTS public.estimates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  project_id UUID NOT NULL,
  title TEXT NOT NULL,
  billing_mode TEXT NULL,
  subtotal BIGINT NOT NULL DEFAULT 0,
  tax BIGINT NOT NULL DEFAULT 0,
  total BIGINT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft',
  created_by UUID NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.estimate_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estimate_id UUID NOT NULL REFERENCES public.estimates(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  qty NUMERIC NOT NULL DEFAULT 1,
  unit TEXT NOT NULL DEFAULT '式',
  unit_price BIGINT NOT NULL DEFAULT 0,
  line_total BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_estimates_project_created ON public.estimates(project_id, created_at DESC);

ALTER TABLE public.estimates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estimate_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS estimates_select ON public.estimates;
DROP POLICY IF EXISTS estimates_insert ON public.estimates;
DROP POLICY IF EXISTS estimates_update ON public.estimates;
DROP POLICY IF EXISTS estimates_delete ON public.estimates;
CREATE POLICY estimates_select ON public.estimates FOR SELECT USING (public.same_company(company_id));
CREATE POLICY estimates_insert ON public.estimates FOR INSERT WITH CHECK (public.same_company(company_id));
CREATE POLICY estimates_update ON public.estimates FOR UPDATE USING (public.same_company(company_id));
CREATE POLICY estimates_delete ON public.estimates FOR DELETE USING (public.same_company(company_id));

DROP TRIGGER IF EXISTS estimates_set_company_id ON public.estimates;
CREATE TRIGGER estimates_set_company_id BEFORE INSERT ON public.estimates FOR EACH ROW EXECUTE FUNCTION public.set_company_id();

-- estimate_items RLS: derive through join (restrict direct access to company via estimate)
DROP POLICY IF EXISTS estimate_items_rw ON public.estimate_items;
CREATE POLICY estimate_items_rw ON public.estimate_items
  USING (EXISTS (SELECT 1 FROM public.estimates e WHERE e.id = estimate_id AND public.same_company(e.company_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.estimates e WHERE e.id = estimate_id AND public.same_company(e.company_id)));

-- invoices
CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  project_id UUID NOT NULL,
  issue_date DATE NOT NULL,
  due_date DATE NOT NULL,
  closing_date DATE NOT NULL,
  bill_to TEXT NULL,
  subtotal BIGINT NOT NULL DEFAULT 0,
  tax BIGINT NOT NULL DEFAULT 0,
  total BIGINT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'issued',
  created_by UUID NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  qty NUMERIC NOT NULL DEFAULT 1,
  unit TEXT NOT NULL DEFAULT '式',
  unit_price BIGINT NOT NULL DEFAULT 0,
  line_total BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_invoices_project_issue ON public.invoices(project_id, issue_date DESC);

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS invoices_select ON public.invoices;
DROP POLICY IF EXISTS invoices_insert ON public.invoices;
DROP POLICY IF EXISTS invoices_update ON public.invoices;
DROP POLICY IF EXISTS invoices_delete ON public.invoices;
CREATE POLICY invoices_select ON public.invoices FOR SELECT USING (public.same_company(company_id));
CREATE POLICY invoices_insert ON public.invoices FOR INSERT WITH CHECK (public.same_company(company_id));
CREATE POLICY invoices_update ON public.invoices FOR UPDATE USING (public.same_company(company_id));
CREATE POLICY invoices_delete ON public.invoices FOR DELETE USING (public.same_company(company_id));

DROP TRIGGER IF EXISTS invoices_set_company_id ON public.invoices;
CREATE TRIGGER invoices_set_company_id BEFORE INSERT ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.set_company_id();

DROP POLICY IF EXISTS invoice_items_rw ON public.invoice_items;
CREATE POLICY invoice_items_rw ON public.invoice_items
  USING (EXISTS (SELECT 1 FROM public.invoices i WHERE i.id = invoice_id AND public.same_company(i.company_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.invoices i WHERE i.id = invoice_id AND public.same_company(i.company_id)));

SELECT 'estimates/invoices ready' AS status;

