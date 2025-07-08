import React, { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Linking } from 'react-native'
import Checkbox from 'expo-checkbox'
import * as WebBrowser from 'expo-web-browser'
import { makeRedirectUri } from 'expo-auth-session'
import { supabase } from '../lib/supabase'

// WebBrowserの設定
WebBrowser.maybeCompleteAuthSession()

export default function AuthScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false)
  const [agreeToTerms, setAgreeToTerms] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  const handleAuth = async () => {
    if (!email || !password) {
      Alert.alert('エラー', 'メールアドレスとパスワードを入力してください')
      return
    }

    if (password.length < 6) {
      Alert.alert('エラー', 'パスワードは6文字以上で入力してください')
      return
    }

    // サインアップ時は利用規約の同意が必要
    if (isSignUp && !agreeToTerms) {
      Alert.alert('エラー', '利用規約とプライバシーポリシーに同意してください')
      return
    }

    setLoading(true)

    try {
      if (isSignUp) {
        // サインアップ
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password: password,
        })

        if (error) {
          Alert.alert('サインアップエラー', error.message)
        } else if (data.user) {
          console.log('✅ Signup successful:', data.user.email)
          Alert.alert(
            'サインアップ完了',
            'アカウントが作成されました。自動的にログインします。',
            [{ text: 'OK' }]
          )
        }
      } else {
        // ログイン
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password,
        })

        if (error) {
          Alert.alert('ログインエラー', error.message)
        } else if (data.user) {
          // ログイン成功時は自動的にセッションが管理される
          console.log('✅ Login successful:', data.user.email)
        }
      }
    } catch (error) {
      console.error('認証エラー:', error)
      Alert.alert('エラー', '認証処理中にエラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    try {
      setGoogleLoading(true)
      console.log('🔍 Starting Google OAuth...')

      // リダイレクトURIを作成
      const redirectUri = makeRedirectUri({
        scheme: 'com.crafdy.mobile',
        path: 'auth/callback',
      })

      console.log('🔗 Redirect URI:', redirectUri)

      // Supabase OAuth URL を構築
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUri,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      })

      if (error) {
        console.error('❌ OAuth URL generation error:', error)
        Alert.alert('エラー', 'Google認証の開始に失敗しました: ' + error.message)
        return
      }

      if (data?.url) {
        console.log('🚀 Opening OAuth URL:', data.url)
        
        // WebBrowserでOAuth URLを開く
        const result = await WebBrowser.openAuthSessionAsync(
          data.url,
          redirectUri
        )

        console.log('📱 OAuth result:', result)

        if (result.type === 'success') {
          // リダイレクトURLからトークンを抽出
          const url = result.url
          console.log('✅ OAuth success URL:', url)
          
          // URLからアクセストークンとリフレッシュトークンを抽出
          const urlParams = new URLSearchParams(url.split('#')[1] || url.split('?')[1])
          const accessToken = urlParams.get('access_token')
          const refreshToken = urlParams.get('refresh_token')
          
          if (accessToken) {
            // セッションを設定
            const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken || '',
            })
            
            if (sessionError) {
              console.error('❌ Session setting error:', sessionError)
              Alert.alert('エラー', 'セッションの設定に失敗しました')
            } else {
              console.log('✅ Google OAuth successful:', sessionData.user?.email)
            }
          }
        } else if (result.type === 'cancel') {
          console.log('🚫 OAuth cancelled by user')
        } else {
          console.log('❌ OAuth failed:', result)
        }
      }
    } catch (error) {
      console.error('❌ Google OAuth error:', error)
      Alert.alert('エラー', 'Google認証中にエラーが発生しました')
    } finally {
      setGoogleLoading(false)
    }
  }

  const clearForm = () => {
    setEmail('')
    setPassword('')
    setAgreeToTerms(false)
  }

  const toggleMode = () => {
    setIsSignUp(!isSignUp)
    clearForm()
  }

  const openTermsOfService = () => {
    const url = 'https://example.com/terms-of-service'
    Linking.openURL(url).catch(err => {
      console.error('URL を開けませんでした:', err)
      Alert.alert('エラー', '利用規約のページを開けませんでした')
    })
  }

  const openPrivacyPolicy = () => {
    const url = 'https://example.com/privacy-policy'
    Linking.openURL(url).catch(err => {
      console.error('URL を開けませんでした:', err)
      Alert.alert('エラー', 'プライバシーポリシーのページを開けませんでした')
    })
  }

  const isSignUpButtonDisabled = loading || googleLoading || (isSignUp && !agreeToTerms)
  const isLoginButtonDisabled = loading || googleLoading

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header}>
          <Text style={styles.title}>Crafdy Mobile</Text>
          <Text style={styles.subtitle}>
            {isSignUp ? 'アカウントを作成' : 'アカウントにログイン'}
          </Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>メールアドレス</Text>
            <TextInput
              style={styles.input}
              placeholder="example@email.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading && !googleLoading}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>パスワード</Text>
            <TextInput
              style={styles.input}
              placeholder="パスワードを入力"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              editable={!loading && !googleLoading}
            />
          </View>

          {/* 利用規約とプライバシーポリシーの同意チェックボックス（サインアップ時のみ表示） */}
          {isSignUp && (
            <View style={styles.checkboxContainer}>
              <Checkbox
                style={styles.checkbox}
                value={agreeToTerms}
                onValueChange={setAgreeToTerms}
                color={agreeToTerms ? '#2563eb' : undefined}
                disabled={loading || googleLoading}
              />
              <View style={styles.termsTextContainer}>
                <Text style={styles.termsText}>
                  <TouchableOpacity onPress={openTermsOfService} disabled={loading || googleLoading}>
                    <Text style={styles.termsLink}>利用規約</Text>
                  </TouchableOpacity>
                  <Text style={styles.termsText}>と</Text>
                  <TouchableOpacity onPress={openPrivacyPolicy} disabled={loading || googleLoading}>
                    <Text style={styles.termsLink}>プライバシーポリシー</Text>
                  </TouchableOpacity>
                  <Text style={styles.termsText}>に同意する</Text>
                </Text>
              </View>
            </View>
          )}

          <TouchableOpacity 
            style={[
              styles.authButton, 
              isSignUpButtonDisabled && styles.buttonDisabled
            ]} 
            onPress={handleAuth}
            disabled={isSignUpButtonDisabled}
          >
            <Text style={styles.authButtonText}>
              {loading 
                ? (isSignUp ? 'アカウント作成中...' : 'ログイン中...') 
                : (isSignUp ? 'アカウント作成' : 'ログイン')
              }
            </Text>
          </TouchableOpacity>

          {/* 区切り線 */}
          <View style={styles.dividerContainer}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>または</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Googleログインボタン */}
          <TouchableOpacity 
            style={[
              styles.googleButton, 
              isLoginButtonDisabled && styles.buttonDisabled
            ]} 
            onPress={handleGoogleSignIn}
            disabled={isLoginButtonDisabled}
          >
            <Text style={styles.googleButtonText}>
              {googleLoading ? 'Google認証中...' : 'Googleでログイン'}
            </Text>
          </TouchableOpacity>

          <View style={styles.switchContainer}>
            <Text style={styles.switchText}>
              {isSignUp ? '既にアカウントをお持ちですか？' : 'アカウントをお持ちでない方は'}
            </Text>
            <TouchableOpacity onPress={toggleMode} disabled={loading || googleLoading}>
              <Text style={styles.switchLink}>
                {isSignUp ? 'ログイン' : 'アカウント作成'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            現場管理をもっと簡単に
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
  },
  form: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 24,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#ffffff',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
    paddingRight: 8,
  },
  checkbox: {
    marginRight: 12,
    marginTop: 2,
  },
  termsTextContainer: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  termsText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  termsLink: {
    fontSize: 14,
    color: '#2563eb',
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
  authButton: {
    backgroundColor: '#2563eb',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  buttonDisabled: {
    backgroundColor: '#9ca3af',
  },
  authButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e5e7eb',
  },
  dividerText: {
    marginHorizontal: 12,
    fontSize: 14,
    color: '#6b7280',
  },
  googleButton: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  googleButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '500',
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  switchText: {
    color: '#6b7280',
    fontSize: 14,
    marginRight: 4,
  },
  switchLink: {
    color: '#2563eb',
    fontSize: 14,
    fontWeight: '500',
  },
  footer: {
    alignItems: 'center',
  },
  footerText: {
    color: '#9ca3af',
    fontSize: 14,
    textAlign: 'center',
  },
})