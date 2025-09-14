import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { StyledButton } from '@/components/ui';
import { Colors, Typography, Spacing, BorderRadius } from '@/constants/Colors';
import { getInvoices, getInvoiceStatistics, deleteInvoice } from '../../lib/invoice-api';
import type { Invoice, InvoiceFilters, ApprovalStatus } from '../../types/invoice';

/**
 * 請求書一覧画面
 * 
 * 機能:
 * - 請求書の一覧表示
 * - ステータス別フィルタリング
 * - 新規作成ボタン
 * - 個別請求書の編集・削除
 * - 統計情報の表示
 */
export default function InvoiceListScreen() {
  const router = useRouter();

  // 状態管理
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<ApprovalStatus | 'all'>('all');
  const [statistics, setStatistics] = useState({
    total_count: 0,
    draft_count: 0,
    submitted_count: 0,
    approved_count: 0,
    total_amount: 0,
    overdue_count: 0,
  });

  // 画面フォーカス時のデータ再読み込み
  useFocusEffect(
    useCallback(() => {
      loadInvoices();
      loadStatistics();
    }, [selectedFilter])
  );

  // 請求書一覧の読み込み
  const loadInvoices = async () => {
    try {
      const filters: InvoiceFilters = {};
      if (selectedFilter !== 'all') {
        filters.status = [selectedFilter];
      }

      const response = await getInvoices(filters);
      if (response.error) {
        Alert.alert('エラー', response.error);
        return;
      }

      setInvoices(response.data);
    } catch (error) {
      console.error('請求書一覧読み込みエラー:', error);
      Alert.alert('エラー', '請求書一覧の読み込みに失敗しました。');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  // 統計情報の読み込み
  const loadStatistics = async () => {
    try {
      const stats = await getInvoiceStatistics();
      setStatistics(stats);
    } catch (error) {
      console.error('統計情報読み込みエラー:', error);
    }
  };

  // プルリフレッシュ
  const handleRefresh = () => {
    setIsRefreshing(true);
    loadInvoices();
    loadStatistics();
  };

  // 請求書削除
  const handleDeleteInvoice = (invoice: Invoice) => {
    Alert.alert(
      '削除確認',
      `請求書「${invoice.customer_name || '無題'}」を削除しますか？`,
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除',
          style: 'destructive',
          onPress: async () => {
            const response = await deleteInvoice(invoice.id);
            if (response.error) {
              Alert.alert('エラー', response.error);
            } else {
              loadInvoices();
              loadStatistics();
            }
          },
        },
      ]
    );
  };

  // フィルターボタンのデータ
  const filterOptions = [
    { key: 'all', label: 'すべて', count: statistics.total_count },
    { key: 'draft', label: '下書き', count: statistics.draft_count },
    { key: 'submitted', label: '提出済み', count: statistics.submitted_count },
    { key: 'approved', label: '承認済み', count: statistics.approved_count },
  ];

  // 請求書アイテムのレンダリング
  const renderInvoiceItem = ({ item }: { item: Invoice }) => (
    <InvoiceListItem
      invoice={item}
      onEdit={() => router.push(`/invoice/${item.id}/edit`)}
      onDelete={() => handleDeleteInvoice(item)}
    />
  );

  return (
    <View style={styles.container}>
      {/* ヘッダー */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>請求書</Text>
        <TouchableOpacity
          onPress={() => router.push('/invoice/create')}
          style={styles.createButton}
        >
          <Ionicons name="add" size={24} color={Colors.text.onPrimary} />
        </TouchableOpacity>
      </View>

      {/* 統計情報 */}
      <View style={styles.statisticsContainer}>
        <View style={styles.statisticsItem}>
          <Text style={styles.statisticsValue}>¥{statistics.total_amount.toLocaleString()}</Text>
          <Text style={styles.statisticsLabel}>総請求額</Text>
        </View>
        <View style={styles.statisticsItem}>
          <Text style={styles.statisticsValue}>{statistics.total_count}</Text>
          <Text style={styles.statisticsLabel}>請求書数</Text>
        </View>
        {statistics.overdue_count > 0 && (
          <View style={styles.statisticsItem}>
            <Text style={[styles.statisticsValue, styles.overdueText]}>
              {statistics.overdue_count}
            </Text>
            <Text style={[styles.statisticsLabel, styles.overdueText]}>期限切れ</Text>
          </View>
        )}
      </View>

      {/* フィルターボタン */}
      <View style={styles.filterContainer}>
        {filterOptions.map((option) => (
          <TouchableOpacity
            key={option.key}
            onPress={() => setSelectedFilter(option.key as ApprovalStatus | 'all')}
            style={[
              styles.filterButton,
              selectedFilter === option.key && styles.filterButtonActive,
            ]}
          >
            <Text
              style={[
                styles.filterButtonText,
                selectedFilter === option.key && styles.filterButtonTextActive,
              ]}
            >
              {option.label} ({option.count})
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* 請求書一覧 */}
      <FlatList
        data={invoices}
        renderItem={renderInvoiceItem}
        keyExtractor={(item) => item.id}
        style={styles.list}
        contentContainerStyle={invoices.length === 0 ? styles.emptyContainer : undefined}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={
          !isLoading ? (
            <EmptyState
              filter={selectedFilter}
              onCreatePress={() => router.push('/invoice/create')}
            />
          ) : null
        }
      />
    </View>
  );
}

/**
 * 請求書アイテムコンポーネント
 */
interface InvoiceListItemProps {
  invoice: Invoice;
  onEdit: () => void;
  onDelete: () => void;
}

function InvoiceListItem({ invoice, onEdit, onDelete }: InvoiceListItemProps) {
  const getStatusColor = (status: ApprovalStatus) => {
    switch (status) {
      case 'draft':
        return Colors.text.tertiary;
      case 'submitted':
        return Colors.semantic.warning;
      case 'approved':
        return Colors.semantic.success;
      default:
        return Colors.text.secondary;
    }
  };

  const getStatusLabel = (status: ApprovalStatus) => {
    switch (status) {
      case 'draft':
        return '下書き';
      case 'submitted':
        return '提出済み';
      case 'approved':
        return '承認済み';
      default:
        return status;
    }
  };

  const isOverdue = () => {
    const today = new Date().toISOString().split('T')[0];
    return invoice.due_date < today && invoice.status !== 'approved';
  };

  return (
    <TouchableOpacity style={styles.invoiceItem} onPress={onEdit}>
      <View style={styles.invoiceItemHeader}>
        <View style={styles.invoiceItemInfo}>
          <Text style={styles.invoiceItemCustomer} numberOfLines={1}>
            {invoice.customer_name || '顧客名なし'}
          </Text>
          <View style={styles.invoiceItemMeta}>
            <Text
              style={[
                styles.invoiceItemStatus,
                { color: getStatusColor(invoice.status) },
              ]}
            >
              {getStatusLabel(invoice.status)}
            </Text>
            {isOverdue() && (
              <Text style={styles.overdueLabel}>期限切れ</Text>
            )}
          </View>
        </View>
        <TouchableOpacity onPress={onDelete} style={styles.deleteButton}>
          <Ionicons name="trash-outline" size={20} color={Colors.semantic.error} />
        </TouchableOpacity>
      </View>

      <View style={styles.invoiceItemDetails}>
        <Text style={styles.invoiceItemAmount}>¥{invoice.amount.toLocaleString()}</Text>
        <Text style={styles.invoiceItemDate}>
          発行: {formatDate(invoice.issued_date)} / 期限: {formatDate(invoice.due_date)}
        </Text>
        {invoice.description && (
          <Text style={styles.invoiceItemDescription} numberOfLines={2}>
            {invoice.description}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

/**
 * 空状態コンポーネント
 */
interface EmptyStateProps {
  filter: ApprovalStatus | 'all';
  onCreatePress: () => void;
}

function EmptyState({ filter, onCreatePress }: EmptyStateProps) {
  const getEmptyMessage = () => {
    switch (filter) {
      case 'draft':
        return '下書きの請求書はありません';
      case 'submitted':
        return '提出済みの請求書はありません';
      case 'approved':
        return '承認済みの請求書はありません';
      default:
        return '請求書がありません';
    }
  };

  return (
    <View style={styles.emptyStateContainer}>
      <Ionicons name="document-text-outline" size={64} color={Colors.text.tertiary} />
      <Text style={styles.emptyStateTitle}>{getEmptyMessage()}</Text>
      <Text style={styles.emptyStateDescription}>
        {filter === 'all'
          ? '最初の請求書を作成しましょう'
          : '他のフィルターを試すか、新しい請求書を作成してください'}
      </Text>
      {filter === 'all' && (
        <StyledButton
          title="請求書を作成"
          variant="primary"
          size="lg"
          onPress={onCreatePress}
          style={styles.emptyStateButton}
        />
      )}
    </View>
  );
}

// 日付フォーマット関数
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('ja-JP', {
    month: 'short',
    day: 'numeric',
  });
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.base.surface,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
    backgroundColor: Colors.base.surface,
  },
  headerTitle: {
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.bold,
    color: Colors.text.primary,
  },
  createButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary.DEFAULT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statisticsContainer: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.base.surfaceElevated,
  },
  statisticsItem: {
    flex: 1,
    alignItems: 'center',
  },
  statisticsValue: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
    color: Colors.text.primary,
  },
  statisticsLabel: {
    fontSize: Typography.sizes.sm,
    color: Colors.text.secondary,
    marginTop: Spacing.xs,
  },
  overdueText: {
    color: Colors.semantic.error,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.base.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  filterButton: {
    flex: 1,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xs,
    marginHorizontal: Spacing.xs,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.base.surfaceSubtle,
  },
  filterButtonActive: {
    backgroundColor: Colors.primary.DEFAULT,
  },
  filterButtonText: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
    color: Colors.text.secondary,
    textAlign: 'center',
  },
  filterButtonTextActive: {
    color: Colors.text.onPrimary,
  },
  list: {
    flex: 1,
  },
  invoiceItem: {
    backgroundColor: Colors.base.surface,
    marginHorizontal: Spacing.lg,
    marginVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  invoiceItemHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  invoiceItemInfo: {
    flex: 1,
  },
  invoiceItemCustomer: {
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.semibold,
    color: Colors.text.primary,
    marginBottom: Spacing.xs,
  },
  invoiceItemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  invoiceItemStatus: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
  },
  overdueLabel: {
    fontSize: Typography.sizes.xs,
    color: Colors.text.onPrimary,
    backgroundColor: Colors.semantic.error,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
    marginLeft: Spacing.sm,
  },
  deleteButton: {
    padding: Spacing.sm,
  },
  invoiceItemDetails: {
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
  },
  invoiceItemAmount: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
    color: Colors.text.primary,
    marginBottom: Spacing.xs,
  },
  invoiceItemDate: {
    fontSize: Typography.sizes.sm,
    color: Colors.text.secondary,
    marginBottom: Spacing.xs,
  },
  invoiceItemDescription: {
    fontSize: Typography.sizes.sm,
    color: Colors.text.secondary,
    lineHeight: 18,
  },
  emptyContainer: {
    flex: 1,
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  emptyStateTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.semibold,
    color: Colors.text.primary,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  emptyStateDescription: {
    fontSize: Typography.sizes.base,
    color: Colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.xl,
  },
  emptyStateButton: {
    paddingHorizontal: Spacing.xl,
  },
});