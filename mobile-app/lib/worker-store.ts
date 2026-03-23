import AsyncStorage from '@react-native-async-storage/async-storage'

export type Worker = {
  id: string
  name: string
  dailyRate?: number
  isActive: boolean
  createdAt: string
}

const WORKERS_KEY = 'workers_v1'

const safeParse = <T>(raw: string | null, fallback: T): T => {
  if (!raw) return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

const saveWorkers = async (items: Worker[]) => {
  await AsyncStorage.setItem(WORKERS_KEY, JSON.stringify(items))
}

export const listWorkers = async (): Promise<Worker[]> => {
  const raw = await AsyncStorage.getItem(WORKERS_KEY)
  return safeParse<Worker[]>(raw, [])
}

export const findWorkerByName = async (name: string): Promise<Worker | null> => {
  const n = name.trim()
  if (!n) return null
  const items = await listWorkers()
  const hit = items.find(w => w.name.trim() === n)
  return hit || null
}

export const createWorker = async (params: {
  name: string
  dailyRate?: number
}): Promise<Worker> => {
  // NOTE: 最小実装（ローカル保存のみ）。後続PRで server/DB に置換する。
  const name = params.name.trim()
  if (!name) throw new Error('name is required')

  const items = await listWorkers()
  const existing = items.find(w => w.name.trim() === name)
  if (existing) return existing

  const now = new Date()
  const dailyRate = typeof params.dailyRate === 'number' && Number.isFinite(params.dailyRate) && params.dailyRate > 0
    ? Math.round(params.dailyRate)
    : undefined

  const worker: Worker = {
    id: `worker-${now.getTime()}`,
    name,
    dailyRate,
    isActive: true,
    createdAt: now.toISOString(),
  }

  await saveWorkers([worker, ...items])
  return worker
}
