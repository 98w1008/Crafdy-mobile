import React, { useEffect, useState } from 'react'
import { Alert, SafeAreaView, ScrollView, StyleSheet, View } from 'react-native'
import { useFocusEffect, useRouter } from 'expo-router'
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
  const [billing, setBilling] = useState<BillingState | null>(null)
  const [planMax, setPlanMax] = useState<number | null>(null)

  const reload = async () => {
    const [b, p] = await Promise.all([getBillingState(), getCompanyPlan()])
    setBilling(b)
    setPlanMax(p.maxActiveProjects)
  }

  useEffect(() => {
    reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useFocusEffect(
    React.useCallback(() => {
      reload()
    }, [])
  )

  const handleCTA = () => {
    // NOTE: PR64は導線の土台のみ（Stripe checkout は次PR以降）
    // TODO(Stripe): ここで checkout session を作成 → 成功/キャンセルで戻る → billingState を更新
    Alert.alert('準備中', '決済（Stripe checkout）は次PRで差し込み予定です。')
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
            <StyledButton title="ダッシュボードへ戻る" variant="secondary" onPress={() => router.replace('/(tabs)/dashboard' as any)} />
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
