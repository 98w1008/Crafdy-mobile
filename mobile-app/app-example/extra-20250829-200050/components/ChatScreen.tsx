import React, { useState, useEffect, useRef } from 'react'
import { 
  View, 
  Text, 
  TouchableOpacity,
  StyleSheet, 
  FlatList, 
  KeyboardAvoidingView, 
  Platform,
  Alert,
  ActivityIndicator,
  Dimensions
} from 'react-native'
import { useLocalSearchParams, router } from 'expo-router'
import { useAuth, useRole } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { sanitizeUnicodeForJSON } from '@/lib/unicode-utils'
import { Message } from '@/types/thread'
import InputBar from './InputBar'
import ReportModal from './ReportModal'
import SystemMessage, { createReportData } from './SystemMessage'
import { EditableContent } from './EditableContent'
import { ApprovalActions, StatusBadge } from './ApprovalActions'
import { SubmissionStatus } from '@/lib/approval-system'

interface ChatUser {
  id: string
  full_name: string | null
  email: string
}

interface ChatMessage extends Message {
  users?: ChatUser
  status?: SubmissionStatus
}

interface SystemMessageData {
  id: string
  type: 'report_summary' | 'system_notification'
  reportData?: any
  title?: string
  message?: string
  timestamp: string
}

interface ProjectInfo {
  id: string
  name: string
  description: string | null
  status: string
  progress_rate: number
}

export default function ChatScreen() {
  const { id: projectId } = useLocalSearchParams<{ id: string }>()
  const { user, profile } = useAuth()
  const userRole = useRole()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [projectInfo, setProjectInfo] = useState<ProjectInfo | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [reportModalVisible, setReportModalVisible] = useState(false)
  const [systemMessages, setSystemMessages] = useState<SystemMessageData[]>([])
  const flatListRef = useRef<FlatList>(null)

  useEffect(() => {
    if (!projectId || !user) return
    
    initializeChat()
    
    // リアルタイムメッセージリスナー設定
    const channel = supabase
      .channel(`project-chat-${projectId}`)
      .on(
        'postgres_changes',
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'reports', 
          filter: `project_id=eq.${projectId}` 
        },
        (payload) => {
          fetchNewMessage(payload.new.id)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [projectId, user])

  const initializeChat = async () => {
    try {
      setError(null)
      await Promise.all([
        fetchProjectInfo(),
        fetchMessages()
      ])
    } catch (error: any) {
      console.error('Error initializing chat:', error)
      setError('チャットの初期化に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const fetchProjectInfo = async () => {
    if (!projectId) return

    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, description, status, progress_rate')
        .eq('id', projectId)
        .single()

      if (error) throw error
      setProjectInfo(data)
    } catch (error) {
      console.error('Error fetching project info:', error)
      throw new Error('プロジェクト情報の取得に失敗しました')
    }
  }

  const fetchMessages = async () => {
    if (!projectId) return

    try {
      const { data, error } = await supabase
        .from('reports')
        .select(`
          id,
          content,
          user_id,
          created_at,
          work_date,
          photo_urls,
          ai_analysis,
          status,
          approved_at,
          approved_by,
          users!reports_user_id_fkey (
            id,
            full_name,
            email
          )
        `)
        .eq('project_id', projectId)
        .order('created_at', { ascending: false }) // 最新が上に来るように降順

      if (error) throw error

      // データをMessage型に変換
      const formattedMessages: ChatMessage[] = (data || []).map((report: any) => ({
        id: report.id,
        threadId: projectId,
        content: report.content,
        created_at: report.created_at,
        user_id: report.user_id,
        user: {
          id: report.users?.id || report.user_id,
          full_name: report.users?.full_name || null,
          email: report.users?.email || 'unknown@email.com',
        },
        work_date: report.work_date,
        photo_urls: report.photo_urls,
        ai_analysis: report.ai_analysis,
        type: 'report' as const,
        users: report.users,
        status: report.status as SubmissionStatus,
      }))

      setMessages(formattedMessages)
      
      // 最新メッセージにスクロール (inverted FlatListなので最初の要素)
      setTimeout(() => {
        if (formattedMessages.length > 0) {
          flatListRef.current?.scrollToIndex({ index: 0, animated: true })
        }
      }, 100)
    } catch (error) {
      console.error('Error fetching messages:', error)
      throw new Error('メッセージの取得に失敗しました')
    }
  }

  const fetchNewMessage = async (messageId: string) => {
    try {
      const { data, error } = await supabase
        .from('reports')
        .select(`
          id,
          content,
          user_id,
          created_at,
          work_date,
          photo_urls,
          ai_analysis,
          status,
          approved_at,
          approved_by,
          users!reports_user_id_fkey (
            id,
            full_name,
            email
          )
        `)
        .eq('id', messageId)
        .single()

      if (error) throw error

      const formattedMessage: ChatMessage = {
        id: data.id,
        threadId: projectId!,
        content: data.content,
        created_at: data.created_at,
        user_id: data.user_id,
        user: {
          id: data.users?.id || data.user_id,
          full_name: data.users?.full_name || null,
          email: data.users?.email || 'unknown@email.com',
        },
        work_date: data.work_date,
        photo_urls: data.photo_urls,
        ai_analysis: data.ai_analysis,
        type: 'report' as const,
        users: data.users,
        status: data.status as SubmissionStatus,
      }

      // 新しいメッセージを先頭に追加 (inverted FlatListなので)
      setMessages(prev => [formattedMessage, ...prev])
      
      // 新しいメッセージにスクロール
      setTimeout(() => {
        flatListRef.current?.scrollToIndex({ index: 0, animated: true })
      }, 100)
    } catch (error) {
      console.error('Error fetching new message:', error)
    }
  }

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !user || !projectId || sending) return

    setSending(true)
    const messageText = newMessage.trim()
    setNewMessage('') // 即座にクリア

    try {
      // Unicode文字を安全に処理してからデータベースに送信
      const { error } = await supabase.from('reports').insert({
        project_id: projectId,
        user_id: user.id,
        content: sanitizeUnicodeForJSON(messageText),
        work_date: new Date().toISOString().split('T')[0],
      })

      if (error) throw error
    } catch (error) {
      console.error('Error sending message:', error)
      Alert.alert('エラー', 'メッセージの送信に失敗しました')
      setNewMessage(messageText) // エラー時は元に戻す
    } finally {
      setSending(false)
    }
  }

  const formatTime = (dateString: string): string => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.abs(now.getTime() - date.getTime()) / (1000 * 60 * 60)

    if (diffInHours < 24) {
      return date.toLocaleTimeString('ja-JP', { 
        hour: '2-digit', 
        minute: '2-digit' 
      })
    } else {
      return date.toLocaleDateString('ja-JP', { 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit', 
        minute: '2-digit'
      })
    }
  }

  const getUserDisplayName = (message: ChatMessage): string => {
    if (message.users?.full_name) return message.users.full_name
    if (message.users?.email) return message.users.email.split('@')[0]
    return 'ユーザー'
  }

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isMyMessage = item.user_id === user?.id
    const userName = getUserDisplayName(item)
    const currentStatus = (item.status || 'submitted') as SubmissionStatus

    const handleContentChange = (newContent: string) => {
      // メッセージリストを更新
      setMessages(prev => 
        prev.map(msg => 
          msg.id === item.id 
            ? { ...msg, content: newContent }
            : msg
        )
      )
    }

    const handleStatusChange = (newStatus: SubmissionStatus) => {
      // メッセージリストのステータスを更新
      setMessages(prev => 
        prev.map(msg => 
          msg.id === item.id 
            ? { ...msg, status: newStatus }
            : msg
        )
      )
    }

    return (
      <View style={[
        styles.messageContainer, 
        isMyMessage ? styles.myMessage : styles.otherMessage
      ]}>
        {!isMyMessage && (
          <Text style={styles.userName}>{userName}</Text>
        )}

        {/* 承認システム対応コンテンツ */}
        {user ? (
          <EditableContent
            submissionId={item.id}
            userId={user.id}
            initialContent={item.content}
            currentStatus={currentStatus}
            onContentChange={handleContentChange}
            multiline={true}
            placeholder="日報内容を入力..."
            style={styles.editableContent}
            contentStyle={[
              styles.messageText,
              isMyMessage && styles.myMessageText
            ]}
          />
        ) : (
          <Text style={[
            styles.messageText,
            isMyMessage && styles.myMessageText
          ]}>
            {item.content}
          </Text>
        )}
        
        {item.photo_urls && item.photo_urls.length > 0 && (
          <View style={styles.photoContainer}>
            <Text style={styles.photoText}>📷 写真 {item.photo_urls.length}枚</Text>
          </View>
        )}
        
        <Text style={[
          styles.timestamp,
          isMyMessage && styles.myTimestamp
        ]}>
          {formatTime(item.created_at)}
        </Text>

        {/* 承認アクション（他人のメッセージで代表のみ） */}
        {!isMyMessage && user && userRole === 'owner' && (
          <ApprovalActions
            submissionId={item.id}
            userId={user.id}
            currentStatus={currentStatus}
            onStatusChange={handleStatusChange}
            style={styles.approvalActions}
          />
        )}
      </View>
    )
  }

  const renderSystemMessage = ({ item }: { item: SystemMessageData }) => (
    <SystemMessage
      type={item.type}
      reportData={item.reportData}
      title={item.title}
      message={item.message}
      onPress={() => {
        // TODO: 詳細表示の実装
        console.log('System message pressed:', item.id)
      }}
    />
  )

  const renderListItem = ({ item, index }: { item: ChatMessage | SystemMessageData, index: number }) => {
    // システムメッセージかどうかを判定
    if ('type' in item && (item.type === 'report_summary' || item.type === 'system_notification')) {
      return renderSystemMessage({ item: item as SystemMessageData })
    }
    
    return renderMessage({ item: item as ChatMessage })
  }

  const renderSeparator = () => <View style={styles.messageSeparator} />

  // メッセージとシステムメッセージを統合したリストを作成
  const createCombinedList = (): (ChatMessage | SystemMessageData)[] => {
    const combinedList: (ChatMessage | SystemMessageData)[] = []
    
    // すべてのアイテムを一つのリストに統合してタイムスタンプでソート
    const allItems = [
      ...messages.map(msg => ({ ...msg, sortKey: new Date(msg.created_at).getTime() })),
      ...systemMessages.map(sys => ({ ...sys, sortKey: new Date(sys.timestamp).getTime() }))
    ].sort((a, b) => b.sortKey - a.sortKey) // 降順（最新が上）

    return allItems.map(({ sortKey, ...item }) => item)
  }

  const combinedMessages = createCombinedList()

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0E73E0" />
        <Text style={styles.loadingText}>チャットを読み込み中...</Text>
      </View>
    )
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorIcon}>💬</Text>
        <Text style={styles.errorTitle}>エラーが発生しました</Text>
        <Text style={styles.errorMessage}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={initializeChat}>
          <Text style={styles.retryButtonText}>再試行</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
      keyboardVerticalOffset={90}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        
        <View style={styles.headerCenter}>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {projectInfo?.name || 'チャット'}
            </Text>
            {userRole && (
              <View style={[
                styles.roleBadge, 
                userRole === 'owner' && styles.ownerRoleBadge,
                userRole === 'manager' && styles.managerRoleBadge,
                userRole === 'worker' && styles.workerRoleBadge
              ]}>
                <Text style={[
                  styles.roleBadgeText,
                  userRole === 'owner' && styles.ownerRoleBadgeText
                ]}>
                  {userRole === 'owner' ? '親方' : userRole === 'manager' ? '職長' : '職人'}
                </Text>
              </View>
            )}
          </View>
          {projectInfo && (
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View 
                  style={[
                    styles.progressFill,
                    { width: `${(projectInfo.progress_rate || 0) * 100}%` }
                  ]} 
                />
              </View>
              <Text style={styles.progressText}>
                {Math.round((projectInfo.progress_rate || 0) * 100)}%
              </Text>
            </View>
          )}
        </View>
        
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerActionButton}>
            <Text style={styles.headerActionText}>📞</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerActionButton}>
            <Text style={styles.headerActionText}>📎</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Messages - Inverted FlatList for chat flow */}
      <FlatList
        ref={flatListRef}
        data={combinedMessages}
        renderItem={renderListItem}
        keyExtractor={(item) => 
          'type' in item && item.type ? item.id : (item as ChatMessage).id
        }
        ItemSeparatorComponent={renderSeparator}
        inverted={true} // チャット形式: 最新が下
        style={styles.messagesList}
        contentContainerStyle={styles.messagesContent}
        showsVerticalScrollIndicator={false}
        onScrollToIndexFailed={(info) => {
          console.log('Scroll to index failed:', info)
        }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>💬</Text>
            <Text style={styles.emptyTitle}>まだメッセージはありません</Text>
            <Text style={styles.emptyMessage}>
              最初のメッセージを送信してチャットを開始しましょう
            </Text>
          </View>
        }
      />

      {/* Modern Input Bar with ActionBar and SmartReply */}
      <InputBar
        message={newMessage}
        onMessageChange={setNewMessage}
        onSendPress={handleSendMessage}
        onReportPress={() => setReportModalVisible(true)}
        onPlusPress={() => {
          Alert.alert(
            'アクションメニュー',
            'どのアクションを実行しますか？',
            [
              { text: 'キャンセル', style: 'cancel' },
              { text: '📷 写真撮影', onPress: () => console.log('Camera') },
              { text: '📎 ファイル添付', onPress: () => console.log('File') },
              { text: '📋 日報作成', onPress: () => setReportModalVisible(true) },
            ]
          )
        }}
        sending={sending}
        placeholder="今日の作業内容を入力..."
      />

      {/* Report Creation Modal */}
      <ReportModal
        visible={reportModalVisible}
        onClose={() => setReportModalVisible(false)}
        projectId={projectId!}
        onReportCreated={(reportId, reportData) => {
          console.log('Report created:', reportId)
          
          // システムメッセージとして日報サマリーを追加
          const newSystemMessage: SystemMessageData = {
            id: `system-${reportId}`,
            type: 'report_summary',
            reportData: createReportData(
              reportData, 
              profile?.full_name || user?.email?.split('@')[0] || 'ユーザー',
              new Date().toISOString(),
              userRole === 'owner' // Include financial information only for owners
            ),
            timestamp: new Date().toISOString(),
          }
          
          setSystemMessages(prev => [newSystemMessage, ...prev])
          
          // 最新メッセージ（システムメッセージ）にスクロール
          setTimeout(() => {
            flatListRef.current?.scrollToIndex({ index: 0, animated: true })
          }, 100)
        }}
      />
    </KeyboardAvoidingView>
  )
}

const { width: screenWidth } = Dimensions.get('window')

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F6F8',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F6F8',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F6F8',
    padding: 24,
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1B1B1F',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  retryButton: {
    backgroundColor: '#0E73E0',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 22,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F5F6F8',
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 24,
    color: '#0E73E0',
    fontWeight: '500',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 12,
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1B1B1F',
    maxWidth: screenWidth * 0.4,
    marginRight: 8,
  },
  roleBadge: {
    backgroundColor: '#E5E7EB',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  ownerRoleBadge: {
    backgroundColor: '#F59E0B',
  },
  managerRoleBadge: {
    backgroundColor: '#3B82F6',
  },
  workerRoleBadge: {
    backgroundColor: '#10B981',
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#6B7280',
  },
  ownerRoleBadgeText: {
    color: '#FFFFFF',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  progressBar: {
    width: 80,
    height: 4,
    backgroundColor: '#F5F6F8',
    borderRadius: 2,
    marginRight: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#0E73E0',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  headerActions: {
    flexDirection: 'row',
  },
  headerActionButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
  },
  headerActionText: {
    fontSize: 20,
  },
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexGrow: 1,
  },
  messageSeparator: {
    height: 4,
  },
  messageContainer: {
    maxWidth: screenWidth * 0.75,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 18,
    marginVertical: 2,
  },
  myMessage: {
    backgroundColor: '#0E73E0',
    alignSelf: 'flex-end',
    borderBottomRightRadius: 6,
  },
  otherMessage: {
    backgroundColor: '#FFFFFF',
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  userName: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#6B7280',
    marginBottom: 4,
  },
  messageText: {
    fontSize: 16,
    color: '#1B1B1F',
    lineHeight: 22,
  },
  myMessageText: {
    color: '#FFFFFF',
  },
  photoContainer: {
    marginTop: 8,
    padding: 8,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 8,
  },
  photoText: {
    fontSize: 12,
    color: '#6B7280',
  },
  timestamp: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 6,
    alignSelf: 'flex-start',
  },
  myTimestamp: {
    color: 'rgba(255,255,255,0.8)',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    transform: [{ scaleY: -1 }], // Inverted FlatListを考慮
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1B1B1F',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyMessage: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  editableContent: {
    marginVertical: 4,
  },
  approvalActions: {
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
  },
})