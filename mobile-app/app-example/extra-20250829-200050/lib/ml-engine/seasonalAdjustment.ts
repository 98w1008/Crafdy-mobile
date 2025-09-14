/**
 * 季節調整ロジック - 建設業界の季節性分析エンジン
 * 建設業界特有の季節パターンと市況変動を分析
 */

import {
  EstimateLearningData,
  Season,
  MarketCondition,
  ProjectType,
  SeasonalPerformance,
  SeasonStats
} from '../../types/contractor';

// 建設業界の季節性要因
interface SeasonalFactors {
  demand_multiplier: number;    // 需要倍率
  competition_level: number;    // 競争激化度
  material_cost_factor: number; // 資材コスト要因
  labor_availability: number;   // 労働力確保度
  weather_impact: number;       // 天候影響度
}

// 建設プロジェクト種別の季節感応度
interface ProjectSeasonalSensitivity {
  renovation: number;       // リフォーム
  new_construction: number; // 新築
  repair: number;          // 修繕
  maintenance: number;     // メンテナンス
}

/**
 * 季節調整分析エンジン
 */
export class SeasonalAdjustmentEngine {
  private readonly SEASONAL_FACTORS: Record<Season, SeasonalFactors> = {
    spring: {
      demand_multiplier: 1.25,    // 新年度需要で25%増
      competition_level: 1.3,     // 競争激化
      material_cost_factor: 1.05, // 資材価格上昇
      labor_availability: 0.9,    // 労働力不足
      weather_impact: 0.95        // 梅雨の影響
    },
    summer: {
      demand_multiplier: 0.85,    // 夏季休暇で15%減
      competition_level: 0.9,     // 競争緩和
      material_cost_factor: 1.02, // 資材価格安定
      labor_availability: 0.8,    // 熱中症対策で労働時間短縮
      weather_impact: 0.7         // 猛暑・台風影響
    },
    autumn: {
      demand_multiplier: 1.15,    // 年度後半追い込みで15%増
      competition_level: 1.2,     // 競争やや激化
      material_cost_factor: 1.08, // 資材価格上昇傾向
      labor_availability: 1.1,    // 労働環境良好
      weather_impact: 0.9         // 台風リスク
    },
    winter: {
      demand_multiplier: 0.9,     // 年末年始で10%減
      competition_level: 1.0,     // 通常レベル
      material_cost_factor: 1.03, // 輸送コスト増
      labor_availability: 0.85,   // 寒冷地作業制限
      weather_impact: 0.8         // 降雪・凍結影響
    }
  };

  private readonly PROJECT_SEASONAL_SENSITIVITY: ProjectSeasonalSensitivity = {
    renovation: 1.2,      // リフォームは季節性高い
    new_construction: 1.5, // 新築は最も季節性が高い
    repair: 0.8,         // 修繕は季節性低い
    maintenance: 0.6     // メンテナンスは季節性最低
  };

  /**
   * 季節調整係数の計算
   */
  public calculateSeasonalAdjustment(
    season: Season,
    projectType: ProjectType,
    marketCondition: MarketCondition,
    historicalData?: EstimateLearningData[]
  ): number {
    const factors = this.SEASONAL_FACTORS[season];
    const sensitivity = this.PROJECT_SEASONAL_SENSITIVITY[projectType];
    
    // ベース季節調整値
    let adjustment = factors.demand_multiplier * factors.competition_level;
    
    // プロジェクト種別による感応度調整
    adjustment = 1 + (adjustment - 1) * sensitivity;
    
    // 市況による調整
    const marketAdjustment = this.getMarketAdjustment(marketCondition, season);
    adjustment *= marketAdjustment;
    
    // 過去データがあれば実績調整
    if (historicalData && historicalData.length > 0) {
      const historicalAdjustment = this.calculateHistoricalSeasonalPattern(
        historicalData,
        season,
        projectType
      );
      adjustment = (adjustment + historicalAdjustment) / 2; // 理論値と実績値の平均
    }
    
    return Number(adjustment.toFixed(3));
  }

  /**
   * 季節別パフォーマンス詳細分析
   */
  public analyzeSeasonalPerformanceDetailed(
    data: EstimateLearningData[]
  ): Record<Season, SeasonStats & {
    factors: SeasonalFactors;
    risk_level: 'low' | 'medium' | 'high';
    optimal_strategy: string;
  }> {
    const seasons: Season[] = ['spring', 'summer', 'autumn', 'winter'];
    const result: any = {};

    seasons.forEach(season => {
      const seasonData = data.filter(d => d.season === season);
      
      if (seasonData.length > 0) {
        const winCount = seasonData.filter(d => d.win_status).length;
        const winRate = winCount / seasonData.length;
        const avgAdjustment = this.calculateAverageAdjustment(seasonData);
        
        // リスクレベル評価
        const riskLevel = this.evaluateSeasonalRisk(season, seasonData);
        
        // 最適戦略提案
        const optimalStrategy = this.generateSeasonalStrategy(season, winRate, avgAdjustment);
        
        result[season] = {
          win_rate: winRate,
          average_adjustment: avgAdjustment,
          submission_count: seasonData.length,
          factors: this.SEASONAL_FACTORS[season],
          risk_level: riskLevel,
          optimal_strategy: optimalStrategy
        };
      } else {
        result[season] = {
          win_rate: 0,
          average_adjustment: 1.0,
          submission_count: 0,
          factors: this.SEASONAL_FACTORS[season],
          risk_level: 'medium' as const,
          optimal_strategy: 'データ不足のため標準戦略を推奨'
        };
      }
    });

    return result;
  }

  /**
   * 次四半期の需要予測
   */
  public predictQuarterlyDemand(
    historicalData: EstimateLearningData[],
    targetQuarter: number // 1-4
  ): {
    predicted_demand_change: number;
    confidence_level: number;
    risk_factors: string[];
    opportunities: string[];
  } {
    // 過去3年の同四半期データを分析
    const quarterData = this.extractQuarterlyData(historicalData, targetQuarter);
    
    // トレンド分析
    const trendAnalysis = this.analyzeQuarterlyTrend(quarterData);
    
    // リスク要因特定
    const riskFactors = this.identifySeasonalRisks(targetQuarter);
    
    // 機会特定
    const opportunities = this.identifySeasonalOpportunities(targetQuarter);
    
    return {
      predicted_demand_change: trendAnalysis.predicted_change,
      confidence_level: trendAnalysis.confidence,
      risk_factors: riskFactors,
      opportunities: opportunities
    };
  }

  /**
   * 最適な提案タイミング推奨
   */
  public recommendOptimalTiming(
    projectType: ProjectType,
    targetSeason: Season,
    historicalData: EstimateLearningData[]
  ): {
    optimal_month: number;
    win_rate_improvement: number;
    reasoning: string[];
  } {
    // プロジェクト種別と季節の組み合わせ分析
    const seasonalData = historicalData.filter(d => 
      d.season === targetSeason && d.project_type === projectType
    );
    
    // 月別パフォーマンス分析
    const monthlyPerformance = this.analyzeMonthlyPerformance(seasonalData);
    
    // 最適月特定
    const optimalMonth = this.findOptimalMonth(monthlyPerformance, targetSeason);
    
    // 改善効果推定
    const improvement = this.estimateTimingImprovement(
      monthlyPerformance,
      optimalMonth
    );
    
    // 推奨理由生成
    const reasoning = this.generateTimingReasoning(
      targetSeason,
      projectType,
      optimalMonth
    );

    return {
      optimal_month: optimalMonth,
      win_rate_improvement: improvement,
      reasoning: reasoning
    };
  }

  /**
   * 市況調整係数取得
   */
  private getMarketAdjustment(condition: MarketCondition, season: Season): number {
    const baseAdjustments = {
      good: 0.95,    // 好況時は競争激化で価格下げ圧力
      normal: 1.0,   // 通常時
      poor: 1.08     // 不況時は慎重価格設定
    };

    const seasonalMultipliers = {
      spring: { good: 0.93, normal: 1.0, poor: 1.12 }, // 新年度需要の影響
      summer: { good: 0.98, normal: 1.0, poor: 1.05 }, // 夏季の市況安定
      autumn: { good: 0.94, normal: 1.0, poor: 1.10 }, // 年度後半の予算消化
      winter: { good: 0.97, normal: 1.0, poor: 1.06 }  // 年末の調整局面
    };

    return seasonalMultipliers[season][condition];
  }

  /**
   * 過去データから季節パターン計算
   */
  private calculateHistoricalSeasonalPattern(
    data: EstimateLearningData[],
    season: Season,
    projectType: ProjectType
  ): number {
    const relevantData = data.filter(d => 
      d.season === season && d.project_type === projectType
    );
    
    if (relevantData.length === 0) return 1.0;
    
    // 受注データから実際の調整係数を計算
    const wonData = relevantData.filter(d => d.win_status && d.won_amount);
    
    if (wonData.length === 0) return 1.0;
    
    const adjustments = wonData.map(d => d.won_amount! / d.submitted_amount);
    return adjustments.reduce((sum, adj) => sum + adj, 0) / adjustments.length;
  }

  /**
   * 平均調整係数計算
   */
  private calculateAverageAdjustment(data: EstimateLearningData[]): number {
    const wonData = data.filter(d => d.win_status && d.won_amount);
    if (wonData.length === 0) return 1.0;

    const adjustments = wonData.map(d => d.won_amount! / d.submitted_amount);
    return adjustments.reduce((sum, adj) => sum + adj, 0) / adjustments.length;
  }

  /**
   * 季節リスク評価
   */
  private evaluateSeasonalRisk(
    season: Season,
    data: EstimateLearningData[]
  ): 'low' | 'medium' | 'high' {
    const factors = this.SEASONAL_FACTORS[season];
    const winRate = data.filter(d => d.win_status).length / data.length;
    
    // リスクスコア計算
    let riskScore = 0;
    riskScore += (1 - factors.labor_availability) * 0.3;
    riskScore += (1 - factors.weather_impact) * 0.3;
    riskScore += (factors.competition_level - 1) * 0.2;
    riskScore += (1 - winRate) * 0.2;
    
    if (riskScore < 0.3) return 'low';
    if (riskScore < 0.6) return 'medium';
    return 'high';
  }

  /**
   * 季節戦略生成
   */
  private generateSeasonalStrategy(
    season: Season,
    winRate: number,
    avgAdjustment: number
  ): string {
    const factors = this.SEASONAL_FACTORS[season];
    
    if (season === 'spring') {
      if (winRate < 0.3) return '新年度需要を狙い積極的な価格設定を推奨';
      return '競争激化のため差別化戦略が重要';
    }
    
    if (season === 'summer') {
      if (factors.weather_impact < 0.8) return '天候リスクを考慮した工期設定が重要';
      return '閑散期を利用した準備期間として活用';
    }
    
    if (season === 'autumn') {
      if (winRate > 0.6) return '年度後半需要を活用した拡大戦略';
      return '予算消化需要を狙った提案活動を強化';
    }
    
    // winter
    if (winRate < 0.4) return '年末調整に合わせた柔軟な価格戦略';
    return '来年度準備として関係構築に注力';
  }

  /**
   * 四半期データ抽出
   */
  private extractQuarterlyData(
    data: EstimateLearningData[],
    quarter: number
  ): EstimateLearningData[] {
    return data.filter(d => {
      const month = new Date(d.submission_date).getMonth();
      const dataQuarter = Math.floor(month / 3) + 1;
      return dataQuarter === quarter;
    });
  }

  /**
   * 四半期トレンド分析
   */
  private analyzeQuarterlyTrend(quarterData: EstimateLearningData[]): {
    predicted_change: number;
    confidence: number;
  } {
    // 簡易トレンド分析（実装では更に高度な分析を行う）
    const yearlyGroups = this.groupByYear(quarterData);
    const yearlyWinRates = yearlyGroups.map(group => 
      group.filter(d => d.win_status).length / group.length
    );
    
    if (yearlyWinRates.length < 2) {
      return { predicted_change: 0, confidence: 0.3 };
    }
    
    // 線形回帰による予測
    const trend = this.calculateLinearTrend(yearlyWinRates);
    const confidence = Math.min(0.9, yearlyWinRates.length / 5);
    
    return {
      predicted_change: trend,
      confidence: confidence
    };
  }

  /**
   * 年別グループ化
   */
  private groupByYear(data: EstimateLearningData[]): EstimateLearningData[][] {
    const groups: { [year: string]: EstimateLearningData[] } = {};
    
    data.forEach(d => {
      const year = new Date(d.submission_date).getFullYear().toString();
      if (!groups[year]) groups[year] = [];
      groups[year].push(d);
    });
    
    return Object.values(groups);
  }

  /**
   * 線形トレンド計算
   */
  private calculateLinearTrend(values: number[]): number {
    if (values.length < 2) return 0;
    
    const n = values.length;
    const sumX = (n * (n - 1)) / 2;
    const sumY = values.reduce((sum, val) => sum + val, 0);
    const sumXY = values.reduce((sum, val, index) => sum + val * index, 0);
    const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6;
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    return slope;
  }

  /**
   * 季節リスク特定
   */
  private identifySeasonalRisks(quarter: number): string[] {
    const risks: { [quarter: number]: string[] } = {
      1: ['新年度混乱', '人材流動', '予算確定遅延'],
      2: ['梅雨・台風', '夏季休暇', '熱中症対策'],
      3: ['台風シーズン', '資材価格上昇', '労働力不足'],
      4: ['年末調整', '寒冷気候', '予算執行急ぎ']
    };
    
    return risks[quarter] || [];
  }

  /**
   * 季節機会特定
   */
  private identifySeasonalOpportunities(quarter: number): string[] {
    const opportunities: { [quarter: number]: string[] } = {
      1: ['新年度予算獲得', '新規開拓', '組織変更対応'],
      2: ['閑散期準備', '研修・教育', '設備投資'],
      3: ['下半期予算消化', '年度内完工需要', '補正予算対応'],
      4: ['来年度準備', '関係構築', '年末駆け込み需要']
    };
    
    return opportunities[quarter] || [];
  }

  /**
   * 月別パフォーマンス分析
   */
  private analyzeMonthlyPerformance(data: EstimateLearningData[]): { [month: number]: number } {
    const monthlyPerformance: { [month: number]: number } = {};
    
    for (let month = 1; month <= 12; month++) {
      const monthData = data.filter(d => 
        new Date(d.submission_date).getMonth() + 1 === month
      );
      
      if (monthData.length > 0) {
        const winCount = monthData.filter(d => d.win_status).length;
        monthlyPerformance[month] = winCount / monthData.length;
      } else {
        monthlyPerformance[month] = 0;
      }
    }
    
    return monthlyPerformance;
  }

  /**
   * 最適月特定
   */
  private findOptimalMonth(
    monthlyPerformance: { [month: number]: number },
    season: Season
  ): number {
    const seasonMonths = this.getSeasonMonths(season);
    let bestMonth = seasonMonths[0];
    let bestPerformance = monthlyPerformance[bestMonth];
    
    seasonMonths.forEach(month => {
      if (monthlyPerformance[month] > bestPerformance) {
        bestPerformance = monthlyPerformance[month];
        bestMonth = month;
      }
    });
    
    return bestMonth;
  }

  /**
   * 季節の月取得
   */
  private getSeasonMonths(season: Season): number[] {
    const seasonMonths = {
      spring: [3, 4, 5],
      summer: [6, 7, 8],
      autumn: [9, 10, 11],
      winter: [12, 1, 2]
    };
    
    return seasonMonths[season];
  }

  /**
   * タイミング改善効果推定
   */
  private estimateTimingImprovement(
    monthlyPerformance: { [month: number]: number },
    optimalMonth: number
  ): number {
    const optimalPerformance = monthlyPerformance[optimalMonth];
    const averagePerformance = Object.values(monthlyPerformance)
      .reduce((sum, perf) => sum + perf, 0) / Object.keys(monthlyPerformance).length;
    
    return Math.max(0, optimalPerformance - averagePerformance);
  }

  /**
   * タイミング推奨理由生成
   */
  private generateTimingReasoning(
    season: Season,
    projectType: ProjectType,
    optimalMonth: number
  ): string[] {
    const reasoning: string[] = [];
    
    // 季節要因
    const factors = this.SEASONAL_FACTORS[season];
    if (factors.demand_multiplier > 1.1) {
      reasoning.push(`${season}は需要が${Math.round((factors.demand_multiplier - 1) * 100)}%増加`);
    }
    
    // プロジェクト種別要因
    const sensitivity = this.PROJECT_SEASONAL_SENSITIVITY[projectType];
    if (sensitivity > 1.0) {
      reasoning.push(`${projectType}は季節性の影響を受けやすい`);
    }
    
    // 月別要因
    const monthReasons = this.getMonthSpecificReasons(optimalMonth);
    reasoning.push(...monthReasons);
    
    return reasoning;
  }

  /**
   * 月別特有理由取得
   */
  private getMonthSpecificReasons(month: number): string[] {
    const monthReasons: { [month: number]: string[] } = {
      3: ['新年度予算確定時期'],
      4: ['新組織体制でのニーズ発生'],
      5: ['GW後の本格稼働開始'],
      6: ['梅雨前の工事完了需要'],
      9: ['下半期予算執行開始'],
      10: ['年内完成を目指した案件増'],
      11: ['年度内予算消化の駆け込み需要'],
      12: ['来年度準備としての設備投資']
    };
    
    return monthReasons[month] || [`${month}月の季節要因による最適化`];
  }
}