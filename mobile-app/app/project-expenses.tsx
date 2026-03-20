import React, { useEffect, useState } from 'react'
import { View, Text, ScrollView, SafeAreaView, TouchableOpacity, StyleSheet } from 'react-native'
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router'

import { Colors, Spacing, Typography, BorderRadius } from '@/constants/Colors'
import { listExpensesByProject, StoredExpense } from '@/lib/expense-store'
import { getProjectById } from '@/lib/project-store'

export default function ProjectExpensesScreen() {
  const router = useRouter()
  const { projectId } = useLocalSearchParams<{ projectId?: string }>()

  const [projectName, setProjectName] = useState<string>('')
  const [expenses, setExpenses] = useState<StoredExpense[]>([])

  const reload = async () => {
    if (!projectId) return
    const p = await getProjectById(projectId)
    setProjectName(p?.name || '')
    const items = await listExpensesByProject(projectId)
    setExpenses(items)
  }

  useEffect(() => {
    reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId])

  useFocusEffect(
    React.useCallback(() => {
      reload()
    }, [projectId])
  )

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
          <Text style={styles.headerTitle}>経費一覧</Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            {projectName ? `現場: ${projectName}` : '現場: 未選択'}
          </Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.body} contentContainerStyle={{ paddingBottom: 24 }}>
        {!projectId ? (
          <Text style={styles.muted}>現場が指定されていません。現場一覧から開き直してください。</Text>
        ) : expenses.length === 0 ? (
          <Text style={styles.muted}>まだ経費がありません。main-chat から登録してください。</Text>
        ) : (
          <View style={styles.list}>
            {expenses.map(e => (
              <View key={e.id} style={styles.item}>
                <Text style={styles.itemTitle} numberOfLines={1}>
                  {e.date} / {kindLabel(e.kind)} / ¥{e.amount.toLocaleString('ja-JP')}
                </Text>
                <Text style={styles.itemMeta} numberOfLines={2}>
                  {e.memo || '（メモなし）'}
                </Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
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
  itemTitle: {
    color: Colors.dark.text.primary,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
  },
  itemMeta: {
    color: Colors.dark.text.secondary,
    fontSize: Typography.sizes.xs,
    marginTop: 4,
  },
})
