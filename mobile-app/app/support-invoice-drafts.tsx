import React, { useEffect, useState } from 'react'
import { SafeAreaView, ScrollView, StyleSheet, View, TouchableOpacity } from 'react-native'
import { useFocusEffect, router } from 'expo-router'
import { Card, StyledButton, StyledText } from '@/components/ui'
import { Colors, Spacing } from '@/constants/Colors'
import { getAccessContext, type AccessContext } from '@/lib/access-context'
import { listSupportInvoiceDrafts, type SupportInvoiceDraft } from '@/lib/support-invoice-draft-store'

export default function SupportInvoiceDraftsScreen() {
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

  const visibleDrafts = canSee
    ? drafts.slice().sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
    : []

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <StyledText variant="heading2" weight="bold">
            請求書下書き（常用・応援）
          </StyledText>
          <StyledText variant="body" color="secondary">
            作成済みの請求書下書きを確認できます。
          </StyledText>
        </View>

        {!canSee ? (
          <Card variant="elevated" style={styles.infoCard}>
            <StyledText variant="subtitle" weight="semibold">閲覧できません</StyledText>
            <StyledText variant="body" color="secondary" style={{ marginTop: 6 }}>
              請求書下書きは owner / office のみ閲覧できます。
            </StyledText>
          </Card>
        ) : visibleDrafts.length === 0 ? (
          <Card variant="elevated" style={styles.emptyCard}>
            <StyledText variant="subtitle" weight="semibold">請求書下書きはまだありません</StyledText>
            <StyledText variant="body" color="secondary" style={{ marginTop: 6 }}>
              main-chat で「〇〇の今月請求書下書きを作成」と送ると作れます。
            </StyledText>
          </Card>
        ) : (
          <View style={{ gap: Spacing.md }}>
            {visibleDrafts.map(d => (
              <TouchableOpacity
                key={`${d.companyName}-${d.ym}-${d.id}`}
                activeOpacity={0.9}
                onPress={() => router.push(`/support-invoice-drafts/${d.id}` as any)}
              >
                <Card variant="elevated" style={styles.draftCard}>
                  <StyledText variant="subtitle" weight="semibold" numberOfLines={1}>
                    {d.companyName}
                  </StyledText>
                  <StyledText variant="caption" color="secondary" style={{ marginTop: 4 }}>
                    対象月: {d.ym}
                  </StyledText>
                  <StyledText variant="caption" color="secondary" numberOfLines={2} style={{ marginTop: 2 }}>
                    {d.title}
                  </StyledText>

                  <View style={styles.subtotalRow}>
                    <StyledText variant="caption" weight="semibold">小計</StyledText>
                    <StyledText variant="caption" weight="semibold">¥{(d.subtotal ?? 0).toLocaleString('ja-JP')}</StyledText>
                  </View>

                  {d.lines?.length ? (
                    <View style={{ marginTop: Spacing.sm, gap: 6 }}>
                      {d.lines.slice(0, 5).map((l, idx) => (
                        <View key={`${d.id}-line-${idx}`} style={styles.lineRow}>
                          <StyledText variant="caption" weight="semibold" numberOfLines={1} style={{ flex: 1 }}>
                            {l.label}
                          </StyledText>
                          <StyledText variant="caption" color="secondary">
                            {l.quantity} × ¥{l.unitPrice.toLocaleString('ja-JP')}
                          </StyledText>
                          <StyledText variant="caption" color="secondary">
                            ¥{l.amount.toLocaleString('ja-JP')}
                          </StyledText>
                        </View>
                      ))}
                    </View>
                  ) : (
                    <StyledText variant="body" color="secondary" style={{ marginTop: Spacing.sm }}>
                      明細がありません。
                    </StyledText>
                  )}

                  <View style={{ marginTop: Spacing.sm, flexDirection: 'row', gap: Spacing.sm }}>
                    <View style={{ flex: 1 }}>
                      <StyledButton
                        title="開く"
                        variant="primary"
                        onPress={() => router.push(`/support-invoice-drafts/${d.id}` as any)}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <StyledButton title="更新" variant="secondary" onPress={reload} />
                    </View>
                  </View>
                </Card>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.md,
    paddingBottom: Spacing['2xl'],
  },
  header: {
    marginBottom: Spacing.lg,
    paddingTop: Spacing.sm,
  },
  infoCard: {
    padding: Spacing.md,
  },
  emptyCard: {
    padding: Spacing.md,
  },
  draftCard: {
    padding: Spacing.md,
  },
  subtotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  lineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    paddingVertical: 2,
  },
})
