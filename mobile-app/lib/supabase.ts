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

export type SupabaseAuthProbeResult = {
  status: number
  body: string
  err: string
}

let probePromise: Promise<SupabaseAuthProbeResult> | null = null

/**
 * One-time probe to classify auth failures:
 * - status=200: reachable, key likely OK
 * - status=401/403: key mismatch (do not retry)
 * - status=0 + err=Network request failed: network unreachable (do not retry)
 *
 * Logs are intentionally fixed to two lines (no secrets).
 */
export function probeAuthSettingsOnce(): Promise<SupabaseAuthProbeResult> {
  if (probePromise) return probePromise

  probePromise = (async () => {
    // Default values
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
        // Keep body short and safe: only a message-like field if possible.
        if (text) {
          try {
            const json = JSON.parse(text)
            body = (json?.msg || json?.message || json?.error_description || json?.error || '').toString().slice(0, 160)
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
      // Required fixed logs (always, once per process)
      // NOTE: Do not include full keys.
      console.log(`[supabase][probe] status=${status}`)
      console.log(`[supabase][probe] body=${body || ''} | err=${err || ''}`)
    }
  })()

  return probePromise
}

// Kick off probe once (non-blocking) before creating the client.
void probeAuthSettingsOnce()

export const supabase = supabaseReady ? createClient(url, anon) : null
