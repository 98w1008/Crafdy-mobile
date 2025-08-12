import React, { useState } from 'react'
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native'
import { useAuth, useRole } from '@/contexts/AuthContext'
import { useStripe } from '@stripe/stripe-react-native'
import { supabase } from '@/lib/supabase'
import { router } from 'expo-router'
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '@/constants/GrayDesignTokens'
import { StyledText, StyledButton, Card } from '@/components/ui'

interface PlanInfo {
  id: string
  name: string
  price: number
  features: string[]
  isCurrentPlan: boolean
  popular?: boolean
}

interface SettingItem {
  id: string
  title: string
  subtitle?: string
  icon?: string
  onPress?: () => void
  value?: string
  type: 'action' | 'toggle' | 'info'
}

export default function SettingsScreen() {
  const { user, profile, signOut } = useAuth()
  const userRole = useRole()
  const { initPaymentSheet, presentPaymentSheet } = useStripe()
  const [loading, setLoading] = useState(false)
  const [upgrading, setUpgrading] = useState(false)

  // プラン情報
  const plans: PlanInfo[] = [
    {
      id: 'basic',
      name: '基本プラン',
      price: 0,
      features: [
        '最大3プロジェクト',
        '基本チャット機能',
        '日報作成',
        'PDF出力'
      ],
      isCurrentPlan: true
    },
    {
      id: 'professional',
      name: 'プロフェッショナル',
      price: 2980,
      popular: true,
      features: [
        '無制限プロジェクト',
        'AI分析機能',
        '写真OCR機能',
        '詳細レポート',
        '優先サポート'
      ],
      isCurrentPlan: false
    },
    {
      id: 'enterprise',
      name: 'エンタープライズ',
      price: 9800,
      features: [
        'プロフェッショナル全機能',
        'カスタムブランディング',
        '専任サポート',
        'API連携',
        'セキュリティ強化'
      ],
      isCurrentPlan: false
    }
  ]

  // 設定項目
  const settingsItems: SettingItem[] = [
    {
      id: 'profile',
      title: 'プロフィール編集',
      subtitle: 'アカウント情報を更新',
      type: 'action',
      onPress: () => Alert.alert('開発中', 'プロフィール編集機能は開発中です')
    },
    {
      id: 'pricing',
      title: 'プラン・料金',
      subtitle: 'プランの変更と料金情報',
      type: 'action',
      onPress: () => Alert.alert('開発中', 'プラン管理ページは開発中です')
    },
    {
      id: 'ai_estimation',
      title: 'AI見積もり設定',
      subtitle: 'テンプレート管理・履歴確認',
      type: 'action',
      onPress: () => Alert.alert('開発中', 'AI見積もり設定機能は開発中です')
    },
    {
      id: 'receipt_scan',
      title: 'レシート管理',
      subtitle: '読み取り履歴・自動仕訳設定',
      type: 'action',
      onPress: () => Alert.alert('開発中', 'レシート管理機能は開発中です')
    },
    {
      id: 'notifications',
      title: 'プッシュ通知',
      subtitle: '通知設定の管理',
      type: 'action',
      onPress: () => Alert.alert('開発中', '通知設定機能は開発中です')
    },
    {
      id: 'privacy',
      title: 'プライバシー設定',
      subtitle: 'データとプライバシーの管理',
      type: 'action',
      onPress: () => Alert.alert('開発中', 'プライバシー設定機能は開発中です')
    },
    {
      id: 'help',
      title: 'ヘルプ・サポート',
      subtitle: 'よくある質問とサポート',
      type: 'action',
      onPress: () => Alert.alert('開発中', 'ヘルプ機能は開発中です')
    }
  ]

  const currentPlan = plans.find(plan => plan.isCurrentPlan) || plans[0]

  const handleUpgrade = async (planId: string, price: number) => {
    if (price === 0) {
      Alert.alert('お知らせ', 'これは無料プランです。')
      return
    }

    setUpgrading(true)
    try {
      // Stripe決済処理（実装は既存と同じ）
      const { data, error } = await supabase.functions.invoke('create-payment-intent', {
        body: {
          amount: price * 100,
          currency: 'jpy',
          plan_id: planId,
          user_id: user?.id
        }
      })

      if (error) throw error

      const { client_secret } = data

      const { error: initError } = await initPaymentSheet({
        merchantDisplayName: 'Crafdy Mobile',
        paymentIntentClientSecret: client_secret,
        defaultBillingDetails: {
          name: profile?.full_name || user?.email || 'User',
          email: user?.email || '',
        },
        appearance: {
          colors: {
            primary: Colors?.primary?.DEFAULT ?? '#52525B',
          },
        },
      })

      if (initError) throw initError

      const { error: presentError } = await presentPaymentSheet()

      if (presentError) {
        if (presentError.code !== 'Canceled') {
          throw presentError
        }
        return
      }

      Alert.alert(
        '決済完了',
        `${plans.find(p => p.id === planId)?.name}にアップグレードしました！`,
        [{ text: 'OK', onPress: () => console.log('Plan upgraded:', planId) }]
      )

    } catch (error: any) {
      console.error('Payment error:', error)
      Alert.alert('エラー', error.message || '決済処理中にエラーが発生しました。')
    } finally {
      setUpgrading(false)
    }
  }

  const handleSignOut = async () => {
    Alert.alert(
      'ログアウト',
      'ログアウトしますか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: 'ログアウト',
          style: 'destructive',
          onPress: async () => {
            setLoading(true)
            try {
              await signOut()
              router.replace('/(auth)/login')
            } catch (error) {
              console.error('Sign out error:', error)
              Alert.alert('エラー', 'ログアウトに失敗しました')
            } finally {
              setLoading(false)
            }
          }
        }
      ]
    )
  }

  const renderUserInfo = () => (
    <Card variant="elevated" style={styles.userCard}>
      <View style={styles.userInfo}>
        <View style={styles.avatar}>
          <StyledText variant="heading2" color="onPrimary" align="center">
            {profile?.full_name?.charAt(0) || user?.email?.charAt(0) || 'U'}
          </StyledText>
        </View>
        <View style={styles.userDetails}>
          <StyledText variant="title" weight="semibold">
            {profile?.full_name || 'ユーザー'}
          </StyledText>
          <StyledText variant="body" color="secondary">
            {user?.email}
          </StyledText>
          <View style={styles.roleBadge}>
            <StyledText variant="caption" color="onPrimary" weight="medium">
              {userRole === 'owner' ? 'オーナー' : userRole === 'manager' ? 'マネージャー' : 'ワーカー'}
            </StyledText>
          </View>
        </View>
      </View>
    </Card>
  )

  const renderCurrentPlan = () => (
    <Card variant="elevated" style={styles.planCard}>
      <StyledText variant="subtitle" weight="semibold" style={styles.sectionTitle}>
        現在のプラン
      </StyledText>
      <View style={styles.currentPlanInfo}>
        <View>
          <StyledText variant="title" weight="semibold">
            {currentPlan.name}
          </StyledText>
          <StyledText variant="body" color="secondary">
            {currentPlan.price === 0 ? '無料' : `¥${currentPlan.price.toLocaleString()}/月`}
          </StyledText>
        </View>
        {!currentPlan.isCurrentPlan && (
          <StyledButton
            title="変更"
            variant="outline"
            size="sm"
            onPress={() => {}}
          />
        )}
      </View>
    </Card>
  )

  const renderPlanCard = (plan: PlanInfo) => (
    <Card
      key={plan.id}
      variant={plan.isCurrentPlan ? "filled" : "elevated"}
      style={[
        styles.planOption,
        plan.isCurrentPlan && styles.currentPlanOption,
        plan.popular && styles.popularPlan
      ]}
    >
      {plan.popular && (
        <View style={styles.popularBadge}>
          <StyledText variant="caption" color="onPrimary" weight="semibold">
            人気
          </StyledText>
        </View>
      )}
      
      <View style={styles.planHeader}>
        <StyledText variant="subtitle" weight="semibold">
          {plan.name}
        </StyledText>
        <StyledText variant="heading3" weight="bold" color="primary">
          {plan.price === 0 ? '無料' : `¥${plan.price.toLocaleString()}`}
          {plan.price > 0 && (
            <StyledText variant="body" color="secondary">/月</StyledText>
          )}
        </StyledText>
      </View>

      <View style={styles.features}>
        {plan.features.map((feature, index) => (
          <View key={index} style={styles.featureItem}>
            <StyledText variant="body" color="success" style={styles.checkmark}>
              ✓
            </StyledText>
            <StyledText variant="body" style={styles.featureText}>
              {feature}
            </StyledText>
          </View>
        ))}
      </View>

      {!plan.isCurrentPlan && (
        <StyledButton
          title={upgrading ? "処理中..." : "このプランにする"}
          variant="primary"
          onPress={() => handleUpgrade(plan.id, plan.price)}
          loading={upgrading}
          style={styles.upgradeButton}
        />
      )}

      {plan.isCurrentPlan && (
        <View style={styles.currentBadge}>
          <StyledText variant="body" color="primary" weight="semibold">
            現在のプラン
          </StyledText>
        </View>
      )}
    </Card>
  )

  const renderSettingItem = (item: SettingItem) => (
    <TouchableOpacity
      key={item.id}
      style={styles.settingItem}
      onPress={item.onPress}
      activeOpacity={0.7}
    >
      <View style={styles.settingContent}>
        <StyledText variant="body" weight="medium">
          {item.title}
        </StyledText>
        {item.subtitle && (
          <StyledText variant="caption" color="secondary">
            {item.subtitle}
          </StyledText>
        )}
      </View>
      <StyledText variant="body" color="tertiary">
        →
      </StyledText>
    </TouchableOpacity>
  )

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ヘッダー */}
        <View style={styles.header}>
          <StyledText variant="heading2" weight="bold">
            設定
          </StyledText>
        </View>

        {/* ユーザー情報 */}
        {renderUserInfo()}

        {/* 現在のプラン */}
        {renderCurrentPlan()}

        {/* 設定項目 */}
        <Card variant="elevated" style={styles.settingsCard}>
          <StyledText variant="subtitle" weight="semibold" style={styles.sectionTitle}>
            アプリ設定
          </StyledText>
          {settingsItems.map(renderSettingItem)}
        </Card>

        {/* ログアウトボタン */}
        <StyledButton
          title={loading ? "ログアウト中..." : "ログアウト"}
          variant="danger"
          onPress={handleSignOut}
          loading={loading}
          style={styles.signOutButton}
        />

        {/* フッター */}
        <View style={styles.footer}>
          <StyledText variant="caption" color="tertiary" align="center">
            Crafdy Mobile v1.0.0
          </StyledText>
          <StyledText variant="caption" color="tertiary" align="center">
            © 2024 Crafdy. All rights reserved.
          </StyledText>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors?.base?.background ?? '#F3F4F6',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing?.md,
    paddingBottom: Spacing['2xl'],
  },
  header: {
    marginBottom: Spacing?.lg,
    paddingTop: Spacing?.sm,
  },
  userCard: {
    marginBottom: Spacing?.lg,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 60,
    height: 60,
    backgroundColor: Colors?.primary?.DEFAULT ?? '#52525B',
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing?.md,
  },
  userDetails: {
    flex: 1,
  },
  roleBadge: {
    backgroundColor: Colors?.primary?.DEFAULT ?? '#52525B',
    paddingHorizontal: Spacing?.sm,
    paddingVertical: Spacing?.xs,
    borderRadius: BorderRadius?.md,
    alignSelf: 'flex-start',
    marginTop: Spacing?.xs,
  },
  planCard: {
    marginBottom: Spacing?.lg,
  },
  section: {
    marginBottom: Spacing?.lg,
  },
  sectionTitle: {
    marginBottom: Spacing?.md,
  },
  currentPlanInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  planOption: {
    marginBottom: Spacing?.md,
    position: 'relative',
  },
  currentPlanOption: {
    borderWidth: 2,
    borderColor: Colors?.primary?.DEFAULT ?? '#52525B',
  },
  popularPlan: {
    borderWidth: 2,
    borderColor: Colors?.semantic?.warning ?? '#D97706',
  },
  popularBadge: {
    position: 'absolute',
    top: -8,
    right: Spacing?.md,
    backgroundColor: Colors?.semantic?.warning ?? '#D97706',
    paddingHorizontal: Spacing?.sm,
    paddingVertical: Spacing?.xs,
    borderRadius: BorderRadius?.md,
    zIndex: 1,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing?.md,
  },
  features: {
    marginBottom: Spacing?.md,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing?.xs,
  },
  checkmark: {
    marginRight: Spacing?.sm,
    fontSize: Typography?.base,
  },
  featureText: {
    flex: 1,
  },
  upgradeButton: {
    marginTop: Spacing?.sm,
  },
  currentBadge: {
    backgroundColor: 'rgba(82, 82, 91, 0.1)',
    padding: Spacing?.sm,
    borderRadius: BorderRadius?.md,
    alignItems: 'center',
    marginTop: Spacing?.sm,
  },
  settingsCard: {
    marginBottom: Spacing?.lg,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing?.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors?.border?.light ?? '#E5E7EB',
  },
  settingContent: {
    flex: 1,
  },
  signOutButton: {
    marginBottom: Spacing?.lg,
  },
  footer: {
    alignItems: 'center',
    paddingTop: Spacing?.lg,
    gap: Spacing?.xs,
  },
})