/**
 * 元請け学習システムの動作確認テスト
 * Node.jsで実行可能なモックテスト
 */

// 型定義のモック
const Season = {
  SPRING: 'spring',
  SUMMER: 'summer',
  AUTUMN: 'autumn',
  WINTER: 'winter'
};

const MarketCondition = {
  GOOD: 'good',
  NORMAL: 'normal',
  POOR: 'poor'
};

// 統計分析エンジンのモック実装
class StatisticsEngine {
  static mean(values) {
    if (values.length === 0) return 0;
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  static standardDeviation(values) {
    if (values.length === 0) return 0;
    const mean = this.mean(values);
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    return Math.sqrt(variance);
  }

  static correlation(x, y) {
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

  static linearRegressionSlope(x, y) {
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
}

// ML分析エンジンのモック実装
class ContractorMLEngine {
  constructor() {
    this.config = {
      learning_rate: 0.01,
      window_size: 180,
      min_data_points: 10,
      confidence_threshold: 0.7,
      seasonal_weight: 0.3,
      trend_weight: 0.4
    };
  }

  async analyzeContractorPerformance(contractorName, learningData) {
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
      ? StatisticsEngine.mean(wonData.map(d => d.won_amount))
      : 0;

    // 価格精度計算
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

  calculatePriceAccuracy(wonData) {
    if (wonData.length === 0) return 0;
    
    const accuracies = wonData.map(d => {
      if (!d.won_amount || d.won_amount === 0) return 0;
      return 1 - Math.abs(d.submitted_amount - d.won_amount) / d.won_amount;
    });
    
    return StatisticsEngine.mean(accuracies);
  }

  analyzeSeasonalPerformance(data) {
    const seasons = [Season.SPRING, Season.SUMMER, Season.AUTUMN, Season.WINTER];
    const performance = {};

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

    return performance;
  }

  calculateSeasonalAdjustment(seasonData) {
    const wonData = seasonData.filter(d => d.win_status && d.won_amount);
    if (wonData.length === 0) return 1.0;

    const adjustments = wonData.map(d => d.won_amount / d.submitted_amount);
    return StatisticsEngine.mean(adjustments);
  }

  analyzeTrends(data) {
    const sortedData = [...data].sort(
      (a, b) => new Date(a.submission_date).getTime() - new Date(b.submission_date).getTime()
    );

    const timeIndices = sortedData.map((_, index) => index);
    const winRates = this.calculateRollingWinRate(sortedData, 10);

    const slope = StatisticsEngine.linearRegressionSlope(timeIndices, winRates);
    
    const priceAdjustments = sortedData.map((d, index) => {
      if (d.win_status && d.won_amount) {
        return d.won_amount / d.submitted_amount;
      }
      return 1.0;
    });
    const correlation = StatisticsEngine.correlation(priceAdjustments, winRates);
    const volatility = StatisticsEngine.standardDeviation(winRates);
    
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

  calculateRollingWinRate(data, window) {
    const winRates = [];
    
    for (let i = 0; i < data.length; i++) {
      const start = Math.max(0, i - window + 1);
      const windowData = data.slice(start, i + 1);
      const winCount = windowData.filter(d => d.win_status).length;
      winRates.push(winCount / windowData.length);
    }
    
    return winRates;
  }

  calculateRecommendedAdjustments(data, trendAnalysis, seasonalPerformance) {
    const currentSeason = Season.SPRING; // モック値
    const currentSeasonStats = seasonalPerformance[currentSeason];

    let priceAdjustment = currentSeasonStats.average_adjustment;
    let scheduleAdjustment = 1.0;

    if (trendAnalysis.slope > 0.1) {
      priceAdjustment *= 0.98;
    } else if (trendAnalysis.slope < -0.1) {
      priceAdjustment *= 1.02;
    }

    const marketCondition = MarketCondition.NORMAL;
    const marketAdjustment = this.getMarketAdjustment(marketCondition);
    priceAdjustment *= marketAdjustment;

    const currentWinRate = currentSeasonStats.win_rate;
    if (currentWinRate < 0.3) {
      scheduleAdjustment = 1.1;
    } else if (currentWinRate > 0.7) {
      scheduleAdjustment = 0.95;
    }

    const reasoning = [];
    if (trendAnalysis.slope > 0.1) {
      reasoning.push('受注率上昇トレンドのため積極価格を推奨');
    }
    if (currentSeasonStats.win_rate < 0.3) {
      reasoning.push('受注率低下のため価格・工期調整が必要');
    }
    if (marketCondition === MarketCondition.POOR) {
      reasoning.push('市況悪化のため保守的な見積りを推奨');
    }

    return {
      price_adjustment: Number(priceAdjustment.toFixed(3)),
      schedule_adjustment: Number(scheduleAdjustment.toFixed(3)),
      confidence: trendAnalysis.confidence_level,
      reasoning: reasoning.length > 0 ? reasoning : ['標準的な調整値を推奨']
    };
  }

  getMarketAdjustment(condition) {
    switch (condition) {
      case MarketCondition.GOOD: return 0.98;
      case MarketCondition.POOR: return 1.05;
      default: return 1.0;
    }
  }
}

// テストデータ生成
function generateTestData() {
  const contractors = ['田中建設', '山田工務店', '佐藤組'];
  const projectTypes = ['renovation', 'new_construction', 'repair', 'maintenance'];
  const seasons = [Season.SPRING, Season.SUMMER, Season.AUTUMN, Season.WINTER];
  const marketConditions = [MarketCondition.GOOD, MarketCondition.NORMAL, MarketCondition.POOR];
  
  const data = [];
  
  contractors.forEach(contractor => {
    for (let i = 0; i < 20; i++) {
      const submittedAmount = Math.random() * 5000000 + 1000000; // 100万〜600万
      const winStatus = Math.random() < 0.4; // 40%の受注率
      const wonAmount = winStatus ? submittedAmount * (0.92 + Math.random() * 0.16) : undefined;
      
      data.push({
        id: `test_${contractor}_${i}`,
        contractor_name: contractor,
        company_id: 'test_company',
        project_type: projectTypes[Math.floor(Math.random() * projectTypes.length)],
        submitted_amount: submittedAmount,
        won_amount: wonAmount,
        win_status: winStatus,
        submission_date: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        season: seasons[Math.floor(Math.random() * seasons.length)],
        market_condition: marketConditions[Math.floor(Math.random() * marketConditions.length)],
        created_at: new Date().toISOString()
      });
    }
  });
  
  return data;
}

// テスト実行
async function runTests() {
  console.log('🏗️  元請け学習システム動作確認テスト');
  console.log('=====================================\n');

  const testData = generateTestData();
  const mlEngine = new ContractorMLEngine();

  console.log(`📊 テストデータ: ${testData.length}件`);
  console.log(`👷 元請け数: ${[...new Set(testData.map(d => d.contractor_name))].length}社\n`);

  // 各元請けの分析実行
  const contractors = [...new Set(testData.map(d => d.contractor_name))];
  
  for (const contractor of contractors) {
    console.log(`📈 ${contractor} の分析結果:`);
    
    try {
      const stats = await mlEngine.analyzeContractorPerformance(contractor, testData);
      
      console.log(`  - 総提案数: ${stats.total_submissions}件`);
      console.log(`  - 受注数: ${stats.win_count}件`);
      console.log(`  - 受注率: ${(stats.win_rate * 100).toFixed(1)}%`);
      console.log(`  - 平均受注額: ¥${Math.floor(stats.average_win_amount / 10000).toLocaleString()}万円`);
      console.log(`  - 価格精度: ${(stats.price_accuracy * 100).toFixed(1)}%`);
      
      console.log(`  📊 季節別パフォーマンス:`);
      Object.entries(stats.seasonal_performance).forEach(([season, perf]) => {
        const seasonName = {
          [Season.SPRING]: '春',
          [Season.SUMMER]: '夏',
          [Season.AUTUMN]: '秋',
          [Season.WINTER]: '冬'
        }[season];
        console.log(`    ${seasonName}: 受注率 ${(perf.win_rate * 100).toFixed(1)}% (${perf.submission_count}件)`);
      });
      
      console.log(`  📈 トレンド分析:`);
      console.log(`    傾向: ${stats.trend_analysis.slope > 0.1 ? '上昇' : stats.trend_analysis.slope < -0.1 ? '下降' : '安定'}`);
      console.log(`    信頼度: ${(stats.trend_analysis.confidence_level * 100).toFixed(1)}%`);
      
      console.log(`  🤖 AI推奨調整値:`);
      console.log(`    価格係数: ${stats.recommended_adjustments.price_adjustment}`);
      console.log(`    工期係数: ${stats.recommended_adjustments.schedule_adjustment}`);
      console.log(`    推奨信頼度: ${(stats.recommended_adjustments.confidence * 100).toFixed(1)}%`);
      console.log(`    推奨理由: ${stats.recommended_adjustments.reasoning.join('、')}`);
      
    } catch (error) {
      console.log(`  ❌ エラー: ${error.message}`);
    }
    
    console.log('');
  }

  console.log('✅ テスト完了!\n');
  
  // 統計分析テスト
  console.log('📊 統計分析エンジンテスト:');
  const testValues = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  console.log(`  平均値: ${StatisticsEngine.mean(testValues)}`);
  console.log(`  標準偏差: ${StatisticsEngine.standardDeviation(testValues).toFixed(3)}`);
  
  const x = [1, 2, 3, 4, 5];
  const y = [2, 4, 6, 8, 10];
  console.log(`  相関係数: ${StatisticsEngine.correlation(x, y).toFixed(3)}`);
  console.log(`  回帰傾き: ${StatisticsEngine.linearRegressionSlope(x, y).toFixed(3)}`);
  
  console.log('\n🎉 全テスト完了!');
}

// テスト実行
runTests().catch(console.error);