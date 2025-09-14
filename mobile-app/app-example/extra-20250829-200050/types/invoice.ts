// 請求書管理システムの型定義

export type InvoiceDueType = 'month_end' | 'net30';
export type ApprovalStatus = 'draft' | 'submitted' | 'approved';

// 会社の請求書設定
export interface CompanyInvoiceSettings {
  invoice_default_due: InvoiceDueType;
}

// 請求書データ
export interface Invoice {
  id: string;
  project_id?: string | null;
  company_id: string;
  amount: number;
  issued_date: string; // ISO date string
  due_date: string; // ISO date string
  status: ApprovalStatus;
  description?: string | null;
  customer_name?: string | null;
  customer_email?: string | null;
  created_by: string;
  created_at: string; // ISO datetime string
  updated_at: string; // ISO datetime string
}

// 請求書作成用のフォームデータ
export interface CreateInvoiceData {
  project_id?: string | null;
  amount: number;
  issued_date: string;
  due_date: string;
  description?: string;
  customer_name?: string;
  customer_email?: string;
}

// 請求書更新用のフォームデータ
export interface UpdateInvoiceData {
  amount?: number;
  issued_date?: string;
  due_date?: string;
  status?: ApprovalStatus;
  description?: string;
  customer_name?: string;
  customer_email?: string;
}

// 請求書一覧のフィルター条件
export interface InvoiceFilters {
  status?: ApprovalStatus[];
  project_id?: string;
  date_from?: string;
  date_to?: string;
  customer_name?: string;
}

// 請求書ウィザードのステップ
export type InvoiceWizardStep = 'due_date' | 'basic_info' | 'items' | 'confirmation';

// 請求書ウィザードの状態
export interface InvoiceWizardState {
  currentStep: InvoiceWizardStep;
  formData: CreateInvoiceData;
  isSubmitting: boolean;
  errors: Record<string, string>;
}

// 請求書項目（将来的な拡張用）
export interface InvoiceItem {
  id: string;
  invoice_id: string;
  name: string;
  description?: string;
  quantity: number;
  unit: string;
  unit_price: number;
  amount: number;
  order_index: number;
}

// API レスポンス型
export interface InvoiceListResponse {
  data: Invoice[];
  count: number;
  error?: string;
}

export interface InvoiceResponse {
  data: Invoice | null;
  error?: string;
}

export interface CreateInvoiceResponse {
  data: Invoice | null;
  error?: string;
}

// 監査ログ
export interface AuditLog {
  id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  before_data?: Record<string, any> | null;
  after_data?: Record<string, any> | null;
  acted_by: string;
  acted_at: string;
  description?: string | null;
  ip_address?: string | null;
  user_agent?: string | null;
}

// エラーハンドリング用
export interface InvoiceError {
  code: string;
  message: string;
  field?: string;
}

// バリデーション用
export interface InvoiceValidationErrors {
  amount?: string;
  issued_date?: string;
  due_date?: string;
  customer_name?: string;
  customer_email?: string;
  description?: string;
}

// 日付計算用のヘルパー型
export interface DateCalculationResult {
  calculated_date: string;
  calculation_method: InvoiceDueType;
  base_date: string;
}