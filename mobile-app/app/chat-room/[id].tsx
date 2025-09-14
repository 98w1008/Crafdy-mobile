import React, { useState, useEffect, useRef } from 'react'
import {
  View,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Alert,
  SafeAreaView,
  ScrollView,
} from 'react-native'
import { useLocalSearchParams, router } from 'expo-router'
import { useAuth, useRole } from '@/contexts/AuthContext'
import { Colors, Spacing, Typography, BorderRadius, Shadows } from '@/constants/Colors'
import { StyledText, StyledButton, Card } from '@/components/ui'
import * as Haptics from 'expo-haptics'

interface ChatMessage {
  id: string
  content: string
  role: 'user' | 'assistant' | 'system'
  timestamp: string
  user_id?: string
  type?: 'daily_report' | 'consultation' | 'material_ocr' | 'estimate' | 'notice'
  metadata?: {
    work_date?: string
    work_content?: string
    start_time?: string
    end_time?: string
    worker_count?: number
    worker_names?: string[]
    progress_percentage?: number
    photos?: string[]
    materials?: any[]
  }
}

interface QuickAction {
  id: string
  title: string
  icon: string
  color: string
  action: () => void
}

export default function ChatRoomScreen() {
  const { user } = useAuth()
  const userRole = useRole()
  const params = useLocalSearchParams()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputText, setInputText] = useState('')
  const [loading, setLoading] = useState(false)
  const [isReportMode, setIsReportMode] = useState(false)
  const [reportData, setReportData] = useState({
    work_date: '',
    start_time: '',
    end_time: '',
    work_content: '',
    worker_count: 0,
    worker_names: [] as string[],
    materials: [] as string[],
    weather: '',
    progress_notes: ''
  })
  const [reportStep, setReportStep] = useState<'date' | 'start_time' | 'end_time' | 'content' | 'workers' | 'materials' | 'weather' | 'progress' | 'complete'>('date')
  const flatListRef = useRef<FlatList>(null)

  const projectId = params.id as string
  const projectName = params.name as string || '現場チャット'

  // 建設現場専用クイックアクション
  const quickActions: QuickAction[] = [
    {
      id: 'daily_report',
      title: '日報入力',
      icon: '',
      color: Colors.primary,
      action: () => startDailyReport(),
    },
    {
      id: 'progress_check',
      title: '進捗確認',
      icon: '',
      color: Colors.info,
      action: () => checkProgress(),
    },
    {
      id: 'material_ocr',
      title: '材料OCR',
      icon: '',
      color: Colors.warning,
      action: () => scanMaterial(),
    },
    {
      id: 'ai_estimate',
      title: 'AI見積',
      icon: '',
      color: Colors.success,
      action: () => requestEstimate(),
    },
  ]

  useEffect(() => {
    loadChatHistory()
  }, [projectId])

  const loadChatHistory = async () => {
    try {
      // 初期メッセージ（システムからの挨拶）
      const initialMessages: ChatMessage[] = [
        {
          id: '1',
          content: `${projectName}のChatRoomです。\n\n日報入力、進捗確認、材料管理など、現場のあらゆる業務をチャットで完結できます。\n\n何かお手伝いできることはありますか？`,
          role: 'assistant',
          timestamp: new Date().toISOString(),
          type: 'notice'
        }
      ]
      
      setMessages(initialMessages)
    } catch (error) {
      console.error('チャット履歴読み込みエラー:', error)
    }
  }

  // 日報入力開始
  const startDailyReport = () => {
    setIsReportMode(true)
    setReportStep('date')
    setReportData({
      work_date: '',
      start_time: '',
      end_time: '',
      work_content: '',
      worker_count: 0,
      worker_names: [],
      materials: [],
      weather: '',
      progress_notes: ''
    })
    
    const reportStartMessage: ChatMessage = {
      id: Date.now().toString(),
      content: '日報入力を開始します\n\n建設現場の日報作成をサポートいたします。\n\nまず、作業日を教えてください。\n\n• 今日 → 「今日」または「本日」\n• 昨日 → 「昨日」\n• 特定の日 → 「3月15日」など',
      role: 'assistant',
      timestamp: new Date().toISOString(),
      type: 'daily_report'
    }

    setMessages(prev => [...prev, reportStartMessage])
    
    // ハプティックフィードバック
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    
    setTimeout(() => {
      flatListRef.current?.scrollToEnd()
    }, 100)
  }

  const checkProgress = () => {
    const progressMessage: ChatMessage = {
      id: Date.now().toString(),
      content: '現在の進捗状況をお調べします...\n\n進捗サマリー\n• 全体進捗: 65%\n• 今週の作業: 基礎工事完了\n• 次週予定: 鉄骨建て方\n• 遅延リスク: なし\n\n詳細が必要でしたらお申し付けください。',
      role: 'assistant',
      timestamp: new Date().toISOString(),
      type: 'consultation'
    }

    setMessages(prev => [...prev, progressMessage])
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
  }

  const scanMaterial = () => {
    Alert.alert(
      '材料OCR機能',
      'カメラを起動して材料の写真を撮影しますか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        { text: 'カメラ起動', onPress: () => console.log('Camera launch') }
      ]
    )
  }

  const requestEstimate = () => {
    const estimateMessage: ChatMessage = {
      id: Date.now().toString(),
      content: 'AI見積機能を利用しますね。\n\n見積対象を選択してください：\n• 追加工事\n• 材料費\n• 人件費\n• その他\n\nどちらをご希望ですか？',
      role: 'assistant',
      timestamp: new Date().toISOString(),
      type: 'estimate'
    }

    setMessages(prev => [...prev, estimateMessage])
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
  }

  const sendMessage = async (messageText?: string) => {
    const textToSend = messageText || inputText.trim()
    if (!textToSend || loading) return

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      content: textToSend,
      role: 'user',
      timestamp: new Date().toISOString(),
      type: isReportMode ? 'daily_report' : 'consultation'
    }

    setMessages(prev => [...prev, userMessage])
    setInputText('')
    setLoading(true)

    try {
      // 日報モードの処理
      if (isReportMode) {
        setTimeout(() => {
          const reportResponse = generateReportResponse(textToSend)
          setMessages(prev => [...prev, reportResponse])
          setLoading(false)
          
          setTimeout(() => {
            flatListRef.current?.scrollToEnd()
          }, 100)
        }, 1000)
      } else {
        // 通常の相談モード
        setTimeout(() => {
          const aiResponse = generateConsultationResponse(textToSend)
          setMessages(prev => [...prev, aiResponse])
          setLoading(false)
          
          setTimeout(() => {
            flatListRef.current?.scrollToEnd()
          }, 100)
        }, 1500)
      }
    } catch (error) {
      console.error('メッセージ送信エラー:', error)
      Alert.alert('エラー', 'メッセージの送信に失敗しました')
      setLoading(false)
    }
  }

  // 🏗️ 日報専用AI応答生成
  const generateReportResponse = (userInput: string): ChatMessage => {
    const lowerInput = userInput.toLowerCase()
    let nextStep = reportStep
    let responseContent = ''
    
    // 作業日の処理
    if (reportStep === 'date') {
      if (lowerInput.includes('今日') || lowerInput.includes('本日')) {
        setReportData(prev => ({ ...prev, work_date: new Date().toLocaleDateString('ja-JP') }))
        nextStep = 'start_time'
        responseContent = '本日の日報ですね。承知いたしました。\n\n**作業開始時間**を教えてください。\n（例：8:00、8時30分、午前8時）'
      } else if (lowerInput.includes('昨日')) {
        const yesterday = new Date()
        yesterday.setDate(yesterday.getDate() - 1)
        setReportData(prev => ({ ...prev, work_date: yesterday.toLocaleDateString('ja-JP') }))
        nextStep = 'start_time'
        responseContent = '昨日の日報ですね。承知いたしました。\n\n**作業開始時間**を教えてください。\n（例：8:00、8時30分、午前8時）'
      } else {
        setReportData(prev => ({ ...prev, work_date: userInput }))
        nextStep = 'start_time'
        responseContent = `${userInput}の日報ですね。\n\n**作業開始時間**を教えてください。\n（例：8:00、8時30分、午前8時）`
      }
    }
    // 開始時間の処理
    else if (reportStep === 'start_time') {
      setReportData(prev => ({ ...prev, start_time: userInput }))
      nextStep = 'end_time'
      responseContent = `開始時間「${userInput}」を記録しました。\n\n**作業終了時間**を教えてください。\n（例：17:00、5時30分、午後5時）`
    }
    // 終了時間の処理
    else if (reportStep === 'end_time') {
      setReportData(prev => ({ ...prev, end_time: userInput }))
      nextStep = 'content'
      responseContent = `終了時間「${userInput}」を記録しました。\n\n**本日の作業内容**を詳しく教えてください。\n（例：基礎工事、鉄骨建て方、外壁工事など）`
    }
    // 作業内容の処理
    else if (reportStep === 'content') {
      setReportData(prev => ({ ...prev, work_content: userInput }))
      nextStep = 'workers'
      responseContent = `作業内容を記録しました。\n\n**作業人数と職人名**を教えてください。\n（例：3名、田中・佐藤・山田）\n（例：5人、チーム長田中、作業員4名）`
    }
    // 作業者情報の処理
    else if (reportStep === 'workers') {
      const workerCount = userInput.match(/(\d+)[名人]/)?.[1] || '0'
      const names = userInput.split(/[、・,]/).filter(name => 
        !name.match(/(\d+)[名人]/) && name.trim().length > 0
      )
      
      setReportData(prev => ({ 
        ...prev, 
        worker_count: parseInt(workerCount),
        worker_names: names
      }))
      nextStep = 'materials'
      responseContent = `作業者情報を記録しました。\n・人数：${workerCount}名\n・職人：${names.join('、')}\n\n**使用した材料・道具**があれば教えてください。\n（例：セメント10袋、鉄筋φ16、クレーン使用）\n\n※ない場合は「なし」と入力してください。`
    }
    // 材料情報の処理
    else if (reportStep === 'materials') {
      if (lowerInput.includes('なし') || lowerInput.includes('特になし')) {
        setReportData(prev => ({ ...prev, materials: [] }))
      } else {
        const materials = userInput.split(/[、・,]/).filter(item => item.trim().length > 0)
        setReportData(prev => ({ ...prev, materials }))
      }
      nextStep = 'weather'
      responseContent = `材料情報を記録しました。\n\n**天候**を教えてください。\n（例：晴れ、曇り、雨、雪）`
    }
    // 天候の処理
    else if (reportStep === 'weather') {
      setReportData(prev => ({ ...prev, weather: userInput }))
      nextStep = 'progress'
      responseContent = `天候「${userInput}」を記録しました。\n\n**進捗状況・特記事項**があれば教えてください。\n（例：予定通り進行、材料不足で遅延、安全確認完了）\n\n※ない場合は「なし」と入力してください。`
    }
    // 進捗・特記事項の処理
    else if (reportStep === 'progress') {
      setReportData(prev => ({ ...prev, progress_notes: userInput }))
      nextStep = 'complete'
      
      responseContent = `日報内容確認\n\n` +
        `作業日：${reportData.work_date}\n` +
        `作業時間：${reportData.start_time} ～ ${reportData.end_time}\n` +
        `作業内容：${reportData.work_content}\n` +
        `作業者：${reportData.worker_count}名（${reportData.worker_names.join('、')}）\n` +
        `使用材料：${reportData.materials.length > 0 ? reportData.materials.join('、') : 'なし'}\n` +
        `天候：${reportData.weather}\n` +
        `進捗・特記：${userInput}\n\n` +
        `この内容で日報を保存しますか？\n「保存」と入力するか、修正したい項目があれば教えてください。`
    }
    // 完了処理
    else if (reportStep === 'complete') {
      if (lowerInput.includes('保存') || lowerInput.includes('ok') || lowerInput.includes('はい')) {
        setIsReportMode(false)
        setReportStep('date')
        setReportData({
          work_date: '',
          start_time: '',
          end_time: '',
          work_content: '',
          worker_count: 0,
          worker_names: [],
          materials: [],
          weather: '',
          progress_notes: ''
        })
        
        responseContent = `日報を保存しました！\n\n今日もお疲れさまでした。\n安全に作業を終了してください。\n\n何か他にお手伝いできることがあれば、いつでもお声かけください。`
      } else {
        responseContent = `修正内容を確認しました。\n\nどの項目を修正しますか？\n• 作業日\n• 作業時間\n• 作業内容\n• 作業者\n• 材料\n• 天候\n• 進捗\n\n修正したい項目名を教えてください。`
      }
    }
    
    setReportStep(nextStep)
    
    return {
      id: (Date.now() + 1).toString(),
      content: responseContent,
      role: 'assistant',
      timestamp: new Date().toISOString(),
      type: 'daily_report',
      metadata: {
        ...reportData,
        step: nextStep
      }
    }
  }

  // 通常相談用AI応答生成
  const generateConsultationResponse = (userInput: string): ChatMessage => {
    const responses = [
      '承知いたしました。現場の状況を確認して、最適な解決策をご提案いたします。',
      '安全第一で作業を進めていきましょう。詳細について確認させてください。',
      'その件について、過去の事例と照らし合わせてアドバイスいたします。'
    ]
    
    return {
      id: (Date.now() + 1).toString(),
      content: responses[Math.floor(Math.random() * responses.length)],
      role: 'assistant',
      timestamp: new Date().toISOString(),
      type: 'consultation'
    }
  }

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isUser = item.role === 'user'
    const isSystem = item.role === 'system'
    
    return (
      <View style={[
        styles.messageContainer,
        isUser ? styles.userMessageContainer : styles.aiMessageContainer
      ]}>
        {!isUser && !isSystem && (
          <View style={styles.aiAvatar}>
            <StyledText variant="body" color="onPrimary">AI</StyledText>
          </View>
        )}
        
        <View style={[
          styles.messageBubble,
          isUser ? styles.userBubble : isSystem ? styles.systemBubble : styles.aiBubble
        ]}>
          <StyledText 
            variant="body" 
            color={isUser ? "onPrimary" : "text"}
            style={styles.messageText}
          >
            {item.content}
          </StyledText>
          
          {/* タイプ別のバッジ表示 */}
          {item.type && item.type !== 'notice' && (
            <View style={styles.typeBadge}>
              <StyledText variant="caption" color="tertiary">
                {item.type === 'daily_report' ? '日報' : 
                 item.type === 'consultation' ? '相談' :
                 item.type === 'material_ocr' ? '材料' : 
                 item.type === 'estimate' ? '見積' : ''}
              </StyledText>
            </View>
          )}
        </View>
        
        <StyledText variant="caption" color="tertiary" style={styles.timestamp}>
          {new Date(item.timestamp).toLocaleTimeString('ja-JP', {
            hour: '2-digit',
            minute: '2-digit'
          })}
        </StyledText>
      </View>
    )
  }

  const renderQuickActions = () => (
    <Card variant="elevated" style={styles.quickActionsCard}>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.quickActionsContainer}
      >
        {quickActions.map((action) => (
          <TouchableOpacity
            key={action.id}
            style={[styles.quickActionButton, { borderColor: action.color }]}
            onPress={action.action}
            activeOpacity={0.7}
          >
            <StyledText variant="title" style={{ fontSize: 20 }}>
              {action.icon}
            </StyledText>
            <StyledText variant="caption" weight="medium" align="center" numberOfLines={1}>
              {action.title}
            </StyledText>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </Card>
  )

  const renderTypingIndicator = () => {
    if (!loading) return null
    
    return (
      <View style={[styles.messageContainer, styles.aiMessageContainer]}>
        <View style={styles.aiAvatar}>
          <StyledText variant="body" color="onPrimary">AI</StyledText>
        </View>
        <View style={[styles.messageBubble, styles.aiBubble]}>
          <StyledText variant="body" color="tertiary" style={{ fontStyle: 'italic' }}>
            入力中...
          </StyledText>
        </View>
      </View>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* ヘッダー */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <StyledText variant="title" color="primary">←</StyledText>
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <StyledText variant="title" weight="semibold">
            {projectName}
          </StyledText>
          <StyledText variant="caption" color="secondary">
            現場ChatRoom
          </StyledText>
        </View>
      </View>

      {/* クイックアクション */}
      {renderQuickActions()}

      {/* メッセージ一覧 */}
      <KeyboardAvoidingView 
        style={styles.chatContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          style={styles.messagesList}
          contentContainerStyle={styles.messagesContent}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
          ListFooterComponent={renderTypingIndicator}
          showsVerticalScrollIndicator={false}
        />

        {/* 入力エリア */}
        <View style={styles.inputContainer}>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.textInput}
              placeholder={isReportMode ? "日報内容を入力..." : "メッセージを入力..."}
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={1000}
              placeholderTextColor={Colors.textTertiary}
            />
            <TouchableOpacity
              style={[
                styles.sendButton,
                (!inputText.trim() || loading) && styles.sendButtonDisabled
              ]}
              onPress={() => sendMessage()}
              disabled={!inputText.trim() || loading}
            >
              <StyledText variant="body" color="onPrimary" weight="semibold">
                {loading ? '...' : '送信'}
              </StyledText>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  backButton: {
    marginRight: Spacing.md,
  },
  headerContent: {
    flex: 1,
  },
  quickActionsCard: {
    margin: Spacing.md,
    marginBottom: Spacing.sm,
  },
  quickActionsContainer: {
    paddingHorizontal: Spacing.sm,
    gap: Spacing.sm,
  },
  quickActionButton: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.md,
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.surface,
    minWidth: 80,
    gap: Spacing.xs,
  },
  chatContainer: {
    flex: 1,
  },
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    paddingVertical: Spacing.md,
  },
  messageContainer: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  userMessageContainer: {
    justifyContent: 'flex-end',
  },
  aiMessageContainer: {
    justifyContent: 'flex-start',
  },
  aiAvatar: {
    width: 32,
    height: 32,
    backgroundColor: Colors.primary,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  messageBubble: {
    maxWidth: '75%',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.xs,
  },
  userBubble: {
    backgroundColor: Colors.primary,
    marginLeft: Spacing.xl,
  },
  aiBubble: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    ...Shadows.sm,
  },
  systemBubble: {
    backgroundColor: Colors.infoLight,
    borderWidth: 1,
    borderColor: Colors.info,
  },
  messageText: {
    lineHeight: 20,
  },
  typeBadge: {
    marginTop: Spacing.xs,
    alignSelf: 'flex-start',
  },
  timestamp: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.xs,
  },
  inputContainer: {
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.sm,
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    maxHeight: 100,
    fontSize: Typography.base,
    backgroundColor: Colors.surface,
    color: Colors.text,
  },
  sendButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    minWidth: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: Colors.textTertiary,
  },
})