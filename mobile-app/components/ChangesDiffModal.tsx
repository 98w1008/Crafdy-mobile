/**
 * 変更差分表示モーダルコンポーネント
 * Before/After比較とハイライト表示機能
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Dimensions
} from 'react-native';
import { DesignTokens, Colors } from '../constants/DesignTokens';
import { StyledText } from './ui/StyledText';
import { StyledButton } from './ui/StyledButton';
import {
  AuditLogEntry,
  FieldChange,
  DiffDisplayProps
} from '../types/audit-log';

// =============================================================================
// 個別差分表示コンポーネント
// =============================================================================

const DiffDisplay: React.FC<DiffDisplayProps> = ({
  before,
  after,
  fieldName,
  changeType
}) => {
  const formatValue = (value: unknown): string => {
    if (value === null || value === undefined) {
      return '(未設定)';
    }
    if (typeof value === 'boolean') {
      return value ? 'はい' : 'いいえ';
    }
    if (typeof value === 'object') {
      return JSON.stringify(value, null, 2);
    }
    return String(value);
  };

  const getFieldDisplayName = (field: string): string => {
    const fieldMap: Record<string, string> = {
      // 共通フィールド
      name: '名前',
      description: '説明',
      status: 'ステータス',
      amount: '金額',
      quantity: '数量',
      date: '日付',
      created_at: '作成日',
      updated_at: '更新日',
      
      // レポート固有
      report_type: 'レポートタイプ',
      work_hours: '作業時間',
      materials_used: '使用材料',
      progress_percentage: '進捗率',
      
      // 請求書固有
      invoice_number: '請求書番号',
      due_date: '支払期限',
      tax_amount: '税額',
      total_amount: '合計金額',
      
      // レシート固有
      receipt_number: 'レシート番号',
      merchant_name: '店舗名',
      category: 'カテゴリ',
      
      // プロジェクト固有
      project_name: 'プロジェクト名',
      start_date: '開始日',
      end_date: '終了日',
      client_name: '顧客名',
    };
    return fieldMap[field] || field;
  };

  const getChangeTypeColor = (type: FieldChange['type']): string => {
    switch (type) {
      case 'added':
        return Colors.success;
      case 'modified':
        return Colors.info;
      case 'removed':
        return Colors.error;
      default:
        return Colors.textSecondary;
    }
  };

  const getChangeTypeLabel = (type: FieldChange['type']): string => {
    switch (type) {
      case 'added':
        return '追加';
      case 'modified':
        return '変更';
      case 'removed':
        return '削除';
      default:
        return '変更';
    }
  };

  const beforeValue = formatValue(before);
  const afterValue = formatValue(after);

  return (
    <View style={styles.diffContainer}>
      {/* フィールド名とタイプ */}
      <View style={styles.diffHeader}>
        <StyledText variant="subtitle" style={styles.fieldName}>
          {getFieldDisplayName(fieldName)}
        </StyledText>
        <View style={[
          styles.changeTypeTag,
          { backgroundColor: getChangeTypeColor(changeType) + '20' }
        ]}>
          <Text style={[
            styles.changeTypeText,
            { color: getChangeTypeColor(changeType) }
          ]}>
            {getChangeTypeLabel(changeType)}
          </Text>
        </View>
      </View>

      {/* Before/After表示 */}
      <View style={styles.diffContent}>
        {/* Before値 */}
        {changeType !== 'added' && (
          <View style={styles.valueContainer}>
            <StyledText variant="caption" style={styles.valueLabel}>
              変更前
            </StyledText>
            <View style={[styles.valueBox, styles.beforeBox]}>
              <StyledText variant="body" style={styles.beforeText}>
                {beforeValue}
              </StyledText>
            </View>
          </View>
        )}

        {/* 矢印 */}
        {changeType === 'modified' && (
          <View style={styles.arrowContainer}>
            <Text style={styles.arrow}>→</Text>
          </View>
        )}

        {/* After値 */}
        {changeType !== 'removed' && (
          <View style={styles.valueContainer}>
            <StyledText variant="caption" style={styles.valueLabel}>
              {changeType === 'added' ? '追加値' : '変更後'}
            </StyledText>
            <View style={[styles.valueBox, styles.afterBox]}>
              <StyledText variant="body" style={styles.afterText}>
                {afterValue}
              </StyledText>
            </View>
          </View>
        )}
      </View>
    </View>
  );
};

// =============================================================================
// メイン差分モーダルコンポーネント
// =============================================================================

interface ChangesDiffModalProps {
  visible: boolean;
  auditLog: AuditLogEntry | null;
  onClose: () => void;
}

export const ChangesDiffModal: React.FC<ChangesDiffModalProps> = ({
  visible,
  auditLog,
  onClose
}) => {
  const [selectedTab, setSelectedTab] = useState<'all' | 'added' | 'modified' | 'removed'>('all');

  // 変更内容のフィルタリング
  const filteredChanges = useMemo(() => {
    if (!auditLog?.changes) return [];

    if (selectedTab === 'all') {
      return auditLog.changes;
    }

    return auditLog.changes.filter(change => change.type === selectedTab);
  }, [auditLog?.changes, selectedTab]);

  // 統計情報の計算
  const changeStats = useMemo(() => {
    if (!auditLog?.changes) {
      return { added: 0, modified: 0, removed: 0, total: 0 };
    }

    const stats = auditLog.changes.reduce(
      (acc, change) => {
        acc[change.type]++;
        acc.total++;
        return acc;
      },
      { added: 0, modified: 0, removed: 0, total: 0 }
    );

    return stats;
  }, [auditLog?.changes]);

  // アクション名の表示形式
  const getActionDisplayName = (action: string): string => {
    const actionMap: Record<string, string> = {
      create: '作成',
      update: '更新',
      delete: '削除',
      view: '閲覧',
      approve: '承認',
      reject: '却下',
      submit: '提出',
      export: 'エクスポート'
    };
    return actionMap[action] || action;
  };

  if (!auditLog) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.modalContainer}>
        {/* ヘッダー */}
        <View style={styles.modalHeader}>
          <View style={styles.modalTitleContainer}>
            <StyledText variant="title" style={styles.modalTitle}>
              変更差分表示
            </StyledText>
            <StyledText variant="caption" style={styles.modalSubtitle}>
              {getActionDisplayName(auditLog.action)} • {auditLog.actor_name}
            </StyledText>
          </View>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            accessibilityLabel="閉じる"
          >
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* 統計情報 */}
        <View style={styles.statsContainer}>
          <StyledText variant="body" style={styles.statsTitle}>
            変更サマリー ({changeStats.total}件)
          </StyledText>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: Colors.success }]}>
                {changeStats.added}
              </Text>
              <StyledText variant="caption" style={styles.statLabel}>
                追加
              </StyledText>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: Colors.info }]}>
                {changeStats.modified}
              </Text>
              <StyledText variant="caption" style={styles.statLabel}>
                変更
              </StyledText>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: Colors.error }]}>
                {changeStats.removed}
              </Text>
              <StyledText variant="caption" style={styles.statLabel}>
                削除
              </StyledText>
            </View>
          </View>
        </View>

        {/* フィルタータブ */}
        <View style={styles.tabContainer}>
          {[
            { key: 'all' as const, label: 'すべて', count: changeStats.total },
            { key: 'added' as const, label: '追加', count: changeStats.added },
            { key: 'modified' as const, label: '変更', count: changeStats.modified },
            { key: 'removed' as const, label: '削除', count: changeStats.removed },
          ].map(tab => (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.tab,
                selectedTab === tab.key && styles.activeTab
              ]}
              onPress={() => setSelectedTab(tab.key)}
              disabled={tab.count === 0}
              accessibilityLabel={`${tab.label}タブ`}
            >
              <StyledText
                variant="caption"
                style={[
                  styles.tabText,
                  selectedTab === tab.key && styles.activeTabText,
                  tab.count === 0 && styles.disabledTabText
                ]}
              >
                {tab.label} ({tab.count})
              </StyledText>
            </TouchableOpacity>
          ))}
        </View>

        {/* 差分リスト */}
        <ScrollView style={styles.diffsContainer} showsVerticalScrollIndicator={false}>
          {filteredChanges.length > 0 ? (
            filteredChanges.map((change, index) => (
              <DiffDisplay
                key={`${change.field}-${index}`}
                before={change.before}
                after={change.after}
                fieldName={change.field}
                changeType={change.type}
              />
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>📝</Text>
              <StyledText variant="body" style={styles.emptyText}>
                {selectedTab === 'all' 
                  ? '変更内容がありません'
                  : `${selectedTab === 'added' ? '追加' : selectedTab === 'modified' ? '変更' : '削除'}された項目がありません`
                }
              </StyledText>
            </View>
          )}
        </ScrollView>

        {/* フッター */}
        <View style={styles.modalFooter}>
          <StyledButton
            title="閉じる"
            onPress={onClose}
            variant="outline"
            style={styles.closeFooterButton}
          />
        </View>
      </SafeAreaView>
    </Modal>
  );
};

// =============================================================================
// スタイル定義
// =============================================================================

const { width: screenWidth } = Dimensions.get('window');

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: DesignTokens.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },

  modalTitleContainer: {
    flex: 1,
  },

  modalTitle: {
    color: Colors.text,
    fontWeight: DesignTokens.typography.weights.bold,
  },

  modalSubtitle: {
    color: Colors.textSecondary,
    marginTop: DesignTokens.spacing.xs,
  },

  closeButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.interactive,
    borderRadius: DesignTokens.borderRadius.full,
  },

  closeButtonText: {
    fontSize: 16,
    color: Colors.textSecondary,
    fontWeight: DesignTokens.typography.weights.bold,
  },

  statsContainer: {
    padding: DesignTokens.spacing.lg,
    backgroundColor: Colors.backgroundSecondary,
  },

  statsTitle: {
    color: Colors.text,
    marginBottom: DesignTokens.spacing.sm,
    fontWeight: DesignTokens.typography.weights.medium,
  },

  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },

  statItem: {
    alignItems: 'center',
  },

  statNumber: {
    fontSize: DesignTokens.typography['2xl'],
    fontWeight: DesignTokens.typography.weights.bold,
  },

  statLabel: {
    color: Colors.textSecondary,
    marginTop: DesignTokens.spacing.xs,
  },

  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: DesignTokens.spacing.lg,
    paddingTop: DesignTokens.spacing.md,
  },

  tab: {
    flex: 1,
    paddingVertical: DesignTokens.spacing.sm,
    paddingHorizontal: DesignTokens.spacing.xs,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },

  activeTab: {
    borderBottomColor: Colors.primary,
  },

  tabText: {
    color: Colors.textTertiary,
    fontWeight: DesignTokens.typography.weights.medium,
  },

  activeTabText: {
    color: Colors.primary,
    fontWeight: DesignTokens.typography.weights.semibold,
  },

  disabledTabText: {
    opacity: 0.5,
  },

  diffsContainer: {
    flex: 1,
    paddingHorizontal: DesignTokens.spacing.lg,
    paddingTop: DesignTokens.spacing.md,
  },

  diffContainer: {
    backgroundColor: Colors.surface,
    borderRadius: DesignTokens.borderRadius.lg,
    padding: DesignTokens.spacing.md,
    marginBottom: DesignTokens.spacing.md,
    ...DesignTokens.shadows.sm,
  },

  diffHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: DesignTokens.spacing.sm,
  },

  fieldName: {
    flex: 1,
    color: Colors.text,
    fontWeight: DesignTokens.typography.weights.semibold,
  },

  changeTypeTag: {
    paddingHorizontal: DesignTokens.spacing.sm,
    paddingVertical: 4,
    borderRadius: DesignTokens.borderRadius.sm,
  },

  changeTypeText: {
    fontSize: DesignTokens.typography.xs,
    fontWeight: DesignTokens.typography.weights.medium,
  },

  diffContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  valueContainer: {
    flex: 1,
  },

  valueLabel: {
    color: Colors.textSecondary,
    marginBottom: DesignTokens.spacing.xs,
  },

  valueBox: {
    padding: DesignTokens.spacing.sm,
    borderRadius: DesignTokens.borderRadius.md,
    borderWidth: 1,
    minHeight: 40,
    justifyContent: 'center',
  },

  beforeBox: {
    backgroundColor: Colors.errorLight,
    borderColor: Colors.error + '40',
  },

  afterBox: {
    backgroundColor: Colors.successLight,
    borderColor: Colors.success + '40',
  },

  beforeText: {
    color: Colors.text,
  },

  afterText: {
    color: Colors.text,
  },

  arrowContainer: {
    paddingHorizontal: DesignTokens.spacing.sm,
    justifyContent: 'center',
  },

  arrow: {
    fontSize: 20,
    color: Colors.textSecondary,
  },

  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: DesignTokens.spacing['3xl'],
  },

  emptyIcon: {
    fontSize: 48,
    marginBottom: DesignTokens.spacing.md,
  },

  emptyText: {
    color: Colors.textSecondary,
    textAlign: 'center',
  },

  modalFooter: {
    padding: DesignTokens.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },

  closeFooterButton: {
    width: '100%',
  },
});

export default ChangesDiffModal;