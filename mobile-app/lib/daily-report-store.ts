import AsyncStorage from '@react-native-async-storage/async-storage'

export type ReviewStatus = 'draft' | 'submitted' | 'approved'

export type PartnerWorkerEntry = {
  companyName: string
  workersCount: number
  partnerCompanyId?: string
}

export type ExpenseCheckStatus = 'unknown' | 'none'

export type ReportKind = 'project' | 'support'
export type SupportType = 'jyouyou' | 'ouen'

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
  // NOTE: 将来は selfWorkerIds を主にして、日報側で個人別出勤集計につなげる想定。
  selfWorkerIds?: string[]
  selfWorkerNames?: string[]
  expenseCheckStatus?: ExpenseCheckStatus
  reviewStatus: ReviewStatus
  createdAt: string

  // NOTE: reportKind='support' は将来の「常用・応援日報」導線で利用する。
  // support 日報は将来、請求候補算出や高速代の扱い等につなげる想定（今回は保持のみ）。
  reportKind?: ReportKind
  supportCompanyName?: string
  supportType?: SupportType
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

const ensureReportKind = (v: any): ReportKind => {
  if (v === 'support') return 'support'
  return 'project'
}

const ensureSupportCompanyName = (v: any): string | undefined => {
  const s = String(v || '').trim()
  return s ? s : undefined
}

const ensureSupportType = (v: any): SupportType | undefined => {
  if (v === 'jyouyou' || v === 'ouen') return v
  return undefined
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
      partnerCompanyId: x?.partnerCompanyId ? String(x.partnerCompanyId).trim() : undefined,
    }))
    .filter(x => x.companyName && Number.isFinite(x.workersCount) && x.workersCount > 0)
    .map(x => ({
      ...x,
      workersCount: Math.floor(x.workersCount),
      partnerCompanyId: x.partnerCompanyId || undefined,
    }))
}

const ensureExpenseCheckStatus = (v: any): ExpenseCheckStatus => {
  if (v === 'none') return 'none'
  return 'unknown'
}

const ensureStringArray = (v: any): string[] => {
  if (!Array.isArray(v)) return []
  return v.map(x => String(x || '').trim()).filter(Boolean)
}

export const listDailyReports = async (): Promise<StoredDailyReport[]> => {
  const raw = await AsyncStorage.getItem(DAILY_REPORTS_KEY)
  const items = safeParse<any[]>(raw, [])
  return items.map((r: any) => ({
    ...r,
    selfWorkersCount: ensureSelfWorkersCount(r?.selfWorkersCount),
    partnerWorkers: ensurePartnerWorkers(r?.partnerWorkers),
    selfWorkerIds: ensureStringArray(r?.selfWorkerIds),
    selfWorkerNames: ensureStringArray(r?.selfWorkerNames),
    expenseCheckStatus: ensureExpenseCheckStatus(r?.expenseCheckStatus),
    reviewStatus: ensureReviewStatus(r?.reviewStatus),

    // 後方互換: 既存データは reportKind がないため project 扱いに補完する
    reportKind: ensureReportKind(r?.reportKind),
    supportCompanyName: ensureSupportCompanyName(r?.supportCompanyName),
    supportType: ensureSupportType(r?.supportType),
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
  selfWorkerIds?: string[]
  selfWorkerNames?: string[]

  reportKind?: ReportKind
  supportCompanyName?: string
  supportType?: SupportType
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
    selfWorkerIds: params.selfWorkerIds?.length ? params.selfWorkerIds : undefined,
    selfWorkerNames: params.selfWorkerNames?.length ? params.selfWorkerNames : undefined,
    expenseCheckStatus: 'unknown',
    reviewStatus: 'draft',
    createdAt: now.toISOString(),

    reportKind: params.reportKind ?? 'project',
    supportCompanyName: params.supportCompanyName?.trim() || undefined,
    supportType: params.supportType === 'jyouyou' || params.supportType === 'ouen' ? params.supportType : undefined,
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
