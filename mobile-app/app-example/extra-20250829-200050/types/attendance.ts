/**
 * 勤怠管理関連の型定義  
 */

// 勤怠レコード
export interface AttendanceRecord {
  id: string
  user_id: string
  project_id?: string
  
  // 勤怠時間
  clock_in: string
  clock_out?: string
  break_minutes: number
  worked_minutes: number
  
  // 勤務詳細
  work_type: WorkType
  is_night_shift: boolean
  is_overtime: boolean
  overtime_minutes: number
  
  // 位置情報（現場確認用）
  location_in?: GeoLocation
  location_out?: GeoLocation
  
  // コスト計算
  hourly_rate: number
  estimated_cost: number
  
  date: string
  created_at: string
  updated_at: string
}

// 勤務種別
export type WorkType = 
  | 'construction'    // 建設作業
  | 'equipment'       // 重機オペレーション
  | 'management'      // 現場管理
  | 'safety'          // 安全管理
  | 'cleanup'         // 片付け・清掃

// 位置情報
export interface GeoLocation {
  latitude: number
  longitude: number
  accuracy?: number
  timestamp: string
}

// 勤怠サマリー（従業員別）
export interface WorkerAttendanceSummary {
  user_id: string
  worker_name: string
  worker_avatar?: string
  
  // 集計期間
  period_start: string
  period_end: string
  
  // 勤怠集計
  total_worked_days: number
  total_worked_hours: number
  total_overtime_hours: number
  
  // 出面率
  attendance_rate: number      // 0-1
  scheduled_days: number       // 予定出勤日数
  actual_days: number         // 実際出勤日数
  
  // コスト
  estimated_total_cost: number
  average_hourly_rate: number
  
  // 最近の勤務パターン
  recent_records: AttendanceRecord[]
}

// 勤怠ダッシュボードデータ  
export interface AttendanceDashboard {
  // 期間設定
  period_start: string
  period_end: string
  
  // 全体サマリー
  total_workers: number
  total_worked_hours: number
  total_worked_days: number
  average_attendance_rate: number
  total_estimated_cost: number
  
  // 従業員別データ
  worker_summaries: WorkerAttendanceSummary[]
  
  // フィルター適用状態
  filters: {
    project_ids?: string[]
    work_types?: WorkType[]
    night_shift_only?: boolean
  }
}

// カレンダーヒートマップデータ
export interface CalendarHeatmapData {
  date: string
  worked_hours: number
  intensity: number            // 0-1, ヒートマップの濃度
  has_overtime: boolean
  work_type: WorkType
}

// 勤務状態
export type AttendanceStatus = 'normal' | 'overtime' | 'night_shift' | 'holiday';

// 社員カード表示用データ
export interface EmployeeCardData {
  id: string
  name: string
  avatar?: string
  thisMonthDays: number
  totalHours: number
  overtimeDays: number
  status: AttendanceStatus
}

// 日別勤怠詳細
export interface DailyAttendanceDetail {
  date: string
  clockIn?: string
  clockOut?: string
  workSite?: string
  status: AttendanceStatus
  totalHours: number
  breakHours: number
  workType: WorkType
  isPresent: boolean
}

// カレンダーマーカー用データ（react-native-calendars用）
export interface CalendarMarkedDates {
  [date: string]: {
    marked?: boolean
    dotColor?: string
    selectedColor?: string
    customStyles?: {
      container?: object
      text?: object
    }
  }
}