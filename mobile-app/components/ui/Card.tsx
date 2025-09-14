import React, { useRef } from 'react'
import {
  View,
  ViewStyle,
  TouchableOpacity,
  TouchableOpacityProps,
  Animated,
} from 'react-native'
import * as Haptics from 'expo-haptics'
import { useColors, useSpacing, useRadius, useShadows } from '@/theme/ThemeProvider'

export interface CardProps extends TouchableOpacityProps {
  children: React.ReactNode
  variant?: 'default' | 'elevated' | 'outlined' | 'filled' | 'glass' | 'premium' | 'minimal'
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'
  margin?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'
  radius?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full'
  pressable?: boolean
  style?: ViewStyle
  hapticFeedback?: boolean
  animationScale?: number
  elevationLevel?: 1 | 2 | 3 | 4 | 5
  glowEffect?: boolean
}

export default function Card({
  children,
  variant = 'elevated',
  padding = 'lg',
  margin = 'none',
  radius = 'lg',
  pressable = false,
  style,
  hapticFeedback = true,
  animationScale = 0.98,
  elevationLevel = 2,
  glowEffect = false,
  ...touchableProps
}: CardProps) {
  const colors = useColors()
  const spacing = useSpacing()
  const radiusTokens = useRadius()
  const shadows = useShadows()
  
  const scaleAnim = useRef(new Animated.Value(1)).current
  const opacityAnim = useRef(new Animated.Value(1)).current
  
  const getCardStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      backgroundColor: colors.surface,
      overflow: 'hidden',
    }

    const paddingStyles: Record<string, ViewStyle> = {
      none: {},
      sm: { padding: spacing[2] },
      md: { padding: spacing[4] },
      lg: { padding: spacing[6] },
      xl: { padding: spacing[8] },
      '2xl': { padding: spacing[10] },
    }

    const marginStyles: Record<string, ViewStyle> = {
      none: {},
      sm: { margin: spacing[2] },
      md: { margin: spacing[4] },
      lg: { margin: spacing[6] },
      xl: { margin: spacing[8] },
      '2xl': { margin: spacing[10] },
    }

    const radiusStyles: Record<string, ViewStyle> = {
      none: { borderRadius: radiusTokens.none },
      sm: { borderRadius: radiusTokens.sm },
      md: { borderRadius: radiusTokens.DEFAULT },
      lg: { borderRadius: radiusTokens.lg },
      xl: { borderRadius: radiusTokens.xl },
      '2xl': { borderRadius: radiusTokens.xl },
      full: { borderRadius: radiusTokens.full },
    }

    const elevationShadows = [shadows.sm, shadows.md, shadows.lg, shadows.lg, shadows.lg]
    const selectedShadow = elevationShadows[elevationLevel - 1] || shadows.md

    const variantStyles: Record<string, ViewStyle> = {
      default: {
        backgroundColor: colors.surface,
      },
      elevated: {
        backgroundColor: colors.surface,
        ...selectedShadow,
      },
      outlined: {
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        ...(pressable && shadows.sm),
      },
      filled: {
        backgroundColor: colors.background.secondary,
      },
      glass: {
        backgroundColor: `${colors.surface}CC`,
        borderWidth: 1,
        borderColor: `${colors.border}33`,
        ...shadows.lg,
      },
      premium: {
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: `${colors.primary.DEFAULT}33`,
        ...shadows.lg,
        ...(glowEffect && {
          shadowColor: colors.primary.DEFAULT,
          shadowOpacity: 0.2,
        }),
      },
      minimal: {
        backgroundColor: 'transparent',
        borderWidth: 0,
      },
    }

    return {
      ...baseStyle,
      ...paddingStyles[padding],
      ...marginStyles[margin],
      ...radiusStyles[radius],
      ...variantStyles[variant],
    }
  }

  // 🎭 Micro-interaction handlers
  const handlePressIn = () => {
    if (!pressable) return
    
    if (hapticFeedback) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    }
    
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: animationScale,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0.9,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start()
  }

  const handlePressOut = () => {
    if (!pressable) return
    
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start()
  }

  // 🎨 Enhanced rendering with micro-interactions
  if (pressable) {
    return (
      <TouchableOpacity
        activeOpacity={1} // We handle opacity with animations
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        accessible={true}
        accessibilityRole="button"
        style={style}
        {...touchableProps}
      >
        <Animated.View
          style={[
            getCardStyle(),
            {
              transform: [{ scale: scaleAnim }],
              opacity: opacityAnim,
            },
          ]}
        >
          {children}
        </Animated.View>
      </TouchableOpacity>
    )
  }

  // 🏞️ Static card with beautiful design
  return (
    <View style={[getCardStyle(), style]}>
      {children}
    </View>
  )
}