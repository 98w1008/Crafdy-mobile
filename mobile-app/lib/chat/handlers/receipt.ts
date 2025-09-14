import { SupabaseClient } from '@supabase/supabase-js'

type Kind = 'receipt' | 'delivery' | 'other'

export async function commitReceiptDraft(
  supabase: SupabaseClient,
  {
    projectId,
    kind,
    amount,
    account,
    vendor,
    occurredOn,
    fileRefs,
  }: {
    projectId: string
    kind: Kind
    amount: number
    account: string
    vendor?: string
    occurredOn: string
    fileRefs: any[]
  }
) {
  const row = {
    project_id: projectId,
    kind,
    amount,
    currency: 'JPY',
    account,
    vendor: vendor || null,
    file_refs: fileRefs || [],
    occurred_on: occurredOn,
    ocr_status: 'pending',
  }
  const { data, error } = await supabase.from('receipts').insert(row as any).select('id').single()
  if (error) throw error
  return { id: data.id }
}

