/**
 * スマート見積作成機能
 * AI学習モデルによる価格最適化・元請特性・工期予測
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
import { useAuth } from '@/contexts/AuthContext'
import { Colors, Spacing, Typography, BorderRadius, Shadows } from '@/constants/Colors'
import { StyledText, StyledButton, Card } from '@/components/ui'
import { Surface, IconButton, Chip, TextInput, Button, ProgressBar } from 'react-native-paper'
import { useTheme, useColors, useSpacing } from '@/theme/ThemeProvider'
import * as Haptics from 'expo-haptics'

// =============================================================================
// TYPES  
// =============================================================================

interface Client {
  id: string
  name: string
  type: 'individual' | 'corporate' | 'government'
  budget_range: 'low' | 'medium' | 'high' | 'premium'
  payment_terms: string
  preferred_schedule: 'fast' | 'normal' | 'flexible'
  price_sensitivity: number // 0-1, 1が最も価格敏感
  quality_priority: number // 0-1, 1が最も品質重視
  relationship_duration: number // 取引年数
  past_projects: number
  average_project_size: number
}

interface ProjectScope {
  type: 'renovation' | 'construction' | 'demolition' | 'repair'
  size_category: 'small' | 'medium' | 'large' | 'mega'
  complexity: 'simple' | 'standard' | 'complex' | 'very_complex'
  location_type: 'urban' | 'suburban' | 'rural' | 'remote'
  building_type: 'residential' | 'commercial' | 'industrial' | 'public'
  special_requirements: string[]
  materials: string[]
  estimated_duration: number // 日数
}

interface EstimateItem {
  id: string
  category: 'labor' | 'material' | 'equipment' | 'overhead' | 'profit'
  name: string
  description: string
  quantity: number
  unit: string
  base_unit_price: number
  adjusted_unit_price: number
  total_price: number
  adjustment_factors: {
    market_rate: number
    client_factor: number
    complexity_factor: number
    schedule_factor: number
    relationship_factor: number
  }
}

interface SmartEstimate {
  client: Client
  project_scope: ProjectScope
  items: EstimateItem[]
  summary: {
    subtotal: number
    tax: number
    total: number
    profit_margin: number
  }
  ai_insights: {
    win_probability: number
    optimal_price_range: { min: number, max: number }
    competitive_analysis: string[]
    risk_factors: string[]
    recommendations: string[]
  }
  schedule_prediction: {
    estimated_start: string
    estimated_completion: string
    critical_milestones: string[]
    weather_considerations: string[]
  }
}

type EstimateStep = 'client_selection' | 'scope_definition' | 'ai_analysis' | 'review' | 'finalize'

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function SmartEstimateScreen() {
  const params = useLocalSearchParams()
  const clientId = params.client_id as string
  
  const { user } = useAuth()
  const colors = useColors()
  const spacing = useSpacing()
  
  // State
  const [currentStep, setCurrentStep] = useState<EstimateStep>('client_selection')
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [projectScope, setProjectScope] = useState<ProjectScope>({
    type: 'renovation',
    size_category: 'medium',
    complexity: 'standard',
    location_type: 'urban',
    building_type: 'residential',
    special_requirements: [],
    materials: [],
    estimated_duration: 30
  })
  const [smartEstimate, setSmartEstimate] = useState<SmartEstimate | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  
  // Mock clients data
  const [clients] = useState<Client[]>([
    {
      id: '1',
      name: '株式会社テックオフィス',
      type: 'corporate',
      budget_range: 'high',
      payment_terms: '月末締め翌月末払い',
      preferred_schedule: 'normal',
      price_sensitivity: 0.3,
      quality_priority: 0.8,
      relationship_duration: 3,
      past_projects: 8,
      average_project_size: 2500000
    },
    {
      id: '2',
      name: '新宿不動産株式会社',
      type: 'corporate',
      budget_range: 'premium',
      payment_terms: '検収後30日以内',
      preferred_schedule: 'fast',
      price_sensitivity: 0.2,
      quality_priority: 0.9,
      relationship_duration: 5,
      past_projects: 15,
      average_project_size: 8000000
    },
    {
      id: '3',
      name: '山田太郎 様',
      type: 'individual',
      budget_range: 'medium',
      payment_terms: '着手金50% 完成時50%',
      preferred_schedule: 'flexible',
      price_sensitivity: 0.7,
      quality_priority: 0.6,
      relationship_duration: 0,
      past_projects: 0,
      average_project_size: 0
    }
  ])

  useEffect(() => {
    if (clientId && clients.length > 0) {
      const client = clients.find(c => c.id === clientId)
      if (client) {
        setSelectedClient(client)
        setCurrentStep('scope_definition')
      }
    }
  }, [clientId, clients])

  // クライアント選択
  const handleClientSelect = (client: Client) => {
    setSelectedClient(client)
    setCurrentStep('scope_definition')
    if (Haptics) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    }
  }

  // AI分析実行
  const runAIAnalysis = async () => {
    if (!selectedClient) return
    
    setIsLoading(true)
    setCurrentStep('ai_analysis')
    setProgress(0)
    
    try {
      // Step 1: 市場データ分析
      setProgress(0.2)
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Step 2: クライアント特性分析
      setProgress(0.4)
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Step 3: 価格最適化
      setProgress(0.6)
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Step 4: リスク分析
      setProgress(0.8)
      await new Promise(resolve => setTimeout(resolve, 800))
      
      // Step 5: 見積生成
      setProgress(1.0)
      
      // AI生成結果（模擬）
      const mockEstimate: SmartEstimate = {
        client: selectedClient,
        project_scope: projectScope,
        items: [
          {
            id: '1',
            category: 'labor',
            name: '基礎工事',
            description: 'コンクリート基礎打設・養生',
            quantity: 50,
            unit: 'm²',
            base_unit_price: 8000,
            adjusted_unit_price: 8400,
            total_price: 420000,
            adjustment_factors: {
              market_rate: 1.0,
              client_factor: 1.05, // 優良顧客補正
              complexity_factor: 1.0,
              schedule_factor: 1.0,
              relationship_factor: 1.0
            }
          },
          {
            id: '2',
            category: 'material',
            name: 'コンクリート・鉄筋',
            description: '基礎用コンクリート・鉄筋材料',
            quantity: 1,
            unit: '式',
            base_unit_price: 300000,
            adjusted_unit_price: 285000,
            total_price: 285000,
            adjustment_factors: {
              market_rate: 0.95, // 市場価格下落
              client_factor: 1.0,
              complexity_factor: 1.0,
              schedule_factor: 1.0,
              relationship_factor: 1.0
            }
          },
          {
            id: '3',
            category: 'equipment',
            name: '重機レンタル',
            description: 'ユンボ・ミキサー車レンタル',
            quantity: 15,
            unit: '日',
            base_unit_price: 25000,
            adjusted_unit_price: 24000,
            total_price: 360000,
            adjustment_factors: {
              market_rate: 0.96,
              client_factor: 1.0,
              complexity_factor: 1.0,
              schedule_factor: 1.0,
              relationship_factor: 1.0
            }
          },
          {
            id: '4',
            category: 'overhead',
            name: '諸経費',
            description: '交通費・安全管理費・保険',
            quantity: 1,
            unit: '式',
            base_unit_price: 150000,
            adjusted_unit_price: 150000,
            total_price: 150000,
            adjustment_factors: {
              market_rate: 1.0,
              client_factor: 1.0,
              complexity_factor: 1.0,
              schedule_factor: 1.0,
              relationship_factor: 1.0
            }
          }
        ],
        summary: {
          subtotal: 1215000,
          tax: 121500,
          total: 1336500,
          profit_margin: 0.18
        },
        ai_insights: {
          win_probability: 0.78,
          optimal_price_range: { min: 1200000, max: 1450000 },
          competitive_analysis: [
            '類似案件の平均価格: ¥1,280,000',
            'この顧客の過去受注価格: 平均より8%高',
            '競合他社想定価格: ¥1,250,000-1,400,000'
          ],
          risk_factors: [
            '新規顧客のため支払い条件要確認',
            '材料価格の変動可能性（±5%）',
            '天候による工期延長リスク'
          ],
          recommendations: [
            '品質重視の顧客のため、使用材料の詳細説明を追加',
            '支払い条件は着手金60%を提案',
            '工期に余裕を持たせた計画を提示'
          ]
        },
        schedule_prediction: {
          estimated_start: '2024-02-01',
          estimated_completion: '2024-03-15',
          critical_milestones: [
            '基礎工事完了: 2024-02-10',
            '躯体工事完了: 2024-02-25',
            '仕上げ工事完了: 2024-03-10'
          ],
          weather_considerations: [
            '2月中旬の降雪による遅延可能性',
            'コンクリート養生期間の気温要注意'
          ]
        }
      }
      
      setSmartEstimate(mockEstimate)
      setCurrentStep('review')
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      
    } catch (error) {
      console.error('AI分析エラー:', error)
      Alert.alert('エラー', 'AI分析に失敗しました')
      setCurrentStep('scope_definition')
    } finally {
      setIsLoading(false)
    }
  }

  // クライアント選択画面
  const renderClientSelection = () => (
    <View style={styles.stepContainer}>
      <Card variant="premium" style={styles.headerCard}>
        <StyledText variant="title" weight="semibold" align="center">
          🧠 スマート見積作成
        </StyledText>
        <StyledText variant="body" color="secondary" align="center" style={styles.headerDescription}>
          AIが顧客特性と市場データを分析して最適な見積を提案します
        </StyledText>
      </Card>

      <Card variant="elevated" style={styles.clientListCard}>
        <StyledText variant="subtitle" weight="semibold" style={styles.sectionTitle}>
          顧客を選択してください
        </StyledText>
        
        {clients.map((client) => (
          <TouchableOpacity
            key={client.id}
            style={styles.clientItem}
            onPress={() => handleClientSelect(client)}
          >
            <View style={styles.clientInfo}>
              <View style={styles.clientHeader}>
                <StyledText variant="body" weight="semibold">
                  {client.name}
                </StyledText>
                <Chip 
                  mode="outlined" 
                  compact
                  style={[styles.typeChip, {
                    backgroundColor: getClientTypeColor(client.type)
                  }]}
                >
                  {getClientTypeLabel(client.type)}
                </Chip>
              </View>
              
              <View style={styles.clientDetails}>
                <View style={styles.clientMetric}>
                  <StyledText variant="caption" color="secondary">予算帯</StyledText>
                  <StyledText variant="caption" weight="medium">
                    {getBudgetRangeLabel(client.budget_range)}
                  </StyledText>
                </View>
                <View style={styles.clientMetric}>
                  <StyledText variant="caption" color="secondary">取引歴</StyledText>
                  <StyledText variant="caption" weight="medium">
                    {client.past_projects}件・{client.relationship_duration}年
                  </StyledText>
                </View>
                <View style={styles.clientMetric}>
                  <StyledText variant="caption" color="secondary">特性</StyledText>
                  <StyledText variant="caption" weight="medium">
                    {client.quality_priority > 0.7 ? '品質重視' : 
                     client.price_sensitivity > 0.7 ? '価格重視' : 'バランス'}
                  </StyledText>
                </View>
              </View>
            </View>
            <IconButton icon="chevron-right" size={20} />
          </TouchableOpacity>
        ))}
      </Card>
    </View>
  )

  // スコープ定義画面
  const renderScopeDefinition = () => (
    <View style={styles.stepContainer}>
      <Card variant="elevated" style={styles.scopeCard}>
        <StyledText variant="subtitle" weight="semibold" style={styles.sectionTitle}>
          📋 プロジェクト概要
        </StyledText>
        <StyledText variant="body" color="secondary" style={{ marginBottom: spacing[4] }}>
          {selectedClient?.name} 様
        </StyledText>

        <View style={styles.scopeSection}>
          <StyledText variant="body" weight="medium" style={styles.scopeLabel}>
            工事種別
          </StyledText>
          <View style={styles.optionGrid}>
            {[
              { key: 'renovation', label: '改修工事' },
              { key: 'construction', label: '新築工事' },
              { key: 'demolition', label: '解体工事' },
              { key: 'repair', label: '修繕工事' }
            ].map((option) => (
              <TouchableOpacity
                key={option.key}
                style={[
                  styles.optionButton,
                  projectScope.type === option.key && styles.optionSelected
                ]}
                onPress={() => setProjectScope({...projectScope, type: option.key as any})}
              >
                <StyledText variant="caption" weight="medium">
                  {option.label}
                </StyledText>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.scopeSection}>
          <StyledText variant="body" weight="medium" style={styles.scopeLabel}>
            規模
          </StyledText>
          <View style={styles.optionGrid}>
            {[
              { key: 'small', label: '小規模' },
              { key: 'medium', label: '中規模' },
              { key: 'large', label: '大規模' },
              { key: 'mega', label: '超大規模' }
            ].map((option) => (
              <TouchableOpacity
                key={option.key}
                style={[
                  styles.optionButton,
                  projectScope.size_category === option.key && styles.optionSelected
                ]}
                onPress={() => setProjectScope({...projectScope, size_category: option.key as any})}
              >
                <StyledText variant="caption" weight="medium">
                  {option.label}
                </StyledText>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.scopeSection}>
          <StyledText variant="body" weight="medium" style={styles.scopeLabel}>
            複雑度
          </StyledText>
          <View style={styles.optionGrid}>
            {[
              { key: 'simple', label: 'シンプル' },
              { key: 'standard', label: '標準的' },
              { key: 'complex', label: '複雑' },
              { key: 'very_complex', label: '非常に複雑' }
            ].map((option) => (
              <TouchableOpacity
                key={option.key}
                style={[
                  styles.optionButton,
                  projectScope.complexity === option.key && styles.optionSelected
                ]}
                onPress={() => setProjectScope({...projectScope, complexity: option.key as any})}
              >
                <StyledText variant="caption" weight="medium">
                  {option.label}
                </StyledText>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.scopeSection}>
          <StyledText variant="body" weight="medium" style={styles.scopeLabel}>
            予想工期（日数）
          </StyledText>
          <TextInput
            mode="outlined"
            value={projectScope.estimated_duration.toString()}
            onChangeText={(text) => setProjectScope({
              ...projectScope, 
              estimated_duration: parseInt(text) || 30
            })}
            keyboardType="numeric"
            style={styles.durationInput}
          />
        </View>

        <StyledButton
          title="🤖 AI分析開始"
          variant="primary"
          size="lg"
          elevated={true}
          onPress={runAIAnalysis}
          style={styles.analyzeButton}
        />
      </Card>
    </View>
  )

  // AI分析画面
  const renderAIAnalysis = () => (
    <View style={styles.stepContainer}>
      <Card variant="premium" style={styles.analysisCard}>
        <View style={styles.analysisContent}>
          <StyledText variant="title" weight="semibold" align="center">
            🧠 AI が見積を分析中...
          </StyledText>
          <StyledText variant="body" color="secondary" align="center" style={styles.analysisText}>
            市場データ、顧客特性、過去実績を総合的に分析しています
          </StyledText>
          
          <View style={styles.analysisSteps}>
            <View style={[styles.analysisStep, { opacity: progress >= 0.2 ? 1 : 0.5 }]}>
              <StyledText variant="body" weight="medium">📊 市場データ分析</StyledText>
            </View>
            <View style={[styles.analysisStep, { opacity: progress >= 0.4 ? 1 : 0.5 }]}>
              <StyledText variant="body" weight="medium">👤 顧客特性分析</StyledText>
            </View>
            <View style={[styles.analysisStep, { opacity: progress >= 0.6 ? 1 : 0.5 }]}>
              <StyledText variant="body" weight="medium">💰 価格最適化</StyledText>
            </View>
            <View style={[styles.analysisStep, { opacity: progress >= 0.8 ? 1 : 0.5 }]}>
              <StyledText variant="body" weight="medium">⚠️ リスク分析</StyledText>
            </View>
          </View>
          
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
    if (!smartEstimate) return null

    return (
      <ScrollView style={styles.reviewContainer}>
        {/* 見積サマリー */}
        <Card variant="premium" style={styles.summaryCard}>
          <StyledText variant="subtitle" weight="semibold" style={styles.sectionTitle}>
            💰 見積結果
          </StyledText>
          <View style={styles.priceSummary}>
            <StyledText variant="title" weight="bold" color="primary">
              ¥{smartEstimate.summary.total.toLocaleString()}
            </StyledText>
            <StyledText variant="caption" color="secondary">
              (税込・利益率 {(smartEstimate.summary.profit_margin * 100).toFixed(0)}%)
            </StyledText>
          </View>
          
          <View style={styles.winProbability}>
            <StyledText variant="body" weight="medium" style={{ marginBottom: spacing[2] }}>
              🎯 受注確率: {(smartEstimate.ai_insights.win_probability * 100).toFixed(0)}%
            </StyledText>
            <ProgressBar 
              progress={smartEstimate.ai_insights.win_probability} 
              color={smartEstimate.ai_insights.win_probability > 0.7 ? Colors.success : 
                     smartEstimate.ai_insights.win_probability > 0.4 ? Colors.warning : Colors.error}
            />
          </View>
        </Card>

        {/* 価格内訳 */}
        <Card variant="elevated" style={styles.itemsCard}>
          <StyledText variant="subtitle" weight="semibold" style={styles.sectionTitle}>
            📋 見積内訳
          </StyledText>
          
          {smartEstimate.items.map((item, index) => (
            <View key={item.id} style={styles.estimateItem}>
              <View style={styles.itemHeader}>
                <StyledText variant="body" weight="medium">
                  {item.name}
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
              <StyledText variant="caption" color="secondary" style={{ marginBottom: spacing[2] }}>
                {item.description}
              </StyledText>
              <View style={styles.itemPricing}>
                <StyledText variant="caption" color="secondary">
                  {item.quantity} {item.unit} × ¥{item.adjusted_unit_price.toLocaleString()}
                </StyledText>
                <StyledText variant="body" weight="semibold">
                  ¥{item.total_price.toLocaleString()}
                </StyledText>
              </View>
              {item.adjusted_unit_price !== item.base_unit_price && (
                <StyledText variant="caption" color="primary">
                  AI調整: {item.adjusted_unit_price > item.base_unit_price ? '+' : ''}
                  {((item.adjusted_unit_price - item.base_unit_price) / item.base_unit_price * 100).toFixed(1)}%
                </StyledText>
              )}
            </View>
          ))}
        </Card>

        {/* AIインサイト */}
        <Card variant="elevated" style={styles.insightsCard}>
          <StyledText variant="subtitle" weight="semibold" style={styles.sectionTitle}>
            🤖 AI の分析結果
          </StyledText>
          
          <View style={styles.insightSection}>
            <StyledText variant="body" weight="medium" color="primary">
              💡 最適価格帯
            </StyledText>
            <StyledText variant="body" style={{ marginLeft: spacing[3] }}>
              ¥{smartEstimate.ai_insights.optimal_price_range.min.toLocaleString()} - 
              ¥{smartEstimate.ai_insights.optimal_price_range.max.toLocaleString()}
            </StyledText>
          </View>

          <View style={styles.insightSection}>
            <StyledText variant="body" weight="medium" color="success">
              📊 競合分析
            </StyledText>
            {smartEstimate.ai_insights.competitive_analysis.map((analysis, index) => (
              <StyledText key={index} variant="caption" color="secondary" style={styles.insightItem}>
                • {analysis}
              </StyledText>
            ))}
          </View>

          <View style={styles.insightSection}>
            <StyledText variant="body" weight="medium" color="warning">
              ⚠️ リスク要因
            </StyledText>
            {smartEstimate.ai_insights.risk_factors.map((risk, index) => (
              <StyledText key={index} variant="caption" color="secondary" style={styles.insightItem}>
                • {risk}
              </StyledText>
            ))}
          </View>

          <View style={styles.insightSection}>
            <StyledText variant="body" weight="medium" color="primary">
              🎯 提案内容
            </StyledText>
            {smartEstimate.ai_insights.recommendations.map((rec, index) => (
              <StyledText key={index} variant="caption" color="secondary" style={styles.insightItem}>
                • {rec}
              </StyledText>
            ))}
          </View>
        </Card>

        {/* 工程予測 */}
        <Card variant="elevated" style={styles.scheduleCard}>
          <StyledText variant="subtitle" weight="semibold" style={styles.sectionTitle}>
            📅 工程予測
          </StyledText>
          
          <View style={styles.scheduleInfo}>
            <View style={styles.scheduleItem}>
              <StyledText variant="caption" color="secondary">着工予定</StyledText>
              <StyledText variant="body" weight="medium">
                {smartEstimate.schedule_prediction.estimated_start}
              </StyledText>
            </View>
            <View style={styles.scheduleItem}>
              <StyledText variant="caption" color="secondary">完成予定</StyledText>
              <StyledText variant="body" weight="medium">
                {smartEstimate.schedule_prediction.estimated_completion}
              </StyledText>
            </View>
          </View>

          <View style={styles.milestones}>
            <StyledText variant="body" weight="medium" style={{ marginBottom: spacing[2] }}>
              主要工程
            </StyledText>
            {smartEstimate.schedule_prediction.critical_milestones.map((milestone, index) => (
              <StyledText key={index} variant="caption" color="secondary" style={styles.milestoneItem}>
                • {milestone}
              </StyledText>
            ))}
          </View>
        </Card>

        {/* アクションボタン */}
        <Card variant="elevated" style={styles.actionCard}>
          <View style={styles.actionButtons}>
            <StyledButton
              title="📝 見積書作成"
              variant="primary"
              size="lg"
              elevated={true}
              onPress={() => {
                setCurrentStep('finalize')
                router.push(`/estimates/create?estimate_data=${JSON.stringify(smartEstimate)}`)
              }}
              style={styles.actionButton}
            />
            <StyledButton
              title="🔄 条件変更"
              variant="outline"
              size="md"
              onPress={() => setCurrentStep('scope_definition')}
              style={styles.actionButton}
            />
          </View>
        </Card>
      </ScrollView>
    )
  }

  // ヘルパー関数
  const getClientTypeColor = (type: string) => {
    switch (type) {
      case 'corporate': return Colors.primary + '20'
      case 'government': return Colors.success + '20'
      default: return Colors.secondary + '20'
    }
  }

  const getClientTypeLabel = (type: string) => {
    switch (type) {
      case 'corporate': return '法人'
      case 'government': return '官公庁'
      default: return '個人'
    }
  }

  const getBudgetRangeLabel = (range: string) => {
    switch (range) {
      case 'premium': return '高額'
      case 'high': return '中高'
      case 'medium': return '中程度'
      default: return '低予算'
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'labor': return Colors.primary + '20'
      case 'material': return Colors.success + '20'
      case 'equipment': return Colors.warning + '20'
      case 'overhead': return Colors.secondary + '20'
      default: return Colors.info + '20'
    }
  }

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'labor': return '労務費'
      case 'material': return '材料費'
      case 'equipment': return '機材費'
      case 'overhead': return '諸経費'
      default: return '利益'
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* ヘッダー */}
      <Surface style={styles.header}>
        <IconButton icon="arrow-left" onPress={() => router.back()} />
        <View style={styles.headerContent}>
          <StyledText variant="title" weight="semibold">
            スマート見積
          </StyledText>
          <StyledText variant="caption" color="secondary">
            {currentStep === 'client_selection' ? 'クライアント選択' :
             currentStep === 'scope_definition' ? 'プロジェクト定義' :
             currentStep === 'ai_analysis' ? 'AI分析中' :
             currentStep === 'review' ? '結果確認' : '完了'}
          </StyledText>
        </View>
        <View style={{ width: 48 }} />
      </Surface>

      <View style={styles.content}>
        {currentStep === 'client_selection' && renderClientSelection()}
        {currentStep === 'scope_definition' && renderScopeDefinition()}
        {currentStep === 'ai_analysis' && renderAIAnalysis()}
        {currentStep === 'review' && renderReview()}
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
    elevation: 2,
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
  },
  content: {
    flex: 1,
    padding: Spacing.md,
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
    textAlign: 'center',
  },
  clientListCard: {
    paddingVertical: Spacing.lg,
  },
  sectionTitle: {
    marginBottom: Spacing.md,
  },
  clientItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.md,
    marginVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    ...Shadows.sm,
  },
  clientInfo: {
    flex: 1,
    gap: Spacing.md,
  },
  clientHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  typeChip: {
    height: 24,
  },
  clientDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  clientMetric: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  scopeCard: {
    paddingVertical: Spacing.lg,
  },
  scopeSection: {
    marginBottom: Spacing.lg,
  },
  scopeLabel: {
    marginBottom: Spacing.md,
  },
  optionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  optionButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    minWidth: 80,
    alignItems: 'center',
  },
  optionSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '20',
  },
  durationInput: {
    backgroundColor: Colors.surface,
  },
  analyzeButton: {
    marginTop: Spacing.lg,
    minHeight: 56,
  },
  analysisCard: {
    alignItems: 'center',
    paddingVertical: Spacing['2xl'],
  },
  analysisContent: {
    alignItems: 'center',
    gap: Spacing.lg,
    width: '100%',
  },
  analysisText: {
    textAlign: 'center',
    marginVertical: Spacing.md,
  },
  analysisSteps: {
    width: '100%',
    gap: Spacing.md,
  },
  analysisStep: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  progressContainer: {
    width: '100%',
    marginVertical: Spacing.lg,
  },
  reviewContainer: {
    flex: 1,
  },
  summaryCard: {
    marginBottom: Spacing.lg,
    alignItems: 'center',
  },
  priceSummary: {
    alignItems: 'center',
    marginVertical: Spacing.lg,
  },
  winProbability: {
    width: '100%',
    marginTop: Spacing.lg,
  },
  itemsCard: {
    marginBottom: Spacing.lg,
  },
  estimateItem: {
    paddingVertical: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  categoryChip: {
    height: 24,
  },
  itemPricing: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  insightsCard: {
    marginBottom: Spacing.lg,
  },
  insightSection: {
    marginBottom: Spacing.lg,
  },
  insightItem: {
    marginLeft: Spacing.md,
    marginTop: Spacing.xs,
  },
  scheduleCard: {
    marginBottom: Spacing.lg,
  },
  scheduleInfo: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: Spacing.lg,
  },
  scheduleItem: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  milestones: {
    marginTop: Spacing.md,
  },
  milestoneItem: {
    marginLeft: Spacing.md,
    marginTop: Spacing.xs,
  },
  actionCard: {
    marginBottom: Spacing['2xl'],
  },
  actionButtons: {
    gap: Spacing.md,
  },
  actionButton: {
    minHeight: 48,
  },
})