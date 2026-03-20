import React, { useEffect, useMemo, useState } from 'react'
import { View, Text, ScrollView, SafeAreaView, TouchableOpacity, StyleSheet } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'

import { Colors, Spacing, Typography, BorderRadius } from '@/constants/Colors'
import { getProjectById } from '@/lib/project-store'
import { listExpensesByProject, StoredExpense } from '@/lib/expense-store'
import { listDailyReportsByProject, StoredDailyReport } from '@/lib/daily-report-store'

type ProjectHistoryItem =
  | {
      id: string
      type: 'expense'
      date: string
      createdAt?: string
      expense: StoredExpense
    }
  | {
      id: string
      type: 'daily_report'
      date: string
      createdAt?: string
      report: StoredDailyReport
    }

const kindLabel = (k: StoredExpense['kind']) => {
  switch (k) {
    case 'receipt':
      return 'レシート'
    case 'material':
      return '材料'
    case 'subcontract':
      return '外注'
    default:
      return '経費'
  }
}

export default function ProjectHistoryScreen() {
  const router = useRouter()
  const { projectId } = useLocalSearchParams<{ projectId?: string }>()

  const [projectName, setProjectName] = useState<string>('')
  const [projectMissing, setProjectMissing] = useState(false)
  const [loading, setLoading] = useState(false)

  const [expenses, setExpenses] = useState<StoredExpense[]>([])
  const [reports, setReports] = useState<StoredDailyReport[]>([])

  useEffect(() => {
    ;(async () => {
      if (!projectId) return
      setLoading(true)
      setProjectMissing(false)
      try {
        const p = await getProjectById(projectId)
        if (!p) {
          setProjectName('')
          setProjectMissing(true)
          setExpenses([])
          setReports([])
          return
        }

        setProjectName(p.name)

        const [e, r] = await Promise.all([listExpensesByProject(projectId), listDailyReportsByProject(projectId)])
        setExpenses(e)
        setReports(r)
      } finally {
        setLoading(false)
      }
    })()
  }, [projectId])

  const toCreatedAtMs = (createdAt?: string) => {
    if (!createdAt) return 0
    const ms = Date.parse(createdAt)
    return Number.isFinite(ms) ? ms : 0
  }

  const items: ProjectHistoryItem[] = useMemo(() => {
    const out: ProjectHistoryItem[] = []

    for (const e of expenses) {
      out.push({
        id: `expense-${e.id}`,
        type: 'expense',
        date: e.date,
        createdAt: e.createdAt,
        expense: e,
      })
    }

    for (const r of reports) {
      out.push({
        id: `daily-${r.id}`,
        type: 'daily_report',
        date: r.date,
        createdAt: r.createdAt,
        report: r,
      })
    }

    out.sort((a, b) => {
      // NOTE: date は YYYY-MM-DD 前提。崩れても落ちない（順序が多少ズレるだけ）。
      const d = (b.date || '').localeCompare(a.date || '')
      if (d !== 0) return d

      // createdAt は Date.parse の安全比較（不正値は 0 扱い）
      return toCreatedAtMs(b.createdAt) - toCreatedAtMs(a.createdAt)
    })

    return out
  }, [expenses, reports])

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.replace('/project-selector')}
          accessibilityLabel="戻る"
        >
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>履歴</Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            {projectName ? `現場: ${projectName}` : '現場: 未選択'}
          </Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.body} contentContainerStyle={{ paddingBottom: 24 }}>
        {!projectId ? (
          <Text style={styles.muted}>現場が指定されていません。現場一覧から開き直してください。</Text>
        ) : loading ? (
          <Text style={styles.muted}>読み込み中…</Text>
        ) : projectMissing ? (
          <Text style={styles.muted}>現場が見つかりません。現場一覧から開き直してください。</Text>
        ) : items.length === 0 ? (
          <Text style={styles.muted}>まだ履歴がありません。main-chat から経費/日報を登録してください。</Text>
        ) : (
          <View style={styles.list}>
            {items.map(item => {
              if (item.type === 'expense') {
                const amount = Number.isFinite(item.expense.amount) ? item.expense.amount : 0
                const memo = item.expense.memo?.trim() || '（メモなし）'
                return (
                  <View key={item.id} style={styles.item}>
                    <View style={styles.itemTop}>
                      <Text style={styles.itemDate}>{item.date || '（日付なし）'}</Text>
                      <View style={[styles.badge, styles.badgeExpense]}>
                        <Text style={styles.badgeText}>経費</Text>
                      </View>
                    </View>
                    <Text style={styles.itemSummary} numberOfLines={1}>
                      {kindLabel(item.expense.kind)} ¥{amount.toLocaleString('ja-JP')}
                    </Text>
                    <Text style={styles.itemDetail} numberOfLines={3}>
                      {memo}
                    </Text>
                  </View>
                )
              }

              const work = item.report.work?.trim() || '（作業内容なし）'
              const workforceTime = item.report.workforceTime?.trim() || '（人数/時間なし）'
              const nextPlan = item.report.nextPlan?.trim() || '（明日の予定なし）'

              return (
                <View key={item.id} style={styles.item}>
                  <View style={styles.itemTop}>
                    <Text style={styles.itemDate}>{item.date || '（日付なし）'}</Text>
                    <View style={[styles.badge, styles.badgeDaily]}>
                      <Text style={styles.badgeText}>日報</Text>
                    </View>
                  </View>
                  <Text style={styles.itemSummary} numberOfLines={1}>
                    日報: {work}
                  </Text>
                  <Text style={styles.itemDetail} numberOfLines={3}>
                    人数/時間: {workforceTime} / 明日: {nextPlan}
                  </Text>
                </View>
              )
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border.primary,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.dark.background.secondary,
  },
  backButtonText: {
    color: Colors.dark.text.primary,
    fontSize: Typography.sizes.lg,
  },
  headerCenter: {
    flex: 1,
    marginLeft: Spacing.sm,
  },
  headerTitle: {
    color: Colors.dark.text.primary,
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
  },
  headerSubtitle: {
    color: Colors.dark.text.secondary,
    fontSize: Typography.sizes.xs,
    marginTop: 2,
  },
  body: {
    flex: 1,
    padding: Spacing.md,
  },
  muted: {
    color: Colors.dark.text.secondary,
    fontSize: Typography.sizes.sm,
  },
  list: {
    gap: Spacing.sm,
  },
  item: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.dark.background.secondary,
    borderWidth: 1,
    borderColor: Colors.dark.border.primary,
  },
  itemTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  itemDate: {
    color: Colors.dark.text.secondary,
    fontSize: Typography.sizes.xs,
  },
  badge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  badgeExpense: {
    backgroundColor: Colors.dark.background.tertiary,
  },
  badgeDaily: {
    backgroundColor: Colors.dark.background.tertiary,
  },
  badgeText: {
    color: Colors.dark.text.primary,
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.semibold,
  },
  itemSummary: {
    color: Colors.dark.text.primary,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
  },
  itemDetail: {
    color: Colors.dark.text.secondary,
    fontSize: Typography.sizes.xs,
    marginTop: 4,
  },
})
