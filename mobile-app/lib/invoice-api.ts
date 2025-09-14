import { supabase } from './supabase';
import type {
  Invoice,
  CreateInvoiceData,
  UpdateInvoiceData,
  InvoiceFilters,
  InvoiceListResponse,
  InvoiceResponse,
  CreateInvoiceResponse,
  CompanyInvoiceSettings,
  DateCalculationResult,
  InvoiceDueType,
  ApprovalStatus
} from '../types/invoice';

/**
 * 請求書管理API関数群
 */

// 請求書一覧の取得
export const getInvoices = async (filters?: InvoiceFilters): Promise<InvoiceListResponse> => {
  try {
    let query = supabase
      .from('invoices')
      .select(`
        *,
        project:projects(id, name),
        creator:users!created_by(id, full_name)
      `)
      .order('created_at', { ascending: false });

    // フィルターの適用
    if (filters?.status && filters.status.length > 0) {
      query = query.in('status', filters.status);
    }

    if (filters?.project_id) {
      query = query.eq('project_id', filters.project_id);
    }

    if (filters?.date_from) {
      query = query.gte('issued_date', filters.date_from);
    }

    if (filters?.date_to) {
      query = query.lte('issued_date', filters.date_to);
    }

    if (filters?.customer_name) {
      query = query.ilike('customer_name', `%${filters.customer_name}%`);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('請求書一覧取得エラー:', error);
      return { data: [], count: 0, error: error.message };
    }

    return { data: data || [], count: count || 0 };
  } catch (error) {
    console.error('請求書一覧取得エラー:', error);
    return { data: [], count: 0, error: error.message };
  }
};

// 個別請求書の取得
export const getInvoice = async (id: string): Promise<InvoiceResponse> => {
  try {
    const { data, error } = await supabase
      .from('invoices')
      .select(`
        *,
        project:projects(id, name),
        creator:users!created_by(id, full_name)
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('請求書取得エラー:', error);
      return { data: null, error: error.message };
    }

    return { data };
  } catch (error) {
    console.error('請求書取得エラー:', error);
    return { data: null, error: error.message };
  }
};

// 会社の請求書設定を取得
export const getCompanyInvoiceSettings = async (): Promise<CompanyInvoiceSettings | null> => {
  try {
    // 現在のユーザーの会社IDを取得
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) {
      throw new Error('認証が必要です');
    }

    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('company_id')
      .eq('id', user.user.id)
      .single();

    if (profileError) {
      throw profileError;
    }

    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('invoice_default_due')
      .eq('id', userProfile.company_id)
      .single();

    if (companyError) {
      throw companyError;
    }

    return {
      invoice_default_due: company.invoice_default_due || 'month_end'
    };
  } catch (error) {
    console.error('会社設定取得エラー:', error);
    return null;
  }
};

// 支払期日を計算
export const calculateDueDate = async (
  issued_date: string,
  company_id?: string
): Promise<DateCalculationResult> => {
  try {
    // 会社設定を取得（company_idが指定されていない場合は現在のユーザーの会社）
    let targetCompanyId = company_id;
    
    if (!targetCompanyId) {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) {
        throw new Error('認証が必要です');
      }

      const { data: userProfile, error: profileError } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', user.user.id)
        .single();

      if (profileError) {
        throw profileError;
      }

      targetCompanyId = userProfile.company_id;
    }

    // Supabaseの関数を呼び出して支払期日を計算
    const { data, error } = await supabase.rpc('calculate_invoice_due_date', {
      company_id: targetCompanyId,
      issued_date: issued_date
    });

    if (error) {
      throw error;
    }

    // 会社設定も併せて取得
    const settings = await getCompanyInvoiceSettings();
    
    return {
      calculated_date: data,
      calculation_method: settings?.invoice_default_due || 'month_end',
      base_date: issued_date
    };
  } catch (error) {
    console.error('支払期日計算エラー:', error);
    
    // フォールバック: 30日後を返す
    const issuedDate = new Date(issued_date);
    const fallbackDate = new Date(issuedDate);
    fallbackDate.setDate(fallbackDate.getDate() + 30);
    
    return {
      calculated_date: fallbackDate.toISOString().split('T')[0],
      calculation_method: 'net30',
      base_date: issued_date
    };
  }
};

// 請求書の作成
export const createInvoice = async (invoiceData: CreateInvoiceData): Promise<CreateInvoiceResponse> => {
  try {
    // 現在のユーザーと会社情報を取得
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) {
      throw new Error('認証が必要です');
    }

    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('company_id, role')
      .eq('id', user.user.id)
      .single();

    if (profileError) {
      throw profileError;
    }

    // 権限チェック（代表のみ請求書作成可能）
    if (userProfile.role !== 'admin') {
      throw new Error('請求書の作成は代表のみ可能です');
    }

    // 請求書データの準備
    const newInvoice = {
      ...invoiceData,
      company_id: userProfile.company_id,
      created_by: user.user.id,
      status: 'draft' as ApprovalStatus
    };

    const { data, error } = await supabase
      .from('invoices')
      .insert(newInvoice)
      .select(`
        *,
        project:projects(id, name),
        creator:users!created_by(id, full_name)
      `)
      .single();

    if (error) {
      console.error('請求書作成エラー:', error);
      return { data: null, error: error.message };
    }

    // 監査ログの記録
    await recordAuditLog('invoices', data.id, 'create', null, data, '請求書を作成しました');

    return { data };
  } catch (error) {
    console.error('請求書作成エラー:', error);
    return { data: null, error: error.message };
  }
};

// 請求書の更新
export const updateInvoice = async (
  id: string,
  updateData: UpdateInvoiceData
): Promise<CreateInvoiceResponse> => {
  try {
    // 更新前のデータを取得（監査ログ用）
    const currentInvoice = await getInvoice(id);
    if (!currentInvoice.data) {
      throw new Error('請求書が見つかりません');
    }

    // 権限チェック
    const canEdit = await checkEditPermission('invoices', id);
    if (!canEdit) {
      throw new Error('この請求書を編集する権限がありません');
    }

    const { data, error } = await supabase
      .from('invoices')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        project:projects(id, name),
        creator:users!created_by(id, full_name)
      `)
      .single();

    if (error) {
      console.error('請求書更新エラー:', error);
      return { data: null, error: error.message };
    }

    // 監査ログの記録
    await recordAuditLog('invoices', id, 'update', currentInvoice.data, data, '請求書を更新しました');

    return { data };
  } catch (error) {
    console.error('請求書更新エラー:', error);
    return { data: null, error: error.message };
  }
};

// 請求書の削除
export const deleteInvoice = async (id: string): Promise<{ success: boolean; error?: string }> => {
  try {
    // 削除前のデータを取得（監査ログ用）
    const currentInvoice = await getInvoice(id);
    if (!currentInvoice.data) {
      throw new Error('請求書が見つかりません');
    }

    // 権限チェック
    const canEdit = await checkEditPermission('invoices', id);
    if (!canEdit) {
      throw new Error('この請求書を削除する権限がありません');
    }

    const { error } = await supabase
      .from('invoices')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('請求書削除エラー:', error);
      return { success: false, error: error.message };
    }

    // 監査ログの記録
    await recordAuditLog('invoices', id, 'delete', currentInvoice.data, null, '請求書を削除しました');

    return { success: true };
  } catch (error) {
    console.error('請求書削除エラー:', error);
    return { success: false, error: error.message };
  }
};

// 請求書のステータス更新
export const updateInvoiceStatus = async (
  id: string,
  status: ApprovalStatus
): Promise<CreateInvoiceResponse> => {
  try {
    const updateData: UpdateInvoiceData = { status };
    return await updateInvoice(id, updateData);
  } catch (error) {
    console.error('請求書ステータス更新エラー:', error);
    return { data: null, error: error.message };
  }
};

// 編集権限のチェック（Supabase関数を使用）
const checkEditPermission = async (entityType: string, entityId: string): Promise<boolean> => {
  try {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return false;

    const { data, error } = await supabase.rpc('can_edit_submission', {
      entity_type: entityType,
      entity_id: entityId,
      user_id: user.user.id
    });

    if (error) {
      console.error('権限チェックエラー:', error);
      return false;
    }

    return data === true;
  } catch (error) {
    console.error('権限チェックエラー:', error);
    return false;
  }
};

// 監査ログの記録（Supabase関数を使用）
const recordAuditLog = async (
  entityType: string,
  entityId: string,
  action: string,
  beforeData: any = null,
  afterData: any = null,
  description?: string
): Promise<void> => {
  try {
    await supabase.rpc('record_audit_log', {
      p_entity_type: entityType,
      p_entity_id: entityId,
      p_action: action,
      p_before_data: beforeData,
      p_after_data: afterData,
      p_description: description
    });
  } catch (error) {
    console.error('監査ログ記録エラー:', error);
    // 監査ログの失敗は処理を止めない
  }
};

// バリデーション関数（Enhanced with better date handling and comprehensive validation）
export const validateInvoiceData = (data: CreateInvoiceData): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  // 金額のバリデーション
  if (!data.amount || data.amount <= 0) {
    errors.push('金額は1円以上である必要があります');
  }

  if (data.amount && data.amount > 100000000) { // 1億円超えの場合は警告
    errors.push('金額が非常に大きいです。入力内容を確認してください');
  }

  // 発行日のバリデーション
  if (!data.issued_date) {
    errors.push('発行日は必須です');
  } else {
    try {
      const issuedDate = new Date(data.issued_date);
      if (isNaN(issuedDate.getTime())) {
        errors.push('有効な発行日を入力してください');
      } else {
        // 過去3年以上前の日付は警告
        const threeYearsAgo = new Date();
        threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);
        if (issuedDate < threeYearsAgo) {
          errors.push('発行日が3年以上前に設定されています。入力内容を確認してください');
        }
        
        // 未来の日付も警告（1年以上先）
        const oneYearLater = new Date();
        oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);
        if (issuedDate > oneYearLater) {
          errors.push('発行日が1年以上先に設定されています。入力内容を確認してください');
        }
      }
    } catch {
      errors.push('有効な発行日を入力してください');
    }
  }

  // 支払期日のバリデーション
  if (!data.due_date) {
    errors.push('支払期日は必須です');
  } else {
    try {
      const dueDate = new Date(data.due_date);
      if (isNaN(dueDate.getTime())) {
        errors.push('有効な支払期日を入力してください');
      }
    } catch {
      errors.push('有効な支払期日を入力してください');
    }
  }

  // 発行日と支払期日の関係をチェック
  if (data.issued_date && data.due_date) {
    try {
      const issuedDate = new Date(data.issued_date);
      const dueDate = new Date(data.due_date);
      
      if (!isNaN(issuedDate.getTime()) && !isNaN(dueDate.getTime())) {
        if (dueDate <= issuedDate) {
          errors.push('支払期日は発行日より後の日付である必要があります');
        }
        
        // 支払期日が2年以上先の場合は警告
        const twoYearsLater = new Date(issuedDate);
        twoYearsLater.setFullYear(twoYearsLater.getFullYear() + 2);
        if (dueDate > twoYearsLater) {
          errors.push('支払期日が2年以上先に設定されています。入力内容を確認してください');
        }
      }
    } catch {
      errors.push('日付の比較でエラーが発生しました');
    }
  }

  // 顧客情報のバリデーション
  if (data.customer_name && data.customer_name.length > 100) {
    errors.push('顧客名は100文字以内で入力してください');
  }

  if (data.customer_email) {
    if (data.customer_email.length > 254) { // RFC 5321 email length limit
      errors.push('メールアドレスが長すぎます');
    } else if (!isValidEmail(data.customer_email)) {
      errors.push('有効なメールアドレスを入力してください');
    }
  }

  // 備考のバリデーション
  if (data.description && data.description.length > 1000) {
    errors.push('備考は1000文字以内で入力してください');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// メールアドレスの簡単なバリデーション
const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// 請求書の統計情報を取得
export const getInvoiceStatistics = async (): Promise<{
  total_count: number;
  draft_count: number;
  submitted_count: number;
  approved_count: number;
  total_amount: number;
  overdue_count: number;
}> => {
  try {
    const { data: invoices, error } = await supabase
      .from('invoices')
      .select('status, amount, due_date');

    if (error) {
      throw error;
    }

    const today = new Date().toISOString().split('T')[0];
    
    const stats = {
      total_count: invoices.length,
      draft_count: invoices.filter(i => i.status === 'draft').length,
      submitted_count: invoices.filter(i => i.status === 'submitted').length,
      approved_count: invoices.filter(i => i.status === 'approved').length,
      total_amount: invoices.reduce((sum, i) => sum + i.amount, 0),
      overdue_count: invoices.filter(i => i.due_date < today && i.status !== 'approved').length
    };

    return stats;
  } catch (error) {
    console.error('請求書統計取得エラー:', error);
    return {
      total_count: 0,
      draft_count: 0,
      submitted_count: 0,
      approved_count: 0,
      total_amount: 0,
      overdue_count: 0
    };
  }
};