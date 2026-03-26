import AsyncStorage from '@react-native-async-storage/async-storage'

export type SupportInvoiceDraftLine = {
  label: string
  quantity: number
  unitPrice: number
  amount: number
}

export type SupportInvoiceDraft = {
  id: string
  companyName: string
  ym: string
  title: string
  lines: SupportInvoiceDraftLine[]
  subtotal: number
  createdAt: string
}

const SUPPORT_INVOICE_DRAFTS_KEY = 'support_invoice_drafts_v1'

const safeParse = <T>(raw: string | null, fallback: T): T => {
  if (!raw) return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

const saveSupportInvoiceDrafts = async (items: SupportInvoiceDraft[]) => {
  await AsyncStorage.setItem(SUPPORT_INVOICE_DRAFTS_KEY, JSON.stringify(items))
}

export const listSupportInvoiceDrafts = async (): Promise<SupportInvoiceDraft[]> => {
  const raw = await AsyncStorage.getItem(SUPPORT_INVOICE_DRAFTS_KEY)
  return safeParse<SupportInvoiceDraft[]>(raw, [])
}

export const createOrReplaceSupportInvoiceDraft = async (params: {
  companyName: string
  ym: string
  title: string
  lines: SupportInvoiceDraftLine[]
  subtotal: number
}): Promise<SupportInvoiceDraft> => {
  // NOTE: 最小実装（ローカル保存のみ）。後続PRで server/DB に置換する。
  const companyName = params.companyName.trim()
  const ym = params.ym.trim()
  const title = params.title.trim()
  if (!companyName) throw new Error('companyName is required')
  if (!ym) throw new Error('ym is required')
  if (!title) throw new Error('title is required')

  const items = await listSupportInvoiceDrafts()
  const idx = items.findIndex(d => d.companyName.trim() === companyName && d.ym.trim() === ym)

  const lines = Array.isArray(params.lines) ? params.lines : []

  const now = new Date()
  const draft: SupportInvoiceDraft = {
    id: idx >= 0 ? items[idx].id : `support-invoice-draft-${now.getTime()}`,
    companyName,
    ym,
    title,
    lines: lines.map(l => ({
      label: String(l?.label || '').trim() || '（不明）',
      quantity: Math.max(0, Math.floor(Number(l?.quantity) || 0)),
      unitPrice: Math.max(0, Math.floor(Number(l?.unitPrice) || 0)),
      amount: Math.max(0, Math.floor(Number(l?.amount) || 0)),
    })),
    subtotal: Math.max(0, Math.floor(params.subtotal)),
    createdAt: now.toISOString(),
  }

  const next = [...items]
  if (idx >= 0) next[idx] = draft
  else next.unshift(draft)

  await saveSupportInvoiceDrafts(next)
  return draft
}
