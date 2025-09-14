import React from 'react'
import { Text, TextProps, TextStyle } from 'react-native'
import { useColors, useTypography } from '@/theme/ThemeProvider'

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
  const colors = useColors()
  const typography = useTypography()
  
  const getTextStyle = (): TextStyle => {
    const variantStyles: Record<string, TextStyle> = {
      display: {
        fontSize: typography.fontSize['4xl'],
        lineHeight: typography.fontSize['4xl'] * typography.lineHeight.tight,
        fontWeight: typography.fontWeight.bold,
        letterSpacing: -0.5,
      },
      heading1: {
        fontSize: typography.fontSize['3xl'],
        lineHeight: typography.fontSize['3xl'] * typography.lineHeight.tight,
        fontWeight: typography.fontWeight.bold,
        letterSpacing: -0.25,
      },
      heading2: {
        fontSize: typography.fontSize['2xl'],
        lineHeight: typography.fontSize['2xl'] * typography.lineHeight.normal,
        fontWeight: typography.fontWeight.bold,
        letterSpacing: 0,
      },
      heading3: {
        fontSize: typography.fontSize.xl,
        lineHeight: typography.fontSize.xl * typography.lineHeight.normal,
        fontWeight: typography.fontWeight.semibold,
        letterSpacing: 0,
      },
      title: {
        fontSize: typography.fontSize.lg,
        lineHeight: typography.fontSize.lg * typography.lineHeight.normal,
        fontWeight: typography.fontWeight.semibold,
        letterSpacing: 0.15,
      },
      subtitle: {
        fontSize: typography.fontSize.base,
        lineHeight: typography.fontSize.base * typography.lineHeight.normal,
        fontWeight: typography.fontWeight.medium,
        letterSpacing: 0.1,
      },
      bodyLarge: {
        fontSize: typography.fontSize.base,
        lineHeight: typography.fontSize.base * typography.lineHeight.relaxed,
        fontWeight: typography.fontWeight.normal,
        letterSpacing: 0.25,
      },
      body: {
        fontSize: typography.fontSize.base,
        lineHeight: typography.fontSize.base * typography.lineHeight.normal,
        fontWeight: typography.fontWeight.normal,
        letterSpacing: 0.25,
      },
      bodySmall: {
        fontSize: typography.fontSize.sm,
        lineHeight: typography.fontSize.sm * typography.lineHeight.normal,
        fontWeight: typography.fontWeight.normal,
        letterSpacing: 0.4,
      },
      label: {
        fontSize: typography.fontSize.sm,
        lineHeight: typography.fontSize.sm * typography.lineHeight.tight,
        fontWeight: typography.fontWeight.medium,
        letterSpacing: 0.5,
      },
      caption: {
        fontSize: typography.fontSize.sm,
        lineHeight: typography.fontSize.sm * typography.lineHeight.normal,
        fontWeight: typography.fontWeight.normal,
        letterSpacing: 0.4,
      },
      overline: {
        fontSize: typography.fontSize.xs,
        lineHeight: typography.fontSize.xs * typography.lineHeight.tight,
        fontWeight: typography.fontWeight.medium,
        textTransform: 'uppercase',
        letterSpacing: 1.5,
      },
    }

    const weightStyles: Record<string, TextStyle> = {
      normal: { fontWeight: typography.fontWeight.normal },
      medium: { fontWeight: typography.fontWeight.medium },
      semibold: { fontWeight: typography.fontWeight.semibold },
      bold: { fontWeight: typography.fontWeight.bold },
    }

    const colorStyles: Record<string, TextStyle> = {
      text: { color: colors.text.primary },
      secondary: { color: colors.text.secondary },
      tertiary: { color: colors.text.secondary },
      accent: { color: colors.primary.DEFAULT },
      inverse: { color: colors.text.primary === '#0A0A0A' ? '#FFFFFF' : '#0A0A0A' },
      disabled: { color: '#9CA3AF' },
      onPrimary: { color: '#FFFFFF' },
      
      success: { color: '#10B981' },
      warning: { color: '#F59E0B' },
      error: { color: '#EF4444' },
      info: { color: '#3B82F6' },
      primary: { color: colors.primary.DEFAULT },
      
      confidence: { color: colors.primary.DEFAULT },
      energy: { color: '#3B82F6' },
      growth: { color: colors.primary.DEFAULT },
      focus: { color: colors.primary.DEFAULT },
      calm: { color: colors.primary.DEFAULT },
    }

    const alignStyles: Record<string, TextStyle> = {
      left: { textAlign: 'left' },
      center: { textAlign: 'center' },
      right: { textAlign: 'right' },
      justify: { textAlign: 'justify' },
    }

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