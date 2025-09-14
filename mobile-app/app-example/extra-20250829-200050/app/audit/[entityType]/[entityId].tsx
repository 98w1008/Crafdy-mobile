/**
 * 監査ログ詳細画面
 * 特定エンティティの全監査ログを表示・フィルタリング・検索
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  Alert,
  TouchableOpacity,
  ScrollView
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { DesignTokens, Colors } from '../../../constants/DesignTokens';
import { StyledText, StyledButton, StyledInput } from '@/components/ui';
import AuditLogTimeline from '../../../components/AuditLogTimeline';
import ChangesDiffModal from '../../../components/ChangesDiffModal';
import {
  AuditLogEntry,
  AuditLogFilter,
  AuditLogStats,
  AuditEntityType,
  AuditActionType,
  FilterOption,
  ExportRequest,
  ExportFormat
} from '../../../types/audit-log';
import {
  getAuditLogStats,
  exportAuditLogs
} from '../../../lib/audit-log-api';

// =============================================================================
// フィルタリング・検索コンポーネント
// =============================================================================

interface AuditLogSearchProps {
  onFilterChange: (filter: AuditLogFilter) => void;
  currentFilter: AuditLogFilter;
  entityType: AuditEntityType;
  entityId: string;
}

const AuditLogSearch: React.FC<AuditLogSearchProps> = ({
  onFilterChange,
  currentFilter,
  entityType,
  entityId
}) => {
  const [searchQuery, setSearchQuery] = useState(currentFilter.search_query || '');
  const [selectedAction, setSelectedAction] = useState<AuditActionType | 'all'>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');

  const actionOptions: FilterOption[] = [
    { label: 'すべてのアクション', value: 'all' },
    { label: '作成', value: 'create' },
    { label: '更新', value: 'update' },
    { label: '削除', value: 'delete' },
    { label: '承認', value: 'approve' },
    { label: '却下', value: 'reject' },
    { label: '提出', value: 'submit' },
    { label: 'エクスポート', value: 'export' },
  ];

  const applyFilters = () => {
    const now = new Date();
    let dateFrom: string | undefined;

    switch (dateFilter) {
      case 'today':
        dateFrom = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
        break;
      case 'week':
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        dateFrom = weekAgo.toISOString();
        break;
      case 'month':
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        dateFrom = monthAgo.toISOString();
        break;
    }

    const newFilter: AuditLogFilter = {
      entity_type: entityType,
      entity_id: entityId,
      search_query: searchQuery.trim() || undefined,
      action: selectedAction === 'all' ? undefined : selectedAction as AuditActionType,
      date_from: dateFrom,
    };

    onFilterChange(newFilter);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedAction('all');
    setDateFilter('all');
    
    onFilterChange({
      entity_type: entityType,
      entity_id: entityId,
    });
  };

  return (
    <View style={styles.searchContainer}>
      {/* 検索入力 */}
      <StyledInput
        placeholder="説明や実行者で検索..."
        value={searchQuery}
        onChangeText={setSearchQuery}
        onSubmitEditing={applyFilters}
        returnKeyType="search"
        style={styles.searchInput}
      />

      {/* フィルターボタン */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
        {/* アクションフィルター */}
        <View style={styles.filterGroup}>
          <StyledText variant="caption" style={styles.filterLabel}>
            アクション
          </StyledText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.filterButtonRow}>
              {actionOptions.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.filterButton,
                    selectedAction === option.value && styles.activeFilterButton
                  ]}
                  onPress={() => setSelectedAction(option.value as AuditActionType | 'all')}
                >
                  <StyledText
                    variant="caption"
                    style={[
                      styles.filterButtonText,
                      selectedAction === option.value && styles.activeFilterButtonText
                    ]}
                  >
                    {option.label}
                  </StyledText>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* 期間フィルター */}
        <View style={styles.filterGroup}>
          <StyledText variant="caption" style={styles.filterLabel}>
            期間
          </StyledText>
          <View style={styles.filterButtonRow}>
            {[
              { label: 'すべて', value: 'all' },
              { label: '今日', value: 'today' },
              { label: '1週間', value: 'week' },
              { label: '1ヶ月', value: 'month' },
            ].map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.filterButton,
                  dateFilter === option.value && styles.activeFilterButton
                ]}
                onPress={() => setDateFilter(option.value as any)}
              >
                <StyledText
                  variant="caption"
                  style={[
                    styles.filterButtonText,
                    dateFilter === option.value && styles.activeFilterButtonText
                  ]}
                >
                  {option.label}
                </StyledText>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* アクションボタン */}
      <View style={styles.searchActions}>
        <StyledButton
          title="フィルター適用"
          onPress={applyFilters}
          variant="primary"
          style={styles.applyButton}
        />
        <StyledButton
          title="クリア"
          onPress={clearFilters}
          variant="outline"
          style={styles.clearButton}
        />
      </View>
    </View>
  );
};

// =============================================================================
// メイン監査ログ詳細画面コンポーネント
// =============================================================================

export default function AuditLogDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    entityType: AuditEntityType;
    entityId: string;
  }>();

  const [filter, setFilter] = useState<AuditLogFilter>({
    entity_type: params.entityType,
    entity_id: params.entityId,
  });
  const [stats, setStats] = useState<AuditLogStats | null>(null);
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);
  const [showDiffModal, setShowDiffModal] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [exporting, setExporting] = useState(false);

  // 統計情報の取得
  useEffect(() => {
    const loadStats = async () => {
      try {
        const statsData = await getAuditLogStats(filter);
        setStats(statsData);
      } catch (error) {
        console.error('統計情報取得エラー:', error);
      }
    };

    loadStats();
  }, [filter]);

  // エンティティタイプの表示名
  const getEntityTypeName = (entityType: AuditEntityType): string => {
    const nameMap: Record<AuditEntityType, string> = {
      reports: 'レポート',
      receipts: 'レシート',
      invoices: '請求書',
      projects: 'プロジェクト',
      users: 'ユーザー',
      estimates: '見積もり',
    };
    return nameMap[entityType] || entityType;
  };

  // 差分表示ハンドラー
  const handleViewDiff = (log: AuditLogEntry) => {
    setSelectedLog(log);
    setShowDiffModal(true);
  };

  // エクスポートハンドラー
  const handleExport = async (format: ExportFormat) => {
    try {
      setExporting(true);
      
      const request: ExportRequest = {
        filter,
        format,
        include_details: true,
      };

      const data = await exportAuditLogs(request);
      
      // TODO: 実際のファイルダウンロードまたは共有機能を実装
      Alert.alert(
        'エクスポート完了',
        `${format.toUpperCase()}形式でエクスポートしました。`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('エクスポートエラー:', error);
      Alert.alert(
        'エラー',
        'エクスポートに失敗しました。'
      );
    } finally {
      setExporting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen
        options={{
          title: `${getEntityTypeName(params.entityType)}の変更履歴`,
          headerRight: () => (
            <View style={styles.headerActions}>
              <TouchableOpacity
                style={styles.headerButton}
                onPress={() => setShowSearch(!showSearch)}
                accessibilityLabel="検索・フィルター"
              >
                <StyledText style={styles.headerButtonText}>🔍</StyledText>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.headerButton}
                onPress={() => handleExport('csv')}
                disabled={exporting}
                accessibilityLabel="CSVエクスポート"
              >
                <StyledText style={styles.headerButtonText}>📊</StyledText>
              </TouchableOpacity>
            </View>
          ),
        }}
      />

      {/* 統計情報 */}
      {stats && (
        <View style={styles.statsContainer}>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <StyledText variant="title" style={styles.statNumber}>
                {stats.total_entries}
              </StyledText>
              <StyledText variant="caption" style={styles.statLabel}>
                総ログ数
              </StyledText>
            </View>
            <View style={styles.statCard}>
              <StyledText variant="title" style={styles.statNumber}>
                {stats.unique_actors}
              </StyledText>
              <StyledText variant="caption" style={styles.statLabel}>
                実行者数
              </StyledText>
            </View>
            <View style={styles.statCard}>
              <StyledText variant="body" style={styles.statAction}>
                {stats.most_common_action}
              </StyledText>
              <StyledText variant="caption" style={styles.statLabel}>
                最多アクション
              </StyledText>
            </View>
          </View>
        </View>
      )}

      {/* 検索・フィルターパネル */}
      {showSearch && (
        <AuditLogSearch
          entityType={params.entityType}
          entityId={params.entityId}
          currentFilter={filter}
          onFilterChange={setFilter}
        />
      )}

      {/* タイムライン */}
      <View style={styles.timelineContainer}>
        <AuditLogTimeline
          entityType={params.entityType}
          entityId={params.entityId}
          filter={filter}
          onViewDiff={handleViewDiff}
          maxHeight={showSearch ? 400 : 600}
        />
      </View>

      {/* 差分表示モーダル */}
      <ChangesDiffModal
        visible={showDiffModal}
        auditLog={selectedLog}
        onClose={() => {
          setShowDiffModal(false);
          setSelectedLog(null);
        }}
      />
    </SafeAreaView>
  );
}

// =============================================================================
// スタイル定義
// =============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: DesignTokens.spacing.sm,
  },

  headerButton: {
    padding: DesignTokens.spacing.xs,
    borderRadius: DesignTokens.borderRadius.sm,
    backgroundColor: Colors.interactive,
  },

  headerButtonText: {
    fontSize: 16,
  },

  statsContainer: {
    padding: DesignTokens.spacing.md,
    backgroundColor: Colors.backgroundSecondary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },

  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },

  statCard: {
    alignItems: 'center',
    flex: 1,
  },

  statNumber: {
    color: Colors.primary,
    fontWeight: DesignTokens.typography.weights.bold,
  },

  statAction: {
    color: Colors.text,
    fontWeight: DesignTokens.typography.weights.semibold,
  },

  statLabel: {
    color: Colors.textSecondary,
    marginTop: DesignTokens.spacing.xs,
  },

  searchContainer: {
    padding: DesignTokens.spacing.md,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },

  searchInput: {
    marginBottom: DesignTokens.spacing.sm,
  },

  filterRow: {
    marginBottom: DesignTokens.spacing.sm,
  },

  filterGroup: {
    marginRight: DesignTokens.spacing.lg,
  },

  filterLabel: {
    color: Colors.textSecondary,
    marginBottom: DesignTokens.spacing.xs,
  },

  filterButtonRow: {
    flexDirection: 'row',
    gap: DesignTokens.spacing.xs,
  },

  filterButton: {
    paddingHorizontal: DesignTokens.spacing.sm,
    paddingVertical: DesignTokens.spacing.xs,
    borderRadius: DesignTokens.borderRadius.md,
    backgroundColor: Colors.interactive,
    borderWidth: 1,
    borderColor: Colors.border,
  },

  activeFilterButton: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },

  filterButtonText: {
    color: Colors.textSecondary,
  },

  activeFilterButtonText: {
    color: Colors.textOnPrimary,
  },

  searchActions: {
    flexDirection: 'row',
    gap: DesignTokens.spacing.sm,
  },

  applyButton: {
    flex: 1,
  },

  clearButton: {
    flex: 1,
  },

  timelineContainer: {
    flex: 1,
  },
});