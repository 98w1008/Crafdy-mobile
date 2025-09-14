import React, { useMemo, useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Dimensions, Alert } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useColors, useTheme } from '@/theme/ThemeProvider'

// SmartReply機能はQuickPromptsBarに移行

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
  // QuickPromptsBarが別途提供されるため、SmartReply機能は削除

  const colors = useColors()
  const { isDark } = useTheme()
  const insets = useSafeAreaInsets()
  const styles = useMemo(() => createStyles(colors, insets), [colors, insets])
  const [focused, setFocused] = useState(false)

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
    }
  }

  return (
    <View style={styles.container}>
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
        <View style={[styles.inputContainer, focused && styles.inputContainerFocused]}>
          <TextInput
            value={message}
            onChangeText={onMessageChange}
            style={styles.textInput}
            placeholder={placeholder}
            placeholderTextColor={colors.text.secondary}
            multiline
            maxLength={1000}
            editable={!disabled}
            scrollEnabled={true}
            keyboardAppearance={isDark ? 'dark' : 'light'}
            selectionColor={colors.primary?.DEFAULT || '#0EA5E9'}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            autoCorrect={true}
            autoCapitalize="sentences"
            returnKeyType="send"
            onSubmitEditing={() => {
              if (message.trim() && !sending && !disabled) onSendPress()
            }}
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
            <ActivityIndicator size="small" color={colors.primary?.contrastText || '#FFFFFF'} />
          ) : (
            <Text style={styles.sendButtonText}>送信</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  )
}

const { width: screenWidth } = Dimensions.get('window')

const createStyles = (colors: any, insets: { bottom: number }) => StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    // SafeArea下端と重複しないように控えめな余白（キーボード表示時の隙間防止）
    paddingBottom: Math.max(4, Math.floor((insets?.bottom || 0) / 2)),
  },
  // SmartReply関連のスタイルは削除（QuickPromptsBarが提供）
  actionBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.surface,
  },
  plusButton: {
    width: 44,
    height: 44,
    backgroundColor: colors.primary?.DEFAULT || '#0EA5E9',
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    shadowColor: colors.primary?.DEFAULT || '#0EA5E9',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  plusButtonText: {
    fontSize: 20,
    color: colors.primary?.contrastText || '#FFFFFF',
    fontWeight: 'bold',
    lineHeight: 20,
  },
  inputContainer: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    backgroundColor: colors.background?.secondary || '#F1F5F9',
    borderRadius: 14,
    marginRight: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  inputContainerFocused: {
    borderColor: colors.primary?.DEFAULT || '#0EA5E9',
    backgroundColor: (colors.background?.secondary || '#F1F5F9'),
  },
  textInput: {
    fontSize: 16,
    color: colors.text?.primary || '#111827',
    lineHeight: 20,
    textAlignVertical: 'top', // Android対応
    minHeight: 20, // 最小高さ
  },
  sendButton: {
    backgroundColor: colors.primary?.DEFAULT || '#0EA5E9',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 60,
    height: 44,
    shadowColor: colors.primary?.DEFAULT || '#0EA5E9',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  sendButtonDisabled: {
    backgroundColor: colors.border,
    shadowOpacity: 0,
    elevation: 0,
  },
  sendButtonText: {
    color: colors.primary?.contrastText || '#FFFFFF',
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
