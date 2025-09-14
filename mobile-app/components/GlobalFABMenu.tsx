/**
 * グローバルFABメニュー - 右下の+メニュー
 * 各種作業を3タップ以内で実行可能
 */

import React, { useState } from 'react'
import { Platform, StyleSheet } from 'react-native'
import { FAB, Portal } from 'react-native-paper'
import { router, usePathname } from 'expo-router'
import * as Haptics from 'expo-haptics'

// =============================================================================
// TYPES
// =============================================================================

interface FABAction {
  icon: string
  label: string
  onPress: () => void
  color?: string
}

// =============================================================================
// MAIN COMPONENT  
// =============================================================================

export function GlobalFABMenu() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  // FABを非表示にする画面
  const hiddenRoutes = [
    '/estimate/new',
    '/daily-report/new', 
    '/attendance/summary',
    '/invoice/new',
    '/receipt-scan',
    '/settings'
  ]
  
  const shouldHide = hiddenRoutes.some(route => pathname.includes(route))

  if (shouldHide) return null

  // Haptic Feedback付きの共通ハンドラ
  const handleActionPress = (action: () => void) => {
    return () => {
      if (Haptics) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      }
      setOpen(false)
      action()
    }
  }

  // FABアクション定義
  const actions: FABAction[] = [
    {
      icon: 'note-plus',
      label: '日報作成',
      onPress: handleActionPress(() => router.push('/daily-report/new')),
    },
    {
      icon: 'calendar-check', 
      label: '勤怠集計',
      onPress: handleActionPress(() => router.push('/attendance/summary')),
    },
    {
      icon: 'file-document',
      label: '見積作成', 
      onPress: handleActionPress(() => router.push('/estimate/new')),
    },
    {
      icon: 'file-invoice',
      label: '請求書作成',
      onPress: handleActionPress(() => router.push('/invoice/new')),
    },
    {
      icon: 'camera',
      label: 'レシート/搬入撮影',
      onPress: handleActionPress(() => router.push('/receipt-scan')),
    },
    {
      icon: 'domain-plus',
      label: '新規現場登録',
      onPress: handleActionPress(() => router.push('/new-project')),
    },
  ]

  const handleFABPress = () => {
    if (Haptics) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    }
    setOpen(!open)
  }

  return (
    <Portal>
      <FAB.Group
        open={open}
        visible={true}
        icon={open ? 'close' : 'plus'}
        actions={actions}
        onStateChange={({ open }) => setOpen(open)}
        onPress={handleFABPress}
        style={styles.fabGroup}
        fabStyle={styles.fab}
        backdropColor="rgba(0, 0, 0, 0.5)"
        variant="primary"
        theme={{
          colors: {
            primary: '#007AFF',
            onPrimary: '#FFFFFF',
            surface: '#FFFFFF',
            onSurface: '#000000',
          },
        }}
      />
    </Portal>
  )
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  fabGroup: {
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
    paddingRight: 16,
  },
  fab: {
    backgroundColor: '#007AFF',
    borderRadius: 28,
  },
})