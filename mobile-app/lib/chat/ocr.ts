import { SupabaseClient } from '@supabase/supabase-js'

export async function invokeReceiptOCR(supabase: SupabaseClient | null, { receiptId, files }: { receiptId: string; files: any[] }) {
  try {
    // Edge Functions stub: fire-and-forget. Ignore errors in this phase.
    if ((supabase as any)?.functions?.invoke) {
      await (supabase as any).functions.invoke('ocr-receipt', { body: { receiptId, files } })
    }
  } catch {}
}

