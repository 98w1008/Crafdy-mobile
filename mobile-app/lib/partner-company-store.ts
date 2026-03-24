import AsyncStorage from '@react-native-async-storage/async-storage'

export type PartnerCompany = {
  id: string
  name: string
  workerDailyRate?: number
  isActive: boolean
  createdAt: string
}

const PARTNER_COMPANIES_KEY = 'partner_companies_v1'

const safeParse = <T>(raw: string | null, fallback: T): T => {
  if (!raw) return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

const savePartnerCompanies = async (items: PartnerCompany[]) => {
  await AsyncStorage.setItem(PARTNER_COMPANIES_KEY, JSON.stringify(items))
}

export const listPartnerCompanies = async (): Promise<PartnerCompany[]> => {
  const raw = await AsyncStorage.getItem(PARTNER_COMPANIES_KEY)
  return safeParse<PartnerCompany[]>(raw, [])
}

export const findPartnerCompanyByName = async (name: string): Promise<PartnerCompany | null> => {
  const n = name.trim()
  if (!n) return null
  const items = await listPartnerCompanies()
  const hit = items.find(c => c.name.trim() === n)
  return hit || null
}

export const createPartnerCompany = async (params: {
  name: string
  workerDailyRate?: number
}): Promise<PartnerCompany> => {
  // NOTE: 最小実装（ローカル保存のみ）。後続PRで server/DB に置換する。
  const name = params.name.trim()
  if (!name) throw new Error('name is required')

  const items = await listPartnerCompanies()
  const existing = items.find(c => c.name.trim() === name)
  if (existing) return existing

  const now = new Date()
  const workerDailyRate =
    typeof params.workerDailyRate === 'number' && Number.isFinite(params.workerDailyRate) && params.workerDailyRate > 0
      ? Math.round(params.workerDailyRate)
      : undefined

  const company: PartnerCompany = {
    id: `partner-company-${now.getTime()}`,
    name,
    workerDailyRate,
    isActive: true,
    createdAt: now.toISOString(),
  }

  await savePartnerCompanies([company, ...items])
  return company
}
