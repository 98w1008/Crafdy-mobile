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
import * as Haptics from 'expo-haptics'

/**
 * 親方・代表アカウント作成画面
 * Figma正本: Crafdyauthdesign/src/app/components/SignUpScreen.tsx
 *
 * 再現対象:
 * - 背景: #0A1628 → #0D1B33 → #0A1628 縦グラデーション
 * - 戻るボタン: ArrowLeft + "戻る"
 * - ロゴ: 56×56 rounded-2xl + "親方・代表向け" ラベル + "アカウント作成" タイトル
 * - Pill型入力: mail / lock / lock (+ 既存の氏名・会社名フィールド)
 * - 既存同意チェックボックス維持
 * - Pill型 gradient ボタン
 *
 * 既存ロジック維持:
 * - fullName / company / email / password / confirmPassword / agreedToTerms / agreedToPrivacy
 * - validateForm / handleSignup / toSignupErrorText
 * - supabase.auth.signUp + owner-setup 遷移
 */

const toSignupErrorText = (raw: string) => {
  const msg = String(raw || '').toLowerCase()
  if (msg.includes('already registered') || msg.includes('user already registered')) return 'このメールアドレスは既に使われています'
  if (msg.includes('email')) return 'メールアドレスを確認してください'
  if (msg.includes('password')) return 'パスワードを確認してください'
  return 'アカウント作成に失敗しました'
}

export default function SignupScreen() {
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>()
  const [fullName, setFullName] = useState('')
  const [company, setCompany] = useState('')
  const role = 'parent'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [agreedToPrivacy, setAgreedToPrivacy] = useState(false)

  const validateForm = () => {
    if (!fullName.trim()) {
      Alert.alert('入力エラー', '氏名を入力してください')
      return false
    }
    if (!company.trim()) {
      Alert.alert('入力エラー', '会社名を入力してください')
      return false
    }
    if (!email.trim()) {
      Alert.alert('入力エラー', 'メールアドレスを入力してください')
      return false
    }
    if (!email.includes('@')) {
      Alert.alert('入力エラー', '有効なメールアドレスを入力してください')
      return false
    }
    if (password.length < 8) {
      Alert.alert('入力エラー', 'パスワードは8文字以上で入力してください')
      return false
    }
    if (password !== confirmPassword) {
      Alert.alert('入力エラー', 'パスワードが一致しません')
      return false
    }
    if (!agreedToTerms) {
      Alert.alert('同意エラー', '利用規約に同意してください')
      return false
    }
    if (!agreedToPrivacy) {
      Alert.alert('同意エラー', 'プライバシーポリシーに同意してください')
      return false
    }
    return true
  }

  const handleSignup = async () => {
    if (!validateForm()) return
    if (!supabase || !supabaseReady) {
      Alert.alert('設定未完了', 'EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY を設定してください')
      return
    }

    setLoading(true)
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)

    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: {
            full_name: fullName.trim(),
            company: company.trim(),
            role: role,
            agreed_to_terms: true,
            agreed_to_privacy: true,
            terms_agreed_at: new Date().toISOString(),
          },
        },
      })

      if (error) {
        console.error('Signup error:', error)
        Alert.alert('作成できません', toSignupErrorText(error.message))
        return
      }

      if (data?.session) {
        router.replace({ pathname: '/owner-setup', params: { returnTo: String(returnTo || '') } } as any)
        return
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      Alert.alert(
        'アカウントを作成しました',
        '確認メールを送信しました。メール内のリンクを開いてからログインしてください。',
        [
          {
            text: 'ログインへ',
            onPress: () => router.replace({ pathname: '/(auth)/login', params: { returnTo: String(returnTo || '') } } as any),
          },
        ]
      )
    } catch (error) {
      console.error('Signup error:', error)
      Alert.alert('エラー', 'アカウント作成に失敗しました。もう一度お試しください。')
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
    } finally {
      setLoading(false)
    }
  }

  const toggleTermsAgreement = () => {
    setAgreedToTerms(!agreedToTerms)
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
  }

  const togglePrivacyAgreement = () => {
    setAgreedToPrivacy(!agreedToPrivacy)
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
  }

  const canSubmit = agreedToTerms && agreedToPrivacy && !loading

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
                  <View style={styles.roleRow}>
                    <Feather name="user" size={16} color="rgba(255,255,255,0.6)" />
                    <Text style={styles.roleLabel}>親方・代表向け</Text>
                  </View>
                  <Text style={styles.title}>アカウント作成</Text>
                  <Text style={styles.subtitle}>組織の管理者アカウントを作成</Text>
                </View>
              </View>

              {/* フォーム */}
              <View style={styles.form}>
                {/* 氏名 */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>氏名</Text>
                  <View style={styles.inputWrapper}>
                    <Feather name="user" size={20} color="rgba(255,255,255,0.4)" style={styles.inputIcon} />
                    <TextInput
                      style={styles.inputField}
                      placeholder="山田太郎"
                      placeholderTextColor="rgba(255,255,255,0.3)"
                      value={fullName}
                      onChangeText={setFullName}
                      autoCapitalize="words"
                    />
                  </View>
                </View>

                {/* 会社名 */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>会社名</Text>
                  <View style={styles.inputWrapper}>
                    <Feather name="briefcase" size={20} color="rgba(255,255,255,0.4)" style={styles.inputIcon} />
                    <TextInput
                      style={styles.inputField}
                      placeholder="株式会社○○工務店"
                      placeholderTextColor="rgba(255,255,255,0.3)"
                      value={company}
                      onChangeText={setCompany}
                    />
                  </View>
                </View>

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
                      placeholder="8文字以上"
                      placeholderTextColor="rgba(255,255,255,0.3)"
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry
                    />
                  </View>
                </View>

                {/* パスワード確認 */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>パスワード確認</Text>
                  <View style={styles.inputWrapper}>
                    <Feather name="lock" size={20} color="rgba(255,255,255,0.4)" style={styles.inputIcon} />
                    <TextInput
                      style={styles.inputField}
                      placeholder="もう一度入力"
                      placeholderTextColor="rgba(255,255,255,0.3)"
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      secureTextEntry
                    />
                  </View>
                </View>

                {/* 同意 — 既存ロジック維持 */}
                <Text style={styles.termsNote}>
                  アカウントを作成することで、
                  <Text style={styles.termsLink}>利用規約</Text>
                  および
                  <Text style={styles.termsLink}>プライバシーポリシー</Text>
                  に同意したものとみなされます。
                </Text>

                <TouchableOpacity
                  style={styles.checkRow}
                  onPress={toggleTermsAgreement}
                  activeOpacity={0.8}
                >
                  <View style={[styles.checkbox, agreedToTerms && styles.checkboxChecked]}>
                    {agreedToTerms && <Feather name="check" size={12} color="#FFFFFF" />}
                  </View>
                  <Text style={styles.checkLabel}>利用規約に同意する</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.checkRow}
                  onPress={togglePrivacyAgreement}
                  activeOpacity={0.8}
                >
                  <View style={[styles.checkbox, agreedToPrivacy && styles.checkboxChecked]}>
                    {agreedToPrivacy && <Feather name="check" size={12} color="#FFFFFF" />}
                  </View>
                  <Text style={styles.checkLabel}>プライバシーポリシーに同意する</Text>
                </TouchableOpacity>

                {/* アカウント作成ボタン */}
                <TouchableOpacity
                  style={[styles.submitButtonWrap, !canSubmit && styles.submitButtonDisabled]}
                  onPress={handleSignup}
                  disabled={!canSubmit}
                  activeOpacity={0.85}
                >
                  <LinearGradient
                    colors={!canSubmit ? ['#4B5563', '#4B5563'] : ['#3B82F6', '#4F46E5']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.submitButtonInner}
                  >
                    <Text style={styles.submitButtonText}>
                      {loading ? '作成中...' : 'アカウントを作成'}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>

              {/* ログインリンク */}
              <View style={styles.loginLink}>
                <Text style={styles.loginLinkText}>既にアカウントをお持ちの場合 </Text>
                <TouchableOpacity
                  onPress={() => router.push('/(auth)/login' as any)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.loginLinkAction}>ログイン</Text>
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
  gradient: { flex: 1 },
  blobTopRight: {
    position: 'absolute', top: 0, right: 0,
    width: 384, height: 384, borderRadius: 192,
    backgroundColor: 'rgba(59,130,246,0.10)',
  },
  blobBottomLeft: {
    position: 'absolute', bottom: 0, left: 0,
    width: 320, height: 320, borderRadius: 160,
    backgroundColor: 'rgba(99,102,241,0.10)',
  },
  safeArea: { flex: 1 },
  backButton: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 24, paddingTop: 24, paddingBottom: 8,
  },
  backButtonText: { fontSize: 16, color: 'rgba(255,255,255,0.6)' },
  scrollContent: {
    flexGrow: 1, paddingHorizontal: 24, paddingVertical: 48,
  },
  inner: { gap: 32 },
  header: { alignItems: 'center', gap: 16 },
  logoBox: {
    width: 56, height: 56, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  headerText: { alignItems: 'center', gap: 6 },
  roleRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2,
  },
  roleLabel: { fontSize: 14, color: 'rgba(255,255,255,0.6)' },
  title: { fontSize: 24, fontWeight: '600', color: 'rgba(255,255,255,0.95)' },
  subtitle: { fontSize: 16, color: 'rgba(255,255,255,0.5)' },
  form: { gap: 20 },
  inputGroup: { gap: 8 },
  label: { fontSize: 14, color: 'rgba(255,255,255,0.7)', paddingLeft: 16 },
  inputWrapper: {
    height: 56, borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    flexDirection: 'row', alignItems: 'center',
  },
  inputIcon: { marginLeft: 16 },
  inputField: {
    flex: 1, paddingLeft: 12, paddingRight: 16,
    fontSize: 16, color: '#FFFFFF',
  },
  termsNote: {
    fontSize: 12, color: 'rgba(255,255,255,0.4)',
    lineHeight: 18, paddingHorizontal: 4,
  },
  termsLink: { color: '#60A5FA' },
  checkRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 4,
  },
  checkbox: {
    width: 20, height: 20, borderRadius: 6,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center', justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#3B82F6', borderColor: '#3B82F6',
  },
  checkLabel: { fontSize: 14, color: 'rgba(255,255,255,0.7)' },
  submitButtonWrap: {
    borderRadius: 999, overflow: 'hidden', marginTop: 24,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25, shadowRadius: 12, elevation: 8,
  },
  submitButtonDisabled: { shadowOpacity: 0, elevation: 0 },
  submitButtonInner: {
    height: 56, alignItems: 'center', justifyContent: 'center',
  },
  submitButtonText: { fontSize: 16, fontWeight: '500', color: '#FFFFFF' },
  loginLink: {
    flexDirection: 'row', flexWrap: 'wrap',
    justifyContent: 'center', alignItems: 'center',
  },
  loginLinkText: { fontSize: 14, color: 'rgba(255,255,255,0.5)' },
  loginLinkAction: { fontSize: 14, color: '#60A5FA', fontWeight: '500' },
})
