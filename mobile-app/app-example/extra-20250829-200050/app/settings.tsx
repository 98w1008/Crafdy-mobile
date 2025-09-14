/**
 * 統合設定画面
 * テーマ切替・アカウント情報編集・その他設定
 */

import React, { useState, useEffect } from 'react'
import {
  View,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
  Switch,
} from 'react-native'
import {
  Surface,
  Text,
  Button,
  List,
  Divider,
  Menu,
  IconButton,
  TextInput,
  Avatar,
} from 'react-native-paper'
import { router } from 'expo-router'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/theme/ThemeProvider'
import * as Haptics from 'expo-haptics'

// =============================================================================
// TYPES
// =============================================================================

type ThemeMode = 'light' | 'dark' | 'system'

interface UserProfile {
  name: string
  email: string
  role: string
  avatar?: string
  company?: string
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function SettingsScreen() {
  const { user, signOut } = useAuth()
  const { isDark } = useTheme()
  
  // State
  const [themeMode, setThemeMode] = useState<ThemeMode>('system')
  const [showThemeMenu, setShowThemeMenu] = useState(false)
  const [notificationsEnabled, setNotificationsEnabled] = useState(true)
  const [autoBackup, setAutoBackup] = useState(true)
  const [profile, setProfile] = useState<UserProfile>({
    name: user?.user_metadata?.name || '',
    email: user?.email || '',
    role: '職長',
    company: 'クラフディ建設',
  })
  const [editingProfile, setEditingProfile] = useState(false)

  // テーマ設定の読み込み
  useEffect(() => {
    // TODO: AsyncStorageからテーマ設定を読み込み
    loadThemeSettings()
  }, [])

  const loadThemeSettings = async () => {
    try {
      // TODO: AsyncStorageから設定を読み込み
      // const savedTheme = await AsyncStorage.getItem('theme')
      // if (savedTheme) {
      //   setThemeMode(savedTheme as ThemeMode)
      // }
    } catch (error) {
      console.error('テーマ設定の読み込みエラー:', error)
    }
  }

  const saveThemeSettings = async (theme: ThemeMode) => {
    try {
      // TODO: AsyncStorageにテーマ設定を保存
      // await AsyncStorage.setItem('theme', theme)
      setThemeMode(theme)
    } catch (error) {
      console.error('テーマ設定の保存エラー:', error)
    }
  }

  // ヘッダー
  const renderHeader = () => (
    <Surface style={styles.header}>
      <IconButton
        icon="arrow-left"
        size={24}
        onPress={() => {
          if (Haptics) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
          }
          router.back()
        }}
      />
      <Text variant="headlineSmall" style={styles.headerTitle}>設定</Text>
      <View style={{ width: 48 }} />
    </Surface>
  )

  // プロフィール編集
  const renderProfileSection = () => (
    <Surface style={styles.section}>
      <Text variant="titleMedium" style={styles.sectionTitle}>プロフィール</Text>
      
      <View style={styles.profileContainer}>
        <Avatar.Text 
          size={60} 
          label={profile.name.charAt(0)} 
          style={styles.avatar}
        />
        <View style={styles.profileInfo}>
          {editingProfile ? (
            <>
              <TextInput
                mode="outlined"
                label="名前"
                value={profile.name}
                onChangeText={(text) => setProfile(prev => ({ ...prev, name: text }))}
                style={styles.profileInput}
              />
              <TextInput
                mode="outlined" 
                label="会社名"
                value={profile.company}
                onChangeText={(text) => setProfile(prev => ({ ...prev, company: text }))}
                style={styles.profileInput}
              />
            </>
          ) : (
            <>
              <Text variant="titleMedium">{profile.name}</Text>
              <Text variant="bodyMedium" style={styles.profileDetail}>
                {profile.company}
              </Text>
              <Text variant="bodySmall" style={styles.profileDetail}>
                {profile.email}
              </Text>
            </>
          )}
        </View>
        <IconButton
          icon={editingProfile ? 'check' : 'pencil'}
          size={20}
          onPress={() => {
            if (Haptics) {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
            }
            if (editingProfile) {
              // TODO: プロフィール更新をSupabaseに保存
              Alert.alert('更新完了', 'プロフィールを更新しました')
            }
            setEditingProfile(!editingProfile)
          }}
        />
      </View>
    </Surface>
  )

  // テーマ設定
  const renderThemeSection = () => (
    <Surface style={styles.section}>
      <Text variant="titleMedium" style={styles.sectionTitle}>外観</Text>
      
      <Menu
        visible={showThemeMenu}
        onDismiss={() => setShowThemeMenu(false)}
        anchor={
          <List.Item
            title="テーマ"
            description={
              themeMode === 'light' ? 'ライト' :
              themeMode === 'dark' ? 'ダーク' : '端末に合わせる'
            }
            left={(props) => <List.Icon {...props} icon="palette" />}
            right={(props) => <List.Icon {...props} icon="chevron-down" />}
            onPress={() => setShowThemeMenu(true)}
          />
        }
      >
        <Menu.Item
          onPress={() => {
            saveThemeSettings('light')
            setShowThemeMenu(false)
          }}
          title="ライト"
          leadingIcon="weather-sunny"
        />
        <Menu.Item
          onPress={() => {
            saveThemeSettings('dark')
            setShowThemeMenu(false)
          }}
          title="ダーク"
          leadingIcon="weather-night"
        />
        <Menu.Item
          onPress={() => {
            saveThemeSettings('system')
            setShowThemeMenu(false)
          }}
          title="端末に合わせる"
          leadingIcon="cog"
        />
      </Menu>
    </Surface>
  )

  // アプリ設定
  const renderAppSettingsSection = () => (
    <Surface style={styles.section}>
      <Text variant="titleMedium" style={styles.sectionTitle}>アプリ設定</Text>
      
      <List.Item
        title="通知"
        description="新着メッセージや更新通知"
        left={(props) => <List.Icon {...props} icon="bell" />}
        right={() => (
          <Switch
            value={notificationsEnabled}
            onValueChange={setNotificationsEnabled}
            color="#007AFF"
          />
        )}
      />
      
      <List.Item
        title="自動バックアップ"
        description="データを自動的にクラウドに保存"
        left={(props) => <List.Icon {...props} icon="cloud-upload" />}
        right={() => (
          <Switch
            value={autoBackup}
            onValueChange={setAutoBackup}
            color="#007AFF"
          />
        )}
      />
      
      <List.Item
        title="ストレージ管理"
        description="キャッシュと一時ファイルを削除"
        left={(props) => <List.Icon {...props} icon="folder-cog" />}
        right={(props) => <List.Icon {...props} icon="chevron-right" />}
        onPress={() => {
          Alert.alert(
            'ストレージをクリア',
            'キャッシュファイルを削除しますか？',
            [
              { text: 'キャンセル', style: 'cancel' },
              { 
                text: '削除',
                style: 'destructive',
                onPress: () => {
                  // TODO: キャッシュクリア処理
                  Alert.alert('完了', 'キャッシュを削除しました')
                }
              }
            ]
          )
        }}
      />
    </Surface>
  )

  // サポート・情報
  const renderSupportSection = () => (
    <Surface style={styles.section}>
      <Text variant="titleMedium" style={styles.sectionTitle}>サポート・情報</Text>
      
      <List.Item
        title="使い方ガイド"
        description="アプリの基本操作を確認"
        left={(props) => <List.Icon {...props} icon="help-circle" />}
        right={(props) => <List.Icon {...props} icon="chevron-right" />}
        onPress={() => {
          // TODO: ヘルプページへ遷移
          Alert.alert('準備中', 'ヘルプページは準備中です')
        }}
      />
      
      <List.Item
        title="お問い合わせ"
        description="不具合報告や機能要望"
        left={(props) => <List.Icon {...props} icon="email" />}
        right={(props) => <List.Icon {...props} icon="chevron-right" />}
        onPress={() => {
          // TODO: お問い合わせフォームへ遷移
          Alert.alert('準備中', 'お問い合わせフォームは準備中です')
        }}
      />
      
      <List.Item
        title="バージョン情報"
        description="v1.0.0"
        left={(props) => <List.Icon {...props} icon="information" />}
        right={(props) => <List.Icon {...props} icon="chevron-right" />}
        onPress={() => {
          Alert.alert('Crafdy Mobile v1.0.0', 'ビルド: 2024.01.01')
        }}
      />
    </Surface>
  )

  // アカウント操作
  const renderAccountSection = () => (
    <Surface style={styles.section}>
      <Text variant="titleMedium" style={styles.sectionTitle}>アカウント</Text>
      
      <List.Item
        title="パスワード変更"
        description="アカウントのパスワードを変更"
        left={(props) => <List.Icon {...props} icon="key" />}
        right={(props) => <List.Icon {...props} icon="chevron-right" />}
        onPress={() => {
          // TODO: パスワード変更画面へ遷移
          Alert.alert('準備中', 'パスワード変更は準備中です')
        }}
      />
      
      <List.Item
        title="ログアウト"
        description="アカウントからログアウト"
        left={(props) => <List.Icon {...props} icon="logout" color="#FF3B30" />}
        titleStyle={{ color: '#FF3B30' }}
        onPress={() => {
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
                    await signOut()
                    router.replace('/auth-screen')
                  } catch (error) {
                    Alert.alert('エラー', 'ログアウトに失敗しました')
                  }
                }
              }
            ]
          )
        }}
      />
    </Surface>
  )

  return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}
      
      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {renderProfileSection()}
        <Divider style={styles.divider} />
        
        {renderThemeSection()}
        <Divider style={styles.divider} />
        
        {renderAppSettingsSection()}
        <Divider style={styles.divider} />
        
        {renderSupportSection()}
        <Divider style={styles.divider} />
        
        {renderAccountSection()}
        
        <View style={styles.bottomSpacing} />
      </ScrollView>
    </SafeAreaView>
  )
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 8,
    elevation: 2,
  },
  headerTitle: {
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  section: {
    margin: 16,
    marginBottom: 8,
    borderRadius: 12,
    elevation: 1,
  },
  sectionTitle: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    fontWeight: 'bold',
  },
  profileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  avatar: {
    backgroundColor: '#007AFF',
  },
  profileInfo: {
    flex: 1,
    marginLeft: 12,
  },
  profileDetail: {
    color: '#666',
    marginTop: 2,
  },
  profileInput: {
    marginBottom: 8,
    backgroundColor: 'white',
  },
  divider: {
    marginHorizontal: 16,
    marginVertical: 8,
  },
  bottomSpacing: {
    height: 100,
  },
})