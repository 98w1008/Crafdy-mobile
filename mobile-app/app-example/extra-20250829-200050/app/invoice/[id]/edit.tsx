import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { DateTimeField } from '../../../util/datetime';
import { Ionicons } from '@expo/vector-icons';

import { StyledButton, StyledInput } from '@/components/ui';
import { Colors, Typography, Spacing, BorderRadius } from '@/constants/Colors';
import AuditLogTimeline from '../../../components/AuditLogTimeline';
import ChangesDiffModal from '../../../components/ChangesDiffModal';
import {
  getInvoice,
  updateInvoice,
  updateInvoiceStatus,
  calculateDueDate,
  validateInvoiceData,
  deleteInvoice,
} from '../../../lib/invoice-api';
import { auditHelpers, calculateFieldChanges } from '../../../lib/audit-log-api';
import type {
  Invoice,
  UpdateInvoiceData,
  ApprovalStatus,
  DateCalculationResult,
} from '../../../types/invoice';
import type { AuditLogEntry } from '../../../types/audit-log';

/**
 * 請求書編集画面
 * 
 * 機能:
 * - 請求書の詳細表示・編集
 * - ステータス変更（下書き → 提出済み → 承認済み）
 * - 支払期日の再計算
 * - 削除機能
 * - 権限制御（代表のみ編集可能）
 */
export default function EditInvoiceScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  // 状態管理
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState<'issued' | 'due' | null>(null);
  const [formData, setFormData] = useState<UpdateInvoiceData>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // タブとモーダル管理
  const [activeTab, setActiveTab] = useState<'details' | 'history'>('details');
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);
  const [showDiffModal, setShowDiffModal] = useState(false);

  // 初期化
  useEffect(() => {
    if (id) {
      loadInvoice();
    }
  }, [id]);

  // 請求書データの読み込み
  const loadInvoice = async () => {
    try {
      setIsLoading(true);
      const response = await getInvoice(id!);
      
      if (response.error) {
        Alert.alert('エラー', response.error);
        router.back();
        return;
      }

      if (!response.data) {
        Alert.alert('エラー', '請求書が見つかりません。');
        router.back();
        return;
      }

      setInvoice(response.data);
      setFormData({
        amount: response.data.amount,
        issued_date: response.data.issued_date,
        due_date: response.data.due_date,
        description: response.data.description || '',
        customer_name: response.data.customer_name || '',
        customer_email: response.data.customer_email || '',
      });
    } catch (error) {
      console.error('請求書読み込みエラー:', error);
      Alert.alert('エラー', '請求書の読み込みに失敗しました。');
      router.back();
    } finally {
      setIsLoading(false);
    }
  };

  // フォームデータの更新
  const updateFormData = (updates: Partial<UpdateInvoiceData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
    setErrors({}); // エラーをクリア
  };

  // 保存処理
  const handleSave = async () => {
    if (!invoice || !formData) return;

    try {
      setIsSubmitting(true);

      // バリデーション（CreateInvoiceDataとして検証）
      const validationData = {
        amount: formData.amount!,
        issued_date: formData.issued_date!,
        due_date: formData.due_date!,
        description: formData.description,
        customer_name: formData.customer_name,
        customer_email: formData.customer_email,
      };

      const validation = validateInvoiceData(validationData);
      if (!validation.isValid) {
        Alert.alert('入力エラー', validation.errors.join('\n'));
        return;
      }

      // 変更差分の計算（監査ログ用）
      const beforeData = {
        amount: invoice.amount,
        issued_date: invoice.issued_date,
        due_date: invoice.due_date,
        description: invoice.description,
        customer_name: invoice.customer_name,
        customer_email: invoice.customer_email,
      };
      const afterData = formData;
      const changes = calculateFieldChanges(beforeData, afterData);

      // 更新API呼び出し
      const response = await updateInvoice(invoice.id, formData);
      
      if (response.error) {
        Alert.alert('保存エラー', response.error);
        return;
      }

      if (response.data) {
        setInvoice(response.data);
        setEditMode(false);
        Alert.alert('保存完了', '請求書が正常に保存されました。');
        
        // 監査ログの記録
        if (changes.length > 0) {
          try {
            await auditHelpers.logInvoiceUpdated(
              invoice.id, 
              changes, 
              '請求書詳細を更新しました'
            );
          } catch (auditError) {
            console.warn('監査ログ記録エラー:', auditError);
          }
        }
      }
    } catch (error) {
      console.error('保存エラー:', error);
      Alert.alert('エラー', '保存に失敗しました。');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ステータス変更
  const handleStatusChange = async (newStatus: ApprovalStatus) => {
    if (!invoice) return;

    const statusLabels = {
      draft: '下書き',
      submitted: '提出済み',
      approved: '承認済み',
    };

    Alert.alert(
      'ステータス変更',
      `請求書のステータスを「${statusLabels[newStatus]}」に変更しますか？`,
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '変更',
          onPress: async () => {
            try {
              setIsSubmitting(true);
              const response = await updateInvoiceStatus(invoice.id, newStatus);
              
              if (response.error) {
                Alert.alert('エラー', response.error);
                return;
              }

              if (response.data) {
                setInvoice(response.data);
                Alert.alert('変更完了', `ステータスを「${statusLabels[newStatus]}」に変更しました。`);
                
                // 監査ログの記録
                try {
                  const changes = calculateFieldChanges(
                    { status: invoice.status },
                    { status: newStatus }
                  );
                  await auditHelpers.logInvoiceUpdated(
                    invoice.id,
                    changes,
                    `ステータスを「${statusLabels[newStatus]}」に変更しました`
                  );
                } catch (auditError) {
                  console.warn('監査ログ記録エラー:', auditError);
                }
              }
            } catch (error) {
              console.error('ステータス変更エラー:', error);
              Alert.alert('エラー', 'ステータスの変更に失敗しました。');
            } finally {
              setIsSubmitting(false);
            }
          },
        },
      ]
    );
  };

  // 削除処理
  const handleDelete = () => {
    if (!invoice) return;

    Alert.alert(
      '削除確認',
      `請求書「${invoice.customer_name || '無題'}」を削除しますか？\n\nこの操作は取り消せません。`,
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsSubmitting(true);
              const response = await deleteInvoice(invoice.id);
              
              if (response.error) {
                Alert.alert('エラー', response.error);
                return;
              }

              Alert.alert(
                '削除完了',
                '請求書が削除されました。',
                [
                  {
                    text: 'OK',
                    onPress: () => router.replace('/invoice'),
                  },
                ]
              );
            } catch (error) {
              console.error('削除エラー:', error);
              Alert.alert('エラー', '削除に失敗しました。');
            } finally {
              setIsSubmitting(false);
            }
          },
        },
      ]
    );
  };

  // 支払期日の再計算
  const recalculateDueDate = async () => {
    if (!formData.issued_date) return;

    try {
      const calculation = await calculateDueDate(formData.issued_date);
      updateFormData({ due_date: calculation.calculated_date });
      Alert.alert('再計算完了', '支払期日を会社既定値に基づいて再計算しました。');
    } catch (error) {
      console.error('支払期日再計算エラー:', error);
      Alert.alert('エラー', '支払期日の再計算に失敗しました。');
    }
  };

  // 日付選択の処理
  const handleDateChange = (selectedDate: Date, type: 'issued' | 'due') => {
    const dateString = selectedDate.toISOString().split('T')[0];
    
    if (type === 'issued') {
      updateFormData({ issued_date: dateString });
    } else if (type === 'due') {
      updateFormData({ due_date: dateString });
    }
    
    setShowDatePicker(null);
  };

  // ローディング中の表示
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>読み込み中...</Text>
      </View>
    );
  }

  if (!invoice) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>請求書が見つかりません</Text>
      </View>
    );
  }

  const canEdit = invoice.status === 'draft'; // 下書きのみ編集可能

  // 差分表示ハンドラー
  const handleViewDiff = (log: AuditLogEntry) => {
    setSelectedLog(log);
    setShowDiffModal(true);
  };

  return (
    <View style={styles.container}>
      {/* ヘッダー */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>請求書詳細</Text>
        <TouchableOpacity
          onPress={() => setEditMode(!editMode)}
          style={styles.editButton}
          disabled={!canEdit || activeTab !== 'details'}
        >
          <Ionicons
            name={editMode ? "checkmark" : "pencil"}
            size={20}
            color={canEdit && activeTab === 'details' ? Colors.primary.DEFAULT : Colors.text.tertiary}
          />
        </TouchableOpacity>
      </View>

      {/* タブナビゲーション */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'details' && styles.activeTab
          ]}
          onPress={() => {
            setActiveTab('details');
            if (editMode) setEditMode(false);
          }}
        >
          <Text style={[
            styles.tabText,
            activeTab === 'details' && styles.activeTabText
          ]}>
            詳細情報
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'history' && styles.activeTab
          ]}
          onPress={() => {
            setActiveTab('history');
            if (editMode) setEditMode(false);
          }}
        >
          <Text style={[
            styles.tabText,
            activeTab === 'history' && styles.activeTabText
          ]}>
            変更履歴
          </Text>
        </TouchableOpacity>
      </View>

      {/* タブコンテンツ */}
      {activeTab === 'details' ? (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* ステータス表示 */}
          <StatusCard
            status={invoice.status}
            onStatusChange={handleStatusChange}
            canChangeStatus={canEdit}
            isSubmitting={isSubmitting}
          />

          {/* 基本情報 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>基本情報</Text>
            
            <InvoiceField
              label="請求金額"
              value={editMode ? formData.amount?.toString() || '' : `¥${invoice.amount.toLocaleString()}`}
              editable={editMode}
              keyboardType="numeric"
              onChangeText={(text) => updateFormData({ amount: parseInt(text) || 0 })}
            />

            <View style={styles.row}>
              <View style={styles.halfWidth}>
                <InvoiceField
                  label="発行日"
                  value={editMode ? formData.issued_date || '' : formatDate(invoice.issued_date)}
                  editable={editMode}
                  onPress={editMode ? () => setShowDatePicker('issued') : undefined}
                  icon="calendar-outline"
                />
              </View>
              <View style={styles.halfWidth}>
                <InvoiceField
                  label="支払期日"
                  value={editMode ? formData.due_date || '' : formatDate(invoice.due_date)}
                  editable={editMode}
                  onPress={editMode ? () => setShowDatePicker('due') : undefined}
                  icon="calendar-outline"
                />
              </View>
            </View>

            {editMode && (
              <StyledButton
                title="期日を再計算"
                variant="ghost"
                size="sm"
                onPress={recalculateDueDate}
                style={styles.recalculateButton}
              />
            )}
          </View>

          {/* 顧客情報 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>顧客情報</Text>
            
            <InvoiceField
              label="顧客名"
              value={editMode ? formData.customer_name || '' : invoice.customer_name || '未設定'}
              editable={editMode}
              onChangeText={(text) => updateFormData({ customer_name: text })}
            />

            <InvoiceField
              label="メールアドレス"
              value={editMode ? formData.customer_email || '' : invoice.customer_email || '未設定'}
              editable={editMode}
              keyboardType="email-address"
              onChangeText={(text) => updateFormData({ customer_email: text })}
            />
          </View>

          {/* 備考 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>備考</Text>
            
            <InvoiceField
              label="詳細説明"
              value={editMode ? formData.description || '' : invoice.description || '備考なし'}
              editable={editMode}
              multiline
              numberOfLines={3}
              onChangeText={(text) => updateFormData({ description: text })}
            />
          </View>

          {/* メタ情報 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>作成情報</Text>
            
            <InvoiceField
              label="作成日時"
              value={formatDateTime(invoice.created_at)}
              editable={false}
            />

            <InvoiceField
              label="更新日時"
              value={formatDateTime(invoice.updated_at)}
              editable={false}
            />
          </View>
        </ScrollView>
      ) : (
        /* 変更履歴タブ */
        <View style={styles.historyContainer}>
          <AuditLogTimeline
            entityType="invoices"
            entityId={invoice.id}
            onViewDiff={handleViewDiff}
            maxHeight={500}
          />
        </View>
      )}

      {/* フッター - 詳細タブの時のみ表示 */}
      {activeTab === 'details' && (
        <View style={styles.footer}>
          {editMode ? (
            <View style={styles.editModeButtons}>
              <StyledButton
                title="キャンセル"
                variant="outline"
                size="lg"
                onPress={() => {
                  setEditMode(false);
                  setFormData({
                    amount: invoice.amount,
                    issued_date: invoice.issued_date,
                    due_date: invoice.due_date,
                    description: invoice.description || '',
                    customer_name: invoice.customer_name || '',
                    customer_email: invoice.customer_email || '',
                  });
                }}
                style={styles.cancelButton}
              />
              <StyledButton
                title="保存"
                variant="primary"
                size="lg"
                onPress={handleSave}
                loading={isSubmitting}
                style={styles.saveButton}
              />
            </View>
          ) : (
            <StyledButton
              title="削除"
              variant="danger"
              size="lg"
              onPress={handleDelete}
              disabled={!canEdit}
              style={styles.deleteButton}
            />
          )}
        </View>
      )}

      {/* 差分表示モーダル */}
      <ChangesDiffModal
        visible={showDiffModal}
        auditLog={selectedLog}
        onClose={() => {
          setShowDiffModal(false);
          setSelectedLog(null);
        }}
      />

      {/* 日付選択ピッカー */}
      {showDatePicker && (
        <DateTimeField
          value={new Date(
            showDatePicker === 'issued'
              ? formData.issued_date || invoice.issued_date
              : formData.due_date || invoice.due_date
          )}
          mode="date"
          onChange={(selectedDate) => handleDateChange(selectedDate, showDatePicker!)}
        />
      )}
    </View>
  );
}

/**
 * ステータスカードコンポーネント
 */
interface StatusCardProps {
  status: ApprovalStatus;
  onStatusChange: (status: ApprovalStatus) => void;
  canChangeStatus: boolean;
  isSubmitting: boolean;
}

function StatusCard({ status, onStatusChange, canChangeStatus, isSubmitting }: StatusCardProps) {
  const getStatusColor = (status: ApprovalStatus) => {
    switch (status) {
      case 'draft':
        return Colors.text.tertiary;
      case 'submitted':
        return Colors.semantic.warning;
      case 'approved':
        return Colors.semantic.success;
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
    }
  };

  const getNextStatus = (): ApprovalStatus | null => {
    switch (status) {
      case 'draft':
        return 'submitted';
      case 'submitted':
        return 'approved';
      default:
        return null;
    }
  };

  const nextStatus = getNextStatus();

  return (
    <View style={styles.statusCard}>
      <View style={styles.statusCardContent}>
        <Text style={styles.statusCardLabel}>ステータス</Text>
        <Text style={[styles.statusCardValue, { color: getStatusColor(status) }]}>
          {getStatusLabel(status)}
        </Text>
      </View>
      
      {canChangeStatus && nextStatus && (
        <StyledButton
          title={`${getStatusLabel(nextStatus)}にする`}
          variant="outline"
          size="sm"
          onPress={() => onStatusChange(nextStatus)}
          disabled={isSubmitting}
        />
      )}
    </View>
  );
}

/**
 * 請求書フィールドコンポーネント
 */
interface InvoiceFieldProps {
  label: string;
  value: string;
  editable: boolean;
  onChangeText?: (text: string) => void;
  onPress?: () => void;
  keyboardType?: 'default' | 'numeric' | 'email-address';
  multiline?: boolean;
  numberOfLines?: number;
  icon?: string;
}

function InvoiceField({
  label,
  value,
  editable,
  onChangeText,
  onPress,
  keyboardType = 'default',
  multiline = false,
  numberOfLines = 1,
  icon,
}: InvoiceFieldProps) {
  if (editable && onPress) {
    return (
      <TouchableOpacity style={styles.fieldContainer} onPress={onPress}>
        <Text style={styles.fieldLabel}>{label}</Text>
        <View style={styles.fieldValueContainer}>
          <Text style={styles.fieldValue}>{value || '未設定'}</Text>
          {icon && <Ionicons name={icon as any} size={20} color={Colors.text.secondary} />}
        </View>
      </TouchableOpacity>
    );
  }

  if (editable) {
    return (
      <View style={styles.fieldContainer}>
        <StyledInput
          label={label}
          value={value}
          onChangeText={onChangeText}
          keyboardType={keyboardType}
          multiline={multiline}
          numberOfLines={numberOfLines}
        />
      </View>
    );
  }

  return (
    <View style={styles.fieldContainer}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.fieldValue}>{value}</Text>
    </View>
  );
}

// ユーティリティ関数
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatDateTime(dateTimeString: string): string {
  const date = new Date(dateTimeString);
  return date.toLocaleString('ja-JP', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.base.surface,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.base.surface,
  },
  loadingText: {
    fontSize: Typography.sizes.lg,
    color: Colors.text.secondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
    backgroundColor: Colors.base.surface,
  },
  backButton: {
    padding: Spacing.sm,
  },
  headerTitle: {
    flex: 1,
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.semibold,
    color: Colors.text.primary,
    textAlign: 'center',
  },
  editButton: {
    padding: Spacing.sm,
  },
  content: {
    flex: 1,
  },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    margin: Spacing.lg,
    padding: Spacing.lg,
    backgroundColor: Colors.base.surfaceElevated,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  statusCardContent: {
    flex: 1,
  },
  statusCardLabel: {
    fontSize: Typography.sizes.sm,
    color: Colors.text.secondary,
    marginBottom: Spacing.xs,
  },
  statusCardValue: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.semibold,
  },
  section: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.semibold,
    color: Colors.text.primary,
    marginBottom: Spacing.md,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  halfWidth: {
    flex: 1,
  },
  recalculateButton: {
    alignSelf: 'flex-start',
    marginTop: Spacing.sm,
  },
  fieldContainer: {
    marginBottom: Spacing.lg,
  },
  fieldLabel: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
    color: Colors.text.secondary,
    marginBottom: Spacing.xs,
  },
  fieldValue: {
    fontSize: Typography.sizes.base,
    color: Colors.text.primary,
  },
  fieldValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
  },
  footer: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    backgroundColor: Colors.base.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
  },
  editModeButtons: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  cancelButton: {
    flex: 1,
  },
  saveButton: {
    flex: 1,
  },
  deleteButton: {
    width: '100%',
  },
  
  // タブ関連のスタイル
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.base.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: Colors.primary.DEFAULT,
  },
  tabText: {
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.medium,
    color: Colors.text.secondary,
  },
  activeTabText: {
    color: Colors.primary.DEFAULT,
    fontWeight: Typography.weights.semibold,
  },
  historyContainer: {
    flex: 1,
    backgroundColor: Colors.base.surface,
  },
});