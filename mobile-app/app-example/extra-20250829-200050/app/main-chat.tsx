/**
 * メインチャット画面 - アプリの中心となる画面
 * 現場を選択してチャット・作業管理を行う
 */

import React, { useState, useEffect, useRef } from 'react'
import {
  View,
  StyleSheet,
  SafeAreaView,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Alert,
} from 'react-native'
import { router } from 'expo-router'
import { Surface, Text, TextInput, Button, IconButton, Portal, Modal, Chip } from 'react-native-paper'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme, useColors, useSpacing } from '@/theme/ThemeProvider'
import * as Haptics from 'expo-haptics'

// AI Components
import MessageBubble from '@/components/chat/MessageBubble'
import TypingDots from '@/components/chat/TypingDots'
import QuickPromptsBar from '@/components/chat/QuickPrompts'
import WelcomeCard from '@/components/chat/WelcomeCard'
import FabActions from '@/components/chat/FabActions'

// =============================================================================
// TYPES
// =============================================================================

interface Project {
  id: string
  name: string
  status: 'active' | 'completed' | 'pending'
  lastActivity?: string
}

interface ChatMessage {
  id: string
  content: string
  sender: 'user' | 'ai' | 'system'
  timestamp: Date
  type?: 'text' | 'image' | 'document'
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function MainChatScreen() {
  const { user } = useAuth()
  const { isDark } = useTheme()
  const colors = useColors()
  const spacing = useSpacing()
  
  // State
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [showProjectSelector, setShowProjectSelector] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputText, setInputText] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  
  // AI State
  const [isAiTyping, setIsAiTyping] = useState(false)
  
  // UI State
  const [showWelcomeCard, setShowWelcomeCard] = useState(true)
  const [currentRoute] = useState('/main-chat')
  
  const flatListRef = useRef<FlatList>(null)

  // Mock data - 実際にはSupabaseから取得
  const [projects] = useState<Project[]>([
    { id: '1', name: '渋谷オフィス改修工事', status: 'active', lastActivity: '2時間前' },
    { id: '2', name: '新宿マンション建設', status: 'active', lastActivity: '1日前' },
    { id: '3', name: '品川倉庫解体工事', status: 'pending', lastActivity: '3日前' },
  ])

  // 初期プロジェクト選択とウェルカムカード表示判定
  useEffect(() => {
    if (projects.length > 0 && !selectedProject) {
      setSelectedProject(projects[0])
      loadChatHistory(projects[0].id)
    }
    
    // ウェルカムカードの表示判定（実際の実装では当日初回チェック）
    const lastVisit = new Date().toDateString()
    const storedLastVisit = null // AsyncStorage.getItem('lastVisit')
    if (!storedLastVisit || storedLastVisit !== lastVisit) {
      setShowWelcomeCard(true)
    } else {
      setShowWelcomeCard(false)
    }
  }, [projects])

  // チャット履歴読み込み
  const loadChatHistory = async (projectId: string) => {
    try {
      setIsLoading(true)
      // TODO: Supabaseからチャット履歴を取得
      const mockMessages: ChatMessage[] = [
        {
          id: '1',
          content: '現場での作業開始を報告します。',
          sender: 'user',
          timestamp: new Date(Date.now() - 3600000),
        },
        {
          id: '2', 
          content: 'ご報告ありがとうございます。本日の作業予定を確認いたします。',
          sender: 'ai',
          timestamp: new Date(Date.now() - 3500000),
        },
      ]
      setMessages(mockMessages)
    } catch (error) {
      console.error('チャット履歴の読み込みエラー:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // プロジェクト選択
  const handleProjectSelect = (project: Project) => {
    if (Haptics) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    }
    setSelectedProject(project)
    setShowProjectSelector(false)
    loadChatHistory(project.id)
  }

  // メッセージ送信（AI演出付き）
  const handleSendMessage = async () => {
    if (!inputText.trim() || isLoading) return

    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      content: inputText.trim(),
      sender: 'user',
      timestamp: new Date(),
    }

    setMessages(prev => [...prev, newMessage])
    setInputText('')
    setIsAiTyping(true)

    try {
      setIsLoading(true)
      
      // TODO: AIレスポンスを取得（模擬実装）
      setTimeout(() => {
        const aiResponse: ChatMessage = {
          id: (Date.now() + 1).toString(),
          content: 'ご連絡ありがとうございます。内容を確認いたします。',
          sender: 'ai',
          timestamp: new Date(),
        }
        setMessages(prev => [...prev, aiResponse])
        setIsLoading(false)
        setIsAiTyping(false)
      }, 1500)
    } catch (error) {
      console.error('メッセージ送信エラー:', error)
      setIsLoading(false)
      setIsAiTyping(false)
    }
  }

  // クイックプロンプト処理（新しい実装）
  const handleQuickPrompt = (prompt: string, promptText: string, mockResponse?: string) => {
    if (Haptics) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    }
    
    // ユーザーメッセージを追加
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      content: promptText,
      sender: 'user',
      timestamp: new Date(),
    }
    setMessages(prev => [...prev, userMessage])
    
    // AIタイピング演出
    setIsAiTyping(true)
    
    // 模擬AIレスポンス
    setTimeout(() => {
      const aiResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: mockResponse || `「${prompt}」についてサポートいたします。詳しい内容をお聞かせください。`,
        sender: 'ai',
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, aiResponse])
      setIsAiTyping(false)
    }, 1500)
  }

  // 設定画面へ遷移
  const handleSettingsPress = () => {
    if (Haptics) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    }
    router.push('/settings')
  }
  
  // ウェルカムカードを非表示
  const handleWelcomeCardDismiss = () => {
    setShowWelcomeCard(false)
    // AsyncStorage.setItem('lastVisit', new Date().toDateString())
  }

  // メッセージレンダリング（新AIバブル使用）
  const renderMessage = ({ item }: { item: ChatMessage }) => (
    <MessageBubble
      message={item.content}
      isUser={item.sender === 'user'}
      timestamp={item.timestamp.toLocaleTimeString('ja-JP', { 
        hour: '2-digit', 
        minute: '2-digit' 
      })}
      userName={item.sender === 'user' ? user?.user_metadata?.full_name : 'AI Assistant'}
    />
  )

  // プロジェクト選択モーダル
  const renderProjectSelector = () => (
    <Portal>
      <Modal
        visible={showProjectSelector}
        onDismiss={() => setShowProjectSelector(false)}
        contentContainerStyle={styles.modalContainer}
      >
        <Surface style={styles.modalContent}>
          <Text style={styles.modalTitle}>現場を選択</Text>
          {projects.map((project) => (
            <TouchableOpacity
              key={project.id}
              style={[
                styles.projectItem,
                selectedProject?.id === project.id && styles.selectedProject
              ]}
              onPress={() => handleProjectSelect(project)}
            >
              <View style={styles.projectInfo}>
                <Text style={styles.projectName}>{project.name}</Text>
                <Text style={styles.projectStatus}>
                  {project.status === 'active' ? '進行中' : 
                   project.status === 'completed' ? '完了' : '待機中'}
                </Text>
              </View>
              {project.lastActivity && (
                <Text style={styles.lastActivity}>{project.lastActivity}</Text>
              )}
            </TouchableOpacity>
          ))}
          <Button 
            mode="outlined" 
            onPress={() => setShowProjectSelector(false)}
            style={styles.modalCloseButton}
          >
            閉じる
          </Button>
        </Surface>
      </Modal>
    </Portal>
  )

  return (
    <SafeAreaView style={styles.container}>
      {/* ヘッダー - 現在選択中の現場ピル */}
      <Surface style={styles.header}>
        <TouchableOpacity
          style={styles.currentSitePill}
          onPress={() => setShowProjectSelector(true)}
          accessibilityLabel="現場を選択"
          accessibilityRole="button"
        >
          <Text style={styles.currentSiteLabel}>現在</Text>
          <Text style={styles.currentSiteName} numberOfLines={1}>
            {selectedProject?.name || '現場を選択'}
          </Text>
          <IconButton 
            icon="chevron-down" 
            size={16} 
            iconColor="#666"
            style={styles.pillIcon}
          />
        </TouchableOpacity>

        <IconButton
          icon="cog"
          size={24}
          onPress={handleSettingsPress}
          accessibilityLabel="設定"
        />
      </Surface>

      {/* チャット領域 */}
      <KeyboardAvoidingView 
        style={styles.chatContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          style={styles.messagesList}
          contentContainerStyle={styles.messagesContainer}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={() => (
            showWelcomeCard ? (
              <WelcomeCard
                currentProject={selectedProject}
                onDismiss={handleWelcomeCardDismiss}
                onProjectSelect={() => setShowProjectSelector(true)}
              />
            ) : null
          )}
        />

        {/* AI タイピング表示 */}
        {isAiTyping && (
          <TypingDots visible={true} size={6} />
        )}

        {/* クイックプロンプトバー */}
        <QuickPromptsBar 
          onSelect={handleQuickPrompt}
          style={styles.quickPromptsContainer}
        />

        {/* 入力エリア */}
        <Surface style={styles.inputContainer}>
          <TextInput
            mode="outlined"
            placeholder="メッセージを入力..."
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={1000}
            style={styles.textInput}
            right={
              <TextInput.Icon
                icon="send"
                disabled={!inputText.trim() || isLoading}
                onPress={handleSendMessage}
              />
            }
          />
        </Surface>
      </KeyboardAvoidingView>

      {/* プロジェクト選択モーダル */}
      {renderProjectSelector()}
      
      {/* FABアクション */}
      <FabActions 
        currentRoute={currentRoute}
      />
    </SafeAreaView>
  )
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    elevation: 2,
  },
  currentSitePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e3f2fd',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    maxWidth: '75%',
  },
  currentSiteLabel: {
    fontSize: 12,
    color: '#1976d2',
    marginRight: 4,
  },
  currentSiteName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1976d2',
    flex: 1,
  },
  pillIcon: {
    margin: 0,
  },
  chatContainer: {
    flex: 1,
  },
  messagesList: {
    flex: 1,
  },
  messagesContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  messageContainer: {
    marginVertical: 4,
  },
  userMessage: {
    alignItems: 'flex-end',
  },
  aiMessage: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
  },
  userBubble: {
    backgroundColor: '#007AFF',
  },
  aiBubble: {
    backgroundColor: '#ffffff',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  userMessageText: {
    color: 'white',
  },
  aiMessageText: {
    color: '#000',
  },
  timestamp: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  inputContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    elevation: 8,
  },
  textInput: {
    backgroundColor: 'white',
  },
  modalContainer: {
    padding: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  projectItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginVertical: 4,
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
  },
  selectedProject: {
    backgroundColor: '#e3f2fd',
  },
  projectInfo: {
    flex: 1,
  },
  projectName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  projectStatus: {
    fontSize: 14,
    color: '#666',
  },
  lastActivity: {
    fontSize: 12,
    color: '#999',
  },
  modalCloseButton: {
    marginTop: 16,
  },
  quickPromptsContainer: {
    marginBottom: 8,
  },
})