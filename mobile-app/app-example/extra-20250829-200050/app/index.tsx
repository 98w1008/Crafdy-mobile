import { useEffect } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { router } from 'expo-router'
import { useAuth } from '@/contexts/AuthContext'

export default function IndexScreen() {
  const { user, loading } = useAuth()

  useEffect(() => {
    if (!loading) {
      console.log('🔍 Index: Determining navigation...', { user: !!user, loading })
      
      if (user) {
        console.log('✅ User authenticated, navigating to main chat')
        router.replace('/main-chat')
      } else {
        console.log('❌ No user, navigating to login')
        router.replace('/(auth)/login')
      }
    }
  }, [user, loading])

  // ログアウト時の自動ナビゲーション処理
  useEffect(() => {
    if (!loading && !user) {
      console.log('🚪 User logged out, ensuring we\'re on auth screen')
      // 現在のルートが(tabs)内にいる場合はログイン画面に戻す
      const currentRoute = router.canGoBack() ? 'unknown' : 'root'
      if (currentRoute === 'unknown') {
        router.replace('/(auth)/login')
      }
    }
  }, [user])

  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <Text style={styles.logo}>C</Text>
      </View>
      <Text style={styles.text}>読み込み中...</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  logoContainer: {
    width: 64,
    height: 64,
    backgroundColor: '#2563eb',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  logo: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
  text: {
    fontSize: 18,
    color: '#6b7280',
  },
})