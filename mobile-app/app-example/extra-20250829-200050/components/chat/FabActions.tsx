/**
 * FabActions - 実行アクション専用FAB
 * クイックプロンプトと分離して、直接アクション実行に特化
 * 洗練されたデザインで6つの主要アクションを提供
 */

import React, { useState } from 'react'
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Animated,
} from 'react-native'
import { Surface } from 'react-native-paper'
import { router } from 'expo-router'
import { useColors, useSpacing, useRadius } from '@/theme/ThemeProvider'
import { StyledText, Icon } from '@/components/ui'
import * as Haptics from 'expo-haptics'

// =============================================================================
// TYPES
// =============================================================================

interface FabAction {
  id: string
  /** アクション名 */
  label: string
  /** アイコン名 */
  icon: string
  /** 遷移先ルート */
  route: string
  /** カラー（primary/secondary/success/warning/error） */
  color: 'primary' | 'secondary' | 'success' | 'warning' | 'error'
  /** 説明文 */
  description: string
}

interface FabActionsProps {
  /** FABを非表示にするか */
  hidden?: boolean
  /** 現在のルート（特定画面では非表示にする） */
  currentRoute?: string
}

// =============================================================================
// CONSTANTS
// =============================================================================

const FAB_ACTIONS: FabAction[] = [
  {
    id: 'daily-report',
    label: '日報作成',
    icon: 'note-edit',
    route: '/daily-report/new',
    color: 'primary',
    description: '今日の作業内容を報告',
  },
  {
    id: 'attendance',
    label: '勤怠集計',
    icon: 'calendar-check',
    route: '/attendance/summary',
    color: 'secondary',
    description: '勤務時間を確認・集計',
  },
  {
    id: 'estimate',
    label: '見積作成',
    icon: 'calculator',
    route: '/estimate/new',
    color: 'success',
    description: '新しい見積を作成',
  },
  {
    id: 'invoice',
    label: '請求書作成',
    icon: 'file-invoice',
    route: '/invoice/create',
    color: 'warning',
    description: '請求書を発行',
  },
  {
    id: 'receipt-scan',
    label: 'レシート撮影',
    icon: 'camera',
    route: '/scan/receipt',
    color: 'error',
    description: '経費のレシートを記録',
  },
  {
    id: 'new-project',
    label: '新規現場登録',
    icon: 'plus-box',
    route: '/project/new',
    color: 'primary',
    description: '新しい現場を登録',
  },
]

// 非表示にするルートのリスト
const HIDDEN_ROUTES = [
  '/estimate/new',
  '/daily-report/new',
  '/invoice/create',
  '/scan',
  '/project/new',
]

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function FabActions({ hidden = false, currentRoute }: FabActionsProps) {
  const colors = useColors()
  const spacing = useSpacing()
  const radius = useRadius()
  
  const [isOpen, setIsOpen] = useState(false)
  const [animation] = useState(new Animated.Value(0))

  // 現在のルートに基づいて非表示判定
  const shouldHide = hidden || (currentRoute && HIDDEN_ROUTES.includes(currentRoute))

  if (shouldHide) return null

  // FABメニューの開閉アニメーション
  const toggleMenu = () => {
    const toValue = isOpen ? 0 : 1
    
    if (Haptics) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    }
    
    Animated.spring(animation, {
      toValue,
      useNativeDriver: true,
      tension: 100,
      friction: 8,
    }).start()
    
    setIsOpen(!isOpen)
  }

  // アクション実行
  const handleActionPress = (action: FabAction) => {
    if (Haptics) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    }
    
    // メニューを閉じる
    setIsOpen(false)
    Animated.spring(animation, {
      toValue: 0,
      useNativeDriver: true,
      tension: 100,
      friction: 8,
    }).start()
    
    // ルートに遷移
    router.push(action.route)
  }

  const styles = createStyles(colors, spacing, radius)

  // アクション項目のアニメーション値を計算
  const getActionStyle = (index: number) => {
    const translateY = animation.interpolate({
      inputRange: [0, 1],
      outputRange: [0, -(60 + index * 55)], // 各アクション間の距離
    })
    
    const opacity = animation.interpolate({
      inputRange: [0, 0.3, 1],
      outputRange: [0, 0.5, 1],
    })
    
    const scale = animation.interpolate({
      inputRange: [0, 1],
      outputRange: [0.3, 1],
    })

    return {
      transform: [{ translateY }, { scale }],
      opacity,
    }
  }

  return (
    <View style={styles.container}>
      {/* アクションメニュー項目 */}
      {FAB_ACTIONS.map((action, index) => (
        <Animated.View
          key={action.id}
          style={[styles.actionContainer, getActionStyle(index)]}
        >
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleActionPress(action)}
            activeOpacity={0.8}
            accessibilityLabel={action.label}
            accessibilityHint={action.description}
            accessibilityRole="button"
          >
            <Surface style={[styles.actionSurface, { backgroundColor: colors[action.color].light }]} elevation={2}>
              <Icon 
                name={action.icon} 
                size={20} 
                color={action.color}
              />
            </Surface>
            <StyledText 
              variant="caption" 
              weight="semibold" 
              color="primary"
              style={styles.actionLabel}
            >
              {action.label}
            </StyledText>
          </TouchableOpacity>
        </Animated.View>
      ))}

      {/* バックドロップ（メニューが開いている時の背景） */}
      {isOpen && (
        <TouchableOpacity 
          style={styles.backdrop}
          onPress={toggleMenu}
          activeOpacity={1}
        />
      )}

      {/* メインFAB */}
      <TouchableOpacity
        style={styles.mainFab}
        onPress={toggleMenu}
        activeOpacity={0.8}
        accessibilityLabel={isOpen ? 'アクションメニューを閉じる' : 'アクションメニューを開く'}
        accessibilityRole="button"
      >
        <Surface style={styles.mainFabSurface} elevation={6}>
          <Animated.View
            style={{
              transform: [{
                rotate: animation.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0deg', '45deg'],
                })
              }]
            }}
          >
            <Icon 
              name={isOpen ? 'close' : 'plus'} 
              size={24} 
              color="onPrimary"
            />
          </Animated.View>
          <StyledText 
            variant="caption" 
            color="onPrimary" 
            weight="semibold"
            style={styles.mainFabText}
          >
            アクション
          </StyledText>
        </Surface>
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
    bottom: spacing[6] + (Platform.OS === 'ios' ? 20 : 0),
    right: spacing[4],
    zIndex: 1000,
    alignItems: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    zIndex: -1,
  },
  actionContainer: {
    marginBottom: spacing[2],
    alignItems: 'flex-end',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    paddingLeft: spacing[3],
    paddingRight: spacing[2],
    paddingVertical: spacing[1.5],
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionSurface: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: spacing[2],
  },
  actionLabel: {
    marginRight: spacing[3],
    minWidth: 70,
    textAlign: 'right',
  },
  mainFab: {
    width: 80,
    height: 80,
  },
  mainFabSurface: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary.DEFAULT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mainFabText: {
    marginTop: spacing[0.5],
    fontSize: 10,
  },
})

export default FabActions