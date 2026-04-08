// Supabase Edge Function: billing-checkout
// - Create Stripe Checkout session for subscription start/update
// - Returns { url }

// NOTE: This is a minimal connection point.
// - Webhook / billingState auto refresh are handled in later PRs.

import Stripe from 'https://esm.sh/stripe@14.25.0?target=deno'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

type PlanKey = 'projects_3' | 'projects_6' | 'projects_9'

type ReqBody = {
  planKey: PlanKey
  successUrl: string
  cancelUrl: string
}

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  })

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

    const body = (await req.json()) as Partial<ReqBody>
    const planKey = String(body.planKey || '') as PlanKey
    const successUrl = String(body.successUrl || '').trim()
    const cancelUrl = String(body.cancelUrl || '').trim()

    if (!successUrl || !cancelUrl) return json(400, { error: 'successUrl/cancelUrl are required' })
    if (!['projects_3', 'projects_6', 'projects_9'].includes(planKey)) return json(400, { error: 'Invalid planKey' })

    const priceId = (() => {
      if (planKey === 'projects_6') return Deno.env.get('STRIPE_PRICE_PROJECTS_6')
      if (planKey === 'projects_9') return Deno.env.get('STRIPE_PRICE_PROJECTS_9')
      return Deno.env.get('STRIPE_PRICE_PROJECTS_3')
    })()

    if (!priceId) return json(500, { error: `Stripe priceId is not set for planKey=${planKey}` })

    const stripe = new Stripe(secretKey, { apiVersion: '2023-10-16' })

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      client_reference_id: userId,
      metadata: {
        planKey,
        userId,
      },
      // NOTE(PR69): subscriptionイベントでも userId/planKey を拾えるようにする（webhook同期の土台）
      subscription_data: {
        metadata: {
          planKey,
          userId,
        },
      },
    })

    return json(200, { url: session.url })
  } catch (e) {
    console.error('billing-checkout error', e)
    return json(500, { error: 'Internal Server Error' })
  }
})
