import React, { useEffect, useRef } from 'react'
import { View, Animated, StyleSheet } from 'react-native'
import { useColors, useSpacing } from '@/theme/ThemeProvider'

interface TypingDotsProps {
  visible?: boolean
  size?: number
}

export function TypingDots({ visible = true, size = 8 }: TypingDotsProps) {
  const colors = useColors()
  const spacing = useSpacing()
  
  const dot1 = useRef(new Animated.Value(0)).current
  const dot2 = useRef(new Animated.Value(0)).current
  const dot3 = useRef(new Animated.Value(0)).current

  useEffect(() => {
    if (!visible) return

    const createAnimation = (animatedValue: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(animatedValue, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(animatedValue, {
            toValue: 0,
            duration: 600,
            useNativeDriver: true,
          }),
        ])
      )
    }

    const animations = [
      createAnimation(dot1, 0),
      createAnimation(dot2, 200), 
      createAnimation(dot3, 400),
    ]

    Animated.parallel(animations).start()

    return () => {
      animations.forEach(anim => anim.stop())
    }
  }, [visible, dot1, dot2, dot3])

  if (!visible) return null

  const dotStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
    backgroundColor: colors.text.secondary,
    marginHorizontal: spacing[1],
  }

  return (
    <View style={[styles.container, { padding: spacing[3] }]}>
      <View style={styles.dotsContainer}>
        <Animated.View 
          style={[
            dotStyle,
            {
              opacity: dot1,
              transform: [{
                scale: dot1.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.8, 1.2],
                })
              }]
            }
          ]} 
        />
        <Animated.View 
          style={[
            dotStyle,
            {
              opacity: dot2,
              transform: [{
                scale: dot2.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.8, 1.2],
                })
              }]
            }
          ]} 
        />
        <Animated.View 
          style={[
            dotStyle,
            {
              opacity: dot3,
              transform: [{
                scale: dot3.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.8, 1.2],
                })
              }]
            }
          ]} 
        />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'flex-start',
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
})

export default TypingDots