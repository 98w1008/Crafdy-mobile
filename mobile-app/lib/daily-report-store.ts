import AsyncStorage from '@react-native-async-storage/async-storage'

export type ReviewStatus = 'draft' | 'submitted' | 'approved'

export type StoredDailyReport = {
  id: string
  projectId: string
  date: string // YYYY-MM-DD
  work: string
  workforceTime: string
  nextPlan: string
  memo?: string
  reviewStatus: ReviewStatus
  createdAt: string
}

const DAILY_REPORTS_KEY = 'daily_reports_v1'

const safeParse = <T>(raw: string | null, fallback: T): T => {
  if (!raw) return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

const ensureReviewStatus = (v: any): ReviewStatus => {
  if (v === 'submitted' || v === 'approved') return v
  return 'draft'
}

export const listDailyReports = async (): Promise<StoredDailyReport[]> => {
  const raw = await AsyncStorage.getItem(DAILY_REPORTS_KEY)
  const items = safeParse<any[]>(raw, [])
  return items.map((r: any) => ({
    ...r,
    reviewStatus: ensureReviewStatus(r?.reviewStatus),
  })) as StoredDailyReport[]
}

export const saveDailyReports = async (items: StoredDailyReport[]) => {
  await AsyncStorage.setItem(DAILY_REPORTS_KEY, JSON.stringify(items))
}

export const listDailyReportsByProject = async (projectId: string): Promise<StoredDailyReport[]> => {
  const all = await listDailyReports()
  return all.filter(r => r.projectId === projectId)
}

export const createDailyReport = async (params: {
  projectId: string
  date: string
  work: string
  workforceTime: string
  nextPlan: string
  memo?: string
}): Promise<StoredDailyReport> => {
  const items = await listDailyReports()
  const now = new Date()
  const report: StoredDailyReport = {
    id: `${now.getTime()}`,
    projectId: params.projectId,
    date: params.date,
    work: params.work,
    workforceTime: params.workforceTime,
    nextPlan: params.nextPlan,
    memo: params.memo?.trim() || undefined,
    reviewStatus: 'draft',
    createdAt: now.toISOString(),
  }

  await saveDailyReports([report, ...items])
  return report
}
