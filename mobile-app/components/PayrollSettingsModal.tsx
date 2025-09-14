import React, { useState, useEffect } from 'react'
import {
  Modal,
  View,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ViewStyle,
} from 'react-native'
import { Picker } from '@react-native-picker/picker'
import StyledText from './ui/StyledText'
import StyledButton from './ui/StyledButton'
import Card from './ui/Card'
import { useColors, useSpacing } from '@/theme/ThemeProvider'
import { PayrollSettingsFormData } from '../types/payroll'

interface PayrollSettingsModalProps {
  visible: boolean
  onClose: () => void
  onSave: (data: PayrollSettingsFormData) => Promise<void>
  initialData?: PayrollSettingsFormData
  isLoading?: boolean
  canEdit?: boolean // 権限制御
}

export default function PayrollSettingsModal({
  visible,
  onClose,
  onSave,
  initialData,
  isLoading = false,
  canEdit = true,
}: PayrollSettingsModalProps) {
  const colors = useColors()
  const spacing = useSpacing()

  // フォームデータ
  const [formData, setFormData] = useState<PayrollSettingsFormData>({
    payroll_closing_day: initialData?.payroll_closing_day || 20,
    payroll_pay_day: initialData?.payroll_pay_day || 25,
  })

  const [isSaving, setIsSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  // 初期データの反映
  useEffect(() => {
    if (initialData) {
      setFormData(initialData)
      setHasChanges(false)
    }
  }, [initialData])

  // フォームデータ変更の監視
  useEffect(() => {
    const hasDataChanged = 
      initialData &&
      (formData.payroll_closing_day !== initialData.payroll_closing_day ||
       formData.payroll_pay_day !== initialData.payroll_pay_day)
    
    setHasChanges(!!hasDataChanged)
  }, [formData, initialData])

  // バリデーション
  const validateForm = (): string | null => {
    if (formData.payroll_closing_day < 1 || formData.payroll_closing_day > 31) {
      return '締め日は1日から31日の間で設定してください'
    }
    if (formData.payroll_pay_day < 1 || formData.payroll_pay_day > 31) {
      return '支払日は1日から31日の間で設定してください'
    }
    if (formData.payroll_closing_day === formData.payroll_pay_day) {
      return '締め日と支払日は異なる日付を設定してください'
    }
    return null
  }

  // 保存処理
  const handleSave = async () => {
    if (!canEdit) {
      Alert.alert('権限エラー', 'この設定を変更する権限がありません')
      return
    }

    const validationError = validateForm()
    if (validationError) {
      Alert.alert('入力エラー', validationError)
      return
    }

    setIsSaving(true)
    try {
      await onSave(formData)
      setHasChanges(false)
      onClose()
    } catch (error) {
      console.error('Failed to save payroll settings:', error)
      Alert.alert('保存エラー', '設定の保存に失敗しました。もう一度お試しください。')
    } finally {
      setIsSaving(false)
    }
  }

  // キャンセル処理
  const handleCancel = () => {
    if (hasChanges) {
      Alert.alert(
        '変更を破棄',
        '変更内容が保存されていません。破棄してもよろしいですか？',
        [
          { text: 'キャンセル', style: 'cancel' },
          { 
            text: '破棄', 
            style: 'destructive', 
            onPress: () => {
              if (initialData) {
                setFormData(initialData)
              }
              setHasChanges(false)
              onClose()
            }
          },
        ]
      )
    } else {
      onClose()
    }
  }

  // 日付選択肢の生成
  const generateDayOptions = () => {
    return Array.from({ length: 31 }, (_, i) => {
      const day = i + 1
      return (
        <Picker.Item
          key={day}
          label={`${day}日`}
          value={day}
        />
      )
    })
  }

  const modalContainerStyle: ViewStyle = {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[4],
  }

  const contentStyle: ViewStyle = {
    backgroundColor: colors.surface,
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
  }

  const headerStyle: ViewStyle = {
    paddingHorizontal: spacing[6],
    paddingTop: spacing[6],
    paddingBottom: spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  }

  const bodyStyle: ViewStyle = {
    paddingHorizontal: spacing[6],
    paddingVertical: spacing[4],
  }

  const sectionStyle: ViewStyle = {
    marginBottom: spacing[6],
  }

  const pickerContainerStyle: ViewStyle = {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.background.primary,
    marginTop: spacing[2],
  }

  const pickerStyle: ViewStyle = {
    height: 50,
  }

  const footerStyle: ViewStyle = {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[6],
    paddingVertical: spacing[4],
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing[3],
  }

  const helpTextStyle: ViewStyle = {
    backgroundColor: colors.background.secondary,
    padding: spacing[4],
    borderRadius: 8,
    marginTop: spacing[4],
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={handleCancel}
    >
      <KeyboardAvoidingView
        style={modalContainerStyle}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={contentStyle}>
          {/* ヘッダー */}
          <View style={headerStyle}>
            <StyledText variant="heading3" weight="semibold">
              {initialData ? '給与設定の変更' : '給与設定の初期設定'}
            </StyledText>
            <StyledText variant="caption" color="secondary" style={{ marginTop: spacing[2] }}>
              {!initialData && '勤怠集計機能を使用するために、締め日と支払日を設定してください'}
            </StyledText>
          </View>

          {/* ボディ */}
          <ScrollView style={bodyStyle} showsVerticalScrollIndicator={false}>
            {/* 締め日設定 */}
            <View style={sectionStyle}>
              <StyledText variant="subtitle" weight="medium" color="text">
                締め日
              </StyledText>
              <StyledText variant="caption" color="secondary" style={{ marginTop: spacing[1] }}>
                毎月の勤怠集計を締め切る日を設定します
              </StyledText>
              
              <View style={pickerContainerStyle}>
                <Picker
                  selectedValue={formData.payroll_closing_day}
                  onValueChange={(value) => 
                    setFormData(prev => ({ ...prev, payroll_closing_day: value }))
                  }
                  style={pickerStyle}
                  enabled={canEdit && !isLoading}
                >
                  {generateDayOptions()}
                </Picker>
              </View>
            </View>

            {/* 支払日設定 */}
            <View style={sectionStyle}>
              <StyledText variant="subtitle" weight="medium" color="text">
                支払日
              </StyledText>
              <StyledText variant="caption" color="secondary" style={{ marginTop: spacing[1] }}>
                給与の支払予定日を設定します
              </StyledText>
              
              <View style={pickerContainerStyle}>
                <Picker
                  selectedValue={formData.payroll_pay_day}
                  onValueChange={(value) => 
                    setFormData(prev => ({ ...prev, payroll_pay_day: value }))
                  }
                  style={pickerStyle}
                  enabled={canEdit && !isLoading}
                >
                  {generateDayOptions()}
                </Picker>
              </View>
            </View>

            {/* ヘルプテキスト */}
            <View style={helpTextStyle}>
              <StyledText variant="caption" color="secondary">
                💡 設定のポイント{'\n'}
                • 締め日: 集計期間の終了日（例: 20日締めの場合、21日〜翌月20日が対象）{'\n'}
                • 支払日: 給与の支払予定日（通常は締め日の翌月）{'\n'}
                • 設定後は会社設定からのみ変更可能です
              </StyledText>
            </View>

            {/* 権限警告 */}
            {!canEdit && (
              <View style={[helpTextStyle, { backgroundColor: colors.semantic.warning + '20', marginTop: spacing[4] }]}>
                <StyledText variant="caption" color="warning">
                  ⚠️ この設定を変更する権限がありません。会社の管理者にお問い合わせください。
                </StyledText>
              </View>
            )}
          </ScrollView>

          {/* フッター */}
          <View style={footerStyle}>
            <StyledButton
              title="キャンセル"
              variant="secondary"
              size="md"
              onPress={handleCancel}
              disabled={isSaving}
              style={{ flex: 1 }}
            />
            
            <StyledButton
              title={initialData ? '変更を保存' : '設定を保存'}
              variant="primary"
              size="md"
              onPress={handleSave}
              disabled={!canEdit || isSaving || !hasChanges}
              loading={isSaving}
              style={{ flex: 1 }}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}