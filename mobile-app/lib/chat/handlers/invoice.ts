import { SupabaseClient } from '@supabase/supabase-js'

function monthBounds(d: Date) {
  const start = new Date(d.getFullYear(), d.getMonth(), 1)
  const end = new Date(d.getFullYear(), d.getMonth()+1, 0)
  const fmt = (x: Date) => `${x.getFullYear()}-${(x.getMonth()+1).toString().padStart(2,'0')}-${x.getDate().toString().padStart(2,'0')}`
  return { start: fmt(start), end: fmt(end) }
}

export async function draftInvoiceFromProgress(
  supabase: SupabaseClient,
  { projectId, periodStart, periodEnd }: { projectId: string; periodStart?: string; periodEnd?: string }
) {
  const d = new Date()
  const { start, end } = monthBounds(d)
  const ps = periodStart || start
  const pe = periodEnd || end

  // sum labor_entries unit * daily_rate_at_entry
  const { data: entries } = await supabase
    .from('labor_entries')
    .select('unit, daily_rate_at_entry, date')
    .eq('site_id', projectId)
    .gte('date', ps)
    .lte('date', pe)
  const sum = (entries||[]).reduce((s, r:any)=> s + Math.round((Number(r.unit)||0) * (Number(r.daily_rate_at_entry)||0)), 0)
  const item = { description: `人件費（${ps.slice(0,7)}）`, qty: 1, unit: '式', unit_price: sum, line_total: sum }
  return { items: [item], subtotal: sum }
}

export async function commitInvoiceDraft(
  supabase: SupabaseClient,
  { projectId, issueDate, closingDate, dueDate, billTo, items, rounding }:
  { projectId: string; issueDate: string; closingDate: string; dueDate: string; billTo?: string; items: Array<{ description:string; qty:number; unit:string; unit_price:number; line_total:number }>, rounding?: 'cut'|'round'|'ceil' }
) {
  // tax rule/rate
  let taxRule: 'inclusive'|'exclusive' = 'inclusive'
  let taxRate = 10
  try {
    const { data } = await supabase.from('site_billing_settings').select('tax_rule,tax_rate').eq('site_id', projectId).maybeSingle()
    if (data?.tax_rule) taxRule = data.tax_rule
    if (data?.tax_rate != null) taxRate = Number(data.tax_rate)
  } catch {}
  const sum = items.reduce((s,it)=>s + (it.line_total||0), 0)
  const apply = (x:number) => rounding==='cut' ? Math.floor(x) : rounding==='ceil' ? Math.ceil(x) : Math.round(x)
  let subtotal = 0, tax = 0, total = 0
  if (taxRule === 'exclusive') {
    subtotal = sum
    tax = apply(subtotal * (taxRate/100))
    total = subtotal + tax
  } else {
    total = sum
    tax = apply(total * (taxRate/(100+taxRate)))
    subtotal = total - tax
  }
  const { data: inv, error } = await supabase.from('invoices').insert({ project_id: projectId, issue_date: issueDate, closing_date: closingDate, due_date: dueDate, bill_to: billTo||null, subtotal, tax, total }).select('id').single()
  if (error) throw error
  for (const it of items) {
    await supabase.from('invoice_items').insert({ invoice_id: inv.id, description: it.description, qty: it.qty, unit: it.unit, unit_price: it.unit_price, line_total: it.line_total })
  }
  return { invoiceId: inv.id, total }
}
