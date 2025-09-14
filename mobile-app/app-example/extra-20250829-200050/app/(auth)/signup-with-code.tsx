import React, { useState } from 'react'
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  Alert, 
  StyleSheet, 
  ScrollView,
  SafeAreaView,
  type ViewStyle,
  type TextStyle 
} from 'react-native'
import { supabase } from '@/lib/supabase'
import { router } from 'expo-router'
import { Colors, Spacing, Typography, BorderRadius } from '@/constants/Colors'
import * as Haptics from 'expo-haptics'
import { 
  validateInvitationCode, 
  markInvitationAsUsed, 
  addProjectMember,
  InvitationData 
} from '@/lib/invitation-system'

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
    if (!email.trim()) {
      Alert.alert('入力エラー', 'メールアドレスを入力してください')
      return false
    }
    if (!email.includes('@')) {
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
      // 1. Supabaseでアカウント作成
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

      // 2. 招待コードを使用済みにマーク
      const markResult = await markInvitationAsUsed(invitationCode.trim(), authData.user.id)
      if (!markResult.success) {
        console.error('招待コード使用マークエラー:', markResult.error)
        // 続行（アカウントは作成済み）
      }

      // 3. プロジェクトメンバーとして追加
      const memberResult = await addProjectMember(
        invitationData!.projectId, 
        authData.user.id, 
        'lead'
      )
      if (!memberResult.success) {
        console.error('プロジェクトメンバー追加エラー:', memberResult.error)
        // 続行（アカウントは作成済み）
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      Alert.alert(
        'アカウント作成完了',
        `${invitationData!.projectName}現場の職長として登録されました。\n\nメールアドレスに確認メールを送信しました。メール内のリンクをクリックしてアカウントを有効化してからログインしてください。`,
        [
          { 
            text: 'ログイン画面へ', 
            onPress: () => router.replace('/(auth)/login') 
          }
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

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Logo Section */}
        <View style={styles.logoSection}>
          <View style={styles.logo}>
            <Text style={styles.logoText}>C</Text>
          </View>
          <Text style={styles.title}>Crafdy Mobile</Text>
          <Text style={styles.subtitle}>職長アカウント作成</Text>
        </View>

        {/* Form Section */}
        <View style={styles.form}>
          {/* 招待コード */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>招待コード *</Text>
            <Text style={styles.helpText}>
              親方から受け取った8桁の招待コードを入力してください
            </Text>
            <View style={styles.codeInputContainer}>
              <TextInput
                style={[styles.input, styles.codeInput]}
                placeholder="ABCD1234"
                value={invitationCode}
                onChangeText={setInvitationCode}
                placeholderTextColor={Colors.textTertiary}
                autoCapitalize="characters"
                autoCorrect={false}
                maxLength={8}
              />
              <TouchableOpacity
                style={[
                  styles.validateButton,
                  validatingCode && styles.validateButtonDisabled
                ]}
                onPress={validateCode}
                disabled={validatingCode || !invitationCode.trim()}
              >
                <Text style={styles.validateButtonText}>
                  {validatingCode ? '確認中...' : '確認'}
                </Text>
              </TouchableOpacity>
            </View>
            {invitationData && (
              <View style={styles.invitationInfo}>
                <Text style={styles.invitationInfoTitle}>招待情報</Text>
                <Text style={styles.invitationInfoText}>
                  会社: {invitationData.companyName}
                </Text>
                <Text style={styles.invitationInfoText}>
                  現場: {invitationData.projectName}
                </Text>
                <Text style={styles.invitationInfoText}>
                  役職: 現場監督・職長
                </Text>
              </View>
            )}
          </View>

          {/* 氏名 */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>氏名 *</Text>
            <TextInput
              style={styles.input}
              placeholder="山田太郎"
              value={fullName}
              onChangeText={setFullName}
              placeholderTextColor={Colors.textTertiary}
              autoCapitalize="words"
            />
          </View>

          {/* メールアドレス */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>メールアドレス *</Text>
            <TextInput
              style={styles.input}
              placeholder="your@email.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              placeholderTextColor={Colors.textTertiary}
            />
          </View>

          {/* パスワード */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>パスワード *</Text>
            <TextInput
              style={styles.input}
              placeholder="6文字以上で入力"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholderTextColor={Colors.textTertiary}
            />
          </View>

          {/* パスワード確認 */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>パスワード確認 *</Text>
            <TextInput
              style={styles.input}
              placeholder="パスワードを再入力"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              placeholderTextColor={Colors.textTertiary}
            />
          </View>

          {/* 利用規約・プライバシーポリシー同意 */}
          <View style={styles.agreementSection}>
            <TouchableOpacity
              style={styles.checkboxContainer}
              onPress={toggleTermsAgreement}
            >
              <View style={[
                styles.checkbox,
                agreedToTerms && styles.checkboxChecked
              ]}>
                {agreedToTerms && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text style={styles.checkboxText}>
                <Text style={styles.agreementLink}>利用規約</Text>
                に同意します *
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.checkboxContainer}
              onPress={togglePrivacyAgreement}
            >
              <View style={[
                styles.checkbox,
                agreedToPrivacy && styles.checkboxChecked
              ]}>
                {agreedToPrivacy && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text style={styles.checkboxText}>
                <Text style={styles.agreementLink}>プライバシーポリシー</Text>
                に同意します *
              </Text>
            </TouchableOpacity>
          </View>

          {/* アカウント作成ボタン */}
          <TouchableOpacity
            style={[
              styles.button,
              (!invitationData || !agreedToTerms || !agreedToPrivacy || loading) && styles.buttonDisabled
            ]}
            onPress={handleSignup}
            disabled={!invitationData || !agreedToTerms || !agreedToPrivacy || loading}
          >
            <Text style={styles.buttonText}>
              {loading ? '作成中...' : '職長アカウント作成'}
            </Text>
          </TouchableOpacity>

          {/* ログインリンク */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>または</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => router.push('/(auth)/login')}
          >
            <Text style={styles.linkText}>
              既にアカウントをお持ちの方はログイン
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => router.push('/(auth)/signup')}
          >
            <Text style={styles.linkText}>
              親方・代表の方はこちら
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing['2xl'],
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: Spacing['2xl'],
  },
  logo: {
    width: 80,
    height: 80,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  logoText: {
    color: Colors.textOnPrimary,
    fontSize: Typography['4xl'],
    fontWeight: Typography.weights.bold,
  },
  title: {
    fontSize: Typography['3xl'],
    fontWeight: Typography.weights.bold,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: Typography.lg,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  form: {
    gap: Spacing.lg,
  },
  inputGroup: {
    gap: Spacing.xs,
  },
  label: {
    fontSize: Typography.sm,
    fontWeight: Typography.weights.medium,
    color: Colors.text,
  },
  helpText: {
    fontSize: Typography.xs,
    color: Colors.textSecondary,
    lineHeight: 16,
  },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: Typography.base,
    color: Colors.text,
  },
  codeInputContainer: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  codeInput: {
    flex: 1,
    textTransform: 'uppercase',
    fontFamily: 'monospace',
    fontSize: Typography.lg,
    fontWeight: Typography.weights.semibold,
    textAlign: 'center',
  },
  validateButton: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 80,
  },
  validateButtonDisabled: {
    backgroundColor: Colors.textTertiary,
  },
  validateButtonText: {
    color: Colors.textOnPrimary,
    fontSize: Typography.sm,
    fontWeight: Typography.weights.semibold,
  },
  invitationInfo: {
    backgroundColor: Colors.successLight,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginTop: Spacing.sm,
  },
  invitationInfoTitle: {
    fontSize: Typography.sm,
    fontWeight: Typography.weights.semibold,
    color: Colors.success,
    marginBottom: Spacing.xs,
  },
  invitationInfoText: {
    fontSize: Typography.sm,
    color: Colors.text,
    marginBottom: Spacing.xs / 2,
  },
  agreementSection: {
    gap: Spacing.md,
    marginTop: Spacing.sm,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: Colors.border,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
  },
  checkboxChecked: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  checkmark: {
    color: Colors.textOnPrimary,
    fontSize: 12,
    fontWeight: Typography.weights.bold,
  },
  checkboxText: {
    flex: 1,
    fontSize: Typography.sm,
    color: Colors.text,
    lineHeight: 20,
  },
  agreementLink: {
    color: Colors.primary,
    fontWeight: Typography.weights.medium,
    textDecorationLine: 'underline',
  },
  button: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  buttonDisabled: {
    backgroundColor: Colors.textTertiary,
  },
  buttonText: {
    color: Colors.textOnPrimary,
    fontSize: Typography.base,
    fontWeight: Typography.weights.semibold,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },
  dividerText: {
    marginHorizontal: Spacing.md,
    fontSize: Typography.sm,
    color: Colors.textSecondary,
  },
  linkButton: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  linkText: {
    color: Colors.primary,
    fontSize: Typography.base,
    fontWeight: Typography.weights.medium,
  },
})