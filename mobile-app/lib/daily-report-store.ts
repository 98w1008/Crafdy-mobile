import AsyncStorage from '@react-native-async-storage/async-storage'

export type ReviewStatus = 'draft' | 'submitted' | 'approved'

export type PartnerWorkerEntry = {
  companyName: string
  workersCount: number
}

export type ExpenseCheckStatus = 'unknown' | 'none'

export type StoredDailyReport = {
  id: string
  projectId: string
  date: string // YYYY-MM-DD
  work: string
  workforceTime: string
  nextPlan: string
  memo?: string
  selfWorkersCount?: number
  partnerWorkers?: PartnerWorkerEntry[]
  expenseCheckStatus?: ExpenseCheckStatus
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

const ensureSelfWorkersCount = (v: any): number | undefined => {
  if (typeof v !== 'number') return undefined
  if (!Number.isFinite(v) || v < 0) return undefined
  return Math.floor(v)
}

const ensurePartnerWorkers = (v: any): PartnerWorkerEntry[] => {
  if (!Array.isArray(v)) return []
  return v
    .map((x: any) => ({
      companyName: String(x?.companyName || '').trim(),
      workersCount: Number(x?.workersCount),
    }))
    .filter(x => x.companyName && Number.isFinite(x.workersCount) && x.workersCount > 0)
    .map(x => ({ ...x, workersCount: Math.floor(x.workersCount) }))
}

const ensureExpenseCheckStatus = (v: any): ExpenseCheckStatus => {
  if (v === 'none') return 'none'
  return 'unknown'
}

export const listDailyReports = async (): Promise<StoredDailyReport[]> => {
  const raw = await AsyncStorage.getItem(DAILY_REPORTS_KEY)
  const items = safeParse<any[]>(raw, [])
  return items.map((r: any) => ({
    ...r,
    selfWorkersCount: ensureSelfWorkersCount(r?.selfWorkersCount),
    partnerWorkers: ensurePartnerWorkers(r?.partnerWorkers),
    expenseCheckStatus: ensureExpenseCheckStatus(r?.expenseCheckStatus),
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
  selfWorkersCount?: number
  partnerWorkers?: PartnerWorkerEntry[]
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
    selfWorkersCount: typeof params.selfWorkersCount === 'number' ? params.selfWorkersCount : undefined,
    partnerWorkers: params.partnerWorkers?.length ? params.partnerWorkers : undefined,
    expenseCheckStatus: 'unknown',
    reviewStatus: 'draft',
    createdAt: now.toISOString(),
  }

  await saveDailyReports([report, ...items])
  return report
}

export const submitDailyReport = async (reportId: string): Promise<void> => {
  const items = await listDailyReports()
  const idx = items.findIndex(r => r.id === reportId)
  if (idx === -1) return

  const prev = items[idx]
  if (prev.reviewStatus !== 'draft') return

  const next = [...items]
  next[idx] = { ...prev, reviewStatus: 'submitted' }
  await saveDailyReports(next)
}

export const approveDailyReport = async (reportId: string): Promise<void> => {
  const items = await listDailyReports()
  const idx = items.findIndex(r => r.id === reportId)
  if (idx === -1) return

  const prev = items[idx]
  if (prev.reviewStatus !== 'submitted') return

  const next = [...items]
  next[idx] = { ...prev, reviewStatus: 'approved' }
  await saveDailyReports(next)
}

export const markDailyReportNoExpense = async (reportId: string): Promise<void> => {
  const items = await listDailyReports()
  const idx = items.findIndex(r => r.id === reportId)
  if (idx === -1) return

  const prev = items[idx]

  const next = [...items]
  next[idx] = { ...prev, expenseCheckStatus: 'none' }
  await saveDailyReports(next)
}
