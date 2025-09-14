-- Unified receipts table (fallback if no existing receipts)
CREATE TABLE IF NOT EXISTS public.receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  project_id UUID NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('receipt','delivery','other')),
  amount NUMERIC(12,0) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'JPY',
  account TEXT NOT NULL,
  vendor TEXT NULL,
  file_refs JSONB NOT NULL DEFAULT '[]'::jsonb,
  occurred_on DATE NOT NULL,
  ocr_status TEXT NOT NULL DEFAULT 'none' CHECK (ocr_status IN ('none','pending','done','failed')),
  created_by UUID NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_receipts_company ON public.receipts(company_id);
CREATE INDEX IF NOT EXISTS idx_receipts_project ON public.receipts(project_id);
CREATE INDEX IF NOT EXISTS idx_receipts_date ON public.receipts(occurred_on);

ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;

-- reuse same_company(company_id) defined earlier
DROP POLICY IF EXISTS receipts_select ON public.receipts;
DROP POLICY IF EXISTS receipts_insert ON public.receipts;
DROP POLICY IF EXISTS receipts_update ON public.receipts;
DROP POLICY IF EXISTS receipts_delete ON public.receipts;
CREATE POLICY receipts_select ON public.receipts FOR SELECT USING (public.same_company(company_id));
CREATE POLICY receipts_insert ON public.receipts FOR INSERT WITH CHECK (public.same_company(company_id));
CREATE POLICY receipts_update ON public.receipts FOR UPDATE USING (public.same_company(company_id));
CREATE POLICY receipts_delete ON public.receipts FOR DELETE USING (public.same_company(company_id));

-- company_id auto-fill trigger
DROP TRIGGER IF EXISTS receipts_set_company_id ON public.receipts;
CREATE TRIGGER receipts_set_company_id BEFORE INSERT ON public.receipts FOR EACH ROW EXECUTE FUNCTION public.set_company_id();

SELECT 'receipts table ready' AS status;

