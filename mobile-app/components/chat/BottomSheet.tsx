import React, { useEffect, useRef } from 'react'
import { View, StyleSheet, AccessibilityInfo, Pressable, Platform } from 'react-native'
import Animated, { useAnimatedStyle, useSharedValue, withSpring, runOnJS } from 'react-native-reanimated'
import { PanGestureHandler } from 'react-native-gesture-handler'

interface BottomSheetProps {
  visible: boolean
  onClose: () => void
  children: React.ReactNode
  ariaLabel?: string
}

export default function BottomSheet({ visible, onClose, children, ariaLabel }: BottomSheetProps) {
  const translateY = useSharedValue(1000)
  const opened = useRef(false)

  useEffect(() => {
    if (visible) {
      translateY.value = withSpring(0, { damping: 18 })
      if (!opened.current && ariaLabel) AccessibilityInfo.announceForAccessibility?.(ariaLabel)
      opened.current = true
    } else {
      translateY.value = withSpring(1000)
    }
  }, [visible])

  const onDragEnd = (dy: number) => {
    if (dy > 120) onClose()
  }

  const stylez = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }))

  return (
    <View pointerEvents={visible ? 'auto' : 'none'} style={StyleSheet.absoluteFill} accessibilityLabel={ariaLabel}>
      {visible && (
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="閉じる" />
      )}
      <PanGestureHandler
        onGestureEvent={(e: any) => {
          const dy = Math.max(0, e.nativeEvent.translationY)
          translateY.value = dy
        }}
        onEnded={(e: any) => runOnJS(onDragEnd)(e.nativeEvent.translationY)}
      >
        <Animated.View style={[styles.sheet, stylez]}
          accessibilityRole="adjustable"
          accessibilityLabel={ariaLabel || '下部シート'}
        >
          <View style={styles.handle} />
          <View style={styles.content}>{children}</View>
        </Animated.View>
      </PanGestureHandler>
    </View>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)'
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    backgroundColor: Platform.select({ ios: '#111827', android: '#111827', default: '#111827' }),
    minHeight: 120,
    maxHeight: '90%'
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E5E7EB',
    alignSelf: 'center',
    marginVertical: 8
  },
  content: {
    padding: 16
  }
})

