import { createClient } from '@supabase/supabase-js'
import Constants from 'expo-constants'

// Prefer EXPO_PUBLIC_* (bundler) and fall back to app.config.js extra
const url = process.env.EXPO_PUBLIC_SUPABASE_URL
  || (Constants?.expoConfig as any)?.extra?.supabaseUrl
  || ''
const anon = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
  || (Constants?.expoConfig as any)?.extra?.supabaseAnonKey
  || ''

const isValidJwt = (t: string) => {
  // Very lightweight JWT shape check (3 segments). Avoid decoding to keep it safe.
  return /^[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+$/.test(t)
}

const summarizeSecret = (v: string) => {
  const len = v.length
  if (!v) return '(missing)'
  if (len < 16) return `(too short) (len=${len})`
  return `${v.slice(0, 8)}...${v.slice(-8)}(len=${len})`
}

const anonIsJwt = isValidJwt(anon)

// Runtime diagnostics (no full secrets)
console.log(`[supabase] url: ${url || '(missing)'}`)
console.log(`[supabase] anon: ${summarizeSecret(anon)}`)
console.log(`[supabase] isValidJwt: ${anonIsJwt}`)

export const supabaseReady = !!url && !!anon && anonIsJwt

if (!supabaseReady) {
  console.warn('[supabase] Missing or invalid env. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY (JWT).')
}

export type SupabaseAuthProbeResult = {
  status: number
  body: string
  err: string
}

let probePromise: Promise<SupabaseAuthProbeResult> | null = null

/**
 * One-shot probe to classify auth failures.
 * Logs are intentionally fixed to two lines (no secrets).
 */
export function probeAuthSettingsOnce(): Promise<SupabaseAuthProbeResult> {
  if (probePromise) return probePromise

  probePromise = (async () => {
    let status = 0
    let body = ''
    let err = ''

    try {
      if (!supabaseReady) {
        err = 'supabase not ready'
        return { status, body, err }
      }

      const endpoint = `${url.replace(/\/$/, '')}/auth/v1/settings`
      const res = await fetch(endpoint, {
        method: 'GET',
        headers: {
          apikey: anon,
          Authorization: `Bearer ${anon}`,
        },
      })

      status = res.status

      try {
        const text = await res.text()
        if (text) {
          try {
            const json = JSON.parse(text)
            body = (json?.msg || json?.message || json?.hint || json?.error_description || json?.error || '')
              .toString()
              .slice(0, 160)
          } catch {
            body = text.slice(0, 160)
          }
        }
      } catch {
        body = ''
      }

      return { status, body, err }
    } catch (e: any) {
      err = (e?.message || String(e) || 'fetch error').toString().slice(0, 160)
      return { status, body, err }
    } finally {
      console.log(`[supabase][probe] GET /auth/v1/settings status=${status}`)
      console.log(`[supabase][probe] body=${body || ''} | err=${err || ''}`)
    }
  })()

  return probePromise
}

// Kick off probe once (non-blocking) before creating the client.
void probeAuthSettingsOnce()

export const supabase = supabaseReady ? createClient(url, anon) : null
