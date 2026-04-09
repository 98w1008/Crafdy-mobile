import React, { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { useRouter } from 'expo-router'

import { Colors, Spacing, Typography, BorderRadius } from '@/constants/Colors'
import { redeemInviteCode } from '@/lib/invite-code-store'

const reasonText = (reason: 'invalid' | 'expired' | 'used' | 'revoked') => {
  switch (reason) {
    case 'expired':
      return 'この招待コードは期限切れです。代表に新しいコードを依頼してください。'
    case 'used':
      return 'この招待コードは使用済みです。代表に新しいコードを依頼してください。'
    case 'revoked':
      return 'この招待コードは無効化されています。代表に確認してください。'
    default:
      return '招待コードが正しくありません。'
  }
}

export default function JoinByCodeScreen() {
  const router = useRouter()
  const [code, setCode] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState<string>('')

  const canSubmit = code.trim().length > 0 && status !== 'loading'

  const handleSubmit = async () => {
    const trimmed = code.trim()
    if (!trimmed) return

    setStatus('loading')
    setMessage('')
    try {
      const res = await redeemInviteCode(trimmed)
      if (res.ok) {
        setStatus('success')
        setMessage('参加しました。次に、担当の現場を確認してください。')
        router.replace('/member-setup')
        return
      }

      setStatus('error')
      setMessage(reasonText(res.reason))
    } catch {
      setStatus('error')
      setMessage('参加に失敗しました。時間をおいて再度お試しください。')
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>招待コードで参加</Text>
          <Text style={styles.headerSubtitle}>職長・従業員の方は、代表から共有された招待コードを入力してください。</Text>
        </View>

        <View style={styles.body}>
          <Text style={styles.label}>招待コード</Text>
          <TextInput
            style={styles.input}
            value={code}
            onChangeText={setCode}
            placeholder="例）TEST1234"
            placeholderTextColor={Colors.dark.text.tertiary}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={32}
          />

          {!!message && (
            <Text style={[styles.message, status === 'success' ? styles.messageSuccess : styles.messageError]}>
              {message}
            </Text>
          )}

          <TouchableOpacity
            style={[styles.primaryButton, !canSubmit && styles.primaryButtonDisabled]}
            disabled={!canSubmit}
            onPress={handleSubmit}
            accessibilityLabel="参加する"
          >
            <Text style={styles.primaryButtonText}>{status === 'loading' ? '参加中…' : '参加する'}</Text>
          </TouchableOpacity>

          <Text style={styles.help}>
            ※ 招待コードが無い場合は、代表に発行してもらってください。
          </Text>
          <Text style={styles.help}>
            ※ この参加は「職長・従業員（member）」としての参加を想定しています（現場の閲覧/入力は割当された現場のみ）。
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background.primary,
  },
  header: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border.primary,
  },
  headerTitle: {
    color: Colors.dark.text.primary,
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.semibold,
  },
  headerSubtitle: {
    color: Colors.dark.text.secondary,
    fontSize: Typography.sizes.sm,
    marginTop: 6,
  },
  body: {
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  label: {
    color: Colors.dark.text.secondary,
    fontSize: Typography.sizes.xs,
  },
  input: {
    backgroundColor: Colors.dark.background.secondary,
    borderWidth: 1,
    borderColor: Colors.dark.border.primary,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    color: Colors.dark.text.primary,
    fontSize: Typography.sizes.md,
  },
  message: {
    fontSize: Typography.sizes.sm,
    marginTop: 4,
  },
  messageSuccess: {
    color: Colors.success,
  },
  messageError: {
    color: Colors.warning,
  },
  primaryButton: {
    marginTop: Spacing.sm,
    backgroundColor: Colors.accent,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  primaryButtonDisabled: {
    opacity: 0.5,
  },
  primaryButtonText: {
    color: Colors.light.text.primary,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
  },
  help: {
    color: Colors.dark.text.secondary,
    fontSize: Typography.sizes.xs,
    marginTop: Spacing.sm,
  },
})
