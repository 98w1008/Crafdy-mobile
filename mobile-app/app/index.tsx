import { useEffect } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { router } from 'expo-router'
import { useAuth } from '../src/contexts/AuthContext'

export default function IndexScreen() {
  const { user, loading } = useAuth()

  useEffect(() => {
    console.log('🚀 Index screen - Loading:', loading, 'User:', user ? 'exists' : 'null')
    
    if (!loading) {
      if (user) {
        console.log('🚀 Navigating to tabs...')
        router.replace('/(tabs)')
      } else {
        console.log('🚀 Navigating to auth...')
        router.replace('/(auth)/auth-screen')
      }
    }
  }, [user, loading])

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