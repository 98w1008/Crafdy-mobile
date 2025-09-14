import React, { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Dimensions,
  Alert,
} from 'react-native'

interface SmartReplyChip {
  id: string
  label: string
  action: () => void
}

interface InputBarProps {
  message: string
  onMessageChange: (text: string) => void
  onSendPress: () => void
  onPlusPress?: () => void
  onReportPress?: () => void
  sending?: boolean
  disabled?: boolean
  placeholder?: string
}

export default function InputBar({
  message,
  onMessageChange,
  onSendPress,
  onPlusPress,
  onReportPress,
  sending = false,
  disabled = false,
  placeholder = "メッセージを入力...",
}: InputBarProps) {
  const [showSmartReplies, setShowSmartReplies] = useState(true)

  // SmartReply用のサンプルチップ
  const smartReplyChips: SmartReplyChip[] = [
    {
      id: 'daily_report',
      label: '📋 日報',
      action: () => {
        if (onReportPress) {
          onReportPress()
        } else {
          onMessageChange('今日の作業報告をします。')
          setShowSmartReplies(false)
        }
      }
    },
    {
      id: 'progress_check',
      label: '📊 進捗確認',
      action: () => {
        onMessageChange('現在の進捗状況を確認したいです。')
        setShowSmartReplies(false)
      }
    },
    {
      id: 'material_ocr',
      label: '📷 材料OCR',
      action: () => {
        onMessageChange('材料の写真を撮影してOCRスキャンします。')
        setShowSmartReplies(false)
      }
    },
    {
      id: 'weather_check',
      label: '🌤️ 天気確認',
      action: () => {
        onMessageChange('明日の天気を確認したいです。')
        setShowSmartReplies(false)
      }
    },
    {
      id: 'safety_check',
      label: '⛑️ 安全確認',
      action: () => {
        onMessageChange('安全管理状況を報告します。')
        setShowSmartReplies(false)
      }
    },
    {
      id: 'material_order',
      label: '📦 資材発注',
      action: () => {
        onMessageChange('資材の発注が必要です。')
        setShowSmartReplies(false)
      }
    },
  ]

  const handlePlusPress = () => {
    if (onPlusPress) {
      onPlusPress()
    } else {
      Alert.alert(
        'アクションメニュー',
        'アクション機能は準備中です',
        [
          { text: 'キャンセル', style: 'cancel' },
          { text: '写真撮影', onPress: () => console.log('Camera') },
          { text: 'ファイル添付', onPress: () => console.log('File') },
        ]
      )
    }
  }

  const handleSendPress = () => {
    if (message.trim() && !sending && !disabled) {
      onSendPress()
      setShowSmartReplies(true) // メッセージ送信後にSmartReplyを再表示
    }
  }

  const handleInputFocus = () => {
    if (message.trim()) {
      setShowSmartReplies(false)
    }
  }

  const handleInputBlur = () => {
    if (!message.trim()) {
      setShowSmartReplies(true)
    }
  }

  const renderSmartReplyChip = ({ label, action }: SmartReplyChip) => (
    <TouchableOpacity
      key={label}
      style={styles.smartReplyChip}
      onPress={action}
      activeOpacity={0.7}
    >
      <Text style={styles.smartReplyChipText}>{label}</Text>
    </TouchableOpacity>
  )

  return (
    <View style={styles.container}>
      {/* SmartReply Chips */}
      {showSmartReplies && !message.trim() && (
        <View style={styles.smartReplyContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.smartReplyContent}
            style={styles.smartReplyScroll}
          >
            {smartReplyChips.map(renderSmartReplyChip)}
          </ScrollView>
        </View>
      )}

      {/* Action Bar */}
      <View style={styles.actionBar}>
        {/* Plus Button */}
        <TouchableOpacity
          style={styles.plusButton}
          onPress={handlePlusPress}
          activeOpacity={0.7}
          disabled={disabled}
        >
          <Text style={styles.plusButtonText}>＋</Text>
        </TouchableOpacity>

        {/* Text Input */}
        <View style={styles.inputContainer}>
          <TextInput
            value={message}
            onChangeText={onMessageChange}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
            style={styles.textInput}
            placeholder={placeholder}
            placeholderTextColor="#6B7280"
            multiline
            maxLength={1000}
            editable={!disabled}
            scrollEnabled={true}
          />
        </View>

        {/* Send Button */}
        <TouchableOpacity
          style={[
            styles.sendButton,
            (!message.trim() || sending || disabled) && styles.sendButtonDisabled
          ]}
          onPress={handleSendPress}
          disabled={!message.trim() || sending || disabled}
          activeOpacity={0.8}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.sendButtonText}>送信</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  )
}

const { width: screenWidth } = Dimensions.get('window')

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F5F6F8',
    paddingBottom: 8, // SafeAreaを考慮した下部余白
  },
  smartReplyContainer: {
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: '#FFFFFF',
  },
  smartReplyScroll: {
    flexGrow: 0,
  },
  smartReplyContent: {
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  smartReplyChip: {
    backgroundColor: '#F5F6F8',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  smartReplyChipText: {
    fontSize: 14,
    color: '#1B1B1F',
    fontWeight: '500',
  },
  actionBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
  },
  plusButton: {
    width: 44,
    height: 44,
    backgroundColor: '#0E73E0',
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    shadowColor: '#0E73E0',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  plusButtonText: {
    fontSize: 20,
    color: '#FFFFFF',
    fontWeight: 'bold',
    lineHeight: 20,
  },
  inputContainer: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    backgroundColor: '#F5F6F8',
    borderRadius: 22,
    marginRight: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    justifyContent: 'center',
  },
  textInput: {
    fontSize: 16,
    color: '#1B1B1F',
    lineHeight: 20,
    textAlignVertical: 'top', // Android対応
    minHeight: 20, // 最小高さ
  },
  sendButton: {
    backgroundColor: '#0E73E0',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 60,
    height: 44,
    shadowColor: '#0E73E0',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  sendButtonDisabled: {
    backgroundColor: '#D1D5DB',
    shadowOpacity: 0,
    elevation: 0,
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
})

// InputBarで使用するためのhook (オプション)
export const useInputBar = (initialMessage = '') => {
  const [message, setMessage] = useState(initialMessage)
  const [sending, setSending] = useState(false)

  const handleMessageChange = (text: string) => {
    setMessage(text)
  }

  const handleSend = async (sendFunction: (message: string) => Promise<void>) => {
    if (!message.trim() || sending) return

    setSending(true)
    const messageToSend = message.trim()
    setMessage('') // 即座にクリア

    try {
      await sendFunction(messageToSend)
    } catch (error) {
      console.error('Send message error:', error)
      setMessage(messageToSend) // エラー時は元に戻す
    } finally {
      setSending(false)
    }
  }

  return {
    message,
    setMessage,
    sending,
    handleMessageChange,
    handleSend,
  }
}