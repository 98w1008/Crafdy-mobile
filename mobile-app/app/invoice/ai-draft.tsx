/**
 * 請求書AIドラフト自動生成機能
 * 日報・材料・進捗データからAIが請求書ドラフトを作成
 */

import React, { useState, useEffect } from 'react'
import {
  View,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Alert,
  TouchableOpacity,
} from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { useAuth } from '@/contexts/AuthContext'
import { Colors, Spacing, Typography, BorderRadius } from '@/constants/Colors'
import { StyledText, StyledButton, Card } from '@/components/ui'
import { Surface, Button, IconButton, Chip, ProgressBar } from 'react-native-paper'
import { useTheme, useColors, useSpacing } from '@/theme/ThemeProvider'
import * as Haptics from 'expo-haptics'

// =============================================================================
// TYPES
// =============================================================================

interface Project {
  id: string
  name: string
  client: string
  status: 'active' | 'completed'
  start_date: string
  estimated_end_date?: string
  location: string
}

interface DailyReport {
  id: string
  project_id: string
  date: string
  work_description: string
  materials_used: MaterialUsage[]
  labor_hours: number
  weather: string
  progress_rate: number
}

interface MaterialUsage {
  material_name: string
  quantity: number
  unit: string
  unit_price: number
  total_price: number
  supplier: string
  receipt_image?: string
}

interface InvoiceDraft {
  project_info: {
    project_name: string
    client_name: string
    work_period: string
    location: string
  }
  line_items: InvoiceLineItem[]
  summary: {
    subtotal: number
    tax: number
    total: number
    discount?: number
  }
  ai_insights: {
    missing_items: string[]
    cost_optimization: string[]
    client_considerations: string[]
  }
}

interface InvoiceLineItem {
  category: 'labor' | 'material' | 'equipment' | 'other'
  description: string
  quantity: number
  unit: string
  unit_price: number
  total_price: number
  evidence_link?: string
}

type GenerationStep = 'project_selection' | 'data_analysis' | 'ai_generation' | 'review' | 'complete'

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function InvoiceAIDraftScreen() {
  const params = useLocalSearchParams()
  const projectId = params.project_id as string
  
  const { user } = useAuth()
  const colors = useColors()
  const spacing = useSpacing()
  
  // State
  const [currentStep, setCurrentStep] = useState<GenerationStep>('project_selection')
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [dailyReports, setDailyReports] = useState<DailyReport[]>([])
  const [invoiceDraft, setInvoiceDraft] = useState<InvoiceDraft | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  
  // Mock data
  const [projects] = useState<Project[]>([
    {
      id: '1',
      name: '渋谷オフィス改修工事',
      client: '株式会社テックオフィス',
      status: 'active',
      start_date: '2024-01-15',
      estimated_end_date: '2024-02-15',
      location: '東京都渋谷区'
    },
    {
      id: '2',
      name: '新宿マンション建設',
      client: '新宿不動産株式会社',
      status: 'active',
      start_date: '2024-01-01',
      location: '東京都新宿区'
    },
    {
      id: '3',
      name: '品川倉庫解体工事',
      client: '品川ロジスティック',
      status: 'completed',
      start_date: '2023-12-01',
      estimated_end_date: '2024-01-31',
      location: '東京都品川区'
    }
  ])

  useEffect(() => {
    if (projectId && projects.length > 0) {
      const project = projects.find(p => p.id === projectId)
      if (project) {
        setSelectedProject(project)
        setCurrentStep('data_analysis')
        loadProjectData(projectId)
      }
    }
  }, [projectId, projects])

  // プロジェクトデータ読み込み
  const loadProjectData = async (projectId: string) => {
    setIsLoading(true)
    setProgress(0.1)
    
    try {
      // Mock daily reports data
      await new Promise(resolve => setTimeout(resolve, 1000))
      setProgress(0.5)
      
      const mockReports: DailyReport[] = [
        {
          id: '1',
          project_id: projectId,
          date: '2024-01-15',
          work_description: '基礎工事完了、鉄骨組み立て開始',
          materials_used: [
            {
              material_name: 'コンクリート',
              quantity: 10,
              unit: 'm³',
              unit_price: 12000,
              total_price: 120000,
              supplier: '建材商事'
            },
            {
              material_name: '鉄筋 D13',
              quantity: 100,
              unit: '本',
              unit_price: 800,
              total_price: 80000,
              supplier: '鉄鋼株式会社'
            }
          ],
          labor_hours: 48,
          weather: '晴れ',
          progress_rate: 0.3
        },
        {
          id: '2',
          project_id: projectId,
          date: '2024-01-16',
          work_description: '鉄骨組み立て継続、電気配線工事',
          materials_used: [
            {
              material_name: 'ケーブル VVF',
              quantity: 200,
              unit: 'm',
              unit_price: 120,
              total_price: 24000,
              supplier: '電材卸売'
            }
          ],
          labor_hours: 40,
          weather: '曇り',
          progress_rate: 0.5
        }
      ]
      
      setDailyReports(mockReports)
      setProgress(1)
      setCurrentStep('ai_generation')
      
    } catch (error) {
      console.error('プロジェクトデータ読み込みエラー:', error)
      Alert.alert('エラー', 'プロジェクトデータの読み込みに失敗しました')
    } finally {
      setIsLoading(false)
    }
  }

  // AI請求書生成
  const generateInvoiceDraft = async () => {
    setIsLoading(true)
    setProgress(0)
    
    try {
      // AI分析シミュレート
      setProgress(0.2)
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      setProgress(0.6)
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // AI生成結果（模擬）
      const draft: InvoiceDraft = {
        project_info: {
          project_name: selectedProject!.name,
          client_name: selectedProject!.client,
          work_period: `${selectedProject!.start_date} - ${new Date().toLocaleDateString('ja-JP')}`,
          location: selectedProject!.location
        },
        line_items: [
          {
            category: 'labor',
            description: '基礎工事・鉄骨組立作業',
            quantity: 88,
            unit: '時間',
            unit_price: 3500,
            total_price: 308000
          },
          {
            category: 'material',
            description: 'コンクリート・鉄筋材料',
            quantity: 1,
            unit: '式',
            unit_price: 200000,
            total_price: 200000,
            evidence_link: 'receipt_001.jpg'
          },
          {
            category: 'material',
            description: '電気配線材料',
            quantity: 1,
            unit: '式',
            unit_price: 24000,
            total_price: 24000,
            evidence_link: 'receipt_002.jpg'
          },
          {
            category: 'equipment',
            description: '重機レンタル・運搬費',
            quantity: 5,
            unit: '日',
            unit_price: 15000,
            total_price: 75000
          }
        ],
        summary: {
          subtotal: 607000,
          tax: 60700,
          total: 667700
        },
        ai_insights: {
          missing_items: [
            '足場設置費用',
            '産業廃棄物処理費',
            '安全管理費'
          ],
          cost_optimization: [
            '材料費は市場平均より5%安く抑えられています',
            '労務費は適正範囲内です',
            '重機レンタル期間の最適化余地があります'
          ],
          client_considerations: [
            'この顧客は詳細な内訳を好む傾向があります',
            '前回請求で材料費の根拠を求められました',
            '支払い条件: 月末締め翌月末払い'
          ]
        }
      }
      
      setProgress(1)
      setInvoiceDraft(draft)
      setCurrentStep('review')
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      
    } catch (error) {
      console.error('AI生成エラー:', error)
      Alert.alert('エラー', '請求書の生成に失敗しました')
    } finally {
      setIsLoading(false)
    }
  }

  // プロジェクト選択
  const handleProjectSelect = (project: Project) => {
    setSelectedProject(project)
    setCurrentStep('data_analysis')
    loadProjectData(project.id)
    if (Haptics) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    }
  }

  // プロジェクト選択画面
  const renderProjectSelection = () => (
    <View style={styles.stepContainer}>
      <Card variant="premium" style={styles.headerCard}>
        <StyledText variant="title" weight="semibold" align="center">
          📋 AI請求書ドラフト生成
        </StyledText>
        <StyledText variant="body" color="secondary" align="center" style={styles.headerDescription}>
          日報データから自動的に請求書ドラフトを生成します
        </StyledText>
      </Card>

      <Card variant="elevated" style={styles.projectListCard}>
        <StyledText variant="subtitle" weight="semibold" style={styles.sectionTitle}>
          対象プロジェクトを選択
        </StyledText>
        
        {projects.map((project) => (
          <TouchableOpacity
            key={project.id}
            style={styles.projectItem}
            onPress={() => handleProjectSelect(project)}
          >
            <View style={styles.projectInfo}>
              <View style={styles.projectHeader}>
                <StyledText variant="body" weight="semibold" numberOfLines={1}>
                  {project.name}
                </StyledText>
                <Chip 
                  mode="outlined" 
                  compact
                  style={[styles.statusChip, {
                    backgroundColor: project.status === 'active' ? Colors.success + '20' : Colors.warning + '20'
                  }]}
                >
                  {project.status === 'active' ? '進行中' : '完了'}
                </Chip>
              </View>
              <StyledText variant="caption" color="secondary">
                顧客: {project.client}
              </StyledText>
              <StyledText variant="caption" color="secondary">
                場所: {project.location}
              </StyledText>
            </View>
            <IconButton icon="chevron-right" size={20} />
          </TouchableOpacity>
        ))}
      </Card>
    </View>
  )

  // データ分析画面
  const renderDataAnalysis = () => (
    <View style={styles.stepContainer}>
      <Card variant="elevated" style={styles.analysisCard}>
        <StyledText variant="subtitle" weight="semibold" style={styles.sectionTitle}>
          📊 プロジェクトデータ分析
        </StyledText>
        
        <View style={styles.projectSummary}>
          <StyledText variant="body" weight="medium">
            {selectedProject?.name}
          </StyledText>
          <StyledText variant="caption" color="secondary">
            {selectedProject?.client}
          </StyledText>
        </View>

        <View style={styles.dataStats}>
          <View style={styles.statItem}>
            <StyledText variant="title" weight="bold" color="primary">
              {dailyReports.length}
            </StyledText>
            <StyledText variant="caption">日報件数</StyledText>
          </View>
          <View style={styles.statItem}>
            <StyledText variant="title" weight="bold" color="primary">
              {dailyReports.reduce((sum, report) => sum + report.materials_used.length, 0)}
            </StyledText>
            <StyledText variant="caption">材料項目</StyledText>
          </View>
          <View style={styles.statItem}>
            <StyledText variant="title" weight="bold" color="primary">
              {dailyReports.reduce((sum, report) => sum + report.labor_hours, 0)}h
            </StyledText>
            <StyledText variant="caption">総作業時間</StyledText>
          </View>
        </View>

        {isLoading && (
          <View style={styles.progressContainer}>
            <StyledText variant="body" align="center" style={{ marginBottom: spacing[2] }}>
              データ分析中...
            </StyledText>
            <ProgressBar progress={progress} color={colors.primary.DEFAULT} />
          </View>
        )}

        {!isLoading && currentStep === 'ai_generation' && (
          <StyledButton
            title="🤖 AI請求書生成開始"
            variant="primary"
            size="lg"
            elevated={true}
            onPress={generateInvoiceDraft}
            style={styles.generateButton}
          />
        )}
      </Card>
    </View>
  )

  // AI生成画面
  const renderAIGeneration = () => (
    <View style={styles.stepContainer}>
      <Card variant="premium" style={styles.generationCard}>
        <View style={styles.generationContent}>
          <StyledText variant="title" weight="semibold" align="center">
            🤖 AI が請求書を生成中...
          </StyledText>
          <StyledText variant="body" color="secondary" align="center" style={styles.generationText}>
            日報データ、材料費、労務費を分析して最適な請求書を作成しています
          </StyledText>
          
          <View style={styles.progressContainer}>
            <ProgressBar progress={progress} color={colors.primary.DEFAULT} />
            <StyledText variant="caption" align="center" style={{ marginTop: spacing[2] }}>
              {Math.round(progress * 100)}% 完了
            </StyledText>
          </View>
        </View>
      </Card>
    </View>
  )

  // レビュー画面
  const renderReview = () => {
    if (!invoiceDraft) return null

    return (
      <View style={styles.stepContainer}>
        {/* プロジェクト情報 */}
        <Card variant="elevated" style={styles.reviewCard}>
          <StyledText variant="subtitle" weight="semibold" style={styles.sectionTitle}>
            📋 請求書ドラフト
          </StyledText>
          
          <View style={styles.invoiceHeader}>
            <StyledText variant="body" weight="medium">
              {invoiceDraft.project_info.project_name}
            </StyledText>
            <StyledText variant="caption" color="secondary">
              {invoiceDraft.project_info.client_name}
            </StyledText>
            <StyledText variant="caption" color="secondary">
              作業期間: {invoiceDraft.project_info.work_period}
            </StyledText>
          </View>
        </Card>

        {/* 請求項目 */}
        <Card variant="elevated" style={styles.reviewCard}>
          <StyledText variant="body" weight="semibold" style={styles.sectionTitle}>
            請求項目
          </StyledText>
          
          {invoiceDraft.line_items.map((item, index) => (
            <View key={index} style={styles.lineItem}>
              <View style={styles.lineItemHeader}>
                <StyledText variant="body" weight="medium">
                  {item.description}
                </StyledText>
                <Chip 
                  mode="outlined" 
                  compact
                  style={[styles.categoryChip, {
                    backgroundColor: getCategoryColor(item.category)
                  }]}
                >
                  {getCategoryLabel(item.category)}
                </Chip>
              </View>
              <View style={styles.lineItemDetails}>
                <StyledText variant="caption" color="secondary">
                  {item.quantity} {item.unit} × ¥{item.unit_price.toLocaleString()}
                </StyledText>
                <StyledText variant="body" weight="semibold">
                  ¥{item.total_price.toLocaleString()}
                </StyledText>
              </View>
              {item.evidence_link && (
                <StyledText variant="caption" color="primary">
                  📎 証憑: {item.evidence_link}
                </StyledText>
              )}
            </View>
          ))}

          <View style={styles.summary}>
            <View style={styles.summaryRow}>
              <StyledText variant="body">小計</StyledText>
              <StyledText variant="body">¥{invoiceDraft.summary.subtotal.toLocaleString()}</StyledText>
            </View>
            <View style={styles.summaryRow}>
              <StyledText variant="body">消費税</StyledText>
              <StyledText variant="body">¥{invoiceDraft.summary.tax.toLocaleString()}</StyledText>
            </View>
            <View style={[styles.summaryRow, styles.totalRow]}>
              <StyledText variant="body" weight="bold">合計</StyledText>
              <StyledText variant="title" weight="bold" color="primary">
                ¥{invoiceDraft.summary.total.toLocaleString()}
              </StyledText>
            </View>
          </View>
        </Card>

        {/* AI インサイト */}
        <Card variant="premium" style={styles.reviewCard}>
          <StyledText variant="body" weight="semibold" style={styles.sectionTitle}>
            🤖 AI からの提案
          </StyledText>
          
          {invoiceDraft.ai_insights.missing_items.length > 0 && (
            <View style={styles.insightSection}>
              <StyledText variant="body" weight="medium" color="warning">
                ⚠️ 追加検討項目
              </StyledText>
              {invoiceDraft.ai_insights.missing_items.map((item, index) => (
                <StyledText key={index} variant="caption" color="secondary" style={styles.insightItem}>
                  • {item}
                </StyledText>
              ))}
            </View>
          )}
          
          <View style={styles.insightSection}>
            <StyledText variant="body" weight="medium" color="success">
              💡 コスト分析
            </StyledText>
            {invoiceDraft.ai_insights.cost_optimization.map((insight, index) => (
              <StyledText key={index} variant="caption" color="secondary" style={styles.insightItem}>
                • {insight}
              </StyledText>
            ))}
          </View>
          
          <View style={styles.insightSection}>
            <StyledText variant="body" weight="medium" color="primary">
              👥 顧客特性
            </StyledText>
            {invoiceDraft.ai_insights.client_considerations.map((consideration, index) => (
              <StyledText key={index} variant="caption" color="secondary" style={styles.insightItem}>
                • {consideration}
              </StyledText>
            ))}
          </View>
        </Card>

        {/* アクションボタン */}
        <Card variant="elevated" style={styles.actionCard}>
          <View style={styles.actionButtons}>
            <StyledButton
              title="📝 請求書編集"
              variant="outline"
              size="md"
              onPress={() => router.push(`/invoice/${selectedProject?.id}/edit`)}
              style={styles.actionButton}
            />
            <StyledButton
              title="✅ 請求書確定"
              variant="primary"
              size="lg"
              elevated={true}
              onPress={() => {
                Alert.alert(
                  '請求書確定',
                  '請求書ドラフトを確定しますか？',
                  [
                    { text: 'キャンセル', style: 'cancel' },
                    { 
                      text: '確定', 
                      onPress: () => {
                        setCurrentStep('complete')
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
                      }
                    }
                  ]
                )
              }}
              style={styles.actionButton}
            />
          </View>
        </Card>
      </View>
    )
  }

  // 完了画面
  const renderComplete = () => (
    <View style={styles.stepContainer}>
      <Card variant="success" style={styles.completeCard}>
        <View style={styles.completeContent}>
          <StyledText variant="title" weight="semibold" align="center">
            ✅ 請求書ドラフト完了
          </StyledText>
          <StyledText variant="body" color="secondary" align="center" style={styles.completeText}>
            AI による請求書ドラフトが正常に生成されました
          </StyledText>
          
          <View style={styles.completeStats}>
            <StyledText variant="body" align="center">
              総額: ¥{invoiceDraft?.summary.total.toLocaleString()}
            </StyledText>
            <StyledText variant="caption" color="secondary" align="center">
              項目数: {invoiceDraft?.line_items.length}件
            </StyledText>
          </View>

          <StyledButton
            title="請求書一覧に戻る"
            variant="primary"
            size="lg"
            onPress={() => router.push('/invoice')}
            style={styles.completeButton}
          />
        </View>
      </Card>
    </View>
  )

  // カテゴリー色取得
  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'labor': return Colors.primary + '20'
      case 'material': return Colors.success + '20'
      case 'equipment': return Colors.warning + '20'
      default: return Colors.secondary + '20'
    }
  }

  // カテゴリーラベル取得
  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'labor': return '労務費'
      case 'material': return '材料費'
      case 'equipment': return '機材費'
      default: return 'その他'
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* ヘッダー */}
      <Surface style={styles.header}>
        <IconButton icon="arrow-left" onPress={() => router.back()} />
        <View style={styles.headerContent}>
          <StyledText variant="title" weight="semibold">
            AI請求書ドラフト
          </StyledText>
          <StyledText variant="caption" color="secondary">
            {currentStep === 'project_selection' ? 'プロジェクト選択' :
             currentStep === 'data_analysis' ? 'データ分析' :
             currentStep === 'ai_generation' ? 'AI生成中' :
             currentStep === 'review' ? 'ドラフト確認' : '完了'}
          </StyledText>
        </View>
        <View style={{ width: 48 }} />
      </Surface>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {currentStep === 'project_selection' && renderProjectSelection()}
        {currentStep === 'data_analysis' && renderDataAnalysis()}
        {currentStep === 'ai_generation' && renderAIGeneration()}
        {currentStep === 'review' && renderReview()}
        {currentStep === 'complete' && renderComplete()}
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
    elevation: 2,
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
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
  headerCard: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  headerDescription: {
    marginTop: Spacing.md,
  },
  projectListCard: {
    paddingVertical: Spacing.lg,
  },
  sectionTitle: {
    marginBottom: Spacing.md,
  },
  projectItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    marginVertical: Spacing.xs,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  projectInfo: {
    flex: 1,
    gap: Spacing.xs,
  },
  projectHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusChip: {
    height: 24,
  },
  analysisCard: {
    paddingVertical: Spacing.lg,
  },
  projectSummary: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
    paddingBottom: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  dataStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: Spacing.lg,
  },
  statItem: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  progressContainer: {
    marginVertical: Spacing.lg,
  },
  generateButton: {
    minHeight: 56,
  },
  generationCard: {
    alignItems: 'center',
    paddingVertical: Spacing['2xl'],
  },
  generationContent: {
    alignItems: 'center',
    gap: Spacing.lg,
    width: '100%',
  },
  generationText: {
    textAlign: 'center',
    marginVertical: Spacing.md,
  },
  reviewCard: {
    marginBottom: Spacing.lg,
  },
  invoiceHeader: {
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  lineItem: {
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  lineItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  lineItemDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryChip: {
    height: 24,
  },
  summary: {
    marginTop: Spacing.lg,
    paddingTop: Spacing.lg,
    borderTopWidth: 2,
    borderTopColor: Colors.border,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
  },
  totalRow: {
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  insightSection: {
    marginBottom: Spacing.lg,
  },
  insightItem: {
    marginLeft: Spacing.md,
    marginTop: Spacing.xs,
  },
  actionCard: {
    paddingVertical: Spacing.lg,
  },
  actionButtons: {
    gap: Spacing.md,
  },
  actionButton: {
    minHeight: 48,
  },
  completeCard: {
    alignItems: 'center',
    paddingVertical: Spacing['2xl'],
  },
  completeContent: {
    alignItems: 'center',
    gap: Spacing.lg,
    width: '100%',
  },
  completeText: {
    textAlign: 'center',
    marginVertical: Spacing.md,
  },
  completeStats: {
    alignItems: 'center',
    gap: Spacing.sm,
    marginVertical: Spacing.lg,
  },
  completeButton: {
    minHeight: 56,
    minWidth: 200,
  },
})