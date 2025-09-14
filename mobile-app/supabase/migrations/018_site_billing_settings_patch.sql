-- Patch site_billing_settings for Phase 1 (non-destructive)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='site_billing_settings') THEN
    -- Add payment_term_days if missing
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns WHERE table_name='site_billing_settings' AND column_name='payment_term_days'
    ) THEN
      ALTER TABLE public.site_billing_settings ADD COLUMN payment_term_days INTEGER NOT NULL DEFAULT 30;
    END IF;
    -- Ensure billing_mode column exists (added earlier, keep idempotent)
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns WHERE table_name='site_billing_settings' AND column_name='billing_mode'
    ) THEN
      ALTER TABLE public.site_billing_settings ADD COLUMN billing_mode TEXT NULL;
    END IF;
  END IF;
END $$;

SELECT 'site_billing_settings patched' AS status;

