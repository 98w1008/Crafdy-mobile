// React Native用のfetchとURLポリフィルを適切な順序で読み込み
import 'react-native-get-random-values'
import 'react-native-url-polyfill/auto'
import { createClient } from '@supabase/supabase-js'
import * as SecureStore from 'expo-secure-store'
import Constants from 'expo-constants'
import { safeJSONStringify, sanitizeUnicodeForJSON } from './unicode-utils'

// Expo公式ベストプラクティスに従った環境変数取得
function getConfigValue(key: string, description: string): string {
  console.log(`🔍 Loading ${description} from app config...`)
  
  // Constants.expoConfig.extraから値を取得（Expo公式推奨方法）
  const value = Constants.expoConfig?.extra?.[key]
  
  if (!value || value === 'undefined' || typeof value !== 'string' || value.trim() === '') {
    const errorMessage = `❌ ${description} not found in app config`
    console.error(errorMessage)
    console.error(`🔧 Troubleshooting steps:`)
    console.error(`   1. Check that .env file exists and contains ${key.toUpperCase()}`)
    console.error(`   2. Verify app.config.js loads the .env file with require('dotenv').config()`)
    console.error(`   3. Confirm ${key} is set in expo.extra in app.config.js`)
    console.error(`   4. Restart Expo with: npx expo start --clear`)
    console.error(`🔧 Current Constants.expoConfig.extra:`, Constants.expoConfig?.extra)
    
    throw new Error(`${description} is not properly configured`)
  }
  
  console.log(`✅ ${description} loaded successfully`)
  console.log(`   Length: ${value.length} characters`)
  console.log(`   Preview: ${value.substring(0, 30)}...`)
  
  return value
}

// Supabase設定の取得と検証
console.log('🔧 Initializing Supabase configuration...')
console.log('🔧 Using Constants.expoConfig.extra for environment variables')

let supabaseUrl: string
let supabaseAnonKey: string

try {
  // app.config.jsのextraフィールドから設定を取得
  supabaseUrl = getConfigValue('supabaseUrl', 'Supabase URL')
  supabaseAnonKey = getConfigValue('supabaseAnonKey', 'Supabase Anonymous Key')
  
  // URL形式の検証
  if (!supabaseUrl.startsWith('https://')) {
    throw new Error(`❌ Invalid Supabase URL format: must start with https://`)
  }
  
  if (!supabaseUrl.includes('.supabase.co')) {
    throw new Error(`❌ Invalid Supabase URL format: must be a .supabase.co domain`)
  }
  
  // キーの形式検証（JWT形式）
  const keyParts = supabaseAnonKey.split('.')
  if (keyParts.length !== 3) {
    throw new Error(`❌ Invalid Supabase anon key format: must be a valid JWT token`)
  }
  
  if (supabaseAnonKey.length < 100) {
    throw new Error(`❌ Invalid Supabase anon key: too short (${supabaseAnonKey.length} characters)`)
  }
  
  console.log('✅ Supabase configuration validation passed')
  
} catch (error) {
  console.error('🚨 Supabase configuration failed:', error.message)
  
  // 詳細なデバッグ情報
  console.group('🔧 Configuration Debug Information')
  console.log('Constants object exists:', !!Constants)
  console.log('Constants.expoConfig exists:', !!Constants.expoConfig)
  console.log('Constants.expoConfig.extra exists:', !!Constants.expoConfig?.extra)
  
  if (Constants.expoConfig?.extra) {
    console.log('Available keys in extra:', Object.keys(Constants.expoConfig.extra))
    console.log('supabaseUrl in extra:', !!Constants.expoConfig.extra.supabaseUrl)
    console.log('supabaseAnonKey in extra:', !!Constants.expoConfig.extra.supabaseAnonKey)
  } else {
    console.log('Constants.expoConfig.extra is empty or undefined')
  }
  
  console.log('App environment:', Constants.expoConfig?.extra?.environment || 'unknown')
  console.log('Config loaded at:', Constants.expoConfig?.extra?.configLoadedAt || 'unknown')
  console.groupEnd()
  
  // 開発環境でのフォールバック（デバッグ用のみ）
  if (__DEV__) {
    console.warn('⚠️ Using fallback configuration for development')
    console.warn('⚠️ This will NOT work in production - please fix the configuration')
    
    supabaseUrl = 'https://aerscsgzulqfsecltyjz.supabase.co'
    supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFlcnNjc2d6dWxxZnNlY2x0eWp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA1MDk1NjQsImV4cCI6MjA2NjA4NTU2NH0.uNl3O7WzSQm-ud2OIjs7SV6jrqVdDSmeG6cvFoKA94I'
  } else {
    throw error
  }
}

// SecureStoreを使ったセッション永続化（Expo推奨方法）
const ExpoSecureStoreAdapter = {
  getItem: (key: string) => {
    return SecureStore.getItemAsync(key)
  },
  setItem: (key: string, value: string) => {
    return SecureStore.setItemAsync(key, value)
  },
  removeItem: (key: string) => {
    return SecureStore.deleteItemAsync(key)
  },
}

// Tunnel環境専用のHTTPクライアント
const createTunnelHTTPClient = () => {
  return async (url: string, options: any = {}) => {
    console.log(`🚇 Tunnel HTTP: ${options.method || 'GET'} ${url}`)
    
    // リクエストボディのUnicode文字を安全に処理
    let processedBody = options.body
    if (processedBody && typeof processedBody === 'string') {
      try {
        const parsed = JSON.parse(processedBody)
        processedBody = safeJSONStringify(parsed)
      } catch {
        processedBody = sanitizeUnicodeForJSON(processedBody)
      }
    }
    
    const tunnelOptions = {
      ...options,
      body: processedBody,
      headers: {
        'User-Agent': 'Crafdy-Mobile-Tunnel/1.0',
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Tunnel-Client': 'expo-tunnel',
        // ⚠️ 重要: Supabase API key を確実に含める
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`,
        ...options.headers,
      },
      // Tunnel環境では長いタイムアウト必須
      timeout: 60000,
    }
    
    // デバッグ: ヘッダーの確認
    console.log(`   🔑 Headers:`, {
      hasApiKey: !!tunnelOptions.headers.apikey,
      hasAuth: !!tunnelOptions.headers.Authorization,
      apiKeyLength: tunnelOptions.headers.apikey?.length || 0
    })
    
    // 3回リトライで確実に接続
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        console.log(`   🔄 Attempt ${attempt}/3`)
        const response = await fetch(url, tunnelOptions)
        console.log(`   ✅ Success: ${response.status}`)
        return response
      } catch (error) {
        console.log(`   ❌ Attempt ${attempt} failed: ${error.message}`)
        
        if (attempt < 3) {
          // 指数バックオフでリトライ
          const delay = Math.pow(2, attempt) * 2000
          console.log(`   ⏳ Waiting ${delay}ms...`)
          await new Promise(resolve => setTimeout(resolve, delay))
        }
      }
    }
    
    throw new Error('Tunnel connection failed after 3 attempts')
  }
}

// Supabaseクライアントの作成（Tunnel最適化版）
console.log('🔧 Creating tunnel-optimized Supabase client...')
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    flowType: 'pkce', // より安全な認証フロー
  },
  global: {
    fetch: createTunnelHTTPClient(),
    headers: {
      'X-Client-Info': 'crafdy-mobile-tunnel',
      'X-Tunnel-Optimized': 'true',
    },
  },
  realtime: {
    // Tunnel環境ではWebSocket接続を慎重に
    transport: 'websocket',
    timeout: 45000,
  },
})
console.log('✅ Tunnel-optimized Supabase client created')

// 包括的な接続テスト
const testSupabaseConnection = async () => {
  try {
    console.log('🔧 Starting comprehensive Supabase connection test...')
    
    // Test 1: Basic fetch test
    console.log('Test 1: Basic network connectivity')
    const basicTest = await fetch('https://httpbin.org/get', { method: 'HEAD' })
    console.log(`   Basic connectivity: ${basicTest.status === 200 ? '✅ PASS' : '❌ FAIL'}`)
    
    // Test 2: Supabase health check
    console.log('Test 2: Supabase server health check')
    const healthResponse = await fetch(`${supabaseUrl}/rest/v1/`, {
      method: 'HEAD',
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`
      }
    })
    
    const healthStatus = healthResponse.ok || healthResponse.status === 401
    console.log(`   Supabase health: ${healthStatus ? '✅ PASS' : '❌ FAIL'} (Status: ${healthResponse.status})`)
    
    if (healthStatus) {
      // Test 3: Supabase client test
      console.log('Test 3: Supabase client functionality')
      const { data, error } = await supabase.from('profiles').select('count').limit(1)
      
      if (error) {
        if (error.code === 'PGRST116') {
          console.log('   Client test: ✅ PASS (table not found is expected)')
        } else {
          console.log(`   Client test: ⚠️ WARNING (${error.message})`)
        }
      } else {
        console.log('   Client test: ✅ PASS')
      }
      
      console.log('🎉 Supabase connection test completed successfully!')
    } else {
      console.log('❌ Supabase health check failed - skipping client test')
    }
    
  } catch (err) {
    console.log('❌ Supabase connection test failed:', err.message)
    
    if (err.message.includes('Network request failed')) {
      console.group('🔧 Network Error Troubleshooting Guide')
      console.log('1. Check your internet connection')
      console.log('2. Verify Supabase project is not paused')
      console.log('3. Confirm the Supabase URL is correct')
      console.log('4. Check if you\'re behind a firewall or proxy')
      console.log('5. Try restarting the Expo development server')
      console.groupEnd()
    }
  }
}

// 開発環境でのみ接続テストを実行
if (__DEV__) {
  setTimeout(() => {
    testSupabaseConnection()
  }, 2000) // アプリの初期化完了を待つ
}

// 認証ヘルパー関数
export const signOut = async () => {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export const getCurrentUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error) throw error
  return user
}

export const getCurrentSession = async () => {
  const { data: { session }, error } = await supabase.auth.getSession()
  if (error) throw error
  return session
}

// 設定情報の確認用エクスポート（デバッグ用）
export const getSupabaseConfig = () => ({
  url: supabaseUrl,
  hasAnonKey: !!supabaseAnonKey,
  anonKeyLength: supabaseAnonKey.length,
  configSource: 'Constants.expoConfig.extra'
})

// デバッグ用：環境設定の詳細確認
export const debugConfiguration = () => {
  console.group('🔧 Supabase Configuration Debug')
  console.log('Configuration Source: Constants.expoConfig.extra')
  console.log('Supabase URL:', supabaseUrl?.substring(0, 40) + '...')
  console.log('Anon Key Length:', supabaseAnonKey?.length)
  console.log('Available Extra Keys:', Object.keys(Constants.expoConfig?.extra || {}))
  console.log('Environment:', Constants.expoConfig?.extra?.environment)
  console.groupEnd()
}

// グローバルデバッグ関数（開発環境のみ）
if (__DEV__) {
  global.debugSupabase = debugConfiguration
}