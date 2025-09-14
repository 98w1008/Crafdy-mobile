import React, { useState } from 'react'
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  TextInputProps,
} from 'react-native'
import { Colors, Typography, Spacing, BorderRadius } from '@/constants/Colors'

export interface StyledInputProps extends TextInputProps {
  label?: string
  error?: string
  hint?: string
  variant?: 'default' | 'filled' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  fullWidth?: boolean
  containerStyle?: ViewStyle
  inputStyle?: TextStyle
  labelStyle?: TextStyle
}

export default function StyledInput({
  label,
  error,
  hint,
  variant = 'outline',
  size = 'md',
  fullWidth = true,
  containerStyle,
  inputStyle,
  labelStyle,
  ...textInputProps
}: StyledInputProps) {
  const [isFocused, setIsFocused] = useState(false)

  const getContainerStyle = (): ViewStyle => {
    return {
      ...(fullWidth && { width: '100%' }),
    }
  }

  const getInputContainerStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      borderRadius: BorderRadius.lg,
      flexDirection: 'row',
      alignItems: 'center',
    }

    // Size styles
    const sizeStyles: Record<string, ViewStyle> = {
      sm: {
        height: 40,
        paddingHorizontal: Spacing.sm,
      },
      md: {
        height: 48,
        paddingHorizontal: Spacing.md,
      },
      lg: {
        height: 56,
        paddingHorizontal: Spacing.lg,
      },
    }

    // Variant styles
    const variantStyles: Record<string, ViewStyle> = {
      default: {
        backgroundColor: Colors.surface,
        borderWidth: 0,
      },
      filled: {
        backgroundColor: Colors.surfaceGray,
        borderWidth: 0,
      },
      outline: {
        backgroundColor: Colors.surface,
        borderWidth: 1,
        borderColor: error
          ? Colors.error
          : isFocused
          ? Colors.primary
          : Colors.border,
      },
    }

    return {
      ...baseStyle,
      ...sizeStyles[size],
      ...variantStyles[variant],
    }
  }

  const getInputStyle = (): TextStyle => {
    const baseStyle: TextStyle = {
      flex: 1,
      fontSize: Typography.base,
      color: Colors.textMain,
      fontWeight: Typography.weights.normal,
    }

    // Size text styles
    const sizeTextStyles: Record<string, TextStyle> = {
      sm: {
        fontSize: Typography.sm,
      },
      md: {
        fontSize: Typography.base,
      },
      lg: {
        fontSize: Typography.lg,
      },
    }

    return {
      ...baseStyle,
      ...sizeTextStyles[size],
    }
  }

  const getLabelStyle = (): TextStyle => {
    return {
      fontSize: Typography.sm,
      fontWeight: Typography.weights.medium,
      color: Colors.textMain,
      marginBottom: Spacing.xs,
    }
  }

  const getErrorStyle = (): TextStyle => {
    return {
      fontSize: Typography.sm,
      color: Colors.error,
      marginTop: Spacing.xs,
    }
  }

  const getHintStyle = (): TextStyle => {
    return {
      fontSize: Typography.sm,
      color: Colors.textSecondary,
      marginTop: Spacing.xs,
    }
  }

  return (
    <View style={[getContainerStyle(), containerStyle]}>
      {label && (
        <Text style={[getLabelStyle(), labelStyle]}>{label}</Text>
      )}
      
      <View style={getInputContainerStyle()}>
        <TextInput
          style={[getInputStyle(), inputStyle]}
          placeholderTextColor={Colors.textTertiary}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          {...textInputProps}
        />
      </View>

      {error && (
        <Text style={getErrorStyle()}>{error}</Text>
      )}
      
      {!error && hint && (
        <Text style={getHintStyle()}>{hint}</Text>
      )}
    </View>
  )
}