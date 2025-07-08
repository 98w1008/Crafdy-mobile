import React, { useEffect, useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native'
import { router } from 'expo-router'
import { supabase } from '../../src/lib/supabase'
import { useAuth } from '../../src/contexts/AuthContext'

export default function SettingsScreen() {
  const { user, loading, signOut } = useAuth()
  const [signingOut, setSigningOut] = useState(false)

  const handleLogout = async () => {
    Alert.alert(
      'ログアウト',
      'ログアウトしますか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: 'ログアウト',
          style: 'destructive',
          onPress: async () => {
            try {
              setSigningOut(true)
              await signOut()
              router.replace('/(auth)/auth-screen')
            } catch (error) {
              Alert.alert('エラー', 'ログアウトに失敗しました')
              console.error('Logout error:', error)
            } finally {
              setSigningOut(false)
            }
          }
        }
      ]
    )
  }

  const settingsItems = [
    {
      category: 'アカウント',
      items: [
        {
          title: 'プロフィール編集',
          subtitle: '名前やプロフィール写真の変更',
          icon: '👤',
          onPress: () => Alert.alert('開発中', 'この機能は開発中です'),
        },
        {
          title: '会社情報',
          subtitle: '会社名や住所の設定',
          icon: '🏢',
          onPress: () => Alert.alert('開発中', 'この機能は開発中です'),
        },
        {
          title: 'パスワード変更',
          subtitle: 'セキュリティの向上',
          icon: '🔐',
          onPress: () => Alert.alert('開発中', 'この機能は開発中です'),
        },
      ]
    },
    {
      category: 'アプリ設定',
      items: [
        {
          title: '通知設定',
          subtitle: 'プッシュ通知の管理',
          icon: '🔔',
          onPress: () => Alert.alert('開発中', 'この機能は開発中です'),
        },
        {
          title: 'テーマ設定',
          subtitle: 'ダークモード・ライトモード',
          icon: '🎨',
          onPress: () => Alert.alert('開発中', 'この機能は開発中です'),
        },
        {
          title: 'データ同期',
          subtitle: 'オフラインデータの管理',
          icon: '🔄',
          onPress: () => Alert.alert('開発中', 'この機能は開発中です'),
        },
      ]
    },
    {
      category: 'サブスクリプション',
      items: [
        {
          title: '料金プラン',
          subtitle: 'プランの確認・変更',
          icon: '💳',
          onPress: () => Alert.alert('開発中', 'この機能は開発中です'),
        },
        {
          title: '利用状況',
          subtitle: 'AI機能の使用量',
          icon: '📊',
          onPress: () => Alert.alert('開発中', 'この機能は開発中です'),
        },
        {
          title: '請求履歴',
          subtitle: '支払い履歴の確認',
          icon: '📄',
          onPress: () => Alert.alert('開発中', 'この機能は開発中です'),
        },
      ]
    },
    {
      category: 'サポート',
      items: [
        {
          title: 'ヘルプ・FAQ',
          subtitle: 'よくある質問',
          icon: '❓',
          onPress: () => Alert.alert('開発中', 'この機能は開発中です'),
        },
        {
          title: 'お問い合わせ',
          subtitle: 'サポートチームに連絡',
          icon: '📧',
          onPress: () => Alert.alert('開発中', 'この機能は開発中です'),
        },
        {
          title: 'フィードバック',
          subtitle: 'アプリの改善提案',
          icon: '💬',
          onPress: () => Alert.alert('開発中', 'この機能は開発中です'),
        },
      ]
    },
    {
      category: 'その他',
      items: [
        {
          title: 'プライバシーポリシー',
          subtitle: '個人情報の取り扱い',
          icon: '🔒',
          onPress: () => Alert.alert('開発中', 'この機能は開発中です'),
        },
        {
          title: '利用規約',
          subtitle: 'サービス利用規約',
          icon: '📋',
          onPress: () => Alert.alert('開発中', 'この機能は開発中です'),
        },
        {
          title: 'アプリ情報',
          subtitle: 'バージョン情報',
          icon: 'ℹ️',
          onPress: () => Alert.alert('アプリ情報', 'Crafdy Mobile v1.0.0\nBuild: 2025.1.1'),
        },
      ]
    }
  ]

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.loadingText}>読み込み中...</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>設定</Text>
      </View>

      <ScrollView style={styles.content}>
        {/* User Info */}
        <View style={styles.userCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user?.email?.charAt(0).toUpperCase() || 'U'}
            </Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>
              {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'ユーザー'}
            </Text>
            <Text style={styles.userEmail}>{user?.email}</Text>
            <View style={styles.planBadge}>
              <Text style={styles.planText}>フリープラン</Text>
            </View>
          </View>
        </View>

        {/* Settings Sections */}
        {settingsItems.map((section, sectionIndex) => (
          <View key={sectionIndex} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.category}</Text>
            <View style={styles.sectionContent}>
              {section.items.map((item, itemIndex) => (
                <TouchableOpacity 
                  key={itemIndex} 
                  style={[
                    styles.settingItem,
                    itemIndex === section.items.length - 1 && styles.lastItem
                  ]}
                  onPress={item.onPress}
                >
                  <View style={styles.settingLeft}>
                    <Text style={styles.settingIcon}>{item.icon}</Text>
                    <View style={styles.settingTextContainer}>
                      <Text style={styles.settingTitle}>{item.title}</Text>
                      <Text style={styles.settingSubtitle}>{item.subtitle}</Text>
                    </View>
                  </View>
                  <Text style={styles.chevron}>›</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        {/* Logout Button */}
        <View style={styles.logoutSection}>
          <TouchableOpacity 
            style={[styles.logoutButton, signingOut && styles.logoutButtonDisabled]} 
            onPress={handleLogout}
            disabled={signingOut}
          >
            <Text style={styles.logoutButtonText}>
              {signingOut ? 'ログアウト中...' : 'ログアウト'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            © 2025 Crafdy Mobile. All rights reserved.
          </Text>
        </View>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  header: {
    backgroundColor: 'white',
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  content: {
    flex: 1,
    padding: 24,
  },
  loadingText: {
    fontSize: 16,
    color: '#6b7280',
  },
  userCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  avatarText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  planBadge: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  planText: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '500',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  sectionContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  lastItem: {
    borderBottomWidth: 0,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    fontSize: 20,
    marginRight: 16,
  },
  settingTextContainer: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  chevron: {
    fontSize: 20,
    color: '#d1d5db',
    fontWeight: 'bold',
  },
  logoutSection: {
    marginTop: 24,
    marginBottom: 32,
  },
  logoutButton: {
    backgroundColor: '#ef4444',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  logoutButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  logoutButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  footerText: {
    fontSize: 12,
    color: '#9ca3af',
  },
})