-- intent_logs for chat-first telemetry
CREATE TABLE IF NOT EXISTS public.intent_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  intent TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('success','failure')),
  failure_reason TEXT NULL CHECK (failure_reason IN ('NETWORK','PERMISSION','VALIDATION','CANCELLED','OCR_FAIL','UNKNOWN')),
  message TEXT NULL,
  project_id UUID NULL,
  duration_ms INTEGER NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.intent_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS intent_logs_select ON public.intent_logs;
DROP POLICY IF EXISTS intent_logs_insert ON public.intent_logs;
DROP POLICY IF EXISTS intent_logs_update ON public.intent_logs;
DROP POLICY IF EXISTS intent_logs_delete ON public.intent_logs;
CREATE POLICY intent_logs_select ON public.intent_logs FOR SELECT USING (public.same_company(company_id));
CREATE POLICY intent_logs_insert ON public.intent_logs FOR INSERT WITH CHECK (public.same_company(company_id));
CREATE POLICY intent_logs_update ON public.intent_logs FOR UPDATE USING (false);
CREATE POLICY intent_logs_delete ON public.intent_logs FOR DELETE USING (false);

DROP TRIGGER IF EXISTS intent_logs_set_company_id ON public.intent_logs;
CREATE TRIGGER intent_logs_set_company_id BEFORE INSERT ON public.intent_logs FOR EACH ROW EXECUTE FUNCTION public.set_company_id();

SELECT 'intent_logs ready' AS status;

