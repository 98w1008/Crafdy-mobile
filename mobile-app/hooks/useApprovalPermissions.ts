/**
 * 承認権限管理フック
 * ユーザーの承認権限を管理するカスタムフック
 */

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'

// =============================================================================
// TYPES
// =============================================================================

export interface ApprovalPermissions {
  canApprove: boolean
  canViewAllReports: boolean
  canManageWorkSites: boolean
  canDeleteReports: boolean
  isLoading: boolean
  error: string | null
}

export type UserRole = 'admin' | 'manager' | 'worker'

// =============================================================================
// HOOK
// =============================================================================

export const useApprovalPermissions = (): ApprovalPermissions => {
  const { user } = useAuth()
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 権限の計算
  const calculatePermissions = useCallback((): Omit<ApprovalPermissions, 'isLoading' | 'error'> => {
    if (!user) {
      return {
        canApprove: false,
        canViewAllReports: false,
        canManageWorkSites: false,
        canDeleteReports: false
      }
    }

    const role = user.role as UserRole
    
    switch (role) {
      case 'admin':
        return {
          canApprove: true,
          canViewAllReports: true,
          canManageWorkSites: true,
          canDeleteReports: true
        }
      
      case 'manager':
        return {
          canApprove: true,
          canViewAllReports: true,
          canManageWorkSites: true,
          canDeleteReports: false
        }
      
      case 'worker':
      default:
        return {
          canApprove: false,
          canViewAllReports: false,
          canManageWorkSites: false,
          canDeleteReports: false
        }
    }
  }, [user])

  // 権限の初期化
  useEffect(() => {
    try {
      setIsLoading(false)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : '権限の取得に失敗しました')
      setIsLoading(false)
    }
  }, [user])

  const permissions = calculatePermissions()

  return {
    ...permissions,
    isLoading,
    error
  }
}

// =============================================================================
// 権限チェック関数
// =============================================================================

/**
 * 特定のアクションに対する権限をチェック
 */
export const checkPermission = (
  userRole: UserRole | undefined,
  action: keyof Omit<ApprovalPermissions, 'isLoading' | 'error'>
): boolean => {
  if (!userRole) return false
  
  switch (action) {
    case 'canApprove':
      return userRole === 'admin' || userRole === 'manager'
    
    case 'canViewAllReports':
      return userRole === 'admin' || userRole === 'manager'
    
    case 'canManageWorkSites':
      return userRole === 'admin' || userRole === 'manager'
    
    case 'canDeleteReports':
      return userRole === 'admin'
    
    default:
      return false
  }
}

/**
 * 日報の編集権限をチェック
 */
export const canEditReport = (
  currentUserId: string,
  reportUserId: string,
  reportStatus: string
): boolean => {
  // 自分の日報で、下書きまたは差戻し状態の場合のみ編集可能
  return currentUserId === reportUserId && 
         (reportStatus === 'draft' || reportStatus === 'rejected')
}

/**
 * 日報の取り下げ権限をチェック
 */
export const canWithdrawReport = (
  currentUserId: string,
  reportUserId: string,
  reportStatus: string
): boolean => {
  // 自分の日報で、提出済み状態の場合のみ取り下げ可能
  return currentUserId === reportUserId && reportStatus === 'submitted'
}

/**
 * 承認アクション権限をチェック
 */
export const canPerformApprovalAction = (
  userRole: UserRole | undefined,
  reportStatus: string
): boolean => {
  // 管理者で、提出済み状態の日報のみ承認・差戻し可能
  return (userRole === 'admin' || userRole === 'manager') && 
         reportStatus === 'submitted'
}

// =============================================================================
// 権限管理のヘルパー関数
// =============================================================================

/**
 * 権限エラーメッセージを取得
 */
export const getPermissionErrorMessage = (action: string): string => {
  const messages: Record<string, string> = {
    approve: 'この操作を実行する権限がありません。管理者にお問い合わせください。',
    view_all_reports: 'すべての日報を閲覧する権限がありません。',
    manage_work_sites: '現場を管理する権限がありません。',
    delete_reports: '日報を削除する権限がありません。',
    edit_report: 'この日報を編集する権限がありません。',
    withdraw_report: 'この日報を取り下げることができません。'
  }
  
  return messages[action] || '操作を実行する権限がありません。'
}

/**
 * ロール表示名を取得
 */
export const getRoleDisplayName = (role: UserRole): string => {
  const roleNames: Record<UserRole, string> = {
    admin: '管理者',
    manager: 'マネージャー',
    worker: '作業者'
  }
  
  return roleNames[role] || '不明'
}

export default useApprovalPermissions