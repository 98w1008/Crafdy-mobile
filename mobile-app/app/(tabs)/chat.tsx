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
import { useAuth } from '@/contexts/AuthContext'
import { useColors, useSpacing, useRadius } from '@/theme/ThemeProvider'
import { StyledText, StyledButton, Card } from '@/components/ui'
import GreetingCard from '@/components/GreetingCard'
import { useGreetingCard } from '@/hooks/useGreetingCard'

interface Message {
  id: string
  content: string
  role: 'user' | 'assistant'
  timestamp: string
  user_id?: string
  type?: 'text' | 'suggestion' | 'calculation'
  attachments?: string[]
}

interface QuickSuggestion {
  id: string
  text: string
  category: 'estimation' | 'safety' | 'planning' | 'materials'
  icon: string
}

export default function ChatScreen() {
  const { user } = useAuth()
  const params = useLocalSearchParams()
  const colors = useColors()
  const spacing = useSpacing()
  const radius = useRadius()
  
  const [messages, setMessages] = useState<Message[]>([])
  const [inputText, setInputText] = useState('')
  const [loading, setLoading] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(true)
  const [isFirstLoad, setIsFirstLoad] = useState(true)
  const flatListRef = useRef<FlatList>(null)

  // 挨拶カード管理
  const { 
    isVisible: showGreeting,
    hideCard: hideGreeting,
    onFocus,
    onChangeText: handleTextChange,
    onScroll,
    onPress,
    isLoading: greetingLoading
  } = useGreetingCard()

  const threadId = params.threadId as string || 'default'
  const threadName = params.threadName as string || 'CrafdyAI'

  // 建設業界向けクイック提案
  const quickSuggestions: QuickSuggestion[] = [
    {
      id: '1',
      text: '材料費を見積もりたい',
      category: 'estimation',
      icon: '🧮'
    },
    {
      id: '2', 
      text: '安全管理について相談',
      category: 'safety',
      icon: '🦺'
    },
    {
      id: '3',
      text: '工程スケジュールを確認',
      category: 'planning',
      icon: '📅'
    },
    {
      id: '4',
      text: '必要な資材をリスト化',
      category: 'materials',
      icon: '📦'
    }
  ]

  useEffect(() => {
    loadMessages()
  }, [threadId])

  useEffect(() => {
    // 初回読み込み完了後にフラグを更新
    if (messages.length > 0) {
      setIsFirstLoad(false)
    }
  }, [messages])

  const loadMessages = async () => {
    try {
      // 建設業界向けの初期メッセージ
      const demoMessages: Message[] = [
        {
          id: '1',
          content: 'こんにちは！私はCrafdyAI、建設現場の専門アシスタントです。\n\n見積もり計算、安全管理、工程計画など、現場のあらゆる質問にお答えします。\n\n何かお手伝いできることはありますか？',
          role: 'assistant',
          timestamp: new Date().toISOString(),
          type: 'text'
        }
      ]
      
      setMessages(demoMessages)
    } catch (error) {
      console.error('メッセージ読み込みエラー:', error)
    }
  }

  const sendMessage = async (messageText?: string) => {
    const textToSend = messageText || inputText.trim()
    if (!textToSend || loading) return

    onPress() // メッセージ送信時に挨拶カード非表示

    const userMessage: Message = {
      id: Date.now().toString(),
      content: textToSend,
      role: 'user',
      timestamp: new Date().toISOString(),
      user_id: user?.id,
      type: 'text'
    }

    setMessages(prev => [...prev, userMessage])
    setInputText('')
    setLoading(true)
    setShowSuggestions(false)

    try {
      // 建設業界に特化したAI応答
      setTimeout(() => {
        const aiResponse: Message = {
          id: (Date.now() + 1).toString(),
          content: generateConstructionAIResponse(textToSend),
          role: 'assistant',
          timestamp: new Date().toISOString(),
          type: 'text'
        }
        
        setMessages(prev => [...prev, aiResponse])
        setLoading(false)
        
        // メッセージを下にスクロール
        setTimeout(() => {
          flatListRef.current?.scrollToEnd()
        }, 100)
      }, 1500)

    } catch (error) {
      console.error('メッセージ送信エラー:', error)
      Alert.alert('エラー', 'メッセージの送信に失敗しました')
      setLoading(false)
    }
  }

  const handleSuggestionPress = (suggestion: QuickSuggestion) => {
    onPress() // 主要ボタンクリック時に挨拶カード非表示
    sendMessage(suggestion.text)
  }

  const generateConstructionAIResponse = (userMessage: string): string => {
    const lowerMessage = userMessage.toLowerCase()
    
    if (lowerMessage.includes('材料費') || lowerMessage.includes('見積')) {
      return '材料費の見積もりについてお手伝いします。\n\n必要な情報：\n• 建物の種類・規模\n• 使用する材料の種類\n• 施工期間\n• 地域（輸送費計算用）\n\nこれらの詳細を教えていただけますか？'
    }
    
    if (lowerMessage.includes('安全') || lowerMessage.includes('管理')) {
      return '現場の安全管理について相談ですね。\n\n重要なポイント：\n• 作業員の安全教育実施\n• 適切な保護具の着用確認\n• 危険箇所の標識設置\n• 定期的な安全点検\n\n具体的にどの作業の安全対策でしょうか？'
    }
    
    if (lowerMessage.includes('工程') || lowerMessage.includes('スケジュール')) {
      return '工程スケジュールの管理についてサポートします。\n\n確認事項：\n• プロジェクトの全体期間\n• 主要な作業工程\n• 人員配置計画\n• 天候による影響予測\n\nどの工程について相談したいですか？'
    }
    
    if (lowerMessage.includes('資材') || lowerMessage.includes('材料')) {
      return '必要資材のリスト化をお手伝いします。\n\n分類別に整理：\n• 構造材（鉄骨、コンクリートなど）\n• 仕上げ材（内装、外装材）\n• 設備材（電気、配管部材）\n• 工具・消耗品\n\n何の工事の資材リストでしょうか？'
    }
    
    // デフォルト応答
    const defaultResponses = [
      '承知いたしました。建設現場での経験を活かして最適な解決策を提案いたします。',
      '現場の安全と効率を最優先に考えてアドバイスいたします。詳細を教えてください。',
      'その件について、建設業界のベストプラクティスをもとにお答えします。',
      '実績のある施工方法と最新の技術を組み合わせて提案いたします。',
    ]
    
    return defaultResponses[Math.floor(Math.random() * defaultResponses.length)]
  }

  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.role === 'user'
    
    return (
      <View style={[
        styles.messageContainer,
        isUser ? styles.userMessageContainer : styles.aiMessageContainer
      ]}>
        {!isUser && (
          <View style={styles.aiAvatar}>
            <StyledText variant="title" color="onPrimary">🤖</StyledText>
          </View>
        )}
        <View style={[
          styles.messageBubble,
          isUser ? styles.userBubble : styles.aiBubble
        ]}>
          <StyledText 
            variant="body" 
            color={isUser ? "onPrimary" : "text"}
            style={styles.messageText}
          >
            {item.content}
          </StyledText>
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

  const renderGreetingCard = () => {
    if (greetingLoading || !showGreeting) return null
    
    return (
      <GreetingCard
        visible={showGreeting}
        onHide={hideGreeting}
        userName={user?.email?.split('@')[0] || user?.user_metadata?.full_name}
      />
    )
  }

  const renderQuickSuggestions = () => {
    if (!showSuggestions || messages.length > 1) return null
    
    return (
      <Card variant="elevated" style={styles.suggestionsCard}>
        <StyledText variant="subtitle" weight="semibold" style={styles.suggestionsTitle}>
          よくある相談
        </StyledText>
        <View style={styles.suggestionsGrid}>
          {quickSuggestions.map((suggestion) => (
            <TouchableOpacity
              key={suggestion.id}
              style={styles.suggestionItem}
              onPress={() => handleSuggestionPress(suggestion)}
              activeOpacity={0.7}
            >
              <StyledText variant="title" style={styles.suggestionIcon}>
                {suggestion.icon}
              </StyledText>
              <StyledText variant="caption" weight="medium" align="center" numberOfLines={2}>
                {suggestion.text}
              </StyledText>
            </TouchableOpacity>
          ))}
        </View>
      </Card>
    )
  }

  const renderTypingIndicator = () => {
    if (!loading) return null
    
    return (
      <View style={[styles.messageContainer, styles.aiMessageContainer]}>
        <View style={[styles.messageBubble, styles.aiBubble]}>
          <StyledText variant="body" color="secondary">入力中...</StyledText>
        </View>
      </View>
    )
  }

  const styles = createStyles(colors, spacing, radius)

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <StyledText variant="heading2" weight="bold">
          CrafdyAI
        </StyledText>
        <StyledText variant="body" color="secondary">
          建設現場の専門アシスタント
        </StyledText>
      </View>

      {/* Messages */}
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
          onScroll={onScroll}
          scrollEventThrottle={100}
          ListHeaderComponent={() => (
            <>
              {renderGreetingCard()}
              {renderQuickSuggestions()}
            </>
          )}
          ListFooterComponent={renderTypingIndicator}
          showsVerticalScrollIndicator={false}
        />

        {/* Input Container */}
        <View style={styles.inputContainer}>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.textInput}
              placeholder="質問や相談を入力してください..."
              value={inputText}
              onChangeText={(text) => {
                setInputText(text)
                handleTextChange(text)
              }}
              onFocus={onFocus}
              multiline
              maxLength={1000}
              placeholderTextColor={colors.text.secondary}
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

const createStyles = (colors: any, spacing: any, radius: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  header: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[2],
    paddingBottom: spacing[6],
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  chatContainer: {
    flex: 1,
  },
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    paddingVertical: spacing[4],
  },
  messageContainer: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
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
    backgroundColor: colors.primary.DEFAULT,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing[2],
    marginBottom: spacing[1],
  },
  messageBubble: {
    maxWidth: '75%',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderRadius: radius.lg,
    marginBottom: spacing[1],
  },
  userBubble: {
    backgroundColor: colors.primary.DEFAULT,
    marginLeft: spacing[8],
  },
  aiBubble: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  messageText: {
    lineHeight: 20,
  },
  timestamp: {
    marginHorizontal: spacing[4],
    marginBottom: spacing[1],
  },
  suggestionsCard: {
    margin: spacing[4],
    marginBottom: spacing[6],
  },
  suggestionsTitle: {
    marginBottom: spacing[4],
  },
  suggestionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  suggestionItem: {
    width: '48%',
    alignItems: 'center',
    padding: spacing[4],
    backgroundColor: colors.background.secondary,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  suggestionIcon: {
    marginBottom: spacing[2],
  },
  inputContainer: {
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing[2],
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    maxHeight: 100,
    fontSize: 16,
    backgroundColor: colors.background.primary,
    color: colors.text.primary,
  },
  sendButton: {
    backgroundColor: colors.primary.DEFAULT,
    paddingHorizontal: spacing[6],
    paddingVertical: spacing[2],
    borderRadius: radius.lg,
    minWidth: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: colors.text.secondary,
  },
})
