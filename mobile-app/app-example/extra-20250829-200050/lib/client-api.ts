import { supabase } from './supabase'
import {
  Client,
  CreateClientData,
  UpdateClientData,
  ClientListResponse,
  ClientResponse,
  ApiResponse,
} from '../types/client'

/**
 * 元請け管理API関数群
 */

/**
 * 元請け一覧の取得（代表のみアクセス可能）
 */
export const getClients = async (): Promise<ClientListResponse> => {
  try {
    console.log('🏢 Fetching clients list')
    
    // 現在のユーザーが代表かチェック
    const { data: user } = await supabase.auth.getUser()
    if (!user.user) {
      return { data: [], count: 0, error: '認証が必要です' }
    }

    const { data: userProfile } = await supabase
      .from('users')
      .select('role, company_id')
      .eq('id', user.user.id)
      .single()

    if (!userProfile || userProfile.role !== 'admin') {
      return { data: [], count: 0, error: '代表のみアクセス可能です' }
    }

    const { data, error, count } = await supabase
      .from('clients')
      .select(`
        *,
        creator:users!created_by(id, full_name)
      `, { count: 'exact' })
      .eq('company_id', userProfile.company_id)
      .order('name', { ascending: true })

    if (error) {
      console.error('❌ Error fetching clients:', error)
      return { data: [], count: 0, error: error.message }
    }

    console.log(`✅ Fetched ${data?.length || 0} clients`)
    return { data: data || [], count: count || 0 }
  } catch (error) {
    console.error('❌ Unexpected error fetching clients:', error)
    return { data: [], count: 0, error: 'クライアントの取得に失敗しました' }
  }
}

/**
 * 個別元請けの取得
 */
export const getClient = async (id: string): Promise<ClientResponse> => {
  try {
    console.log('🎯 Fetching client:', id)
    
    const { data: user } = await supabase.auth.getUser()
    if (!user.user) {
      return { data: null, error: '認証が必要です' }
    }

    const { data: userProfile } = await supabase
      .from('users')
      .select('role, company_id')
      .eq('id', user.user.id)
      .single()

    if (!userProfile || userProfile.role !== 'admin') {
      return { data: null, error: '代表のみアクセス可能です' }
    }

    const { data, error } = await supabase
      .from('clients')
      .select(`
        *,
        creator:users!created_by(id, full_name)
      `)
      .eq('id', id)
      .eq('company_id', userProfile.company_id)
      .single()

    if (error) {
      console.error('❌ Error fetching client:', error)
      return { data: null, error: error.message }
    }

    console.log('✅ Client fetched successfully')
    return { data }
  } catch (error) {
    console.error('❌ Unexpected error fetching client:', error)
    return { data: null, error: 'クライアントの取得に失敗しました' }
  }
}

/**
 * 元請けの作成
 */
export const createClient = async (clientData: CreateClientData): Promise<ClientResponse> => {
  try {
    console.log('➕ Creating new client')
    
    const { data: user } = await supabase.auth.getUser()
    if (!user.user) {
      return { data: null, error: '認証が必要です' }
    }

    const { data: userProfile } = await supabase
      .from('users')
      .select('role, company_id')
      .eq('id', user.user.id)
      .single()

    if (!userProfile || userProfile.role !== 'admin') {
      return { data: null, error: '代表のみクライアントを作成できます' }
    }

    // バリデーション
    const validation = validateClientData(clientData)
    if (!validation.isValid) {
      return { data: null, error: validation.errors.join(', ') }
    }

    const newClient = {
      ...clientData,
      company_id: userProfile.company_id,
      created_by: user.user.id,
      is_active: true,
    }

    const { data, error } = await supabase
      .from('clients')
      .insert(newClient)
      .select(`
        *,
        creator:users!created_by(id, full_name)
      `)
      .single()

    if (error) {
      console.error('❌ Error creating client:', error)
      return { data: null, error: error.message }
    }

    // 監査ログの記録
    try {
      await supabase.rpc('record_audit_log', {
        p_entity_type: 'clients',
        p_entity_id: data.id,
        p_action: 'create',
        p_before_data: null,
        p_after_data: data,
        p_description: `新規クライアント「${data.name}」を作成しました`
      })
    } catch (auditError) {
      console.warn('⚠️ Failed to record audit log:', auditError)
    }

    console.log('✅ Client created successfully')
    return { data }
  } catch (error) {
    console.error('❌ Unexpected error creating client:', error)
    return { data: null, error: 'クライアントの作成に失敗しました' }
  }
}

/**
 * 元請けの更新
 */
export const updateClient = async (id: string, updateData: UpdateClientData): Promise<ClientResponse> => {
  try {
    console.log('📝 Updating client:', id)
    
    const { data: user } = await supabase.auth.getUser()
    if (!user.user) {
      return { data: null, error: '認証が必要です' }
    }

    const { data: userProfile } = await supabase
      .from('users')
      .select('role, company_id')
      .eq('id', user.user.id)
      .single()

    if (!userProfile || userProfile.role !== 'admin') {
      return { data: null, error: '代表のみクライアントを更新できます' }
    }

    // 更新前のデータを取得（監査ログ用）
    const { data: beforeData } = await supabase
      .from('clients')
      .select('*')
      .eq('id', id)
      .eq('company_id', userProfile.company_id)
      .single()

    if (!beforeData) {
      return { data: null, error: 'クライアントが見つかりません' }
    }

    // バリデーション（必要な場合）
    if (updateData.name !== undefined || updateData.email !== undefined) {
      const validation = validateClientData(updateData as CreateClientData)
      if (!validation.isValid) {
        return { data: null, error: validation.errors.join(', ') }
      }
    }

    const { data, error } = await supabase
      .from('clients')
      .update(updateData)
      .eq('id', id)
      .eq('company_id', userProfile.company_id)
      .select(`
        *,
        creator:users!created_by(id, full_name)
      `)
      .single()

    if (error) {
      console.error('❌ Error updating client:', error)
      return { data: null, error: error.message }
    }

    // 監査ログの記録
    try {
      await supabase.rpc('record_audit_log', {
        p_entity_type: 'clients',
        p_entity_id: id,
        p_action: 'update',
        p_before_data: beforeData,
        p_after_data: data,
        p_description: `クライアント「${data.name}」を更新しました`
      })
    } catch (auditError) {
      console.warn('⚠️ Failed to record audit log:', auditError)
    }

    console.log('✅ Client updated successfully')
    return { data }
  } catch (error) {
    console.error('❌ Unexpected error updating client:', error)
    return { data: null, error: 'クライアントの更新に失敗しました' }
  }
}

/**
 * 元請けの削除（ソフト削除）
 */
export const deleteClient = async (id: string): Promise<ApiResponse<boolean>> => {
  try {
    console.log('🗑️ Deleting client:', id)
    
    const { data: user } = await supabase.auth.getUser()
    if (!user.user) {
      return { error: { message: '認証が必要です' } }
    }

    const { data: userProfile } = await supabase
      .from('users')
      .select('role, company_id')
      .eq('id', user.user.id)
      .single()

    if (!userProfile || userProfile.role !== 'admin') {
      return { error: { message: '代表のみクライアントを削除できます' } }
    }

    // 削除前のデータを取得（監査ログ用）
    const { data: beforeData } = await supabase
      .from('clients')
      .select('*')
      .eq('id', id)
      .eq('company_id', userProfile.company_id)
      .single()

    if (!beforeData) {
      return { error: { message: 'クライアントが見つかりません' } }
    }

    // 関連する見積があるかチェック
    const { data: relatedEstimates } = await supabase
      .from('estimates')
      .select('id')
      .eq('client_id', id)
      .limit(1)

    if (relatedEstimates && relatedEstimates.length > 0) {
      // ソフト削除（is_activeをfalseに設定）
      const { error } = await supabase
        .from('clients')
        .update({ is_active: false })
        .eq('id', id)
        .eq('company_id', userProfile.company_id)

      if (error) {
        console.error('❌ Error deactivating client:', error)
        return { error: { message: error.message } }
      }

      // 監査ログの記録
      try {
        await supabase.rpc('record_audit_log', {
          p_entity_type: 'clients',
          p_entity_id: id,
          p_action: 'deactivate',
          p_before_data: beforeData,
          p_after_data: { ...beforeData, is_active: false },
          p_description: `関連見積があるため、クライアント「${beforeData.name}」を無効化しました`
        })
      } catch (auditError) {
        console.warn('⚠️ Failed to record audit log:', auditError)
      }

      console.log('✅ Client deactivated successfully')
      return { data: true }
    } else {
      // 物理削除
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', id)
        .eq('company_id', userProfile.company_id)

      if (error) {
        console.error('❌ Error deleting client:', error)
        return { error: { message: error.message } }
      }

      // 監査ログの記録
      try {
        await supabase.rpc('record_audit_log', {
          p_entity_type: 'clients',
          p_entity_id: id,
          p_action: 'delete',
          p_before_data: beforeData,
          p_after_data: null,
          p_description: `クライアント「${beforeData.name}」を削除しました`
        })
      } catch (auditError) {
        console.warn('⚠️ Failed to record audit log:', auditError)
      }

      console.log('✅ Client deleted successfully')
      return { data: true }
    }
  } catch (error) {
    console.error('❌ Unexpected error deleting client:', error)
    return { error: { message: 'クライアントの削除に失敗しました' } }
  }
}

/**
 * クライアントデータのバリデーション
 */
const validateClientData = (data: CreateClientData): { isValid: boolean; errors: string[] } => {
  const errors: string[] = []

  if (!data.name || data.name.trim().length === 0) {
    errors.push('会社名は必須です')
  }

  if (data.name && data.name.length > 100) {
    errors.push('会社名は100文字以内で入力してください')
  }

  if (data.email && !isValidEmail(data.email)) {
    errors.push('有効なメールアドレスを入力してください')
  }

  if (data.phone && !isValidPhone(data.phone)) {
    errors.push('有効な電話番号を入力してください')
  }

  if (data.postal_code && !isValidPostalCode(data.postal_code)) {
    errors.push('有効な郵便番号を入力してください（例：123-4567）')
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * メールアドレスの簡単なバリデーション
 */
const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * 電話番号の簡単なバリデーション
 */
const isValidPhone = (phone: string): boolean => {
  const phoneRegex = /^[\d\-\(\)\+\s]+$/
  return phoneRegex.test(phone) && phone.replace(/[\D]/g, '').length >= 10
}

/**
 * 郵便番号のバリデーション
 */
const isValidPostalCode = (postalCode: string): boolean => {
  const postalCodeRegex = /^\d{3}-\d{4}$/
  return postalCodeRegex.test(postalCode)
}

/**
 * 権限チェック用のヘルパー関数
 */
export const checkClientPermissions = async (): Promise<{
  canViewClients: boolean
  canManageClients: boolean
}> => {
  try {
    const { data: user } = await supabase.auth.getUser()
    if (!user.user) {
      return { canViewClients: false, canManageClients: false }
    }

    const { data: userProfile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.user.id)
      .single()

    const isAdmin = userProfile?.role === 'admin'

    return {
      canViewClients: isAdmin,
      canManageClients: isAdmin,
    }
  } catch (error) {
    console.error('❌ Error checking client permissions:', error)
    return { canViewClients: false, canManageClients: false }
  }
}