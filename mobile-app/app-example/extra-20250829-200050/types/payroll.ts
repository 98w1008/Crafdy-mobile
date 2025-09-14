// 勤怠・給与フロー関連の型定義
export interface PayrollSettings {
  id: string
  company_id: string
  payroll_closing_day: number // 1-31の日付
  payroll_pay_day: number // 1-31の日付
  created_at: string
  updated_at: string
  created_by: string
}

export interface WorkSession {
  id: string
  user_id: string
  project_id: string
  company_id: string
  work_date: string // YYYY-MM-DD
  start_time: string // HH:MM:SS
  end_time?: string // HH:MM:SS
  break_minutes: number
  total_hours: number
  hourly_rate: number
  daily_wage: number
  overtime_hours: number
  overtime_rate: number
  description?: string
  location?: string
  weather?: string
  created_at: string
  updated_at: string
}

export interface PayrollPeriod {
  start_date: string // YYYY-MM-DD
  end_date: string // YYYY-MM-DD
  closing_date: string // YYYY-MM-DD
  pay_date: string // YYYY-MM-DD
}

export interface PayrollSummary {
  user_id: string
  user_name: string
  period: PayrollPeriod
  total_work_days: number
  total_work_hours: number
  total_overtime_hours: number
  regular_wage: number
  overtime_wage: number
  total_wage: number
  projects: ProjectWorkSummary[]
}

export interface ProjectWorkSummary {
  project_id: string
  project_name: string
  work_days: number
  work_hours: number
  overtime_hours: number
  wage: number
}

export interface PayrollExportData {
  company_name: string
  period: PayrollPeriod
  summaries: PayrollSummary[]
  export_date: string
  exported_by: string
}

export interface PayrollExportOptions {
  format: 'pdf' | 'csv' | 'excel'
  period: PayrollPeriod
  include_project_breakdown?: boolean
  include_daily_breakdown?: boolean
}

// API レスポンス型
export interface PayrollApiResponse<T> {
  data?: T
  error?: {
    message: string
    code?: string
    details?: any
  }
}

// フォーム用の型
export interface PayrollSettingsFormData {
  payroll_closing_day: number
  payroll_pay_day: number
}

// 勤怠状態管理用
export interface PayrollState {
  settings?: PayrollSettings
  isSettingsLoading: boolean
  currentPeriod?: PayrollPeriod
  summaries: PayrollSummary[]
  isSummariesLoading: boolean
  hasUnsavedSettings: boolean
}

export type PayrollAction =
  | { type: 'LOAD_SETTINGS_START' }
  | { type: 'LOAD_SETTINGS_SUCCESS'; payload: PayrollSettings }
  | { type: 'LOAD_SETTINGS_ERROR' }
  | { type: 'SAVE_SETTINGS_START' }
  | { type: 'SAVE_SETTINGS_SUCCESS'; payload: PayrollSettings }
  | { type: 'SAVE_SETTINGS_ERROR' }
  | { type: 'SET_CURRENT_PERIOD'; payload: PayrollPeriod }
  | { type: 'LOAD_SUMMARIES_START' }
  | { type: 'LOAD_SUMMARIES_SUCCESS'; payload: PayrollSummary[] }
  | { type: 'LOAD_SUMMARIES_ERROR' }

// ユーティリティ型
export interface DateRange {
  startDate: string
  endDate: string
}

export interface PayrollPermissions {
  canViewPayroll: boolean
  canExportPayroll: boolean
  canConfigureSettings: boolean
}