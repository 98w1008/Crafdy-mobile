import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useColors, useSpacing, useRadius } from '@/theme/ThemeProvider'
import { StyledText } from '../ui'
import { Badge } from 'react-native-paper'

interface MessageBubbleProps {
  message: string
  isUser: boolean
  timestamp?: string
  userName?: string
  onPress?: () => void
}

export function MessageBubble({ 
  message, 
  isUser, 
  timestamp, 
  userName,
  onPress 
}: MessageBubbleProps) {
  const colors = useColors()
  const spacing = useSpacing()
  const radius = useRadius()

  const bubbleStyle = isUser 
    ? {
        backgroundColor: colors.primary.DEFAULT,
        alignSelf: 'flex-end' as const,
        borderTopRightRadius: radius.sm,
        marginLeft: spacing[8],
      }
    : {
        alignSelf: 'flex-start' as const,
        borderTopLeftRadius: radius.sm,
        marginRight: spacing[8],
      }

  const textColor = isUser ? '#FFFFFF' : colors.text.primary

  const AIBubbleContent = () => (
    <LinearGradient
      colors={[
        colors.surface + 'F0',
        colors.surfaceElevated + 'FF',
        colors.surface + 'F5'
      ]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[
        styles.bubble,
        bubbleStyle,
        {
          borderBottomLeftRadius: radius.md,
          borderBottomRightRadius: radius.md,
          shadowColor: colors.primary.DEFAULT,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 6,
          elevation: 3,
        }
      ]}
    >
      <View style={styles.messageContent}>
        {!isUser && (
          <View style={[styles.nameContainer, { marginBottom: spacing[1] }]}>
            <Badge 
              size={16}
              style={[styles.aiBadge, { backgroundColor: colors.primary.DEFAULT }]}
            >
              ⚡
            </Badge>
            <StyledText variant="caption" weight="medium" style={{ marginLeft: spacing[2] }}>
              AI Assistant
            </StyledText>
          </View>
        )}
        <StyledText 
          variant="body" 
          style={{ color: textColor, lineHeight: 20 }}
        >
          {message}
        </StyledText>
        {timestamp && (
          <StyledText 
            variant="caption" 
            style={{ 
              color: textColor + '80', 
              marginTop: spacing[1],
              textAlign: isUser ? 'right' : 'left'
            }}
          >
            {timestamp}
          </StyledText>
        )}
      </View>
    </LinearGradient>
  )

  const UserBubbleContent = () => (
    <View style={[
      styles.bubble,
      bubbleStyle,
      {
        borderBottomLeftRadius: radius.md,
        borderBottomRightRadius: radius.md,
      }
    ]}>
      <View style={styles.messageContent}>
        <StyledText 
          variant="body" 
          style={{ color: textColor, lineHeight: 20 }}
        >
          {message}
        </StyledText>
        {timestamp && (
          <StyledText 
            variant="caption" 
            style={{ 
              color: textColor + '80', 
              marginTop: spacing[1],
              textAlign: 'right'
            }}
          >
            {timestamp}
          </StyledText>
        )}
      </View>
    </View>
  )

  return (
    <TouchableOpacity 
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      style={[styles.container, { marginBottom: spacing[3] }]}
    >
      {isUser ? <UserBubbleContent /> : <AIBubbleContent />}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  bubble: {
    maxWidth: '85%',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  messageContent: {
    flex: 1,
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  aiBadge: {
    fontSize: 10,
    fontWeight: '600',
  },
})

export default MessageBubble