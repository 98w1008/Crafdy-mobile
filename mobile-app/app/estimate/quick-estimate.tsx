/**
 * クイック見積作成画面
 * AI統合とスマート事前入力による簡素化された見積作成フロー
 */

import React, { useState, useEffect } from 'react'
import {
  View,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Alert,
} from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { useColors, useSpacing, useRadius } from '@/theme/ThemeProvider'
import { StyledText, StyledButton, Card } from '@/components/ui'
import { DocumentUploader, UploadedFile } from '@/components/upload/DocumentUploader'
import { ProgressBar, Chip, TextInput, IconButton } from 'react-native-paper'
import * as Haptics from 'expo-haptics'

// =============================================================================
// TYPES & INTERFACES
// =============================================================================

interface QuickEstimateData {
  projectName: string
  clientName: string
  estimatedAmount: number
  uploadedFiles: UploadedFile[]
  aiSuggestions: AISuggestion[]
  smartPreFill: SmartPreFillData
  confidence: number
}

interface AISuggestion {
  category: 'material' | 'labor' | 'equipment' | 'adjustment'
  suggestion: string
  impact: number
  confidence: number
}

interface SmartPreFillData {
  materials: QuickMaterial[]
  laborHours: number
  equipmentDays: number
  totalEstimate: number
  breakdown: {
    materials: number
    labor: number
    equipment: number
    overhead: number
  }
}

interface QuickMaterial {
  name: string
  quantity: number
  unit: string
  unitPrice: number
  total: number
  source: string
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function QuickEstimateScreen() {
  const params = useLocalSearchParams()
  const colors = useColors()
  const spacing = useSpacing()
  
  const [quickData, setQuickData] = useState<QuickEstimateData>({
    projectName: '',
    clientName: '',
    estimatedAmount: 0,
    uploadedFiles: [],
    aiSuggestions: [],
    smartPreFill: {
      materials: [],
      laborHours: 0,
      equipmentDays: 0,
      totalEstimate: 0,
      breakdown: { materials: 0, labor: 0, equipment: 0, overhead: 0 }
    },
    confidence: 0
  })
  
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisProgress, setAnalysisProgress] = useState(0)
  const [showSmartSuggestions, setShowSmartSuggestions] = useState(false)

  // スマートファイルアップロード処理
  const handleFilesChange = async (files: UploadedFile[]) => {
    setQuickData(prev => ({ ...prev, uploadedFiles: files }))
    
    if (files.length > 0) {
      await runSmartAnalysis(files)
    }
  }

  // AI統合スマート解析
  const runSmartAnalysis = async (files: UploadedFile[]) => {
    setIsAnalyzing(true)
    setAnalysisProgress(0)
    
    try {
      console.log('🚀 クイックAI解析開始:', files.length, '件')
      
      // ファイル解析段階
      setAnalysisProgress(0.3)
      await new Promise(resolve => setTimeout(resolve, 800))
      
      // スマート事前入力生成
      setAnalysisProgress(0.7)
      const smartPreFill = await generateSmartPreFill(files)
      
      // AI提案生成
      setAnalysisProgress(0.9)
      const aiSuggestions = await generateAISuggestions(files, smartPreFill)
      
      setAnalysisProgress(1.0)
      
      setQuickData(prev => ({
        ...prev,
        smartPreFill,
        aiSuggestions,
        confidence: 0.82,
        estimatedAmount: smartPreFill.totalEstimate
      }))
      
      setShowSmartSuggestions(true)
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      
    } catch (error) {
      console.error('Quick analysis error:', error)
      Alert.alert('エラー', 'AI解析に失敗しました')
    } finally {
      setIsAnalyzing(false)
    }
  }

  // スマート事前入力生成
  const generateSmartPreFill = async (files: UploadedFile[]): Promise<SmartPreFillData> => {
    const materials: QuickMaterial[] = []
    let laborHours = 0
    let equipmentDays = 0
    
    // ファイルタイプ別の解析結果をシミュレート
    files.forEach(file => {
      switch (file.docType) {
        case 'drawing':
          materials.push(
            { name: 'コンクリート(25N)', quantity: 30, unit: 'm³', unitPrice: 15000, total: 450000, source: '図面解析' },
            { name: '鉄筋D13', quantity: 1200, unit: 'kg', unitPrice: 85, total: 102000, source: '図面解析' }
          )
          laborHours += 120
          equipmentDays += 8
          break
        case 'spec':
          materials.push(
            { name: '高強度コンクリート', quantity: 15, unit: 'm³', unitPrice: 18000, total: 270000, source: '仕様書解析' },
            { name: '防水シート', quantity: 80, unit: 'm²', unitPrice: 2500, total: 200000, source: '仕様書解析' }
          )
          laborHours += 60
          break
        case 'photo':
          equipmentDays += 3 // 現場条件から追加機材
          break
        case 'receipt':
          // 既存見積からの価格参照
          materials.push(
            { name: '参考材料', quantity: 5, unit: '式', unitPrice: 50000, total: 250000, source: '過去見積参照' }
          )
          break
      }
    })
    
    const materialsTotal = materials.reduce((sum, m) => sum + m.total, 0)
    const laborTotal = laborHours * 2800 // 平均単価
    const equipmentTotal = equipmentDays * 35000 // 平均レンタル費
    const overheadTotal = Math.floor((materialsTotal + laborTotal + equipmentTotal) * 0.15)
    
    return {
      materials,
      laborHours,
      equipmentDays,
      totalEstimate: materialsTotal + laborTotal + equipmentTotal + overheadTotal,
      breakdown: {
        materials: materialsTotal,
        labor: laborTotal,
        equipment: equipmentTotal,
        overhead: overheadTotal
      }
    }
  }

  // AI提案生成
  const generateAISuggestions = async (files: UploadedFile[], smartData: SmartPreFillData): Promise<AISuggestion[]> => {
    return [
      {
        category: 'material',
        suggestion: 'コンクリート強度を25Nから30Nに変更すると長期品質が向上します',
        impact: 45000,
        confidence: 0.78
      },
      {
        category: 'labor',
        suggestion: '専門工の配置を最適化することで工期を3日短縮できます',
        impact: -84000,
        confidence: 0.85
      },
      {
        category: 'equipment',
        suggestion: '小型クレーンの代わりにユニック車使用で効率化',
        impact: -15000,
        confidence: 0.72
      },
      {
        category: 'adjustment',
        suggestion: 'この地域の類似案件と比較して5%の価格調整を推奨',
        impact: Math.floor(smartData.totalEstimate * 0.05),
        confidence: 0.88
      }
    ]
  }

  // 見積確定処理
  const handleConfirmEstimate = () => {
    if (!quickData.projectName.trim()) {
      Alert.alert('入力エラー', 'プロジェクト名を入力してください')
      return
    }
    
    if (!quickData.clientName.trim()) {
      Alert.alert('入力エラー', 'クライアント名を入力してください')
      return
    }
    
    Alert.alert(
      '見積確定',
      `${quickData.projectName}の見積を確定しますか？\n\n合計金額: ¥${quickData.estimatedAmount.toLocaleString()}\nAI信頼度: ${Math.round(quickData.confidence * 100)}%`,
      [
        { text: 'キャンセル', style: 'cancel' },
        { 
          text: '確定', 
          onPress: () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
            router.push({
              pathname: '/estimates/created',
              params: { 
                estimateData: JSON.stringify(quickData)
              }
            })
          }
        }
      ]
    )
  }

  const styles = createStyles(colors, spacing)

  return (
    <SafeAreaView style={styles.container}>
      {/* ヘッダー */}
      <View style={styles.header}>
        <IconButton 
          icon="arrow-left" 
          onPress={() => router.back()}
          iconColor={colors.text.primary}
        />
        <View style={styles.headerContent}>
          <StyledText variant="title" weight="semibold">
            ⚡ クイック見積
          </StyledText>
          <StyledText variant="caption" color="secondary">
            AI統合による高速見積作成
          </StyledText>
        </View>
        <View style={{ width: 48 }} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* 基本情報 */}
        <Card style={styles.basicInfoCard}>
          <StyledText variant="subtitle" weight="semibold" style={styles.sectionTitle}>
            📝 基本情報
          </StyledText>
          
          <View style={styles.inputGroup}>
            <StyledText variant="body" weight="medium" style={styles.inputLabel}>
              プロジェクト名
            </StyledText>
            <TextInput
              mode="outlined"
              value={quickData.projectName}
              onChangeText={(text) => setQuickData(prev => ({ ...prev, projectName: text }))}
              placeholder="例：○○ビル改修工事"
              style={styles.textInput}
            />
          </View>
          
          <View style={styles.inputGroup}>
            <StyledText variant="body" weight="medium" style={styles.inputLabel}>
              クライアント名
            </StyledText>
            <TextInput
              mode="outlined"
              value={quickData.clientName}
              onChangeText={(text) => setQuickData(prev => ({ ...prev, clientName: text }))}
              placeholder="例：○○建設株式会社"
              style={styles.textInput}
            />
          </View>
        </Card>

        {/* 統合アップロード */}
        <Card style={styles.uploadCard}>
          <StyledText variant="subtitle" weight="semibold" style={styles.sectionTitle}>
            📁 スマートアップロード
          </StyledText>
          <StyledText variant="body" color="secondary" style={styles.sectionDescription}>
            ファイルをアップロードすると、AIが内容を解析して自動で見積を生成します
          </StyledText>
          
          <DocumentUploader
            onFilesChange={handleFilesChange}
            maxFiles={10}
            allowedDocTypes={['drawing', 'spec', 'photo', 'receipt']}
            title="クイックアップロード"
            description="ドラッグ&ドロップまたはタップ"
            uploadMode="batch"
            showPreview={true}
          />
          
          {isAnalyzing && (
            <View style={styles.analysisIndicator}>
              <StyledText variant="body" weight="medium" style={styles.analysisTitle}>
                🤖 AI解析中...
              </StyledText>
              <ProgressBar 
                progress={analysisProgress} 
                color={colors.primary.DEFAULT}
                style={styles.progressBar}
              />
              <StyledText variant="caption" color="secondary">
                {Math.round(analysisProgress * 100)}% 完了
              </StyledText>
            </View>
          )}
        </Card>

        {/* スマート事前入力結果 */}
        {quickData.smartPreFill.totalEstimate > 0 && (
          <Card style={styles.smartFillCard}>
            <View style={styles.smartFillHeader}>
              <StyledText variant="subtitle" weight="semibold">
                💡 スマート事前入力結果
              </StyledText>
              <Chip mode="outlined" compact>
                信頼度 {Math.round(quickData.confidence * 100)}%
              </Chip>
            </View>
            
            <View style={styles.estimateBreakdown}>
              <View style={styles.breakdownRow}>
                <StyledText variant="body">材料費</StyledText>
                <StyledText variant="body" weight="medium">
                  ¥{quickData.smartPreFill.breakdown.materials.toLocaleString()}
                </StyledText>
              </View>
              <View style={styles.breakdownRow}>
                <StyledText variant="body">労務費</StyledText>
                <StyledText variant="body" weight="medium">
                  ¥{quickData.smartPreFill.breakdown.labor.toLocaleString()}
                </StyledText>
              </View>
              <View style={styles.breakdownRow}>
                <StyledText variant="body">機材費</StyledText>
                <StyledText variant="body" weight="medium">
                  ¥{quickData.smartPreFill.breakdown.equipment.toLocaleString()}
                </StyledText>
              </View>
              <View style={styles.breakdownRow}>
                <StyledText variant="body">諸経費</StyledText>
                <StyledText variant="body" weight="medium">
                  ¥{quickData.smartPreFill.breakdown.overhead.toLocaleString()}
                </StyledText>
              </View>
              <View style={[styles.breakdownRow, styles.totalRow]}>
                <StyledText variant="title" weight="bold">合計</StyledText>
                <StyledText variant="title" weight="bold" color="primary">
                  ¥{quickData.smartPreFill.totalEstimate.toLocaleString()}
                </StyledText>
              </View>
            </View>
            
            <StyledText variant="caption" color="secondary">
              AIがアップロードされた{quickData.uploadedFiles.length}件のファイルから自動算出しました
            </StyledText>
          </Card>
        )}

        {/* AI提案 */}
        {showSmartSuggestions && quickData.aiSuggestions.length > 0 && (
          <Card style={styles.suggestionsCard}>
            <StyledText variant="subtitle" weight="semibold" style={styles.sectionTitle}>
              🎯 AI改善提案
            </StyledText>
            
            {quickData.aiSuggestions.map((suggestion, index) => (
              <View key={index} style={styles.suggestionItem}>
                <View style={styles.suggestionHeader}>
                  <Chip mode="outlined" compact style={styles.categoryChip}>
                    {suggestion.category === 'material' ? '材料' :
                     suggestion.category === 'labor' ? '労務' :
                     suggestion.category === 'equipment' ? '機材' : '調整'}
                  </Chip>
                  <StyledText variant="caption" color={suggestion.impact > 0 ? 'error' : 'success'}>
                    {suggestion.impact > 0 ? '+' : ''}¥{suggestion.impact.toLocaleString()}
                  </StyledText>
                </View>
                <StyledText variant="body" style={styles.suggestionText}>
                  {suggestion.suggestion}
                </StyledText>
                <StyledText variant="caption" color="secondary">
                  信頼度: {Math.round(suggestion.confidence * 100)}%
                </StyledText>
              </View>
            ))}
          </Card>
        )}
      </ScrollView>

      {/* フッター */}
      <View style={styles.footer}>
        <View style={styles.footerContent}>
          <View style={styles.totalDisplay}>
            <StyledText variant="body" color="secondary">見積合計</StyledText>
            <StyledText variant="title" weight="bold" color="primary">
              ¥{quickData.estimatedAmount.toLocaleString()}
            </StyledText>
          </View>
          <StyledButton
            title="見積確定"
            variant="primary"
            size="lg"
            elevated={true}
            onPress={handleConfirmEstimate}
            disabled={!quickData.projectName || !quickData.clientName}
            style={styles.confirmButton}
          />
        </View>
      </View>
    </SafeAreaView>
  )
}

// =============================================================================
// STYLES
// =============================================================================

const createStyles = (colors: any, spacing: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  sectionTitle: {
    marginBottom: 12,
  },
  sectionDescription: {
    marginBottom: 16,
    lineHeight: 20,
  },
  basicInfoCard: {
    marginBottom: 16,
    padding: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: colors.surface,
  },
  uploadCard: {
    marginBottom: 16,
    padding: 20,
  },
  analysisIndicator: {
    marginTop: 16,
    padding: 16,
    backgroundColor: colors.primary.DEFAULT + '10',
    borderRadius: 8,
    alignItems: 'center',
  },
  analysisTitle: {
    marginBottom: 8,
  },
  progressBar: {
    width: '100%',
    height: 8,
    borderRadius: 4,
    marginBottom: 8,
  },
  smartFillCard: {
    marginBottom: 16,
    padding: 20,
    backgroundColor: colors.success + '10',
    borderColor: colors.success,
    borderWidth: 1,
  },
  smartFillHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  estimateBreakdown: {
    gap: 8,
    marginBottom: 12,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 12,
    marginTop: 8,
  },
  suggestionsCard: {
    marginBottom: 16,
    padding: 20,
  },
  suggestionItem: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: colors.surface,
    borderRadius: 8,
  },
  suggestionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryChip: {
    backgroundColor: colors.background.primary,
  },
  suggestionText: {
    marginBottom: 4,
    lineHeight: 18,
  },
  footer: {
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  footerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalDisplay: {
    alignItems: 'flex-start',
  },
  confirmButton: {
    minWidth: 120,
  },
})