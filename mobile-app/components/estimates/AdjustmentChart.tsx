/**
 * 調整傾向チャートコンポーネント
 * 元請け別の受注率・価格調整傾向・季節性をグラフで可視化
 */

import React, { useMemo } from 'react';
import { View, StyleSheet, Dimensions, ScrollView } from 'react-native';
import { LineChart, BarChart } from 'react-native-chart-kit';
import { StyledText } from '../ui/StyledText';
import { Card } from '../ui/Card';
import { 
  ContractorTrendChartData,
  ChartDataPoint,
  SeasonalPerformance,
  Season
} from '../../types/contractor';
import { DesignTokens } from '../../constants/DesignTokens';

interface AdjustmentChartProps {
  contractorName: string;
  trendData: ContractorTrendChartData;
  seasonalPerformance: SeasonalPerformance;
  chartType?: 'trend' | 'seasonal' | 'correlation';
  height?: number;
}

const { width } = Dimensions.get('window');
const chartWidth = width - (DesignTokens.spacing.md * 2);

export const AdjustmentChart: React.FC<AdjustmentChartProps> = ({
  contractorName,
  trendData,
  seasonalPerformance,
  chartType = 'trend',
  height = 220
}) => {
  /**
   * チャート設定
   */
  const chartConfig = {
    backgroundGradientFrom: DesignTokens.colors.surface,
    backgroundGradientTo: DesignTokens.colors.surface,
    color: (opacity = 1) => `rgba(74, 144, 226, ${opacity})`, // Primary blue
    strokeWidth: 2,
    barPercentage: 0.7,
    decimalPlaces: 1,
    labelColor: () => DesignTokens.colors.textSecondary,
    style: {
      borderRadius: DesignTokens.borderRadius.md,
    },
    propsForDots: {
      r: '4',
      strokeWidth: '2',
      stroke: DesignTokens.colors.primary
    },
    propsForBackgroundLines: {
      stroke: DesignTokens.colors.border,
      strokeWidth: 1,
    }
  };

  /**
   * トレンドチャート用データ変換
   */
  const trendChartData = useMemo(() => {
    const winRateData = trendData.win_rate_trend.slice(-12); // 直近12ヶ月
    
    return {
      labels: winRateData.map(d => {
        const date = new Date(d.date);
        return `${date.getMonth() + 1}月`;
      }),
      datasets: [
        {
          data: winRateData.map(d => d.value * 100), // パーセンテージ変換
          color: (opacity = 1) => `rgba(74, 144, 226, ${opacity})`, // 受注率
          strokeWidth: 2,
        },
        {
          data: trendData.price_adjustment_trend.slice(-12).map(d => (d.value - 1) * 100), // 調整率変換
          color: (opacity = 1) => `rgba(255, 159, 64, ${opacity})`, // 価格調整
          strokeWidth: 2,
        }
      ],
      legend: ['受注率 (%)', '価格調整率 (%)']
    };
  }, [trendData]);

  /**
   * 季節別パフォーマンスチャート用データ変換
   */
  const seasonalChartData = useMemo(() => {
    const seasons: Season[] = ['spring', 'summer', 'autumn', 'winter'];
    const seasonLabels = ['春', '夏', '秋', '冬'];
    
    return {
      labels: seasonLabels,
      datasets: [
        {
          data: seasons.map(season => 
            seasonalPerformance[season].win_rate * 100
          ),
          colors: seasons.map((_, index) => () => {
            const colors = [
              'rgba(255, 99, 132, 0.8)', // Spring - Pink
              'rgba(54, 162, 235, 0.8)', // Summer - Blue  
              'rgba(255, 206, 86, 0.8)', // Autumn - Yellow
              'rgba(75, 192, 192, 0.8)'  // Winter - Teal
            ];
            return colors[index];
          })
        }
      ]
    };
  }, [seasonalPerformance]);

  /**
   * 相関チャート用データ変換
   */
  const correlationChartData = useMemo(() => {
    const correlationData = trendData.market_correlation.slice(-8); // 直近8ポイント
    
    return {
      labels: correlationData.map((_, index) => `P${index + 1}`),
      datasets: [
        {
          data: correlationData.map(d => d.value),
          color: (opacity = 1) => `rgba(153, 102, 255, ${opacity})`, // Purple
          strokeWidth: 3,
        }
      ]
    };
  }, [trendData]);

  /**
   * 統計サマリー計算
   */
  const statisticsSummary = useMemo(() => {
    const latestWinRate = trendData.win_rate_trend[trendData.win_rate_trend.length - 1]?.value || 0;
    const avgWinRate = trendData.win_rate_trend.reduce((sum, d) => sum + d.value, 0) / trendData.win_rate_trend.length;
    const trend = latestWinRate > avgWinRate ? 'up' : latestWinRate < avgWinRate ? 'down' : 'stable';
    
    return {
      currentWinRate: latestWinRate,
      averageWinRate: avgWinRate,
      trend: trend,
      bestSeason: findBestSeason(seasonalPerformance)
    };
  }, [trendData, seasonalPerformance]);

  /**
   * トレンドチャートコンポーネント
   */
  const TrendChart = () => (
    <View style={styles.chartContainer}>
      <StyledText variant="h3" style={styles.chartTitle}>
        受注率・価格調整トレンド
      </StyledText>
      <LineChart
        data={trendChartData}
        width={chartWidth}
        height={height}
        chartConfig={{
          ...chartConfig,
          color: (opacity = 1, datasetIndex = 0) => {
            const colors = [
              `rgba(74, 144, 226, ${opacity})`,  // Blue for win rate
              `rgba(255, 159, 64, ${opacity})`   // Orange for price adjustment
            ];
            return colors[datasetIndex] || colors[0];
          }
        }}
        bezier
        style={styles.chart}
        withVerticalLabels={true}
        withHorizontalLabels={true}
        withDots={true}
        withInnerLines={true}
        withOuterLines={true}
      />
    </View>
  );

  /**
   * 季節チャートコンポーネント
   */
  const SeasonalChart = () => (
    <View style={styles.chartContainer}>
      <StyledText variant="h3" style={styles.chartTitle}>
        季節別パフォーマンス
      </StyledText>
      <BarChart
        data={seasonalChartData}
        width={chartWidth}
        height={height}
        chartConfig={chartConfig}
        style={styles.chart}
        showValuesOnTopOfBars={true}
        withInnerLines={true}
        yAxisSuffix="%"
      />
    </View>
  );

  /**
   * 相関チャートコンポーネント
   */
  const CorrelationChart = () => (
    <View style={styles.chartContainer}>
      <StyledText variant="h3" style={styles.chartTitle}>
        市況相関分析
      </StyledText>
      <LineChart
        data={correlationChartData}
        width={chartWidth}
        height={height}
        chartConfig={{
          ...chartConfig,
          color: (opacity = 1) => `rgba(153, 102, 255, ${opacity})`
        }}
        bezier
        style={styles.chart}
        withVerticalLabels={true}
        withHorizontalLabels={true}
        withDots={true}
      />
    </View>
  );

  /**
   * チャート選択
   */
  const renderChart = () => {
    switch (chartType) {
      case 'trend':
        return <TrendChart />;
      case 'seasonal':
        return <SeasonalChart />;
      case 'correlation':
        return <CorrelationChart />;
      default:
        return <TrendChart />;
    }
  };

  return (
    <Card style={styles.container}>
      <View style={styles.header}>
        <StyledText variant="h2" style={styles.title}>
          {contractorName} - 分析チャート
        </StyledText>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {renderChart()}
      </ScrollView>

      {/* 統計サマリー */}
      <View style={styles.summaryContainer}>
        <StyledText variant="body" style={styles.summaryTitle}>
          分析サマリー
        </StyledText>
        
        <View style={styles.summaryGrid}>
          <View style={styles.summaryItem}>
            <StyledText variant="caption" style={styles.summaryLabel}>
              現在の受注率
            </StyledText>
            <StyledText 
              variant="h3" 
              style={[
                styles.summaryValue,
                { color: getPerformanceColor(statisticsSummary.currentWinRate) }
              ]}
            >
              {(statisticsSummary.currentWinRate * 100).toFixed(1)}%
            </StyledText>
          </View>

          <View style={styles.summaryItem}>
            <StyledText variant="caption" style={styles.summaryLabel}>
              平均受注率
            </StyledText>
            <StyledText variant="h3" style={styles.summaryValue}>
              {(statisticsSummary.averageWinRate * 100).toFixed(1)}%
            </StyledText>
          </View>

          <View style={styles.summaryItem}>
            <StyledText variant="caption" style={styles.summaryLabel}>
              トレンド
            </StyledText>
            <StyledText 
              variant="body" 
              style={[
                styles.summaryValue,
                { color: getTrendColor(statisticsSummary.trend) }
              ]}
            >
              {getTrendLabel(statisticsSummary.trend)}
            </StyledText>
          </View>

          <View style={styles.summaryItem}>
            <StyledText variant="caption" style={styles.summaryLabel}>
              最適季節
            </StyledText>
            <StyledText variant="body" style={styles.summaryValue}>
              {statisticsSummary.bestSeason}
            </StyledText>
          </View>
        </View>
      </View>
    </Card>
  );
};

/**
 * 最適季節特定
 */
const findBestSeason = (performance: SeasonalPerformance): string => {
  const seasons = [
    { name: '春', key: 'spring' as Season },
    { name: '夏', key: 'summer' as Season },
    { name: '秋', key: 'autumn' as Season },
    { name: '冬', key: 'winter' as Season }
  ];
  
  let bestSeason = seasons[0];
  let bestRate = performance[bestSeason.key].win_rate;
  
  seasons.forEach(season => {
    if (performance[season.key].win_rate > bestRate) {
      bestRate = performance[season.key].win_rate;
      bestSeason = season;
    }
  });
  
  return bestSeason.name;
};

/**
 * パフォーマンス色取得
 */
const getPerformanceColor = (rate: number): string => {
  if (rate >= 0.6) return DesignTokens.colors.success;
  if (rate >= 0.4) return DesignTokens.colors.warning;
  return DesignTokens.colors.error;
};

/**
 * トレンド色取得
 */
const getTrendColor = (trend: string): string => {
  switch (trend) {
    case 'up': return DesignTokens.colors.success;
    case 'down': return DesignTokens.colors.error;
    default: return DesignTokens.colors.textSecondary;
  }
};

/**
 * トレンドラベル取得
 */
const getTrendLabel = (trend: string): string => {
  switch (trend) {
    case 'up': return '上昇';
    case 'down': return '下降';
    default: return '安定';
  }
};

const styles = StyleSheet.create({
  container: {
    marginBottom: DesignTokens.spacing.md,
  },
  header: {
    padding: DesignTokens.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: DesignTokens.colors.border,
  },
  title: {
    color: DesignTokens.colors.textPrimary,
    fontWeight: '600',
  },
  chartContainer: {
    padding: DesignTokens.spacing.md,
  },
  chartTitle: {
    color: DesignTokens.colors.textPrimary,
    fontWeight: '600',
    marginBottom: DesignTokens.spacing.sm,
    textAlign: 'center',
  },
  chart: {
    marginVertical: DesignTokens.spacing.xs,
    borderRadius: DesignTokens.borderRadius.md,
  },
  summaryContainer: {
    padding: DesignTokens.spacing.md,
    borderTopWidth: 1,
    borderTopColor: DesignTokens.colors.border,
    backgroundColor: DesignTokens.colors.surfaceSecondary,
  },
  summaryTitle: {
    color: DesignTokens.colors.textPrimary,
    fontWeight: '600',
    marginBottom: DesignTokens.spacing.sm,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  summaryItem: {
    width: '48%',
    marginBottom: DesignTokens.spacing.sm,
  },
  summaryLabel: {
    color: DesignTokens.colors.textSecondary,
    marginBottom: DesignTokens.spacing.xs,
  },
  summaryValue: {
    color: DesignTokens.colors.textPrimary,
    fontWeight: '600',
  },
});