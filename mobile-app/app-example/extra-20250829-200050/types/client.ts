/**
 * 元請け管理・見積最適化システムの型定義
 */

// 基本的なAPIレスポンス型
export interface ApiResponse<T> {
  data?: T
  error?: {
    message: string
    code?: string
    details?: any
  }
}

// 元請け（クライアント）の型定義
export interface Client {
  id: string
  company_id: string
  name: string // 会社名
  contact_person?: string // 担当者名
  email?: string
  phone?: string
  address?: string
  postal_code?: string
  prefecture?: string
  city?: string
  notes?: string
  is_active: boolean
  created_at: string
  updated_at: string
  created_by: string
}

// 元請け作成用データ
export interface CreateClientData {
  name: string
  contact_person?: string
  email?: string
  phone?: string
  address?: string
  postal_code?: string
  prefecture?: string
  city?: string
  notes?: string
}

// 元請け更新用データ
export interface UpdateClientData {
  name?: string
  contact_person?: string
  email?: string
  phone?: string
  address?: string
  postal_code?: string
  prefecture?: string
  city?: string
  notes?: string
  is_active?: boolean
}

// 見積の型定義
export interface Estimate {
  id: string
  project_id: string
  client_id: string
  title: string
  description?: string
  estimated_amount: number // 最適化前の金額
  optimized_amount?: number // 最適化後の金額
  confidence_score: number // 信頼度スコア（0-1）
  acceptance_probability: number // 採択確率（0-1）
  expected_profit: number // 期待利益
  price_bias_factor: number // 価格バイアス要素（-1から1）
  reasoning?: string // 最適化の根拠
  status: 'draft' | 'submitted' | 'approved' | 'rejected'
  created_at: string
  updated_at: string
  created_by: string
  
  // リレーション
  project?: {
    id: string
    name: string
  }
  client?: Client
  creator?: {
    id: string
    full_name: string
  }
}

// 見積作成用データ
export interface CreateEstimateData {
  project_id: string
  client_id: string
  title: string
  description?: string
  estimated_amount: number
}

// 見積更新用データ
export interface UpdateEstimateData {
  title?: string
  description?: string
  estimated_amount?: number
  optimized_amount?: number
  confidence_score?: number
  acceptance_probability?: number
  expected_profit?: number
  price_bias_factor?: number
  reasoning?: string
  status?: 'draft' | 'submitted' | 'approved' | 'rejected'
}

// 価格バイアスの型定義
export interface PriceBias {
  id: string
  client_id: string
  factor_type: 'urgency' | 'relationship' | 'project_scale' | 'market_condition' | 'competition'
  factor_value: number // -1から1の値
  confidence: number // 0-1の値
  description?: string
  last_updated: string
  sample_size: number // 学習に使用したデータ数
  
  // リレーション
  client?: Client
}

// 見積最適化の結果
export interface EstimateOptimizationResult {
  original_amount: number
  optimized_amount: number
  adjustment_percentage: number
  confidence_score: number
  acceptance_probability: number
  expected_profit: number
  reasoning: string
  bias_factors: {
    factor_type: string
    impact: number
    description: string
  }[]
}

// 見積最適化のリクエスト
export interface OptimizeEstimateRequest {
  project_id: string
  client_id: string
  estimated_amount: number
  urgency_level?: 'low' | 'medium' | 'high'
  competition_level?: 'low' | 'medium' | 'high'
  project_scale?: 'small' | 'medium' | 'large'
}

// 見積フィルター
export interface EstimateFilters {
  client_id?: string
  project_id?: string
  status?: ('draft' | 'submitted' | 'approved' | 'rejected')[]
  amount_min?: number
  amount_max?: number
  date_from?: string
  date_to?: string
  search_query?: string
}

// 見積リストのレスポンス
export interface EstimateListResponse {
  data: Estimate[]
  count: number
  error?: string
}

// 個別見積のレスポンス
export interface EstimateResponse {
  data: Estimate | null
  error?: string
}

// 元請けリストのレスポンス
export interface ClientListResponse {
  data: Client[]
  count: number
  error?: string
}

// 個別元請けのレスポンス
export interface ClientResponse {
  data: Client | null
  error?: string
}

// 見積統計
export interface EstimateStats {
  total_estimates: number
  accepted_estimates: number
  rejected_estimates: number
  pending_estimates: number
  total_value: number
  accepted_value: number
  average_acceptance_rate: number
  average_confidence_score: number
}

// PDF出力オプション
export interface EstimateExportOptions {
  include_reasoning: boolean
  include_bias_analysis: boolean
  format: 'pdf' | 'csv'
  client_id?: string
  date_from?: string
  date_to?: string
}

// 権限管理
export interface EstimatePermissions {
  canViewEstimates: boolean
  canCreateEstimates: boolean
  canEditEstimates: boolean
  canDeleteEstimates: boolean
  canViewClientPricing: boolean // 代表のみ
  canManageClients: boolean // 代表のみ
  canExportEstimates: boolean
}

// 学習データの型定義
export interface LearningData {
  client_id: string
  project_characteristics: {
    scale: 'small' | 'medium' | 'large'
    urgency: 'low' | 'medium' | 'high'
    complexity: 'low' | 'medium' | 'high'
  }
  final_amount: number
  was_accepted: boolean
  negotiation_rounds: number
  time_to_decision: number // days
  created_at: string
}

// バイアス学習の結果
export interface BiasLearningResult {
  client_id: string
  updated_factors: PriceBias[]
  learning_confidence: number
  sample_size: number
  recommendation: string
}