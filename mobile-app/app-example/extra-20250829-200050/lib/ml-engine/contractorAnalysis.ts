/**
 * 元請け学習システム - ML分析エンジン（モック実装）
 * 実際のML APIの代替として統計分析とシミュレーションを実装
 */

import {
  EstimateLearningData,
  ContractorStats,
  MLAnalysisResult,
  TrendAnalysis,
  RecommendedAdjustments,
  RiskAssessment,
  OptimizationSuggestion,
  Season,
  MarketCondition,
  ProjectType,
  MLEngineConfig,
  SeasonalPerformance,
  SeasonStats
} from '../../types/contractor';

// デフォルトML設定
const DEFAULT_ML_CONFIG: MLEngineConfig = {
  learning_rate: 0.01,
  window_size: 180, // 6ヶ月
  min_data_points: 10,
  confidence_threshold: 0.7,
  seasonal_weight: 0.3,
  trend_weight: 0.4
};

/**
 * 統計分析ユーティリティ
 */
class StatisticsEngine {
  /**
   * 平均値計算
   */
  static mean(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  /**
   * 標準偏差計算
   */
  static standardDeviation(values: number[]): number {
    if (values.length === 0) return 0;
    const mean = this.mean(values);
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    return Math.sqrt(variance);
  }

  /**
   * 相関係数計算（ピアソン相関）
   */
  static correlation(x: number[], y: number[]): number {
    if (x.length !== y.length || x.length === 0) return 0;
    
    const meanX = this.mean(x);
    const meanY = this.mean(y);
    
    let numerator = 0;
    let denomX = 0;
    let denomY = 0;
    
    for (let i = 0; i < x.length; i++) {
      const deltaX = x[i] - meanX;
      const deltaY = y[i] - meanY;
      numerator += deltaX * deltaY;
      denomX += deltaX * deltaX;
      denomY += deltaY * deltaY;
    }
    
    const denominator = Math.sqrt(denomX * denomY);
    return denominator === 0 ? 0 : numerator / denominator;
  }

  /**
   * 線形回帰の傾き計算
   */
  static linearRegressionSlope(x: number[], y: number[]): number {
    if (x.length !== y.length || x.length === 0) return 0;
    
    const meanX = this.mean(x);
    const meanY = this.mean(y);
    
    let numerator = 0;
    let denominator = 0;
    
    for (let i = 0; i < x.length; i++) {
      numerator += (x[i] - meanX) * (y[i] - meanY);
      denominator += (x[i] - meanX) * (x[i] - meanX);
    }
    
    return denominator === 0 ? 0 : numerator / denominator;
  }

  /**
   * 移動平均計算
   */
  static movingAverage(values: number[], window: number): number[] {
    if (values.length < window) return values;
    
    const result: number[] = [];
    for (let i = window - 1; i < values.length; i++) {
      const windowValues = values.slice(i - window + 1, i + 1);
      result.push(this.mean(windowValues));
    }
    return result;
  }
}

/**
 * 機械学習分析エンジン（モック）
 */
export class ContractorMLEngine {
  private config: MLEngineConfig;

  constructor(config: Partial<MLEngineConfig> = {}) {
    this.config = { ...DEFAULT_ML_CONFIG, ...config };
  }

  /**
   * 元請け別統計分析の実行
   */
  public async analyzeContractorPerformance(
    contractorName: string,
    learningData: EstimateLearningData[]
  ): Promise<ContractorStats> {
    const contractorData = learningData.filter(d => d.contractor_name === contractorName);
    
    if (contractorData.length < this.config.min_data_points) {
      throw new Error(`データ不足: 最低${this.config.min_data_points}件のデータが必要`);
    }

    // 基本統計計算
    const winCount = contractorData.filter(d => d.win_status).length;
    const winRate = winCount / contractorData.length;
    const avgSubmissionAmount = StatisticsEngine.mean(
      contractorData.map(d => d.submitted_amount)
    );
    const wonData = contractorData.filter(d => d.win_status && d.won_amount);
    const avgWinAmount = wonData.length > 0 
      ? StatisticsEngine.mean(wonData.map(d => d.won_amount!))
      : 0;

    // 価格精度計算（提出価格と受注価格の乖離率）
    const priceAccuracy = this.calculatePriceAccuracy(wonData);

    // 季節別パフォーマンス分析
    const seasonalPerformance = this.analyzeSeasonalPerformance(contractorData);

    // トレンド分析
    const trendAnalysis = this.analyzeTrends(contractorData);

    // 推奨調整値計算
    const recommendedAdjustments = this.calculateRecommendedAdjustments(
      contractorData,
      trendAnalysis,
      seasonalPerformance
    );

    return {
      contractor_name: contractorName,
      total_submissions: contractorData.length,
      win_count: winCount,
      win_rate: winRate,
      average_win_amount: avgWinAmount,
      average_submission_amount: avgSubmissionAmount,
      price_accuracy: priceAccuracy,
      seasonal_performance: seasonalPerformance,
      trend_analysis: trendAnalysis,
      recommended_adjustments: recommendedAdjustments
    };
  }

  /**
   * 包括的ML分析の実行
   */
  public async performMLAnalysis(
    contractorName: string,
    learningData: EstimateLearningData[]
  ): Promise<MLAnalysisResult> {
    const currentStats = await this.analyzeContractorPerformance(contractorName, learningData);
    
    // 将来予測（モック）
    const predictedStats = this.predictFuturePerformance(currentStats, learningData);
    
    // リスク評価
    const riskAssessment = this.assessRisks(currentStats, learningData);
    
    // 最適化提案
    const optimizationSuggestions = this.generateOptimizationSuggestions(
      currentStats,
      riskAssessment
    );

    return {
      contractor_name: contractorName,
      current_performance: currentStats,
      predicted_performance: predictedStats,
      risk_assessment: riskAssessment,
      optimization_suggestions: optimizationSuggestions
    };
  }

  /**
   * 価格精度計算
   */
  private calculatePriceAccuracy(wonData: EstimateLearningData[]): number {
    if (wonData.length === 0) return 0;
    
    const accuracies = wonData.map(d => {
      if (!d.won_amount || d.won_amount === 0) return 0;
      return 1 - Math.abs(d.submitted_amount - d.won_amount) / d.won_amount;
    });
    
    return StatisticsEngine.mean(accuracies);
  }

  /**
   * 季節別パフォーマンス分析
   */
  private analyzeSeasonalPerformance(data: EstimateLearningData[]): SeasonalPerformance {
    const seasons: Season[] = ['spring', 'summer', 'autumn', 'winter'];
    const performance: Partial<SeasonalPerformance> = {};

    seasons.forEach(season => {
      const seasonData = data.filter(d => d.season === season);
      
      if (seasonData.length > 0) {
        const winCount = seasonData.filter(d => d.win_status).length;
        const winRate = winCount / seasonData.length;
        const avgAdjustment = this.calculateSeasonalAdjustment(seasonData);
        
        performance[season] = {
          win_rate: winRate,
          average_adjustment: avgAdjustment,
          submission_count: seasonData.length
        };
      } else {
        performance[season] = {
          win_rate: 0,
          average_adjustment: 1.0,
          submission_count: 0
        };
      }
    });

    return performance as SeasonalPerformance;
  }

  /**
   * 季節調整係数計算
   */
  private calculateSeasonalAdjustment(seasonData: EstimateLearningData[]): number {
    const wonData = seasonData.filter(d => d.win_status && d.won_amount);
    if (wonData.length === 0) return 1.0;

    const adjustments = wonData.map(d => d.won_amount! / d.submitted_amount);
    return StatisticsEngine.mean(adjustments);
  }

  /**
   * トレンド分析
   */
  private analyzeTrends(data: EstimateLearningData[]): TrendAnalysis {
    // データを時系列順にソート
    const sortedData = [...data].sort(
      (a, b) => new Date(a.submission_date).getTime() - new Date(b.submission_date).getTime()
    );

    // 時系列インデックス作成
    const timeIndices = sortedData.map((_, index) => index);
    const winRates = this.calculateRollingWinRate(sortedData, 10); // 10件移動平均

    // トレンド分析
    const slope = StatisticsEngine.linearRegressionSlope(timeIndices, winRates);
    
    // 価格調整と受注率の相関
    const priceAdjustments = sortedData.map((d, index) => {
      if (d.win_status && d.won_amount) {
        return d.won_amount / d.submitted_amount;
      }
      return 1.0;
    });
    const correlation = StatisticsEngine.correlation(priceAdjustments, winRates);

    // ボラティリティ計算
    const volatility = StatisticsEngine.standardDeviation(winRates);

    // 信頼度計算（データ量とトレンドの一貫性に基づく）
    const confidenceLevel = Math.min(
      0.9,
      (data.length / 50) * (1 - Math.abs(volatility)) * (1 - Math.abs(correlation - 0.5))
    );

    return {
      slope,
      correlation,
      volatility,
      confidence_level: Math.max(0.1, confidenceLevel)
    };
  }

  /**
   * 移動受注率計算
   */
  private calculateRollingWinRate(data: EstimateLearningData[], window: number): number[] {
    const winRates: number[] = [];
    
    for (let i = 0; i < data.length; i++) {
      const start = Math.max(0, i - window + 1);
      const windowData = data.slice(start, i + 1);
      const winCount = windowData.filter(d => d.win_status).length;
      winRates.push(winCount / windowData.length);
    }
    
    return winRates;
  }

  /**
   * 推奨調整値計算
   */
  private calculateRecommendedAdjustments(
    data: EstimateLearningData[],
    trendAnalysis: TrendAnalysis,
    seasonalPerformance: SeasonalPerformance
  ): RecommendedAdjustments {
    // 現在の季節を判定（モック）
    const currentSeason = this.getCurrentSeason();
    const currentSeasonStats = seasonalPerformance[currentSeason];

    // ベース調整値（現在の季節統計から）
    let priceAdjustment = currentSeasonStats.average_adjustment;
    let scheduleAdjustment = 1.0;

    // トレンド補正
    if (trendAnalysis.slope > 0.1) {
      // 上昇トレンドの場合、より積極的な価格設定
      priceAdjustment *= 0.98;
    } else if (trendAnalysis.slope < -0.1) {
      // 下降トレンドの場合、より保守的な価格設定
      priceAdjustment *= 1.02;
    }

    // 市況補正（モック）
    const marketCondition = this.getCurrentMarketCondition();
    const marketAdjustment = this.getMarketAdjustment(marketCondition);
    priceAdjustment *= marketAdjustment;

    // 工期調整（受注率に基づく）
    const currentWinRate = currentSeasonStats.win_rate;
    if (currentWinRate < 0.3) {
      scheduleAdjustment = 1.1; // 工期を長めに設定
    } else if (currentWinRate > 0.7) {
      scheduleAdjustment = 0.95; // 工期を短めに設定
    }

    // 推奨理由生成
    const reasoning: string[] = [];
    if (trendAnalysis.slope > 0.1) {
      reasoning.push('受注率上昇トレンドのため積極価格を推奨');
    }
    if (currentSeasonStats.win_rate < 0.3) {
      reasoning.push('受注率低下のため価格・工期調整が必要');
    }
    if (marketCondition === 'poor') {
      reasoning.push('市況悪化のため保守的な見積りを推奨');
    }

    return {
      price_adjustment: Number(priceAdjustment.toFixed(3)),
      schedule_adjustment: Number(scheduleAdjustment.toFixed(3)),
      confidence: trendAnalysis.confidence_level,
      reasoning: reasoning.length > 0 ? reasoning : ['標準的な調整値を推奨']
    };
  }

  /**
   * 将来パフォーマンス予測（モック）
   */
  private predictFuturePerformance(
    currentStats: ContractorStats,
    learningData: EstimateLearningData[]
  ): ContractorStats {
    // 簡単な予測モデル（トレンド延長）
    const trendFactor = 1 + (currentStats.trend_analysis.slope * 0.1);
    
    return {
      ...currentStats,
      win_rate: Math.min(1.0, Math.max(0.0, currentStats.win_rate * trendFactor)),
      average_win_amount: currentStats.average_win_amount * (1 + (Math.random() - 0.5) * 0.1),
      price_accuracy: Math.min(1.0, currentStats.price_accuracy * 1.05)
    };
  }

  /**
   * リスク評価
   */
  private assessRisks(
    stats: ContractorStats,
    learningData: EstimateLearningData[]
  ): RiskAssessment {
    // 価格競争リスク
    const priceRisk = 1 - stats.price_accuracy;
    
    // 工期リスク（ボラティリティベース）
    const scheduleRisk = stats.trend_analysis.volatility;
    
    // 市況リスク（データ量と一貫性）
    const marketRisk = 1 - stats.trend_analysis.confidence_level;
    
    // 全体リスク計算
    const overallRiskScore = (priceRisk + scheduleRisk + marketRisk) / 3;
    let overallRisk: 'low' | 'medium' | 'high' = 'medium';
    
    if (overallRiskScore < 0.3) overallRisk = 'low';
    else if (overallRiskScore > 0.6) overallRisk = 'high';

    return {
      overall_risk: overallRisk,
      price_risk: Number(priceRisk.toFixed(3)),
      schedule_risk: Number(scheduleRisk.toFixed(3)),
      market_risk: Number(marketRisk.toFixed(3))
    };
  }

  /**
   * 最適化提案生成
   */
  private generateOptimizationSuggestions(
    stats: ContractorStats,
    riskAssessment: RiskAssessment
  ): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];

    // 価格最適化提案
    if (stats.win_rate < 0.3) {
      suggestions.push({
        type: 'price',
        suggestion: '価格を3-5%下げることで受注率向上が期待されます',
        expected_impact: 0.15,
        confidence: 0.8
      });
    }

    // 工期最適化提案
    if (riskAssessment.schedule_risk > 0.5) {
      suggestions.push({
        type: 'schedule',
        suggestion: '工期を10%延長することでリスク軽減できます',
        expected_impact: 0.1,
        confidence: 0.7
      });
    }

    // タイミング最適化
    const bestSeason = this.findBestSeason(stats.seasonal_performance);
    if (bestSeason) {
      suggestions.push({
        type: 'timing',
        suggestion: `${bestSeason}の提案を重点化することを推奨`,
        expected_impact: 0.08,
        confidence: 0.6
      });
    }

    return suggestions;
  }

  /**
   * 最適な季節を特定
   */
  private findBestSeason(performance: SeasonalPerformance): string | null {
    const seasons = Object.entries(performance);
    const bestSeason = seasons.reduce((best, current) => {
      return current[1].win_rate > best[1].win_rate ? current : best;
    });

    return bestSeason[1].win_rate > 0.4 ? bestSeason[0] : null;
  }

  /**
   * 現在の季節取得（モック）
   */
  private getCurrentSeason(): Season {
    const month = new Date().getMonth();
    if (month >= 2 && month <= 4) return 'spring';
    if (month >= 5 && month <= 7) return 'summer';
    if (month >= 8 && month <= 10) return 'autumn';
    return 'winter';
  }

  /**
   * 現在の市況取得（モック）
   */
  private getCurrentMarketCondition(): MarketCondition {
    // 実装では外部APIや経済指標を参照
    return 'normal';
  }

  /**
   * 市況調整係数取得
   */
  private getMarketAdjustment(condition: MarketCondition): number {
    switch (condition) {
      case 'good': return 0.98; // 好況時は積極価格
      case 'poor': return 1.05; // 不況時は保守価格
      default: return 1.0;      // 通常時
    }
  }
}

/**
 * 推奨調整値計算のヘルパー関数
 */
export const calculateRecommendedAdjustment = (
  historicalData: EstimateLearningData[],
  currentSeason: Season,
  marketCondition: MarketCondition
): number => {
  const engine = new ContractorMLEngine();
  
  // 季節要因
  const seasonalFactor = getSeasonalFactor(currentSeason);
  
  // 市況要因  
  const marketFactor = getMarketFactor(marketCondition);
  
  // 過去受注率
  const winCount = historicalData.filter(d => d.win_status).length;
  const historicalWinRate = winCount / historicalData.length;
  
  // トレンド要因（簡易版）
  const recentData = historicalData.slice(-10);
  const recentWinCount = recentData.filter(d => d.win_status).length;
  const recentWinRate = recentWinCount / recentData.length;
  const trendFactor = recentWinRate / (historicalWinRate || 0.01);

  return seasonalFactor * marketFactor * trendFactor;
};

/**
 * 季節要因取得
 */
export const getSeasonalFactor = (season: Season): number => {
  const factors = {
    spring: 1.05, // 新年度で需要増
    summer: 0.95, // 夏季休暇で需要減
    autumn: 1.02, // 年度後半で追い込み需要
    winter: 0.98  // 年末年始で活動鈍化
  };
  return factors[season];
};

/**
 * 市況要因取得
 */
export const getMarketFactor = (condition: MarketCondition): number => {
  const factors = {
    good: 0.95,   // 好況時は競争激化
    normal: 1.0,  // 通常時
    poor: 1.1     // 不況時は慎重価格
  };
  return factors[condition];
};