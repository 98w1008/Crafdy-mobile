import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { Session, User } from '@supabase/supabase-js'
import { supabase, supabaseReady, probeAuthSettingsOnce } from '@/lib/supabase'
import { loadDemoFlag } from '@/lib/api'
import { setAccessToken as setStoredAccessToken } from '@/lib/token-store'

type UserRole = 'parent' | 'lead' | 'worker'

interface UserProfile {
  id: string
  full_name: string | null
  email: string
  role: UserRole
  company: string | null
  daily_rate?: number
  is_active: boolean
  created_at: string
  updated_at: string
}

interface ProjectAccess {
  project_id: string
  project_name: string
  role: 'parent' | 'lead'
  prefecture?: string // Added for UI display
  started_at?: string
  ended_at?: string
}

interface AuthContextType {
  user: User | null
  session: Session | null
  accessToken: string | null
  accessTokenRef: React.MutableRefObject<string | null>
  profile: UserProfile | null
  projectAccess: ProjectAccess[]
  loading: boolean
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
  refreshProjectAccess: () => Promise<void>
  hasProjectAccess: (projectId: string) => boolean
  isParent: () => boolean
  isLead: () => boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [projectAccess, setProjectAccess] = useState<ProjectAccess[]>([])
  const [loading, setLoading] = useState(true)

  // 重複実行防止用のRef
  const isFetchingAccessRef = React.useRef(false)
  // 同期的なアクセストークン参照用（レンダー遅延対策）
  const accessTokenRef = React.useRef<string | null>(null)

  const fetchUserProfile = async (userId: string): Promise<UserProfile | null> => {
    if (!supabase) return null
    try {
      const { data, error } = await supabase
        .from('user_profiles')         // profiles (view) ではなく user_profiles (table) を参照
        .select('*')
        .eq('user_id', userId)
        .maybeSingle()

      if (error) {
        console.warn('⚠️ fetchUserProfile failed:', error)
        return null
      }

      if (!data) return null

      const userProfile: UserProfile = {
        id: data.user_id,
        full_name: data.full_name ?? null,
        email: data.email || user?.email || '',
        role: (data.role as UserRole) || 'parent',
        company: data.company ?? null,
        daily_rate: data.daily_rate,
        is_active: data.is_active !== false,
        created_at: data.created_at || new Date().toISOString(),
        updated_at: data.updated_at || new Date().toISOString(),
      }
      return userProfile
    } catch (error) {
      console.warn('⚠️ Error in fetchUserProfile:', error)
      return null
    }
  }

  const ensureProfile = async (userId: string, email?: string) => {
    if (!supabase) return
    const { data } = await supabase
      .from('user_profiles')
      .select('user_id')
      .eq('user_id', userId)
      .maybeSingle()

    if (!data) {
      await supabase.from('user_profiles').insert({
        user_id: userId,
        display_name: (email || '').split('@')[0],
        role: 'worker'
      })
    }
  }

  // 内部取得処理（State更新なし、純粋なデータ取得のみ）
  const _fetchProjectAccessData = async (userId: string): Promise<ProjectAccess[]> => {
    if (!supabase) return []

    // 10秒タイムアウト設定
    const timeoutMs = 10000
    let timeoutId: any = null

    const fetchPromise = (async () => {
      try {
        console.log('🔍 Fetching project access data for:', userId)

        const { data, error } = await supabase
          .from('project_members')
          .select(`
            project_id,
            user_id,
            role,
            projects!inner(name, prefecture)
          `)
          .eq('user_id', userId)

        if (error) {
          console.warn('⚠️ _fetchProjectAccessData failed:', error)
          return []
        }

        const accessList: ProjectAccess[] = data?.map(access => {
          const projectData = Array.isArray(access.projects) ? access.projects[0] : access.projects
          return {
            project_id: access.project_id,
            project_name: (projectData as any)?.name || '不明な現場',
            role: access.role as 'parent' | 'lead',
            prefecture: (projectData as any)?.prefecture || '',
            started_at: new Date().toISOString(),
            ended_at: undefined
          }
        }) || []

        return accessList

      } catch (error) {
        console.warn('⚠️ Error in _fetchProjectAccessData:', error)
        return []
      }
    })()

    const timeoutPromise = new Promise<ProjectAccess[]>((resolve) => {
      timeoutId = setTimeout(() => {
        console.warn(`⚠️ _fetchProjectAccessData TIMEOUT after ${timeoutMs}ms`)
        resolve([])
      }, timeoutMs)
    })

    try {
      const result = await Promise.race([fetchPromise, timeoutPromise])
      if (timeoutId) clearTimeout(timeoutId)
      return result
    } catch (e) {
      if (timeoutId) clearTimeout(timeoutId)
      return []
    }
  }

  // 公開用：State更新を含むリフレッシュ処理（排他制御あり）
  const refreshProjectAccess = async () => {
    if (!user) return
    if (isFetchingAccessRef.current) {
      console.log('⏳ refreshProjectAccess skipped (already in flight)')
      return
    }

    try {
      isFetchingAccessRef.current = true
      console.log('🔄 refreshProjectAccess start...')
      const access = await _fetchProjectAccessData(user.id)

      setProjectAccess(prev => {
        console.log(`✅ Project access updated: ${prev.length} -> ${access.length} projects`)
        return access
      })
    } catch (e) {
      console.error('❌ refreshProjectAccess error:', e)
    } finally {
      isFetchingAccessRef.current = false
    }
  }

  // 旧メソッド互換性維持（ただし内部でリフレッシュを呼ぶ形にはしない、データだけ返す）
  // ※ setupSession等で使われているため残すが、基本は refreshProjectAccess 推奨
  const fetchProjectAccess = async (userId: string): Promise<ProjectAccess[]> => {
    return _fetchProjectAccessData(userId)
  }

  const refreshProfile = async () => {
    if (!user) return
    console.log('🔄 Refreshing profile...')
    const userProfile = await fetchUserProfile(user.id)
    setProfile(userProfile)
  }
  // refreshProjectAccess is now defined above with mutex

  const hasProjectAccess = (projectId: string): boolean => {
    if (!profile) return false

    // 親アカウントは自分が作成したプロジェクトにアクセス可能
    if (profile.role === 'parent') {
      return true // 親は基本的に全プロジェクトアクセス可能（RLSで制御）
    }

    // 職長は割り当てられたプロジェクトのみアクセス可能
    return projectAccess.some(access => access.project_id === projectId)
  }

  const isParent = (): boolean => {
    return profile?.role === 'parent'
  }

  const isLead = (): boolean => {
    return profile?.role === 'lead'
  }

  // Phase 1 Option C: token-store 同期ヘルパー
  // getSession() を呼んだ直後に必ず呼び出し、token-store を最新状態に保つ
  const syncSessionToTokenStore = (session: Session | null | undefined) => {
    const token = session?.access_token ?? null
    setStoredAccessToken(token)
    if (token) {
      accessTokenRef.current = token
      setAccessToken(token)
    }
  }

  useEffect(() => {
    loadDemoFlag()
      .then(async flag => {
        if (!flag || !supabase || !supabaseReady) return
        const { data } = await supabase.auth.getSession()
        // Phase 1 Option C: token-store 同期
        syncSessionToTokenStore(data?.session)
        if (!data?.session) {
          try {
            await supabase.auth.signInAnonymously()
          } catch (error: any) {
            const msg = (error?.message || String(error) || '').toString()
            const probe = await probeAuthSettingsOnce()

            const cause = msg.includes('Invalid API key')
              ? 'Invalid API key'
              : msg.includes('Network request failed')
                ? 'Network request failed'
                : (probe.status === 401 || probe.status === 403)
                  ? `key mismatch (probe status=${probe.status})`
                  : probe.err
                    ? `network unreachable (probe err=${probe.err})`
                    : `unknown (probe status=${probe.status})`

            console.warn('⚠️ Anonymous sign-in failed:', cause)
          }
        }
      })
      .catch(error => console.warn('⚠️ demo flag check failed', error))
  }, [])

  useEffect(() => {
    let mounted = true

    // Supabase未準備なら監視をスキップ
    if (!supabase || !supabaseReady) {
      setLoading(false)
      return () => { }
    }

    // セッション設定とデータ取得の共通処理
    const setupSession = async (currentSession: Session) => {
      setSession(currentSession)
      setAccessToken(currentSession.access_token)
      setStoredAccessToken(currentSession.access_token)
      accessTokenRef.current = currentSession.access_token
      setUser(currentSession.user)

      try {
        await ensureProfile(currentSession.user.id, currentSession.user.email)

        // プロフィール取得
        const userProfile = await fetchUserProfile(currentSession.user.id)
        if (mounted) setProfile(userProfile)

        // プロジェクト権限取得（refreshProjectAccessのロジックを再利用したいが、
        // user stateがまだ更新反映されていない可能性があるため、直接内部関数を呼んでセットする）
        if (!isFetchingAccessRef.current) {
          isFetchingAccessRef.current = true
          const access = await _fetchProjectAccessData(currentSession.user.id)
          if (mounted) {
            setProjectAccess(access)
            console.log('✅ Initial project access set:', access.length)
          }
          isFetchingAccessRef.current = false
        }

      } catch (e) {
        console.warn('⚠️ Error setting up session data:', e)
        isFetchingAccessRef.current = false
      }
    }

    // 認証状態の変更を監視
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        console.log('🔐 Auth state changed:', event)

        if (!mounted) return

        // セッションが提供されるイベントはすべてハンドリングする
        if (currentSession && (
          event === 'SIGNED_IN' ||
          event === 'TOKEN_REFRESHED' ||
          event === 'USER_UPDATED' ||
          event === 'INITIAL_SESSION'
        )) {
          await setupSession(currentSession)
        } else if (event === 'SIGNED_OUT') {
          setSession(null)
          setAccessToken(null)
          setStoredAccessToken(null)
          accessTokenRef.current = null
          setUser(null)
          setProfile(null)
          setProjectAccess([])
        }

        if (mounted) {
          setLoading(false)
        }
      }
    )

    // 初期セッション確認
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase!.auth.getSession()

        // Phase 1 Option C: token-store 同期
        syncSessionToTokenStore(session)

        if (error) {
          console.warn('⚠️ Error getting session:', error)
          if (mounted) setLoading(false)
          return
        }

        if (session && mounted) {
          console.log('🔐 Initial session found:', session.user.id)
          await setupSession(session)
        } else {
          console.log('🔐 No initial session found, attempting anonymous sign-in...')
          try {
            const { data: anonData, error: anonError } = await supabase!.auth.signInAnonymously()
            if (anonError) {
              const msg = (anonError as any)?.message?.toString?.() || String(anonError || '')
              const probe = await probeAuthSettingsOnce()
              const cause = msg.includes('Invalid API key')
                ? 'Invalid API key'
                : msg.includes('Network request failed')
                  ? 'Network request failed'
                  : (probe.status === 401 || probe.status === 403)
                    ? `key mismatch (probe status=${probe.status})`
                    : probe.err
                      ? `network unreachable (probe err=${probe.err})`
                      : `unknown (probe status=${probe.status})`

              console.error('⚠️ Anonymous sign-in failed:', cause)
            } else if (anonData.session && mounted) {
              console.log('✅ Anonymous sign-in successful:', anonData.session.user.id)
              // onAuthStateChange(SIGNED_IN) が発火するはずだが、念のためここでもセットアップ
              await setupSession(anonData.session)
            }
          } catch (e: any) {
            const msg = (e?.message || String(e) || '').toString()
            const probe = await probeAuthSettingsOnce()
            const cause = msg.includes('Invalid API key')
              ? 'Invalid API key'
              : msg.includes('Network request failed')
                ? 'Network request failed'
                : probe.err
                  ? `network unreachable (probe err=${probe.err})`
                  : `probe status=${probe.status}`

            console.error('⚠️ Anonymous sign-in exception:', cause)
          }
        }

        if (mounted) {
          setLoading(false)
        }
      } catch (error) {
        console.warn('⚠️ Error in getInitialSession:', error)
        if (mounted) setLoading(false)
      }
    }

    getInitialSession()

    return () => {
      mounted = false
      subscription?.unsubscribe()
    }
  }, [])

  const signOut = async () => {
    try {
      console.log('🔐 Signing out...')
      setLoading(true)

      if (!supabase) {
        console.warn('⚠️ Supabase not initialized')
        return
      }

      const { error } = await supabase.auth.signOut()
      if (error) {
        console.warn('⚠️ Error signing out:', error)
        throw error
      }

      // 状態をクリア
      setUser(null)
      setSession(null)
      setAccessToken(null)
      setStoredAccessToken(null)
      accessTokenRef.current = null
      setProfile(null)
      setProjectAccess([])

      console.log('✅ Successfully signed out')
    } catch (error) {
      console.warn('⚠️ Error during sign out:', error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  const value: AuthContextType = {
    user,
    session,
    accessToken,
    accessTokenRef,
    profile,
    projectAccess,
    loading,
    signOut,
    refreshProfile,
    refreshProjectAccess,
    hasProjectAccess,
    isParent,
    isLead,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    // Provider外で呼ばれた場合でも赤帯を出さない安全ガード
    return {
      user: null,
      session: null,
      accessToken: null,
      accessTokenRef: { current: null } as React.MutableRefObject<string | null>,
      profile: null,
      projectAccess: [],
      loading: true,
      signOut: async () => { },
      refreshProfile: async () => { },
      refreshProjectAccess: async () => { },
      hasProjectAccess: () => false,
      isParent: () => false,
      isLead: () => false,
    }
  }
  return context
}

// 権限チェック用のカスタムフック
export function useRole() {
  const { profile } = useAuth()
  return profile?.role || null
}

export function useIsParent() {
  const { isParent } = useAuth()
  return isParent()
}

export function useIsLead() {
  const { isLead } = useAuth()
  return isLead()
}

export function useProjectAccess() {
  const { projectAccess, hasProjectAccess } = useAuth()
  return { projectAccess, hasProjectAccess }
}
