import React, { useEffect, useMemo, useState } from 'react'
import { Alert, SafeAreaView, ScrollView, Share, StyleSheet, View } from 'react-native'
import { useLocalSearchParams, useFocusEffect, router } from 'expo-router'
import { Card, StyledButton, StyledText } from '@/components/ui'
import { Colors, Spacing, BorderRadius } from '@/constants/Colors'
import { getAccessContext, type AccessContext } from '@/lib/access-context'
import { listSupportInvoiceDrafts, type SupportInvoiceDraft } from '@/lib/support-invoice-draft-store'

export default function SupportInvoiceDraftPreviewScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>()

  const [access, setAccess] = useState<AccessContext | null>(null)
  const [drafts, setDrafts] = useState<SupportInvoiceDraft[]>([])

  const canSee = access?.kind === 'assigned' && (access.role === 'owner' || access.role === 'office')

  const reload = async () => {
    const [ctx, items] = await Promise.all([getAccessContext(), listSupportInvoiceDrafts()])
    setAccess(ctx)
    setDrafts(items)
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

  const draft = useMemo(() => {
    const targetId = String(id || '').trim()
    if (!targetId) return null
    return drafts.find(d => d.id === targetId) || null
  }, [drafts, id])

  if (!canSee) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          <Card variant="elevated" style={styles.infoCard}>
            <StyledText variant="subtitle" weight="semibold">閲覧できません</StyledText>
            <StyledText variant="body" color="secondary" style={{ marginTop: 6 }}>
              請求書下書きは owner / office のみ閲覧できます。
            </StyledText>
            <View style={{ marginTop: Spacing.sm }}>
              <StyledButton title="戻る" variant="secondary" onPress={() => router.back()} />
            </View>
          </Card>
        </ScrollView>
      </SafeAreaView>
    )
  }

  if (!draft) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          <Card variant="elevated" style={styles.infoCard}>
            <StyledText variant="subtitle" weight="semibold">請求書下書きが見つかりません</StyledText>
            <StyledText variant="body" color="secondary" style={{ marginTop: 6 }}>
              一覧から開き直してください。
            </StyledText>
            <View style={{ marginTop: Spacing.sm }}>
              <StyledButton title="一覧へ" variant="secondary" onPress={() => router.push('/support-invoice-drafts' as any)} />
            </View>
          </Card>
        </ScrollView>
      </SafeAreaView>
    )
  }

  const buildShareText = (d: SupportInvoiceDraft): string => {
    const linesText = (d.lines || [])
      .map(l => {
        const unit = `¥${l.unitPrice.toLocaleString('ja-JP')}`
        const amt = `¥${l.amount.toLocaleString('ja-JP')}`
        return `- ${l.label}: ${l.quantity} × ${unit} = ${amt}`
      })
      .join('\n')

    return [
      '請求書（下書き）',
      `請求先: ${d.companyName}`,
      `対象月: ${d.ym}`,
      '',
      '明細:',
      linesText || '（明細なし）',
      '',
      `小計: ¥${(d.subtotal ?? 0).toLocaleString('ja-JP')}`,
    ].join('\n')
  }

  const handleShare = async () => {
    try {
      const message = buildShareText(draft)
      await Share.share({ message })
    } catch (e) {
      console.error('Failed to share support invoice draft', e)
      Alert.alert('出力に失敗しました', '共有できませんでした。もう一度お試しください。')
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.actionsRow}>
          <StyledButton title="一覧へ" variant="secondary" onPress={() => router.push('/support-invoice-drafts' as any)} />
          <StyledButton title="更新" variant="secondary" onPress={reload} />
          <StyledButton title="共有" variant="secondary" onPress={handleShare} />
        </View>

        {/* クラフディ標準テンプレ（最小プレビュー） */}
        <View style={styles.paper}>
          <View style={styles.paperHeader}>
            <StyledText variant="heading2" weight="bold">請求書</StyledText>
            <StyledText variant="caption" color="secondary">対象月: {draft.ym}</StyledText>
          </View>

          <View style={styles.toBlock}>
            <StyledText variant="caption" color="secondary">請求先</StyledText>
            <StyledText variant="subtitle" weight="semibold" numberOfLines={1}>
              {draft.companyName}
            </StyledText>
            <StyledText variant="caption" color="secondary" numberOfLines={2}>
              {draft.title}
            </StyledText>
          </View>

          <View style={styles.table}>
            <View style={[styles.tableRow, styles.tableHeaderRow]}>
              <StyledText variant="caption" weight="semibold" style={{ flex: 2 }}>項目</StyledText>
              <StyledText variant="caption" weight="semibold" style={{ flex: 1, textAlign: 'right' }}>数量</StyledText>
              <StyledText variant="caption" weight="semibold" style={{ flex: 2, textAlign: 'right' }}>単価</StyledText>
              <StyledText variant="caption" weight="semibold" style={{ flex: 2, textAlign: 'right' }}>金額</StyledText>
            </View>

            {(draft.lines || []).map((l, idx) => (
              <View key={`line-${idx}`} style={styles.tableRow}>
                <StyledText variant="caption" style={{ flex: 2 }} numberOfLines={1}>
                  {l.label}
                </StyledText>
                <StyledText variant="caption" color="secondary" style={{ flex: 1, textAlign: 'right' }}>
                  {l.quantity}
                </StyledText>
                <StyledText variant="caption" color="secondary" style={{ flex: 2, textAlign: 'right' }}>
                  ¥{l.unitPrice.toLocaleString('ja-JP')}
                </StyledText>
                <StyledText variant="caption" color="secondary" style={{ flex: 2, textAlign: 'right' }}>
                  ¥{l.amount.toLocaleString('ja-JP')}
                </StyledText>
              </View>
            ))}

            <View style={[styles.tableRow, styles.tableFooterRow]}>
              <View style={{ flex: 2 }} />
              <View style={{ flex: 1 }} />
              <StyledText variant="caption" weight="semibold" style={{ flex: 2, textAlign: 'right' }}>
                小計
              </StyledText>
              <StyledText variant="caption" weight="semibold" style={{ flex: 2, textAlign: 'right' }}>
                ¥{(draft.subtotal ?? 0).toLocaleString('ja-JP')}
              </StyledText>
            </View>
          </View>

          <StyledText variant="caption" color="secondary" style={{ marginTop: Spacing.md }}>
            ※ これはプレビューです（PDF出力・税計算・請求番号は未対応）。
          </StyledText>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scrollView: { flex: 1 },
  scrollContent: { padding: Spacing.md, paddingBottom: Spacing['2xl'] },

  actionsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },

  infoCard: { padding: Spacing.md },

  paper: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  paperHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  toBlock: {
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
  },

  table: {
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  tableHeaderRow: {
    backgroundColor: Colors.surfaceGray,
  },
  tableFooterRow: {
    borderBottomWidth: 0,
    backgroundColor: Colors.surfaceGray,
  },
})
