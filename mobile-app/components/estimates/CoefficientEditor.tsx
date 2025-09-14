/**
 * 係数編集フォームコンポーネント
 * 元請け別の価格・工期調整係数を編集・保存
 */

import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { StyledText } from '../ui/StyledText';
import { StyledInput } from '../ui/StyledInput';
import { StyledButton } from '../ui/StyledButton';
import { Card } from '../ui/Card';
import { Icon } from '../ui/Icon';
import { 
  ContractorCoefficient,
  RecommendedAdjustments,
  CoefficientHistory
} from '../../types/contractor';
import { DesignTokens } from '../../constants/DesignTokens';

interface CoefficientEditorProps {
  coefficient: ContractorCoefficient;
  recommendedAdjustments?: RecommendedAdjustments;
  onSave: (updatedCoefficient: Partial<ContractorCoefficient>) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  showHistory?: boolean;
  history?: CoefficientHistory[];
}

export const CoefficientEditor: React.FC<CoefficientEditorProps> = ({
  coefficient,
  recommendedAdjustments,
  onSave,
  onCancel,
  isLoading = false,
  showHistory = false,
  history = []
}) => {
  const [priceAdjustment, setPriceAdjustment] = useState(
    coefficient.price_adjustment.toString()
  );
  const [scheduleAdjustment, setScheduleAdjustment] = useState(
    coefficient.schedule_adjustment.toString()
  );
  const [notes, setNotes] = useState(coefficient.notes || '');
  const [hasChanges, setHasChanges] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  /**
   * 変更検知
   */
  useEffect(() => {
    const priceChanged = parseFloat(priceAdjustment) !== coefficient.price_adjustment;
    const scheduleChanged = parseFloat(scheduleAdjustment) !== coefficient.schedule_adjustment;
    const notesChanged = notes !== (coefficient.notes || '');
    
    setHasChanges(priceChanged || scheduleChanged || notesChanged);
  }, [priceAdjustment, scheduleAdjustment, notes, coefficient]);

  /**
   * 入力値バリデーション
   */
  const validateInputs = (): boolean => {
    const errors: string[] = [];
    const priceValue = parseFloat(priceAdjustment);
    const scheduleValue = parseFloat(scheduleAdjustment);

    // 価格調整係数チェック
    if (isNaN(priceValue) || priceValue <= 0) {
      errors.push('価格調整係数は正の数値で入力してください');
    } else if (priceValue < 0.5 || priceValue > 2.0) {
      errors.push('価格調整係数は0.5〜2.0の範囲で入力してください');
    }

    // 工期調整係数チェック
    if (isNaN(scheduleValue) || scheduleValue <= 0) {
      errors.push('工期調整係数は正の数値で入力してください');
    } else if (scheduleValue < 0.7 || scheduleValue > 2.0) {
      errors.push('工期調整係数は0.7〜2.0の範囲で入力してください');
    }

    // メモの長さチェック
    if (notes.length > 500) {
      errors.push('メモは500文字以内で入力してください');
    }

    setValidationErrors(errors);
    return errors.length === 0;
  };

  /**
   * 保存処理
   */
  const handleSave = async () => {
    if (!validateInputs()) {
      Alert.alert('入力エラー', validationErrors.join('\n'));
      return;
    }

    const updatedData: Partial<ContractorCoefficient> = {
      price_adjustment: parseFloat(priceAdjustment),
      schedule_adjustment: parseFloat(scheduleAdjustment),
      notes: notes.trim(),
      last_updated: new Date().toISOString()
    };

    try {
      await onSave(updatedData);
    } catch (error) {
      Alert.alert('保存エラー', '係数の保存に失敗しました');
    }
  };

  /**
   * 推奨値適用
   */
  const applyRecommendedValues = () => {
    if (!recommendedAdjustments) return;

    Alert.alert(
      '推奨値適用',
      'AI推奨値を適用しますか？現在の値は上書きされます。',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '適用',
          onPress: () => {
            setPriceAdjustment(recommendedAdjustments.price_adjustment.toString());
            setScheduleAdjustment(recommendedAdjustments.schedule_adjustment.toString());
            
            // 推奨理由をメモに追加
            const reasonText = recommendedAdjustments.reasoning.join('、');
            setNotes(prev => {
              const newNote = `AI推奨値適用: ${reasonText}`;
              return prev ? `${prev}\n\n${newNote}` : newNote;
            });
          }
        }
      ]
    );
  };

  /**
   * リセット処理
   */
  const handleReset = () => {
    Alert.alert(
      '値をリセット',
      '元の値に戻しますか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: 'リセット',
          style: 'destructive',
          onPress: () => {
            setPriceAdjustment(coefficient.price_adjustment.toString());
            setScheduleAdjustment(coefficient.schedule_adjustment.toString());
            setNotes(coefficient.notes || '');
          }
        }
      ]
    );
  };

  /**
   * 調整係数の影響度計算
   */
  const calculateImpact = (current: number, new_value: number): string => {
    const change = ((new_value - current) / current) * 100;
    if (Math.abs(change) < 1) return '変化なし';
    const direction = change > 0 ? '上昇' : '下降';
    return `${direction} ${Math.abs(change).toFixed(1)}%`;
  };

  return (
    <View style={styles.container}>
      <Card style={styles.editorCard}>
        {/* ヘッダー */}
        <View style={styles.header}>
          <StyledText variant="h2" style={styles.title}>
            {coefficient.contractor_name} - 係数調整
          </StyledText>
          <TouchableOpacity onPress={onCancel} style={styles.closeButton}>
            <Icon name="close" size={24} color={DesignTokens.colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* AI推奨値セクション */}
        {recommendedAdjustments && (
          <View style={styles.recommendedSection}>
            <View style={styles.recommendedHeader}>
              <StyledText variant="body" style={styles.recommendedTitle}>
                AI推奨調整値
              </StyledText>
              <TouchableOpacity 
                onPress={applyRecommendedValues}
                style={styles.applyButton}
              >
                <Icon name="auto-fix-high" size={16} color={DesignTokens.colors.primary} />
                <StyledText variant="caption" style={styles.applyButtonText}>
                  適用
                </StyledText>
              </TouchableOpacity>
            </View>
            
            <View style={styles.recommendedGrid}>
              <View style={styles.recommendedItem}>
                <StyledText variant="caption" style={styles.recommendedLabel}>
                  価格係数
                </StyledText>
                <StyledText variant="body" style={styles.recommendedValue}>
                  {recommendedAdjustments.price_adjustment.toFixed(3)}
                </StyledText>
              </View>
              
              <View style={styles.recommendedItem}>
                <StyledText variant="caption" style={styles.recommendedLabel}>
                  工期係数
                </StyledText>
                <StyledText variant="body" style={styles.recommendedValue}>
                  {recommendedAdjustments.schedule_adjustment.toFixed(3)}
                </StyledText>
              </View>
              
              <View style={styles.recommendedItem}>
                <StyledText variant="caption" style={styles.recommendedLabel}>
                  信頼度
                </StyledText>
                <StyledText variant="body" style={styles.recommendedValue}>
                  {(recommendedAdjustments.confidence * 100).toFixed(0)}%
                </StyledText>
              </View>
            </View>

            {/* 推奨理由 */}
            {recommendedAdjustments.reasoning.length > 0 && (
              <View style={styles.reasoningContainer}>
                <StyledText variant="caption" style={styles.reasoningTitle}>
                  推奨理由:
                </StyledText>
                {recommendedAdjustments.reasoning.map((reason, index) => (
                  <StyledText key={index} variant="caption" style={styles.reasoningText}>
                    • {reason}
                  </StyledText>
                ))}
              </View>
            )}
          </View>
        )}

        {/* 編集フォーム */}
        <View style={styles.formSection}>
          {/* 価格調整係数 */}
          <View style={styles.inputGroup}>
            <StyledText variant="body" style={styles.inputLabel}>
              価格調整係数
            </StyledText>
            <StyledInput
              value={priceAdjustment}
              onChangeText={setPriceAdjustment}
              placeholder="1.000"
              keyboardType="decimal-pad"
              style={styles.numberInput}
            />
            <StyledText variant="caption" style={styles.impactText}>
              影響: {calculateImpact(coefficient.price_adjustment, parseFloat(priceAdjustment) || 0)}
            </StyledText>
            <StyledText variant="caption" style={styles.helpText}>
              1.0 = 標準価格、0.9 = 10%減額、1.1 = 10%増額
            </StyledText>
          </View>

          {/* 工期調整係数 */}
          <View style={styles.inputGroup}>
            <StyledText variant="body" style={styles.inputLabel}>
              工期調整係数
            </StyledText>
            <StyledInput
              value={scheduleAdjustment}
              onChangeText={setScheduleAdjustment}
              placeholder="1.000"
              keyboardType="decimal-pad"
              style={styles.numberInput}
            />
            <StyledText variant="caption" style={styles.impactText}>
              影響: {calculateImpact(coefficient.schedule_adjustment, parseFloat(scheduleAdjustment) || 0)}
            </StyledText>
            <StyledText variant="caption" style={styles.helpText}>
              1.0 = 標準工期、0.9 = 10%短縮、1.1 = 10%延長
            </StyledText>
          </View>

          {/* メモ */}
          <View style={styles.inputGroup}>
            <StyledText variant="body" style={styles.inputLabel}>
              調整理由・メモ
            </StyledText>
            <StyledInput
              value={notes}
              onChangeText={setNotes}
              placeholder="調整理由を入力..."
              multiline
              numberOfLines={4}
              style={styles.textAreaInput}
            />
            <StyledText variant="caption" style={styles.charCount}>
              {notes.length}/500文字
            </StyledText>
          </View>
        </View>

        {/* バリデーションエラー */}
        {validationErrors.length > 0 && (
          <View style={styles.errorContainer}>
            {validationErrors.map((error, index) => (
              <StyledText key={index} variant="caption" style={styles.errorText}>
                • {error}
              </StyledText>
            ))}
          </View>
        )}

        {/* アクションボタン */}
        <View style={styles.actionBar}>
          <TouchableOpacity 
            onPress={handleReset}
            style={styles.secondaryButton}
            disabled={!hasChanges}
          >
            <StyledText 
              variant="body" 
              style={[
                styles.secondaryButtonText,
                { opacity: hasChanges ? 1 : 0.5 }
              ]}
            >
              リセット
            </StyledText>
          </TouchableOpacity>

          <View style={styles.primaryActions}>
            <StyledButton
              title="キャンセル"
              variant="outline"
              onPress={onCancel}
              style={styles.cancelButton}
              disabled={isLoading}
            />
            
            <StyledButton
              title="保存"
              variant="primary"
              onPress={handleSave}
              disabled={!hasChanges || isLoading}
              isLoading={isLoading}
              style={styles.saveButton}
            />
          </View>
        </View>
      </Card>

      {/* 変更履歴 */}
      {showHistory && history.length > 0 && (
        <Card style={styles.historyCard}>
          <StyledText variant="h3" style={styles.historyTitle}>
            変更履歴
          </StyledText>
          
          {history.slice(0, 5).map((item, index) => (
            <View key={item.id} style={styles.historyItem}>
              <StyledText variant="caption" style={styles.historyDate}>
                {new Date(item.changed_at).toLocaleDateString()}
              </StyledText>
              <StyledText variant="caption" style={styles.historyContent}>
                価格: {item.previous_price_adjustment.toFixed(3)} → {item.new_price_adjustment.toFixed(3)}
              </StyledText>
              <StyledText variant="caption" style={styles.historyContent}>
                工期: {item.previous_schedule_adjustment.toFixed(3)} → {item.new_schedule_adjustment.toFixed(3)}
              </StyledText>
              {item.change_reason && (
                <StyledText variant="caption" style={styles.historyReason}>
                  理由: {item.change_reason}
                </StyledText>
              )}
            </View>
          ))}
        </Card>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  editorCard: {
    marginBottom: DesignTokens.spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: DesignTokens.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: DesignTokens.colors.border,
  },
  title: {
    color: DesignTokens.colors.textPrimary,
    fontWeight: '600',
    flex: 1,
  },
  closeButton: {
    padding: DesignTokens.spacing.xs,
  },
  recommendedSection: {
    padding: DesignTokens.spacing.md,
    backgroundColor: DesignTokens.colors.primaryLight + '10',
    borderBottomWidth: 1,
    borderBottomColor: DesignTokens.colors.border,
  },
  recommendedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: DesignTokens.spacing.sm,
  },
  recommendedTitle: {
    color: DesignTokens.colors.textPrimary,
    fontWeight: '600',
  },
  applyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: DesignTokens.spacing.xs,
    paddingHorizontal: DesignTokens.spacing.sm,
    backgroundColor: DesignTokens.colors.primary + '20',
    borderRadius: DesignTokens.borderRadius.sm,
  },
  applyButtonText: {
    color: DesignTokens.colors.primary,
    marginLeft: DesignTokens.spacing.xs,
    fontWeight: '600',
  },
  recommendedGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: DesignTokens.spacing.sm,
  },
  recommendedItem: {
    alignItems: 'center',
    flex: 1,
  },
  recommendedLabel: {
    color: DesignTokens.colors.textSecondary,
    marginBottom: DesignTokens.spacing.xs,
  },
  recommendedValue: {
    color: DesignTokens.colors.primary,
    fontWeight: '700',
    fontSize: 18,
  },
  reasoningContainer: {
    marginTop: DesignTokens.spacing.sm,
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
  formSection: {
    padding: DesignTokens.spacing.md,
  },
  inputGroup: {
    marginBottom: DesignTokens.spacing.lg,
  },
  inputLabel: {
    color: DesignTokens.colors.textPrimary,
    fontWeight: '600',
    marginBottom: DesignTokens.spacing.xs,
  },
  numberInput: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  textAreaInput: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  impactText: {
    color: DesignTokens.colors.primary,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: DesignTokens.spacing.xs,
  },
  helpText: {
    color: DesignTokens.colors.textSecondary,
    textAlign: 'center',
    marginTop: DesignTokens.spacing.xs,
  },
  charCount: {
    color: DesignTokens.colors.textSecondary,
    textAlign: 'right',
    marginTop: DesignTokens.spacing.xs,
  },
  errorContainer: {
    padding: DesignTokens.spacing.md,
    backgroundColor: DesignTokens.colors.error + '10',
    marginHorizontal: DesignTokens.spacing.md,
    marginBottom: DesignTokens.spacing.md,
    borderRadius: DesignTokens.borderRadius.sm,
  },
  errorText: {
    color: DesignTokens.colors.error,
    marginBottom: DesignTokens.spacing.xs,
  },
  actionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: DesignTokens.spacing.md,
    borderTopWidth: 1,
    borderTopColor: DesignTokens.colors.border,
  },
  secondaryButton: {
    paddingVertical: DesignTokens.spacing.sm,
    paddingHorizontal: DesignTokens.spacing.md,
  },
  secondaryButtonText: {
    color: DesignTokens.colors.textSecondary,
  },
  primaryActions: {
    flexDirection: 'row',
    gap: DesignTokens.spacing.sm,
  },
  cancelButton: {
    minWidth: 80,
  },
  saveButton: {
    minWidth: 80,
  },
  historyCard: {
    marginTop: DesignTokens.spacing.md,
  },
  historyTitle: {
    color: DesignTokens.colors.textPrimary,
    fontWeight: '600',
    padding: DesignTokens.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: DesignTokens.colors.border,
  },
  historyItem: {
    padding: DesignTokens.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: DesignTokens.colors.border,
  },
  historyDate: {
    color: DesignTokens.colors.textSecondary,
    fontWeight: '600',
    marginBottom: DesignTokens.spacing.xs,
  },
  historyContent: {
    color: DesignTokens.colors.textPrimary,
    marginBottom: DesignTokens.spacing.xs,
  },
  historyReason: {
    color: DesignTokens.colors.textSecondary,
    fontStyle: 'italic',
  },
});