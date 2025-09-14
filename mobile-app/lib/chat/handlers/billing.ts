import { SupabaseClient } from '@supabase/supabase-js'

export type BillingPatch = Partial<{
  billing_mode: 'progress'|'daily'|'milestone'
  tax_rule: 'inclusive'|'exclusive'
  tax_rate: number
  closing_day: string
  payment_term_days: number
  rounding: 'cut'|'round'|'ceil'
}>

export function parseBillingCommand(text: string): BillingPatch {
  const t = (text || '').trim()
  const patch: BillingPatch = {}
  // tax rule
  if (/税抜(に|へ|で|でお願い|でお願いね|にして)/.test(t)) patch.tax_rule = 'exclusive'
  if (/税込(に|へ|で|でお願い|でお願いね|にして)/.test(t)) patch.tax_rule = 'inclusive'
  // billing mode
  if (/(常用|日当)/.test(t)) patch.billing_mode = 'daily'
  if (/出来高/.test(t)) patch.billing_mode = 'progress'
  if (/マイルストーン/.test(t)) patch.billing_mode = 'milestone'
  // closing day
  if (/締日(を)?(月末|末|end)/.test(t)) patch.closing_day = 'end'
  const mClose = t.match(/締日(を)?\s*([0-9]{1,2})\s*日?/)
  if (mClose && mClose[2]) patch.closing_day = String(Number(mClose[2]))
  // payment term days
  const mPay = t.match(/(支払|支払い|サイト)[^0-9]{0,3}([0-9]{1,3})\s*日/)
  if (mPay && mPay[2]) patch.payment_term_days = Number(mPay[2])
  // tax rate
  const mRate = t.match(/税率(を|は)?\s*([0-9]{1,2})\s*%?/)
  if (mRate && mRate[2]) patch.tax_rate = Number(mRate[2])
  // rounding
  if (/(切り捨て|切捨て)/.test(t)) patch.rounding = 'cut'
  if (/(四捨五入)/.test(t)) patch.rounding = 'round'
  if (/(切り上げ|切上げ)/.test(t)) patch.rounding = 'ceil'
  return patch
}

export async function updateSiteBillingSettings(
  supabase: SupabaseClient,
  { projectId, patch }: { projectId: string; patch: BillingPatch }
) {
  // Try to fetch existing row
  const { data: existing } = await supabase
    .from('site_billing_settings')
    .select('site_id')
    .eq('site_id', projectId)
    .maybeSingle()

  if (existing?.site_id) {
    const { data, error } = await supabase
      .from('site_billing_settings')
      .update({ ...patch })
      .eq('site_id', projectId)
      .select('site_id,billing_mode,tax_rule,tax_rate,closing_day,payment_term_days,rounding')
      .single()
    if (error) throw error
    return data as any
  } else {
    const defaults = {
      billing_mode: 'daily',
      tax_rule: 'inclusive',
      tax_rate: 10,
      closing_day: 'end',
      payment_term_days: 30,
      rounding: 'round',
    }
    const { data, error } = await supabase
      .from('site_billing_settings')
      .insert({ site_id: projectId, ...defaults, ...patch })
      .select('site_id,billing_mode,tax_rule,tax_rate,closing_day,payment_term_days,rounding')
      .single()
    if (error) throw error
    return data as any
  }
}

