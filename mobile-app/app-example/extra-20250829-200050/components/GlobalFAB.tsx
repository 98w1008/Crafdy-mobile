/**
 * 🚀 グローバルFAB（Floating Action Button）
 * 全画面共通の見積もり作成FAB
 */

import React from 'react'
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native'
import { router } from 'expo-router'
import { useColors, useSpacing, useRadius } from '@/theme/ThemeProvider'
import { StyledText, Icon } from '@/components/ui'
import * as Haptics from 'expo-haptics'

// =============================================================================
// TYPES
// =============================================================================

interface GlobalFABProps {
  /** 非表示にするか（特定の画面でFABを隠す場合） */
  hidden?: boolean
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * 右下固定のグローバルFAB
 * どの画面からでも見積もり作成画面に遷移可能
 */
export default function GlobalFAB({ hidden = false }: GlobalFABProps) {
  const colors = useColors()
  const spacing = useSpacing()
  const radius = useRadius()

  if (hidden) return null

  const handlePress = () => {
    if (Haptics) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    }
    router.push('/estimate/new')
  }

  const styles = createStyles(colors, spacing, radius)

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.fab}
        onPress={handlePress}
        activeOpacity={0.8}
        accessibilityLabel="見積もり作成"
        accessibilityHint="新しい見積もりを作成します"
        accessibilityRole="button"
      >
        <View style={styles.fabContent}>
          <Icon name="plus" size={20} color="onPrimary" />
          <StyledText variant="caption" color="onPrimary" weight="semibold">
            見積もり
          </StyledText>
        </View>
      </TouchableOpacity>
    </View>
  )
}

// =============================================================================
// STYLES
// =============================================================================

const createStyles = (colors: any, spacing: any, radius: any) => StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: spacing[6] + (Platform.OS === 'ios' ? 20 : 0), // iOSのHome Indicator考慮
    right: spacing[4],
    zIndex: 1000,
  },
  fab: {
    backgroundColor: colors.primary.DEFAULT,
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabContent: {
    alignItems: 'center',
    gap: spacing[0.5],
  },
})