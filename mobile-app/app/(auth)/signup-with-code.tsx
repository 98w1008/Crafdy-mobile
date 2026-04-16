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
import { supabase } from '@/lib/supabase'
import { router } from 'expo-router'
import * as Haptics from 'expo-haptics'
import {
  validateInvitationCode,
  markInvitationAsUsed,
  addProjectMember,
  InvitationData,
} from '@/lib/invitation-system'

/**
 * 招待コードで参加画面
 * Figma正本: Crafdyauthdesign/src/app/components/InviteCodeScreen.tsx
 *
 * 再現対象:
 * - 背景: #0A1628 → #0D1B33 → #0A1628 縦グラデーション
 * - 戻るボタン: ArrowLeft + "戻る"
 * - ロゴ: 56×56 + "職長・メンバー向け" ラベル + "招待コードで参加" タイトル
 * - 招待コード入力: Hash icon + pill型
 * - 説明ボックス: bg-blue-500/10 border border-blue-500/20 rounded-2xl
 * - Pill型 gradient 参加ボタン
 *
 * 既存ロジック維持:
 * - validateCode / handleSignup / invitationData
 * - supabase.auth.signUp + markInvitationAsUsed + addProjectMember
 * - fullName / email / password / confirmPassword / agreedToTerms / agreedToPrivacy
 */

export default function SignupWithCodeScreen() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [invitationCode, setInvitationCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [validatingCode, setValidatingCode] = useState(false)
  const [invitationData, setInvitationData] = useState<InvitationData | null>(null)
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [agreedToPrivacy, setAgreedToPrivacy] = useState(false)

  const validateCode = async () => {
    if (!invitationCode.trim()) {
      Alert.alert('入力エラー', '招待コードを入力してください')
      return
    }

    setValidatingCode(true)
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)

    try {
      const result = await validateInvitationCode(invitationCode.trim())
      if (result.valid && result.data) {
        setInvitationData(result.data)
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
        Alert.alert(
          '招待コード確認完了',
          `${result.data.companyName}の${result.data.projectName}現場への参加が確認されました。`
        )
      } else {
        Alert.alert('エラー', result.error || '無効な招待コードです')
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      }
    } catch (error) {
      console.error('招待コード検証エラー:', error)
      Alert.alert('エラー', 'コードの確認中にエラーが発生しました')
    } finally {
      setValidatingCode(false)
    }
  }

  const validateForm = () => {
    if (!fullName.trim()) {
      Alert.alert('入力エラー', '氏名を入力してください')
      return false
    }
    if (!email.trim() || !email.includes('@')) {
      Alert.alert('入力エラー', '有効なメールアドレスを入力してください')
      return false
    }
    if (password.length < 6) {
      Alert.alert('入力エラー', 'パスワードは6文字以上で入力してください')
      return false
    }
    if (password !== confirmPassword) {
      Alert.alert('入力エラー', 'パスワードが一致しません')
      return false
    }
    if (!invitationData) {
      Alert.alert('エラー', '招待コードの確認が必要です')
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

    setLoading(true)
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: {
            full_name: fullName.trim(),
            company: invitationData!.companyName,
            role: 'lead',
            agreed_to_terms: true,
            agreed_to_privacy: true,
            terms_agreed_at: new Date().toISOString(),
          },
        },
      })

      if (authError) {
        console.error('Signup error:', authError)
        Alert.alert('登録エラー', authError.message)
        return
      }

      if (!authData.user) {
        Alert.alert('エラー', 'アカウント作成に失敗しました')
        return
      }

      const markResult = await markInvitationAsUsed(invitationCode.trim(), authData.user.id)
      if (!markResult.success) {
        console.error('招待コード使用マークエラー:', markResult.error)
      }

      const memberResult = await addProjectMember(invitationData!.projectId, authData.user.id, 'lead')
      if (!memberResult.success) {
        console.error('プロジェクトメンバー追加エラー:', memberResult.error)
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      Alert.alert(
        'アカウント作成完了',
        `${invitationData!.projectName}現場の職長として登録されました。\n\nメールアドレスに確認メールを送信しました。メール内のリンクをクリックしてアカウントを有効化してからログインしてください。`,
        [{ text: 'ログイン画面へ', onPress: () => router.replace('/(auth)/login') }]
      )
    } catch (error) {
      console.error('Signup error:', error)
      Alert.alert('エラー', 'アカウント作成に失敗しました。もう一度お試しください。')
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
    } finally {
      setLoading(false)
    }
  }

  const canSubmit = !!invitationData && agreedToTerms && agreedToPrivacy && !loading

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
                  <Ionicons name="sparkles" size={26} color="#FFFFFF" />
                </LinearGradient>
                <View style={styles.headerText}>
                  <View style={styles.roleRow}>
                    <Feather name="users" size={16} color="rgba(255,255,255,0.6)" />
                    <Text style={styles.roleLabel}>職長・メンバー向け</Text>
                  </View>
                  <Text style={styles.title}>招待コードで参加</Text>
                  <Text style={styles.subtitle}>
                    親方または代表から受け取った{'\n'}招待コードを入力してください
                  </Text>
                </View>
              </View>

              {/* フォーム */}
              <View style={styles.form}>
                {/* 招待コード + 確認ボタン */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>招待コード</Text>
                  <View style={styles.codeRow}>
                    <View style={[styles.inputWrapper, { flex: 1 }]}>
                      <Feather name="hash" size={18} color="rgba(255,255,255,0.4)" style={styles.inputIcon} />
                      <TextInput
                        style={[styles.inputField, styles.codeField]}
                        placeholder="ABC123XYZ"
                        placeholderTextColor="rgba(255,255,255,0.3)"
                        value={invitationCode}
                        onChangeText={v => setInvitationCode(v.toUpperCase())}
                        autoCapitalize="characters"
                        autoCorrect={false}
                        maxLength={8}
                      />
                    </View>
                    <TouchableOpacity
                      style={[styles.validateButton, (validatingCode || !invitationCode.trim()) && styles.validateButtonDisabled]}
                      onPress={validateCode}
                      disabled={validatingCode || !invitationCode.trim()}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.validateButtonText}>
                        {validatingCode ? '確認中' : '確認'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* 招待確認済み情報 */}
                {invitationData && (
                  <View style={styles.invitationInfoBox}>
                    <Text style={styles.invitationInfoTitle}>参加先が確認されました</Text>
                    <Text style={styles.invitationInfoText}>会社: {invitationData.companyName}</Text>
                    <Text style={styles.invitationInfoText}>現場: {invitationData.projectName}</Text>
                    <Text style={styles.invitationInfoText}>役職: 現場監督・職長</Text>
                  </View>
                )}

                {/* 説明ボックス — InviteCodeScreen の info box */}
                {!invitationData && (
                  <View style={styles.infoBox}>
                    <Text style={styles.infoBoxText}>
                      招待コードは、組織の親方または代表から共有されます。コードを入力すると、その組織のメンバーとして参加できます。
                    </Text>
                  </View>
                )}

                {/* 氏名 */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>氏名</Text>
                  <View style={styles.inputWrapper}>
                    <Feather name="user" size={18} color="rgba(255,255,255,0.4)" style={styles.inputIcon} />
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

                {/* メールアドレス */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>メールアドレス</Text>
                  <View style={styles.inputWrapper}>
                    <Feather name="mail" size={18} color="rgba(255,255,255,0.4)" style={styles.inputIcon} />
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
                    <Feather name="lock" size={18} color="rgba(255,255,255,0.4)" style={styles.inputIcon} />
                    <TextInput
                      style={styles.inputField}
                      placeholder="6文字以上"
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
                    <Feather name="lock" size={18} color="rgba(255,255,255,0.4)" style={styles.inputIcon} />
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

                {/* 同意チェックボックス */}
                <TouchableOpacity
                  style={styles.checkRow}
                  onPress={() => {
                    setAgreedToTerms(!agreedToTerms)
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                  }}
                  activeOpacity={0.8}
                >
                  <View style={[styles.checkbox, agreedToTerms && styles.checkboxChecked]}>
                    {agreedToTerms && <Feather name="check" size={12} color="#FFFFFF" />}
                  </View>
                  <Text style={styles.checkLabel}>利用規約に同意する</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.checkRow}
                  onPress={() => {
                    setAgreedToPrivacy(!agreedToPrivacy)
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                  }}
                  activeOpacity={0.8}
                >
                  <View style={[styles.checkbox, agreedToPrivacy && styles.checkboxChecked]}>
                    {agreedToPrivacy && <Feather name="check" size={12} color="#FFFFFF" />}
                  </View>
                  <Text style={styles.checkLabel}>プライバシーポリシーに同意する</Text>
                </TouchableOpacity>

                {/* 参加するボタン */}
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
                      {loading ? '作成中...' : '参加する'}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>

              {/* Divider */}
              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>または</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* ログインリンク */}
              <View style={styles.loginLink}>
                <Text style={styles.loginLinkText}>既にアカウントをお持ちの場合 </Text>
                <TouchableOpacity onPress={() => router.push('/(auth)/login' as any)} activeOpacity={0.7}>
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
    position: 'absolute', top: -60, right: -60,
    width: 300, height: 300, borderRadius: 150,
    backgroundColor: 'rgba(59,130,246,0.09)',
  },
  blobBottomLeft: {
    position: 'absolute', bottom: -60, left: -60,
    width: 260, height: 260, borderRadius: 130,
    backgroundColor: 'rgba(99,102,241,0.09)',
  },
  safeArea: { flex: 1 },
  backButton: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 24, paddingTop: 16, paddingBottom: 8,
  },
  backButtonText: { fontSize: 16, color: 'rgba(255,255,255,0.6)' },
  scrollContent: { flexGrow: 1, paddingHorizontal: 24, paddingVertical: 24 },
  inner: { gap: 32 },
  header: { alignItems: 'center', gap: 16 },
  logoBox: {
    width: 56, height: 56, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  headerText: { alignItems: 'center', gap: 6 },
  roleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  roleLabel: { fontSize: 14, color: 'rgba(255,255,255,0.6)' },
  title: { fontSize: 24, fontWeight: '600', color: 'rgba(255,255,255,0.95)' },
  subtitle: { fontSize: 15, color: 'rgba(255,255,255,0.5)', textAlign: 'center', lineHeight: 22 },
  form: { gap: 20 },
  inputGroup: { gap: 8 },
  label: { fontSize: 14, color: 'rgba(255,255,255,0.7)', paddingLeft: 16 },
  codeRow: { flexDirection: 'row', gap: 12 },
  inputWrapper: {
    height: 56, borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    flexDirection: 'row', alignItems: 'center',
  },
  inputIcon: { marginLeft: 16 },
  inputField: { flex: 1, paddingLeft: 12, paddingRight: 16, fontSize: 16, color: '#FFFFFF' },
  codeField: { letterSpacing: 2, fontWeight: '600' },
  validateButton: {
    height: 56, paddingHorizontal: 20, borderRadius: 999,
    backgroundColor: '#3B82F6', alignItems: 'center', justifyContent: 'center',
  },
  validateButtonDisabled: { backgroundColor: '#4B5563' },
  validateButtonText: { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },

  // 招待確認済み
  invitationInfoBox: {
    backgroundColor: 'rgba(59,130,246,0.12)',
    borderWidth: 1, borderColor: 'rgba(59,130,246,0.25)',
    borderRadius: 16, padding: 16, gap: 4,
  },
  invitationInfoTitle: {
    fontSize: 13, fontWeight: '600', color: '#60A5FA', marginBottom: 4,
  },
  invitationInfoText: { fontSize: 13, color: 'rgba(255,255,255,0.7)' },

  // 説明ボックス — InviteCodeScreen の info box
  infoBox: {
    backgroundColor: 'rgba(59,130,246,0.1)',
    borderWidth: 1, borderColor: 'rgba(59,130,246,0.2)',
    borderRadius: 16, padding: 16,
  },
  infoBoxText: { fontSize: 14, color: 'rgba(255,255,255,0.7)', lineHeight: 22 },

  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 4 },
  checkbox: {
    width: 20, height: 20, borderRadius: 6,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center', justifyContent: 'center',
  },
  checkboxChecked: { backgroundColor: '#3B82F6', borderColor: '#3B82F6' },
  checkLabel: { fontSize: 14, color: 'rgba(255,255,255,0.7)' },
  submitButtonWrap: {
    borderRadius: 999, overflow: 'hidden', marginTop: 8,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25, shadowRadius: 12, elevation: 8,
  },
  submitButtonDisabled: { shadowOpacity: 0, elevation: 0 },
  submitButtonInner: { height: 56, alignItems: 'center', justifyContent: 'center' },
  submitButtonText: { fontSize: 16, fontWeight: '500', color: '#FFFFFF' },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dividerLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.1)' },
  dividerText: { fontSize: 14, color: 'rgba(255,255,255,0.4)' },
  loginLink: {
    flexDirection: 'row', flexWrap: 'wrap',
    justifyContent: 'center', alignItems: 'center',
  },
  loginLinkText: { fontSize: 14, color: 'rgba(255,255,255,0.5)' },
  loginLinkAction: { fontSize: 14, color: '#60A5FA', fontWeight: '500' },
})
