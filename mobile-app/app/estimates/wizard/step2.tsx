import React, { useState, useCallback } from 'react'
import {
  View,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Alert
} from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { useAuth } from '@/contexts/AuthContext'
import { Colors, Spacing, Typography, BorderRadius, Shadows } from '@/constants/Colors'
import { StyledText, StyledButton, Card } from '@/components/ui'
import { 
  Surface, 
  Chip, 
  ProgressBar, 
  Divider,
  Badge,
  IconButton
} from 'react-native-paper'
import * as Haptics from 'expo-haptics'

import { DocumentUploader, FilePreview, UploadedFile } from '@/components/upload'
import { 
  DocType, 
  getDocTypeDisplayName, 
  getDocTypeIcon, 
  getDocTypeColor,
  guessDocType
} from '@/src/utils/classifyDoc'

// =============================================================================
// TYPES
// =============================================================================

interface EstimateWizardStep2Props {
  projectData?: {
    id?: string
    name: string
    client: string
    location: string
    description?: string
  }
}

interface FileCategory {
  type: DocType
  files: UploadedFile[]
  required: boolean
  description: string
}

interface ValidationResult {
  isValid: boolean
  missingRequired: DocType[]
  warnings: string[]
}

// =============================================================================
// CONSTANTS
// =============================================================================

const ESTIMATE_FILE_CATEGORIES: FileCategory[] = [
  {
    type: 'drawing',
    files: [],
    required: true,
    description: '図面・設計資料は見積精度向上に必須です'
  },
  {
    type: 'spec',
    files: [],
    required: true,  
    description: '仕様書は材料・工法の判定に必要です'
  },
  {
    type: 'photo',
    files: [],
    required: false,
    description: '現地写真があると状況把握に役立ちます'
  },
  {
    type: 'contract',
    files: [],
    required: false,
    description: '契約条件がある場合は添付してください'
  },
  {
    type: 'receipt',
    files: [],
    required: false,
    description: '既存の材料費参考データ'
  }
]

// =============================================================================
// COMPONENT
// =============================================================================

export default function EstimateWizardStep2() {
  const params = useLocalSearchParams()
  const { user } = useAuth()
  
  // プロジェクトデータを前のステップから取得
  const projectData: EstimateWizardStep2Props['projectData'] = params.projectData 
    ? JSON.parse(params.projectData as string) 
    : {
        name: 'サンプルプロジェクト',
        client: 'サンプル顧客',
        location: '東京都'
      }

  const [files, setFiles] = useState<UploadedFile[]>([])
  const [categories, setCategories] = useState<FileCategory[]>(ESTIMATE_FILE_CATEGORIES)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isProcessing, setIsProcessing] = useState(false)
  const [validationResult, setValidationResult] = useState<ValidationResult>({ 
    isValid: false, 
    missingRequired: [],
    warnings: []
  })

  // ファイル変更時の処理
  const handleFilesChange = useCallback((newFiles: UploadedFile[]) => {
    setFiles(newFiles)
    updateCategories(newFiles)
    validateFiles(newFiles)
  }, [])

  // カテゴリ別ファイル分類更新
  const updateCategories = (fileList: UploadedFile[]) => {
    const updatedCategories = categories.map(category => ({
      ...category,
      files: fileList.filter(file => file.docType === category.type)
    }))
    setCategories(updatedCategories)
  }

  // ファイル検証
  const validateFiles = (fileList: UploadedFile[]) => {
    const requiredTypes = categories.filter(cat => cat.required).map(cat => cat.type)
    const presentTypes = [...new Set(fileList.map(file => file.docType))]
    const missingRequired = requiredTypes.filter(type => !presentTypes.includes(type))
    
    const warnings: string[] = []
    
    // 図面が多すぎる場合の警告
    const drawingCount = fileList.filter(f => f.docType === 'drawing').length
    if (drawingCount > 5) {
      warnings.push('図面が多すぎます。主要な図面のみに絞ることをお勧めします。')
    }
    
    // ファイルサイズの警告
    const largeFiles = fileList.filter(f => f.size && f.size > 10 * 1024 * 1024)
    if (largeFiles.length > 0) {
      warnings.push(`${largeFiles.length}件の大きなファイルがあります。処理に時間がかかる可能性があります。`)
    }

    setValidationResult({
      isValid: missingRequired.length === 0,
      missingRequired,
      warnings
    })
  }

  // AIによるファイル分析シミュレーション
  const analyzeFiles = async () => {
    setIsProcessing(true)
    setUploadProgress(0)

    try {
      // プログレス更新のシミュレーション
      const progressSteps = [10, 30, 50, 70, 85, 100]
      for (const step of progressSteps) {
        await new Promise(resolve => setTimeout(resolve, 500))
        setUploadProgress(step)
      }

      // 分析結果のモック生成
      const analysisResults = files.map(file => {
        let analysis = {}
        
        switch (file.docType) {
          case 'drawing':
            analysis = {
              detectedElements: ['基礎図', '平面図', '立面図'],
              estimatedArea: Math.floor(Math.random() * 200) + 50,
              complexity: ['標準', '複雑', '単純'][Math.floor(Math.random() * 3)],
              materials: ['コンクリート', '鉄筋', '型枠']
            }
            break
          case 'spec':
            analysis = {
              materials: ['高強度コンクリート', '防水シート'],
              specifications: ['耐震等級2', '省エネ等級4'],
              specialRequirements: ['バリアフリー対応']
            }
            break
          case 'photo':
            analysis = {
              location: '現場周辺',
              conditions: ['アクセス良好', '隣接建物あり'],
              challenges: ['狭小地']
            }
            break
        }
        
        return {
          fileId: file.id,
          analysis,
          confidence: 0.85 + Math.random() * 0.1
        }
      })

      console.log('🎯 ファイル分析結果:', analysisResults)
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      
      Alert.alert(
        '分析完了',
        'ファイルの分析が完了しました。見積作成に進みますか？',
        [
          { text: 'キャンセル', style: 'cancel' },
          { 
            text: '見積作成', 
            onPress: () => proceedToEstimateGeneration(analysisResults)
          }
        ]
      )

    } catch (error) {
      console.error('ファイル分析エラー:', error)
      Alert.alert('エラー', 'ファイルの分析中にエラーが発生しました')
    } finally {
      setIsProcessing(false)
      setUploadProgress(0)
    }
  }

  // 見積生成画面への遷移
  const proceedToEstimateGeneration = (analysisResults: any[]) => {
    const estimateData = {
      project: projectData,
      files: files.map(file => ({
        id: file.id,
        name: file.name,
        type: file.docType,
        analysis: analysisResults.find(r => r.fileId === file.id)?.analysis
      })),
      generatedAt: new Date().toISOString()
    }

    router.push({
      pathname: '/estimates/wizard/step3',
      params: { 
        estimateData: JSON.stringify(estimateData)
      }
    })
  }

  // カテゴリ別プレビューレンダリング
  const renderCategorySection = (category: FileCategory) => (
    <Card key={category.type} variant="elevated" style={styles.categoryCard}>
      <View style={styles.categoryHeader}>
        <View style={styles.categoryTitle}>
          <View style={[styles.categoryIcon, { backgroundColor: getDocTypeColor(category.type) + '20' }]}>
            <StyledText variant="body" style={{ color: getDocTypeColor(category.type) }}>
              {getDocTypeIcon(category.type)}
            </StyledText>
          </View>
          <View style={styles.categoryInfo}>
            <View style={styles.categoryNameRow}>
              <StyledText variant="body" weight="semibold">
                {getDocTypeDisplayName(category.type)}
              </StyledText>
              {category.required && (
                <Badge style={styles.requiredBadge}>必須</Badge>
              )}
              {category.files.length > 0 && (
                <Badge style={[styles.countBadge, { backgroundColor: getDocTypeColor(category.type) }]}>
                  {category.files.length}
                </Badge>
              )}
            </View>
            <StyledText variant="caption" color="secondary">
              {category.description}
            </StyledText>
          </View>
        </View>

        <View style={styles.categoryStatus}>
          {category.required && category.files.length === 0 ? (
            <StyledText variant="caption" color="error">未添付</StyledText>
          ) : category.files.length > 0 ? (
            <StyledText variant="caption" color="success">✓ 添付済</StyledText>
          ) : (
            <StyledText variant="caption" color="tertiary">任意</StyledText>
          )}
        </View>
      </View>

      {category.files.length > 0 && (
        <View style={styles.categoryFiles}>
          {category.files.map(file => (
            <FilePreview
              key={file.id}
              file={file}
              compact={true}
              readOnly={false}
              onRemove={() => {
                const updatedFiles = files.filter(f => f.id !== file.id)
                handleFilesChange(updatedFiles)
              }}
              onDocTypeChange={(newType) => {
                const updatedFiles = files.map(f => 
                  f.id === file.id ? { ...f, docType: newType } : f
                )
                handleFilesChange(updatedFiles)
              }}
            />
          ))}
        </View>
      )}
    </Card>
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
            見積ウィザード - 資料アップロード
          </StyledText>
          <StyledText variant="caption" color="secondary">
            ステップ 2/4 - {projectData.name}
          </StyledText>
        </View>

        <View style={styles.headerProgress}>
          <StyledText variant="micro" color="secondary">2/4</StyledText>
        </View>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* プロジェクト概要 */}
        <Card variant="surface" style={styles.projectCard}>
          <StyledText variant="body" weight="semibold" style={styles.projectTitle}>
            📋 プロジェクト概要
          </StyledText>
          <View style={styles.projectDetails}>
            <View style={styles.projectRow}>
              <StyledText variant="caption" color="secondary">顧客:</StyledText>
              <StyledText variant="caption" weight="medium">{projectData.client}</StyledText>
            </View>
            <View style={styles.projectRow}>
              <StyledText variant="caption" color="secondary">場所:</StyledText>
              <StyledText variant="caption" weight="medium">{projectData.location}</StyledText>
            </View>
          </View>
        </Card>

        {/* メインアップローダー */}
        <Card variant="premium" style={styles.uploaderCard}>
          <StyledText variant="subtitle" weight="semibold" style={styles.sectionTitle}>
            📁 見積資料をアップロード
          </StyledText>
          
          <DocumentUploader
            onFilesChange={handleFilesChange}
            maxFiles={20}
            allowedDocTypes={['drawing', 'spec', 'photo', 'contract', 'receipt']}
            title="図面・仕様書・写真などを追加"
            description="ドラッグ&ドロップまたはタップしてファイルを選択"
            uploadMode="batch"
            showPreview={false}
          />
        </Card>

        {/* カテゴリ別ファイル表示 */}
        {files.length > 0 && (
          <View style={styles.categoriesSection}>
            <StyledText variant="subtitle" weight="semibold" style={styles.sectionTitle}>
              📂 カテゴリ別ファイル ({files.length}件)
            </StyledText>
            
            {categories.map(renderCategorySection)}
          </View>
        )}

        {/* 検証結果 */}
        {files.length > 0 && (
          <Card variant={validationResult.isValid ? 'success' : 'warning'} style={styles.validationCard}>
            <View style={styles.validationHeader}>
              <StyledText variant="body" weight="semibold">
                {validationResult.isValid ? '✅ 準備完了' : '⚠️ 確認が必要'}
              </StyledText>
            </View>
            
            {validationResult.missingRequired.length > 0 && (
              <View style={styles.validationSection}>
                <StyledText variant="caption" color="error" weight="medium">
                  必須ファイルが不足しています:
                </StyledText>
                {validationResult.missingRequired.map(type => (
                  <StyledText key={type} variant="caption" color="error">
                    • {getDocTypeDisplayName(type)}
                  </StyledText>
                ))}
              </View>
            )}
            
            {validationResult.warnings.length > 0 && (
              <View style={styles.validationSection}>
                <StyledText variant="caption" color="warning" weight="medium">
                  注意事項:
                </StyledText>
                {validationResult.warnings.map((warning, index) => (
                  <StyledText key={index} variant="caption" color="warning">
                    • {warning}
                  </StyledText>
                ))}
              </View>
            )}
            
            {validationResult.isValid && (
              <StyledText variant="caption" color="success">
                すべての必須ファイルが揃っています。AI分析を実行できます。
              </StyledText>
            )}
          </Card>
        )}

        {/* 処理進行状況 */}
        {isProcessing && (
          <Card variant="elevated" style={styles.processingCard}>
            <View style={styles.processingContent}>
              <StyledText variant="body" weight="semibold" align="center">
                🤖 AI分析中...
              </StyledText>
              <StyledText variant="caption" color="secondary" align="center">
                ファイルを分析して見積に反映しています
              </StyledText>
              <ProgressBar 
                progress={uploadProgress / 100} 
                color={Colors.primary}
                style={styles.progressBar}
              />
              <StyledText variant="micro" color="secondary" align="center">
                {uploadProgress}%
              </StyledText>
            </View>
          </Card>
        )}
      </ScrollView>

      {/* フッター */}
      <View style={styles.footer}>
        <View style={styles.footerContent}>
          <View style={styles.footerInfo}>
            <StyledText variant="caption" color="secondary">
              {files.length}件のファイルを選択
            </StyledText>
            {!validationResult.isValid && (
              <StyledText variant="micro" color="error">
                必須ファイルが不足しています
              </StyledText>
            )}
          </View>
          
          <View style={styles.footerActions}>
            <StyledButton
              title="戻る"
              variant="outline"
              size="md"
              onPress={() => router.back()}
              style={styles.backFooterButton}
            />
            
            <StyledButton
              title={files.length > 0 ? "AI分析実行" : "スキップ"}
              variant="primary"
              size="lg"
              elevated={true}
              onPress={files.length > 0 ? analyzeFiles : () => proceedToEstimateGeneration([])}
              disabled={isProcessing}
              loading={isProcessing}
              style={styles.nextButton}
            />
          </View>
        </View>
      </View>
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
  headerProgress: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary + '20',
    borderRadius: 12,
    width: 32,
    height: 24,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.md,
    paddingBottom: Spacing.xl,
  },

  // Project
  projectCard: {
    marginBottom: Spacing.lg,
    padding: Spacing.md,
  },
  projectTitle: {
    marginBottom: Spacing.md,
  },
  projectDetails: {
    gap: Spacing.sm,
  },
  projectRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  // Uploader
  uploaderCard: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    marginBottom: Spacing.md,
  },

  // Categories
  categoriesSection: {
    gap: Spacing.md,
  },
  categoryCard: {
    padding: Spacing.md,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  categoryTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flex: 1,
  },
  categoryIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryInfo: {
    flex: 1,
    gap: Spacing.xs,
  },
  categoryNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  requiredBadge: {
    backgroundColor: Colors.error,
  },
  countBadge: {
    color: Colors.onPrimary,
  },
  categoryStatus: {
    alignItems: 'flex-end',
  },
  categoryFiles: {
    gap: Spacing.xs,
  },

  // Validation
  validationCard: {
    marginBottom: Spacing.lg,
  },
  validationHeader: {
    marginBottom: Spacing.md,
  },
  validationSection: {
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },

  // Processing
  processingCard: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  processingContent: {
    alignItems: 'center',
    gap: Spacing.md,
    width: '100%',
  },
  progressBar: {
    width: '100%',
    height: 8,
    borderRadius: 4,
  },

  // Footer
  footer: {
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    ...Shadows.small,
  },
  footerContent: {
    gap: Spacing.md,
  },
  footerInfo: {
    alignItems: 'center',
  },
  footerActions: {
    flexDirection: 'row',
    gap: Spacing.md,
    justifyContent: 'space-between',
  },
  backFooterButton: {
    flex: 0.3,
  },
  nextButton: {
    flex: 0.7,
    minHeight: 48,
  },
})