import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { useColors, useSpacing, useRadius } from '@/theme/ThemeProvider'
import { StyledText } from '../ui'

interface MessageBubbleProps {
  message: string
  isUser: boolean
  timestamp?: string
  userName?: string
  onPress?: () => void
  actions?: ActionButton[]
}

interface ActionButton {
  id: string
  label: string
  action: () => void
  variant?: 'primary' | 'secondary'
}

export function MessageBubble({ 
  message, 
  isUser, 
  timestamp, 
  userName,
  onPress,
  actions
}: MessageBubbleProps) {
  const colors = useColors()
  const spacing = useSpacing()
  const radius = useRadius()

  const styles = createStyles(colors, spacing, radius)

  return (
    <View style={[styles.messageContainer, isUser ? styles.userMessageContainer : styles.aiMessageContainer]}>
      <View style={[styles.messageBubble, isUser ? styles.userBubble : styles.aiBubble]}>
        {/* AIメッセージの場合のヘッダー */}
        {!isUser && (
          <View style={styles.aiHeader}>
            <View style={styles.aiIcon}>
              <StyledText variant="caption" style={styles.aiIconText}>🤖</StyledText>
            </View>
            <StyledText variant="caption" weight="medium" color="secondary" style={styles.aiLabel}>
              Crafdy AI
            </StyledText>
          </View>
        )}
        
        {/* メッセージ本文 */}
        <StyledText 
          variant="body" 
          color={isUser ? 'onPrimary' : 'text'}
          style={styles.messageText}
        >
          {message}
        </StyledText>
        
        {/* AIメッセージのアクションボタン */}
        {!isUser && actions && actions.length > 0 && (
          <View style={styles.messageActions}>
            {actions.map((action) => (
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
      
      {/* タイムスタンプ */}
      {timestamp && (
        <StyledText variant="caption" color="tertiary" style={styles.messageTime}>
          {timestamp}
        </StyledText>
      )}
    </View>
  )
}

const createStyles = (colors: any, spacing: any, radius: any) => StyleSheet.create({
  messageContainer: {
    maxWidth: '80%',
    marginBottom: spacing[3],
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
    padding: spacing[4],
    borderRadius: radius.lg,
    marginBottom: spacing[1],
    maxWidth: '100%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  userBubble: {
    backgroundColor: colors.primary.DEFAULT,
    borderBottomRightRadius: radius.sm,
  },
  aiBubble: {
    backgroundColor: colors.surface,
    borderBottomLeftRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  aiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[2],
  },
  aiIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.primary.light,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing[2],
  },
  aiIconText: {
    fontSize: 12,
  },
  aiLabel: {
    fontSize: 12,
  },
  messageText: {
    lineHeight: 22,
    fontSize: 16,
    fontFamily: 'System', // システムフォント使用
  },
  messageActions: {
    flexDirection: 'row',
    gap: spacing[2],
    marginTop: spacing[3],
    flexWrap: 'wrap',
  },
  actionButton: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: radius.md,
    minWidth: 60,
    alignItems: 'center',
  },
  primaryActionButton: {
    backgroundColor: colors.primary.DEFAULT,
  },
  secondaryActionButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.primary.DEFAULT,
  },
  messageTime: {
    marginLeft: spacing[2],
    fontSize: 12,
  },
})

export default MessageBubble
