/**
 * 監査ログ検索・フィルタリングコンポーネント
 * 高度な検索とフィルタリング機能を提供
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  Modal,
  SafeAreaView,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DateTimeField } from '../util/datetime';
import { DesignTokens, Colors } from '../constants/DesignTokens';
import { StyledText } from './ui/StyledText';
import { StyledInput } from './ui/StyledInput';
import { StyledButton } from './ui/StyledButton';
import {
  AuditLogFilter,
  AuditActionType,
  AuditEntityType,
  FilterOption,
  AuditLogSearchProps
} from '../types/audit-log';

// =============================================================================
// 日付範囲選択コンポーネント
// =============================================================================

interface DateRangePickerProps {
  startDate?: string;
  endDate?: string;
  onDateChange: (start?: string, end?: string) => void;
}

const DateRangePicker: React.FC<DateRangePickerProps> = ({
  startDate,
  endDate,
  onDateChange
}) => {
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  const formatDate = (dateString?: string): string => {
    if (!dateString) return '選択してください';
    const date = new Date(dateString);
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  const handleStartDateChange = (selectedDate: Date) => {
    setShowStartPicker(false);
    const dateString = selectedDate.toISOString().split('T')[0];
    onDateChange(dateString, endDate);
  };

  const handleEndDateChange = (selectedDate: Date) => {
    setShowEndPicker(false);
    const dateString = selectedDate.toISOString().split('T')[0];
    onDateChange(startDate, dateString);
  };

  return (
    <View style={styles.dateRangeContainer}>
      <StyledText variant="caption" style={styles.dateRangeLabel}>
        期間選択
      </StyledText>
      
      <View style={styles.dateRangeRow}>
        <TouchableOpacity
          style={styles.dateButton}
          onPress={() => setShowStartPicker(true)}
        >
          <StyledText variant="body" style={styles.dateButtonText}>
            {formatDate(startDate)}
          </StyledText>
          <Ionicons name="calendar-outline" size={20} color={Colors.textSecondary} />
        </TouchableOpacity>

        <StyledText variant="body" style={styles.dateSeparator}>
          〜
        </StyledText>

        <TouchableOpacity
          style={styles.dateButton}
          onPress={() => setShowEndPicker(true)}
        >
          <StyledText variant="body" style={styles.dateButtonText}>
            {formatDate(endDate)}
          </StyledText>
          <Ionicons name="calendar-outline" size={20} color={Colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* クイック選択ボタン */}
      <View style={styles.quickDateButtons}>
        {[
          { label: '今日', days: 0 },
          { label: '1週間', days: 7 },
          { label: '1ヶ月', days: 30 },
          { label: '3ヶ月', days: 90 },
        ].map((option) => (
          <TouchableOpacity
            key={option.label}
            style={styles.quickDateButton}
            onPress={() => {
              const end = new Date().toISOString().split('T')[0];
              const start = new Date(Date.now() - option.days * 24 * 60 * 60 * 1000)
                .toISOString().split('T')[0];
              onDateChange(start, end);
            }}
          >
            <StyledText variant="caption" style={styles.quickDateButtonText}>
              {option.label}
            </StyledText>
          </TouchableOpacity>
        ))}
      </View>

      {/* 日付選択ピッカー */}
      {showStartPicker && (
        <DateTimeField
          value={startDate ? new Date(startDate) : new Date()}
          mode="date"
          onChange={handleStartDateChange}
        />
      )}

      {showEndPicker && (
        <DateTimeField
          value={endDate ? new Date(endDate) : new Date()}
          mode="date"
          onChange={handleEndDateChange}
        />
      )}
    </View>
  );
};

// =============================================================================
// メイン検索コンポーネント
// =============================================================================

export const AuditLogSearch: React.FC<AuditLogSearchProps> = ({
  onFilterChange,
  currentFilter,
  entityTypes,
  actions,
  isLoading = false
}) => {
  const [localFilter, setLocalFilter] = useState<AuditLogFilter>(currentFilter);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);

  // 検索クエリの状態
  const [searchQuery, setSearchQuery] = useState(currentFilter.search_query || '');

  // フィルターの同期
  useEffect(() => {
    setLocalFilter(currentFilter);
    setSearchQuery(currentFilter.search_query || '');
  }, [currentFilter]);

  // フィルター適用
  const applyFilters = useCallback(() => {
    const trimmedQuery = searchQuery.trim();
    const newFilter: AuditLogFilter = {
      ...localFilter,
      search_query: trimmedQuery || undefined,
    };
    onFilterChange(newFilter);
    setIsModalVisible(false);
  }, [localFilter, searchQuery, onFilterChange]);

  // フィルタークリア
  const clearFilters = useCallback(() => {
    const clearedFilter: AuditLogFilter = {
      entity_type: currentFilter.entity_type,
      entity_id: currentFilter.entity_id,
    };
    setLocalFilter(clearedFilter);
    setSearchQuery('');
    onFilterChange(clearedFilter);
    setIsModalVisible(false);
  }, [currentFilter.entity_type, currentFilter.entity_id, onFilterChange]);

  // アクティブなフィルター数を計算
  const activeFiltersCount = Object.keys(localFilter).filter(key => {
    const value = localFilter[key as keyof AuditLogFilter];
    return value !== undefined && key !== 'entity_type' && key !== 'entity_id';
  }).length;

  // 基本検索バー
  const renderBasicSearch = () => (
    <View style={styles.basicSearchContainer}>
      <StyledInput
        placeholder="説明や実行者で検索..."
        value={searchQuery}
        onChangeText={setSearchQuery}
        onSubmitEditing={applyFilters}
        returnKeyType="search"
        style={styles.searchInput}
        leftIcon="search"
      />
      
      <TouchableOpacity
        style={[
          styles.advancedButton,
          activeFiltersCount > 0 && styles.advancedButtonActive
        ]}
        onPress={() => setIsModalVisible(true)}
        accessibilityLabel="高度な検索"
      >
        <Ionicons 
          name="options" 
          size={20} 
          color={activeFiltersCount > 0 ? Colors.primary : Colors.textSecondary} 
        />
        {activeFiltersCount > 0 && (
          <View style={styles.filterBadge}>
            <Text style={styles.filterBadgeText}>{activeFiltersCount}</Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );

  // 高度な検索モーダル
  const renderAdvancedModal = () => (
    <Modal
      visible={isModalVisible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setIsModalVisible(false)}
    >
      <SafeAreaView style={styles.modalContainer}>
        {/* モーダルヘッダー */}
        <View style={styles.modalHeader}>
          <StyledText variant="title" style={styles.modalTitle}>
            高度な検索
          </StyledText>
          <TouchableOpacity
            style={styles.modalCloseButton}
            onPress={() => setIsModalVisible(false)}
          >
            <Ionicons name="close" size={24} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
          {/* 検索クエリ */}
          <View style={styles.modalSection}>
            <StyledText variant="subtitle" style={styles.sectionTitle}>
              キーワード検索
            </StyledText>
            <StyledInput
              placeholder="説明、実行者名、メールアドレスで検索"
              value={searchQuery}
              onChangeText={setSearchQuery}
              style={styles.modalSearchInput}
            />
          </View>

          {/* アクションフィルター */}
          <View style={styles.modalSection}>
            <StyledText variant="subtitle" style={styles.sectionTitle}>
              アクション
            </StyledText>
            <View style={styles.actionGrid}>
              {actions.map((action) => (
                <TouchableOpacity
                  key={action.value}
                  style={[
                    styles.actionChip,
                    localFilter.action === action.value && styles.actionChipActive
                  ]}
                  onPress={() => {
                    setLocalFilter(prev => ({
                      ...prev,
                      action: prev.action === action.value 
                        ? undefined 
                        : action.value as AuditActionType
                    }));
                  }}
                >
                  <StyledText
                    variant="caption"
                    style={[
                      styles.actionChipText,
                      localFilter.action === action.value && styles.actionChipTextActive
                    ]}
                  >
                    {action.label}
                  </StyledText>
                  {action.count !== undefined && (
                    <Text style={[
                      styles.actionChipCount,
                      localFilter.action === action.value && styles.actionChipCountActive
                    ]}>
                      ({action.count})
                    </Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* 日付範囲 */}
          <View style={styles.modalSection}>
            <DateRangePicker
              startDate={localFilter.date_from}
              endDate={localFilter.date_to}
              onDateChange={(start, end) => {
                setLocalFilter(prev => ({
                  ...prev,
                  date_from: start,
                  date_to: end
                }));
              }}
            />
          </View>

          {/* 実行者フィルター */}
          <View style={styles.modalSection}>
            <StyledText variant="subtitle" style={styles.sectionTitle}>
              実行者
            </StyledText>
            <StyledInput
              placeholder="特定の実行者でフィルタ (ユーザーID)"
              value={localFilter.actor_id || ''}
              onChangeText={(text) => {
                setLocalFilter(prev => ({
                  ...prev,
                  actor_id: text.trim() || undefined
                }));
              }}
            />
          </View>
        </ScrollView>

        {/* モーダルフッター */}
        <View style={styles.modalFooter}>
          <View style={styles.modalFooterButtons}>
            <StyledButton
              title="クリア"
              variant="outline"
              onPress={clearFilters}
              style={styles.clearButton}
            />
            <StyledButton
              title={`検索${activeFiltersCount > 0 ? ` (${activeFiltersCount})` : ''}`}
              variant="primary"
              onPress={applyFilters}
              loading={isLoading}
              style={styles.searchButton}
            />
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );

  return (
    <View style={styles.container}>
      {renderBasicSearch()}
      {renderAdvancedModal()}
    </View>
  );
};

// =============================================================================
// スタイル定義
// =============================================================================

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
  },

  // 基本検索
  basicSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: DesignTokens.spacing.md,
    gap: DesignTokens.spacing.sm,
  },

  searchInput: {
    flex: 1,
  },

  advancedButton: {
    width: 44,
    height: 44,
    borderRadius: DesignTokens.borderRadius.lg,
    backgroundColor: Colors.interactive,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },

  advancedButtonActive: {
    backgroundColor: Colors.primaryLight,
  },

  filterBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: Colors.primary,
    borderRadius: DesignTokens.borderRadius.full,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },

  filterBadgeText: {
    fontSize: 10,
    fontWeight: DesignTokens.typography.weights.bold,
    color: Colors.textOnPrimary,
  },

  // モーダル
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: DesignTokens.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },

  modalTitle: {
    color: Colors.text,
    fontWeight: DesignTokens.typography.weights.bold,
  },

  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: DesignTokens.borderRadius.full,
    backgroundColor: Colors.interactive,
    justifyContent: 'center',
    alignItems: 'center',
  },

  modalContent: {
    flex: 1,
    padding: DesignTokens.spacing.lg,
  },

  modalSection: {
    marginBottom: DesignTokens.spacing.xl,
  },

  sectionTitle: {
    color: Colors.text,
    marginBottom: DesignTokens.spacing.md,
    fontWeight: DesignTokens.typography.weights.semibold,
  },

  modalSearchInput: {
    marginBottom: DesignTokens.spacing.sm,
  },

  // アクションフィルター
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: DesignTokens.spacing.sm,
  },

  actionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: DesignTokens.spacing.md,
    paddingVertical: DesignTokens.spacing.sm,
    borderRadius: DesignTokens.borderRadius.md,
    backgroundColor: Colors.interactive,
    borderWidth: 1,
    borderColor: Colors.border,
  },

  actionChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },

  actionChipText: {
    color: Colors.textSecondary,
    marginRight: DesignTokens.spacing.xs,
  },

  actionChipTextActive: {
    color: Colors.textOnPrimary,
  },

  actionChipCount: {
    fontSize: DesignTokens.typography.xs,
    color: Colors.textTertiary,
  },

  actionChipCountActive: {
    color: Colors.textOnPrimary,
    opacity: 0.8,
  },

  // 日付範囲
  dateRangeContainer: {
    marginBottom: DesignTokens.spacing.md,
  },

  dateRangeLabel: {
    color: Colors.textSecondary,
    marginBottom: DesignTokens.spacing.sm,
  },

  dateRangeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: DesignTokens.spacing.sm,
    marginBottom: DesignTokens.spacing.sm,
  },

  dateButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: DesignTokens.spacing.md,
    borderRadius: DesignTokens.borderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },

  dateButtonText: {
    color: Colors.text,
  },

  dateSeparator: {
    color: Colors.textSecondary,
    paddingHorizontal: DesignTokens.spacing.xs,
  },

  quickDateButtons: {
    flexDirection: 'row',
    gap: DesignTokens.spacing.xs,
    flexWrap: 'wrap',
  },

  quickDateButton: {
    paddingHorizontal: DesignTokens.spacing.sm,
    paddingVertical: DesignTokens.spacing.xs,
    borderRadius: DesignTokens.borderRadius.sm,
    backgroundColor: Colors.interactive,
  },

  quickDateButtonText: {
    color: Colors.primary,
    fontWeight: DesignTokens.typography.weights.medium,
  },

  // モーダルフッター
  modalFooter: {
    padding: DesignTokens.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },

  modalFooterButtons: {
    flexDirection: 'row',
    gap: DesignTokens.spacing.md,
  },

  clearButton: {
    flex: 1,
  },

  searchButton: {
    flex: 2,
  },
});

export default AuditLogSearch;