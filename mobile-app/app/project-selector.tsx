import React, { useEffect, useMemo, useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  TextInput,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { useRouter } from 'expo-router'

import { Colors, Spacing, Typography, BorderRadius } from '@/constants/Colors'
import { createProject, listProjects, setSelectedProject, StoredProject } from '@/lib/project-store'

export default function ProjectSelectorScreen() {
  const router = useRouter()

  const [projects, setProjects] = useState<StoredProject[]>([])
  const [loading, setLoading] = useState(true)

  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [memo, setMemo] = useState('')

  const canCreate = useMemo(() => name.trim().length > 0, [name])

  const reload = async () => {
    setLoading(true)
    try {
      const items = await listProjects()
      setProjects(items)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    reload()
  }, [])

  const backToMainChatSelected = (p: Pick<StoredProject, 'id' | 'name'>) => {
    router.replace({
      pathname: '/main-chat',
      params: { selectedProjectId: p.id, selectedProjectName: p.name },
    })
  }

  const backToMainChatCreated = (p: Pick<StoredProject, 'id' | 'name'>) => {
    router.replace({
      pathname: '/main-chat',
      params: { newProjectId: p.id, newProjectName: p.name },
    })
  }

  const handleSelect = async (p: StoredProject) => {
    await setSelectedProject({ id: p.id, name: p.name })
    backToMainChatSelected(p)
  }

  const handleCreate = async () => {
    const trimmed = name.trim()
    if (!trimmed) return

    try {
      const p = await createProject({ name: trimmed, address, memo })
      setName('')
      setAddress('')
      setMemo('')
      backToMainChatCreated(p)
    } catch (e) {
      console.error('Failed to create project', e)
      Alert.alert('エラー', '現場の作成に失敗しました')
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.replace('/main-chat')}
            accessibilityLabel="戻る"
          >
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>現場を選択 / 作成</Text>
            <Text style={styles.headerSubtitle}>チャットで使う現場を決めます</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView style={styles.body} contentContainerStyle={{ paddingBottom: 24 }}>
          <Text style={styles.sectionTitle}>現場一覧</Text>

          {loading ? (
            <Text style={styles.muted}>読み込み中…</Text>
          ) : projects.length === 0 ? (
            <Text style={styles.muted}>まだ現場がありません。下で作成してください。</Text>
          ) : (
            <View style={styles.list}>
              {projects.map(p => (
                <TouchableOpacity
                  key={p.id}
                  style={styles.projectItem}
                  onPress={() => handleSelect(p)}
                  accessibilityLabel={`現場を選択: ${p.name}`}
                >
                  <Text style={styles.projectName} numberOfLines={1}>
                    {p.name}
                  </Text>
                  <View style={styles.projectRow}>
                    <Text style={styles.projectMeta} numberOfLines={1}>
                      {p.address ? p.address : p.memo ? p.memo : '住所なし'}
                    </Text>
                    <TouchableOpacity
                      style={styles.projectExpensesButton}
                      onPress={() => router.push({ pathname: '/project-expenses', params: { projectId: p.id } })}
                      accessibilityLabel={`経費一覧: ${p.name}`}
                    >
                      <Text style={styles.projectExpensesButtonText}>経費</Text>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <View style={styles.divider} />

          <Text style={styles.sectionTitle}>新規作成</Text>
          <Text style={styles.muted}>必須は現場名だけです（住所/メモは任意）。</Text>

          <View style={styles.form}>
            <Text style={styles.label}>現場名（必須）</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="例）○○ビル新築工事"
              placeholderTextColor={Colors.dark.text.tertiary}
              maxLength={60}
            />

            <Text style={styles.label}>住所（任意）</Text>
            <TextInput
              style={styles.input}
              value={address}
              onChangeText={setAddress}
              placeholder="例）東京都新宿区…"
              placeholderTextColor={Colors.dark.text.tertiary}
              maxLength={120}
            />

            <Text style={styles.label}>メモ（任意）</Text>
            <TextInput
              style={[styles.input, styles.textarea]}
              value={memo}
              onChangeText={setMemo}
              placeholder="例）元請: ○○建設 / 鍵: 1234"
              placeholderTextColor={Colors.dark.text.tertiary}
              multiline
              maxLength={240}
            />

            <TouchableOpacity
              style={[styles.primaryButton, !canCreate && styles.primaryButtonDisabled]}
              disabled={!canCreate}
              onPress={handleCreate}
              accessibilityLabel="現場を作成"
            >
              <Text style={styles.primaryButtonText}>＋ 現場を作成してチャットへ</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
  sectionTitle: {
    color: Colors.dark.text.primary,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
    marginBottom: Spacing.xs,
  },
  muted: {
    color: Colors.dark.text.secondary,
    fontSize: Typography.sizes.sm,
    marginBottom: Spacing.sm,
  },
  list: {
    gap: Spacing.sm,
  },
  projectItem: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.dark.background.secondary,
    borderWidth: 1,
    borderColor: Colors.dark.border.primary,
  },
  projectName: {
    color: Colors.dark.text.primary,
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
  },
  projectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: Spacing.sm,
  },
  projectMeta: {
    flex: 1,
    color: Colors.dark.text.secondary,
    fontSize: Typography.sizes.xs,
  },
  projectExpensesButton: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.dark.background.tertiary,
    borderWidth: 1,
    borderColor: Colors.dark.border.primary,
  },
  projectExpensesButtonText: {
    color: Colors.dark.text.primary,
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.semibold,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.dark.border.primary,
    marginVertical: Spacing.lg,
  },
  form: {
    marginTop: Spacing.sm,
    gap: Spacing.sm,
  },
  label: {
    color: Colors.dark.text.secondary,
    fontSize: Typography.sizes.xs,
  },
  input: {
    backgroundColor: Colors.dark.background.secondary,
    borderWidth: 1,
    borderColor: Colors.dark.border.primary,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    color: Colors.dark.text.primary,
    fontSize: Typography.sizes.sm,
  },
  textarea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  primaryButton: {
    marginTop: Spacing.sm,
    backgroundColor: Colors.accent,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  primaryButtonDisabled: {
    opacity: 0.5,
  },
  primaryButtonText: {
    color: Colors.light.text.primary,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
  },
})
