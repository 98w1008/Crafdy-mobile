import { createClient } from '@supabase/supabase-js'
import Constants from 'expo-constants'

// Prefer EXPO_PUBLIC_* (bundler) and fall back to app.config.js extra
export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL
  || (Constants?.expoConfig as any)?.extra?.supabaseUrl
  || ''
export const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
  || (Constants?.expoConfig as any)?.extra?.supabaseAnonKey
  || ''

const isValidJwt = (t: string) =>
  /^[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+$/.test(t)

export const supabaseReady = !!SUPABASE_URL && !!SUPABASE_ANON_KEY && isValidJwt(SUPABASE_ANON_KEY)

if (!supabaseReady) {
  console.warn('[supabase] Missing or invalid env. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY (JWT).')
}

import AsyncStorage from '@react-native-async-storage/async-storage'

export const supabase = supabaseReady
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  })
  : null
