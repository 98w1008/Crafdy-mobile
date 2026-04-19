import React from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import Ionicons from '@expo/vector-icons/Ionicons'
import Feather from '@expo/vector-icons/Feather'
import { router, useLocalSearchParams } from 'expo-router'

/**
 * 認証入口画面
 * Figma正本: Crafdyauthdesign/src/app/components/WelcomeScreen.tsx
 *
 * 再現対象:
 * - 背景: #0A1628 → #0D1B33 → #0A1628 縦グラデーション
 * - ロゴ行: 44×44 rounded-2xl グラデーション + Sparkles + "Crafdy"
 * - メインメッセージ: "現場の仕事を、チャットで前に進める"
 * - サブメッセージ: "日報、経費、請求、見積を AIがサポートする業務アシスタント"
 * - Primary CTA: "ログイン" pill gradient + arrow-right
 * - Divider: "アカウントを作成"
 * - Secondary CTA 1: "親方・代表アカウントを作成"
 * - Secondary CTA 2: "招待コードで参加"
 * - Footer: 利用規約 · プライバシー
 */
export default function AuthScreen() {
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>()
  const rto = String(returnTo || '')

  return (
    <LinearGradient
      colors={['#0A1628', '#0D1B33', '#0A1628']}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={styles.gradient}
    >
      {/* 背景デコ: top-right blob / bottom-left blob */}
      <View style={styles.blobTopRight} />
      <View style={styles.blobBottomLeft} />

      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>

          {/* ── 上部: ロゴ + メッセージ ── */}
          <View style={styles.topSection}>
            {/* ロゴ行 */}
            <View style={styles.logoRow}>
              <LinearGradient
                colors={['#3B82F6', '#4F46E5']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.logoBox}
              >
                <Ionicons name="sparkles" size={22} color="#FFFFFF" />
              </LinearGradient>
              <Text style={styles.appName}>Crafdy</Text>
            </View>

            {/* メインメッセージ */}
            <View style={styles.messageBlock}>
              <Text style={styles.messageTitle}>
                現場の仕事を、{'\n'}チャットで前に進める
              </Text>
              <Text style={styles.messageSub}>
                日報、経費、請求、見積を{'\n'}AIがサポートする業務アシスタント
              </Text>
            </View>
          </View>

          {/* ── 下部: CTA ── */}
          <View style={styles.ctaSection}>
            {/* Primary CTA — ログイン */}
            <TouchableOpacity
              style={styles.primaryButtonWrap}
              onPress={() =>
                router.push({
                  pathname: '/(auth)/login',
                  params: { returnTo: rto },
                } as any)
              }
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={['#3B82F6', '#4F46E5']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.primaryButtonInner}
              >
                <Text style={styles.primaryButtonText}>ログイン</Text>
                <Feather name="arrow-right" size={20} color="#FFFFFF" />
              </LinearGradient>
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>アカウントを作成</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Secondary CTAs */}
            <View style={styles.secondaryGroup}>
              {/* 親方・代表アカウントを作成 */}
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() =>
                  router.push({
                    pathname: '/(auth)/signup',
                    params: { returnTo: rto },
                  } as any)
                }
                activeOpacity={0.8}
              >
                <Text style={styles.secondaryButtonText}>
                  親方・代表アカウントを作成
                </Text>
              </TouchableOpacity>

              {/* 招待コードで参加 */}
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() =>
                  router.push('/(auth)/signup-with-code' as any)
                }
                activeOpacity={0.8}
              >
                <Text style={styles.secondaryButtonText}>招待コードで参加</Text>
              </TouchableOpacity>
            </View>

            {/* Footer links */}
            <View style={styles.footerLinks}>
              <Text style={styles.footerLink}>利用規約</Text>
              <Text style={styles.footerDot}>·</Text>
              <Text style={styles.footerLink}>プライバシー</Text>
            </View>
          </View>

        </View>
      </SafeAreaView>
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },

  // 背景デコ: w-96 h-96 bg-blue-500/10 top-0 right-0 / w-80 h-80 bg-indigo-500/10 bottom-0 left-0
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

  // flex-1 flex flex-col justify-between px-6 py-12
  content: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 48,
  },

  // flex flex-col items-center mt-16
  topSection: {
    alignItems: 'center',
    marginTop: 64,
  },

  // flex items-center gap-2.5 mb-8
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 32,
  },

  // w-11 h-11 rounded-2xl (Tailwind rounded-2xl = 1rem = 16px)
  logoBox: {
    width: 44,
    height: 44,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // text-3xl font-semibold text-white tracking-tight
  appName: {
    fontSize: 30,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },

  // text-center space-y-3 mb-12
  messageBlock: {
    alignItems: 'center',
    gap: 12,
    marginBottom: 48,
  },

  // text-2xl font-semibold text-white/95 leading-snug px-4
  messageTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.95)',
    textAlign: 'center',
    lineHeight: 34,
    paddingHorizontal: 16,
  },

  // text-base text-white/50 leading-relaxed px-2
  messageSub: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 8,
  },

  // space-y-4 max-w-sm mx-auto w-full
  ctaSection: {
    width: '100%',
    gap: 16,
  },

  // w-full h-14 rounded-full gradient
  primaryButtonWrap: {
    borderRadius: 999,
    overflow: 'hidden',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  primaryButtonInner: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
  },

  // flex items-center gap-3 py-2
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  dividerText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.4)',
  },

  // space-y-3
  secondaryGroup: {
    gap: 12,
  },

  // w-full h-14 rounded-full bg-white/5 border-white/10
  secondaryButton: {
    height: 56,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.9)',
  },

  // flex items-center justify-center gap-4 pt-6 text-sm
  footerLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingTop: 24,
  },
  footerLink: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.4)',
  },
  footerDot: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.2)',
  },
})
