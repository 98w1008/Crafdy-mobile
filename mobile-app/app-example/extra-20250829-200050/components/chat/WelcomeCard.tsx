/**
 * ウェルカムカードコンポーネント
 * 初回or当日最初の入室時のみ表示される挨拶カード
 * 現場情報とショートヒントを含む洗練されたUI
 */

import React from 'react'
import { View, StyleSheet, TouchableOpacity } from 'react-native'
import { Surface, Chip } from 'react-native-paper'
import { useColors, useSpacing, useRadius } from '@/theme/ThemeProvider'
import { StyledText, Icon } from '@/components/ui'
import { useAuth } from '@/contexts/AuthContext'
import * as Haptics from 'expo-haptics'

// =============================================================================
// TYPES
// =============================================================================

interface WelcomeCardProps {
  /** 現在選択中のプロジェクト */
  currentProject: {
    id: string
    name: string
    status: 'active' | 'completed' | 'pending'
  } | null
  /** カードを非表示にするコールバック */
  onDismiss: () => void
  /** プロジェクト選択を開くコールバック */
  onProjectSelect: () => void
}

interface QuickHint {
  icon: string
  text: string
  color: string
}

// =============================================================================
// CONSTANTS
// =============================================================================

const QUICK_HINTS: QuickHint[] = [
  { icon: 'message-text', text: '作業状況を質問してみてください', color: 'primary' },
  { icon: 'camera', text: 'レシートや写真で経費を記録できます', color: 'success' },
  { icon: 'clipboard-text', text: '日報作成を簡単にサポートします', color: 'warning' },
]

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function WelcomeCard({ 
  currentProject, 
  onDismiss, 
  onProjectSelect 
}: WelcomeCardProps) {
  const { user } = useAuth()
  const colors = useColors()
  const spacing = useSpacing()
  const radius = useRadius()

  const userName = user?.user_metadata?.full_name || 'ユーザー'
  const currentHour = new Date().getHours()
  
  // 時間帯に応じた挨拶
  const getGreeting = () => {
    if (currentHour < 6) return '深夜'
    if (currentHour < 10) return 'おはよう'
    if (currentHour < 18) return 'お疲れ様'
    return 'お疲れ様'
  }

  const getGreetingSuffix = () => {
    if (currentHour < 6) return 'の作業ですね'
    if (currentHour < 10) return 'ございます'
    if (currentHour < 18) return 'です'
    return 'でした'
  }

  const handleDismiss = () => {
    if (Haptics) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    }
    onDismiss()
  }

  const handleProjectPillPress = () => {
    if (Haptics) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    }
    onProjectSelect()
  }

  const styles = createStyles(colors, spacing, radius)

  return (
    <Surface style={styles.container} elevation={1}>
      {/* ヘッダー部分 */}
      <View style={styles.header}>
        <View style={styles.greetingSection}>
          <Icon 
            name="hand-wave" 
            size={20} 
            color="primary" 
            style={styles.greetingIcon} 
          />
          <StyledText variant="subheading" weight="semibold" color="primary">
            {getGreeting()}{userName}さん{getGreetingSuffix()}
          </StyledText>
        </View>
        
        <TouchableOpacity 
          onPress={handleDismiss}
          style={styles.dismissButton}
          accessibilityLabel="ウェルカムカードを閉じる"
          accessibilityRole="button"
        >
          <Icon name="close" size={16} color="secondary" />
        </TouchableOpacity>
      </View>

      {/* 現場ピル */}
      <View style={styles.projectSection}>
        <StyledText variant="caption" weight="medium" color="secondary">
          現在の現場
        </StyledText>
        
        <TouchableOpacity 
          style={styles.projectPill}
          onPress={handleProjectPillPress}
          accessibilityLabel="現場を変更"
          accessibilityRole="button"
        >
          <View style={styles.projectPillContent}>
            <Icon name="map-marker" size={14} color="primary" />
            <StyledText 
              variant="body" 
              weight="semibold" 
              color="primary"
              numberOfLines={1}
              style={styles.projectName}
            >
              {currentProject?.name || '現場を選択してください'}
            </StyledText>
            <Icon name="chevron-right" size={14} color="primary" />
          </View>
        </TouchableOpacity>
      </View>

      {/* ショートヒント */}
      <View style={styles.hintsSection}>
        <StyledText variant="caption" weight="medium" color="secondary">
          💡 今日のヒント
        </StyledText>
        
        <View style={styles.hintsContainer}>
          {QUICK_HINTS.map((hint, index) => (
            <View key={index} style={styles.hintItem}>
              <Icon 
                name={hint.icon} 
                size={12} 
                color={hint.color}
                style={styles.hintIcon}
              />
              <StyledText 
                variant="caption" 
                color="tertiary"
                style={styles.hintText}
              >
                {hint.text}
              </StyledText>
            </View>
          ))}
        </View>
      </View>
    </Surface>
  )
}

// =============================================================================
// STYLES
// =============================================================================

const createStyles = (colors: any, spacing: any, radius: any) => StyleSheet.create({
  container: {
    marginHorizontal: spacing[4],
    marginTop: spacing[3],
    marginBottom: spacing[2],
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing[5],
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing[4],
  },
  greetingSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  greetingIcon: {
    marginRight: spacing[2],
  },
  dismissButton: {
    padding: spacing[1],
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  projectSection: {
    marginBottom: spacing[4],
  },
  projectPill: {
    marginTop: spacing[2],
    backgroundColor: colors.primary.light,
    borderRadius: radius.xl,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderWidth: 1,
    borderColor: colors.primary.DEFAULT,
  },
  projectPillContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  projectName: {
    flex: 1,
    marginHorizontal: spacing[2],
  },
  hintsSection: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing[3],
  },
  hintsContainer: {
    marginTop: spacing[2],
  },
  hintItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing[1.5],
  },
  hintIcon: {
    marginRight: spacing[2],
    marginTop: spacing[0.5],
  },
  hintText: {
    flex: 1,
    lineHeight: 16,
  },
})

export default WelcomeCard