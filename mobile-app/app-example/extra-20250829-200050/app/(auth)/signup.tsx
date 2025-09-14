import React, { useState } from 'react'
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  Alert, 
  StyleSheet, 
  ScrollView,
  SafeAreaView 
} from 'react-native'
import { supabase } from '@/lib/supabase'
import { router } from 'expo-router'
import { Colors, Spacing, Typography, BorderRadius } from '@/constants/Colors'
import * as Haptics from 'expo-haptics'

export default function SignupScreen() {
  const [fullName, setFullName] = useState('')
  const [company, setCompany] = useState('')
  // 代表・親方アカウント専用（roleは固定）
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
    if (password.length < 6) {
      Alert.alert('入力エラー', 'パスワードは6文字以上で入力してください')
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
        Alert.alert('登録エラー', error.message)
        return
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      Alert.alert(
        'アカウント作成完了',
        'メールアドレスに確認メールを送信しました。メール内のリンクをクリックしてアカウントを有効化してからログインしてください。',
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

  // handleRoleSelect関数は不要（削除）

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
          <Text style={styles.subtitle}>代表・親方アカウント作成</Text>
        </View>

        {/* Form Section */}
        <View style={styles.form}>
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

          {/* 会社名 */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>会社名 *</Text>
            <TextInput
              style={styles.input}
              placeholder="株式会社○○工務店"
              value={company}
              onChangeText={setCompany}
              placeholderTextColor={Colors.textTertiary}
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
              (!agreedToTerms || !agreedToPrivacy || loading) && styles.buttonDisabled
            ]}
            onPress={handleSignup}
            disabled={!agreedToTerms || !agreedToPrivacy || loading}
          >
            <Text style={styles.buttonText}>
              {loading ? '作成中...' : 'アカウント作成'}
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
            onPress={() => router.push('/(auth)/signup-with-code')}
          >
            <Text style={styles.linkText}>
              職長の方は招待コードで登録
            </Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            代表・親方アカウントでは全現場の管理・監督と{'\n'}
            職長の招待・権限管理が可能です
          </Text>
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
  footer: {
    marginTop: Spacing['2xl'],
    alignItems: 'center',
  },
  footerText: {
    fontSize: Typography.xs,
    color: Colors.textTertiary,
    textAlign: 'center',
    lineHeight: 18,
  },
})