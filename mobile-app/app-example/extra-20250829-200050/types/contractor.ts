/**
 * 元請け学習システム用の型定義
 * 機械学習モックと統計分析に必要な型を定義
 */

// 季節タイプ
export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

// 市況状態
export type MarketCondition = 'good' | 'normal' | 'poor';

// プロジェクト種別
export type ProjectType = 'renovation' | 'new_construction' | 'repair' | 'maintenance' | 'demolition' | 'interior' | 'exterior';

// 工事カテゴリ
export type WorkCategory = 'interior' | 'exterior' | 'demolition' | 'plumbing' | 'electrical' | 'hvac' | 'general';

// 元請け係数データ
export interface ContractorCoefficient {
  id: string;
  contractor_name: string;
  company_id: string;
  price_adjustment: number;     // 価格調整係数
  schedule_adjustment: number;  // 工期調整係数
  win_rate_historical?: number; // 過去受注率
  recommended_adjustment?: number; // AI推奨調整値
  last_updated: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

// 見積り学習データ
export interface EstimateLearningData {
  id: string;
  contractor_name: string;
  company_id: string;
  project_type: string;
  submitted_amount: number;
  won_amount?: number;         // 受注時のみ
  win_status: boolean;         // true: 受注, false: 失注
  submission_date: string;
  season?: Season;
  market_condition?: MarketCondition;
  work_category?: string;
  estimated_duration?: number;  // 推定工期（日数）
  actual_duration?: number;     // 実際の工期（日数）
  metadata?: any;              // 追加の学習データ
  created_at: string;
}

// 係数調整履歴
export interface CoefficientAdjustmentHistory {
  id: string;
  contractor_coefficient_id: string;
  user_id: string;
  previous_price_adjustment?: number;
  new_price_adjustment?: number;
  previous_schedule_adjustment?: number;
  new_schedule_adjustment?: number;
  adjustment_reason?: string;
  created_at: string;
}

// 元請け統計データ
export interface ContractorStats {
  contractor_name: string;
  total_submissions: number;
  win_count: number;
  win_rate: number;
  average_win_amount: number;
  average_submission_amount: number;
  price_accuracy: number;      // 提出価格と受注価格の乖離率
  seasonal_performance: SeasonalPerformance;
  trend_analysis: TrendAnalysis;
  recommended_adjustments: RecommendedAdjustments;
}

// 季節別パフォーマンス
export interface SeasonalPerformance {
  spring: SeasonStats;
  summer: SeasonStats;
  autumn: SeasonStats;
  winter: SeasonStats;
}

export interface SeasonStats {
  win_rate: number;
  average_adjustment: number;
  submission_count: number;
}

// トレンド分析
export interface TrendAnalysis {
  slope: number;               // 受注率傾向（上昇/下降）
  correlation: number;         // 価格調整と受注率の相関
  volatility: number;          // ボラティリティ（安定性指標）
  confidence_level: number;    // 推定信頼度
}

// 推奨調整値
export interface RecommendedAdjustments {
  price_adjustment: number;
  schedule_adjustment: number;
  confidence: number;          // 推奨値の信頼度
  reasoning: string[];         // 推奨理由
}

// ML分析結果
export interface MLAnalysisResult {
  contractor_name: string;
  current_performance: ContractorStats;
  predicted_performance: ContractorStats;
  risk_assessment: RiskAssessment;
  optimization_suggestions: OptimizationSuggestion[];
}

// リスク評価
export interface RiskAssessment {
  overall_risk: 'low' | 'medium' | 'high';
  price_risk: number;          // 価格競争リスク
  schedule_risk: number;       // 工期リスク
  market_risk: number;         // 市況リスク
}

// 最適化提案
export interface OptimizationSuggestion {
  type: 'price' | 'schedule' | 'timing' | 'project_type';
  suggestion: string;
  expected_impact: number;     // 予想される受注率向上
  confidence: number;
}

// チャート用データ
export interface ChartDataPoint {
  date: string;
  value: number;
  label?: string;
}

export interface ContractorTrendChartData {
  contractor_name: string;
  win_rate_trend: ChartDataPoint[];
  price_adjustment_trend: ChartDataPoint[];
  market_correlation: ChartDataPoint[];
}

// 元請け統計ビューデータ（データベースビューから）
export interface ContractorPerformanceStats {
  coefficient_id: string;
  contractor_name: string;
  company_id: string;
  price_adjustment: number;
  schedule_adjustment: number;
  win_rate_historical?: number;
  recommended_adjustment?: number;
  total_submissions: number;
  won_projects: number;
  current_win_rate: number;
  avg_price_ratio?: number;
  avg_schedule_ratio?: number;
  last_submission_date?: string;
  last_updated: string;
}

// ML エンジン設定
export interface MLEngineConfig {
  learning_rate: number;
  window_size: number;         // 分析期間（日数）
  min_data_points: number;     // 最小必要データポイント数
  confidence_threshold: number; // 信頼度閾値
  seasonal_weight: number;     // 季節調整の重み
  trend_weight: number;        // トレンド分析の重み
}

// API レスポンス型
export interface ContractorLearningResponse {
  success: boolean;
  data: {
    contractors: ContractorStats[];
    ml_analysis: MLAnalysisResult[];
    market_overview: {
      overall_win_rate: number;
      market_condition: MarketCondition;
      seasonal_adjustment: number;
    };
  };
  error?: string;
}