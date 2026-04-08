// Supabase Edge Function: billing-refresh
// - Fetch Stripe state for current user and return billing fields
// - This is a bridge until webhook-based synchronization is implemented.

import Stripe from 'https://esm.sh/stripe@14.25.0?target=deno'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

type PlanKey = 'projects_3' | 'projects_6' | 'projects_9'

type BillingStatus = 'inactive' | 'trial' | 'active' | 'past_due' | 'canceled' | 'expired'

type RespBody = {
  planKey: PlanKey
  billingStatus: BillingStatus
  currentPeriodEnd?: string
  cancelAtPeriodEnd?: boolean
}

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  })

const toBillingStatus = (s: string | null | undefined): BillingStatus => {
  // Stripe subscription status reference:
  // https://stripe.com/docs/api/subscriptions/object#subscription_object-status
  if (s === 'trialing') return 'trial'
  if (s === 'active') return 'active'
  if (s === 'past_due' || s === 'unpaid') return 'past_due'
  if (s === 'canceled') return 'canceled'
  if (s === 'incomplete_expired') return 'expired'
  return 'inactive'
}

Deno.serve(async req => {
  try {
    if (req.method !== 'POST') return json(405, { error: 'Method Not Allowed' })

    const secretKey = Deno.env.get('STRIPE_SECRET_KEY')
    if (!secretKey) return json(500, { error: 'STRIPE_SECRET_KEY is not set' })

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json(401, { error: 'Unauthorized' })

    if (!supabaseUrl || !supabaseAnonKey) return json(500, { error: 'Supabase env is not set' })

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    })

    const { data: userRes, error: userErr } = await supabase.auth.getUser()
    const userId = userRes?.user?.id
    if (userErr || !userId) return json(401, { error: 'Unauthorized' })

    // NOTE(PR69): まず webhook が保存した billingStateV1（本筋）を参照する。
    // 無ければ Stripe へ直接問い合わせ（暫定fallback）する。
    const meta = (userRes?.user?.user_metadata || {}) as any
    const saved = meta?.billingStateV1
    if (saved?.planKey && saved?.billingStatus) {
      const out: RespBody = {
        planKey: String(saved.planKey) as any,
        billingStatus: String(saved.billingStatus) as any,
        currentPeriodEnd: saved.currentPeriodEnd ? String(saved.currentPeriodEnd) : undefined,
        cancelAtPeriodEnd: typeof saved.cancelAtPeriodEnd === 'boolean' ? saved.cancelAtPeriodEnd : undefined,
      }
      return json(200, out)
    }

    const stripe = new Stripe(secretKey, { apiVersion: '2023-10-16' })

    // Find most recent completed checkout session for this user.
    // NOTE: This is not a replacement for webhook sync; it is a temporary refresh mechanism.
    const sessions = await stripe.checkout.sessions.list({ limit: 20 })
    const mine = (sessions.data || [])
      .filter(s => (s as any)?.client_reference_id === userId)
      .sort((a, b) => (Number(b.created) || 0) - (Number(a.created) || 0))

    const latest = mine.find(s => (s as any)?.status === 'complete') || mine[0]
    if (!latest) {
      const out: RespBody = { planKey: 'projects_3', billingStatus: 'inactive' }
      return json(200, out)
    }

    const planKey = ((): PlanKey => {
      const v = String((latest.metadata as any)?.planKey || '').trim()
      if (v === 'projects_6' || v === 'projects_9' || v === 'projects_3') return v
      return 'projects_3'
    })()

    const subscriptionId = (latest as any)?.subscription
    if (!subscriptionId || typeof subscriptionId !== 'string') {
      const out: RespBody = { planKey, billingStatus: 'inactive' }
      return json(200, out)
    }

    const sub = await stripe.subscriptions.retrieve(subscriptionId)

    const out: RespBody = {
      planKey,
      billingStatus: toBillingStatus((sub as any)?.status),
      currentPeriodEnd: typeof (sub as any)?.current_period_end === 'number'
        ? new Date(((sub as any).current_period_end as number) * 1000).toISOString()
        : undefined,
      cancelAtPeriodEnd: !!(sub as any)?.cancel_at_period_end,
    }

    return json(200, out)
  } catch (e) {
    console.error('billing-refresh error', e)
    return json(500, { error: 'Internal Server Error' })
  }
})
