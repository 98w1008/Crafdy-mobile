import AsyncStorage from '@react-native-async-storage/async-storage'

import type { PlanKey } from '@/lib/plan-store'

export type BillingStatus = 'inactive' | 'trial' | 'active' | 'past_due' | 'canceled' | 'expired'

export type BillingState = {
  planKey: PlanKey
  billingStatus: BillingStatus
  currentPeriodEnd?: string
  cancelAtPeriodEnd?: boolean
  createdAt: string
  updatedAt: string
}

const STORAGE_KEY = 'billing_state_v1'

const safeParse = <T>(raw: string | null, fallback: T): T => {
  if (!raw) return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export const getBillingState = async (): Promise<BillingState> => {
  const raw = await AsyncStorage.getItem(STORAGE_KEY)
  const parsed = safeParse<BillingState | null>(raw, null)

  if (parsed?.billingStatus && parsed?.planKey) return parsed

  const now = new Date().toISOString()
  const seeded: BillingState = {
    planKey: 'projects_3',
    billingStatus: 'inactive',
    cancelAtPeriodEnd: false,
    createdAt: now,
    updatedAt: now,
  }

  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(seeded))
  return seeded
}

export const setBillingState = async (next: Omit<BillingState, 'createdAt' | 'updatedAt'>): Promise<BillingState> => {
  const prev = await getBillingState()
  const now = new Date().toISOString()

  const merged: BillingState = {
    ...prev,
    ...next,
    updatedAt: now,
  }

  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(merged))
  return merged
}

// NOTE: 将来Stripe接続時にここへ差し込み
// - Stripe Customer/Subscription を取得
// - billingStatus / currentPeriodEnd / cancelAtPeriodEnd / planKey を更新
// - UIは getBillingState() を読むだけで良い状態にする
