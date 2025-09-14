import { supabase } from './supabase';

export type SubmissionStatus = 'draft' | 'submitted' | 'approved' | 'rejected';
export type UserRole = 'manager' | 'admin' | 'craftsman';

export interface SubmissionItem {
  id: string;
  content: string;
  status: SubmissionStatus;
  type: 'report' | 'receipt' | 'message';
  project_id: string;
  created_by: string;
  created_at: string;
  approved_at?: string;
  approved_by?: string;
}

export interface ApprovalPermissions {
  canEdit: boolean;
  canApprove: boolean;
  canReject: boolean;
  showEditButton: boolean;
}

export interface AuditLog {
  id: string;
  submission_id: string;
  user_id: string;
  action: 'create' | 'edit' | 'approve' | 'reject' | 'cancel_approval';
  previous_status?: SubmissionStatus;
  new_status: SubmissionStatus;
  created_at: string;
  metadata?: Record<string, any>;
  user_name?: string;
  users?: {
    full_name?: string;
    email?: string;
  };
}

/**
 * 権限チェック関数 - Supabaseのcan_edit_submission関数を活用
 */
export async function checkSubmissionPermissions(
  submissionId: string,
  userId: string
): Promise<ApprovalPermissions> {
  try {
    // Supabaseのcan_edit_submission関数を呼び出し
    const { data: canEditResult, error: editError } = await supabase
      .rpc('can_edit_submission', {
        submission_id: submissionId,
        user_id: userId
      });

    if (editError) {
      console.error('Edit permission check error:', editError);
      return {
        canEdit: false,
        canApprove: false,
        canReject: false,
        showEditButton: false
      };
    }

    // 提出物の詳細とユーザー情報を取得
    const [submissionResult, userResult] = await Promise.all([
      supabase
        .from('submissions')
        .select('status, created_by')
        .eq('id', submissionId)
        .single(),
      supabase
        .from('project_members')
        .select('role')
        .eq('user_id', userId)
        .single()
    ]);

    if (submissionResult.error || userResult.error) {
      console.error('Data fetch error:', { 
        submission: submissionResult.error, 
        user: userResult.error 
      });
      return {
        canEdit: false,
        canApprove: false,
        canReject: false,
        showEditButton: false
      };
    }

    const submission = submissionResult.data;
    const userRole = userResult.data.role as UserRole;
    const isCreator = submission.created_by === userId;
    const isApproved = submission.status === 'approved';

    // 権限ルールに基づく計算
    const canEdit = canEditResult && (
      // 代表は常に編集可能
      userRole === 'admin' ||
      // 職長は承認前のみ編集可能
      (userRole === 'manager' && isCreator && !isApproved) ||
      // 職人は承認前のみ編集可能  
      (userRole === 'craftsman' && isCreator && !isApproved)
    );

    // 編集ボタンの表示制御（要件：承認前は表示、承認後は非表示、代表は常に表示）
    const showEditButton = (
      // 代表は常に表示
      userRole === 'admin' ||
      // その他のユーザーは承認前のみ表示
      (!isApproved && isCreator)
    );

    const canApprove = userRole === 'admin' && !isCreator && submission.status === 'submitted';
    const canReject = userRole === 'admin' && !isCreator && submission.status !== 'draft';

    return {
      canEdit,
      canApprove,
      canReject,
      showEditButton
    };

  } catch (error) {
    console.error('Permission check error:', error);
    return {
      canEdit: false,
      canApprove: false,
      canReject: false,
      showEditButton: false
    };
  }
}

/**
 * 監査ログを取得
 */
export async function getAuditLogs(submissionId: string): Promise<{
  data?: AuditLog[];
  error?: string;
}> {
  try {
    const { data, error } = await supabase
      .from('audit_logs')
      .select(`
        id,
        submission_id,
        user_id,
        action,
        previous_status,
        new_status,
        created_at,
        metadata,
        users!user_id (
          full_name,
          email
        )
      `)
      .eq('submission_id', submissionId)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    // ユーザー情報を含むログデータに変換
    const enrichedLogs: AuditLog[] = (data || []).map(log => ({
      ...log,
      user_name: log.users?.full_name || log.users?.email?.split('@')[0] || '不明なユーザー'
    }));

    return { data: enrichedLogs };
  } catch (error) {
    console.error('Get audit logs error:', error);
    return { error: '監査ログの取得に失敗しました' };
  }
}

/**
 * 提出物のステータスを更新
 */
export async function updateSubmissionStatus(
  submissionId: string,
  newStatus: SubmissionStatus,
  userId: string,
  metadata?: Record<string, any>
): Promise<{ success: boolean; error?: string }> {
  try {
    // 現在の提出物データを取得
    const { data: currentSubmission, error: fetchError } = await supabase
      .from('submissions')
      .select('status, created_by')
      .eq('id', submissionId)
      .single();

    if (fetchError) {
      return { success: false, error: 'Failed to fetch current submission' };
    }

    // 権限チェック
    const permissions = await checkSubmissionPermissions(submissionId, userId);
    
    if (newStatus === 'approved' && !permissions.canApprove) {
      return { success: false, error: 'No permission to approve' };
    }
    
    if (newStatus === 'rejected' && !permissions.canReject) {
      return { success: false, error: 'No permission to reject' };
    }

    // ステータス更新
    const updateData: Record<string, any> = { status: newStatus };
    
    if (newStatus === 'approved') {
      updateData.approved_at = new Date().toISOString();
      updateData.approved_by = userId;
    } else if (currentSubmission.status === 'approved' && newStatus !== 'approved') {
      // 承認取消の場合
      updateData.approved_at = null;
      updateData.approved_by = null;
    }

    const { error: updateError } = await supabase
      .from('submissions')
      .update(updateData)
      .eq('id', submissionId);

    if (updateError) {
      return { success: false, error: 'Failed to update submission status' };
    }

    // 監査ログ記録
    await createAuditLog(
      submissionId,
      userId,
      getActionFromStatus(currentSubmission.status, newStatus),
      currentSubmission.status,
      newStatus,
      metadata
    );

    return { success: true };

  } catch (error) {
    console.error('Update submission status error:', error);
    return { success: false, error: 'Unexpected error occurred' };
  }
}

/**
 * 提出物を編集
 */
export async function editSubmission(
  submissionId: string,
  newContent: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // 権限チェック
    const permissions = await checkSubmissionPermissions(submissionId, userId);
    
    if (!permissions.canEdit) {
      return { success: false, error: 'No permission to edit' };
    }

    // 現在の提出物データを取得
    const { data: currentSubmission, error: fetchError } = await supabase
      .from('submissions')
      .select('content, status, created_by')
      .eq('id', submissionId)
      .single();

    if (fetchError) {
      return { success: false, error: 'Failed to fetch current submission' };
    }

    // 代表が承認済みのものを編集する場合、statusは'approved'のまま
    const userRole = await getUserRole(userId);
    const shouldKeepApproved = userRole === 'admin' && currentSubmission.status === 'approved';

    const updateData: Record<string, any> = { content: newContent };
    if (!shouldKeepApproved && currentSubmission.status === 'approved') {
      updateData.status = 'submitted'; // 承認済みから戻す（代表以外）
      updateData.approved_at = null;
      updateData.approved_by = null;
    }

    const { error: updateError } = await supabase
      .from('submissions')
      .update(updateData)
      .eq('id', submissionId);

    if (updateError) {
      return { success: false, error: 'Failed to edit submission' };
    }

    // 監査ログ記録
    await createAuditLog(
      submissionId,
      userId,
      'edit',
      currentSubmission.status,
      updateData.status || currentSubmission.status,
      { 
        previous_content: currentSubmission.content,
        new_content: newContent
      }
    );

    return { success: true };

  } catch (error) {
    console.error('Edit submission error:', error);
    return { success: false, error: 'Unexpected error occurred' };
  }
}

/**
 * 監査ログを作成
 */
export async function createAuditLog(
  submissionId: string,
  userId: string,
  action: AuditLog['action'],
  previousStatus?: SubmissionStatus,
  newStatus?: SubmissionStatus,
  metadata?: Record<string, any>
): Promise<void> {
  try {
    const { error } = await supabase
      .from('audit_logs')
      .insert({
        submission_id: submissionId,
        user_id: userId,
        action,
        previous_status: previousStatus,
        new_status: newStatus,
        metadata
      });

    if (error) {
      console.error('Failed to create audit log:', error);
    }
  } catch (error) {
    console.error('Audit log error:', error);
  }
}

/**
 * ユーザーの役割を取得
 */
export async function getUserRole(userId: string): Promise<UserRole | null> {
  try {
    const { data, error } = await supabase
      .from('project_members')
      .select('role')
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error('Get user role error:', error);
      return null;
    }

    return data.role as UserRole;
  } catch (error) {
    console.error('Get user role error:', error);
    return null;
  }
}

/**
 * 提出物の一覧を取得（権限フィルタ付き）
 */
export async function getSubmissions(
  projectId: string,
  userId: string,
  type?: SubmissionItem['type']
): Promise<SubmissionItem[]> {
  try {
    let query = supabase
      .from('submissions')
      .select(`
        id,
        content,
        status,
        type,
        project_id,
        created_by,
        created_at,
        approved_at,
        approved_by
      `)
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (type) {
      query = query.eq('type', type);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Get submissions error:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Get submissions error:', error);
    return [];
  }
}

/**
 * ステータス変更からアクションを判定するヘルパー関数
 */
function getActionFromStatus(
  previousStatus: SubmissionStatus,
  newStatus: SubmissionStatus
): AuditLog['action'] {
  if (newStatus === 'approved') return 'approve';
  if (newStatus === 'rejected') return 'reject';
  if (previousStatus === 'approved' && newStatus !== 'approved') return 'cancel_approval';
  return 'edit';
}