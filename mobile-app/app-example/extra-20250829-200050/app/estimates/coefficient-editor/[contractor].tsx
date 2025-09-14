/**
 * 係数編集詳細画面
 * 特定の元請けの係数調整・履歴・詳細分析を表示
 */

import React, { useState, useEffect } from 'react';
import { 
  View, 
  StyleSheet, 
  ScrollView, 
  Alert,
  TouchableOpacity
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { StyledText } from '../../../components/ui/StyledText';
import { StyledButton } from '../../../components/ui/StyledButton';
import { Icon } from '../../../components/ui/Icon';
import { CoefficientEditor } from '../../../components/estimates/CoefficientEditor';
import { AdjustmentChart } from '../../../components/estimates/AdjustmentChart';
import { ContractorMLEngine } from '../../../lib/ml-engine/contractorAnalysis';
import { SeasonalAdjustmentEngine } from '../../../lib/ml-engine/seasonalAdjustment';
import {
  ContractorCoefficient,
  ContractorStats,
  MLAnalysisResult,
  CoefficientHistory,
  EstimateLearningData,
  ContractorTrendChartData,
  Season,
  ProjectType
} from '../../../types/contractor';
import { DesignTokens } from '../../../constants/DesignTokens';

export default function CoefficientEditorScreen() {
  const { contractor } = useLocalSearchParams<{ contractor: string }>();
  const contractorName = decodeURIComponent(contractor || '');

  const [coefficient, setCoefficient] = useState<ContractorCoefficient | null>(null);
  const [contractorStats, setContractorStats] = useState<ContractorStats | null>(null);
  const [mlAnalysis, setMlAnalysis] = useState<MLAnalysisResult | null>(null);
  const [history, setHistory] = useState<CoefficientHistory[]>([]);
  const [chartData, setChartData] = useState<ContractorTrendChartData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'editor' | 'analysis' | 'history'>('editor');

  const mlEngine = new ContractorMLEngine();
  const seasonalEngine = new SeasonalAdjustmentEngine();

  /**
   * 初期データ読み込み
   */
  useEffect(() => {
    if (contractorName) {
      loadContractorData();
    }
  }, [contractorName]);

  /**
   * 元請けデータ読み込み
   */
  const loadContractorData = async () => {
    setIsLoading(true);
    try {
      // モック係数データ
      const mockCoefficient: ContractorCoefficient = {
        id: `coeff_${contractorName}`,
        contractor_name: contractorName,
        company_id: 'current_company',
        price_adjustment: 0.95 + Math.random() * 0.1, // 0.95-1.05のランダム値
        schedule_adjustment: 0.95 + Math.random() * 0.1,
        win_rate_historical: 0.3 + Math.random() * 0.4, // 0.3-0.7のランダム値
        last_updated: new Date().toISOString(),
        notes: '',
        created_at: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString()
      };

      // モック学習データ生成
      const mockLearningData = generateContractorLearningData(contractorName);
      
      // ML分析実行
      const stats = await mlEngine.analyzeContractorPerformance(contractorName, mockLearningData);
      const analysis = await mlEngine.performMLAnalysis(contractorName, mockLearningData);
      
      // 履歴データ生成
      const mockHistory = generateCoefficientHistory(contractorName);
      
      // チャートデータ生成
      const mockChartData = generateContractorTrendData(contractorName);

      setCoefficient(mockCoefficient);
      setContractorStats(stats);
      setMlAnalysis(analysis);
      setHistory(mockHistory);
      setChartData(mockChartData);
    } catch (error) {
      console.error('Failed to load contractor data:', error);
      Alert.alert('エラー', 'データの読み込みに失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 係数保存
   */
  const handleSaveCoefficient = async (updatedData: Partial<ContractorCoefficient>) => {
    if (!coefficient) return;

    setIsSaving(true);
    try {
      // 履歴記録
      const historyEntry: CoefficientHistory = {
        id: `history_${Date.now()}`,
        contractor_name: contractorName,
        previous_price_adjustment: coefficient.price_adjustment,
        new_price_adjustment: updatedData.price_adjustment || coefficient.price_adjustment,
        previous_schedule_adjustment: coefficient.schedule_adjustment,
        new_schedule_adjustment: updatedData.schedule_adjustment || coefficient.schedule_adjustment,
        change_reason: updatedData.notes || '調整',
        changed_by: 'current_user',
        changed_at: new Date().toISOString()
      };

      // 実際の実装ではSupabaseに保存
      console.log('Saving coefficient:', { ...coefficient, ...updatedData });
      console.log('Adding history:', historyEntry);

      // 状態更新
      setCoefficient(prev => prev ? { ...prev, ...updatedData } : null);
      setHistory(prev => [historyEntry, ...prev]);

      Alert.alert('保存完了', '係数調整が保存されました');
    } catch (error) {
      console.error('Save failed:', error);
      throw error;
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * 季節別最適化提案
   */
  const generateSeasonalRecommendations = () => {
    if (!contractorStats) return;

    const currentSeason = getCurrentSeason();
    const recommendations = seasonalEngine.recommendOptimalTiming(
      'renovation', // デフォルトプロジェクトタイプ
      currentSeason,
      [] // モックデータで空配列
    );

    Alert.alert(
      '季節最適化提案',
      `最適月: ${recommendations.optimal_month}月\n` +
      `改善期待値: +${(recommendations.win_rate_improvement * 100).toFixed(1)}%\n\n` +
      `理由:\n${recommendations.reasoning.join('\n')}`
    );
  };

  /**
   * タブコンポーネント
   */
  const TabButton = ({ 
    tab, 
    label, 
    isActive, 
    onPress 
  }: { 
    tab: string; 
    label: string; 
    isActive: boolean; 
    onPress: () => void; 
  }) => (
    <TouchableOpacity
      style={[
        styles.tabButton,
        isActive && styles.tabButtonActive
      ]}
      onPress={onPress}
    >
      <StyledText 
        variant="body" 
        style={[
          styles.tabButtonText,
          isActive && styles.tabButtonTextActive
        ]}
      >
        {label}
      </StyledText>
    </TouchableOpacity>
  );

  if (isLoading || !coefficient || !contractorStats) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <StyledText variant="body" style={styles.loadingText}>
            データを読み込み中...
          </StyledText>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* ヘッダー */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Icon name="arrow-back" size={24} color={DesignTokens.colors.textPrimary} />
        </TouchableOpacity>
        
        <View style={styles.titleContainer}>
          <StyledText variant="h2" style={styles.title}>
            {contractorName}
          </StyledText>
          <StyledText variant="caption" style={styles.subtitle}>
            係数調整・分析
          </StyledText>
        </View>

        <TouchableOpacity 
          onPress={generateSeasonalRecommendations}
          style={styles.recommendButton}
        >
          <Icon name="lightbulb" size={20} color={DesignTokens.colors.primary} />
        </TouchableOpacity>
      </View>

      {/* タブバー */}
      <View style={styles.tabBar}>
        <TabButton
          tab="editor"
          label="係数調整"
          isActive={activeTab === 'editor'}
          onPress={() => setActiveTab('editor')}
        />
        <TabButton
          tab="analysis"
          label="分析チャート"
          isActive={activeTab === 'analysis'}
          onPress={() => setActiveTab('analysis')}
        />
        <TabButton
          tab="history"
          label="変更履歴"
          isActive={activeTab === 'history'}
          onPress={() => setActiveTab('history')}
        />
      </View>

      {/* タブコンテンツ */}
      <ScrollView style={styles.content}>
        {activeTab === 'editor' && (
          <CoefficientEditor
            coefficient={coefficient}
            recommendedAdjustments={contractorStats.recommended_adjustments}
            onSave={handleSaveCoefficient}
            onCancel={() => router.back()}
            isLoading={isSaving}
          />
        )}

        {activeTab === 'analysis' && chartData && (
          <View style={styles.analysisContainer}>
            <AdjustmentChart
              contractorName={contractorName}
              trendData={chartData}
              seasonalPerformance={contractorStats.seasonal_performance}
              chartType="trend"
            />
            
            <AdjustmentChart
              contractorName={contractorName}
              trendData={chartData}
              seasonalPerformance={contractorStats.seasonal_performance}
              chartType="seasonal"
            />
            
            {mlAnalysis && (
              <View style={styles.mlInsights}>
                <StyledText variant="h3" style={styles.insightsTitle}>
                  AI分析インサイト
                </StyledText>
                
                <View style={styles.insightItem}>
                  <StyledText variant="body" style={styles.insightLabel}>
                    総合リスクレベル:
                  </StyledText>
                  <StyledText 
                    variant="body" 
                    style={[
                      styles.insightValue,
                      { color: getRiskColor(mlAnalysis.risk_assessment.overall_risk) }
                    ]}
                  >
                    {mlAnalysis.risk_assessment.overall_risk.toUpperCase()}
                  </StyledText>
                </View>

                <View style={styles.optimizationSuggestions}>
                  <StyledText variant="body" style={styles.suggestionsTitle}>
                    最適化提案:
                  </StyledText>
                  {mlAnalysis.optimization_suggestions.map((suggestion, index) => (
                    <View key={index} style={styles.suggestionItem}>
                      <StyledText variant="caption" style={styles.suggestionText}>
                        • {suggestion.suggestion} 
                        (期待効果: +{(suggestion.expected_impact * 100).toFixed(1)}%)
                      </StyledText>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>
        )}

        {activeTab === 'history' && (
          <View style={styles.historyContainer}>
            <StyledText variant="h3" style={styles.historyTitle}>
              係数変更履歴
            </StyledText>
            
            {history.length === 0 ? (
              <View style={styles.emptyHistory}>
                <StyledText variant="body" style={styles.emptyHistoryText}>
                  変更履歴はありません
                </StyledText>
              </View>
            ) : (
              history.map((item) => (
                <View key={item.id} style={styles.historyItem}>
                  <View style={styles.historyHeader}>
                    <StyledText variant="body" style={styles.historyDate}>
                      {new Date(item.changed_at).toLocaleString()}
                    </StyledText>
                    <StyledText variant="caption" style={styles.historyUser}>
                      変更者: {item.changed_by}
                    </StyledText>
                  </View>
                  
                  <View style={styles.historyChanges}>
                    <StyledText variant="caption" style={styles.historyChange}>
                      価格係数: {item.previous_price_adjustment.toFixed(3)} → {item.new_price_adjustment.toFixed(3)}
                    </StyledText>
                    <StyledText variant="caption" style={styles.historyChange}>
                      工期係数: {item.previous_schedule_adjustment.toFixed(3)} → {item.new_schedule_adjustment.toFixed(3)}
                    </StyledText>
                  </View>
                  
                  {item.change_reason && (
                    <StyledText variant="caption" style={styles.historyReason}>
                      理由: {item.change_reason}
                    </StyledText>
                  )}
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

/**
 * 元請け別学習データ生成（モック）
 */
const generateContractorLearningData = (contractorName: string): EstimateLearningData[] => {
  const projectTypes: ProjectType[] = ['renovation', 'new_construction', 'repair', 'maintenance'];
  const seasons: Season[] = ['spring', 'summer', 'autumn', 'winter'];
  
  const data: EstimateLearningData[] = [];
  
  for (let i = 0; i < 30; i++) {
    const submittedAmount = Math.random() * 8000000 + 2000000; // 200万〜1000万
    const winStatus = Math.random() < 0.4; // 40%の受注率
    const wonAmount = winStatus ? submittedAmount * (0.92 + Math.random() * 0.16) : undefined;
    
    data.push({
      id: `learning_${contractorName}_${i}`,
      contractor_name: contractorName,
      project_type: projectTypes[Math.floor(Math.random() * projectTypes.length)],
      submitted_amount: submittedAmount,
      won_amount: wonAmount,
      win_status: winStatus,
      submission_date: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      season: seasons[Math.floor(Math.random() * seasons.length)],
      market_condition: 'normal',
      created_at: new Date().toISOString()
    });
  }
  
  return data;
};

/**
 * 係数変更履歴生成（モック）
 */
const generateCoefficientHistory = (contractorName: string): CoefficientHistory[] => {
  const history: CoefficientHistory[] = [];
  
  for (let i = 0; i < 5; i++) {
    const prevPrice = 0.95 + Math.random() * 0.1;
    const newPrice = 0.95 + Math.random() * 0.1;
    const prevSchedule = 0.95 + Math.random() * 0.1;
    const newSchedule = 0.95 + Math.random() * 0.1;
    
    history.push({
      id: `history_${contractorName}_${i}`,
      contractor_name: contractorName,
      previous_price_adjustment: prevPrice,
      new_price_adjustment: newPrice,
      previous_schedule_adjustment: prevSchedule,
      new_schedule_adjustment: newSchedule,
      change_reason: `調整理由 ${i + 1}`,
      changed_by: 'user_name',
      changed_at: new Date(Date.now() - i * 7 * 24 * 60 * 60 * 1000).toISOString()
    });
  }
  
  return history;
};

/**
 * トレンドデータ生成（モック）
 */
const generateContractorTrendData = (contractorName: string): ContractorTrendChartData => {
  const generatePoints = (baseValue: number, count: number = 12) => {
    const points = [];
    let value = baseValue;
    
    for (let i = 0; i < count; i++) {
      value += (Math.random() - 0.5) * 0.1;
      value = Math.max(0, Math.min(1, value));
      
      points.push({
        date: new Date(Date.now() - (count - i - 1) * 30 * 24 * 60 * 60 * 1000).toISOString(),
        value: value
      });
    }
    
    return points;
  };
  
  return {
    contractor_name: contractorName,
    win_rate_trend: generatePoints(0.4),
    price_adjustment_trend: generatePoints(1.0),
    market_correlation: generatePoints(0.3)
  };
};

/**
 * 現在の季節取得
 */
const getCurrentSeason = (): Season => {
  const month = new Date().getMonth();
  if (month >= 2 && month <= 4) return 'spring';
  if (month >= 5 && month <= 7) return 'summer';
  if (month >= 8 && month <= 10) return 'autumn';
  return 'winter';
};

/**
 * リスク色取得
 */
const getRiskColor = (riskLevel: 'low' | 'medium' | 'high'): string => {
  switch (riskLevel) {
    case 'low': return DesignTokens.colors.success;
    case 'medium': return DesignTokens.colors.warning;
    case 'high': return DesignTokens.colors.error;
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DesignTokens.colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: DesignTokens.colors.textSecondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: DesignTokens.spacing.md,
    backgroundColor: DesignTokens.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: DesignTokens.colors.border,
  },
  backButton: {
    padding: DesignTokens.spacing.xs,
    marginRight: DesignTokens.spacing.sm,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    color: DesignTokens.colors.textPrimary,
    fontWeight: '700',
  },
  subtitle: {
    color: DesignTokens.colors.textSecondary,
    marginTop: DesignTokens.spacing.xs,
  },
  recommendButton: {
    padding: DesignTokens.spacing.sm,
    backgroundColor: DesignTokens.colors.primary + '20',
    borderRadius: DesignTokens.borderRadius.sm,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: DesignTokens.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: DesignTokens.colors.border,
  },
  tabButton: {
    flex: 1,
    paddingVertical: DesignTokens.spacing.md,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabButtonActive: {
    borderBottomColor: DesignTokens.colors.primary,
  },
  tabButtonText: {
    color: DesignTokens.colors.textSecondary,
    fontWeight: '500',
  },
  tabButtonTextActive: {
    color: DesignTokens.colors.primary,
    fontWeight: '700',
  },
  content: {
    flex: 1,
  },
  analysisContainer: {
    padding: DesignTokens.spacing.md,
  },
  mlInsights: {
    marginTop: DesignTokens.spacing.lg,
    padding: DesignTokens.spacing.md,
    backgroundColor: DesignTokens.colors.surface,
    borderRadius: DesignTokens.borderRadius.md,
  },
  insightsTitle: {
    color: DesignTokens.colors.textPrimary,
    fontWeight: '600',
    marginBottom: DesignTokens.spacing.md,
  },
  insightItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: DesignTokens.spacing.sm,
  },
  insightLabel: {
    color: DesignTokens.colors.textSecondary,
  },
  insightValue: {
    fontWeight: '600',
  },
  optimizationSuggestions: {
    marginTop: DesignTokens.spacing.md,
  },
  suggestionsTitle: {
    color: DesignTokens.colors.textPrimary,
    fontWeight: '600',
    marginBottom: DesignTokens.spacing.sm,
  },
  suggestionItem: {
    marginBottom: DesignTokens.spacing.xs,
  },
  suggestionText: {
    color: DesignTokens.colors.textSecondary,
  },
  historyContainer: {
    padding: DesignTokens.spacing.md,
  },
  historyTitle: {
    color: DesignTokens.colors.textPrimary,
    fontWeight: '600',
    marginBottom: DesignTokens.spacing.md,
  },
  emptyHistory: {
    alignItems: 'center',
    paddingVertical: DesignTokens.spacing.xl,
  },
  emptyHistoryText: {
    color: DesignTokens.colors.textSecondary,
  },
  historyItem: {
    padding: DesignTokens.spacing.md,
    backgroundColor: DesignTokens.colors.surface,
    borderRadius: DesignTokens.borderRadius.md,
    marginBottom: DesignTokens.spacing.sm,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: DesignTokens.spacing.sm,
  },
  historyDate: {
    color: DesignTokens.colors.textPrimary,
    fontWeight: '600',
  },
  historyUser: {
    color: DesignTokens.colors.textSecondary,
  },
  historyChanges: {
    marginBottom: DesignTokens.spacing.sm,
  },
  historyChange: {
    color: DesignTokens.colors.textPrimary,
    marginBottom: DesignTokens.spacing.xs,
  },
  historyReason: {
    color: DesignTokens.colors.textSecondary,
    fontStyle: 'italic',
  },
});