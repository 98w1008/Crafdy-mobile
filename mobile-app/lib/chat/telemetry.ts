import { SupabaseClient } from '@supabase/supabase-js'

export async function logIntent(
  supabase: SupabaseClient,
  {
    intent,
    status,
    failure_reason,
    message,
    project_id,
    duration_ms,
    metadata,
  }: {
    intent: string
    status: 'success' | 'failure'
    failure_reason?: 'NETWORK'|'PERMISSION'|'VALIDATION'|'CANCELLED'|'OCR_FAIL'|'UNKNOWN'
    message?: string
    project_id?: string
    duration_ms?: number
    metadata?: any
  }
) {
  try {
    await supabase.from('intent_logs').insert({ intent, status, failure_reason, message, project_id, duration_ms, metadata: metadata || {} })
  } catch {}
}

export async function logReceiptRegistered(
  supabase: SupabaseClient,
  { project_id, amount, kind, count_files, duration_ms }: { project_id: string; amount: number; kind: string; count_files: number; duration_ms?: number }
) {
  await logIntent(supabase, {
    intent: 'receipt_registered',
    status: 'success',
    project_id,
    duration_ms,
    metadata: { amount, kind, source: 'chat', count_files },
  })
}

export async function logEstimateCommitted(
  supabase: SupabaseClient,
  { project_id, total, lines }: { project_id: string; total: number; lines: number }
) {
  await logIntent(supabase, { intent: 'estimate_committed', status: 'success', project_id, metadata: { total, lines } })
}

export async function logInvoiceIssued(
  supabase: SupabaseClient,
  { project_id, total, due_date }: { project_id: string; total: number; due_date: string }
) {
  await logIntent(supabase, { intent: 'invoice_issued', status: 'success', project_id, metadata: { total, due_date } })
}
