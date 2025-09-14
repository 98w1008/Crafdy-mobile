import { SupabaseClient } from '@supabase/supabase-js'

type Item = { description: string; qty: number; unit: string; unit_price: number }

export async function commitEstimateDraft(
  supabase: SupabaseClient,
  { projectId, title, items, billingMode }: { projectId: string; title: string; items: Item[]; billingMode?: string }
) {
  // fetch tax rule/rate
  let taxRule: 'inclusive'|'exclusive' = 'inclusive'
  let taxRate = 10
  try {
    const { data } = await supabase.from('site_billing_settings').select('tax_rule,tax_rate').eq('site_id', projectId).maybeSingle()
    if (data?.tax_rule) taxRule = data.tax_rule
    if (data?.tax_rate != null) taxRate = Number(data.tax_rate)
  } catch {}

  const subtotal = items.reduce((s, it) => s + Math.round((it.qty||0) * (it.unit_price||0)), 0)
  let tax = 0
  let total = 0
  if (taxRule === 'inclusive') {
    // subtotal is tax-included-like? here we treat subtotal as net and add tax for simplicity
    tax = Math.round(subtotal * (taxRate/100))
    total = subtotal + tax
  } else {
    tax = Math.round(subtotal * (taxRate/100))
    total = subtotal + tax
  }

  const { data: est, error } = await supabase.from('estimates').insert({ project_id: projectId, title, billing_mode: billingMode||null, subtotal, tax, total }).select('id').single()
  if (error) throw error

  for (const it of items) {
    const line_total = Math.round((it.qty||0) * (it.unit_price||0))
    await supabase.from('estimate_items').insert({ estimate_id: est.id, description: it.description, qty: it.qty, unit: it.unit, unit_price: it.unit_price, line_total })
  }
  return { estimateId: est.id, total }
}

