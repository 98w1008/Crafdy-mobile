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
import { useRouter } from 'expo-router';
import { DateTimeField, formatDate, isValidDate } from '../../util/datetime';
import { dayjs, parseJpDate, formatIsoDate, nowJp, normalizeInvoiceDates, InvoiceRule } from '../../src/utils/date';
import { Ionicons } from '@expo/vector-icons';

import { StyledButton, StyledInput } from '@/components/ui';
import { Colors, Typography, Spacing, BorderRadius } from '@/constants/Colors';
import { supabase } from '@/lib/supabase';
import {
  createInvoice,
  validateInvoiceData,
} from '../../lib/invoice-api';
import type {
  CreateInvoiceData,
  InvoiceWizardStep,
  InvoiceWizardState,
  CompanyInvoiceSettings,
  DateCalculationResult,
} from '../../types/invoice';

/**
 * 請求書作成ウィザード画面
 * 
 * ステップ構成：
 * 1. 支払期日設定 (due_date) - 会社既定値に基づく自動設定
 * 2. 基本情報 (basic_info) - 金額、発行日、顧客情報など
 * 3. 項目追加 (items) - 将来の拡張用
 * 4. 確認 (confirmation) - 入力内容の確認
 */
export default function CreateInvoiceScreen() {
  const router = useRouter();

  // ウィザード状態の管理
  const [wizardState, setWizardState] = useState<InvoiceWizardState>({
    currentStep: 'due_date',
    formData: {
      amount: 0,
      issued_date: formatIsoDate(nowJp()),
      due_date: '',
      description: '',
      customer_name: '',
      customer_email: '',
    },
    isSubmitting: false,
    errors: {},
  });

  // 会社設定とその他の状態
  const [companySettings, setCompanySettings] = useState<CompanyInvoiceSettings | null>(null);
  const [dueDateCalculation, setDueDateCalculation] = useState<DateCalculationResult | null>(null);
  const [showDatePicker, setShowDatePicker] = useState<'issued' | 'due' | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 初期化処理
  useEffect(() => {
    initializeWizard();
  }, []);

  const initializeWizard = async () => {
    try {
      setIsLoading(true);
      
      // 会社設定を安全に取得（.maybeSingle()使用）
      const { data: settings } = await supabase
        ?.from('company_settings')
        .select('invoice_due_type, invoice_due_days')
        .maybeSingle() ?? { data: null };
      
      const rule: InvoiceRule = settings
        ? (settings.invoice_due_type === 'eom' ? { type: 'eom' } : { type: 'days', value: Number(settings.invoice_due_days) || 30 })
        : { type: 'days', value: 30 };
      
      // フロントで日付計算を完結
      const dates = normalizeInvoiceDates(wizardState.formData.issued_date, rule);
      
      updateFormData({ 
        issued_date: dates.issueDate,
        due_date: dates.dueDate 
      });
      
      setDueDateCalculation({
        calculated_date: dates.dueDate,
        calculation_method: rule.type === 'eom' ? 'month_end' : 'net30',
        base_date: dates.issueDate
      });
      
      setCompanySettings({ 
        invoice_default_due: rule.type === 'eom' ? 'month_end' : 'net30' 
      });
      
    } catch (error) {
      console.warn('初期化エラー:', error);
      // フォールバック：30日後設定
      const fallbackDates = normalizeInvoiceDates(wizardState.formData.issued_date, { type: 'days', value: 30 });
      updateFormData({ 
        issued_date: fallbackDates.issueDate,
        due_date: fallbackDates.dueDate 
      });
      setCompanySettings({ invoice_default_due: 'net30' });
    } finally {
      setIsLoading(false);
    }
  };

  // フォームデータの更新
  const updateFormData = (updates: Partial<CreateInvoiceData>) => {
    setWizardState(prev => ({
      ...prev,
      formData: { ...prev.formData, ...updates },
      errors: {}, // エラーをクリア
    }));
  };

  // 支払期日の再計算
  const recalculateDueDate = (issuedDate: string) => {
    try {
      // 発行日の妥当性チェック
      const parsedDate = parseJpDate(issuedDate);
      if (!parsedDate.isValid()) {
        Alert.alert('エラー', '有効な発行日を入力してください。');
        return;
      }

      // 会社設定に基づいてルール決定
      const rule: InvoiceRule = companySettings?.invoice_default_due === 'month_end' 
        ? { type: 'eom' }
        : { type: 'days', value: 30 };
      
      // フロントで再計算
      const dates = normalizeInvoiceDates(formatIsoDate(parsedDate), rule);
      
      updateFormData({ 
        issued_date: dates.issueDate,
        due_date: dates.dueDate 
      });
      
      setDueDateCalculation({
        calculated_date: dates.dueDate,
        calculation_method: rule.type === 'eom' ? 'month_end' : 'net30',
        base_date: dates.issueDate
      });
      
    } catch (error) {
      console.warn('支払期日計算エラー:', error);
      // フォールバック処理
      const issuedDayjs = parseJpDate(issuedDate);
      if (issuedDayjs.isValid()) {
        const fallbackDates = normalizeInvoiceDates(formatIsoDate(issuedDayjs), { type: 'days', value: 30 });
        updateFormData({ due_date: fallbackDates.dueDate });
      }
    }
  };

  // 次のステップへ進む
  const goToNextStep = () => {
    const currentStepIndex = WIZARD_STEPS.indexOf(wizardState.currentStep);
    if (currentStepIndex < WIZARD_STEPS.length - 1) {
      const nextStep = WIZARD_STEPS[currentStepIndex + 1];
      setWizardState(prev => ({ ...prev, currentStep: nextStep }));
    }
  };

  // 前のステップへ戻る
  const goToPreviousStep = () => {
    const currentStepIndex = WIZARD_STEPS.indexOf(wizardState.currentStep);
    if (currentStepIndex > 0) {
      const previousStep = WIZARD_STEPS[currentStepIndex - 1];
      setWizardState(prev => ({ ...prev, currentStep: previousStep }));
    }
  };

  // 請求書の作成
  const handleCreateInvoice = async () => {
    try {
      setWizardState(prev => ({ ...prev, isSubmitting: true }));

      // バリデーション
      const validation = validateInvoiceData(wizardState.formData);
      if (!validation.isValid) {
        Alert.alert('入力エラー', validation.errors.join('\n'));
        return;
      }

      // 請求書作成API呼び出し
      const response = await createInvoice(wizardState.formData);
      
      if (response.error) {
        Alert.alert('作成エラー', response.error);
        return;
      }

      Alert.alert(
        '作成完了',
        '請求書が正常に作成されました。',
        [
          {
            text: 'OK',
            onPress: () => router.replace('/invoice'),
          },
        ]
      );
    } catch (error) {
      console.error('請求書作成エラー:', error);
      Alert.alert('エラー', '請求書の作成に失敗しました。');
    } finally {
      setWizardState(prev => ({ ...prev, isSubmitting: false }));
    }
  };

  // 日付選択の処理
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

  // ウィザードのステップ定義
  const WIZARD_STEPS: InvoiceWizardStep[] = ['due_date', 'basic_info', 'items', 'confirmation'];

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
        <View style={styles.headerRight}>
          <Text style={styles.stepIndicator}>
            {WIZARD_STEPS.indexOf(wizardState.currentStep) + 1} / {WIZARD_STEPS.length}
          </Text>
        </View>
      </View>

      {/* プログレスバー */}
      <View style={styles.progressContainer}>
        <View
          style={[
            styles.progressBar,
            {
              width: `${((WIZARD_STEPS.indexOf(wizardState.currentStep) + 1) / WIZARD_STEPS.length) * 100}%`,
            },
          ]}
        />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* ステップ1: 支払期日設定 */}
        {wizardState.currentStep === 'due_date' && (
          <DueDateStep
            formData={wizardState.formData}
            companySettings={companySettings}
            dueDateCalculation={dueDateCalculation}
            onFormDataChange={updateFormData}
            onShowDatePicker={setShowDatePicker}
            onRecalculateDueDate={recalculateDueDate}
          />
        )}

        {/* ステップ2: 基本情報 */}
        {wizardState.currentStep === 'basic_info' && (
          <BasicInfoStep
            formData={wizardState.formData}
            onFormDataChange={updateFormData}
            onShowDatePicker={setShowDatePicker}
          />
        )}

        {/* ステップ3: 項目追加（将来的な拡張用） */}
        {wizardState.currentStep === 'items' && (
          <ItemsStep formData={wizardState.formData} />
        )}

        {/* ステップ4: 確認 */}
        {wizardState.currentStep === 'confirmation' && (
          <ConfirmationStep formData={wizardState.formData} />
        )}
      </ScrollView>

      {/* フッターのボタン */}
      <View style={styles.footer}>
        {wizardState.currentStep !== 'due_date' && (
          <StyledButton
            title="戻る"
            variant="outline"
            size="lg"
            onPress={goToPreviousStep}
            style={styles.backStepButton}
          />
        )}
        
        {wizardState.currentStep !== 'confirmation' ? (
          <StyledButton
            title="次へ"
            variant="primary"
            size="lg"
            onPress={goToNextStep}
            style={styles.nextButton}
            fullWidth={wizardState.currentStep === 'due_date'}
          />
        ) : (
          <StyledButton
            title="請求書を作成"
            variant="primary"
            size="lg"
            onPress={handleCreateInvoice}
            loading={wizardState.isSubmitting}
            style={styles.createButton}
          />
        )}
      </View>

      {/* 日付選択ピッカー */}
      {showDatePicker && (
        <DateTimeField
          value={(() => {
            const dateString = showDatePicker === 'issued'
              ? wizardState.formData.issued_date
              : wizardState.formData.due_date;
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

/**
 * ステップ1: 支払期日設定コンポーネント
 */
interface DueDateStepProps {
  formData: CreateInvoiceData;
  companySettings: CompanyInvoiceSettings | null;
  dueDateCalculation: DateCalculationResult | null;
  onFormDataChange: (updates: Partial<CreateInvoiceData>) => void;
  onShowDatePicker: (type: 'issued' | 'due' | null) => void;
  onRecalculateDueDate: (issuedDate: string) => void;
}

function DueDateStep({
  formData,
  companySettings,
  dueDateCalculation,
  onFormDataChange,
  onShowDatePicker,
  onRecalculateDueDate,
}: DueDateStepProps) {
  return (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>支払期日の設定</Text>
      <Text style={styles.stepDescription}>
        まず請求書の支払期日を設定します。会社の既定値に基づいて自動で設定されますが、手動で変更も可能です。
      </Text>

      {/* 会社既定値の表示 */}
      {companySettings && (
        <View style={styles.defaultValueContainer}>
          <Text style={styles.defaultValueLabel}>
            💡 初期値: {companySettings.invoice_default_due === 'month_end' ? '当月末日' : '30日後'}（会社既定）
          </Text>
          <Text style={styles.defaultValueDescription}>
            発行日に基づいて自動計算されます。手動での変更も可能です。
          </Text>
        </View>
      )}

      {/* 発行日 */}
      <TouchableOpacity
        style={styles.dateInputContainer}
        onPress={() => onShowDatePicker('issued')}
      >
        <Text style={styles.dateLabel}>発行日</Text>
        <View style={styles.dateValueContainer}>
          <Text style={styles.dateValue}>{formatDateForDisplay(formData.issued_date)}</Text>
          <Ionicons name="calendar-outline" size={20} color={Colors.text.secondary} />
        </View>
      </TouchableOpacity>

      {/* 支払期日 */}
      <TouchableOpacity
        style={styles.dateInputContainer}
        onPress={() => onShowDatePicker('due')}
      >
        <Text style={styles.dateLabel}>支払期日</Text>
        <View style={styles.dateValueContainer}>
          <Text style={styles.dateValue}>{formatDateForDisplay(formData.due_date)}</Text>
          <Ionicons name="calendar-outline" size={20} color={Colors.text.secondary} />
        </View>
      </TouchableOpacity>

      {/* 計算方法の表示 */}
      {dueDateCalculation && (
        <View style={styles.calculationInfoContainer}>
          <Text style={styles.calculationInfoText}>
            計算方法: {dueDateCalculation.calculation_method === 'month_end' ? '当月末日' : '30日後'}
          </Text>
        </View>
      )}

      {/* 期日リセットボタン */}
      <StyledButton
        title="会社既定値に戻す"
        variant="ghost"
        size="sm"
        onPress={() => onRecalculateDueDate(formData.issued_date)}
        style={styles.resetButton}
      />
    </View>
  );
}

/**
 * ステップ2: 基本情報コンポーネント
 */
interface BasicInfoStepProps {
  formData: CreateInvoiceData;
  onFormDataChange: (updates: Partial<CreateInvoiceData>) => void;
  onShowDatePicker: (type: 'issued' | 'due' | null) => void;
}

function BasicInfoStep({ formData, onFormDataChange }: BasicInfoStepProps) {
  return (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>基本情報</Text>
      <Text style={styles.stepDescription}>
        請求書の金額と顧客情報を入力してください。
      </Text>

      <StyledInput
        label="請求金額 *"
        value={formData.amount.toString()}
        onChangeText={(text) => onFormDataChange({ amount: parseInt(text) || 0 })}
        keyboardType="numeric"
        placeholder="例: 100000"
        style={styles.inputSpacing}
      />

      <StyledInput
        label="顧客名"
        value={formData.customer_name || ''}
        onChangeText={(text) => onFormDataChange({ customer_name: text })}
        placeholder="例: 株式会社サンプル"
        style={styles.inputSpacing}
      />

      <StyledInput
        label="顧客メールアドレス"
        value={formData.customer_email || ''}
        onChangeText={(text) => onFormDataChange({ customer_email: text })}
        keyboardType="email-address"
        placeholder="例: sample@example.com"
        style={styles.inputSpacing}
      />

      <StyledInput
        label="備考"
        value={formData.description || ''}
        onChangeText={(text) => onFormDataChange({ description: text })}
        placeholder="請求内容の詳細など"
        multiline
        numberOfLines={3}
        style={styles.inputSpacing}
      />
    </View>
  );
}

/**
 * ステップ3: 項目追加コンポーネント（将来的な拡張用）
 */
interface ItemsStepProps {
  formData: CreateInvoiceData;
}

function ItemsStep({ formData }: ItemsStepProps) {
  return (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>請求項目</Text>
      <Text style={styles.stepDescription}>
        現在のバージョンでは、請求項目の詳細設定は次期バージョンで実装予定です。
      </Text>

      <View style={styles.comingSoonContainer}>
        <Ionicons name="construct-outline" size={48} color={Colors.text.tertiary} />
        <Text style={styles.comingSoonText}>次期バージョンで実装予定</Text>
        <Text style={styles.comingSoonDescription}>
          請求項目の詳細設定機能は、今後のアップデートで追加されます。
        </Text>
      </View>
    </View>
  );
}

/**
 * ステップ4: 確認コンポーネント
 */
interface ConfirmationStepProps {
  formData: CreateInvoiceData;
}

function ConfirmationStep({ formData }: ConfirmationStepProps) {
  return (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>入力内容の確認</Text>
      <Text style={styles.stepDescription}>
        以下の内容で請求書を作成します。内容に間違いがないか確認してください。
      </Text>

      <View style={styles.confirmationContainer}>
        <ConfirmationItem label="請求金額" value={`¥${formData.amount.toLocaleString()}`} />
        <ConfirmationItem label="発行日" value={formatDateForDisplay(formData.issued_date)} />
        <ConfirmationItem label="支払期日" value={formatDateForDisplay(formData.due_date)} />
        {formData.customer_name && (
          <ConfirmationItem label="顧客名" value={formData.customer_name} />
        )}
        {formData.customer_email && (
          <ConfirmationItem label="顧客メールアドレス" value={formData.customer_email} />
        )}
        {formData.description && (
          <ConfirmationItem label="備考" value={formData.description} />
        )}
      </View>
    </View>
  );
}

/**
 * 確認画面の項目コンポーネント
 */
interface ConfirmationItemProps {
  label: string;
  value: string;
}

function ConfirmationItem({ label, value }: ConfirmationItemProps) {
  return (
    <View style={styles.confirmationItem}>
      <Text style={styles.confirmationLabel}>{label}</Text>
      <Text style={styles.confirmationValue}>{value}</Text>
    </View>
  );
}

// 日付フォーマット関数（dayjsベース、Invalid Date対応）
function formatDateForDisplay(dateString: string): string {
  if (!dateString) return '';
  
  const parsed = parseJpDate(dateString);
  if (!parsed.isValid()) {
    console.warn('Invalid date in formatDateForDisplay:', dateString);
    return '無効な日付';
  }
  
  return parsed.format('YYYY年MM月DD日');
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
    alignItems: 'flex-end',
  },
  stepIndicator: {
    fontSize: Typography.sizes.sm,
    color: Colors.text.secondary,
  },
  progressContainer: {
    height: 4,
    backgroundColor: Colors.base.surfaceSubtle,
  },
  progressBar: {
    height: '100%',
    backgroundColor: Colors.primary.DEFAULT,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  stepContainer: {
    paddingVertical: Spacing.xl,
  },
  stepTitle: {
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.bold,
    color: Colors.text.primary,
    marginBottom: Spacing.sm,
  },
  stepDescription: {
    fontSize: Typography.sizes.base,
    color: Colors.text.secondary,
    lineHeight: 22,
    marginBottom: Spacing.xl,
  },
  defaultValueContainer: {
    backgroundColor: Colors.base.surfaceElevated,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary.DEFAULT,
  },
  defaultValueLabel: {
    fontSize: Typography.sizes.sm,
    color: Colors.text.secondary,
    fontWeight: Typography.weights.medium,
    marginBottom: Spacing.xs,
  },
  defaultValueDescription: {
    fontSize: Typography.sizes.xs,
    color: Colors.text.tertiary,
    lineHeight: 16,
  },
  dateInputContainer: {
    backgroundColor: Colors.base.surfaceElevated,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  dateLabel: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
    color: Colors.text.primary,
    marginBottom: Spacing.sm,
  },
  dateValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateValue: {
    fontSize: Typography.sizes.base,
    color: Colors.text.primary,
  },
  calculationInfoContainer: {
    padding: Spacing.md,
    backgroundColor: Colors.base.surfaceSubtle,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.md,
  },
  calculationInfoText: {
    fontSize: Typography.sizes.sm,
    color: Colors.text.secondary,
  },
  resetButton: {
    alignSelf: 'flex-start',
  },
  inputSpacing: {
    marginBottom: Spacing.lg,
  },
  comingSoonContainer: {
    alignItems: 'center',
    paddingVertical: Spacing['2xl'],
  },
  comingSoonText: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.semibold,
    color: Colors.text.tertiary,
    marginTop: Spacing.md,
  },
  comingSoonDescription: {
    fontSize: Typography.sizes.base,
    color: Colors.text.tertiary,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
  confirmationContainer: {
    backgroundColor: Colors.base.surfaceElevated,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
  },
  confirmationItem: {
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  confirmationLabel: {
    fontSize: Typography.sizes.sm,
    color: Colors.text.secondary,
    marginBottom: Spacing.xs,
  },
  confirmationValue: {
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.medium,
    color: Colors.text.primary,
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    backgroundColor: Colors.base.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
  },
  backStepButton: {
    flex: 1,
    marginRight: Spacing.md,
  },
  nextButton: {
    flex: 1,
  },
  createButton: {
    flex: 1,
  },
});
