import React, { useState, useRef } from 'react'
import {
  View,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ScrollView,
} from 'react-native'
import { router } from 'expo-router'
import { Colors, Spacing, Typography, BorderRadius, Shadows } from '@/constants/Colors'
import { StyledText, StyledButton, Card } from '@/components/ui'

interface AIEstimateTabProps {
  projectId: string
  projectName: string
  userRole: string | null
  user: any
}

interface EstimateMessage {
  id: string
  content: string
  role: 'user' | 'assistant'
  timestamp: string
  type?: 'text' | 'estimate_result' | 'calculation'
  estimateData?: {
    category: string
    items: {
      name: string
      quantity: number
      unit: string
      unitPrice: number
      totalPrice: number
    }[]
    totalAmount: number
    laborCost?: number
    materialCost?: number
    overheadRate?: number
  }
}

interface QuickEstimateTemplate {
  id: string
  title: string
  description: string
  icon: string
  prompt: string
  category: 'material' | 'labor' | 'equipment' | 'total'
}

export default function AIEstimateTab({ projectId, projectName, userRole, user }: AIEstimateTabProps) {
  const [messages, setMessages] = useState<EstimateMessage[]>([
    {
      id: '1',
      content: 'こんにちは！建設現場のAI見積もりアシスタントです。\n\n材料費、人件費、工程見積もりなど、現場の見積もり作業をサポートします。\n\n何の見積もりが必要ですか？',
      role: 'assistant',
      timestamp: new Date().toISOString(),
      type: 'text'
    }
  ])
  
  const [inputText, setInputText] = useState('')
  const [loading, setLoading] = useState(false)
  const [showTemplates, setShowTemplates] = useState(true)
  const flatListRef = useRef<FlatList>(null)

  // 権限チェック：AI見積もり機能の利用権限
  const canUseAIEstimate = userRole === 'parent' || userRole === 'lead'

  // 削除: 4タイルのテンプレートは廃止
  // 代わりに統一見積もり作成へのリダイレクト機能を実装

  const sendMessage = async (messageText?: string) => {
    if (!canUseAIEstimate) {
      Alert.alert('権限エラー', 'AI見積もり機能の利用権限がありません')
      return
    }

    const textToSend = messageText || inputText.trim()
    if (!textToSend || loading) return

    const userMessage: EstimateMessage = {
      id: Date.now().toString(),
      content: textToSend,
      role: 'user',
      timestamp: new Date().toISOString(),
      type: 'text'
    }

    setMessages(prev => [...prev, userMessage])
    setInputText('')
    setLoading(true)
    setShowTemplates(false)

    try {
      // AI見積もり応答をシミュレート
      setTimeout(() => {
        const aiResponse: EstimateMessage = {
          id: (Date.now() + 1).toString(),
          content: '',
          role: 'assistant',
          timestamp: new Date().toISOString(),
          type: 'estimate_result',
          estimateData: generateEstimateData(textToSend)
        }
        
        setMessages(prev => [...prev, aiResponse])
        setLoading(false)
        
        // メッセージを下にスクロール
        setTimeout(() => {
          flatListRef.current?.scrollToEnd()
        }, 100)
      }, 2000)

    } catch (error) {
      console.error('AI見積もりエラー:', error)
      Alert.alert('エラー', '見積もりの生成に失敗しました')
      setLoading(false)
    }
  }

  const generateEstimateData = (prompt: string) => {
    // 実際の実装では、OpenAI APIや専用のAI見積もりサービスを使用
    const lowerPrompt = prompt.toLowerCase()
    
    if (lowerPrompt.includes('材料') || lowerPrompt.includes('コンクリート') || lowerPrompt.includes('木材')) {
      return {
        category: '材料費見積もり',
        items: [
          { name: 'コンクリート（25N）', quantity: 50, unit: 'm³', unitPrice: 15000, totalPrice: 750000 },
          { name: '鉄筋（D16）', quantity: 2000, unit: 'kg', unitPrice: 120, totalPrice: 240000 },
          { name: '型枠合板', quantity: 100, unit: '枚', unitPrice: 2500, totalPrice: 250000 },
        ],
        totalAmount: 1240000,
        materialCost: 1240000,
        laborCost: 0,
        overheadRate: 10
      }
    } else if (lowerPrompt.includes('人件費') || lowerPrompt.includes('作業')) {
      return {
        category: '人件費見積もり',
        items: [
          { name: '主任技術者', quantity: 20, unit: '日', unitPrice: 25000, totalPrice: 500000 },
          { name: '技能工', quantity: 40, unit: '日', unitPrice: 18000, totalPrice: 720000 },
          { name: '普通作業員', quantity: 60, unit: '日', unitPrice: 13000, totalPrice: 780000 },
        ],
        totalAmount: 2000000,
        materialCost: 0,
        laborCost: 2000000,
        overheadRate: 15
      }
    } else {
      return {
        category: '総合見積もり',
        items: [
          { name: '材料費', quantity: 1, unit: '式', unitPrice: 1500000, totalPrice: 1500000 },
          { name: '労務費', quantity: 1, unit: '式', unitPrice: 2000000, totalPrice: 2000000 },
          { name: '機械経費', quantity: 1, unit: '式', unitPrice: 500000, totalPrice: 500000 },
        ],
        totalAmount: 4000000,
        materialCost: 1500000,
        laborCost: 2000000,
        overheadRate: 20
      }
    }
  }

  // 削除: handleTemplatePress - 4タイル廃止に伴い不要

  const renderMessage = ({ item }: { item: EstimateMessage }) => {
    const isUser = item.role === 'user'
    
    if (item.type === 'estimate_result' && item.estimateData) {
      return renderEstimateResult(item)
    }
    
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

  const renderEstimateResult = (message: EstimateMessage) => {
    const { estimateData } = message
    if (!estimateData) return null

    return (
      <View style={styles.estimateContainer}>
        <Card variant="premium" elevationLevel={3} glowEffect={true} style={styles.estimateCard}>
          <View style={styles.estimateHeader}>
            <StyledText variant="subtitle" weight="bold" color="primary">
              📊 {estimateData.category}
            </StyledText>
            <StyledText variant="caption" color="secondary">
              {new Date(message.timestamp).toLocaleString('ja-JP')}
            </StyledText>
          </View>

          {/* 見積もり明細 */}
          <View style={styles.estimateItems}>
            <StyledText variant="body" weight="semibold" color="text" style={styles.itemsTitle}>
              📋 明細
            </StyledText>
            
            {estimateData.items.map((item, index) => (
              <View key={index} style={styles.estimateItem}>
                <View style={styles.itemDetails}>
                  <StyledText variant="body" weight="medium" color="text">
                    {item.name}
                  </StyledText>
                  <StyledText variant="caption" color="secondary">
                    {item.quantity} {item.unit} × ¥{item.unitPrice.toLocaleString()}
                  </StyledText>
                </View>
                <StyledText variant="body" weight="bold" color="primary">
                  ¥{item.totalPrice.toLocaleString()}
                </StyledText>
              </View>
            ))}
          </View>

          {/* コスト内訳 */}
          {(estimateData.materialCost || estimateData.laborCost) && (
            <View style={styles.costBreakdown}>
              <StyledText variant="body" weight="semibold" color="text" style={styles.breakdownTitle}>
                💰 コスト内訳
              </StyledText>
              
              {estimateData.materialCost > 0 && (
                <View style={styles.breakdownItem}>
                  <StyledText variant="body" color="text">材料費</StyledText>
                  <StyledText variant="body" weight="semibold" color="warning">
                    ¥{estimateData.materialCost.toLocaleString()}
                  </StyledText>
                </View>
              )}
              
              {estimateData.laborCost > 0 && (
                <View style={styles.breakdownItem}>
                  <StyledText variant="body" color="text">労務費</StyledText>
                  <StyledText variant="body" weight="semibold" color="info">
                    ¥{estimateData.laborCost.toLocaleString()}
                  </StyledText>
                </View>
              )}
              
              {estimateData.overheadRate && (
                <View style={styles.breakdownItem}>
                  <StyledText variant="body" color="text">諸経費({estimateData.overheadRate}%)</StyledText>
                  <StyledText variant="body" weight="semibold" color="secondary">
                    ¥{Math.round(estimateData.totalAmount * estimateData.overheadRate / 100).toLocaleString()}
                  </StyledText>
                </View>
              )}
            </View>
          )}

          {/* 合計金額 */}
          <View style={styles.totalAmount}>
            <StyledText variant="subtitle" weight="bold" color="text">
              合計金額
            </StyledText>
            <StyledText variant="heading2" weight="bold" color="success">
              ¥{estimateData.totalAmount.toLocaleString()}
            </StyledText>
          </View>

          {/* アクションボタン */}
          <View style={styles.estimateActions}>
            <StyledButton
              title="詳細を見る"
              variant="outline"
              size="sm"
              onPress={() => Alert.alert('開発中', '詳細表示機能は開発中です')}
              style={styles.actionButton}
            />
            <StyledButton
              title="保存"
              variant="primary"
              size="sm"
              onPress={() => Alert.alert('保存完了', '見積もりを保存しました')}
              style={styles.actionButton}
            />
          </View>
        </Card>
      </View>
    )
  }

  const renderEstimateButton = () => {
    return (
      <Card variant="elevated" style={styles.estimateButtonCard}>
        <StyledText variant="subtitle" weight="semibold" style={styles.estimateButtonTitle}>
          📊 見積もり作成
        </StyledText>
        <StyledText variant="body" color="secondary" style={styles.estimateButtonDescription}>
          新しい統一ウィザードで見積もりを作成します
        </StyledText>
        <StyledButton
          title="見積もりを作成 ＋"
          variant="primary"
          size="lg"
          onPress={() => {
            router.push('/estimate/new')
          }}
          style={styles.createEstimateButton}
        />
      </Card>
    )
  }

  const renderTypingIndicator = () => {
    if (!loading) return null
    
    return (
      <View style={[styles.messageContainer, styles.aiMessageContainer]}>
        <View style={styles.aiAvatar}>
          <StyledText variant="title" color="onPrimary">🤖</StyledText>
        </View>
        <View style={[styles.messageBubble, styles.aiBubble]}>
          <StyledText variant="body" color="text">
            見積もり計算中... 💭
          </StyledText>
        </View>
      </View>
    )
  }

  if (!canUseAIEstimate) {
    return (
      <View style={styles.container}>
        <Card variant="outlined" style={styles.noAccessCard}>
          <StyledText variant="heading3" align="center" style={styles.noAccessIcon}>
            🔒
          </StyledText>
          <StyledText variant="title" weight="semibold" align="center" color="text">
            AI見積もり機能
          </StyledText>
          <StyledText variant="body" color="secondary" align="center" style={styles.noAccessDescription}>
            この機能は親方または職長のみが利用できます
          </StyledText>
        </Card>
      </View>
    )
  }

  return (
    <View style={styles.container}>
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
          ListHeaderComponent={renderEstimateButton}
          ListFooterComponent={renderTypingIndicator}
          showsVerticalScrollIndicator={false}
        />

        {/* 入力エリア */}
        <View style={styles.inputContainer}>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.textInput}
              placeholder="見積もりについて質問してください..."
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
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
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
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.sm,
  },
  messageText: {
    lineHeight: 20,
  },
  timestamp: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.xs,
  },
  estimateContainer: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    width: '100%',
  },
  estimateCard: {
    width: '100%',
  },
  estimateHeader: {
    marginBottom: Spacing.lg,
  },
  estimateItems: {
    marginBottom: Spacing.lg,
  },
  itemsTitle: {
    marginBottom: Spacing.md,
  },
  estimateItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.xs,
  },
  itemDetails: {
    flex: 1,
    gap: Spacing.xs,
  },
  costBreakdown: {
    marginBottom: Spacing.lg,
  },
  breakdownTitle: {
    marginBottom: Spacing.md,
  },
  breakdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  totalAmount: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Spacing.md,
    borderTopWidth: 2,
    borderTopColor: Colors.border,
    marginBottom: Spacing.lg,
  },
  estimateActions: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  actionButton: {
    flex: 1,
  },
  estimateButtonCard: {
    margin: Spacing.md,
    marginBottom: Spacing.lg,
    padding: Spacing.lg,
    alignItems: 'center',
  },
  estimateButtonTitle: {
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  estimateButtonDescription: {
    marginBottom: Spacing.lg,
    textAlign: 'center',
  },
  createEstimateButton: {
    minWidth: 200,
  },
  inputContainer: {
    backgroundColor: Colors.surfaceElevated,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
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
    backgroundColor: Colors.background,
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
  noAccessCard: {
    alignItems: 'center',
    paddingVertical: Spacing['2xl'],
    margin: Spacing.md,
  },
  noAccessIcon: {
    fontSize: 48,
    marginBottom: Spacing.lg,
  },
  noAccessDescription: {
    marginTop: Spacing.sm,
  },
})