import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.21.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CreatePaymentIntentRequest {
  amount: number
  currency: string
  plan_id: string
  user_id: string
}

serve(async (req) => {
  // CORS対応
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 環境変数の確認
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!stripeSecretKey || !supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing required environment variables')
    }

    // Stripe初期化
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
    })

    // Supabase初期化
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // リクエストボディの解析
    const { amount, currency, plan_id, user_id }: CreatePaymentIntentRequest = await req.json()

    // 入力バリデーション
    if (!amount || !currency || !plan_id || !user_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: amount, currency, plan_id, user_id' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    if (amount < 50) {
      return new Response(
        JSON.stringify({ error: 'Amount must be at least ¥50' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // ユーザー情報の取得と認証確認
    const { data: user, error: userError } = await supabase.auth.admin.getUserById(user_id)
    
    if (userError || !user.user) {
      return new Response(
        JSON.stringify({ error: 'Invalid user' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // PaymentIntentを作成
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency,
      metadata: {
        user_id,
        plan_id,
        email: user.user.email || '',
      },
      description: `Crafdy Mobile - ${plan_id} plan upgrade`,
      statement_descriptor: 'CRAFDY MOBILE',
      automatic_payment_methods: {
        enabled: true,
      },
    })

    // 支払い記録をデータベースに保存（オプション）
    const { error: dbError } = await supabase
      .from('payment_intents')
      .insert({
        stripe_payment_intent_id: paymentIntent.id,
        user_id,
        plan_id,
        amount,
        currency,
        status: 'created',
        created_at: new Date().toISOString(),
      })

    if (dbError) {
      console.error('Failed to save payment intent to database:', dbError)
      // データベース保存に失敗してもPaymentIntentの作成は成功とする
    }

    // レスポンスを返す
    return new Response(
      JSON.stringify({
        client_secret: paymentIntent.client_secret,
        payment_intent_id: paymentIntent.id,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )

  } catch (error) {
    console.error('Error creating payment intent:', error)
    
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Internal server error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})