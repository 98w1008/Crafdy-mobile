import React, { useEffect, useMemo, useState } from 'react'
import { Alert, SafeAreaView, ScrollView, StyleSheet, View } from 'react-native'
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router'
import { Card, StyledButton, StyledText } from '@/components/ui'
import { Colors, Spacing } from '@/constants/Colors'
import { getBillingState, type BillingState } from '@/lib/billing-store'
import { getCompanyPlan } from '@/lib/plan-store'

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
      // TODO(Stripe): checkout成功後に、サーバ側で subscription を確定
      // TODO(Stripe): ここで billingState を refresh（API経由で取得→setBillingState）
      Alert.alert('手続きが完了しました', '契約状態の反映は準備中です（次PRで対応予定）。')
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

  const handleCTA = () => {
    // NOTE(PR66): 最小接続
    // - 本来はここで checkout session を作成して Stripe Checkout を開く
    // - 今回は「開始 → success/cancel で戻る」だけを先に通す
    // TODO(Stripe): create checkout session here
    //   - input: planKey, customerId(or auth userId), successUrl, cancelUrl
    //   - successUrl: /billing?result=success&returnTo=<backTo>
    //   - cancelUrl : /billing?result=cancel&returnTo=<backTo>
    // TODO(Stripe): open Stripe Checkout (web)
    // TODO(Stripe): on return (success): refresh billingState (API fetch) and re-render
    // TODO(Stripe): on return (cancel): no state update

    Alert.alert('決済を開始', '（最小接続）戻りの動作だけ先に確認できます。', [
      {
        text: 'キャンセルとして戻る',
        style: 'cancel',
        onPress: () => router.replace({ pathname: '/billing', params: { result: 'cancel', returnTo: backTo } } as any),
      },
      {
        text: '成功として戻る',
        onPress: () => router.replace({ pathname: '/billing', params: { result: 'success', returnTo: backTo } } as any),
      },
    ])
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
