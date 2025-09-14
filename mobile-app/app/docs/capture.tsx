import React, { useState, useCallback } from 'react'
import {
  View,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  Image
} from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { useAuth, useRole } from '@/contexts/AuthContext'
import { Colors, Spacing, Typography, BorderRadius, Shadows } from '@/constants/Colors'
import { StyledText, StyledButton, Card } from '@/components/ui'
import { Surface, Chip, SegmentedButtons, FAB, Portal, Modal } from 'react-native-paper'
import * as ImagePicker from 'expo-image-picker'
import * as DocumentPicker from 'expo-document-picker'
import * as Haptics from 'expo-haptics'

import { DocumentUploader, UploadedFile } from '@/components/upload'
import { DocType, getDocTypeDisplayName, getDocTypeIcon } from '@/src/utils/classifyDoc'

// =============================================================================
// TYPES
// =============================================================================

type CaptureMode = 'camera' | 'gallery' | 'document'
type DocumentType = 'receipt' | 'delivery_slip' | 'mixed'

interface DocumentGuide {
  title: string
  description: string
  tips: string[]
  icon: string
  color: string
}

interface Project {
  id: string
  name: string
  location: string
}

interface ProcessingResult {
  id: string
  files: UploadedFile[]
  ocrResults?: Record<string, any>
  project?: Project
  category?: 'site' | 'company'
}

// =============================================================================
// CONSTANTS
// =============================================================================

const DOCUMENT_GUIDES: Record<DocumentType, DocumentGuide> = {
  receipt: {
    title: 'レシート撮影',
    description: '経費として計上するレシートを撮影・選択してください',
    tips: [
      '文字がはっきり見えるように',
      '影がかからないように', 
      'レシート全体が画面に収まるように',
      '複数のレシートは個別に撮影'
    ],
    icon: 'receipt',
    color: '#4CAF50'
  },
  delivery_slip: {
    title: '搬入・納品書撮影',
    description: '搬入書や納品書を撮影・選択してください',
    tips: [
      '日付と数量が明確に見えるように',
      '複数ページある場合は1枚ずつ',
      '材料名・品番が読めるように',
      '業者名が含まれるように'
    ],
    icon: 'truck-delivery',
    color: '#2196F3'
  },
  mixed: {
    title: '複数ドキュメント',
    description: '複数の種類のドキュメントを同時に撮影・選択できます',
    tips: [
      '各ファイルのタイプを確認',
      'ファイル名で自動分類されます',
      '必要に応じて手動修正可能',
      '一度に最大10ファイルまで'
    ],
    icon: 'file-multiple',
    color: '#FF9800'
  }
}

// =============================================================================
// COMPONENT  
// =============================================================================

export default function DocumentCaptureScreen() {
  const params = useLocalSearchParams()
  const initialType = (params.type as DocumentType) || 'mixed'
  
  const { user, profile } = useAuth()
  const userRole = useRole()
  
  const [documentType, setDocumentType] = useState<DocumentType>(initialType)
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [step, setStep] = useState<'capture' | 'processing' | 'selection' | 'confirmation'>('capture')
  const [ocrResults, setOcrResults] = useState<Record<string, any>>({})
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [expenseCategory, setExpenseCategory] = useState<'site' | 'company' | null>(null)
  const [loading, setLoading] = useState(false)

  const guide = DOCUMENT_GUIDES[documentType]

  // サンプルプロジェクトデータ
  const projects: Project[] = [
    {
      id: '1',
      name: '新宿オフィスビル建設',
      location: '東京都新宿区'
    },
    {
      id: '2', 
      name: 'マンション改修工事',
      location: '神奈川県横浜市'
    },
    {
      id: '3',
      name: '商業施設リニューアル',
      location: '埼玉県さいたま市'
    }
  ]

  // ドキュメントタイプ別の許可されるDocType
  const getAllowedDocTypes = (docType: DocumentType): DocType[] => {
    switch (docType) {
      case 'receipt':
        return ['receipt', 'photo']
      case 'delivery_slip':
        return ['delivery_slip', 'photo', 'spec']
      case 'mixed':
      default:
        return ['receipt', 'delivery_slip', 'contract', 'drawing', 'spec', 'photo', 'invoice']
    }
  }

  // ファイル変更ハンドラ
  const handleFilesChange = useCallback((newFiles: UploadedFile[]) => {
    setFiles(newFiles)
    
    // ファイルが追加された場合、OCR処理を開始
    if (newFiles.length > files.length) {
      processOCR(newFiles)
    }
  }, [files.length])

  // OCR処理（モック）
  const processOCR = async (filesToProcess: UploadedFile[]) => {
    setLoading(true)
    setStep('processing')

    try {
      // 処理時間をシミュレート
      await new Promise(resolve => setTimeout(resolve, 2000))

      // 各ファイルに対してOCRモックデータを生成
      const results: Record<string, any> = {}
      
      filesToProcess.forEach(file => {
        switch (file.docType) {
          case 'receipt':
            results[file.id] = {
              store_name: 'ホームセンター太郎',
              total_amount: Math.floor(Math.random() * 20000) + 1000,
              date: new Date().toLocaleDateString('ja-JP'),
              items: [
                '木材 2x4 10本',
                'ネジ M6x40 50本', 
                '塗料 白色 1L',
                '工具レンタル'
              ]
            }
            break
            
          case 'delivery_slip':
            results[file.id] = {
              supplier_name: '建材商事株式会社',
              delivery_number: `D-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9999)).padStart(4, '0')}`,
              date: new Date().toLocaleDateString('ja-JP'),
              items: [
                'コンクリート 5m³',
                '鉄筋 D13 50本',
                'セメント 20袋', 
                '砕石 2t'
              ]
            }
            break

          default:
            results[file.id] = {
              processed: true,
              confidence: 0.85
            }
        }
      })

      setOcrResults(results)
      setStep('selection')
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)

    } catch (error) {
      console.error('OCR処理エラー:', error)
      Alert.alert('エラー', 'ドキュメントの読み取りに失敗しました')
      setStep('capture')
    } finally {
      setLoading(false)
    }
  }

  // カテゴリー選択ハンドラ
  const handleCategorySelection = (category: 'site' | 'company') => {
    setExpenseCategory(category)
    if (category === 'company' || documentType === 'delivery_slip') {
      setStep('confirmation')
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
  }

  // プロジェクト選択ハンドラ
  const handleProjectSelection = (project: Project) => {
    setSelectedProject(project)
    setStep('confirmation')
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
  }

  // 確定処理
  const handleConfirmDocuments = async () => {
    if (files.length === 0) return

    setLoading(true)

    try {
      // ドキュメント保存処理をシミュレート
      const documentsToSave = files.map(file => ({
        ...file,
        ocrResult: ocrResults[file.id],
        expense_category: expenseCategory,
        project_id: selectedProject?.id || null,
        user_id: user?.id,
        created_at: new Date().toISOString()
      }))

      console.log('💾 Saving documents:', documentsToSave)

      // 保存処理をシミュレート
      await new Promise(resolve => setTimeout(resolve, 1500))

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)

      // 結果に応じた遷移
      const receiptCount = files.filter(f => f.docType === 'receipt').length
      const deliveryCount = files.filter(f => f.docType === 'delivery_slip').length

      let message = ''
      const actions: { text: string; onPress?: () => void; style?: 'cancel' | 'destructive' }[] = []

      if (receiptCount > 0 && deliveryCount > 0) {
        message = `${receiptCount}件のレシートと${deliveryCount}件の搬入書を保存しました`
        actions.push(
          { text: '在庫確認', onPress: () => router.push('/inventory/materials') },
          { text: 'OK', onPress: () => router.back(), style: 'cancel' }
        )
      } else if (receiptCount > 0) {
        message = `${receiptCount}件のレシートを${expenseCategory === 'site' ? '現場経費' : '会社経費'}として保存しました`
        actions.push({ text: 'OK', onPress: () => router.back() })
      } else if (deliveryCount > 0) {
        message = `${deliveryCount}件の搬入・納品書を保存しました。在庫管理に反映されます。`
        actions.push(
          { text: '在庫確認', onPress: () => router.push('/inventory/materials') },
          { text: 'OK', onPress: () => router.back(), style: 'cancel' }
        )
      } else {
        message = `${files.length}件のドキュメントを保存しました`
        actions.push({ text: 'OK', onPress: () => router.back() })
      }

      Alert.alert('保存完了', message, actions)

    } catch (error) {
      console.error('ドキュメント保存エラー:', error)
      Alert.alert('エラー', 'ドキュメントの保存に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  // リセット処理
  const resetCapture = () => {
    setFiles([])
    setOcrResults({})
    setSelectedProject(null)
    setExpenseCategory(null)
    setStep('capture')
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
  }

  // ステップレンダリング
  const renderCaptureStep = () => (
    <View style={styles.stepContainer}>
      {/* ドキュメントタイプ選択 */}
      <Card variant="premium" elevationLevel={2} style={styles.typeSelectionCard}>
        <StyledText variant="subtitle" weight="semibold" style={styles.sectionTitle}>
          ドキュメントタイプ
        </StyledText>
        
        <SegmentedButtons
          value={documentType}
          onValueChange={(value) => setDocumentType(value as DocumentType)}
          buttons={[
            {
              value: 'receipt',
              label: 'レシート',
              icon: 'receipt',
            },
            {
              value: 'delivery_slip', 
              label: '搬入書',
              icon: 'truck-delivery',
            },
            {
              value: 'mixed',
              label: '混在',
              icon: 'file-multiple',
            },
          ]}
          style={styles.segmentedButtons}
        />
      </Card>

      {/* ガイド表示 */}
      <Card variant="elevated" style={styles.guideCard}>
        <View style={styles.guideHeader}>
          <Chip 
            icon={guide.icon}
            mode="outlined"
            style={[styles.guideChip, { borderColor: guide.color }]}
          >
            {guide.title}
          </Chip>
        </View>
        
        <StyledText variant="body" color="secondary" style={styles.guideDescription}>
          {guide.description}
        </StyledText>
        
        <View style={styles.tipsContainer}>
          <StyledText variant="body" weight="medium" style={styles.tipsTitle}>
            撮影のコツ:
          </StyledText>
          {guide.tips.map((tip, index) => (
            <StyledText key={index} variant="caption" color="secondary" style={styles.tipItem}>
              • {tip}
            </StyledText>
          ))}
        </View>
      </Card>

      {/* アップローダー */}
      <DocumentUploader
        onFilesChange={handleFilesChange}
        maxFiles={10}
        allowedDocTypes={getAllowedDocTypes(documentType)}
        title={`${guide.title}を追加`}
        description="複数ファイルの同時選択が可能です"
        uploadMode="batch"
      />

      {files.length > 0 && (
        <StyledButton
          title="次へ"
          variant="primary"
          size="lg"
          elevated={true}
          onPress={() => processOCR(files)}
          style={styles.nextButton}
        />
      )}
    </View>
  )

  const renderProcessingStep = () => (
    <View style={styles.stepContainer}>
      <Card variant="elevated" style={styles.processingCard}>
        <View style={styles.processingContent}>
          <StyledText variant="title" weight="semibold" align="center">
            ドキュメントを読み取り中...
          </StyledText>
          <StyledText variant="body" color="secondary" align="center">
            {files.length}件のファイルを処理しています
          </StyledText>
        </View>
      </Card>
      
      <View style={styles.processingFiles}>
        {files.map((file) => (
          <Card key={file.id} variant="surface" style={styles.processingFileCard}>
            <View style={styles.processingFileContent}>
              <StyledText variant="caption" weight="medium" numberOfLines={1}>
                {file.name}
              </StyledText>
              <Chip
                icon={getDocTypeIcon(file.docType)}
                mode="outlined"
                compact
              >
                {getDocTypeDisplayName(file.docType)}
              </Chip>
            </View>
          </Card>
        ))}
      </View>
    </View>
  )

  const renderSelectionStep = () => {
    const hasReceipts = files.some(f => f.docType === 'receipt')
    
    return (
      <View style={styles.stepContainer}>
        {/* OCR結果表示 */}
        <Card variant="elevated" style={styles.resultsCard}>
          <StyledText variant="subtitle" weight="semibold" style={styles.sectionTitle}>
            読み取り結果 ({files.length}件)
          </StyledText>
          
          <ScrollView style={styles.resultsList} showsVerticalScrollIndicator={false}>
            {files.map((file) => {
              const result = ocrResults[file.id]
              return (
                <Card key={file.id} variant="surface" style={styles.resultItem}>
                  <View style={styles.resultHeader}>
                    <StyledText variant="body" weight="medium" numberOfLines={1}>
                      {file.name}
                    </StyledText>
                    <Chip
                      icon={getDocTypeIcon(file.docType)}
                      mode="outlined"
                      compact
                    >
                      {getDocTypeDisplayName(file.docType)}
                    </Chip>
                  </View>
                  
                  {result && (
                    <View style={styles.resultDetails}>
                      {result.store_name && (
                        <View style={styles.resultRow}>
                          <StyledText variant="caption" color="secondary">店名:</StyledText>
                          <StyledText variant="caption">{result.store_name}</StyledText>
                        </View>
                      )}
                      {result.supplier_name && (
                        <View style={styles.resultRow}>
                          <StyledText variant="caption" color="secondary">業者:</StyledText>
                          <StyledText variant="caption">{result.supplier_name}</StyledText>
                        </View>
                      )}
                      {result.total_amount && (
                        <View style={styles.resultRow}>
                          <StyledText variant="caption" color="secondary">金額:</StyledText>
                          <StyledText variant="caption" color="primary" weight="medium">
                            ¥{result.total_amount.toLocaleString()}
                          </StyledText>
                        </View>
                      )}
                      {result.delivery_number && (
                        <View style={styles.resultRow}>
                          <StyledText variant="caption" color="secondary">搬入番号:</StyledText>
                          <StyledText variant="caption">{result.delivery_number}</StyledText>
                        </View>
                      )}
                    </View>
                  )}
                </Card>
              )
            })}
          </ScrollView>
        </Card>

        {/* レシートがある場合のカテゴリー選択 */}
        {hasReceipts && (
          <Card variant="premium" style={styles.categoryCard}>
            <StyledText variant="subtitle" weight="semibold" style={styles.sectionTitle}>
              経費カテゴリーを選択
            </StyledText>
            
            <View style={styles.categoryButtons}>
              <TouchableOpacity
                style={[
                  styles.categoryButton,
                  expenseCategory === 'site' && styles.categoryButtonSelected
                ]}
                onPress={() => handleCategorySelection('site')}
              >
                <StyledText variant="body" weight="semibold">現場経費</StyledText>
                <StyledText variant="caption" color="secondary" align="center">
                  特定の現場に関連する経費
                </StyledText>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.categoryButton,
                  expenseCategory === 'company' && styles.categoryButtonSelected
                ]}
                onPress={() => handleCategorySelection('company')}
              >
                <StyledText variant="body" weight="semibold">会社経費</StyledText>
                <StyledText variant="caption" color="secondary" align="center">
                  会社全体の一般経費
                </StyledText>
              </TouchableOpacity>
            </View>
          </Card>
        )}

        {/* レシートがない場合は直接確定 */}
        {!hasReceipts && (
          <StyledButton
            title="保存する"
            variant="primary"
            size="lg"
            elevated={true}
            onPress={() => setStep('confirmation')}
            style={styles.nextButton}
          />
        )}

        {/* プロジェクト選択（現場経費の場合） */}
        {expenseCategory === 'site' && (
          <Card variant="elevated" style={styles.projectCard}>
            <StyledText variant="subtitle" weight="semibold" style={styles.sectionTitle}>
              対象現場を選択
            </StyledText>
            
            <View style={styles.projectList}>
              {projects.map((project) => (
                <TouchableOpacity
                  key={project.id}
                  style={[
                    styles.projectItem,
                    selectedProject?.id === project.id && styles.projectItemSelected
                  ]}
                  onPress={() => handleProjectSelection(project)}
                >
                  <View style={styles.projectInfo}>
                    <StyledText variant="body" weight="medium" numberOfLines={1}>
                      {project.name}
                    </StyledText>
                    <StyledText variant="caption" color="secondary">
                      {project.location}
                    </StyledText>
                  </View>
                  {selectedProject?.id === project.id && (
                    <StyledText variant="body" color="primary">✓</StyledText>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </Card>
        )}
      </View>
    )
  }

  const renderConfirmationStep = () => (
    <View style={styles.stepContainer}>
      <Card variant="success" elevationLevel={3} style={styles.confirmationCard}>
        <StyledText variant="title" weight="semibold" align="center" style={styles.confirmationTitle}>
          登録内容確認
        </StyledText>
        
        <View style={styles.confirmationContent}>
          <View style={styles.confirmRow}>
            <StyledText variant="body" weight="medium">ファイル数:</StyledText>
            <StyledText variant="body">{files.length}件</StyledText>
          </View>
          
          {expenseCategory && (
            <View style={styles.confirmRow}>
              <StyledText variant="body" weight="medium">カテゴリー:</StyledText>
              <StyledText variant="body" color="success" weight="semibold">
                {expenseCategory === 'site' ? '現場経費' : '会社経費'}
              </StyledText>
            </View>
          )}
          
          {selectedProject && (
            <View style={styles.confirmRow}>
              <StyledText variant="body" weight="medium">対象現場:</StyledText>
              <StyledText variant="body" weight="semibold" numberOfLines={1}>
                {selectedProject.name}
              </StyledText>
            </View>
          )}
          
          <View style={styles.fileTypesSummary}>
            <StyledText variant="caption" color="secondary">ファイル内訳:</StyledText>
            {Object.entries(
              files.reduce((acc, file) => {
                acc[file.docType] = (acc[file.docType] || 0) + 1
                return acc
              }, {} as Record<DocType, number>)
            ).map(([type, count]) => (
              <StyledText key={type} variant="caption">
                {getDocTypeDisplayName(type as DocType)}: {count}件
              </StyledText>
            ))}
          </View>
        </View>

        <View style={styles.confirmationButtons}>
          <StyledButton
            title="登録する"
            variant="primary"
            size="lg"
            elevated={true}
            onPress={handleConfirmDocuments}
            loading={loading}
            style={styles.confirmButton}
          />
          <StyledButton
            title="修正する"
            variant="outline"
            size="md"
            onPress={() => setStep('selection')}
            style={styles.editButton}
          />
        </View>
      </Card>
    </View>
  )

  return (
    <SafeAreaView style={styles.container}>
      {/* ヘッダー */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <StyledText variant="title" color="primary">←</StyledText>
        </TouchableOpacity>
        
        <View style={styles.headerContent}>
          <StyledText variant="title" weight="semibold">
            ドキュメントキャプチャ
          </StyledText>
          <StyledText variant="caption" color="secondary">
            {step === 'capture' && 'ファイル選択・撮影'}
            {step === 'processing' && 'ドキュメント処理中'}
            {step === 'selection' && '内容確認・分類'}
            {step === 'confirmation' && '最終確認'}
          </StyledText>
        </View>
        
        {step !== 'capture' && step !== 'processing' && (
          <TouchableOpacity
            style={styles.resetButton}
            onPress={resetCapture}
          >
            <StyledText variant="caption" color="primary">リセット</StyledText>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {step === 'capture' && renderCaptureStep()}
        {step === 'processing' && renderProcessingStep()}
        {step === 'selection' && renderSelectionStep()}
        {step === 'confirmation' && renderConfirmationStep()}
      </ScrollView>
    </SafeAreaView>
  )
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  backButton: {
    marginRight: Spacing.md,
  },
  headerContent: {
    flex: 1,
  },
  resetButton: {
    marginLeft: Spacing.md,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.md,
    paddingBottom: Spacing['2xl'],
  },
  stepContainer: {
    gap: Spacing.lg,
  },

  // Type Selection
  typeSelectionCard: {
    alignItems: 'center',
  },
  sectionTitle: {
    marginBottom: Spacing.md,
  },
  segmentedButtons: {
    width: '100%',
  },

  // Guide
  guideCard: {},
  guideHeader: {
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  guideChip: {
    backgroundColor: Colors.surface,
  },
  guideDescription: {
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.md,
  },
  tipsContainer: {
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  tipsTitle: {
    marginBottom: Spacing.sm,
  },
  tipItem: {
    marginLeft: Spacing.md,
    marginBottom: Spacing.xs,
    lineHeight: 18,
  },

  // Processing
  processingCard: {
    alignItems: 'center',
    paddingVertical: Spacing['2xl'],
  },
  processingContent: {
    alignItems: 'center',
    gap: Spacing.md,
  },
  processingFiles: {
    gap: Spacing.sm,
  },
  processingFileCard: {
    padding: Spacing.sm,
  },
  processingFileContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.md,
  },

  // Results
  resultsCard: {},
  resultsList: {
    maxHeight: 300,
    gap: Spacing.sm,
  },
  resultItem: {
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  resultDetails: {
    gap: Spacing.xs,
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  // Category Selection
  categoryCard: {},
  categoryButtons: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  categoryButton: {
    flex: 1,
    alignItems: 'center',
    padding: Spacing.lg,
    borderWidth: 2,
    borderColor: Colors.border,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.surface,
    gap: Spacing.sm,
  },
  categoryButtonSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '10',
  },

  // Project Selection
  projectCard: {},
  projectList: {
    gap: Spacing.sm,
  },
  projectItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.surface,
  },
  projectItemSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '10',
  },
  projectInfo: {
    flex: 1,
    gap: Spacing.xs,
  },

  // Confirmation
  confirmationCard: {
    alignItems: 'center',
  },
  confirmationTitle: {
    marginBottom: Spacing.lg,
  },
  confirmationContent: {
    width: '100%',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  confirmRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
  },
  fileTypesSummary: {
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    gap: Spacing.xs,
  },
  confirmationButtons: {
    width: '100%',
    gap: Spacing.md,
  },
  confirmButton: {
    minHeight: 56,
  },
  editButton: {},

  // Common
  nextButton: {
    minHeight: 56,
  },
})