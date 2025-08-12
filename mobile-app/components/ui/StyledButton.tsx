import React, { useRef } from 'react'
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  Animated,
  Platform,
} from 'react-native'
import * as Haptics from 'expo-haptics'
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '@/constants/GrayDesignTokens'

export interface StyledButtonProps {
  title: string
  onPress: () => void
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success' | 'premium'
  size?: 'sm' | 'md' | 'lg' | 'xl'
  disabled?: boolean
  loading?: boolean
  fullWidth?: boolean
  style?: ViewStyle
  textStyle?: TextStyle
  hapticFeedback?: boolean
  icon?: React.ReactNode
  iconPosition?: 'left' | 'right'
  elevated?: boolean
  gradient?: boolean
}

export default function StyledButton({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  fullWidth = false,
  style,
  textStyle,
  hapticFeedback = true,
  icon,
  iconPosition = 'left',
  elevated = false,
  gradient = false,
}: StyledButtonProps) {
  // 🎭 Animation hooks for delightful micro-interactions
  const scaleAnim = useRef(new Animated.Value(1)).current
  const opacityAnim = useRef(new Animated.Value(1)).current
  // 🎨 Enhanced button style system with emotional design
  const getButtonStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      borderRadius: (BorderRadius?.lg ?? 14),
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      overflow: 'hidden',
      // Enhanced touch target for accessibility
      minHeight: 44,
    }

    // 🎯 Size system - Following international accessibility standards
    const sizeStyles: Record<string, ViewStyle> = {
      sm: {
        height: 40,
        paddingHorizontal: (Spacing?.md ?? 12),
      },
      md: {
        height: 48,
        paddingHorizontal: (Spacing?.lg ?? 16),
      },
      lg: {
        height: 56,
        paddingHorizontal: (Spacing?.xl ?? 20),
      },
      xl: {
        height: 64,
        paddingHorizontal: (Spacing?.['2xl'] ?? 24),
      },
    }

    // 🌟 Enhanced variant system with emotional resonance
    const variantStyles: Record<string, ViewStyle> = {
      primary: {
        backgroundColor: disabled ? (Colors.base?.surfaceSubtle ?? '#EEF1F6') : (Colors.primary?.DEFAULT ?? '#16A34A'),
        borderWidth: 0,
        ...(elevated && (Shadows?.lg ?? {})),
        ...(gradient && { 
          // Gradient handled by LinearGradient component 
          backgroundColor: 'transparent'
        }),
      },
      secondary: {
        backgroundColor: disabled ? (Colors.base?.surfaceSubtle ?? '#EEF1F6') : Colors.base.surfaceElevated,
        borderWidth: 1,
        borderColor: disabled ? Colors.border.light : Colors.border.DEFAULT,
        ...(Shadows?.sm ?? {}),
      },
      outline: {
        backgroundColor: Colors.base.surface,
        borderWidth: 2,
        borderColor: disabled ? Colors.border.light : (Colors.primary?.DEFAULT ?? '#16A34A'),
        ...(Shadows?.sm ?? {}),
      },
      ghost: {
        backgroundColor: 'transparent',
        borderWidth: 0,
      },
      danger: {
        backgroundColor: disabled ? (Colors.base?.surfaceSubtle ?? '#EEF1F6') : Colors.semantic.error,
        borderWidth: 0,
        ...(elevated && (Shadows?.lg ?? {})),
      },
      success: {
        backgroundColor: disabled ? (Colors.base?.surfaceSubtle ?? '#EEF1F6') : Colors.semantic.success,
        borderWidth: 0,
        ...(elevated && Shadows.md),
      },
      premium: {
        backgroundColor: disabled ? (Colors.base?.surfaceSubtle ?? '#EEF1F6') : Colors.accent.DEFAULT,
        borderWidth: 0,
        ...(Shadows?.xl ?? {}),
      },
    }

    return {
      ...baseStyle,
      ...sizeStyles[size],
      ...variantStyles[variant],
      ...(fullWidth && { width: '100%' }),
      ...(disabled && { opacity: 0.5 }),
    }
  }

  // 📝 Enhanced typography system
  const getTextStyle = (): TextStyle => {
    const baseStyle: TextStyle = {
      fontWeight: Typography.weights.semibold,
      textAlign: 'center',
      letterSpacing: 0.4, // Improved readability
    }

    // 🎯 Size-based text styling
    const sizeTextStyles: Record<string, TextStyle> = {
      sm: {
        fontSize: (Typography.sizes?.sm ?? 14),
        fontWeight: Typography.weights.medium,
      },
      md: {
        fontSize: (Typography.sizes?.base ?? 16),
        fontWeight: Typography.weights.semibold,
      },
      lg: {
        fontSize: (Typography.sizes?.lg ?? 20),
        fontWeight: Typography.weights.semibold,
      },
      xl: {
        fontSize: (Typography.sizes?.xl ?? 24),
        fontWeight: Typography.weights.bold,
      },
    }

    // 🌈 Variant-based text coloring with accessibility focus
    const variantTextStyles: Record<string, TextStyle> = {
      primary: {
        color: Colors.text.onPrimary,
      },
      secondary: {
        color: disabled ? Colors.text.disabled : Colors.text.primary,
      },
      outline: {
        color: disabled ? Colors.text.disabled : (Colors.primary?.DEFAULT ?? '#16A34A'),
      },
      ghost: {
        color: disabled ? Colors.text.disabled : (Colors.primary?.DEFAULT ?? '#16A34A'),
      },
      danger: {
        color: Colors.text.onPrimary,
      },
      success: {
        color: Colors.text.onPrimary,
      },
      premium: {
        color: Colors.text.onPrimary,
        letterSpacing: 0.6, // Premium spacing
      },
    }

    return {
      ...baseStyle,
      ...sizeTextStyles[size],
      ...variantTextStyles[variant],
    }
  }

  // 🎭 Micro-interaction handlers for delightful experiences
  const handlePressIn = () => {
    if (disabled || loading) return
    
    // Haptic feedback for premium feel
    if (hapticFeedback) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    }
    
    // Scale down animation
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0.8,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start()
  }

  const handlePressOut = () => {
    if (disabled || loading) return
    
    // Scale back to normal
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

  const handlePress = () => {
    if (disabled || loading) return
    
    // Enhanced haptic for actual press
    if (hapticFeedback) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    }
    
    onPress()
  }

  // 🎨 Render enhanced button with micro-interactions
  return (
    <TouchableOpacity
      activeOpacity={1} // We handle opacity with animations
      disabled={disabled || loading}
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{
        disabled: disabled || loading,
        busy: loading,
      }}
      style={style}
    >
      <Animated.View
        style={[
          getButtonStyle(),
          {
            transform: [{ scale: scaleAnim }],
            opacity: opacityAnim,
          },
        ]}
      >
        {loading ? (
          <ActivityIndicator
            size={size === 'sm' ? 'small' : 'small'}
            color={
              variant === 'outline' || variant === 'ghost' || variant === 'secondary'
                ? (Colors.primary?.DEFAULT ?? '#16A34A')
                : Colors.text.onPrimary
            }
          />
        ) : (
          <>
            {/* 🎯 Icon support with proper positioning */}
            {icon && iconPosition === 'left' && (
              <Animated.View style={{ marginRight: title ? Spacing.sm : 0 }}>
                {icon}
              </Animated.View>
            )}
            
            {/* 📱 Button text with enhanced typography */}
            {title && (
              <Text style={[getTextStyle(), textStyle]} numberOfLines={1}>
                {title}
              </Text>
            )}
            
            {icon && iconPosition === 'right' && (
              <Animated.View style={{ marginLeft: title ? Spacing.sm : 0 }}>
                {icon}
              </Animated.View>
            )}
          </>
        )}
      </Animated.View>
    </TouchableOpacity>
  )
}