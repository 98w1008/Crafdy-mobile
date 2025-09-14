import { createClient } from '@supabase/supabase-js'
import Constants from 'expo-constants'

// Prefer EXPO_PUBLIC_* (bundler) and fall back to app.config.js extra
const url = process.env.EXPO_PUBLIC_SUPABASE_URL
  || (Constants?.expoConfig as any)?.extra?.supabaseUrl
  || ''
const anon = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
  || (Constants?.expoConfig as any)?.extra?.supabaseAnonKey
  || ''

const isValidJwt = (t: string) =>
  /^[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+$/.test(t)

export const supabaseReady = !!url && !!anon && isValidJwt(anon)

if (!supabaseReady) {
  console.warn('[supabase] Missing or invalid env. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY (JWT).')
}

export const supabase = supabaseReady ? createClient(url, anon) : null
