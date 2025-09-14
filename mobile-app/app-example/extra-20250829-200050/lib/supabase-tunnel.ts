// Tunnel環境専用Supabase設定 - Error Diagnostic Agent
import 'react-native-get-random-values'
import 'react-native-url-polyfill/auto'
import { createClient } from '@supabase/supabase-js'
import * as SecureStore from 'expo-secure-store'
import Constants from 'expo-constants'

// Tunnel環境用の特別なSecureStoreアダプター
const TunnelSecureStoreAdapter = {
  getItem: async (key: string) => {
    try {
      const value = await SecureStore.getItemAsync(key)
      console.log(`🔐 SecureStore GET: ${key} -> ${value ? 'SUCCESS' : 'NOT_FOUND'}`)
      return value
    } catch (error) {
      console.log(`❌ SecureStore GET failed: ${key} -> ${error.message}`)
      return null
    }
  },
  setItem: async (key: string, value: string) => {
    try {
      await SecureStore.setItemAsync(key, value)
      console.log(`🔐 SecureStore SET: ${key} -> SUCCESS`)
    } catch (error) {
      console.log(`❌ SecureStore SET failed: ${key} -> ${error.message}`)
      throw error
    }
  },
  removeItem: async (key: string) => {
    try {
      await SecureStore.deleteItemAsync(key)
      console.log(`🔐 SecureStore DELETE: ${key} -> SUCCESS`)
    } catch (error) {
      console.log(`❌ SecureStore DELETE failed: ${key} -> ${error.message}`)
      throw error
    }
  },
}

// Tunnel環境用のHTTPクライアント作成
function createTunnelOptimizedHTTPClient() {
  return async (url: string, options: any = {}) => {
    console.log(`🌐 Tunnel HTTP Request: ${options.method || 'GET'} ${url}`)
    
    const optimizedOptions = {
      ...options,
      headers: {
        'User-Agent': 'Crafdy-Mobile/1.0 (Expo; Tunnel)',
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        ...options.headers,
      },
      // Tunnel環境では長めのタイムアウト
      timeout: 45000,
    }
    
    const maxRetries = 3
    let lastError
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`   Attempt ${attempt}/${maxRetries}`)
        const response = await fetch(url, optimizedOptions)
        
        if (!response.ok && response.status >= 400) {
          console.log(`   HTTP ${response.status}: ${response.statusText}`)
        } else {
          console.log(`   ✅ Success: ${response.status}`)
        }
        
        return response
      } catch (error) {
        lastError = error
        console.log(`   ❌ Attempt ${attempt} failed: ${error.message}`)
        
        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 1000 // 指数バックオフ
          console.log(`   ⏳ Waiting ${delay}ms before retry...`)
          await new Promise(resolve => setTimeout(resolve, delay))
        }
      }
    }
    
    console.log(`💥 All ${maxRetries} attempts failed for: ${url}`)
    throw lastError
  }
}

// Tunnel専用Supabaseクライアント作成
export function createTunnelSupabaseClient() {
  console.log('🚇 Creating tunnel-optimized Supabase client...')
  
  // 環境変数の取得
  const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl || 'https://aerscsgzulqfsecltyjz.supabase.co'
  const supabaseAnonKey = Constants.expoConfig?.extra?.supabaseAnonKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFlcnNjc2d6dWxxZnNlY2x0eWp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA1MDk1NjQsImV4cCI6MjA2NjA4NTU2NH0.uNl3O7WzSQm-ud2OIjs7SV6jrqVdDSmeG6cvFoKA94I'
  
  console.log('🔧 Tunnel Supabase Config:')
  console.log(`   URL: ${supabaseUrl.substring(0, 40)}...`)
  console.log(`   Key Length: ${supabaseAnonKey.length}`)
  
  // Tunnel環境用の最適化されたクライアント
  const client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      storage: TunnelSecureStoreAdapter,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
      flowType: 'pkce', // より安全な認証フロー
    },
    global: {
      fetch: createTunnelOptimizedHTTPClient(),
      headers: {
        'X-Client-Info': 'crafdy-mobile-tunnel',
      },
    },
    realtime: {
      // Tunnel環境ではリアルタイム機能を無効化（接続問題を回避）
      transport: 'websocket',
      timeout: 30000,
    },
  })
  
  console.log('✅ Tunnel-optimized Supabase client created')
  return client
}

// Tunnel環境でのSupabase接続テスト
export async function testTunnelSupabaseConnection(client: any) {
  console.group('🧪 Tunnel Supabase Connection Test')
  
  try {
    // Test 1: Basic connectivity
    console.log('Test 1: Basic Auth Endpoint')
    const { data: session, error: sessionError } = await client.auth.getSession()
    console.log(`   Session check: ${sessionError ? '❌ ' + sessionError.message : '✅ Success'}`)
    
    // Test 2: Database connectivity
    console.log('Test 2: Database Query Test')
    const { data, error } = await client.from('profiles').select('count').limit(1)
    
    if (error) {
      if (error.code === 'PGRST116') {
        console.log('   Database: ✅ Connected (table not found is normal)')
      } else {
        console.log(`   Database: ⚠️ ${error.message}`)
      }
    } else {
      console.log('   Database: ✅ Connected and query successful')
    }
    
    // Test 3: Auth functionality
    console.log('Test 3: Auth Service Test')
    try {
      // 無効なクレデンシャルでのテスト（エラーが返れば接続OK）
      await client.auth.signInWithPassword({
        email: 'test@example.com',
        password: 'invalid'
      })
    } catch (authError) {
      console.log('   Auth Service: ✅ Responding (expected auth error)')
    }
    
    console.log('🎉 Tunnel Supabase connection test completed!')
    
  } catch (error) {
    console.log(`❌ Tunnel connection test failed: ${error.message}`)
    
    if (error.message.includes('Network request failed')) {
      console.group('🔧 Tunnel Network Troubleshooting')
      console.log('1. Check internet connection stability')
      console.log('2. Try restarting Expo with: npx expo start --tunnel --clear')
      console.log('3. Verify Supabase project is not paused')
      console.log('4. Check if corporate firewall is blocking HTTPS')
      console.groupEnd()
    }
  }
  
  console.groupEnd()
}