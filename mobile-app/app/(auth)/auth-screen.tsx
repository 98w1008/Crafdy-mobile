import React from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native'
import { Link, useLocalSearchParams } from 'expo-router'

export default function AuthScreen() {
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>()

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Header Section */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Text style={styles.logo}>🏗️</Text>
          </View>
          <Text style={styles.title}>Crafdy Mobile</Text>
          <Text style={styles.subtitle}>建設現場管理をスマートに</Text>
        </View>

        {/* Features Section */}
        <View style={styles.featuresContainer}>
          <View style={styles.featureItem}>
            <Text style={styles.featureIcon}>📋</Text>
            <Text style={styles.featureText}>日報作成・管理</Text>
          </View>
          <View style={styles.featureItem}>
            <Text style={styles.featureIcon}>💬</Text>
            <Text style={styles.featureText}>リアルタイムチャット</Text>
          </View>
          <View style={styles.featureItem}>
            <Text style={styles.featureIcon}>📊</Text>
            <Text style={styles.featureText}>進捗管理・分析</Text>
          </View>
        </View>

        {/* Auth Buttons Section */}
        <View style={styles.authSection}>
          <Text style={styles.sectionTitle}>参加方法を選んでください</Text>
          {String(returnTo || '').trim() ? (
            <Text style={styles.returnHint}>ログイン後は元の画面に戻ります</Text>
          ) : null}

          <Link href={{ pathname: '/(auth)/login', params: { returnTo: String(returnTo || '') } }} asChild>
            <TouchableOpacity style={[styles.button, styles.loginButton]}>
              <Text style={[styles.buttonText, styles.loginButtonText]}>
                既存アカウントでログイン
              </Text>
              <Text style={[styles.buttonHint, styles.loginButtonHint]}>
                すでに作成済みの方
              </Text>
            </TouchableOpacity>
          </Link>

          <Link href={{ pathname: '/(auth)/signup', params: { returnTo: String(returnTo || '') } }} asChild>
            <TouchableOpacity style={[styles.button, styles.signupButton]}>
              <Text style={[styles.buttonText, styles.signupButtonText]}>
                代表・親方としてはじめる
              </Text>
              <Text style={styles.buttonHint}>
                会社/チームを新しく作成
              </Text>
            </TouchableOpacity>
          </Link>

          <Link href="/join/by-code" asChild>
            <TouchableOpacity style={[styles.button, styles.codeButton]}>
              <Text style={[styles.buttonText, styles.codeButtonText]}>
                招待コードで参加
              </Text>
              <Text style={styles.buttonHint}>
                職長・従業員の方（招待された方）
              </Text>
            </TouchableOpacity>
          </Link>

          <Text style={styles.termsText}>
            続行することで、利用規約とプライバシーポリシーに同意したものとみなされます
          </Text>
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          © 2024 Crafdy Mobile - 建設業界のDX化を支援
        </Text>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logoContainer: {
    width: 80,
    height: 80,
    backgroundColor: '#0E73E0',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    shadowColor: '#0E73E0',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  logo: {
    fontSize: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 24,
  },
  featuresContainer: {
    marginBottom: 48,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  featureIcon: {
    fontSize: 24,
    marginRight: 16,
  },
  featureText: {
    fontSize: 16,
    color: '#475569',
    fontWeight: '500',
  },
  authSection: {
    alignItems: 'center',
  },
  sectionTitle: {
    width: '100%',
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6,
  },
  returnHint: {
    width: '100%',
    fontSize: 12,
    color: '#64748B',
    marginBottom: 12,
  },
  button: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  loginButton: {
    backgroundColor: '#0E73E0',
  },
  signupButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#0E73E0',
  },
  codeButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  buttonHint: {
    marginTop: 6,
    fontSize: 12,
    color: '#64748B',
  },
  loginButtonText: {
    color: '#FFFFFF',
  },
  loginButtonHint: {
    color: 'rgba(255,255,255,0.85)',
  },
  signupButtonText: {
    color: '#0E73E0',
  },
  codeButtonText: {
    color: '#0F172A',
  },
  termsText: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 16,
    paddingHorizontal: 16,
  },
  footer: {
    paddingBottom: 20,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
  },
})