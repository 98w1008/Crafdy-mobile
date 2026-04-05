import AsyncStorage from '@react-native-async-storage/async-storage'

import { listProjects } from '@/lib/project-store'

export type PlanKey = 'projects_3' | 'projects_6' | 'projects_9'

export type CompanyPlan = {
  planKey: PlanKey
  maxActiveProjects: number
  // TODO(課金/プラン): 将来の人数上限（代表+職長/従業員）を差し込みやすいよう枠だけ持つ
  accountLimit?: number
  createdAt: string
  updatedAt: string
}

export type PlanUsageStatus = {
  plan: CompanyPlan
  // NOTE: 最小実装は「現場総数」を現在数として扱う（同時稼働の定義は後で差し替え）
  currentProjectCount: number
  remaining: number
  isOverLimit: boolean
}

const STORAGE_KEY = 'company_plan_v1'

const safeParse = <T>(raw: string | null, fallback: T): T => {
  if (!raw) return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

const planDef = (planKey: PlanKey): Pick<CompanyPlan, 'planKey' | 'maxActiveProjects' | 'accountLimit'> => {
  if (planKey === 'projects_6') return { planKey, maxActiveProjects: 6, accountLimit: undefined }
  if (planKey === 'projects_9') return { planKey, maxActiveProjects: 9, accountLimit: undefined }
  return { planKey: 'projects_3', maxActiveProjects: 3, accountLimit: undefined }
}

export const getCompanyPlan = async (): Promise<CompanyPlan> => {
  const raw = await AsyncStorage.getItem(STORAGE_KEY)
  const parsed = safeParse<CompanyPlan | null>(raw, null)

  if (parsed?.planKey && Number.isFinite(parsed.maxActiveProjects)) return parsed

  const now = new Date().toISOString()
  const seeded: CompanyPlan = {
    ...planDef('projects_3'),
    createdAt: now,
    updatedAt: now,
  }

  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(seeded))
  return seeded
}

export const setCompanyPlanKey = async (planKey: PlanKey): Promise<CompanyPlan> => {
  const prev = await getCompanyPlan()
  const now = new Date().toISOString()
  const next: CompanyPlan = {
    ...prev,
    ...planDef(planKey),
    updatedAt: now,
  }
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  return next
}

export const getPlanUsageStatus = async (): Promise<PlanUsageStatus> => {
  const [plan, projects] = await Promise.all([getCompanyPlan(), listProjects()])

  const current = Array.isArray(projects) ? projects.length : 0
  const remaining = Math.max(0, plan.maxActiveProjects - current)

  return {
    plan,
    currentProjectCount: current,
    remaining,
    isOverLimit: current > plan.maxActiveProjects,
  }
}
