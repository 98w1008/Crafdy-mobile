import React, { useState, useRef, useEffect } from 'react'
import {
  View,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  Alert,
} from 'react-native'
import { router } from 'expo-router'
import { useAuth, useRole } from '@/contexts/AuthContext'
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '@/constants/GrayDesignTokens'
import { StyledText, StyledButton } from '@/components/ui'
import * as Haptics from 'expo-haptics'

const { width: screenWidth } = Dimensions.get('window')

// チャットメッセージの型定義
interface ChatMessage {
  id: string
  type: 'user' | 'ai'
  content: string
  timestamp: Date
  actions?: ActionButton[]
}

// アクションボタンの型定義
interface ActionButton {
  id: string
  label: string
  action: () => void
  variant?: 'primary' | 'secondary'
}

// プロンプトチップの型定義
interface PromptChip {
  id: string
  text: string
  category: 'project' | 'report' | 'estimate' | 'support' | 'media'
  icon: string
}

// スラッシュコマンドの型定義
interface SlashCommand {
  command: string
  description: string
  action: () => void
}

export default function ChatHomeScreen() {
  const { user, profile } = useAuth()
  const userRole = useRole()
  const [inputText, setInputText] = useState('')
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [showSlashCommands, setShowSlashCommands] = useState(false)
  const scrollViewRef = useRef<ScrollView>(null)
  const inputRef = useRef<TextInput>(null)

  // おすすめプロンプトチップ
  const promptChips: PromptChip[] = [
    {
      id: '1',
      text: '今日の現場を新規作成',
      category: 'project',
      icon: '🏗️'
    },
    {
      id: '2', 
      text: '日報を記録',
      category: 'report',
      icon: '📝'
    },
    {
      id: '3',
      text: 'レシートを撮影',
      category: 'media',
      icon: '📷'
    },
    {
      id: '4',
      text: '進捗を%で更新',
      category: 'project',
      icon: '📊'
    },
    {
      id: '5',
      text: '見積をAIで草案',
      category: 'estimate', 
      icon: '💰'
    },
    {
      id: '6',
      text: '応援を手配',
      category: 'support',
      icon: '⚡'
    }
  ]

  // スラッシュコマンド
  const slashCommands: SlashCommand[] = [
    {
      command: '/見積',
      description: '新規見積を作成',
      action: () => router.push('/estimate-center')
    },
    {
      command: '/日報',
      description: '日報を入力・管理',
      action: () => Alert.alert('開発中', '日報機能は開発中です')
    },
    {
      command: '/進捗',
      description: 'プロジェクト進捗を更新',
      action: () => router.push('/(tabs)/projects')
    },
    {
      command: '/レシート',
      description: 'レシートをスキャン',
      action: () => router.push('/receipt-scan')
    },
    {
      command: '/応援',
      description: '応援ワーカーを手配',
      action: () => router.push('/support-work')
    },
    {
      command: '/写真',
      description: '現場写真を撮影',
      action: () => Alert.alert('開発中', '写真機能は開発中です')
    }
  ]

  // 初期表示用のサンプルメッセージ
  useEffect(() => {
    if (chatMessages.length === 0) {
      const welcomeMessage: ChatMessage = {
        id: 'welcome',
        type: 'ai',
        content: `お疲れ様です、${profile?.full_name || 'ユーザー'}さん！今日も安全第一で参りましょう。何かお手伝いできることはありますか？`,
        timestamp: new Date(),
        actions: [
          {
            id: 'new-project',
            label: '新規プロジェクト',
            action: () => router.push('/new-project')
          },
          {
            id: 'view-projects',
            label: 'プロジェクト一覧',
            action: () => router.push('/(tabs)/projects'),
            variant: 'secondary'
          }
        ]
      }
      setChatMessages([welcomeMessage])
    }
  }, [profile])

  // プロンプトチップのタップハンドラ
  const handleChipPress = (chip: PromptChip) => {
    if (Haptics) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    }
    setInputText(chip.text)
    inputRef.current?.focus()
  }

  // メッセージ送信
  const handleSendMessage = () => {
    if (!inputText.trim()) return

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: inputText.trim(),
      timestamp: new Date()
    }

    setChatMessages(prev => [...prev, userMessage])
    
    // スラッシュコマンドの処理
    const matchedCommand = slashCommands.find(cmd => 
      inputText.trim().toLowerCase().startsWith(cmd.command.toLowerCase())
    )
    
    if (matchedCommand) {
      setTimeout(() => {
        const aiResponse: ChatMessage = {
          id: (Date.now() + 1).toString(),
          type: 'ai',
          content: `${matchedCommand.description}を実行します。`,
          timestamp: new Date(),
          actions: [
            {
              id: 'execute',
              label: '実行',
              action: matchedCommand.action
            }
          ]
        }
        setChatMessages(prev => [...prev, aiResponse])
      }, 500)
    } else {
      // 一般的なAI応答（今後実装）
      setTimeout(() => {
        const aiResponse: ChatMessage = {
          id: (Date.now() + 1).toString(),
          type: 'ai',
          content: 'ご質問をお聞きしました。建設現場でのお手伝いをさせていただきます。',
          timestamp: new Date()
        }
        setChatMessages(prev => [...prev, aiResponse])
      }, 1000)
    }
    
    setInputText('')
    setShowSlashCommands(false)
    
    // メッセージ送信後にスクロール
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true })
    }, 100)
  }

  // 入力テキストの変更処理
  const handleTextChange = (text: string) => {
    setInputText(text)
    setShowSlashCommands(text.startsWith('/'))
  }

  // マルチメディア入力のハンドラ
  const handleMediaInput = (type: 'photo' | 'scan' | 'location' | 'voice') => {
    if (Haptics) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    }
    
    switch (type) {
      case 'photo':
        Alert.alert('写真撮影', '写真撮影機能は開発中です')
        break
      case 'scan':
        router.push('/receipt-scan')
        break
      case 'location':
        Alert.alert('位置情報', '位置情報機能は開発中です')
        break
      case 'voice':
        Alert.alert('音声入力', '音声入力機能は開発中です')
        break
    }
  }

  // 未完タスクの数（仮データ）
  const pendingTasksCount = 3

  // ヘッダーレンダリング
  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerContent}>
        <StyledText variant="title" weight="semibold" color="text">
          お疲れ様です、{profile?.full_name || 'ユーザー'}さん 👋
        </StyledText>
        {pendingTasksCount > 0 && (
          <View style={styles.taskBadge}>
            <StyledText variant="caption" color="onPrimary" weight="semibold">
              {pendingTasksCount}
            </StyledText>
          </View>
        )}
      </View>
      <StyledText variant="body" color="secondary">
        {userRole === 'parent' ? '親方' : userRole === 'lead' ? '職長' : 'ワーカー'}モード • 今日は安全第一で！
      </StyledText>
    </View>
  )

  // プロンプトチップの横スクロールレンダリング
  const renderPromptChips = () => (
    <View style={styles.promptChipsContainer}>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.promptChipsContent}
      >
        {promptChips.map((chip) => (
          <TouchableOpacity
            key={chip.id}
            style={styles.promptChip}
            onPress={() => handleChipPress(chip)}
            activeOpacity={0.7}
          >
            <StyledText variant="body" style={{ marginRight: Spacing.xs }}>
              {chip.icon}
            </StyledText>
            <StyledText variant="body" weight="medium" color="primary">
              {chip.text}
            </StyledText>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  )

  // チャットメッセージのレンダリング
  const renderChatMessage = (message: ChatMessage) => {
    const isUser = message.type === 'user'
    
    return (
      <View key={message.id} style={[
        styles.messageContainer,
        isUser ? styles.userMessageContainer : styles.aiMessageContainer
      ]}>
        <View style={[
          styles.messageBubble,
          isUser ? styles.userBubble : styles.aiBubble
        ]}>
          <StyledText 
            variant="body" 
            color={isUser ? 'onPrimary' : 'text'}
            style={styles.messageText}
          >
            {message.content}
          </StyledText>
          
          {/* AIメッセージのアクションボタン */}
          {!isUser && message.actions && message.actions.length > 0 && (
            <View style={styles.messageActions}>
              {message.actions.map((action) => (
                <TouchableOpacity
                  key={action.id}
                  style={[
                    styles.actionButton,
                    action.variant === 'secondary' ? styles.secondaryActionButton : styles.primaryActionButton
                  ]}
                  onPress={action.action}
                  activeOpacity={0.7}
                >
                  <StyledText 
                    variant="caption" 
                    weight="semibold"
                    color={action.variant === 'secondary' ? 'primary' : 'onPrimary'}
                  >
                    {action.label}
                  </StyledText>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
        
        <StyledText variant="caption" color="tertiary" style={styles.messageTime}>
          {message.timestamp.toLocaleTimeString('ja-JP', { 
            hour: '2-digit', 
            minute: '2-digit' 
          })}
        </StyledText>
      </View>
    )
  }

  // スラッシュコマンドの候補表示
  const renderSlashCommands = () => {
    if (!showSlashCommands) return null
    
    const filteredCommands = slashCommands.filter(cmd => 
      cmd.command.toLowerCase().includes(inputText.toLowerCase())
    )
    
    if (filteredCommands.length === 0) return null
    
    return (
      <View style={styles.slashCommandsContainer}>
        {filteredCommands.map((command) => (
          <TouchableOpacity
            key={command.command}
            style={styles.slashCommandItem}
            onPress={() => {
              setInputText(command.command + ' ')
              setShowSlashCommands(false)
              inputRef.current?.focus()
            }}
            activeOpacity={0.7}
          >
            <StyledText variant="body" weight="semibold" color="primary">
              {command.command}
            </StyledText>
            <StyledText variant="caption" color="secondary">
              {command.description}
            </StyledText>
          </TouchableOpacity>
        ))}
      </View>
    )
  }

  // 入力エリアのレンダリング
  const renderInputArea = () => (
    <View style={styles.inputContainer}>
      {renderSlashCommands()}
      
      <View style={styles.inputRow}>
        <View style={styles.textInputContainer}>
          <TextInput
            ref={inputRef}
            style={styles.textInput}
            value={inputText}
            onChangeText={handleTextChange}
            placeholder="メッセージを入力...（/でコマンド）"
            placeholderTextColor={Colors.text.tertiary}
            multiline
            maxLength={500}
          />
        </View>
        
        <View style={styles.inputActions}>
          {/* マルチメディア入力ボタン */}
          <TouchableOpacity
            style={styles.mediaButton}
            onPress={() => {
              Alert.alert(
                'メディア選択',
                'どの機能を使用しますか？',
                [
                  { text: '📷 写真', onPress: () => handleMediaInput('photo') },
                  { text: '📄 スキャン', onPress: () => handleMediaInput('scan') },
                  { text: '📍 位置情報', onPress: () => handleMediaInput('location') },
                  { text: '🎤 音声', onPress: () => handleMediaInput('voice') },
                  { text: 'キャンセル', style: 'cancel' }
                ]
              )
            }}
            activeOpacity={0.7}
          >
            <StyledText variant="title" color="primary">+</StyledText>
          </TouchableOpacity>
          
          {/* 送信ボタン */}
          <TouchableOpacity
            style={[
              styles.sendButton,
              inputText.trim() ? styles.sendButtonActive : styles.sendButtonInactive
            ]}
            onPress={handleSendMessage}
            disabled={!inputText.trim()}
            activeOpacity={0.7}
          >
            <StyledText variant="body" color={inputText.trim() ? 'onPrimary' : 'tertiary'}>
              ➤
            </StyledText>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  )

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {/* ヘッダー */}
        {renderHeader()}
        
        {/* プロンプトチップ */}
        {renderPromptChips()}
        
        {/* チャット履歴 */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.chatArea}
          contentContainerStyle={styles.chatContent}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
        >
          {chatMessages.map(renderChatMessage)}
        </ScrollView>
        
        {/* 入力エリア */}
        {renderInputArea()}
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.base.background,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  header: {
    padding: Spacing.lg,
    backgroundColor: Colors.base.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  taskBadge: {
    backgroundColor: Colors.primary.DEFAULT,
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xs,
  },
  promptChipsContainer: {
    backgroundColor: Colors.base.surface,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  promptChipsContent: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  promptChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary.alpha[10],
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.primary[200],
  },
  chatArea: {
    flex: 1,
  },
  chatContent: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  messageContainer: {
    maxWidth: '85%',
  },
  userMessageContainer: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
  },
  aiMessageContainer: {
    alignSelf: 'flex-start',
    alignItems: 'flex-start',
  },
  messageBubble: {
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.xs,
    maxWidth: '100%',
    ...Shadows.sm,
  },
  userBubble: {
    backgroundColor: Colors.primary.DEFAULT,
    borderBottomRightRadius: 6,
  },
  aiBubble: {
    backgroundColor: Colors.base.surface,
    borderBottomLeftRadius: 6,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  messageText: {
    lineHeight: Typography?.sizes?.base ?? 16 * 1.4,
  },
  messageActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
    flexWrap: 'wrap',
  },
  actionButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  primaryActionButton: {
    backgroundColor: Colors.primary.DEFAULT,
  },
  secondaryActionButton: {
    backgroundColor: Colors.base.surface,
    borderWidth: 1,
    borderColor: Colors.primary.DEFAULT,
  },
  messageTime: {
    marginLeft: Spacing.xs,
  },
  slashCommandsContainer: {
    backgroundColor: Colors.base.surface,
    borderRadius: BorderRadius.lg,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    ...Shadows.md,
    maxHeight: 200,
  },
  slashCommandItem: {
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  inputContainer: {
    backgroundColor: Colors.base.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
    padding: Spacing.lg,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.sm,
  },
  textInputContainer: {
    flex: 1,
    backgroundColor: Colors.base.surfaceSubtle,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border.light,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    minHeight: 44,
    maxHeight: 120,
  },
  textInput: {
    fontSize: Typography?.sizes?.base ?? 16,
    color: Colors.text.primary,
    textAlignVertical: 'center',
  },
  inputActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  mediaButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.base.surfaceSubtle,
    borderWidth: 1,
    borderColor: Colors.border.light,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonActive: {
    backgroundColor: Colors.primary.DEFAULT,
  },
  sendButtonInactive: {
    backgroundColor: Colors.base.surfaceSubtle,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
})