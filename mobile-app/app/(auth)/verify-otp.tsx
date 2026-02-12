import { useMemo } from 'react'
import { router, useLocalSearchParams } from 'expo-router'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import VerifyOtpScreen from '@/ui/auth/VerifyOtpScreen'
import { useUiTheme } from '@/ui/theme'

export default function VerifyOtpRoute() {
  const params = useLocalSearchParams<{ channel?: string; identifier?: string; display?: string }>()
  const theme = useUiTheme()
  const fallbackStyles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
      justifyContent: 'center',
      alignItems: 'center',
      padding: theme.spacing.lg,
      gap: theme.spacing.md,
    },
    heading: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.h2,
      fontWeight: '600',
      textAlign: 'center',
    },
    body: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.body,
      textAlign: 'center',
    },
    button: {
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
      borderRadius: theme.radii.card,
      backgroundColor: theme.colors.accent,
    },
    buttonText: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.body,
      fontWeight: '600',
    },
  }), [theme])

  const channel = params.channel === 'phone' ? 'phone' : params.channel === 'email' ? 'email' : null
  const identifier = params.identifier ? String(params.identifier) : ''
  const display = params.display ? String(params.display) : ''

  if (!channel || !identifier) {
    return (
      <View style={fallbackStyles.container}>
        <Text style={fallbackStyles.heading}>コード情報が見つかりません</Text>
        <Text style={fallbackStyles.body}>
          もう一度コードを送信し直してください。
        </Text>
        <Pressable
          style={fallbackStyles.button}
          onPress={() => router.replace('/(auth)/login')}
        >
          <Text style={fallbackStyles.buttonText}>ログイン画面に戻る</Text>
        </Pressable>
      </View>
    )
  }

  return (
    <VerifyOtpScreen channel={channel} identifier={identifier} display={display || identifier} />
  )
}

