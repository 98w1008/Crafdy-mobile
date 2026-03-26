import AsyncStorage from '@react-native-async-storage/async-storage'

export type SupportBillingDraft = {
  id: string
  companyName: string
  ym: string
  reportCount: number
  jyouyouWorkersTotal: number
  ouenWorkersTotal: number
  jyouyouDailyRate?: number
  ouenDailyRate?: number
  candidateTotal: number
  createdAt: string
}

const SUPPORT_BILLING_DRAFTS_KEY = 'support_billing_drafts_v1'

const safeParse = <T>(raw: string | null, fallback: T): T => {
  if (!raw) return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

const saveSupportBillingDrafts = async (items: SupportBillingDraft[]) => {
  await AsyncStorage.setItem(SUPPORT_BILLING_DRAFTS_KEY, JSON.stringify(items))
}

export const listSupportBillingDrafts = async (): Promise<SupportBillingDraft[]> => {
  const raw = await AsyncStorage.getItem(SUPPORT_BILLING_DRAFTS_KEY)
  return safeParse<SupportBillingDraft[]>(raw, [])
}

export const createOrReplaceSupportBillingDraft = async (params: {
  companyName: string
  ym: string
  reportCount: number
  jyouyouWorkersTotal: number
  ouenWorkersTotal: number
  jyouyouDailyRate?: number
  ouenDailyRate?: number
  candidateTotal: number
}): Promise<SupportBillingDraft> => {
  // NOTE: 最小実装（ローカル保存のみ）。後続PRで server/DB に置換する。
  const companyName = params.companyName.trim()
  const ym = params.ym.trim()
  if (!companyName) throw new Error('companyName is required')
  if (!ym) throw new Error('ym is required')

  const items = await listSupportBillingDrafts()
  const idx = items.findIndex(d => d.companyName.trim() === companyName && d.ym.trim() === ym)

  const now = new Date()
  const draft: SupportBillingDraft = {
    id: idx >= 0 ? items[idx].id : `support-billing-draft-${now.getTime()}`,
    companyName,
    ym,
    reportCount: Math.max(0, Math.floor(params.reportCount)),
    jyouyouWorkersTotal: Math.max(0, Math.floor(params.jyouyouWorkersTotal)),
    ouenWorkersTotal: Math.max(0, Math.floor(params.ouenWorkersTotal)),
    jyouyouDailyRate:
      typeof params.jyouyouDailyRate === 'number' && Number.isFinite(params.jyouyouDailyRate) && params.jyouyouDailyRate > 0
        ? Math.round(params.jyouyouDailyRate)
        : undefined,
    ouenDailyRate:
      typeof params.ouenDailyRate === 'number' && Number.isFinite(params.ouenDailyRate) && params.ouenDailyRate > 0
        ? Math.round(params.ouenDailyRate)
        : undefined,
    candidateTotal: Math.max(0, Math.floor(params.candidateTotal)),
    createdAt: now.toISOString(),
  }

  const next = [...items]
  if (idx >= 0) next[idx] = draft
  else next.unshift(draft)

  await saveSupportBillingDrafts(next)
  return draft
}
