/**
 * 元請け学習システム API
 * Supabaseとの連携とデータ管理を担当
 */

import { supabase } from './supabase';
import { ContractorMLEngine } from './ml-engine/contractorAnalysis';
import { 
  ContractorCoefficient, 
  EstimateLearningData,
  ContractorPerformanceStats,
  CoefficientAdjustmentHistory,
  Season,
  MarketCondition
} from '../types/contractor';

/**
 * 元請け係数管理API
 */
export class ContractorLearningAPI {
  private mlEngine: ContractorMLEngine;

  constructor() {
    this.mlEngine = new ContractorMLEngine();
  }

  /**
   * 会社の元請け係数一覧取得
   */
  async getContractorCoefficients(companyId: string): Promise<ContractorCoefficient[]> {
    const { data, error } = await supabase
      .from('contractor_coefficients')
      .select('*')
      .eq('company_id', companyId)
      .order('contractor_name');

    if (error) throw error;
    return data || [];
  }

  /**
   * 元請け別パフォーマンス統計取得（ビューから）
   */
  async getContractorPerformanceStats(companyId: string): Promise<ContractorPerformanceStats[]> {
    const { data, error } = await supabase
      .from('contractor_performance_stats')
      .select('*')
      .eq('company_id', companyId)
      .order('current_win_rate', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  /**
   * 元請け学習データ取得
   */
  async getEstimateLearningData(
    companyId: string,
    contractorName?: string,
    fromDate?: string,
    toDate?: string
  ): Promise<EstimateLearningData[]> {
    let query = supabase
      .from('estimate_learning_data')
      .select('*')
      .eq('company_id', companyId);

    if (contractorName) {
      query = query.eq('contractor_name', contractorName);
    }

    if (fromDate) {
      query = query.gte('submission_date', fromDate);
    }

    if (toDate) {
      query = query.lte('submission_date', toDate);
    }

    const { data, error } = await query.order('submission_date', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  /**
   * 元請け係数作成・更新
   */
  async upsertContractorCoefficient(
    coefficient: Partial<ContractorCoefficient>,
    userId: string
  ): Promise<ContractorCoefficient> {
    const { data, error } = await supabase
      .from('contractor_coefficients')
      .upsert({
        ...coefficient,
        last_updated: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    // 変更履歴記録（データベーストリガーで自動実行）
    return data;
  }

  /**
   * 学習データ追加
   */
  async addLearningData(learningData: Omit<EstimateLearningData, 'id' | 'created_at'>): Promise<EstimateLearningData> {
    const { data, error } = await supabase
      .from('estimate_learning_data')
      .insert({
        ...learningData,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * 係数変更履歴取得
   */
  async getCoefficientHistory(
    contractorName: string,
    companyId: string,
    limit: number = 10
  ): Promise<CoefficientAdjustmentHistory[]> {
    // contractor_coefficients経由で履歴取得
    const { data: coeffs } = await supabase
      .from('contractor_coefficients')
      .select('id')
      .eq('contractor_name', contractorName)
      .eq('company_id', companyId);

    if (!coeffs || coeffs.length === 0) return [];

    const { data, error } = await supabase
      .from('coefficient_adjustment_history')
      .select('*')
      .eq('contractor_coefficient_id', coeffs[0].id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  }

  /**
   * ML分析実行（モック含む）
   */
  async performContractorAnalysis(
    contractorName: string,
    companyId: string
  ): Promise<{
    stats: any;
    recommendations: any;
    seasonalAnalysis: any;
  }> {
    // 学習データ取得
    const learningData = await this.getEstimateLearningData(companyId, contractorName);

    // モックデータ補強（実際の実装では不要）
    const enhancedData = learningData.length < 10 
      ? [...learningData, ...this.generateMockLearningData(contractorName, companyId)]
      : learningData;

    // ML分析実行
    const stats = await this.mlEngine.analyzeContractorPerformance(contractorName, enhancedData);
    const mlResult = await this.mlEngine.performMLAnalysis(contractorName, enhancedData);

    return {
      stats,
      recommendations: mlResult.optimization_suggestions,
      seasonalAnalysis: stats.seasonal_performance
    };
  }

  /**
   * 推奨係数計算
   */
  async calculateRecommendedCoefficients(
    contractorName: string,
    companyId: string,
    currentSeason: Season,
    marketCondition: MarketCondition
  ): Promise<{
    price_adjustment: number;
    schedule_adjustment: number;
    confidence: number;
    reasoning: string[];
  }> {
    const learningData = await this.getEstimateLearningData(companyId, contractorName);
    
    if (learningData.length < 5) {
      // データ不足の場合はデフォルト値
      return {
        price_adjustment: 1.000,
        schedule_adjustment: 1.000,
        confidence: 0.3,
        reasoning: ['データ不足のため標準値を推奨']
      };
    }

    const stats = await this.mlEngine.analyzeContractorPerformance(contractorName, learningData);
    return stats.recommended_adjustments;
  }

  /**
   * データベース初期化（開発用）
   */
  async initializeMockData(companyId: string): Promise<void> {
    const contractors = ['田中建設', '山田工務店', '佐藤組', '鈴木建築', '高橋建設'];
    
    // 係数データ作成
    for (const contractor of contractors) {
      await this.upsertContractorCoefficient({
        contractor_name: contractor,
        company_id: companyId,
        price_adjustment: 0.95 + Math.random() * 0.1,
        schedule_adjustment: 0.95 + Math.random() * 0.1,
        notes: '初期設定'
      }, 'system');

      // 学習データ生成
      const mockData = this.generateMockLearningData(contractor, companyId);
      for (const data of mockData.slice(0, 20)) {
        await this.addLearningData(data);
      }
    }
  }

  /**
   * モック学習データ生成
   */
  private generateMockLearningData(
    contractorName: string,
    companyId: string
  ): Omit<EstimateLearningData, 'id' | 'created_at'>[] {
    const projectTypes = ['renovation', 'new_construction', 'repair', 'maintenance'];
    const seasons: Season[] = ['spring', 'summer', 'autumn', 'winter'];
    const marketConditions: MarketCondition[] = ['good', 'normal', 'poor'];
    
    const data = [];
    
    for (let i = 0; i < 30; i++) {
      const submittedAmount = Math.random() * 8000000 + 2000000;
      const winStatus = Math.random() < 0.4;
      const wonAmount = winStatus ? submittedAmount * (0.9 + Math.random() * 0.2) : undefined;
      
      data.push({
        contractor_name: contractorName,
        company_id: companyId,
        project_type: projectTypes[Math.floor(Math.random() * projectTypes.length)],
        submitted_amount: submittedAmount,
        won_amount: wonAmount,
        win_status: winStatus,
        submission_date: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000)
          .toISOString().split('T')[0],
        season: seasons[Math.floor(Math.random() * seasons.length)],
        market_condition: marketConditions[Math.floor(Math.random() * marketConditions.length)],
        work_category: ['interior', 'exterior', 'general'][Math.floor(Math.random() * 3)],
        estimated_duration: Math.floor(Math.random() * 90) + 10, // 10-100日
        actual_duration: Math.floor(Math.random() * 90) + 10,
        metadata: {
          competitors: Math.floor(Math.random() * 5) + 2,
          special_requirements: Math.random() < 0.3
        }
      });
    }
    
    return data;
  }

  /**
   * キャッシュクリア（1日1回の更新用）
   */
  async clearAnalysisCache(companyId: string): Promise<void> {
    // 実装では Redis などのキャッシュをクリア
    console.log(`Analysis cache cleared for company: ${companyId}`);
  }
}

// シングルトンインスタンス
export const contractorLearningAPI = new ContractorLearningAPI();