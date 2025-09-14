import React, { useState } from 'react'
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native'
import { Colors, Spacing, Typography, BorderRadius, Shadows } from '@/constants/Colors'
import { StyledText, StyledButton, Card } from '@/components/ui'
import * as Haptics from 'expo-haptics'

interface AdditionalEstimateTabProps {
  projectId: string
  projectName: string
  userRole: string | null
  user: any
}

type EstimateStep = 'purpose' | 'evidence' | 'proposal'

interface PurposeOption {
  id: string
  title: string
  description: string
  icon: string
  color: string
}

interface EvidenceSource {
  id: string
  type: 'daily_report' | 'material_ocr' | 'attendance' | 'unit_price'
  title: string
  description: string
  date: string
  isSelected: boolean
}

export default function AdditionalEstimateTab({ projectId, projectName, userRole, user }: AdditionalEstimateTabProps) {
  const [currentStep, setCurrentStep] = useState<EstimateStep>('purpose')
  const [selectedPurpose, setSelectedPurpose] = useState<string>('')
  const [evidenceSources, setEvidenceSources] = useState<EvidenceSource[]>([
    {
      id: '1',
      type: 'daily_report',
      title: '12月15日 日報',
      description: '追加コンクリート打設作業',
      date: '2024-12-15',
      isSelected: false
    },
    {
      id: '2', 
      type: 'material_ocr',
      title: '材料追加購入レシート',
      description: 'ホームセンター太郎 - ¥45,800',
      date: '2024-12-14', 
      isSelected: false
    },
    {
      id: '3',
      type: 'attendance',
      title: '12月出面記録',
      description: '予定外残業 15時間',
      date: '2024-12-01',
      isSelected: false
    }
  ])

  // 権限チェック：追加・変更見積は親方・職長が作成可能
  const canCreateEstimate = userRole === 'parent' || userRole === 'lead'

  const purposeOptions: PurposeOption[] = [
    {
      id: 'additional_work',
      title: '追加工事',
      description: '当初計画にない工事の追加',
      icon: '🏗️',
      color: Colors.primary
    },
    {
      id: 'material_addition',
      title: '材料追加',
      description: '予定外の材料購入・使用',
      icon: '📦',
      color: Colors.warning
    },
    {
      id: 'labor_increase',
      title: '人件費増加',
      description: '残業・人員追加等による人件費増',
      icon: '👷',
      color: Colors.info
    },
    {
      id: 'other',
      title: 'その他',
      description: 'その他の変更・追加事項',
      icon: '📋',
      color: Colors.success
    }
  ]

  const getStepTitle = (): string => {
    switch (currentStep) {
      case 'purpose': return '用途選択'
      case 'evidence': return '対象期間・根拠選択'
      case 'proposal': return 'AI案提示・調整'
      default: return ''
    }
  }

  const getCurrentStepNumber = (): number => {
    switch (currentStep) {
      case 'purpose': return 1
      case 'evidence': return 2
      case 'proposal': return 3
      default: return 1
    }
  }

  const handleNext = async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      
      switch (currentStep) {
        case 'purpose':
          if (!selectedPurpose) {
            Alert.alert('選択エラー', '用途を選択してください')
            return
          }
          setCurrentStep('evidence')
          break
        case 'evidence':
          const selectedEvidence = evidenceSources.filter(e => e.isSelected)
          if (selectedEvidence.length === 0) {
            Alert.alert('選択エラー', '根拠となる資料を選択してください')
            return
          }
          setCurrentStep('proposal')
          break
        case 'proposal':
          Alert.alert('見積作成完了', '追加・変更見積書を生成し、チャットに投稿しました')
          // リセット
          setCurrentStep('purpose')
          setSelectedPurpose('')
          setEvidenceSources(prev => prev.map(e => ({...e, isSelected: false})))
          break
      }
    } catch (error) {
      console.log('Haptic error:', error)
    }
  }

  const handleBack = async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      
      switch (currentStep) {
        case 'evidence':
          setCurrentStep('purpose')
          break
        case 'proposal':
          setCurrentStep('evidence')
          break
      }
    } catch (error) {
      console.log('Haptic error:', error)
    }
  }

  const handlePurposeSelect = (purposeId: string) => {
    setSelectedPurpose(purposeId)
  }

  const handleEvidenceToggle = (evidenceId: string) => {
    setEvidenceSources(prev => 
      prev.map(e => 
        e.id === evidenceId ? {...e, isSelected: !e.isSelected} : e
      )
    )
  }

  const getEvidenceIcon = (type: EvidenceSource['type']): string => {
    switch (type) {
      case 'daily_report': return '📝'
      case 'material_ocr': return '📷'
      case 'attendance': return '👥'
      case 'unit_price': return '💰'
      default: return '📄'
    }
  }

  const renderStepProgress = () => (
    <View style={styles.progressContainer}>
      <StyledText variant="subtitle" weight="semibold" color="text" style={styles.stepTitle}>
        {getCurrentStepNumber()}/3 {getStepTitle()}
      </StyledText>
      <View style={styles.progressBar}>
        {[1, 2, 3].map((step) => (
          <View key={step} style={[
            styles.progressDot,
            step <= getCurrentStepNumber() && styles.progressDotActive
          ]} />
        ))}
      </View>
    </View>
  )

  const renderPurposeStep = () => (
    <ScrollView style={styles.stepContent} showsVerticalScrollIndicator={false}>
      <Card variant="elevated" style={styles.stepCard}>
        <StyledText variant="body" color="secondary" style={styles.stepDescription}>
          追加・変更見積の用途を選択してください
        </StyledText>
        
        <View style={styles.purposeGrid}>
          {purposeOptions.map((option) => (
            <TouchableOpacity
              key={option.id}
              style={[
                styles.purposeOption,
                selectedPurpose === option.id && styles.purposeOptionSelected,
                { borderColor: option.color }
              ]}
              onPress={() => handlePurposeSelect(option.id)}
              activeOpacity={0.7}
            >
              <StyledText variant="heading2" style={styles.purposeIcon}>
                {option.icon}
              </StyledText>
              <StyledText variant="subtitle" weight="semibold" color="text" numberOfLines={1}>
                {option.title}
              </StyledText>
              <StyledText variant="caption" color="secondary" numberOfLines={2} style={styles.purposeDescription}>
                {option.description}
              </StyledText>
              {selectedPurpose === option.id && (
                <View style={[styles.selectedIndicator, { backgroundColor: option.color }]}>
                  <StyledText variant="caption" color="onPrimary" weight="bold">✓</StyledText>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </Card>
    </ScrollView>
  )

  const renderEvidenceStep = () => (
    <ScrollView style={styles.stepContent} showsVerticalScrollIndicator={false}>
      <Card variant="elevated" style={styles.stepCard}>
        <StyledText variant="body" color="secondary" style={styles.stepDescription}>
          見積根拠となる資料を選択してください（複数選択可）
        </StyledText>
        
        <View style={styles.evidenceList}>
          {evidenceSources.map((evidence) => (
            <TouchableOpacity
              key={evidence.id}
              style={[
                styles.evidenceItem,
                evidence.isSelected && styles.evidenceItemSelected
              ]}
              onPress={() => handleEvidenceToggle(evidence.id)}
              activeOpacity={0.7}
            >
              <View style={styles.evidenceContent}>
                <View style={styles.evidenceHeader}>
                  <StyledText variant="title" style={styles.evidenceIcon}>
                    {getEvidenceIcon(evidence.type)}
                  </StyledText>
                  <View style={styles.evidenceInfo}>
                    <StyledText variant="body" weight="medium" color="text">
                      {evidence.title}
                    </StyledText>
                    <StyledText variant="caption" color="secondary">
                      {evidence.description}
                    </StyledText>
                  </View>
                  <StyledText variant="caption" color="tertiary">
                    {evidence.date}
                  </StyledText>
                </View>
              </View>
              <View style={[
                styles.evidenceCheckbox,
                evidence.isSelected && styles.evidenceCheckboxSelected
              ]}>
                {evidence.isSelected && (
                  <StyledText variant="caption" color="onPrimary">✓</StyledText>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>
        
        <StyledText variant="caption" color="secondary" style={styles.evidenceNote}>
          💡 AIが選択した資料を分析して、適切な見積金額を算出します
        </StyledText>
      </Card>
    </ScrollView>
  )

  const renderProposalStep = () => (
    <ScrollView style={styles.stepContent} showsVerticalScrollIndicator={false}>
      <Card variant="premium" elevationLevel={3} glowEffect={true} style={styles.stepCard}>
        <StyledText variant="subtitle" weight="semibold" style={styles.proposalTitle}>
          🤖 AI見積提案
        </StyledText>
        
        <View style={styles.proposalSummary}>
          <View style={styles.summaryItem}>
            <StyledText variant="body" color="text">用途</StyledText>
            <StyledText variant="body" weight="medium" color="text">
              {purposeOptions.find(p => p.id === selectedPurpose)?.title || ''}
            </StyledText>
          </View>
          <View style={styles.summaryItem}>
            <StyledText variant="body" color="text">見積金額</StyledText>
            <StyledText variant="subtitle" weight="bold" color="success">
              ¥187,500
            </StyledText>
          </View>
        </View>

        <View style={styles.proposalDetails}>
          <StyledText variant="body" weight="semibold" color="text">
            📋 内訳明細
          </StyledText>
          {[
            { item: '追加労務費', amount: 125000 },
            { item: '材料費', amount: 45800 },
            { item: '諸経費', amount: 16700 }
          ].map((item, index) => (
            <View key={index} style={styles.detailItem}>
              <StyledText variant="body" color="text">{item.item}</StyledText>
              <StyledText variant="body" weight="semibold" color="primary">
                ¥{item.amount.toLocaleString()}
              </StyledText>
            </View>
          ))}
        </View>

        <View style={styles.adjustmentArea}>
          <StyledText variant="body" weight="semibold" color="text">
            🔧 調整・備考
          </StyledText>
          <TextInput
            style={styles.adjustmentInput}
            placeholder="金額調整や備考があれば入力してください"
            placeholderTextColor={Colors.textTertiary}
            multiline
          />
        </View>

        <View style={styles.outputOptions}>
          <StyledText variant="body" weight="semibold" color="text">
            📤 出力・送信
          </StyledText>
          <View style={styles.outputButtons}>
            <StyledButton
              title="チャットに投稿"
              variant="primary"
              size="md"
              onPress={() => Alert.alert('投稿完了', '見積書をチャットに投稿しました')}
              style={styles.outputButton}
            />
            <StyledButton
              title="PDF保存"
              variant="outline"
              size="md"
              onPress={() => Alert.alert('保存完了', 'PDF見積書を保存しました')}
              style={styles.outputButton}
            />
          </View>
        </View>
      </Card>
    </ScrollView>
  )

  const renderStepContent = () => {
    switch (currentStep) {
      case 'purpose': return renderPurposeStep()
      case 'evidence': return renderEvidenceStep()
      case 'proposal': return renderProposalStep()
      default: return renderPurposeStep()
    }
  }

  if (!canCreateEstimate) {
    return (
      <View style={styles.container}>
        <Card variant="outlined" style={styles.noAccessCard}>
          <StyledText variant="heading3" align="center" style={styles.noAccessIcon}>
            🔒
          </StyledText>
          <StyledText variant="title" weight="semibold" align="center" color="text">
            追加・変更見積
          </StyledText>
          <StyledText variant="body" color="secondary" align="center" style={styles.noAccessDescription}>
            この機能は親方または職長のみが利用できます
          </StyledText>
        </Card>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {/* ステップ進捗 */}
      {renderStepProgress()}

      {/* ステップコンテンツ */}
      {renderStepContent()}

      {/* ナビゲーションボタン */}
      <View style={styles.navigationButtons}>
        {currentStep !== 'purpose' && (
          <StyledButton
            title="戻る"
            variant="outline"
            size="md"
            onPress={handleBack}
            style={styles.backButton}
          />
        )}
        <StyledButton
          title={currentStep === 'proposal' ? '完了' : '次へ'}
          variant="primary"
          size="md"
          onPress={handleNext}
          style={styles.nextButton}
        />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  progressContainer: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.surfaceElevated,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    alignItems: 'center',
  },
  stepTitle: {
    marginBottom: Spacing.sm,
  },
  progressBar: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.borderLight,
  },
  progressDotActive: {
    backgroundColor: Colors.primary,
  },
  stepContent: {
    flex: 1,
    padding: Spacing.md,
  },
  stepCard: {
    marginBottom: Spacing.lg,
  },
  stepDescription: {
    marginBottom: Spacing.lg,
    textAlign: 'center',
    lineHeight: 20,
  },
  purposeGrid: {
    gap: Spacing.md,
  },
  purposeOption: {
    alignItems: 'center',
    padding: Spacing.lg,
    borderWidth: 2,
    borderColor: Colors.border,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.backgroundSecondary,
    position: 'relative',
  },
  purposeOptionSelected: {
    backgroundColor: Colors.primaryLight,
  },
  purposeIcon: {
    fontSize: 32,
    marginBottom: Spacing.sm,
  },
  purposeDescription: {
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
  selectedIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  evidenceList: {
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  evidenceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.backgroundSecondary,
  },
  evidenceItemSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  evidenceContent: {
    flex: 1,
  },
  evidenceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  evidenceIcon: {
    fontSize: 20,
  },
  evidenceInfo: {
    flex: 1,
    gap: Spacing.xs,
  },
  evidenceCheckbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: Colors.border,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: Spacing.sm,
  },
  evidenceCheckboxSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  evidenceNote: {
    textAlign: 'center',
    fontStyle: 'italic',
  },
  proposalTitle: {
    marginBottom: Spacing.lg,
    textAlign: 'center',
  },
  proposalSummary: {
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  summaryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  proposalDetails: {
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  detailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: BorderRadius.sm,
  },
  adjustmentArea: {
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  adjustmentInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    minHeight: 80,
    fontSize: Typography.base,
    color: Colors.text,
    backgroundColor: Colors.backgroundSecondary,
    textAlignVertical: 'top',
  },
  outputOptions: {
    gap: Spacing.sm,
  },
  outputButtons: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  outputButton: {
    flex: 1,
  },
  navigationButtons: {
    flexDirection: 'row',
    gap: Spacing.sm,
    padding: Spacing.md,
    backgroundColor: Colors.surfaceElevated,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  backButton: {
    flex: 1,
  },
  nextButton: {
    flex: 2,
  },
  noAccessCard: {
    alignItems: 'center',
    paddingVertical: Spacing['2xl'],
    margin: Spacing.md,
  },
  noAccessIcon: {
    fontSize: 48,
    marginBottom: Spacing.lg,
  },
  noAccessDescription: {
    marginTop: Spacing.sm,
  },
})