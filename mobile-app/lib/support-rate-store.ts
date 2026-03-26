import AsyncStorage from '@react-native-async-storage/async-storage'

export type SupportRate = {
  id: string
  companyName: string
  jyouyouDailyRate?: number
  ouenDailyRate?: number
  isActive: boolean
  createdAt: string
}

const SUPPORT_RATES_KEY = 'support_rates_v1'

const safeParse = <T>(raw: string | null, fallback: T): T => {
  if (!raw) return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

const saveSupportRates = async (items: SupportRate[]) => {
  await AsyncStorage.setItem(SUPPORT_RATES_KEY, JSON.stringify(items))
}

export const listSupportRates = async (): Promise<SupportRate[]> => {
  const raw = await AsyncStorage.getItem(SUPPORT_RATES_KEY)
  return safeParse<SupportRate[]>(raw, [])
}

export const findSupportRateByCompanyName = async (companyName: string): Promise<SupportRate | null> => {
  const name = companyName.trim()
  if (!name) return null
  const items = await listSupportRates()
  const hit = items.find(r => r.companyName.trim() === name)
  return hit || null
}

export const upsertSupportRate = async (params: {
  companyName: string
  jyouyouDailyRate?: number
  ouenDailyRate?: number
}): Promise<SupportRate> => {
  // NOTE: 最小実装（ローカル保存のみ）。後続PRで server/DB に置換する。
  const companyName = params.companyName.trim()
  if (!companyName) throw new Error('companyName is required')

  const normalizeRate = (v: unknown): number | undefined => {
    if (typeof v !== 'number') return undefined
    if (!Number.isFinite(v) || v <= 0) return undefined
    return Math.round(v)
  }

  const jyouyouDailyRate = normalizeRate(params.jyouyouDailyRate)
  const ouenDailyRate = normalizeRate(params.ouenDailyRate)

  const items = await listSupportRates()
  const idx = items.findIndex(r => r.companyName.trim() === companyName)
  const now = new Date()

  if (idx >= 0) {
    const prev = items[idx]
    const next: SupportRate = {
      ...prev,
      companyName,
      jyouyouDailyRate: jyouyouDailyRate ?? prev.jyouyouDailyRate,
      ouenDailyRate: ouenDailyRate ?? prev.ouenDailyRate,
    }
    const saved = [...items]
    saved[idx] = next
    await saveSupportRates(saved)
    return next
  }

  const created: SupportRate = {
    id: `support-rate-${now.getTime()}`,
    companyName,
    jyouyouDailyRate,
    ouenDailyRate,
    isActive: true,
    createdAt: now.toISOString(),
  }

  await saveSupportRates([created, ...items])
  return created
}
