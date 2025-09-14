import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

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
  started_at?: string
  ended_at?: string
}

interface AuthContextType {
  user: User | null
  session: Session | null
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
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [projectAccess, setProjectAccess] = useState<ProjectAccess[]>([])
  const [loading, setLoading] = useState(true)

  const fetchUserProfile = async (userId: string): Promise<UserProfile | null> => {
    try {
      console.log('🔍 Fetching user profile for:', userId)
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) {
        console.error('❌ Error fetching profile:', error)
        return null
      }

      if (!data) {
        console.log('⚠️ No profile found, creating basic profile')
        return {
          id: userId,
          full_name: null,
          email: user?.email || '',
          role: 'parent' as UserRole,
          company: null,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      }

      const userProfile: UserProfile = {
        id: data.id,
        full_name: data.full_name,
        email: data.email || user?.email || '',
        role: data.role || 'parent',
        company: data.company,
        daily_rate: data.daily_rate,
        is_active: data.is_active !== false,
        created_at: data.created_at,
        updated_at: data.updated_at
      }
      
      console.log('✅ Profile fetched successfully:', userProfile.role)
      return userProfile
      
    } catch (error) {
      console.error('❌ Error in fetchUserProfile:', error)
      return null
    }
  }

  const fetchProjectAccess = async (userId: string): Promise<ProjectAccess[]> => {
    try {
      console.log('🔍 Fetching project access for:', userId)
      
      const { data, error } = await supabase
        .from('project_members')
        .select(`
          project_id,
          user_id,
          role,
          projects!inner(name)
        `)
        .eq('user_id', userId)

      if (error) {
        console.error('❌ Error fetching project access:', error)
        return []
      }

      const accessList: ProjectAccess[] = data?.map(access => ({
        project_id: access.project_id,
        project_name: access.projects.name,
        role: access.role as 'parent' | 'lead',
        started_at: new Date().toISOString(), // デフォルト値
        ended_at: undefined
      })) || []
      
      console.log('✅ Project access fetched:', accessList.length, 'projects')
      return accessList
      
    } catch (error) {
      console.error('❌ Error in fetchProjectAccess:', error)
      return []
    }
  }

  const refreshProfile = async () => {
    if (!user) return
    
    console.log('🔄 Refreshing profile...')
    const userProfile = await fetchUserProfile(user.id)
    setProfile(userProfile)
  }

  const refreshProjectAccess = async () => {
    if (!user) return
    
    console.log('🔄 Refreshing project access...')
    const access = await fetchProjectAccess(user.id)
    setProjectAccess(access)
  }

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

  useEffect(() => {
    let mounted = true

    // 認証状態の変更を監視
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        console.log('🔐 Auth state changed:', event)
        
        if (!mounted) return

        if (event === 'SIGNED_IN' && currentSession) {
          setSession(currentSession)
          setUser(currentSession.user)
          
          // プロファイルとプロジェクトアクセスを取得
          const [userProfile, access] = await Promise.all([
            fetchUserProfile(currentSession.user.id),
            fetchProjectAccess(currentSession.user.id)
          ])
          
          if (mounted) {
            setProfile(userProfile)
            setProjectAccess(access)
          }
        } else if (event === 'SIGNED_OUT') {
          setSession(null)
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
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('❌ Error getting session:', error)
          if (mounted) setLoading(false)
          return
        }

        if (session && mounted) {
          console.log('🔐 Initial session found')
          setSession(session)
          setUser(session.user)
          
          // プロファイルとプロジェクトアクセスを取得
          const [userProfile, access] = await Promise.all([
            fetchUserProfile(session.user.id),
            fetchProjectAccess(session.user.id)
          ])
          
          if (mounted) {
            setProfile(userProfile)
            setProjectAccess(access)
          }
        }
        
        if (mounted) {
          setLoading(false)
        }
      } catch (error) {
        console.error('❌ Error in getInitialSession:', error)
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
      
      const { error } = await supabase.auth.signOut()
      if (error) {
        console.error('❌ Error signing out:', error)
        throw error
      }
      
      // 状態をクリア
      setUser(null)
      setSession(null)
      setProfile(null)
      setProjectAccess([])
      
      console.log('✅ Successfully signed out')
    } catch (error) {
      console.error('❌ Error during sign out:', error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  const value: AuthContextType = {
    user,
    session,
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
    throw new Error('useAuth must be used within an AuthProvider')
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