/**
 * 簡素化された請求書作成画面
 * 3タップUXルールに従い、複雑なウィザードを排除してシンプルな1画面で請求書作成を完了
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
  TouchableOpacity,
  Keyboard,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { StyledButton, StyledInput } from '@/components/ui';
import { Colors, Typography, Spacing, BorderRadius } from '@/constants/Colors';
import { DateTimeField, isValidDate } from '../../util/datetime';
import { dayjs, parseJpDate, formatIsoDate, nowJp } from '../../src/utils/date';
import {
  createInvoice,
  calculateDueDate,
  getCompanyInvoiceSettings,
  validateInvoiceData,
} from '../../lib/invoice-api';
import type {
  CreateInvoiceData,
  CompanyInvoiceSettings,
} from '../../types/invoice';

/**
 * 簡素化された請求書作成画面
 * - ウィザード形式を廃止し、シンプルな1画面で完結
 * - 必須項目のみフォーカス（金額、発行日、支払期日）
 * - 自動的な支払期日計算
 * - 即座の入力検証とフィードバック
 */
export default function CreateSimpleInvoiceScreen() {
  const router = useRouter();

  // 基本フォームデータ
  const [formData, setFormData] = useState<CreateInvoiceData>({
    amount: 0,
    issued_date: formatIsoDate(nowJp()),
    due_date: '',
    description: '',
    customer_name: '',
    customer_email: '',
  });

  // UI状態
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState<'issued' | 'due' | null>(null);
  const [companySettings, setCompanySettings] = useState<CompanyInvoiceSettings | null>(null);

  // 初期化処理
  useEffect(() => {
    initializeForm();
  }, []);

  const initializeForm = async () => {
    try {
      setIsLoading(true);
      
      // 会社設定を取得
      const settings = await getCompanyInvoiceSettings();
      setCompanySettings(settings || { invoice_default_due: 'month_end' });
      
      // 支払期日を自動計算
      try {
        const calculation = await calculateDueDate(formData.issued_date);
        setFormData(prev => ({ ...prev, due_date: calculation.calculated_date }));
      } catch (error) {
        console.warn('支払期日計算エラー:', error);
        // フォールバック: 30日後
        const fallbackDueDate = nowJp().add(30, 'day');
        setFormData(prev => ({ ...prev, due_date: formatIsoDate(fallbackDueDate) }));
      }
    } catch (error) {
      console.error('初期化エラー:', error);
      // エラーが発生しても基本機能は提供
      setCompanySettings({ invoice_default_due: 'month_end' });
      const fallbackDueDate = nowJp().add(30, 'day');
      setFormData(prev => ({ ...prev, due_date: formatIsoDate(fallbackDueDate) }));
    } finally {
      setIsLoading(false);
    }
  };

  // フォームデータの更新
  const updateFormData = (updates: Partial<CreateInvoiceData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  // 支払期日の再計算（発行日変更時）
  const recalculateDueDate = async (issuedDate: string) => {
    try {
      const parsedDate = parseJpDate(issuedDate);
      if (!parsedDate.isValid()) return;

      const calculation = await calculateDueDate(formatIsoDate(parsedDate));
      updateFormData({ due_date: calculation.calculated_date });
    } catch (error) {
      console.warn('支払期日再計算エラー:', error);
      // フォールバック: 発行日から30日後
      const issuedDayjs = parseJpDate(issuedDate);
      if (issuedDayjs.isValid()) {
        const fallbackDueDate = issuedDayjs.add(30, 'day');
        updateFormData({ due_date: formatIsoDate(fallbackDueDate) });
      }
    }
  };

  // 日付選択処理
  const handleDateChange = (selectedDate: Date, type: 'issued' | 'due') => {
    if (!isValidDate(selectedDate)) {
      Alert.alert('エラー', '有効な日付を選択してください。');
      return;
    }

    const dateString = formatIsoDate(dayjs(selectedDate).tz('Asia/Tokyo'));
    
    if (type === 'issued') {
      updateFormData({ issued_date: dateString });
      // 発行日が変更されたら支払期日を再計算
      recalculateDueDate(dateString);
    } else if (type === 'due') {
      updateFormData({ due_date: dateString });
    }
    
    setShowDatePicker(null);
  };

  // 請求書作成処理
  const handleCreateInvoice = async () => {
    // キーボードを閉じる
    Keyboard.dismiss();
    
    try {
      setIsSubmitting(true);

      // バリデーション
      const validation = validateInvoiceData(formData);
      if (!validation.isValid) {
        Alert.alert(
          '入力内容をご確認ください',
          validation.errors.join('\n'),
          [{ text: 'OK', style: 'default' }]
        );
        return;
      }

      // 請求書作成
      const response = await createInvoice(formData);
      
      if (response.error) {
        Alert.alert('作成エラー', response.error);
        return;
      }

      // 成功時のハプティクス
      if (Haptics) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      Alert.alert(
        '✅ 請求書を作成しました',
        `金額: ¥${formData.amount.toLocaleString()}\n支払期日: ${formatDateForDisplay(formData.due_date)}`,
        [
          {
            text: 'OK',
            onPress: () => router.replace('/invoice'),
          },
        ]
      );
    } catch (error) {
      console.error('請求書作成エラー:', error);
      Alert.alert('エラー', '請求書の作成に失敗しました。もう一度お試しください。');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ローディング中の表示
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>初期化中...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* ヘッダー */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>請求書作成</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* メイン入力セクション */}
        <View style={styles.mainSection}>
          <Text style={styles.sectionTitle}>📋 基本情報</Text>
          
          {/* 金額入力（最も重要） */}
          <View style={styles.amountContainer}>
            <StyledInput
              label="請求金額 *"
              value={formData.amount.toString()}
              onChangeText={(text) => {
                const amount = parseInt(text.replace(/[^0-9]/g, '')) || 0;
                updateFormData({ amount });
              }}
              keyboardType="numeric"
              placeholder="例: 100000"
              style={styles.amountInput}
            />
            {formData.amount > 0 && (
              <Text style={styles.amountDisplay}>
                ¥{formData.amount.toLocaleString()}
              </Text>
            )}
          </View>

          {/* 日付設定 */}
          <View style={styles.dateSection}>
            <View style={styles.dateRow}>
              <View style={styles.dateField}>
                <TouchableOpacity
                  style={styles.dateButton}
                  onPress={() => setShowDatePicker('issued')}
                >
                  <Text style={styles.dateLabel}>発行日 *</Text>
                  <Text style={styles.dateValue}>
                    {formatDateForDisplay(formData.issued_date)}
                  </Text>
                  <Ionicons name="calendar-outline" size={20} color={Colors.primary.DEFAULT} />
                </TouchableOpacity>
              </View>
              
              <View style={styles.dateField}>
                <TouchableOpacity
                  style={styles.dateButton}
                  onPress={() => setShowDatePicker('due')}
                >
                  <Text style={styles.dateLabel}>支払期日 *</Text>
                  <Text style={styles.dateValue}>
                    {formatDateForDisplay(formData.due_date)}
                  </Text>
                  <Ionicons name="calendar-outline" size={20} color={Colors.primary.DEFAULT} />
                </TouchableOpacity>
              </View>
            </View>
            
            {/* 期日リセットボタン */}
            <TouchableOpacity
              style={styles.resetButton}
              onPress={() => recalculateDueDate(formData.issued_date)}
            >
              <Ionicons name="refresh" size={16} color={Colors.text.secondary} />
              <Text style={styles.resetButtonText}>期日を再計算</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* オプション情報（折りたたみ式） */}
        <View style={styles.optionalSection}>
          <Text style={styles.sectionTitle}>📝 詳細情報（任意）</Text>
          
          <StyledInput
            label="顧客名"
            value={formData.customer_name || ''}
            onChangeText={(text) => updateFormData({ customer_name: text })}
            placeholder="例: 株式会社サンプル"
            style={styles.inputSpacing}
          />

          <StyledInput
            label="顧客メールアドレス"
            value={formData.customer_email || ''}
            onChangeText={(text) => updateFormData({ customer_email: text })}
            keyboardType="email-address"
            placeholder="例: sample@example.com"
            style={styles.inputSpacing}
          />

          <StyledInput
            label="備考・説明"
            value={formData.description || ''}
            onChangeText={(text) => updateFormData({ description: text })}
            placeholder="請求内容の詳細など"
            multiline
            numberOfLines={3}
            style={styles.inputSpacing}
          />
        </View>

        {/* 会社設定情報 */}
        {companySettings && (
          <View style={styles.infoSection}>
            <Text style={styles.infoText}>
              💡 支払期日は会社設定（{companySettings.invoice_default_due === 'month_end' ? '当月末日' : '30日後'}）に基づいて自動設定されます
            </Text>
          </View>
        )}
      </ScrollView>

      {/* フッター（作成ボタン） */}
      <View style={styles.footer}>
        <StyledButton
          title={isSubmitting ? "作成中..." : "🚀 請求書を作成"}
          variant="primary"
          size="lg"
          onPress={handleCreateInvoice}
          loading={isSubmitting}
          disabled={formData.amount <= 0 || !formData.issued_date || !formData.due_date}
          style={styles.createButton}
        />
      </View>

      {/* 日付選択モーダル */}
      {showDatePicker && (
        <DateTimeField
          value={(() => {
            const dateString = showDatePicker === 'issued' ? formData.issued_date : formData.due_date;
            const parsedDate = parseJpDate(dateString);
            return parsedDate.isValid() ? parsedDate.toDate() : nowJp().toDate();
          })()}
          mode="date"
          onChange={(selectedDate) => handleDateChange(selectedDate, showDatePicker!)}
        />
      )}
    </View>
  );
}

// 日付フォーマット関数（表示用）
function formatDateForDisplay(dateString: string): string {
  if (!dateString) return '';
  
  const parsed = parseJpDate(dateString);
  if (!parsed.isValid()) {
    return '無効な日付';
  }
  
  return parsed.format('MM月DD日');
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
  headerRight: {
    width: 48,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  mainSection: {
    paddingVertical: Spacing.xl,
  },
  sectionTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.semibold,
    color: Colors.text.primary,
    marginBottom: Spacing.lg,
  },
  amountContainer: {
    marginBottom: Spacing.xl,
  },
  amountInput: {
    fontSize: Typography.sizes.xl,
  },
  amountDisplay: {
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.bold,
    color: Colors.primary.DEFAULT,
    textAlign: 'center',
    marginTop: Spacing.sm,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.primary.light + '20',
    borderRadius: BorderRadius.sm,
  },
  dateSection: {
    marginBottom: Spacing.lg,
  },
  dateRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  dateField: {
    flex: 1,
  },
  dateButton: {
    backgroundColor: Colors.base.surfaceElevated,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border.light,
    minHeight: 80,
    justifyContent: 'space-between',
  },
  dateLabel: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
    color: Colors.text.secondary,
  },
  dateValue: {
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.medium,
    color: Colors.text.primary,
    marginVertical: Spacing.xs,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.xs,
  },
  resetButtonText: {
    fontSize: Typography.sizes.sm,
    color: Colors.text.secondary,
  },
  optionalSection: {
    paddingVertical: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
  },
  inputSpacing: {
    marginBottom: Spacing.lg,
  },
  infoSection: {
    margin: Spacing.lg,
    padding: Spacing.lg,
    backgroundColor: Colors.base.surfaceSubtle,
    borderRadius: BorderRadius.lg,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary.DEFAULT,
  },
  infoText: {
    fontSize: Typography.sizes.sm,
    color: Colors.text.secondary,
    lineHeight: 20,
  },
  footer: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    backgroundColor: Colors.base.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
  },
  createButton: {
    minHeight: 56,
  },
});