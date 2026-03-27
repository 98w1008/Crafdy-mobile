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

const ensureLine = (v: any): SupportInvoiceDraftLine | null => {
  const label = String(v?.label || '').trim()
  if (!label) return null

  const quantity = Number(v?.quantity)
  const unitPrice = Number(v?.unitPrice)
  const amount = Number(v?.amount)

  if (!Number.isFinite(quantity) || quantity <= 0) return null
  if (!Number.isFinite(unitPrice) || unitPrice <= 0) return null
  if (!Number.isFinite(amount) || amount < 0) return null

  return {
    label,
    quantity: Math.floor(quantity),
    unitPrice: Math.floor(unitPrice),
    amount: Math.floor(amount),
  }
}

export const listSupportInvoiceDrafts = async (): Promise<SupportInvoiceDraft[]> => {
  const raw = await AsyncStorage.getItem(SUPPORT_INVOICE_DRAFTS_KEY)
  const items = safeParse<any[]>(raw, [])
  return items
    .map((d: any) => {
      const companyName = String(d?.companyName || '').trim()
      const ym = String(d?.ym || '').trim()
      const title = String(d?.title || '').trim()
      if (!companyName || !ym || !title) return null

      const lines = Array.isArray(d?.lines) ? d.lines.map(ensureLine).filter(Boolean) : []
      const subtotal = Number(d?.subtotal)

      return {
        ...d,
        companyName,
        ym,
        title,
        lines: lines as SupportInvoiceDraftLine[],
        subtotal: Number.isFinite(subtotal) && subtotal >= 0 ? Math.floor(subtotal) : 0,
        createdAt: String(d?.createdAt || '').trim() || new Date().toISOString(),
      } as SupportInvoiceDraft
    })
    .filter(Boolean) as SupportInvoiceDraft[]
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
