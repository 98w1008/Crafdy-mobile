import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { CraftdyAPI } from '@/lib/api'
import { Colors, Spacing, Typography, BorderRadius, Shadows } from '@/constants/Colors'

type QuickAction = 'select_project' | 'create_project'

interface Message {
  id: string
  text: string
  sender: 'user' | 'ai'
  timestamp: Date
  actions?: QuickAction[]
  isInitial?: boolean // 初回メッセージ判定用
}

type SelectedProject = { id: string; name: string } | null

export default function SimpleChatScreen() {
  const router = useRouter()
  const [messages, setMessages] = useState<Message[]>([{
    id: 'init-ai',
    text: '現場を選ぶか作成してください。',
    sender: 'ai',
    timestamp: new Date(),
    actions: ['select_project', 'create_project'],
    isInitial: true,
  }])
  const [inputText, setInputText] = useState('')
  const [selectedProject, setSelectedProject] = useState<SelectedProject>(null) // TODO: AsyncStorage/Contextと連携
  const [showProjectSelector, setShowProjectSelector] = useState(false)

  const { newProjectId, newProjectName } = useLocalSearchParams<{ newProjectId: string; newProjectName: string }>()

  // プロジェクト存在確認
  useEffect(() => {
    CraftdyAPI.hasProjects().then(() => {
      // 現場がなくてもチャットは利用可能。結果はモーダル誘導の判断材料にのみ使う予定。
    })
  }, [])

  // 新規作成された現場の自動選択
  useEffect(() => {
    if (newProjectId && newProjectName) {
      setSelectedProject({ id: newProjectId, name: newProjectName })

      // AIからの歓迎メッセージを追加
      const welcomeMessage: Message = {
        id: `welcome-${Date.now()}`,
        text: `[${newProjectName}] を作成しました。この現場の状況や作業内容をメモしてください。`,
        sender: 'ai',
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, welcomeMessage])
    }
  }, [newProjectId, newProjectName])

  // ダミーのプロジェクトリスト（TODO: 実際のAPIから取得）
  const dummyProjects = [
    { id: '1', name: '○○ビル新築工事', location: '東京都' },
    { id: '2', name: '△△アパート改修', location: '神奈川県' },
  ]

  const handleSelectProject = (projectId: string, projectName: string) => {
    setSelectedProject({ id: projectId, name: projectName })
    setShowProjectSelector(false)
    // TODO: AsyncStorageに保存
  }

  const handleCreateNewProject = () => {
    setShowProjectSelector(false)
    router.push('/project-create')
  }

  const handleSend = () => {
    if (!inputText.trim()) return

    // ユーザーメッセージを追加
    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText.trim(),
      sender: 'user',
      timestamp: new Date(),
    }

    setMessages(prev => [...prev, userMessage])
    setInputText('')

    if (!selectedProject) {
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: 'まずは現場を選ぶか作成してください。どちらにしますか？',
        sender: 'ai',
        timestamp: new Date(),
        actions: ['select_project', 'create_project'],
      }
      setMessages(prev => [...prev, aiMessage])
      setShowProjectSelector(true)
      return
    }

    // ダミーAI応答
    setTimeout(() => {
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: `[${selectedProject.name}] のメモを受け取りました。この内容を基に見積や請求の作成をサポートします。`,
        sender: 'ai',
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, aiMessage])
    }, 500)
  }

  const canSend = !!inputText.trim()

  const handleQuickAction = (action: QuickAction) => {
    if (action === 'select_project') {
      setShowProjectSelector(true)
      return
    }
    if (action === 'create_project') {
      router.push('/project-create')
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >


        {/* メッセージ一覧 */}
        <ScrollView style={styles.messagesContainer} contentContainerStyle={styles.messagesContent}>
          {messages.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>メモを入力してください</Text>
              <Text style={styles.emptyStateSubtext}>
                現場の状況や作業内容を自由に書いてください。{'\n'}
                AIが内容を整理し、見積・請求作成をサポートします。
              </Text>
            </View>
          ) : (
            messages.map(message => (
              <View
                key={message.id}
                style={[
                  styles.messageBubble,
                  message.sender === 'user' ? styles.userBubble : styles.aiBubble,
                  message.isInitial && styles.initialAiBubble,
                ]}
              >
                {message.isInitial ? (
                  // 初回メッセージのリッチ表示
                  <View>
                    <Text style={styles.cardTitle}>現場を選択してください</Text>
                    <Text style={styles.cardBody}>
                      現場の状況や作業内容を記録するには、まず対象の現場を選んでください。
                    </Text>
                  </View>
                ) : (
                  <Text style={styles.messageText}>{message.text}</Text>
                )}

                {message.actions ? (
                  <View style={styles.actionChipsRow}>
                    {message.actions.map(action => (
                      <TouchableOpacity
                        key={`${message.id}-${action}`}
                        style={[
                          styles.actionChip,
                          action === 'create_project' ? styles.actionChipPrimary : styles.actionChipSecondary
                        ]}
                        onPress={() => handleQuickAction(action)}
                      >
                        <Text style={[
                          styles.actionChipText,
                          action === 'create_project' ? styles.actionChipTextPrimary : styles.actionChipTextSecondary
                        ]}>
                          {action === 'select_project' ? '現場を選ぶ' : '＋ 現場を作成'}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                ) : null}
                <Text style={styles.messageTime}>
                  {message.timestamp.toLocaleTimeString('ja-JP', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </Text>
              </View>
            ))
          )}
        </ScrollView>

        {/* 入力欄（常に有効） */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder={selectedProject ? "メモを入力..." : "現場未選択のまま送信するとAIが誘導します"}
            placeholderTextColor={Colors.dark.text.tertiary}
            multiline
            maxLength={1000}
          />
          <TouchableOpacity
            style={[styles.sendButton, !canSend && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={!canSend}
          >
            <Text style={styles.sendButtonText}>送信</Text>
          </TouchableOpacity>
        </View>

        {/* 現場選択モーダル */}
        <Modal
          visible={showProjectSelector}
          transparent
          animationType="slide"
          onRequestClose={() => setShowProjectSelector(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>現場を選択</Text>
                <TouchableOpacity onPress={() => setShowProjectSelector(false)}>
                  <Text style={styles.modalClose}>×</Text>
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.projectList}>
                {dummyProjects.map(project => (
                  <TouchableOpacity
                    key={project.id}
                    style={styles.projectItem}
                    onPress={() => handleSelectProject(project.id, project.name)}
                  >
                    <Text style={styles.projectName}>{project.name}</Text>
                    <Text style={styles.projectLocation}>{project.location}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <TouchableOpacity
                style={styles.createProjectButton}
                onPress={handleCreateNewProject}
              >
                <Text style={styles.createProjectButtonText}>＋ 現場を作成</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.dark.background.primary,
    gap: Spacing.sm,
  },
  loadingText: {
    color: Colors.dark.text.secondary,
    fontSize: Typography.sizes.sm,
  },
  noProjectsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
    gap: Spacing.sm,
    marginTop: 100,
  },
  noProjectsTitle: {
    color: Colors.dark.text.primary,
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.semibold,
  },
  noProjectsDesc: {
    color: Colors.dark.text.secondary,
    fontSize: Typography.sizes.sm,
    textAlign: 'center',
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: Spacing.xl,
    flexGrow: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    marginTop: 60,
  },
  emptyStateText: {
    color: Colors.dark.text.primary,
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
    marginBottom: Spacing.md,
  },
  emptyStateSubtext: {
    color: Colors.dark.text.secondary,
    fontSize: Typography.sizes.xs,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Spacing.lg,
  },
  messageBubble: {
    maxWidth: '88%',
    padding: Spacing.lg,
    borderRadius: BorderRadius.xl,
    marginBottom: Spacing.xl,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: Colors.accent.DEFAULT,
    borderBottomRightRadius: BorderRadius.sm,
  },
  aiBubble: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.dark.background.surface,
    borderWidth: 1,
    borderColor: Colors.dark.border.light,
    borderBottomLeftRadius: BorderRadius.sm,
  },
  initialAiBubble: {
    width: '100%',
    maxWidth: '100%',
    backgroundColor: Colors.dark.background.surface,
    borderWidth: 1,
    borderColor: Colors.dark.border.medium,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    ...Shadows.lg,
  },
  cardTitle: {
    color: Colors.dark.text.primary,
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.bold,
    marginBottom: Spacing.md,
    letterSpacing: 0.5,
  },
  cardBody: {
    color: Colors.dark.text.secondary,
    fontSize: Typography.sizes.sm,
    lineHeight: 22,
    marginBottom: Spacing.xl,
  },
  messageText: {
    color: Colors.dark.text.primary,
    fontSize: Typography.sizes.base,
    lineHeight: 24,
    marginBottom: Spacing.xs,
  },
  actionChipsRow: {
    flexDirection: 'column',
    gap: Spacing.md,
    marginTop: Spacing.sm,
  },
  actionChip: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    minHeight: 52,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  actionChipPrimary: {
    backgroundColor: Colors.accent.DEFAULT,
    shadowColor: Colors.accent.DEFAULT,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  actionChipSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: Colors.dark.border.medium,
  },
  actionChipText: {
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.bold,
    letterSpacing: 0.5,
  },
  actionChipTextPrimary: {
    color: '#FFFFFF',
  },
  actionChipTextSecondary: {
    color: Colors.dark.text.primary,
  },
  messageTime: {
    color: Colors.dark.text.tertiary,
    fontSize: Typography.sizes.xs,
    alignSelf: 'flex-end',
    marginTop: Spacing.xs,
    lineHeight: Typography.lineHeights.tight * Typography.sizes.xs,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.dark.border.light,
    backgroundColor: Colors.dark.background.primary,
    gap: Spacing.sm,
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    backgroundColor: Colors.dark.background.surface,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    color: Colors.dark.text.primary,
    fontSize: Typography.sizes.base,
    lineHeight: Typography.lineHeights.normal * Typography.sizes.base,
    minHeight: 56,
    maxHeight: 140,
    borderWidth: 1.5,
    borderColor: Colors.dark.border.medium,
  },
  sendButton: {
    backgroundColor: Colors.accent.DEFAULT,
    borderRadius: BorderRadius.full,
    width: 56,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.md,
  },
  sendButtonDisabled: {
    backgroundColor: Colors.dark.interactive.disabled,
    opacity: 0.5,
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.bold,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.dark.background.elevated,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xl,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border.light,
  },
  modalTitle: {
    color: Colors.dark.text.primary,
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.semibold,
  },
  modalClose: {
    color: Colors.dark.text.tertiary,
    fontSize: 32,
    fontWeight: '300',
    lineHeight: 32,
  },
  projectList: {
    padding: Spacing.md,
  },
  projectItem: {
    backgroundColor: Colors.dark.background.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.dark.border.light,
  },
  projectName: {
    color: Colors.dark.text.primary,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.semibold,
    marginBottom: Spacing.xs,
  },
  projectLocation: {
    color: Colors.dark.text.secondary,
    fontSize: Typography.sizes.sm,
  },
  createProjectButton: {
    backgroundColor: Colors.accent.DEFAULT,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    marginHorizontal: Spacing.md,
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  createProjectButtonText: {
    color: '#FFFFFF',
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.semibold,
  },
})
