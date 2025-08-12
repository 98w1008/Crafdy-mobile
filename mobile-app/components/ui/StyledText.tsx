import React from 'react'
import { Text, TextProps, TextStyle } from 'react-native'
import { Colors, Typography } from '@/design/tokens'

export interface StyledTextProps extends TextProps {
  variant?: 'heading1' | 'heading2' | 'heading3' | 'title' | 'subtitle' | 'body' | 'bodyLarge' | 'bodySmall' | 'caption' | 'overline' | 'display' | 'label'
  weight?: 'normal' | 'medium' | 'semibold' | 'bold'
  color?: 'text' | 'secondary' | 'tertiary' | 'accent' | 'inverse' | 'disabled' | 'onPrimary' | 'success' | 'warning' | 'error' | 'info' | 'primary' | 'confidence' | 'energy' | 'growth' | 'focus' | 'calm'
  align?: 'left' | 'center' | 'right' | 'justify'
  numberOfLines?: number
  animated?: boolean
  gradient?: boolean
  premium?: boolean
}

export default function StyledText({
  variant = 'body',
  weight = 'normal',
  color = 'text',
  align = 'left',
  animated = false,
  gradient = false,
  premium = false,
  style,
  ...textProps
}: StyledTextProps) {
  // 🎨 Enhanced typography system inspired by Material Design 3 & International standards
  const getTextStyle = (): TextStyle => {
    // 📝 Variant styles with enhanced readability and hierarchy
    const variantStyles: Record<string, TextStyle> = {
      display: {
        fontSize: (Typography.sizes?.xl ?? 24),
        lineHeight: (Typography.sizes?.xl ?? 24) * 1.2,
        fontWeight: '700',
        letterSpacing: -0.5,
      },
      heading1: {
        fontSize: (Typography.sizes?.xl ?? 24),
        lineHeight: (Typography.sizes?.xl ?? 24) * 1.2,
        fontWeight: '700',
        letterSpacing: -0.25,
      },
      heading2: {
        fontSize: (Typography.sizes?.lg ?? 20),
        lineHeight: (Typography.sizes?.lg ?? 20) * 1.2,
        fontWeight: '700',
        letterSpacing: 0,
      },
      heading3: {
        fontSize: (Typography.sizes?.md ?? 18),
        lineHeight: (Typography.sizes?.md ?? 18) * 1.5,
        fontWeight: '600',
        letterSpacing: 0,
      },
      title: {
        fontSize: (Typography.sizes?.md ?? 18),
        lineHeight: (Typography.sizes?.md ?? 18) * 1.5,
        fontWeight: '600',
        letterSpacing: 0.15,
      },
      subtitle: {
        fontSize: (Typography.sizes?.base ?? 16),
        lineHeight: (Typography.sizes?.base ?? 16) * 1.5,
        fontWeight: '500',
        letterSpacing: 0.1,
      },
      bodyLarge: {
        fontSize: (Typography.sizes?.base ?? 16),
        lineHeight: (Typography.sizes?.base ?? 16) * 1.6,
        fontWeight: '400',
        letterSpacing: 0.25,
      },
      body: {
        fontSize: (Typography.sizes?.base ?? 16),
        lineHeight: (Typography.sizes?.base ?? 16) * 1.5,
        fontWeight: '400',
        letterSpacing: 0.25,
      },
      bodySmall: {
        fontSize: (Typography.sizes?.sm ?? 14),
        lineHeight: (Typography.sizes?.sm ?? 14) * 1.5,
        fontWeight: '400',
        letterSpacing: 0.4,
      },
      label: {
        fontSize: (Typography.sizes?.sm ?? 14),
        lineHeight: (Typography.sizes?.sm ?? 14) * 1.2,
        fontWeight: '500',
        letterSpacing: 0.5,
      },
      caption: {
        fontSize: (Typography.sizes?.sm ?? 14),
        lineHeight: (Typography.sizes?.sm ?? 14) * 1.5,
        fontWeight: '400',
        letterSpacing: 0.4,
      },
      overline: {
        fontSize: (Typography.sizes?.xs ?? 12),
        lineHeight: (Typography.sizes?.xs ?? 12) * 1.2,
        fontWeight: '500',
        textTransform: 'uppercase',
        letterSpacing: 1.5,
      },
    }

    // Weight styles
    const weightStyles: Record<string, TextStyle> = {
      normal: { fontWeight: '400' },
      medium: { fontWeight: '500' },
      semibold: { fontWeight: '600' },
      bold: { fontWeight: '700' },
    }

    // Enhanced color system with safe fallbacks
    const colorStyles: Record<string, TextStyle> = {
      text: { color: (Colors.text?.primary ?? '#0F172A') },
      secondary: { color: (Colors.text?.secondary ?? '#475569') },
      tertiary: { color: (Colors.text?.secondary ?? '#475569') },
      accent: { color: (Colors.accent?.DEFAULT ?? '#6366F1') },
      inverse: { color: '#FFFFFF' },
      disabled: { color: '#9CA3AF' },
      onPrimary: { color: '#FFFFFF' },
      
      // Semantic colors  
      success: { color: (Colors.primary?.DEFAULT ?? '#16A34A') },
      warning: { color: '#F59E0B' },
      error: { color: '#EF4444' },
      info: { color: (Colors.secondary?.DEFAULT ?? '#0EA5E9') },
      primary: { color: (Colors.primary?.DEFAULT ?? '#16A34A') },
      
      // Construction industry colors
      confidence: { color: (Colors.primary?.DEFAULT ?? '#16A34A') },
      energy: { color: (Colors.secondary?.DEFAULT ?? '#0EA5E9') },
      growth: { color: (Colors.primary?.DEFAULT ?? '#16A34A') },
      focus: { color: (Colors.accent?.DEFAULT ?? '#6366F1') },
      calm: { color: (Colors.accent?.DEFAULT ?? '#6366F1') },
    }

    // 📐 Enhanced alignment system
    const alignStyles: Record<string, TextStyle> = {
      left: { textAlign: 'left' },
      center: { textAlign: 'center' },
      right: { textAlign: 'right' },
      justify: { textAlign: 'justify' },
    }

    // 🎨 Premium enhancements
    const premiumStyles: TextStyle = premium ? {
      textShadowColor: 'rgba(0, 0, 0, 0.1)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 2,
    } : {}

    return {
      ...variantStyles[variant],
      ...weightStyles[weight],
      ...colorStyles[color],
      ...alignStyles[align],
      ...premiumStyles,
    }
  }

  // 🎭 Enhanced text rendering with accessibility
  return (
    <Text 
      style={[getTextStyle(), style]} 
      accessible={true}
      accessibilityRole="text"
      {...textProps} 
    />
  )
}