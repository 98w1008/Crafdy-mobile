import React, { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import Feather from '@expo/vector-icons/Feather'
import Ionicons from '@expo/vector-icons/Ionicons'
import { supabase, supabaseReady } from '@/lib/supabase'
import { router, useLocalSearchParams } from 'expo-router'

/**
 * ログイン画面
 * Figma正本: Crafdyauthdesign/src/app/components/LoginScreen.tsx
 *
 * 再現対象:
 * - 背景: #0A1628 → #0D1B33 → #0A1628 縦グラデーション
 * - 戻るボタン: ArrowLeft + "戻る"
 * - ロゴ: 56×56 rounded-2xl グラデーション + Sparkles
 * - タイトル: "ログイン" / サブ: "アカウントにサインイン"
 * - Pill型入力: メール (mail icon) / パスワード (lock icon)
 * - パスワード忘れリンク
 * - Pill型 gradient ログインボタン
 * - アカウント作成リンク
 *
 * 既存ロジック維持:
 * - toAuthErrorText / handleLogin / canLogin / loading
 * - supabase.auth.signInWithPassword
 * - returnTo パラメータ
 */

const toAuthErrorText = (raw: string) => {
  const msg = String(raw || '').toLowerCase()
  if (msg.includes('invalid login credentials')) return 'メールアドレスまたはパスワードを確認してください'
  if (msg.includes('email')) return 'メールアドレスを確認してください'
  if (msg.includes('password')) return 'パスワードを確認してください'
  return 'ログインに失敗しました'
}

export default function LoginScreen() {
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const canLogin = !!email && !!password

  const handleLogin = async () => {
    if (!canLogin) return
    if (!supabaseReady || !supabase) {
      Alert.alert('環境設定が未完了', 'EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY を設定してください')
      return
    }
    if (!email || !password) {
      Alert.alert('エラー', 'メールアドレスとパスワードを入力してください')
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase!.auth.signInWithPassword({ email, password })
      if (error) {
        Alert.alert('ログインできません', toAuthErrorText(error.message))
      } else {
        const to = String(returnTo || '').trim()
        const safeTo = to.startsWith('/(auth)') ? '' : to
        router.replace((safeTo || '/main-chat') as any)
      }
    } catch (error) {
      Alert.alert('エラー', 'ログインに失敗しました')
    } finally {
      setLoading(false)
    }
  }

  return (
    <LinearGradient
      colors={['#0A1628', '#0D1B33', '#0A1628']}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={styles.gradient}
    >
      {/* 背景デコ */}
      <View style={styles.blobTopRight} />
      <View style={styles.blobBottomLeft} />

      <SafeAreaView style={styles.safeArea}>
        {/* 戻るボタン */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Feather name="arrow-left" size={20} color="rgba(255,255,255,0.6)" />
          <Text style={styles.backButtonText}>戻る</Text>
        </TouchableOpacity>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.inner}>

              {/* ロゴ + タイトル */}
              <View style={styles.header}>
                <LinearGradient
                  colors={['#3B82F6', '#4F46E5']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.logoBox}
                >
                  <Ionicons name="sparkles" size={28} color="#FFFFFF" />
                </LinearGradient>
                <View style={styles.headerText}>
                  <Text style={styles.title}>ログイン</Text>
                  <Text style={styles.subtitle}>アカウントにサインイン</Text>
                </View>
              </View>

              {/* フォーム */}
              <View style={styles.form}>
                {/* メールアドレス */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>メールアドレス</Text>
                  <View style={styles.inputWrapper}>
                    <Feather name="mail" size={20} color="rgba(255,255,255,0.4)" style={styles.inputIcon} />
                    <TextInput
                      style={styles.inputField}
                      placeholder="your@email.com"
                      placeholderTextColor="rgba(255,255,255,0.3)"
                      value={email}
                      onChangeText={setEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </View>
                </View>

                {/* パスワード */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>パスワード</Text>
                  <View style={styles.inputWrapper}>
                    <Feather name="lock" size={20} color="rgba(255,255,255,0.4)" style={styles.inputIcon} />
                    <TextInput
                      style={styles.inputField}
                      placeholder="••••••••"
                      placeholderTextColor="rgba(255,255,255,0.3)"
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry
                    />
                  </View>
                </View>

                {/* パスワード忘れ */}
                <View style={styles.forgotRow}>
                  <TouchableOpacity activeOpacity={0.7}>
                    <Text style={styles.forgotText}>パスワードを忘れた場合</Text>
                  </TouchableOpacity>
                </View>

                {/* Supabase 未設定警告 */}
                {!supabaseReady && (
                  <Text style={styles.envWarning}>
                    環境設定が未完了です。EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY を設定してください。
                  </Text>
                )}

                {/* ログインボタン */}
                <TouchableOpacity
                  style={[styles.loginButtonWrap, (!canLogin || loading) && styles.loginButtonDisabled]}
                  onPress={handleLogin}
                  disabled={!canLogin || loading}
                  activeOpacity={0.85}
                >
                  <LinearGradient
                    colors={(!canLogin || loading) ? ['#6B7280', '#6B7280'] : ['#3B82F6', '#4F46E5']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.loginButtonInner}
                  >
                    <Text style={styles.loginButtonText}>
                      {loading ? 'ログイン中...' : 'ログイン'}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>

              {/* アカウント作成リンク */}
              <View style={styles.signupLink}>
                <Text style={styles.signupLinkText}>
                  まだアカウントがない場合{' '}
                </Text>
                <TouchableOpacity
                  onPress={() =>
                    router.push({
                      pathname: '/(auth)/signup',
                      params: { returnTo: String(returnTo || '') },
                    } as any)
                  }
                  activeOpacity={0.7}
                >
                  <Text style={styles.signupLinkAction}>アカウント作成</Text>
                </TouchableOpacity>
              </View>

            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  blobTopRight: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 384,
    height: 384,
    borderRadius: 192,
    backgroundColor: 'rgba(59,130,246,0.10)',
  },
  blobBottomLeft: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: 'rgba(99,102,241,0.10)',
  },
  safeArea: {
    flex: 1,
  },

  // 戻るボタン — relative z-10 px-6 pt-6
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 8,
  },
  backButtonText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.6)',
  },

  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 48,
  },

  // max-w-sm mx-auto w-full space-y-8
  inner: {
    gap: 32,
  },

  // flex flex-col items-center text-center space-y-4
  header: {
    alignItems: 'center',
    gap: 16,
  },

  // w-14 h-14 rounded-2xl
  logoBox: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    alignItems: 'center',
    gap: 8,
  },

  // text-2xl font-semibold text-white/95
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.95)',
  },

  // text-base text-white/50
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.5)',
  },

  // space-y-5
  form: {
    gap: 20,
  },

  // space-y-2
  inputGroup: {
    gap: 8,
  },

  // block text-sm text-white/70 pl-4
  label: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    paddingLeft: 16,
  },

  // relative — bg-white/5 border-white/10 rounded-full h-14
  inputWrapper: {
    height: 56,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    flexDirection: 'row',
    alignItems: 'center',
  },

  // absolute left-4 top-1/2
  inputIcon: {
    marginLeft: 16,
    marginRight: 0,
  },

  // w-full pl-12 pr-4 text-white
  inputField: {
    flex: 1,
    paddingLeft: 12,
    paddingRight: 16,
    fontSize: 16,
    color: '#FFFFFF',
  },

  // text-right — text-sm text-blue-400
  forgotRow: {
    alignItems: 'flex-end',
  },
  forgotText: {
    fontSize: 14,
    color: '#60A5FA',
  },

  envWarning: {
    fontSize: 12,
    color: '#F87171',
    textAlign: 'center',
  },

  // w-full h-14 rounded-full gradient mt-6 (mt-6 = 24px on top of space-y-5 gap)
  loginButtonWrap: {
    borderRadius: 999,
    overflow: 'hidden',
    marginTop: 24,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  loginButtonDisabled: {
    shadowOpacity: 0,
    elevation: 0,
  },
  loginButtonInner: {
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
  },

  // text-center pt-4 — text-sm text-white/50
  signupLink: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 16,
  },
  signupLinkText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
  },
  signupLinkAction: {
    fontSize: 14,
    color: '#60A5FA',
    fontWeight: '500',
  },
})
