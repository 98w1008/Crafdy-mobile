import React, { useEffect, useMemo, useState } from 'react'
import { Alert, SafeAreaView, ScrollView, StyleSheet, View } from 'react-native'
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router'
import * as Linking from 'expo-linking'
import * as WebBrowser from 'expo-web-browser'
import { Card, StyledButton, StyledText } from '@/components/ui'
import { Colors, Spacing } from '@/constants/Colors'
import { getBillingState, setBillingState, type BillingState } from '@/lib/billing-store'
import { getCompanyPlan } from '@/lib/plan-store'
import { supabase, supabaseReady } from '@/lib/supabase'

const statusLabel = (s: BillingState['billingStatus']) => {
  if (s === 'active') return '有効'
  if (s === 'trial') return 'トライアル'
  if (s === 'past_due') return '支払い未完了'
  if (s === 'canceled') return '解約'
  if (s === 'expired') return '期限切れ'
  return '未契約'
}

const ctaLabel = (s: BillingState['billingStatus']) => {
  if (s === 'past_due') return '支払いを更新'
  if (s === 'canceled') return '再開する'
  if (s === 'inactive' || s === 'expired') return 'プランを開始'
  return 'プランを確認'
}

export default function BillingScreen() {
  const router = useRouter()
  const { returnTo, result } = useLocalSearchParams<{ returnTo?: string; result?: string }>()
  const [billing, setBilling] = useState<BillingState | null>(null)
  const [planMax, setPlanMax] = useState<number | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const backTo = useMemo(() => {
    const v = String(returnTo || '').trim()
    return v ? v : '/(tabs)/dashboard'
  }, [returnTo])

  const reload = async () => {
    const [b, p] = await Promise.all([getBillingState(), getCompanyPlan()])
    setBilling(b)
    setPlanMax(p.maxActiveProjects)
  }

  useEffect(() => {
    reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // checkout から戻ってきた時の想定（success / cancel）
  useEffect(() => {
    if (!result) return

    if (result === 'success') {
      // NOTE: 本来は webhook で billingState を確定更新する。
      // このPRでは「成功後に再取得して反映する」最小導線だけ入れる。
      ;(async () => {
        if (!supabaseReady || !supabase) {
          Alert.alert('手続きが完了しました', '契約状態の反映は準備中です。')
          return
        }

        try {
          setIsRefreshing(true)
          const { data, error } = await supabase.functions.invoke('billing-refresh', { body: {} })
          if (error) {
            console.warn('billing-refresh failed', error)
            Alert.alert('手続きが完了しました', '契約状態の確認に失敗しました。時間をおいて再度お試しください。')
            return
          }

          const next = data as any
          if (next?.billingStatus && next?.planKey) {
            await setBillingState({
              planKey: String(next.planKey),
              billingStatus: String(next.billingStatus),
              currentPeriodEnd: next.currentPeriodEnd ? String(next.currentPeriodEnd) : undefined,
              cancelAtPeriodEnd: typeof next.cancelAtPeriodEnd === 'boolean' ? next.cancelAtPeriodEnd : undefined,
            } as any)
          }

          await reload()
          Alert.alert('手続きが完了しました', '契約状態を更新しました（反映まで時間がかかる場合があります）。')
        } catch (e) {
          console.error('billing refresh error', e)
          Alert.alert('手続きが完了しました', '契約状態の確認に失敗しました。')
        } finally {
          setIsRefreshing(false)
        }
      })()
    }

    if (result === 'cancel') {
      Alert.alert('キャンセルしました', '契約手続きはキャンセルされました。')
    }
  }, [result])

  useFocusEffect(
    React.useCallback(() => {
      reload()
    }, [])
  )

  const handleCTA = async () => {
    // NOTE(PR67): Stripe checkout 本接続（最小）
    // - Edge Functionで checkout session を作成 → checkout URL を受け取って開く
    // - success/cancel は deep link で /billing に戻す（result/returnTo を維持）
    // TODO(Stripe): success 後に billingState refresh を差し込む（API fetch）

    if (!supabaseReady || !supabase) {
      Alert.alert('準備中', '環境設定（Supabase）が未完了です。')
      return
    }

    const planKey = (billing?.planKey || 'projects_3') as any

    const successUrl = Linking.createURL('/billing', {
      queryParams: { result: 'success', returnTo: backTo },
    })

    const cancelUrl = Linking.createURL('/billing', {
      queryParams: { result: 'cancel', returnTo: backTo },
    })

    try {
      const { data, error } = await supabase.functions.invoke('billing-checkout', {
        body: {
          planKey,
          successUrl,
          cancelUrl,
        },
      })

      const checkoutUrl = String((data as any)?.url || '').trim()
      if (error || !checkoutUrl) {
        console.warn('Failed to create checkout session', error)
        Alert.alert('エラー', '決済の開始に失敗しました。時間をおいて再度お試しください。')
        return
      }

      // openAuthSessionAsync: success/cancel の deep link を捕捉してアプリに戻す
      const res = await WebBrowser.openAuthSessionAsync(checkoutUrl, successUrl)

      if (res.type === 'success' && res.url) {
        // deep link で戻ってきたURLを明示的に反映（環境によっては自動遷移しないため）
        router.replace(res.url as any)
      } else if (res.type === 'cancel') {
        // 何もしない（ユーザーがブラウザを閉じた）
      }
    } catch (e) {
      console.error('checkout start error', e)
      Alert.alert('エラー', '決済の開始に失敗しました。')
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <StyledText variant="heading2" weight="bold">契約・プラン管理</StyledText>
          <StyledText variant="body" color="secondary" style={{ marginTop: 6 }}>
            ここは決済/プラン変更の入口です（現時点は表示のみ）。
          </StyledText>
        </View>

        <Card variant="elevated" style={styles.card}>
          <StyledText variant="subtitle" weight="semibold">現在の状態</StyledText>
          <StyledText variant="body" color="secondary" style={{ marginTop: 6 }}>
            契約状態: {billing ? statusLabel(billing.billingStatus) : '読み込み中…'}
          </StyledText>
          {isRefreshing ? (
            <StyledText variant="caption" color="secondary" style={{ marginTop: 6 }}>
              契約状態を確認中…
            </StyledText>
          ) : null}
          <StyledText variant="body" color="secondary" style={{ marginTop: 2 }}>
            現在プラン: {planMax ? `${planMax}現場プラン` : '読み込み中…'}
          </StyledText>

          <View style={{ marginTop: Spacing.md, gap: Spacing.sm }}>
            <StyledButton
              title={billing ? ctaLabel(billing.billingStatus) : 'プランを確認'}
              variant="primary"
              onPress={handleCTA}
            />
            <StyledButton title="戻る" variant="secondary" onPress={() => router.replace(backTo as any)} />
          </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.md, paddingBottom: Spacing['2xl'] },
  header: { marginBottom: Spacing.lg, paddingTop: Spacing.sm },
  card: { padding: Spacing.md },
})
