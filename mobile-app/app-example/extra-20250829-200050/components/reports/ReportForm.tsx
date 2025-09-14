/**
 * 日報フォームコンポーネント
 * 最小実務項目に絞った日報入力フォーム
 */

import React, { useState, useCallback, useEffect } from 'react'
import {
  View,
  StyleSheet,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform
} from 'react-native'
import {
  TextInput,
  Surface,
  SegmentedButtons,
  HelperText,
  Chip,
  Divider
} from 'react-native-paper'
import { useForm, Controller } from 'react-hook-form'
import * as Haptics from 'expo-haptics'
import dayjs from 'dayjs'
import timezone from 'dayjs/plugin/timezone'
import utc from 'dayjs/plugin/utc'

import { Colors, Spacing, Typography, BorderRadius } from '@/constants/Colors'
import { StyledText, StyledButton, Card } from '@/components/ui'
import { AttachmentSection } from './AttachmentSection'
import { 
  ReportFormData, 
  ReportStatus, 
  AttachmentFormData,
  WorkSite,
  MAX_WORK_HOURS,
  MIN_WORK_HOURS,
  MAX_PROGRESS_RATE,
  MIN_PROGRESS_RATE
} from '@/types/reports'

// dayjs timezone設定
dayjs.extend(utc)
dayjs.extend(timezone)

// =============================================================================
// TYPES
// =============================================================================

interface ReportFormProps {
  initialData?: Partial<ReportFormData>
  workSites?: WorkSite[]
  isEditing?: boolean
  onSubmit: (data: ReportFormData, action: 'save_draft' | 'submit') => Promise<void>
  loading?: boolean
  allowDraft?: boolean
}

interface FormValidationRules {
  work_hours: {
    required: string
    min: { value: number; message: string }
    max: { value: number; message: string }
  }
  work_content: {
    required: string
    minLength: { value: number; message: string }
    maxLength: { value: number; message: string }
  }
  progress_rate: {
    min: { value: number; message: string }
    max: { value: number; message: string }
  }
  special_notes: {
    maxLength: { value: number; message: string }
  }
}

// =============================================================================
// VALIDATION RULES
// =============================================================================

const VALIDATION_RULES: FormValidationRules = {
  work_hours: {
    required: '作業時間を入力してください',
    min: { value: MIN_WORK_HOURS, message: `作業時間は${MIN_WORK_HOURS}時間以上で入力してください` },
    max: { value: MAX_WORK_HOURS, message: `作業時間は${MAX_WORK_HOURS}時間以下で入力してください` }
  },
  work_content: {
    required: '作業内容を入力してください',
    minLength: { value: 10, message: '作業内容は10文字以上で入力してください' },
    maxLength: { value: 1000, message: '作業内容は1000文字以内で入力してください' }
  },
  progress_rate: {
    min: { value: MIN_PROGRESS_RATE, message: `進捗率は${MIN_PROGRESS_RATE}%以上で入力してください` },
    max: { value: MAX_PROGRESS_RATE, message: `進捗率は${MAX_PROGRESS_RATE}%以下で入力してください` }
  },
  special_notes: {
    maxLength: { value: 500, message: '特記事項は500文字以内で入力してください' }
  }
}

const PROGRESS_OPTIONS = [
  { value: '0', label: '未着手' },
  { value: '25', label: '25%' },
  { value: '50', label: '50%' },
  { value: '75', label: '75%' },
  { value: '100', label: '完了' }
]

// =============================================================================
// COMPONENT
// =============================================================================

export const ReportForm: React.FC<ReportFormProps> = ({
  initialData,
  workSites = [],
  isEditing = false,
  onSubmit,
  loading = false,
  allowDraft = true
}) => {
  const [attachments, setAttachments] = useState<AttachmentFormData[]>(
    initialData?.attachments || []
  )
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    control,
    handleSubmit,
    formState: { errors, isDirty, isValid },
    watch,
    setValue,
    reset
  } = useForm<Omit<ReportFormData, 'attachments'>>({
    defaultValues: {
      work_date: initialData?.work_date || dayjs().tz('Asia/Tokyo').format('YYYY-MM-DD'),
      work_site_id: initialData?.work_site_id || '',
      work_hours: initialData?.work_hours || 8,
      work_content: initialData?.work_content || '',
      progress_rate: initialData?.progress_rate || 0,
      special_notes: initialData?.special_notes || ''
    },
    mode: 'onChange'
  })

  // フォームデータの監視
  const watchedData = watch()

  // 初期データが変更された場合のリセット
  useEffect(() => {
    if (initialData) {
      reset({
        work_date: initialData.work_date || dayjs().tz('Asia/Tokyo').format('YYYY-MM-DD'),
        work_site_id: initialData.work_site_id || '',
        work_hours: initialData.work_hours || 8,
        work_content: initialData.work_content || '',
        progress_rate: initialData.progress_rate || 0,
        special_notes: initialData.special_notes || ''
      })
      setAttachments(initialData.attachments || [])
    }
  }, [initialData, reset])

  // 添付ファイル変更ハンドラー
  const handleAttachmentsChange = useCallback((newAttachments: AttachmentFormData[]) => {
    setAttachments(newAttachments)
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
  }, [])

  // フォーム送信処理
  const handleFormSubmit = useCallback(async (
    data: Omit<ReportFormData, 'attachments'>, 
    action: 'save_draft' | 'submit'
  ) => {
    setIsSubmitting(true)

    try {
      const formData: ReportFormData = {
        ...data,
        attachments
      }

      await onSubmit(formData, action)

      Haptics.notificationAsync(
        action === 'submit' 
          ? Haptics.NotificationFeedbackType.Success
          : Haptics.NotificationFeedbackType.Warning
      )
    } catch (error) {
      console.error('フォーム送信エラー:', error)
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      
      Alert.alert(
        'エラー',
        action === 'submit' 
          ? '日報の提出に失敗しました。もう一度お試しください。'
          : '下書きの保存に失敗しました。もう一度お試しください。'
      )
    } finally {
      setIsSubmitting(false)
    }
  }, [attachments, onSubmit])

  // 下書き保存
  const saveDraft = useCallback(() => {
    handleSubmit(data => handleFormSubmit(data, 'save_draft'))()
  }, [handleSubmit, handleFormSubmit])

  // 提出
  const submitReport = useCallback(() => {
    if (!isValid) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      Alert.alert('入力エラー', '必須項目を正しく入力してください')
      return
    }

    Alert.alert(
      '確認',
      '日報を提出しますか？提出後は編集できません。',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '提出する',
          style: 'default',
          onPress: () => handleSubmit(data => handleFormSubmit(data, 'submit'))()
        }
      ]
    )
  }, [isValid, handleSubmit, handleFormSubmit])

  // 進捗率選択ハンドラー
  const handleProgressChange = useCallback((value: string) => {
    setValue('progress_rate', parseInt(value, 10), { shouldDirty: true })
  }, [setValue])

  // バリデーション状態の取得
  const getValidationState = () => {
    const requiredFieldsValid = watchedData.work_hours >= MIN_WORK_HOURS && 
                               watchedData.work_content && 
                               watchedData.work_content.length >= 10
    
    return {
      canSaveDraft: isDirty,
      canSubmit: isValid && requiredFieldsValid
    }
  }

  const { canSaveDraft, canSubmit } = getValidationState()

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView 
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* 基本情報セクション */}
        <Card variant="elevated" style={styles.section}>
          <StyledText variant="subtitle" weight="semibold" style={styles.sectionTitle}>
            📅 基本情報
          </StyledText>

          {/* 作業日 */}
          <Controller
            name="work_date"
            control={control}
            render={({ field }) => (
              <View style={styles.fieldContainer}>
                <StyledText variant="body" weight="medium" style={styles.fieldLabel}>
                  作業日 *
                </StyledText>
                <TextInput
                  mode="outlined"
                  value={dayjs(field.value).format('YYYY年MM月DD日')}
                  editable={false}
                  style={styles.dateInput}
                  left={<TextInput.Icon icon="calendar" />}
                />
              </View>
            )}
          />

          {/* 現場選択 */}
          {workSites.length > 0 && (
            <Controller
              name="work_site_id"
              control={control}
              render={({ field }) => (
                <View style={styles.fieldContainer}>
                  <StyledText variant="body" weight="medium" style={styles.fieldLabel}>
                    作業現場
                  </StyledText>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={styles.chipsContainer}>
                      {workSites.map((site) => (
                        <Chip
                          key={site.id}
                          selected={field.value === site.id}
                          onPress={() => field.onChange(site.id)}
                          style={styles.chip}
                        >
                          {site.name}
                        </Chip>
                      ))}
                    </View>
                  </ScrollView>
                </View>
              )}
            />
          )}

          {/* 作業時間 */}
          <Controller
            name="work_hours"
            control={control}
            rules={VALIDATION_RULES.work_hours}
            render={({ field }) => (
              <View style={styles.fieldContainer}>
                <StyledText variant="body" weight="medium" style={styles.fieldLabel}>
                  作業時間 *
                </StyledText>
                <TextInput
                  mode="outlined"
                  placeholder="8"
                  value={field.value?.toString() || ''}
                  onChangeText={(text) => {
                    const value = parseFloat(text) || 0
                    field.onChange(value)
                  }}
                  onBlur={field.onBlur}
                  keyboardType="decimal-pad"
                  error={!!errors.work_hours}
                  right={<TextInput.Affix text="時間" />}
                  style={styles.hoursInput}
                />
                {errors.work_hours && (
                  <HelperText type="error">
                    {errors.work_hours.message}
                  </HelperText>
                )}
              </View>
            )}
          />
        </Card>

        {/* 作業内容セクション */}
        <Card variant="elevated" style={styles.section}>
          <StyledText variant="subtitle" weight="semibold" style={styles.sectionTitle}>
            🔨 作業内容 *
          </StyledText>
          
          <Controller
            name="work_content"
            control={control}
            rules={VALIDATION_RULES.work_content}
            render={({ field }) => (
              <View>
                <TextInput
                  mode="outlined"
                  placeholder="本日の作業内容を詳しく記入してください&#10;例：配管工事の準備作業、基礎コンクリート打設など"
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  multiline
                  numberOfLines={4}
                  error={!!errors.work_content}
                  style={styles.textArea}
                />
                <HelperText type={errors.work_content ? 'error' : 'info'}>
                  {errors.work_content ? errors.work_content.message : 
                   `${field.value.length}/1000文字`}
                </HelperText>
              </View>
            )}
          />
        </Card>

        {/* 進捗率セクション */}
        <Card variant="elevated" style={styles.section}>
          <StyledText variant="subtitle" weight="semibold" style={styles.sectionTitle}>
            📊 進捗率 *
          </StyledText>
          
          <Controller
            name="progress_rate"
            control={control}
            rules={VALIDATION_RULES.progress_rate}
            render={({ field }) => (
              <View>
                <SegmentedButtons
                  value={field.value.toString()}
                  onValueChange={handleProgressChange}
                  buttons={PROGRESS_OPTIONS}
                  style={styles.progressButtons}
                />
                <StyledText variant="caption" color="secondary" style={styles.progressHelp}>
                  本日の作業完了状況を選択してください
                </StyledText>
              </View>
            )}
          />
        </Card>

        {/* 添付ファイルセクション */}
        <AttachmentSection
          attachments={attachments}
          onAttachmentsChange={handleAttachmentsChange}
        />

        {/* 特記事項セクション */}
        <Card variant="elevated" style={styles.section}>
          <StyledText variant="subtitle" weight="semibold" style={styles.sectionTitle}>
            📝 特記事項
          </StyledText>
          
          <Controller
            name="special_notes"
            control={control}
            rules={VALIDATION_RULES.special_notes}
            render={({ field }) => (
              <View>
                <TextInput
                  mode="outlined"
                  placeholder="課題や改善点、明日の予定など&#10;例：材料の遅延、天候による作業中断、検査立会い予定など"
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  multiline
                  numberOfLines={3}
                  error={!!errors.special_notes}
                  style={styles.textArea}
                />
                <HelperText type={errors.special_notes ? 'error' : 'info'}>
                  {errors.special_notes ? errors.special_notes.message : 
                   `${field.value?.length || 0}/500文字`}
                </HelperText>
              </View>
            )}
          />
        </Card>

        {/* 送信ボタン */}
        <Surface style={styles.submitSection}>
          {allowDraft && (
            <StyledButton
              title="下書き保存"
              variant="outline"
              size="lg"
              onPress={saveDraft}
              loading={isSubmitting}
              disabled={!canSaveDraft || loading}
              style={styles.draftButton}
            />
          )}
          
          <StyledButton
            title={attachments.length > 0 ? 
              `日報を提出 (添付${attachments.length}件)` : 
              '日報を提出'
            }
            variant="primary"
            size="lg"
            elevated={true}
            onPress={submitReport}
            loading={isSubmitting}
            disabled={!canSubmit || loading}
            style={styles.submitButton}
          />
          
          <StyledText variant="caption" color="secondary" align="center" style={styles.submitNote}>
            {isEditing ? '更新後、管理者に通知されます' : '提出後、管理者に通知されます'}
          </StyledText>
        </Surface>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  scrollContainer: {
    flex: 1
  },
  scrollContent: {
    padding: Spacing.md,
    paddingBottom: Spacing['2xl']
  },
  
  // Sections
  section: {
    marginBottom: Spacing.lg,
    padding: Spacing.md
  },
  sectionTitle: {
    marginBottom: Spacing.md
  },
  
  // Fields
  fieldContainer: {
    marginBottom: Spacing.md
  },
  fieldLabel: {
    marginBottom: Spacing.sm
  },
  dateInput: {
    backgroundColor: Colors.surface
  },
  hoursInput: {
    backgroundColor: Colors.surface,
    width: 150
  },
  textArea: {
    backgroundColor: Colors.surface,
    minHeight: 100
  },
  
  // Chips
  chipsContainer: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.xs
  },
  chip: {
    marginRight: Spacing.sm
  },
  
  // Progress
  progressButtons: {
    marginBottom: Spacing.sm
  },
  progressHelp: {
    textAlign: 'center'
  },
  
  // Submit
  submitSection: {
    padding: Spacing.md,
    marginTop: Spacing.lg,
    gap: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg
  },
  draftButton: {
    minHeight: 48
  },
  submitButton: {
    minHeight: 56
  },
  submitNote: {
    marginTop: Spacing.sm
  }
})

export default ReportForm