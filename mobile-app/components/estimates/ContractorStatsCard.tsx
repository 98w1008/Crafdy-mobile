/**
 * 元請け統計カードコンポーネント
 * 元請け別のパフォーマンス統計と推奨調整値を表示
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { StyledText } from '../ui/StyledText';
import { Card } from '../ui/Card';
import { Icon } from '../ui/Icon';
import { 
  ContractorStats, 
  RecommendedAdjustments,
  RiskAssessment
} from '../../types/contractor';
import { DesignTokens } from '../../constants/DesignTokens';

interface ContractorStatsCardProps {
  stats: ContractorStats;
  riskAssessment?: RiskAssessment;
  onPress?: () => void;
  onEditCoefficients?: () => void;
  showTrend?: boolean;
}

const { width } = Dimensions.get('window');

export const ContractorStatsCard: React.FC<ContractorStatsCardProps> = ({
  stats,
  riskAssessment,
  onPress,
  onEditCoefficients,
  showTrend = true
}) => {
  /**
   * 受注率の色取得
   */
  const getWinRateColor = (winRate: number): string => {
    if (winRate >= 0.6) return DesignTokens.colors.success;
    if (winRate >= 0.4) return DesignTokens.colors.warning;
    return DesignTokens.colors.error;
  };

  /**
   * トレンド矢印アイコン取得
   */
  const getTrendIcon = (slope: number): string => {
    if (slope > 0.1) return 'trending-up';
    if (slope < -0.1) return 'trending-down';
    return 'trending-flat';
  };

  /**
   * トレンド色取得
   */
  const getTrendColor = (slope: number): string => {
    if (slope > 0.1) return DesignTokens.colors.success;
    if (slope < -0.1) return DesignTokens.colors.error;
    return DesignTokens.colors.textSecondary;
  };

  /**
   * リスクレベル色取得
   */
  const getRiskColor = (riskLevel: 'low' | 'medium' | 'high'): string => {
    switch (riskLevel) {
      case 'low': return DesignTokens.colors.success;
      case 'medium': return DesignTokens.colors.warning;
      case 'high': return DesignTokens.colors.error;
      default: return DesignTokens.colors.textSecondary;
    }
  };

  /**
   * 金額フォーマット
   */
  const formatAmount = (amount: number): string => {
    return `¥${(amount / 10000).toFixed(0)}万`;
  };

  /**
   * パーセンテージフォーマット
   */
  const formatPercentage = (value: number): string => {
    return `${(value * 100).toFixed(1)}%`;
  };

  /**
   * 調整係数フォーマット
   */
  const formatCoefficient = (value: number): string => {
    return value.toFixed(3);
  };

  return (
    <Card style={styles.container}>
      <TouchableOpacity onPress={onPress} disabled={!onPress}>
        {/* ヘッダー */}
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <StyledText variant="h3" style={styles.contractorName}>
              {stats.contractor_name}
            </StyledText>
            {showTrend && (
              <View style={styles.trendContainer}>
                <Icon
                  name={getTrendIcon(stats.trend_analysis.slope)}
                  size={20}
                  color={getTrendColor(stats.trend_analysis.slope)}
                />
              </View>
            )}
          </View>
          
          {riskAssessment && (
            <View style={styles.riskBadge}>
              <StyledText 
                variant="caption" 
                style={[
                  styles.riskText,
                  { color: getRiskColor(riskAssessment.overall_risk) }
                ]}
              >
                リスク: {riskAssessment.overall_risk.toUpperCase()}
              </StyledText>
            </View>
          )}
        </View>

        {/* 主要統計 */}
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <StyledText variant="h1" style={[
              styles.statValue,
              { color: getWinRateColor(stats.win_rate) }
            ]}>
              {formatPercentage(stats.win_rate)}
            </StyledText>
            <StyledText variant="caption" style={styles.statLabel}>
              受注率
            </StyledText>
          </View>

          <View style={styles.statItem}>
            <StyledText variant="h2" style={styles.statValue}>
              {stats.win_count}
            </StyledText>
            <StyledText variant="caption" style={styles.statLabel}>
              受注件数
            </StyledText>
          </View>

          <View style={styles.statItem}>
            <StyledText variant="h2" style={styles.statValue}>
              {formatAmount(stats.average_win_amount)}
            </StyledText>
            <StyledText variant="caption" style={styles.statLabel}>
              平均受注額
            </StyledText>
          </View>
        </View>

        {/* 価格精度と信頼度 */}
        <View style={styles.secondaryStats}>
          <View style={styles.secondaryStatItem}>
            <StyledText variant="body" style={styles.secondaryStatLabel}>
              価格精度
            </StyledText>
            <StyledText variant="body" style={styles.secondaryStatValue}>
              {formatPercentage(stats.price_accuracy)}
            </StyledText>
          </View>

          <View style={styles.secondaryStatItem}>
            <StyledText variant="body" style={styles.secondaryStatLabel}>
              信頼度
            </StyledText>
            <StyledText variant="body" style={styles.secondaryStatValue}>
              {formatPercentage(stats.trend_analysis.confidence_level)}
            </StyledText>
          </View>
        </View>

        {/* AI推奨調整値 */}
        <View style={styles.recommendationSection}>
          <StyledText variant="body" style={styles.sectionTitle}>
            AI推奨調整値
          </StyledText>
          
          <View style={styles.recommendationGrid}>
            <View style={styles.recommendationItem}>
              <StyledText variant="caption" style={styles.recommendationLabel}>
                価格調整
              </StyledText>
              <StyledText 
                variant="body" 
                style={[
                  styles.recommendationValue,
                  { color: stats.recommended_adjustments.price_adjustment < 1.0 
                    ? DesignTokens.colors.success 
                    : DesignTokens.colors.warning 
                  }
                ]}
              >
                {formatCoefficient(stats.recommended_adjustments.price_adjustment)}
              </StyledText>
            </View>

            <View style={styles.recommendationItem}>
              <StyledText variant="caption" style={styles.recommendationLabel}>
                工期調整
              </StyledText>
              <StyledText 
                variant="body" 
                style={[
                  styles.recommendationValue,
                  { color: stats.recommended_adjustments.schedule_adjustment > 1.0 
                    ? DesignTokens.colors.warning 
                    : DesignTokens.colors.success 
                  }
                ]}
              >
                {formatCoefficient(stats.recommended_adjustments.schedule_adjustment)}
              </StyledText>
            </View>

            <View style={styles.recommendationItem}>
              <StyledText variant="caption" style={styles.recommendationLabel}>
                推奨信頼度
              </StyledText>
              <StyledText variant="body" style={styles.recommendationValue}>
                {formatPercentage(stats.recommended_adjustments.confidence)}
              </StyledText>
            </View>
          </View>
        </View>

        {/* 推奨理由（上位2つまで表示） */}
        {stats.recommended_adjustments.reasoning.length > 0 && (
          <View style={styles.reasoningSection}>
            <StyledText variant="caption" style={styles.reasoningTitle}>
              推奨理由:
            </StyledText>
            {stats.recommended_adjustments.reasoning.slice(0, 2).map((reason, index) => (
              <StyledText key={index} variant="caption" style={styles.reasoningText}>
                • {reason}
              </StyledText>
            ))}
          </View>
        )}

        {/* アクションボタン */}
        <View style={styles.actionBar}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={onEditCoefficients}
            disabled={!onEditCoefficients}
          >
            <Icon name="edit" size={16} color={DesignTokens.colors.primary} />
            <StyledText variant="caption" style={styles.actionButtonText}>
              係数調整
            </StyledText>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton}>
            <Icon name="analytics" size={16} color={DesignTokens.colors.primary} />
            <StyledText variant="caption" style={styles.actionButtonText}>
              詳細分析
            </StyledText>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Card>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: DesignTokens.spacing.md,
    padding: DesignTokens.spacing.md,
  },
  header: {
    marginBottom: DesignTokens.spacing.md,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: DesignTokens.spacing.xs,
  },
  contractorName: {
    flex: 1,
    color: DesignTokens.colors.textPrimary,
    fontWeight: '600',
  },
  trendContainer: {
    marginLeft: DesignTokens.spacing.sm,
  },
  riskBadge: {
    alignSelf: 'flex-start',
  },
  riskText: {
    fontWeight: '500',
    textTransform: 'uppercase',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: DesignTokens.spacing.md,
    paddingHorizontal: DesignTokens.spacing.xs,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontWeight: '700',
    marginBottom: DesignTokens.spacing.xs,
  },
  statLabel: {
    color: DesignTokens.colors.textSecondary,
    textAlign: 'center',
  },
  secondaryStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: DesignTokens.spacing.md,
    paddingHorizontal: DesignTokens.spacing.sm,
  },
  secondaryStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  secondaryStatLabel: {
    color: DesignTokens.colors.textSecondary,
    marginRight: DesignTokens.spacing.xs,
  },
  secondaryStatValue: {
    color: DesignTokens.colors.textPrimary,
    fontWeight: '500',
  },
  recommendationSection: {
    marginBottom: DesignTokens.spacing.md,
    padding: DesignTokens.spacing.sm,
    backgroundColor: DesignTokens.colors.surfaceSecondary,
    borderRadius: DesignTokens.borderRadius.sm,
  },
  sectionTitle: {
    color: DesignTokens.colors.textPrimary,
    fontWeight: '600',
    marginBottom: DesignTokens.spacing.sm,
  },
  recommendationGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  recommendationItem: {
    alignItems: 'center',
    flex: 1,
  },
  recommendationLabel: {
    color: DesignTokens.colors.textSecondary,
    marginBottom: DesignTokens.spacing.xs,
    textAlign: 'center',
  },
  recommendationValue: {
    fontWeight: '600',
    fontSize: 16,
  },
  reasoningSection: {
    marginBottom: DesignTokens.spacing.md,
    paddingHorizontal: DesignTokens.spacing.sm,
  },
  reasoningTitle: {
    color: DesignTokens.colors.textSecondary,
    fontWeight: '600',
    marginBottom: DesignTokens.spacing.xs,
  },
  reasoningText: {
    color: DesignTokens.colors.textSecondary,
    marginBottom: DesignTokens.spacing.xs,
    paddingLeft: DesignTokens.spacing.xs,
  },
  actionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: DesignTokens.colors.border,
    paddingTop: DesignTokens.spacing.sm,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: DesignTokens.spacing.xs,
    paddingHorizontal: DesignTokens.spacing.sm,
    borderRadius: DesignTokens.borderRadius.sm,
    backgroundColor: DesignTokens.colors.surface,
  },
  actionButtonText: {
    color: DesignTokens.colors.primary,
    marginLeft: DesignTokens.spacing.xs,
    fontWeight: '500',
  },
});