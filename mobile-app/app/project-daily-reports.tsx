import React, { useEffect, useState } from 'react'
import { View, Text, ScrollView, SafeAreaView, TouchableOpacity, StyleSheet } from 'react-native'
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router'

import { Colors, Spacing, Typography, BorderRadius } from '@/constants/Colors'
import { listDailyReportsByProject, StoredDailyReport } from '@/lib/daily-report-store'
import { getProjectById } from '@/lib/project-store'

export default function ProjectDailyReportsScreen() {
  const router = useRouter()
  const { projectId } = useLocalSearchParams<{ projectId?: string }>()

  const [projectName, setProjectName] = useState<string>('')
  const [reports, setReports] = useState<StoredDailyReport[]>([])

  const reload = async () => {
    if (!projectId) return
    const p = await getProjectById(projectId)
    setProjectName(p?.name || '')
    const items = await listDailyReportsByProject(projectId)
    setReports(items)
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
          <Text style={styles.headerTitle}>日報一覧</Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            {projectName ? `現場: ${projectName}` : '現場: 未選択'}
          </Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.body} contentContainerStyle={{ paddingBottom: 24 }}>
        {!projectId ? (
          <Text style={styles.muted}>現場が指定されていません。現場一覧から開き直してください。</Text>
        ) : reports.length === 0 ? (
          <Text style={styles.muted}>まだ日報がありません。main-chat から登録してください。</Text>
        ) : (
          <View style={styles.list}>
            {reports.map(r => (
              <View key={r.id} style={styles.item}>
                <Text style={styles.itemTitle} numberOfLines={1}>
                  {r.date} / {r.work}
                </Text>
                <Text style={styles.itemMeta} numberOfLines={2}>
                  人数/時間: {r.workforceTime} / 明日: {r.nextPlan}
                </Text>
              </View>
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
