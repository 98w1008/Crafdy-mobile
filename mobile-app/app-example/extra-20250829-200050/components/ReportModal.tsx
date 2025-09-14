import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Dimensions,
} from 'react-native'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'

interface ReportFormData {
  workDate: string
  workMembers: string
  workContent: string
  progressRate: number
  weatherCondition: string
  safetyNotes: string
  materialUsed: string
  nextDayPlan: string
}

interface ReportModalProps {
  visible: boolean
  onClose: () => void
  projectId: string
  onReportCreated?: (reportId: string, reportData: ReportFormData) => void
}

interface Step {
  id: number
  title: string
  subtitle: string
  icon: string
}

export default function ReportModal({
  visible,
  onClose,
  projectId,
  onReportCreated,
}: ReportModalProps) {
  const { user } = useAuth()
  const [currentStep, setCurrentStep] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  
  const [formData, setFormData] = useState<ReportFormData>({
    workDate: new Date().toISOString().split('T')[0],
    workMembers: '',
    workContent: '',
    progressRate: 0,
    weatherCondition: '',
    safetyNotes: '',
    materialUsed: '',
    nextDayPlan: '',
  })

  const steps: Step[] = [
    {
      id: 1,
      title: '基本情報',
      subtitle: '作業日・メンバーを入力',
      icon: '📅',
    },
    {
      id: 2,
      title: '作業内容',
      subtitle: '今日の作業を詳しく記録',
      icon: '🔨',
    },
    {
      id: 3,
      title: '進捗・状況',
      subtitle: '進捗率・天候・安全確認',
      icon: '📊',
    },
    {
      id: 4,
      title: '確認・送信',
      subtitle: '内容を確認して送信',
      icon: '✅',
    },
  ]

  useEffect(() => {
    if (visible) {
      // モーダルが開かれた時の初期化
      setCurrentStep(1)
      setFormData(prev => ({
        ...prev,
        workDate: new Date().toISOString().split('T')[0],
      }))
    }
  }, [visible])

  const handleNext = () => {
    if (validateCurrentStep()) {
      if (currentStep < steps.length) {
        setCurrentStep(currentStep + 1)
      }
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const validateCurrentStep = (): boolean => {
    switch (currentStep) {
      case 1:
        if (!formData.workDate.trim()) {
          Alert.alert('入力エラー', '作業日を入力してください')
          return false
        }
        if (!formData.workMembers.trim()) {
          Alert.alert('入力エラー', '作業メンバーを入力してください')
          return false
        }
        return true
      
      case 2:
        if (!formData.workContent.trim()) {
          Alert.alert('入力エラー', '作業内容を入力してください')
          return false
        }
        return true
      
      case 3:
        if (formData.progressRate < 0 || formData.progressRate > 100) {
          Alert.alert('入力エラー', '進捗率は0-100の範囲で入力してください')
          return false
        }
        return true
      
      default:
        return true
    }
  }

  const handleSubmit = async () => {
    if (!user) {
      Alert.alert('エラー', 'ユーザー情報が取得できません')
      return
    }

    setSubmitting(true)
    try {
      // 日報データをreportsテーブルに保存
      const reportContent = `
【作業日報】
📅 作業日: ${formData.workDate}
👥 作業メンバー: ${formData.workMembers}
🔨 作業内容: ${formData.workContent}
📊 進捗率: ${formData.progressRate}%
${formData.weatherCondition ? `🌤️ 天候: ${formData.weatherCondition}` : ''}
${formData.safetyNotes ? `⛑️ 安全確認: ${formData.safetyNotes}` : ''}
${formData.materialUsed ? `📦 使用材料: ${formData.materialUsed}` : ''}
${formData.nextDayPlan ? `📋 明日の予定: ${formData.nextDayPlan}` : ''}
      `.trim()

      const { data, error } = await supabase.from('reports').insert({
        project_id: projectId,
        user_id: user.id,
        content: reportContent,
        work_date: formData.workDate,
        man_hours: 8.0, // デフォルト工数
      }).select().single()

      if (error) throw error

      Alert.alert('完了', '日報が正常に送信されました', [
        {
          text: 'OK',
          onPress: () => {
            if (onReportCreated && data?.id) {
              onReportCreated(data.id, formData)
            }
            onClose()
          }
        }
      ])

    } catch (error) {
      console.error('Error submitting report:', error)
      Alert.alert('エラー', '日報の送信に失敗しました')
    } finally {
      setSubmitting(false)
    }
  }

  const updateFormData = (field: keyof ReportFormData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      {steps.map((step, index) => (
        <View key={step.id} style={styles.stepContainer}>
          <View style={[
            styles.stepCircle,
            currentStep === step.id && styles.activeStepCircle,
            currentStep > step.id && styles.completedStepCircle,
          ]}>
            <Text style={[
              styles.stepIcon,
              currentStep === step.id && styles.activeStepIcon,
              currentStep > step.id && styles.completedStepIcon,
            ]}>
              {currentStep > step.id ? '✓' : step.icon}
            </Text>
          </View>
          {index < steps.length - 1 && (
            <View style={[
              styles.stepLine,
              currentStep > step.id && styles.completedStepLine,
            ]} />
          )}
        </View>
      ))}
    </View>
  )

  const renderStep1 = () => (
    <ScrollView style={styles.stepContent} showsVerticalScrollIndicator={false}>
      <Text style={styles.stepTitle}>{steps[0].title}</Text>
      <Text style={styles.stepSubtitle}>{steps[0].subtitle}</Text>
      
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>作業日 *</Text>
        <TextInput
          style={styles.textInput}
          value={formData.workDate}
          onChangeText={(text) => updateFormData('workDate', text)}
          placeholder="YYYY-MM-DD"
          placeholderTextColor="#6B7280"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>作業メンバー *</Text>
        <TextInput
          style={styles.textInput}
          value={formData.workMembers}
          onChangeText={(text) => updateFormData('workMembers', text)}
          placeholder="田中、佐藤、山田 (3名)"
          placeholderTextColor="#6B7280"
          multiline
        />
      </View>

      <Text style={styles.helperText}>
        * 必須項目です。作業に参加したメンバーの名前を入力してください。
      </Text>
    </ScrollView>
  )

  const renderStep2 = () => (
    <ScrollView style={styles.stepContent} showsVerticalScrollIndicator={false}>
      <Text style={styles.stepTitle}>{steps[1].title}</Text>
      <Text style={styles.stepSubtitle}>{steps[1].subtitle}</Text>
      
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>作業内容 *</Text>
        <TextInput
          style={[styles.textInput, styles.multilineInput]}
          value={formData.workContent}
          onChangeText={(text) => updateFormData('workContent', text)}
          placeholder="今日行った作業の詳細を記録してください..."
          placeholderTextColor="#6B7280"
          multiline
          numberOfLines={6}
          textAlignVertical="top"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>使用材料・機材</Text>
        <TextInput
          style={styles.textInput}
          value={formData.materialUsed}
          onChangeText={(text) => updateFormData('materialUsed', text)}
          placeholder="コンクリート、鉄筋、クレーンなど"
          placeholderTextColor="#6B7280"
          multiline
        />
      </View>
    </ScrollView>
  )

  const renderStep3 = () => (
    <ScrollView style={styles.stepContent} showsVerticalScrollIndicator={false}>
      <Text style={styles.stepTitle}>{steps[2].title}</Text>
      <Text style={styles.stepSubtitle}>{steps[2].subtitle}</Text>
      
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>進捗率 (%) *</Text>
        <TextInput
          style={styles.textInput}
          value={formData.progressRate.toString()}
          onChangeText={(text) => {
            const num = parseInt(text) || 0
            updateFormData('progressRate', Math.max(0, Math.min(100, num)))
          }}
          placeholder="85"
          placeholderTextColor="#6B7280"
          keyboardType="numeric"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>天候状況</Text>
        <TextInput
          style={styles.textInput}
          value={formData.weatherCondition}
          onChangeText={(text) => updateFormData('weatherCondition', text)}
          placeholder="晴れ、曇り、雨など"
          placeholderTextColor="#6B7280"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>安全確認事項</Text>
        <TextInput
          style={[styles.textInput, styles.multilineInput]}
          value={formData.safetyNotes}
          onChangeText={(text) => updateFormData('safetyNotes', text)}
          placeholder="ヒヤリハット、安全装備確認、注意事項など"
          placeholderTextColor="#6B7280"
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>明日の作業予定</Text>
        <TextInput
          style={[styles.textInput, styles.multilineInput]}
          value={formData.nextDayPlan}
          onChangeText={(text) => updateFormData('nextDayPlan', text)}
          placeholder="明日予定している作業内容"
          placeholderTextColor="#6B7280"
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />
      </View>
    </ScrollView>
  )

  const renderStep4 = () => (
    <ScrollView style={styles.stepContent} showsVerticalScrollIndicator={false}>
      <Text style={styles.stepTitle}>{steps[3].title}</Text>
      <Text style={styles.stepSubtitle}>{steps[3].subtitle}</Text>
      
      <View style={styles.confirmationContainer}>
        <View style={styles.confirmationItem}>
          <Text style={styles.confirmationLabel}>作業日</Text>
          <Text style={styles.confirmationValue}>{formData.workDate}</Text>
        </View>
        
        <View style={styles.confirmationItem}>
          <Text style={styles.confirmationLabel}>作業メンバー</Text>
          <Text style={styles.confirmationValue}>{formData.workMembers}</Text>
        </View>
        
        <View style={styles.confirmationItem}>
          <Text style={styles.confirmationLabel}>進捗率</Text>
          <Text style={styles.confirmationValue}>{formData.progressRate}%</Text>
        </View>
        
        <View style={styles.confirmationItem}>
          <Text style={styles.confirmationLabel}>作業内容</Text>
          <Text style={styles.confirmationValue}>{formData.workContent}</Text>
        </View>

        {formData.weatherCondition && (
          <View style={styles.confirmationItem}>
            <Text style={styles.confirmationLabel}>天候</Text>
            <Text style={styles.confirmationValue}>{formData.weatherCondition}</Text>
          </View>
        )}
      </View>
      
      <Text style={styles.confirmationNote}>
        上記の内容でチャットに日報を送信します。よろしいですか？
      </Text>
    </ScrollView>
  )

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1: return renderStep1()
      case 2: return renderStep2()
      case 3: return renderStep3()
      case 4: return renderStep4()
      default: return null
    }
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>日報作成</Text>
          <View style={styles.headerRight} />
        </View>

        {/* Step Indicator */}
        {renderStepIndicator()}

        {/* Step Content */}
        <View style={styles.content}>
          {renderCurrentStep()}
        </View>

        {/* Navigation Buttons */}
        <View style={styles.navigationContainer}>
          <TouchableOpacity
            style={[styles.navButton, styles.backButton, currentStep === 1 && styles.disabledButton]}
            onPress={handleBack}
            disabled={currentStep === 1}
          >
            <Text style={[styles.navButtonText, styles.backButtonText, currentStep === 1 && styles.disabledButtonText]}>
              戻る
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.navButton, styles.nextButton]}
            onPress={currentStep === steps.length ? handleSubmit : handleNext}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={[styles.navButtonText, styles.nextButtonText]}>
                {currentStep === steps.length ? '送信' : '次へ'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

const { width: screenWidth } = Dimensions.get('window')

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F6F8',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  closeButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 18,
    color: '#6B7280',
    fontWeight: 'bold',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1B1B1F',
  },
  headerRight: {
    width: 32,
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    backgroundColor: '#FFFFFF',
    marginBottom: 8,
  },
  stepContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeStepCircle: {
    backgroundColor: '#0E73E0',
  },
  completedStepCircle: {
    backgroundColor: '#10B981',
  },
  stepIcon: {
    fontSize: 16,
    color: '#6B7280',
  },
  activeStepIcon: {
    color: '#FFFFFF',
  },
  completedStepIcon: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  stepLine: {
    width: 32,
    height: 2,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 4,
  },
  completedStepLine: {
    backgroundColor: '#10B981',
  },
  content: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 24,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1B1B1F',
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 32,
  },
  inputGroup: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1B1B1F',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1B1B1F',
  },
  multilineInput: {
    height: 120,
    textAlignVertical: 'top',
  },
  helperText: {
    fontSize: 14,
    color: '#6B7280',
    fontStyle: 'italic',
    marginTop: 16,
  },
  confirmationContainer: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 20,
    marginBottom: 24,
  },
  confirmationItem: {
    marginBottom: 16,
  },
  confirmationLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 4,
  },
  confirmationValue: {
    fontSize: 16,
    color: '#1B1B1F',
    lineHeight: 22,
  },
  confirmationNote: {
    fontSize: 16,
    color: '#374151',
    textAlign: 'center',
    lineHeight: 24,
  },
  navigationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingBottom: 40,
    backgroundColor: '#FFFFFF',
  },
  navButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButton: {
    backgroundColor: '#F3F4F6',
    marginRight: 12,
  },
  nextButton: {
    backgroundColor: '#0E73E0',
    marginLeft: 12,
  },
  disabledButton: {
    backgroundColor: '#E5E7EB',
  },
  navButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  backButtonText: {
    color: '#6B7280',
  },
  nextButtonText: {
    color: '#FFFFFF',
  },
  disabledButtonText: {
    color: '#9CA3AF',
  },
})