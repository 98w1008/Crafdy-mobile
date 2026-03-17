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
import { Colors, Spacing, Typography, BorderRadius, Shadows } from '@/constants/Colors'

interface Message {
  id: string
  text: string
  sender: 'user' | 'ai'
  timestamp: Date
}

type SelectedProject = { id: string; name: string } | null

type EmptyQuickAction = {
  id: 'invoice' | 'estimate' | 'daily_report' | 'expense'
  label: string
  prompt: string
}

type IntentCategory = 'invoice' | 'estimate' | 'daily_report' | 'expense'

type ExpenseCollected = {
  receiptConfirmed: boolean
  whenWhereWhatConfirmed: boolean
  amountConfirmed: boolean
  paymentMethodConfirmed: boolean
}

const classifyIntentCategory = (text: string): IntentCategory | null => {
  const t = text.toLowerCase()

  // NOTE: 最小実装（キーワードベース）
  const hasAny = (keywords: string[]) => keywords.some(k => t.includes(k))

  if (hasAny(['請求', '請求書', 'インボイス', 'invoice'])) return 'invoice'
  if (hasAny(['見積', '見積もり', '見積り', '見積書', 'estimate'])) return 'estimate'
  if (hasAny(['日報', '作業報告', '報告書', 'daily report'])) return 'daily_report'
  if (hasAny(['経費', '領収書', 'レシート', '材料費', '外注費', 'expense'])) return 'expense'

  return null
}

const defaultExpenseCollected: ExpenseCollected = {
  receiptConfirmed: false,
  whenWhereWhatConfirmed: false,
  amountConfirmed: false,
  paymentMethodConfirmed: false,
}

const extractExpenseCollected = (text: string, prev: ExpenseCollected): ExpenseCollected => {
  const t = text.toLowerCase()

  const next: ExpenseCollected = { ...prev }

  // 領収書/写真: 「ある/ない」どちらでも、言及があれば確認済みにする
  if (
    /(領収|領収書|レシート|レシ|写真|画像|添付)/.test(t) &&
    /(ある|あり|ない|なし|無し|無い)/.test(t)
  ) {
    next.receiptConfirmed = true
  }

  // 金額（円/¥/数字）
  if (/(¥|円)/.test(t) && /\d/.test(t)) {
    next.amountConfirmed = true
  }

  // 支払方法
  if (/(現金|カード|クレカ|振込|銀行|paypay|ペイペイ)/.test(t)) {
    next.paymentMethodConfirmed = true
  }

  // いつ/どこで/何（雑でも、購入/支払い内容の記述があればOK扱い）
  if (/(で|にて|@|＠|購入|買|支払|払|店|コンビニ|ホームセンター)/.test(t) && t.length >= 6) {
    next.whenWhereWhatConfirmed = true
  }

  return next
}

const isExpenseComplete = (c: ExpenseCollected) =>
  c.receiptConfirmed && c.whenWhereWhatConfirmed && c.amountConfirmed && c.paymentMethodConfirmed

const buildFirstAiReply = (category: IntentCategory, selectedProjectName?: string) => {
  const projectNote = selectedProjectName
    ? `（現場: ${selectedProjectName}）`
    : '（現場: 未選択。必要なら右上の「現場」から選択/作成できます）'

  switch (category) {
    case 'invoice':
      return [
        'OK。請求書を作ります。まず次を教えてください。',
        '・宛名（取引先名）',
        '・請求対象（工事名 / 対象期間）',
        '・金額（内訳があれば内訳も）',
        '・支払期日',
        projectNote,
      ].join('\n')
    case 'estimate':
      return [
        'OK。見積を作ります。まず次を教えてください。',
        '・工事/作業内容（何をするか）',
        '・数量/単位（ざっくりでもOK）',
        '・希望納期（いつまで）',
        '・現場住所（分かる範囲で）',
        projectNote,
      ].join('\n')
    case 'daily_report':
      return [
        'OK。日報をまとめます。まず次を教えてください。',
        '・今日の日付（または「今日」でOK）',
        '・作業内容（箇条書きでOK）',
        '・人数/作業時間（分かる範囲で）',
        '・明日の予定（あれば）',
        projectNote,
      ].join('\n')
    case 'expense':
      return [
        'OK。経費を整理します。まず次を教えてください。',
        '・領収書/写真はありますか？（あれば添付）',
        '・いつ/どこで/何を買った（支払った）か',
        '・金額（税込）',
        '・支払方法（現金/カード/振込など）',
        projectNote,
      ].join('\n')
  }
}

const getIntentFields = (category: IntentCategory) => {
  switch (category) {
    case 'invoice':
      return ['宛名', '請求対象', '金額', '支払期日']
    case 'estimate':
      return ['工事/作業内容', '数量/単位', '希望納期', '現場住所']
    case 'daily_report':
      return ['日付', '作業内容', '人数/作業時間', '明日の予定']
    case 'expense':
      return ['領収書/写真', 'いつ/どこで/何', '金額', '支払方法']
  }
}

const getIntentQuestionCount = (category: IntentCategory) => {
  return getIntentFields(category).length
}

const buildProgressSummary = (
  category: IntentCategory,
  step: number,
  expenseCollected?: ExpenseCollected
) => {
  const fields = getIntentFields(category)

  // NOTE: 最小実装。
  // - 既存カテゴリは step を「ここまで回答済み（とみなす）」
  // - expense は抽出結果（expenseCollected）を優先
  const lines = fields.map((label, idx) => {
    let status: '取得済み' | '未確認'

    if (category === 'expense' && expenseCollected) {
      const flags = [
        expenseCollected.receiptConfirmed,
        expenseCollected.whenWhereWhatConfirmed,
        expenseCollected.amountConfirmed,
        expenseCollected.paymentMethodConfirmed,
      ]
      status = flags[idx] ? '取得済み' : '未確認'
    } else {
      status = idx < step ? '取得済み' : '未確認'
    }

    return `・${label}: ${status}`
  })

  return ['進捗:', ...lines].join('\n')
}

const buildFollowupAiReply = (
  category: IntentCategory,
  step: number,
  selectedProjectName?: string,
  expenseCollected?: ExpenseCollected
) => {
  const projectNote = selectedProjectName
    ? `（現場: ${selectedProjectName}）`
    : '（現場: 未選択。必要なら右上の「現場」から選択/作成できます）'

  const progress = buildProgressSummary(category, step, expenseCollected)

  // NOTE: 最小実装。stepに応じて「次に聞くべきこと」を1つずつ進める。
  switch (category) {
    case 'invoice': {
      const questions = [
        '宛名（取引先名）は？',
        '請求対象（工事名 / 対象期間）は？',
        '金額はいくらですか？（内訳があれば内訳も）',
        '支払期日はいつですか？',
      ]
      return `${progress}\n\n${questions[Math.min(step, questions.length - 1)]}\n${projectNote}`
    }
    case 'estimate': {
      const questions = [
        '工事/作業内容は？（何をするか）',
        '数量/単位は？（ざっくりでもOK）',
        '希望納期は？（いつまで）',
        '現場住所は分かりますか？（分かる範囲でOK）',
      ]
      return `${progress}\n\n${questions[Math.min(step, questions.length - 1)]}\n${projectNote}`
    }
    case 'daily_report': {
      const questions = [
        '日付は？（「今日」でもOK）',
        '作業内容を箇条書きで教えてください。',
        '人数/作業時間は？（分かる範囲でOK）',
        '明日の予定は？（あれば）',
      ]
      return `${progress}\n\n${questions[Math.min(step, questions.length - 1)]}\n${projectNote}`
    }
    case 'expense': {
      const questions = [
        '領収書/写真はありますか？（あれば添付してください）',
        'いつ/どこで/何を買った（支払った）か教えてください。',
        '金額（税込）は？',
        '支払方法は？（現金/カード/振込など）',
      ]
      return `${progress}\n\n${questions[Math.min(step, questions.length - 1)]}\n${projectNote}`
    }
  }
}

export default function SimpleChatScreen() {
  const router = useRouter()
  const [messages, setMessages] = useState<Message[]>([])
  const [inputText, setInputText] = useState('')
  const [selectedProject, setSelectedProject] = useState<SelectedProject>(null) // TODO: AsyncStorage/Contextと連携
  const [showProjectSelector, setShowProjectSelector] = useState(false)

  const [currentIntent, setCurrentIntent] = useState<IntentCategory | null>(null)
  const [intentStep, setIntentStep] = useState(0)
  const [expenseCollected, setExpenseCollected] = useState<ExpenseCollected>(defaultExpenseCollected)

  const { newProjectId, newProjectName } = useLocalSearchParams<{ newProjectId: string; newProjectName: string }>()

  const emptyQuickActions: EmptyQuickAction[] = [
    {
      id: 'invoice',
      label: '請求書',
      prompt: '請求書を作りたいです。必要な情報を聞いてください。',
    },
    {
      id: 'estimate',
      label: '見積',
      prompt: '見積を作りたいです。必要な情報を聞いてください。',
    },
    {
      id: 'daily_report',
      label: '日報',
      prompt: '日報を作りたいです。今日の作業内容を整理したいです。',
    },
    {
      id: 'expense',
      label: '経費',
      prompt: '経費（材料費/外注費含む）を整理したいです。まず何を出せばいいですか？',
    },
  ]

  // 新規作成された現場の自動選択
  useEffect(() => {
    if (newProjectId && newProjectName) {
      setSelectedProject({ id: newProjectId, name: newProjectName })

      // AIからの歓迎メッセージを追加
      const welcomeMessage: Message = {
        id: `welcome-${Date.now()}`,
        text: `[${newProjectName}] を作成しました。続けて依頼を書いてください（例：日報/見積/請求書）。`,
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
    const trimmed = inputText.trim()
    if (!trimmed) return

    const isFirstUserMessage = messages.every(m => m.sender !== 'user')

    // ユーザーメッセージを追加
    const userMessage: Message = {
      id: Date.now().toString(),
      text: trimmed,
      sender: 'user',
      timestamp: new Date(),
    }

    setMessages(prev => [...prev, userMessage])
    setInputText('')

    // 初回依頼（＋現場未選択）で、目的が言えているなら intent を保持して一段深く聞く
    if (!selectedProject && isFirstUserMessage) {
      const category = classifyIntentCategory(trimmed)
      if (category) {
        setCurrentIntent(category)
        setIntentStep(0)
        setExpenseCollected(defaultExpenseCollected)

        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: buildFirstAiReply(category),
          sender: 'ai',
          timestamp: new Date(),
        }
        setMessages(prev => [...prev, aiMessage])
        return
      }

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: '了解。現場は未選択のままでも進められます（必要なら右上の「現場」から選択/作成できます）。\n\nまずは何を作りたいですか？（例：請求書/見積/日報/経費整理）',
        sender: 'ai',
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, aiMessage])
      return
    }

    // intent がある場合、2通目以降は intent 前提で次に必要な情報を聞く
    if (currentIntent) {
      if (currentIntent === 'expense') {
        const nextCollected = extractExpenseCollected(trimmed, expenseCollected)
        setExpenseCollected(nextCollected)

        // 次に聞くべき「未確認」項目を探す（未確認が無ければ完了）
        const flags = [
          nextCollected.receiptConfirmed,
          nextCollected.whenWhereWhatConfirmed,
          nextCollected.amountConfirmed,
          nextCollected.paymentMethodConfirmed,
        ]
        const nextIndex = flags.findIndex(v => !v)

        if (nextIndex === -1) {
          const aiMessage: Message = {
            id: (Date.now() + 1).toString(),
            text: `${buildProgressSummary('expense', 0, nextCollected)}\n\nOK。必要な情報が揃いました。次は「用途（経費区分）」や「対象期間」も必要なら聞きます。`,
            sender: 'ai',
            timestamp: new Date(),
          }
          setMessages(prev => [...prev, aiMessage])
          setCurrentIntent(null)
          setIntentStep(0)
          setExpenseCollected(defaultExpenseCollected)
          return
        }

        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: buildFollowupAiReply('expense', nextIndex, selectedProject?.name, nextCollected),
          sender: 'ai',
          timestamp: new Date(),
        }
        setMessages(prev => [...prev, aiMessage])
        return
      }

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: buildFollowupAiReply(currentIntent, intentStep, selectedProject?.name),
        sender: 'ai',
        timestamp: new Date(),
      }

      const isLastQuestion = intentStep >= getIntentQuestionCount(currentIntent) - 1
      if (isLastQuestion) {
        setCurrentIntent(null)
        setIntentStep(0)
      } else {
        setIntentStep(prev => prev + 1)
      }

      setMessages(prev => [...prev, aiMessage])
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
  const isEmpty = messages.length === 0

  const handleProjectButton = () => {
    setShowProjectSelector(true)
  }

  const handleEmptyQuickAction = (action: EmptyQuickAction) => {
    setInputText(action.prompt)
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {/* ヘッダー（チャット主役 / 現場は補助） */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerTitle}>Crafdy</Text>
            <Text style={styles.headerSubtitle}>
              現場: {selectedProject ? selectedProject.name : '未選択'}
            </Text>
          </View>
          <TouchableOpacity style={styles.headerProjectButton} onPress={handleProjectButton}>
            <Text style={styles.headerProjectButtonText}>現場</Text>
          </TouchableOpacity>
        </View>

        {/* メッセージ一覧 */}
        <ScrollView style={styles.messagesContainer} contentContainerStyle={styles.messagesContent}>
          {isEmpty ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>今日は何を作りますか？</Text>
              <Text style={styles.emptyStateSubtext}>
                請求書・見積・日報を、チャットで作れます。{'\n'}
                材料費や経費の整理もOK。現場は後から選択できます。
              </Text>

              <View style={styles.emptyQuickActionsRow}>
                {emptyQuickActions.map(action => (
                  <TouchableOpacity
                    key={action.id}
                    style={styles.emptyQuickActionChip}
                    onPress={() => handleEmptyQuickAction(action)}
                  >
                    <Text style={styles.emptyQuickActionChipText}>{action.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ) : (
            messages.map(message => (
              <View
                key={message.id}
                style={[
                  styles.messageBubble,
                  message.sender === 'user' ? styles.userBubble : styles.aiBubble,
                ]}
              >
                <Text style={styles.messageText}>{message.text}</Text>
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
            placeholder={
              selectedProject
                ? '例）この現場の見積を作って。写真も貼れます'
                : '例）○○邸の請求書作って。現場はあとで選べます'
            }
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

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border.light,
    backgroundColor: Colors.dark.background.primary,
  },
  headerLeft: {
    flex: 1,
    gap: 2,
  },
  headerTitle: {
    color: Colors.dark.text.primary,
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
  },
  headerSubtitle: {
    color: Colors.dark.text.tertiary,
    fontSize: Typography.sizes.xs,
  },
  headerProjectButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.dark.border.medium,
    backgroundColor: Colors.dark.background.surface,
  },
  headerProjectButtonText: {
    color: Colors.dark.text.primary,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
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
  emptyQuickActionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  emptyQuickActionChip: {
    backgroundColor: Colors.dark.background.surface,
    borderWidth: 1,
    borderColor: Colors.dark.border.medium,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  emptyQuickActionChipText: {
    color: Colors.dark.text.primary,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
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
