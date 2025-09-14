import { supabase } from './supabase'
import { dayjs, parseJpDate, formatIsoDate, nowJp } from '../src/utils/date'
import {
  PayrollSettings,
  PayrollSettingsFormData,
  PayrollPeriod,
  PayrollSummary,
  WorkSession,
  PayrollExportData,
  PayrollExportOptions,
  PayrollApiResponse,
  DateRange,
} from '../types/payroll'

/**
 * 勤怠設定の取得
 */
export const getPayrollSettings = async (companyId: string): Promise<PayrollApiResponse<PayrollSettings>> => {
  try {
    console.log('🏢 Fetching payroll settings for company:', companyId)
    
    const { data, error } = await supabase
      .from('payroll_settings')
      .select('*')
      .eq('company_id', companyId)
      .maybeSingle()

    if (error) {
      console.error('❌ Error fetching payroll settings:', error)
      return { error: { message: error.message, code: error.code } }
    }

    console.log('✅ Payroll settings fetched:', !!data)
    return { data: data || undefined }
  } catch (error) {
    console.error('❌ Unexpected error fetching payroll settings:', error)
    return { error: { message: '設定の取得に失敗しました' } }
  }
}

/**
 * 勤怠設定の保存・更新
 */
export const savePayrollSettings = async (
  companyId: string,
  userId: string,
  formData: PayrollSettingsFormData
): Promise<PayrollApiResponse<PayrollSettings>> => {
  try {
    console.log('💾 Saving payroll settings for company:', companyId)
    
    // 既存設定の確認
    const { data: existingSettings } = await supabase
      .from('payroll_settings')
      .select('*')
      .eq('company_id', companyId)
      .maybeSingle()

    let result
    
    if (existingSettings) {
      // 更新
      result = await supabase
        .from('payroll_settings')
        .update({
          payroll_closing_day: formData.payroll_closing_day,
          payroll_pay_day: formData.payroll_pay_day,
          updated_at: new Date().toISOString(),
        })
        .eq('company_id', companyId)
        .select()
        .single()
    } else {
      // 新規作成
      result = await supabase
        .from('payroll_settings')
        .insert({
          company_id: companyId,
          payroll_closing_day: formData.payroll_closing_day,
          payroll_pay_day: formData.payroll_pay_day,
          created_by: userId,
        })
        .select()
        .single()
    }

    if (result.error) {
      console.error('❌ Error saving payroll settings:', result.error)
      return { error: { message: result.error.message, code: result.error.code } }
    }

    // 監査ログの記録
    await logPayrollAudit(companyId, userId, 'settings_update', {
      action: existingSettings ? 'update' : 'create',
      old_settings: existingSettings,
      new_settings: result.data,
    })

    console.log('✅ Payroll settings saved successfully')
    return { data: result.data }
  } catch (error) {
    console.error('❌ Unexpected error saving payroll settings:', error)
    return { error: { message: '設定の保存に失敗しました' } }
  }
}

/**
 * 給与期間の計算（dayjsベース、Invalid Date エラー対策済み）
 */
export const calculatePayrollPeriod = (
  targetDate: Date | string,
  closingDay: number,
  payDay: number
): PayrollPeriod => {
  const target = dayjs(targetDate).tz('Asia/Tokyo')
  
  if (!target.isValid()) {
    console.warn('Invalid target date in calculatePayrollPeriod, using current date:', targetDate)
    return calculatePayrollPeriod(nowJp().toDate(), closingDay, payDay)
  }

  const currentDay = target.date()

  let periodStart: dayjs.Dayjs
  let periodEnd: dayjs.Dayjs

  if (currentDay >= closingDay) {
    // 今月の締め日以降 → 今月分の給与期間
    // 前月の締め日翌日から今月の締め日まで
    periodStart = target.subtract(1, 'month').date(closingDay).add(1, 'day')
    periodEnd = target.date(closingDay)
  } else {
    // 今月の締め日より前 → 前月分の給与期間
    // 前々月の締め日翌日から前月の締め日まで
    periodStart = target.subtract(2, 'month').date(closingDay).add(1, 'day')
    periodEnd = target.subtract(1, 'month').date(closingDay)
  }

  // 支払日の計算（給与期間終了月の翌月）
  const payDate = periodEnd.add(1, 'month').date(payDay)

  return {
    start_date: formatIsoDate(periodStart),
    end_date: formatIsoDate(periodEnd),
    closing_date: formatIsoDate(periodEnd),
    pay_date: formatIsoDate(payDate),
  }
}

/**
 * 勤怠データの取得
 */
export const getWorkSessions = async (
  companyId: string,
  period: PayrollPeriod,
  userId?: string
): Promise<PayrollApiResponse<WorkSession[]>> => {
  try {
    console.log('📊 Fetching work sessions for period:', period)
    
    let query = supabase
      .from('work_sessions')
      .select(`
        *,
        users:user_id (
          full_name,
          daily_rate
        ),
        projects:project_id (
          name
        )
      `)
      .eq('company_id', companyId)
      .gte('work_date', period.start_date)
      .lte('work_date', period.end_date)
      .order('work_date', { ascending: true })

    if (userId) {
      query = query.eq('user_id', userId)
    }

    const { data, error } = await query

    if (error) {
      console.error('❌ Error fetching work sessions:', error)
      return { error: { message: error.message, code: error.code } }
    }

    console.log(`✅ Fetched ${data?.length || 0} work sessions`)
    return { data: data || [] }
  } catch (error) {
    console.error('❌ Unexpected error fetching work sessions:', error)
    return { error: { message: '勤怠データの取得に失敗しました' } }
  }
}

/**
 * 給与サマリーの計算
 */
export const calculatePayrollSummaries = async (
  companyId: string,
  period: PayrollPeriod
): Promise<PayrollApiResponse<PayrollSummary[]>> => {
  try {
    console.log('🧮 Calculating payroll summaries for period:', period)
    
    const workSessionsResult = await getWorkSessions(companyId, period)
    if (workSessionsResult.error) {
      return { error: workSessionsResult.error }
    }

    const workSessions = workSessionsResult.data || []
    
    // ユーザーごとに集計
    const userSummaries: { [userId: string]: PayrollSummary } = {}

    for (const session of workSessions) {
      const userId = session.user_id
      
      if (!userSummaries[userId]) {
        userSummaries[userId] = {
          user_id: userId,
          user_name: session.users?.full_name || '不明なユーザー',
          period,
          total_work_days: 0,
          total_work_hours: 0,
          total_overtime_hours: 0,
          regular_wage: 0,
          overtime_wage: 0,
          total_wage: 0,
          projects: [],
        }
      }

      const summary = userSummaries[userId]
      summary.total_work_days++
      summary.total_work_hours += session.total_hours
      summary.total_overtime_hours += session.overtime_hours
      summary.regular_wage += session.daily_wage
      summary.overtime_wage += session.overtime_hours * session.overtime_rate

      // プロジェクト別の集計
      const projectId = session.project_id
      let projectSummary = summary.projects.find(p => p.project_id === projectId)
      
      if (!projectSummary) {
        projectSummary = {
          project_id: projectId,
          project_name: session.projects?.name || '不明なプロジェクト',
          work_days: 0,
          work_hours: 0,
          overtime_hours: 0,
          wage: 0,
        }
        summary.projects.push(projectSummary)
      }

      projectSummary.work_days++
      projectSummary.work_hours += session.total_hours
      projectSummary.overtime_hours += session.overtime_hours
      projectSummary.wage += session.daily_wage + (session.overtime_hours * session.overtime_rate)
    }

    // 合計給与の計算
    Object.values(userSummaries).forEach(summary => {
      summary.total_wage = summary.regular_wage + summary.overtime_wage
    })

    console.log(`✅ Calculated summaries for ${Object.keys(userSummaries).length} users`)
    return { data: Object.values(userSummaries) }
  } catch (error) {
    console.error('❌ Unexpected error calculating payroll summaries:', error)
    return { error: { message: '給与サマリーの計算に失敗しました' } }
  }
}

/**
 * PDF/CSV/Excel エクスポート
 */
export const exportPayrollData = async (
  companyId: string,
  userId: string,
  options: PayrollExportOptions
): Promise<PayrollApiResponse<{ downloadUrl: string }>> => {
  try {
    console.log('📄 Exporting payroll data:', options.format)
    
    // サマリーデータの取得
    const summariesResult = await calculatePayrollSummaries(companyId, options.period)
    if (summariesResult.error) {
      return { error: summariesResult.error }
    }

    // 会社情報の取得
    const { data: companyData } = await supabase
      .from('companies')
      .select('name')
      .eq('id', companyId)
      .single()

    const exportData: PayrollExportData = {
      company_name: companyData?.name || '不明な会社',
      period: options.period,
      summaries: summariesResult.data || [],
      export_date: new Date().toISOString(),
      exported_by: userId,
    }

    // 監査ログの記録
    await logPayrollAudit(companyId, userId, 'export', {
      format: options.format,
      period: options.period,
      record_count: exportData.summaries.length,
    })

    // 実際のファイル生成は外部サービス（Supabase Edge Functions等）で処理
    // ここではダミーURLを返す
    const downloadUrl = `https://example.com/exports/${options.format}/${companyId}_${Date.now()}.${options.format}`

    console.log('✅ Export URL generated:', downloadUrl)
    return { data: { downloadUrl } }
  } catch (error) {
    console.error('❌ Unexpected error exporting payroll data:', error)
    return { error: { message: 'データのエクスポートに失敗しました' } }
  }
}

/**
 * 監査ログの記録
 */
const logPayrollAudit = async (
  companyId: string,
  userId: string,
  action: string,
  details: any
): Promise<void> => {
  try {
    await supabase.from('payroll_audit_logs').insert({
      company_id: companyId,
      user_id: userId,
      action,
      details,
      created_at: new Date().toISOString(),
    })
    console.log('📝 Audit log recorded:', action)
  } catch (error) {
    console.warn('⚠️ Failed to record audit log:', error)
    // 監査ログの失敗はメイン処理を止めない
  }
}

/**
 * ユーザー権限の確認
 */
export const checkPayrollPermissions = async (
  userId: string,
  companyId: string
): Promise<PayrollApiResponse<{ canViewPayroll: boolean; canExportPayroll: boolean; canConfigureSettings: boolean }>> => {
  try {
    const { data: user } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .eq('company_id', companyId)
      .single()

    const isAdmin = user?.role === 'admin'
    const isManager = user?.role === 'manager'

    return {
      data: {
        canViewPayroll: true, // 全ユーザーが閲覧可能
        canExportPayroll: isAdmin || isManager, // 管理者・マネージャーのみ
        canConfigureSettings: isAdmin, // 管理者のみ
      }
    }
  } catch (error) {
    console.error('❌ Error checking permissions:', error)
    return { error: { message: '権限の確認に失敗しました' } }
  }
}

/**
 * 月ベースの期間選択肢の生成
 */
export const generatePeriodOptions = (closingDay: number, monthsBack: number = 12): PayrollPeriod[] => {
  const periods: PayrollPeriod[] = []
  const today = new Date()
  
  for (let i = 0; i < monthsBack; i++) {
    const targetDate = new Date(today.getFullYear(), today.getMonth() - i, 1)
    const period = calculatePayrollPeriod(targetDate, closingDay, 25) // 支払日は固定で25日
    periods.push(period)
  }
  
  return periods
}