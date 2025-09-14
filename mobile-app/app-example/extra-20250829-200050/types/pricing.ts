/**
 * 価格設定・見積り関連の型定義
 */

// 元請け情報
export interface Client {
  id: string
  name: string
  contact_person?: string
  email?: string
  phone?: string
  address?: string
  pricing_profile_id?: string
  created_at: string
  updated_at: string
}

// 価格プロファイル（元請け学習データ）
export interface PricingProfile {
  id: string
  client_id: string
  // 価格補正データ
  price_adjustment_factor: number // -15%〜+10% の範囲
  historical_win_rate: number     // 受注率
  average_margin: number          // 平均利益率
  
  // 学習データの基礎
  total_estimates: number         // 提出見積り数
  won_estimates: number          // 受注数
  lost_estimates: number         // 失注数
  
  // 最近の傾向
  recent_estimates: EstimateOutcome[]
  
  // 補正根拠
  adjustment_reason: string
  confidence_level: number       // 0-1, 補正精度の信頼度
  
  created_at: string
  updated_at: string
}

// 見積り結果データ
export interface EstimateOutcome {
  id: string
  estimate_id: string
  client_id: string
  submitted_amount: number
  winning_amount?: number        // 受注金額（失注の場合はnull）
  outcome: 'won' | 'lost' | 'pending'
  feedback?: string             // 失注理由など
  submitted_at: string
  decided_at?: string
}

// 工程計画
export interface WorkSchedule {
  id: string
  estimate_id: string
  phases: WorkPhase[]
  total_duration_days: number
  start_date?: string
  end_date?: string
  created_at: string
  updated_at: string
}

// 工程フェーズ  
export interface WorkPhase {
  id: string
  name: string
  description?: string
  duration_days: number
  dependencies: string[]        // 依存する工程のID
  required_workers: number
  estimated_cost: number
  order: number                // 実行順序
}

// 見積り拡張データ
export interface EstimateEnhanced {
  id: string
  project_id: string
  client_id: string            // 必須: 元請け
  
  // 基本情報
  title: string
  description: string
  
  // 工期情報（必須）
  work_schedule_id?: string
  estimated_duration_days: number
  
  // 価格情報
  base_amount: number
  adjusted_amount: number      // 元請け補正後
  adjustment_factor?: number   // 適用された補正率
  adjustment_reason?: string   // 補正理由
  
  // AI補正表示用
  ai_adjustment_applied: boolean
  ai_confidence: number        // 0-1
  
  status: 'draft' | 'submitted' | 'approved' | 'rejected'
  created_at: string
  updated_at: string
}