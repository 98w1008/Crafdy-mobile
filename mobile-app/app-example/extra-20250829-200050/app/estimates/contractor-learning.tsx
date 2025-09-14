/**
 * 元請け学習ダッシュボード画面
 * 元請け別のパフォーマンス統計とML分析結果を表示
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  View, 
  StyleSheet, 
  ScrollView, 
  RefreshControl, 
  TouchableOpacity,
  Alert,
  Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { StyledText } from '../../components/ui/StyledText';
import { StyledInput } from '../../components/ui/StyledInput';
import { StyledButton } from '../../components/ui/StyledButton';
import { Icon } from '../../components/ui/Icon';
import { ContractorStatsCard } from '../../components/estimates/ContractorStatsCard';
import { AdjustmentChart } from '../../components/estimates/AdjustmentChart';
import { CoefficientEditor } from '../../components/estimates/CoefficientEditor';
import { ContractorMLEngine } from '../../lib/ml-engine/contractorAnalysis';
import { SeasonalAdjustmentEngine } from '../../lib/ml-engine/seasonalAdjustment';
import {
  ContractorStats,
  MLAnalysisResult,
  EstimateLearningData,
  ContractorCoefficient,
  ContractorTrendChartData,
  Season,
  MarketCondition,
  ProjectType,
  ContractorLearningResponse
} from '../../types/contractor';
import { DesignTokens } from '../../constants/DesignTokens';

export default function ContractorLearningScreen() {
  const [contractorStats, setContractorStats] = useState<ContractorStats[]>([]);
  const [mlAnalysisResults, setMlAnalysisResults] = useState<MLAnalysisResult[]>([]);
  const [selectedContractor, setSelectedContractor] = useState<string | null>(null);
  const [chartData, setChartData] = useState<{ [key: string]: ContractorTrendChartData }>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'win_rate' | 'submissions' | 'name'>('win_rate');
  const [filterType, setFilterType] = useState<'all' | 'high_risk' | 'recommended'>('all');
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingCoefficient, setEditingCoefficient] = useState<ContractorCoefficient | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [marketOverview, setMarketOverview] = useState({
    overall_win_rate: 0.45,
    market_condition: 'normal' as MarketCondition,
    seasonal_adjustment: 1.02
  });

  const mlEngine = useMemo(() => new ContractorMLEngine(), []);
  const seasonalEngine = useMemo(() => new SeasonalAdjustmentEngine(), []);

  /**
   * 初期データ読み込み
   */
  useEffect(() => {
    loadContractorData();
  }, []);

  /**
   * 元請けデータ読み込み
   */
  const loadContractorData = async () => {
    setIsLoading(true);
    try {
      // モックデータ生成（実際の実装ではSupabaseから取得）
      const mockLearningData = generateMockLearningData();
      const contractors = [...new Set(mockLearningData.map(d => d.contractor_name))];
      
      const stats: ContractorStats[] = [];
      const mlResults: MLAnalysisResult[] = [];
      const trends: { [key: string]: ContractorTrendChartData } = {};

      // 各元請けの分析実行
      for (const contractor of contractors) {
        try {
          const contractorData = mockLearningData.filter(d => d.contractor_name === contractor);
          const contractorStats = await mlEngine.analyzeContractorPerformance(contractor, contractorData);
          const mlAnalysis = await mlEngine.performMLAnalysis(contractor, contractorData);
          
          stats.push(contractorStats);
          mlResults.push(mlAnalysis);

          // チャート用データ生成
          trends[contractor] = generateMockTrendData(contractor);
        } catch (error) {
          console.warn(`Failed to analyze contractor ${contractor}:`, error);
        }
      }

      setContractorStats(stats);
      setMlAnalysisResults(mlResults);
      setChartData(trends);
    } catch (error) {
      console.error('Failed to load contractor data:', error);
      Alert.alert('データ読み込みエラー', '元請けデータの読み込みに失敗しました');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  /**
   * 検索・フィルタリング
   */
  const filteredStats = useMemo(() => {
    let filtered = contractorStats;

    // 検索フィルタ
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(stat => 
        stat.contractor_name.toLowerCase().includes(query)
      );
    }

    // タイプフィルタ
    if (filterType === 'high_risk') {
      const riskResults = mlAnalysisResults.filter(result => 
        result.risk_assessment.overall_risk === 'high'
      );
      const riskContractors = riskResults.map(r => r.contractor_name);
      filtered = filtered.filter(stat => riskContractors.includes(stat.contractor_name));
    } else if (filterType === 'recommended') {
      filtered = filtered.filter(stat => 
        stat.recommended_adjustments.confidence > 0.7
      );
    }

    // ソート
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'win_rate':
          return b.win_rate - a.win_rate;
        case 'submissions':
          return b.total_submissions - a.total_submissions;
        case 'name':
          return a.contractor_name.localeCompare(b.contractor_name);
        default:
          return 0;
      }
    });

    return filtered;
  }, [contractorStats, mlAnalysisResults, searchQuery, sortBy, filterType]);

  /**
   * 係数編集開始
   */
  const handleEditCoefficients = (contractorName: string) => {
    // 既存係数データを取得（モック）
    const mockCoefficient: ContractorCoefficient = {
      id: `coeff_${contractorName}`,
      contractor_name: contractorName,
      company_id: 'current_company',
      price_adjustment: 1.000,
      schedule_adjustment: 1.000,
      win_rate_historical: 0.45,
      recommended_adjustment: undefined,
      last_updated: new Date().toISOString(),
      notes: '',
      created_at: new Date().toISOString()
    };

    setEditingCoefficient(mockCoefficient);
    setShowEditModal(true);
  };

  /**
   * 係数保存
   */
  const handleSaveCoefficient = async (updatedData: Partial<ContractorCoefficient>) => {
    if (!editingCoefficient) return;

    try {
      // 実際の実装ではSupabaseに保存
      console.log('Saving coefficient:', { ...editingCoefficient, ...updatedData });
      
      Alert.alert('保存完了', '係数調整が保存されました');
      setShowEditModal(false);
      setEditingCoefficient(null);
      
      // データ再読み込み
      await loadContractorData();
    } catch (error) {
      throw error;
    }
  };

  /**
   * リフレッシュ処理
   */
  const handleRefresh = () => {
    setIsRefreshing(true);
    loadContractorData();
  };

  /**
   * 詳細画面遷移
   */
  const navigateToContractorDetail = (contractorName: string) => {
    router.push(`/estimates/coefficient-editor/${encodeURIComponent(contractorName)}`);
  };

  /**
   * フィルタチップコンポーネント
   */
  const FilterChip = ({ 
    label, 
    value, 
    isSelected, 
    onPress 
  }: { 
    label: string; 
    value: string; 
    isSelected: boolean; 
    onPress: () => void; 
  }) => (
    <TouchableOpacity
      style={[
        styles.filterChip,
        isSelected && styles.filterChipSelected
      ]}
      onPress={onPress}
    >
      <StyledText 
        variant="caption" 
        style={[
          styles.filterChipText,
          isSelected && styles.filterChipTextSelected
        ]}
      >
        {label}
      </StyledText>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* ヘッダー */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <StyledText variant="h1" style={styles.title}>
            元請け学習
          </StyledText>
          <TouchableOpacity 
            onPress={() => Alert.alert('設定', 'ML分析設定（開発中）')}
            style={styles.settingsButton}
          >
            <Icon name="settings" size={24} color={DesignTokens.colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* 市況サマリー */}
        <View style={styles.marketSummary}>
          <View style={styles.summaryItem}>
            <StyledText variant="caption" style={styles.summaryLabel}>
              全体受注率
            </StyledText>
            <StyledText variant="h3" style={styles.summaryValue}>
              {(marketOverview.overall_win_rate * 100).toFixed(1)}%
            </StyledText>
          </View>
          <View style={styles.summaryItem}>
            <StyledText variant="caption" style={styles.summaryLabel}>
              市況
            </StyledText>
            <StyledText variant="body" style={styles.summaryValue}>
              {marketOverview.market_condition === 'good' ? '好況' : 
               marketOverview.market_condition === 'poor' ? '不況' : '通常'}
            </StyledText>
          </View>
          <View style={styles.summaryItem}>
            <StyledText variant="caption" style={styles.summaryLabel}>
              季節調整
            </StyledText>
            <StyledText variant="body" style={styles.summaryValue}>
              {marketOverview.seasonal_adjustment.toFixed(2)}
            </StyledText>
          </View>
        </View>
      </View>

      {/* 検索・フィルタ */}
      <View style={styles.searchContainer}>
        <StyledInput
          placeholder="元請け名で検索..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={styles.searchInput}
          leftIcon="search"
        />
      </View>

      {/* フィルタチップ */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.filtersContainer}
        contentContainerStyle={styles.filtersContent}
      >
        <FilterChip
          label="全て"
          value="all"
          isSelected={filterType === 'all'}
          onPress={() => setFilterType('all')}
        />
        <FilterChip
          label="高リスク"
          value="high_risk"
          isSelected={filterType === 'high_risk'}
          onPress={() => setFilterType('high_risk')}
        />
        <FilterChip
          label="推奨調整あり"
          value="recommended"
          isSelected={filterType === 'recommended'}
          onPress={() => setFilterType('recommended')}
        />
      </ScrollView>

      {/* ソートボタン */}
      <View style={styles.sortContainer}>
        <StyledText variant="caption" style={styles.sortLabel}>
          並び順:
        </StyledText>
        <TouchableOpacity onPress={() => setSortBy('win_rate')}>
          <StyledText 
            variant="caption" 
            style={[
              styles.sortButton,
              sortBy === 'win_rate' && styles.sortButtonActive
            ]}
          >
            受注率
          </StyledText>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setSortBy('submissions')}>
          <StyledText 
            variant="caption" 
            style={[
              styles.sortButton,
              sortBy === 'submissions' && styles.sortButtonActive
            ]}
          >
            件数
          </StyledText>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setSortBy('name')}>
          <StyledText 
            variant="caption" 
            style={[
              styles.sortButton,
              sortBy === 'name' && styles.sortButtonActive
            ]}
          >
            名前
          </StyledText>
        </TouchableOpacity>
      </View>

      {/* 元請けリスト */}
      <ScrollView 
        style={styles.listContainer}
        refreshControl={
          <RefreshControl 
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={DesignTokens.colors.primary}
          />
        }
      >
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <StyledText variant="body" style={styles.loadingText}>
              データを読み込み中...
            </StyledText>
          </View>
        ) : filteredStats.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Icon name="analytics" size={64} color={DesignTokens.colors.textSecondary} />
            <StyledText variant="body" style={styles.emptyText}>
              {searchQuery ? '検索結果がありません' : '元請けデータがありません'}
            </StyledText>
          </View>
        ) : (
          filteredStats.map((stats) => {
            const mlResult = mlAnalysisResults.find(r => r.contractor_name === stats.contractor_name);
            return (
              <ContractorStatsCard
                key={stats.contractor_name}
                stats={stats}
                riskAssessment={mlResult?.risk_assessment}
                onPress={() => navigateToContractorDetail(stats.contractor_name)}
                onEditCoefficients={() => handleEditCoefficients(stats.contractor_name)}
                showTrend={true}
              />
            );
          })
        )}

        {/* チャート表示 */}
        {selectedContractor && chartData[selectedContractor] && (
          <AdjustmentChart
            contractorName={selectedContractor}
            trendData={chartData[selectedContractor]}
            seasonalPerformance={filteredStats.find(s => s.contractor_name === selectedContractor)?.seasonal_performance!}
            chartType="trend"
          />
        )}
      </ScrollView>

      {/* 係数編集モーダル */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        presentationStyle="formSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          {editingCoefficient && (
            <CoefficientEditor
              coefficient={editingCoefficient}
              recommendedAdjustments={
                filteredStats.find(s => s.contractor_name === editingCoefficient.contractor_name)
                  ?.recommended_adjustments
              }
              onSave={handleSaveCoefficient}
              onCancel={() => {
                setShowEditModal(false);
                setEditingCoefficient(null);
              }}
            />
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

/**
 * モック学習データ生成
 */
const generateMockLearningData = (): EstimateLearningData[] => {
  const contractors = ['田中建設', '山田工務店', '佐藤組', '鈴木建築', '高橋建設'];
  const projectTypes: ProjectType[] = ['renovation', 'new_construction', 'repair', 'maintenance'];
  const seasons: Season[] = ['spring', 'summer', 'autumn', 'winter'];
  const marketConditions: MarketCondition[] = ['good', 'normal', 'poor'];
  
  const data: EstimateLearningData[] = [];
  
  contractors.forEach(contractor => {
    for (let i = 0; i < 50; i++) {
      const submittedAmount = Math.random() * 10000000 + 1000000; // 100万〜1100万
      const winStatus = Math.random() < 0.45; // 45%の受注率
      const wonAmount = winStatus ? submittedAmount * (0.9 + Math.random() * 0.2) : undefined;
      
      data.push({
        id: `learning_${contractor}_${i}`,
        contractor_name: contractor,
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
};

/**
 * モックトレンドデータ生成
 */
const generateMockTrendData = (contractorName: string): ContractorTrendChartData => {
  const generateTrendPoints = (baseValue: number, volatility: number = 0.1) => {
    const points = [];
    let currentValue = baseValue;
    
    for (let i = 0; i < 12; i++) {
      currentValue += (Math.random() - 0.5) * volatility;
      currentValue = Math.max(0, Math.min(1, currentValue));
      
      points.push({
        date: new Date(Date.now() - (11 - i) * 30 * 24 * 60 * 60 * 1000).toISOString(),
        value: currentValue,
        label: `${i + 1}月`
      });
    }
    
    return points;
  };
  
  return {
    contractor_name: contractorName,
    win_rate_trend: generateTrendPoints(0.45, 0.15),
    price_adjustment_trend: generateTrendPoints(1.0, 0.05),
    market_correlation: generateTrendPoints(0.3, 0.2)
  };
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DesignTokens.colors.background,
  },
  header: {
    padding: DesignTokens.spacing.md,
    backgroundColor: DesignTokens.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: DesignTokens.colors.border,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: DesignTokens.spacing.md,
  },
  title: {
    color: DesignTokens.colors.textPrimary,
    fontWeight: '700',
  },
  settingsButton: {
    padding: DesignTokens.spacing.xs,
  },
  marketSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryItem: {
    alignItems: 'center',
    flex: 1,
  },
  summaryLabel: {
    color: DesignTokens.colors.textSecondary,
    marginBottom: DesignTokens.spacing.xs,
  },
  summaryValue: {
    color: DesignTokens.colors.textPrimary,
    fontWeight: '600',
  },
  searchContainer: {
    padding: DesignTokens.spacing.md,
  },
  searchInput: {
    fontSize: 16,
  },
  filtersContainer: {
    paddingHorizontal: DesignTokens.spacing.md,
    marginBottom: DesignTokens.spacing.sm,
  },
  filtersContent: {
    gap: DesignTokens.spacing.sm,
  },
  filterChip: {
    paddingVertical: DesignTokens.spacing.xs,
    paddingHorizontal: DesignTokens.spacing.sm,
    borderRadius: DesignTokens.borderRadius.full,
    backgroundColor: DesignTokens.colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: DesignTokens.colors.border,
  },
  filterChipSelected: {
    backgroundColor: DesignTokens.colors.primary,
    borderColor: DesignTokens.colors.primary,
  },
  filterChipText: {
    color: DesignTokens.colors.textSecondary,
    fontWeight: '500',
  },
  filterChipTextSelected: {
    color: DesignTokens.colors.white,
  },
  sortContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: DesignTokens.spacing.md,
    marginBottom: DesignTokens.spacing.sm,
    gap: DesignTokens.spacing.md,
  },
  sortLabel: {
    color: DesignTokens.colors.textSecondary,
  },
  sortButton: {
    color: DesignTokens.colors.textSecondary,
    fontWeight: '500',
  },
  sortButtonActive: {
    color: DesignTokens.colors.primary,
    fontWeight: '700',
  },
  listContainer: {
    flex: 1,
    paddingHorizontal: DesignTokens.spacing.md,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: DesignTokens.spacing.xl,
  },
  loadingText: {
    color: DesignTokens.colors.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: DesignTokens.spacing.xl,
  },
  emptyText: {
    color: DesignTokens.colors.textSecondary,
    marginTop: DesignTokens.spacing.md,
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: DesignTokens.colors.background,
  },
});