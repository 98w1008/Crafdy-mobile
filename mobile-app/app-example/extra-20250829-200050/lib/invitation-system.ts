import { supabase } from './supabase'
import * as Crypto from 'expo-crypto'

export interface InvitationCode {
  id: string
  code: string
  project_id: string
  role: 'lead'
  created_by: string
  created_at: string
  expires_at: string
  used_at?: string
  used_by?: string
  is_active: boolean
}

export interface InvitationData {
  projectId: string
  projectName: string
  role: 'lead'
  companyName: string
  createdBy: string
}

/**
 * 招待コード生成（8桁英数字）
 * フォーマット: ABCD1234 (アルファベット4文字 + 数字4桁)
 * 暗号学的に安全な乱数を使用
 */
export const generateInvitationCode = async (): Promise<string> => {
  try {
    // 暗号学的に安全な8バイトの乱数を生成
    const randomBytes = await Crypto.getRandomBytesAsync(8)
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    
    let code = ''
    
    // アルファベット4文字（最初の4バイト）
    for (let i = 0; i < 4; i++) {
      const alphabetIndex = randomBytes[i] % 26
      code += charset[alphabetIndex] // A-Z
    }
    
    // 数字4桁（後の4バイト）
    for (let i = 4; i < 8; i++) {
      const numberIndex = 26 + (randomBytes[i] % 10)
      code += charset[numberIndex] // 0-9
    }
    
    return code
  } catch (error) {
    console.error('招待コード生成エラー:', error)
    // フォールバック: タイムスタンプベース（開発用）
    const timestamp = Date.now().toString(36).toUpperCase()
    return timestamp.slice(-8).padStart(8, 'A')
  }
}

/**
 * 招待コードをデータベースに保存
 */
export const createInvitationCode = async (
  projectId: string,
  createdBy: string
): Promise<{ code: string; error?: string }> => {
  try {
    // 既存の未使用コードを無効化
    await supabase
      .from('invitation_codes')
      .update({ is_active: false })
      .eq('project_id', projectId)
      .eq('is_active', true)

    const code = await generateInvitationCode()
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + 72) // 72時間後

    const { data, error } = await supabase
      .from('invitation_codes')
      .insert({
        code,
        project_id: projectId,
        role: 'lead',
        created_by: createdBy,
        expires_at: expiresAt.toISOString(),
        is_active: true
      })
      .select()
      .single()

    if (error) {
      console.error('招待コード作成エラー:', error)
      return { code: '', error: 'コード生成に失敗しました' }
    }

    return { code }
  } catch (error) {
    console.error('招待コード作成エラー:', error)
    return { code: '', error: 'コード生成に失敗しました' }
  }
}

/**
 * 招待コードの検証
 */
export const validateInvitationCode = async (
  code: string
): Promise<{ valid: boolean; data?: InvitationData; error?: string }> => {
  try {
    const { data: invitation, error } = await supabase
      .from('invitation_codes')
      .select(`
        *,
        projects!inner(id, name),
        profiles!created_by(company)
      `)
      .eq('code', code.toUpperCase())
      .eq('is_active', true)
      .single()

    if (error || !invitation) {
      return { valid: false, error: '無効な招待コードです' }
    }

    // 有効期限チェック
    const now = new Date()
    const expiresAt = new Date(invitation.expires_at)
    
    if (now > expiresAt) {
      return { valid: false, error: '招待コードの有効期限が切れています' }
    }

    // 使用済みチェック
    if (invitation.used_at) {
      return { valid: false, error: 'この招待コードは既に使用されています' }
    }

    const invitationData: InvitationData = {
      projectId: invitation.project_id,
      projectName: invitation.projects.name,
      role: invitation.role,
      companyName: invitation.profiles.company,
      createdBy: invitation.created_by
    }

    return { valid: true, data: invitationData }
  } catch (error) {
    console.error('招待コード検証エラー:', error)
    return { valid: false, error: 'コード検証中にエラーが発生しました' }
  }
}

/**
 * 招待コードを使用済みにマーク
 */
export const markInvitationAsUsed = async (
  code: string,
  userId: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase
      .from('invitation_codes')
      .update({
        used_at: new Date().toISOString(),
        used_by: userId,
        is_active: false
      })
      .eq('code', code.toUpperCase())

    if (error) {
      console.error('招待コード使用マークエラー:', error)
      return { success: false, error: 'コード使用の記録に失敗しました' }
    }

    return { success: true }
  } catch (error) {
    console.error('招待コード使用マークエラー:', error)
    return { success: false, error: 'コード使用の記録に失敗しました' }
  }
}

/**
 * プロジェクトメンバーとして追加（重複を安全に処理）
 */
export const addProjectMember = async (
  projectId: string,
  userId: string,
  role: 'lead' = 'lead'
): Promise<{ success: boolean; error?: string }> => {
  try {
    // トランザクション的処理: 既存のアクティブメンバーシップを終了してから新規追加
    const { error: updateError } = await supabase
      .from('project_members')
      .update({ ended_at: new Date().toISOString() })
      .eq('project_id', projectId)
      .eq('user_id', userId)
      .is('ended_at', null)

    // エラーが発生してもメンバーが存在しない場合は正常なので続行
    if (updateError && !updateError.message.includes('No rows found')) {
      console.error('既存メンバーシップ終了エラー:', updateError)
      return { success: false, error: '既存メンバーシップの処理に失敗しました' }
    }

    // 新しいメンバーシップを作成
    const { error: insertError } = await supabase
      .from('project_members')
      .insert({
        project_id: projectId,
        user_id: userId,
        role,
        started_at: new Date().toISOString()
      })

    if (insertError) {
      console.error('プロジェクトメンバー追加エラー:', insertError)
      // 制約違反の場合は既にメンバーとして扱う
      if (insertError.code === '23505') { // 一意制約違反
        return { success: true }
      }
      return { success: false, error: 'メンバー追加に失敗しました' }
    }

    return { success: true }
  } catch (error) {
    console.error('プロジェクトメンバー追加エラー:', error)
    return { success: false, error: 'メンバー追加に失敗しました' }
  }
}

/**
 * 招待コード一覧取得（親アカウント用）
 */
export const getInvitationCodes = async (
  createdBy: string
): Promise<{ codes: InvitationCode[]; error?: string }> => {
  try {
    const { data, error } = await supabase
      .from('invitation_codes')
      .select(`
        *,
        projects(name)
      `)
      .eq('created_by', createdBy)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('招待コード取得エラー:', error)
      return { codes: [], error: 'コード取得に失敗しました' }
    }

    return { codes: data || [] }
  } catch (error) {
    console.error('招待コード取得エラー:', error)
    return { codes: [], error: 'コード取得に失敗しました' }
  }
}