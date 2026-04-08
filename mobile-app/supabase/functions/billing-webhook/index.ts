// Supabase Edge Function: billing-webhook
// - Stripe webhook receiver (minimal)
// - Updates Supabase Auth user_metadata.billingStateV1 for app sync
//
// NOTE: 本来はDB永続化 + webhook網羅に寄せる。
// まずは「Stripeイベント → billingState更新経路」を作る。

import Stripe from 'https://esm.sh/stripe@14.25.0?target=deno'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

type PlanKey = 'projects_3' | 'projects_6' | 'projects_9'
type BillingStatus = 'inactive' | 'trial' | 'active' | 'past_due' | 'canceled' | 'expired'

type BillingStateV1 = {
  planKey: PlanKey
  billingStatus: BillingStatus
  currentPeriodEnd?: string
  cancelAtPeriodEnd?: boolean
  updatedAt: string
}

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

const toBillingStatus = (s: string | null | undefined): BillingStatus => {
  if (s === 'trialing') return 'trial'
  if (s === 'active') return 'active'
  if (s === 'past_due' || s === 'unpaid') return 'past_due'
  if (s === 'canceled') return 'canceled'
  if (s === 'incomplete_expired') return 'expired'
  return 'inactive'
}

const isPlanKey = (v: string): v is PlanKey => v === 'projects_3' || v === 'projects_6' || v === 'projects_9'

const upsertUserBillingState = async (userId: string, next: BillingStateV1) => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceRoleKey) throw new Error('Supabase env is not set (SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY)')

  const admin = createClient(supabaseUrl, serviceRoleKey)

  const { data: prevRes } = await admin.auth.admin.getUserById(userId)
  const prevMeta = (prevRes?.user?.user_metadata || {}) as Record<string, unknown>

  const merged = {
    ...prevMeta,
    billingStateV1: next,
  }

  const { error } = await admin.auth.admin.updateUserById(userId, { user_metadata: merged })
  if (error) throw error
}

Deno.serve(async req => {
  try {
    if (req.method !== 'POST') return json(405, { error: 'Method Not Allowed' })

    const secretKey = Deno.env.get('STRIPE_SECRET_KEY')
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')
    if (!secretKey || !webhookSecret) return json(500, { error: 'Stripe env is not set' })

    const sig = req.headers.get('stripe-signature')
    if (!sig) return json(400, { error: 'Missing stripe-signature' })

    const raw = await req.text()
    const stripe = new Stripe(secretKey, { apiVersion: '2023-10-16' })

    let evt: Stripe.Event
    try {
      evt = stripe.webhooks.constructEvent(raw, sig, webhookSecret)
    } catch {
      return json(400, { error: 'Invalid signature' })
    }

    // Minimal events (理由: 現状のcheckout実装に直結し、状態更新の主経路になるため)
    if (evt.type === 'checkout.session.completed') {
      const s = evt.data.object as Stripe.Checkout.Session
      const userId = String((s as any)?.client_reference_id || (s as any)?.metadata?.userId || '').trim()
      const planRaw = String((s as any)?.metadata?.planKey || '').trim()
      const subId = (s as any)?.subscription

      if (!userId || !isPlanKey(planRaw) || !subId || typeof subId !== 'string') return json(200, { ok: true })

      const sub = await stripe.subscriptions.retrieve(subId)
      const next: BillingStateV1 = {
        planKey: planRaw,
        billingStatus: toBillingStatus((sub as any)?.status),
        currentPeriodEnd:
          typeof (sub as any)?.current_period_end === 'number'
            ? new Date(((sub as any).current_period_end as number) * 1000).toISOString()
            : undefined,
        cancelAtPeriodEnd: !!(sub as any)?.cancel_at_period_end,
        updatedAt: new Date().toISOString(),
      }

      await upsertUserBillingState(userId, next)
      return json(200, { ok: true })
    }

    if (evt.type === 'customer.subscription.created' || evt.type === 'customer.subscription.updated' || evt.type === 'customer.subscription.deleted') {
      const sub = evt.data.object as Stripe.Subscription
      const userId = String((sub as any)?.metadata?.userId || '').trim()
      const planRaw = String((sub as any)?.metadata?.planKey || '').trim()
      if (!userId || !isPlanKey(planRaw)) return json(200, { ok: true })

      const next: BillingStateV1 = {
        planKey: planRaw,
        billingStatus: toBillingStatus((sub as any)?.status),
        currentPeriodEnd:
          typeof (sub as any)?.current_period_end === 'number'
            ? new Date(((sub as any).current_period_end as number) * 1000).toISOString()
            : undefined,
        cancelAtPeriodEnd: !!(sub as any)?.cancel_at_period_end,
        updatedAt: new Date().toISOString(),
      }

      await upsertUserBillingState(userId, next)
      return json(200, { ok: true })
    }

    return json(200, { ok: true })
  } catch (e) {
    console.error('billing-webhook error', e)
    return json(500, { error: 'Internal Server Error' })
  }
})
