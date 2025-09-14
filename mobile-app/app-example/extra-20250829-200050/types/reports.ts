/**
 * 日報関連の型定義
 * クラフディ日報システム用のTypeScript型定義
 */

// =============================================================================
// BASE TYPES
// =============================================================================

export type ReportStatus = 'draft' | 'submitted' | 'approved' | 'rejected'

export type AttachmentFileType = 'photo' | 'receipt' | 'delivery_slip'

// =============================================================================
// ENTITIES
// =============================================================================

/**
 * 現場情報
 */
export interface WorkSite {
  id: string
  company_id: string
  name: string
  address?: string
  created_at: string
  updated_at: string
}

/**
 * 日報エンティティ
 */
export interface Report {
  id: string
  user_id: string
  work_date: string // YYYY-MM-DD format
  work_site_id?: string
  work_hours: number
  work_content: string
  progress_rate: number // 0-100
  special_notes?: string
  status: ReportStatus
  submitted_at?: string
  approved_at?: string
  approved_by?: string
  rejection_reason?: string
  created_at: string
  updated_at: string
  
  // Joined data
  work_site?: WorkSite
  approver?: {
    id: string
    full_name: string
  }
  attachments?: ReportAttachment[]
}

/**
 * 日報添付ファイル
 */
export interface ReportAttachment {
  id: string
  report_id: string
  file_name: string
  file_url: string
  file_type: AttachmentFileType
  file_size?: number
  created_at: string
}

// =============================================================================
// FORM TYPES
// =============================================================================

/**
 * 日報作成/編集フォームデータ
 */
export interface ReportFormData {
  work_date: string
  work_site_id?: string
  work_hours: number
  work_content: string
  progress_rate: number
  special_notes?: string
  attachments: AttachmentFormData[]
}

/**
 * 添付ファイルフォームデータ
 */
export interface AttachmentFormData {
  id?: string
  file_name: string
  file_url: string
  file_type: AttachmentFileType
  file_size?: number
  isNew?: boolean // 新規アップロードファイルかどうか
}

/**
 * 日報作成リクエスト
 */
export interface CreateReportRequest {
  work_date: string
  work_site_id?: string
  work_hours: number
  work_content: string
  progress_rate: number
  special_notes?: string
  status?: ReportStatus
  attachments?: Omit<AttachmentFormData, 'id'>[]
}

/**
 * 日報更新リクエスト
 */
export interface UpdateReportRequest extends Partial<CreateReportRequest> {
  id: string
}

// =============================================================================
// APPROVAL FLOW TYPES
// =============================================================================

/**
 * 承認アクション
 */
export type ApprovalAction = 'approve' | 'reject'

/**
 * 承認リクエスト
 */
export interface ApprovalRequest {
  report_id: string
  action: ApprovalAction
  rejection_reason?: string
}

/**
 * 承認ログ
 */
export interface ApprovalLog {
  id: string
  report_id: string
  user_id: string
  action: ApprovalAction
  rejection_reason?: string
  created_at: string
  
  // Joined data
  user?: {
    id: string
    full_name: string
  }
}

// =============================================================================
// API RESPONSE TYPES
// =============================================================================

/**
 * 日報一覧レスポンス
 */
export interface ReportsListResponse {
  reports: Report[]
  total_count: number
  page: number
  per_page: number
  has_next: boolean
}

/**
 * 承認待ち日報一覧レスポンス
 */
export interface PendingApprovalsResponse {
  reports: Report[]
  total_count: number
}

// =============================================================================
// FILTER & SEARCH TYPES
// =============================================================================

/**
 * 日報検索フィルター
 */
export interface ReportSearchFilter {
  user_id?: string
  work_site_id?: string
  status?: ReportStatus[]
  date_from?: string
  date_to?: string
  search_text?: string
  page?: number
  per_page?: number
}

/**
 * 日報統計情報
 */
export interface ReportStatistics {
  total_reports: number
  pending_approvals: number
  approved_today: number
  rejected_count: number
  average_work_hours: number
  total_attachments: number
  by_status: Record<ReportStatus, number>
  by_file_type: Record<AttachmentFileType, number>
}

// =============================================================================
// VALIDATION TYPES
// =============================================================================

/**
 * バリデーションエラー
 */
export interface ReportValidationError {
  field: keyof ReportFormData
  message: string
}

/**
 * フォームバリデーション結果
 */
export interface ValidationResult {
  isValid: boolean
  errors: ReportValidationError[]
}

// =============================================================================
// NOTIFICATION TYPES
// =============================================================================

/**
 * 通知タイプ
 */
export type NotificationType = 'report_submitted' | 'report_approved' | 'report_rejected'

/**
 * 通知データ
 */
export interface NotificationData {
  type: NotificationType
  report_id: string
  report_date: string
  user_name: string
  rejection_reason?: string
}

// =============================================================================
// UTILITY TYPES
// =============================================================================

/**
 * 日報ステータス表示情報
 */
export interface StatusDisplayInfo {
  label: string
  color: string
  icon: string
  description: string
}

/**
 * ファイルタイプ表示情報
 */
export interface FileTypeDisplayInfo {
  label: string
  icon: string
  description: string
  allowedExtensions: string[]
}

// =============================================================================
// TYPE GUARDS
// =============================================================================

export const isReportStatus = (value: string): value is ReportStatus => {
  return ['draft', 'submitted', 'approved', 'rejected'].includes(value)
}

export const isAttachmentFileType = (value: string): value is AttachmentFileType => {
  return ['photo', 'receipt', 'delivery_slip'].includes(value)
}

export const isApprovalAction = (value: string): value is ApprovalAction => {
  return ['approve', 'reject'].includes(value)
}

// =============================================================================
// CONSTANTS
// =============================================================================

export const REPORT_STATUS_LABELS: Record<ReportStatus, string> = {
  draft: '下書き',
  submitted: '提出済み',
  approved: '承認済み',
  rejected: '差戻し'
} as const

export const ATTACHMENT_FILE_TYPE_LABELS: Record<AttachmentFileType, string> = {
  photo: '写真',
  receipt: 'レシート',
  delivery_slip: '搬入書'
} as const

export const MAX_WORK_HOURS = 24
export const MIN_WORK_HOURS = 0.5
export const MAX_PROGRESS_RATE = 100
export const MIN_PROGRESS_RATE = 0
export const MAX_ATTACHMENTS = 15
export const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB