/**
 * 🏡 Crafty Mobile - Greeting Card
 * 「お疲れ様です○○さん」挨拶カード
 * Instagram/X/ChatGPTスタイルの「最初だけ」表示システム
 */

import React from 'react'
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native'
import { useColors, useSpacing, useRadius } from '@/theme/ThemeProvider'
import { StyledText, Card, Icon } from '@/components/ui'
import { useAuth } from '@/contexts/AuthContext'

// =============================================================================
// TYPES
// =============================================================================

interface GreetingCardProps {
  /** カードが表示されるか */
  visible: boolean
  /** カードを非表示にするハンドラ */
  onHide: () => void
  /** ユーザー名（オプション） */
  userName?: string
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * 挨拶カードコンポーネント
 * 「お疲れ様です○○さん」を表示し、ユーザー操作で非表示になる
 */
export default function GreetingCard({ visible, onHide, userName }: GreetingCardProps) {
  const colors = useColors()
  const spacing = useSpacing()
  const radius = useRadius()
  const { profile } = useAuth()

  // 非表示時は何もレンダリングしない（余白を詰める）
  if (!visible) return null

  // 時間帯に応じた挨拶を取得
  const getGreetingMessage = () => {
    const hour = new Date().getHours()
    const name = userName || profile?.full_name || 'さん'
    
    if (hour < 10) {
      return `おはようございます、${name}！`
    } else if (hour < 17) {
      return `お疲れ様です、${name}！`
    } else {
      return `お疲れ様でした、${name}！`
    }
  }

  const styles = createStyles(colors, spacing, radius)

  return (
    <Animated.View style={styles.container}>
      <TouchableOpacity
        onPress={onHide}
        activeOpacity={0.9}
        style={styles.touchable}
      >
        <Card variant="elevated" padding="lg" style={styles.card}>
          <View style={styles.header}>
            <Icon name="user" size={20} color="primary" style={styles.wave} />
            <StyledText variant="title" weight="semibold" style={styles.greeting}>
              {getGreetingMessage()}
            </StyledText>
          </View>
          
          <StyledText variant="body" color="secondary" style={styles.description}>
            今日も現場での作業、お疲れ様です。
            {'\n'}Craftyで効率的に作業を進めましょう！
          </StyledText>
          
          <View style={styles.actions}>
            <View style={styles.quickAction}>
              <Icon name="message" size={16} color="textSecondary" />
              <StyledText variant="caption" weight="medium">チャット</StyledText>
            </View>
            <View style={styles.quickAction}>
              <Icon name="chart" size={16} color="textSecondary" />
              <StyledText variant="caption" weight="medium">見積もり</StyledText>
            </View>
            <View style={styles.quickAction}>
              <Icon name="clipboard" size={16} color="textSecondary" />
              <StyledText variant="caption" weight="medium">タスク</StyledText>
            </View>
          </View>

          <StyledText variant="caption" color="secondary" style={styles.hint}>
            タップすると非表示になります
          </StyledText>
        </Card>
      </TouchableOpacity>
    </Animated.View>
  )
}

// =============================================================================
// STYLES
// =============================================================================

const createStyles = (colors: any, spacing: any, radius: any) => StyleSheet.create({
  container: {
    marginHorizontal: spacing[4],
    marginBottom: spacing[4],
  },
  touchable: {
    borderRadius: radius.DEFAULT,
  },
  card: {
    borderColor: colors.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  wave: {
    marginRight: spacing[2],
  },
  greeting: {
    flex: 1,
  },
  description: {
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing[4],
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: spacing[2],
    marginBottom: spacing[2],
  },
  quickAction: {
    alignItems: 'center',
    flex: 1,
    gap: spacing[1],
  },
  hint: {
    textAlign: 'center',
    marginTop: spacing[2],
  },
})