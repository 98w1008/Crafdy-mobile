import React, { useState, useEffect, useRef } from 'react'
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  FlatList, 
  KeyboardAvoidingView, 
  Platform,
  Alert,
  Modal,
  Dimensions
} from 'react-native'
import { useLocalSearchParams, router } from 'expo-router'
import { supabase } from '../../../lib/supabase'
import * as ImagePicker from 'expo-image-picker'

type Report = {
  id: string
  content: string
  user_id: string
  created_at: string
  work_date: string
  photo_urls?: string[]
  ai_analysis?: string
  users: { 
    full_name: string | null
    email: string 
  }
}

export default function ReportChatScreen() {
  const { id: projectId } = useLocalSearchParams<{ id: string }>()
  const [reports, setReports] = useState<Report[]>([])
  const [message, setMessage] = useState('')
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [selectedImages, setSelectedImages] = useState<string[]>([])
  const [aiModalVisible, setAiModalVisible] = useState(false)
  const [selectedReport, setSelectedReport] = useState<Report | null>(null)
  const flatListRef = useRef<FlatList>(null)

  useEffect(() => {
    if (!projectId) return
    
    initializeChat()
    
    // リアルタイムリスナー設定
    const channel = supabase
      .channel(`project-report-${projectId}`)
      .on(
        'postgres_changes',
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'reports', 
          filter: `project_id=eq.${projectId}` 
        },
        (payload) => {
          fetchReportWithUser(payload.new.id)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [projectId])

  const initializeChat = async () => {
    try {
      // ユーザー情報取得
      const { data: { user } } = await supabase.auth.getUser()
      setCurrentUser(user)

      // 日報データ取得
      await fetchReports()
    } catch (error) {
      console.error('Error initializing chat:', error)
      Alert.alert('エラー', 'チャットの初期化に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const fetchReports = async () => {
    if (!projectId) return

    try {
      const { data, error } = await supabase
        .from('reports')
        .select(`
          *,
          users (
            full_name,
            email
          )
        `)
        .eq('project_id', projectId)
        .order('created_at', { ascending: true })

      if (error) throw error
      setReports(data || [])
      
      // 最新メッセージにスクロール
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true })
      }, 100)
    } catch (error) {
      console.error('Error fetching reports:', error)
    }
  }

  const fetchReportWithUser = async (reportId: string) => {
    try {
      const { data, error } = await supabase
        .from('reports')
        .select(`
          *,
          users (
            full_name,
            email
          )
        `)
        .eq('id', reportId)
        .single()

      if (error) throw error
      if (data) {
        setReports(prev => [...prev, data])
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true })
        }, 100)
      }
    } catch (error) {
      console.error('Error fetching new report:', error)
    }
  }

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert('権限エラー', '写真ライブラリへのアクセス権限が必要です')
      return
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      allowsMultipleSelection: true,
      quality: 0.8,
    })

    if (!result.canceled && result.assets) {
      const newImages = result.assets.map(asset => asset.uri)
      setSelectedImages(prev => [...prev, ...newImages])
    }
  }

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert('権限エラー', 'カメラへのアクセス権限が必要です')
      return
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: false,
      quality: 0.8,
    })

    if (!result.canceled && result.assets) {
      const newImage = result.assets[0].uri
      setSelectedImages(prev => [...prev, newImage])
    }
  }

  const removeImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index))
  }

  const handleSend = async () => {
    if ((!message.trim() && selectedImages.length === 0) || !currentUser || !projectId) return

    setSending(true)
    try {
      // TODO: 画像アップロード処理をSupabase Storageに実装
      const photoUrls = selectedImages.length > 0 ? selectedImages : undefined

      const { error } = await supabase.from('reports').insert({
        project_id: projectId,
        user_id: currentUser.id,
        content: message.trim(),
        work_date: new Date().toISOString().split('T')[0],
        photo_urls: photoUrls,
      })

      if (error) throw error

      setMessage('')
      setSelectedImages([])
    } catch (error) {
      console.error('Error sending report:', error)
      Alert.alert('エラー', '日報の送信に失敗しました')
    } finally {
      setSending(false)
    }
  }

  const requestAIAnalysis = async (report: Report) => {
    setSelectedReport(report)
    setAiModalVisible(true)
    
    // TODO: OpenAI APIでAI分析を実行
    // 一時的にダミーの分析結果を表示
    setTimeout(() => {
      const dummyAnalysis = `【AI分析結果】
作業内容: ${report.content}

■ 作業効率: 良好
■ 安全性: 注意が必要
■ 改善提案:
- 作業手順の最適化により効率向上が期待できます
- 安全装備の確認を推奨します

■ 次回の作業ポイント:
- 天候を考慮した作業計画の調整
- チーム連携の強化`

      setSelectedReport(prev => prev ? { ...prev, ai_analysis: dummyAnalysis } : null)
    }, 1500)
  }

  const renderMessage = ({ item }: { item: Report }) => {
    const isMyMessage = item.user_id === currentUser?.id
    const userName = item.users?.full_name || item.users?.email?.split('@')[0] || '名無しさん'

    return (
      <View style={[
        styles.messageContainer, 
        isMyMessage ? styles.myMessage : styles.otherMessage
      ]}>
        <Text style={styles.userName}>{userName}</Text>
        <Text style={styles.messageText}>{item.content}</Text>
        
        {item.photo_urls && item.photo_urls.length > 0 && (
          <View style={styles.photoContainer}>
            <Text style={styles.photoText}>📷 写真 {item.photo_urls.length}枚</Text>
          </View>
        )}
        
        <View style={styles.messageFooter}>
          <Text style={styles.timestamp}>
            {new Date(item.created_at).toLocaleTimeString('ja-JP', { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </Text>
          <TouchableOpacity 
            style={styles.aiButton}
            onPress={() => requestAIAnalysis(item)}
          >
            <Text style={styles.aiButtonText}>🤖 AI分析</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.loadingText}>読み込み中...</Text>
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
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backButton}>← 戻る</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>日報チャット</Text>
        <View style={styles.headerRight} />
      </View>

      {/* Chat Messages */}
      <FlatList
        ref={flatListRef}
        data={reports}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        style={styles.chatList}
        contentContainerStyle={styles.chatListContent}
        showsVerticalScrollIndicator={false}
      />

      {/* Selected Images Preview */}
      {selectedImages.length > 0 && (
        <View style={styles.imagePreview}>
          <Text style={styles.imagePreviewTitle}>選択した写真 ({selectedImages.length}枚)</Text>
          <FlatList
            horizontal
            data={selectedImages}
            renderItem={({ item, index }) => (
              <View style={styles.previewImageContainer}>
                <Text style={styles.previewImageText}>📷</Text>
                <TouchableOpacity 
                  style={styles.removeImageButton}
                  onPress={() => removeImage(index)}
                >
                  <Text style={styles.removeImageText}>✕</Text>
                </TouchableOpacity>
              </View>
            )}
            keyExtractor={(_, index) => index.toString()}
            showsHorizontalScrollIndicator={false}
          />
        </View>
      )}

      {/* Input Area */}
      <View style={styles.inputContainer}>
        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.actionButton} onPress={takePhoto}>
            <Text style={styles.actionButtonText}>📷</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={pickImage}>
            <Text style={styles.actionButtonText}>🖼️</Text>
          </TouchableOpacity>
        </View>
        
        <TextInput
          value={message}
          onChangeText={setMessage}
          style={styles.textInput}
          placeholder="今日の作業内容を入力..."
          multiline
          maxLength={1000}
        />
        
        <TouchableOpacity 
          style={[styles.sendButton, sending && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={sending}
        >
          <Text style={styles.sendButtonText}>送信</Text>
        </TouchableOpacity>
      </View>

      {/* AI Analysis Modal */}
      <Modal
        visible={aiModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setAiModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>AI分析結果</Text>
            <TouchableOpacity onPress={() => setAiModalVisible(false)}>
              <Text style={styles.modalCloseButton}>✕</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.modalContent}>
            {selectedReport?.ai_analysis ? (
              <Text style={styles.analysisText}>{selectedReport.ai_analysis}</Text>
            ) : (
              <View style={styles.analysisLoading}>
                <Text style={styles.analysisLoadingText}>AI分析中...</Text>
                <Text style={styles.analysisLoadingSubtext}>少々お待ちください</Text>
              </View>
            )}
          </View>
          
          <TouchableOpacity 
            style={styles.modalCloseButtonLarge}
            onPress={() => setAiModalVisible(false)}
          >
            <Text style={styles.modalCloseButtonText}>閉じる</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  loadingText: {
    fontSize: 16,
    color: '#6b7280',
  },
  header: {
    backgroundColor: 'white',
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  backButton: {
    fontSize: 16,
    color: '#2563eb',
    fontWeight: '500',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  headerRight: {
    width: 60,
  },
  chatList: {
    flex: 1,
  },
  chatListContent: {
    padding: 16,
    paddingBottom: 24,
  },
  messageContainer: {
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
    maxWidth: '85%',
  },
  myMessage: {
    backgroundColor: '#dbeafe',
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  otherMessage: {
    backgroundColor: 'white',
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  userName: {
    fontWeight: 'bold',
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  messageText: {
    fontSize: 15,
    color: '#111827',
    lineHeight: 20,
  },
  photoContainer: {
    marginTop: 8,
    padding: 8,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
  },
  photoText: {
    fontSize: 12,
    color: '#6b7280',
  },
  messageFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  timestamp: {
    fontSize: 10,
    color: '#9ca3af',
  },
  aiButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
  },
  aiButtonText: {
    fontSize: 10,
    color: '#374151',
    fontWeight: '500',
  },
  imagePreview: {
    backgroundColor: 'white',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  imagePreviewTitle: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 8,
  },
  previewImageContainer: {
    position: 'relative',
    marginRight: 8,
    padding: 16,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewImageText: {
    fontSize: 24,
  },
  removeImageButton: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeImageText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  inputContainer: {
    backgroundColor: 'white',
    padding: 12,
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  actionButtons: {
    flexDirection: 'row',
    marginRight: 8,
  },
  actionButton: {
    padding: 8,
    marginRight: 4,
    backgroundColor: '#f3f4f6',
    borderRadius: 20,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonText: {
    fontSize: 16,
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    maxHeight: 100,
    fontSize: 15,
  },
  sendButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  sendButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  modalHeader: {
    backgroundColor: 'white',
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  modalCloseButton: {
    fontSize: 18,
    color: '#6b7280',
    fontWeight: 'bold',
  },
  modalContent: {
    flex: 1,
    padding: 24,
  },
  analysisText: {
    fontSize: 15,
    color: '#111827',
    lineHeight: 24,
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
  },
  analysisLoading: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    padding: 40,
    borderRadius: 12,
  },
  analysisLoadingText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  analysisLoadingSubtext: {
    fontSize: 14,
    color: '#6b7280',
  },
  modalCloseButtonLarge: {
    backgroundColor: '#2563eb',
    marginHorizontal: 24,
    marginBottom: 40,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalCloseButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
})