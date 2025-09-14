import React, { useState, useEffect } from 'react'
import {
  View,
  ScrollView,
  Alert,
  ViewStyle,
  TouchableOpacity,
  Linking,
} from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import Slider from '@react-native-community/slider'
import { StyledText, StyledButton, StyledInput } from '@/components/ui'
import Card from '../../../components/ui/Card'
import { useAuth } from '@/contexts/AuthContext'
import { useColors, useSpacing } from '@/theme/ThemeProvider'
import {
  optimizeEstimate,
  createEstimate,
  recordLearningData,
  getEstimateStats,
} from '../../../lib/estimate-optimization-api'
import { getClients } from '../../../lib/client-api'
import {
  Client,
  EstimateOptimizationResult,
  OptimizeEstimateRequest,
  CreateEstimateData,
  EstimateStats,
} from '../../../types/client'

interface OptimizeEstimateState {
  // 基本データ
  clients: Client[]
  selectedClient: Client | null
  estimatedAmount: string
  title: string
  description: string
  
  // 最適化パラメーター
  urgencyLevel: 'low' | 'medium' | 'high'
  competitionLevel: 'low' | 'medium' | 'high'
  projectScale: 'small' | 'medium' | 'large'
  
  // 結果とUI状態
  optimizationResult: EstimateOptimizationResult | null
  isOptimizing: boolean
  isCreating: boolean
  showClientPicker: boolean
  
  // 統計データ
  stats: EstimateStats | null
  
  // 権限
  canViewPricing: boolean
}

export default function OptimizeEstimateScreen() {
  const { projectId } = useLocalSearchParams<{ projectId: string }>()
  const router = useRouter()
  const { user, userProfile } = useAuth()
  const colors = useColors()
  const spacing = useSpacing()

  const [state, setState] = useState<OptimizeEstimateState>({
    clients: [],
    selectedClient: null,
    estimatedAmount: '',
    title: '',
    description: '',
    urgencyLevel: 'medium',
    competitionLevel: 'medium',
    projectScale: 'medium',
    optimizationResult: null,
    isOptimizing: false,
    isCreating: false,
    showClientPicker: false,
    stats: null,
    canViewPricing: false,
  })

  // 初期化
  useEffect(() => {
    initializeScreen()
  }, [])

  const initializeScreen = async () => {
    if (!user || !userProfile) return

    // 権限チェック
    const canViewPricing = userProfile.role === 'admin'
    
    if (!canViewPricing) {
      Alert.alert('アクセス権限なし', '代表のみが見積最適化機能を利用できます。', [
        { text: 'OK', onPress: () => router.back() }
      ])
      return
    }

    try {
      // クライアント一覧と統計を並行取得
      const [clientsResult, statsResult] = await Promise.all([
        getClients(),
        getEstimateStats(),
      ])

      if (clientsResult.error) {
        Alert.alert('エラー', clientsResult.error)
        return
      }

      setState(prev => ({
        ...prev,
        clients: clientsResult.data,
        stats: statsResult.data || null,
        canViewPricing,
      }))
    } catch (error) {
      console.error('Failed to initialize screen:', error)
      Alert.alert('エラー', '画面の初期化に失敗しました')
    }
  }

  // 見積最適化の実行
  const handleOptimize = async () => {
    if (!state.selectedClient || !state.estimatedAmount || !projectId) {
      Alert.alert('入力不備', '必須項目を入力してください')
      return
    }

    const amount = parseFloat(state.estimatedAmount)
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('入力エラー', '有効な金額を入力してください')
      return
    }

    setState(prev => ({ ...prev, isOptimizing: true }))

    try {
      const request: OptimizeEstimateRequest = {
        project_id: projectId,
        client_id: state.selectedClient.id,
        estimated_amount: amount,
        urgency_level: state.urgencyLevel,
        competition_level: state.competitionLevel,
        project_scale: state.projectScale,
      }

      const result = await optimizeEstimate(request)
      
      if (result.error) {
        Alert.alert('エラー', result.error.message)
        return
      }

      setState(prev => ({ 
        ...prev, 
        optimizationResult: result.data || null 
      }))

      // 成功時のハプティック フィードバック（可能であれば）
      console.log('✅ Optimization completed successfully')

    } catch (error) {
      console.error('Optimization error:', error)
      Alert.alert('エラー', '最適化処理に失敗しました')
    } finally {
      setState(prev => ({ ...prev, isOptimizing: false }))
    }
  }

  // 見積作成
  const handleCreateEstimate = async () => {
    if (!state.selectedClient || !state.optimizationResult || !projectId) return

    setState(prev => ({ ...prev, isCreating: true }))

    try {
      const estimateData: CreateEstimateData = {
        project_id: projectId,
        client_id: state.selectedClient.id,
        title: state.title || `見積 - ${state.selectedClient.name}`,
        description: state.description,
        estimated_amount: state.optimizationResult.optimized_amount,
      }

      const result = await createEstimate(estimateData)
      
      if (result.error) {
        Alert.alert('エラー', result.error)
        return
      }

      Alert.alert(
        '見積作成完了',
        '最適化された見積が作成されました。\n\n見積一覧で確認・編集できます。',
        [
          {
            text: 'PDF出力',
            onPress: () => handleExportPDF(result.data!.id),
          },
          {
            text: '見積一覧へ',
            onPress: () => router.replace('/estimates'),
          },
        ]
      )

    } catch (error) {
      console.error('Create estimate error:', error)
      Alert.alert('エラー', '見積の作成に失敗しました')
    } finally {
      setState(prev => ({ ...prev, isCreating: false }))
    }
  }

  // PDF出力（プレースホルダー）
  const handleExportPDF = async (estimateId: string) => {
    try {
      // 実際のPDF生成処理（外部サービスまたはサーバー側で実装）
      const pdfUrl = `https://example.com/estimates/${estimateId}/pdf`
      
      Alert.alert(
        'PDF出力',
        '見積書PDFを生成しました。ダウンロードしますか？',
        [
          { text: 'キャンセル', style: 'cancel' },
          {
            text: 'ダウンロード',
            onPress: () => Linking.openURL(pdfUrl),
          },
        ]
      )
    } catch (error) {
      console.error('PDF export error:', error)
      Alert.alert('エラー', 'PDF出力に失敗しました')
    }
  }

  // スタイル定義
  const containerStyle: ViewStyle = {
    flex: 1,
    backgroundColor: colors.background.primary,
  }

  const headerStyle: ViewStyle = {
    padding: spacing[6],
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  }

  const contentStyle: ViewStyle = {
    flex: 1,
    padding: spacing[4],
  }

  const sectionStyle: ViewStyle = {
    marginBottom: spacing[6],
  }

  const sliderContainerStyle: ViewStyle = {
    marginVertical: spacing[4],
  }

  const sliderLabelStyle: ViewStyle = {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing[2],
  }

  const resultCardStyle: ViewStyle = {
    backgroundColor: colors.primary + '10',
    borderWidth: 1,
    borderColor: colors.primary + '30',
  }

  const biasFactorStyle: ViewStyle = {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing[2],
    borderBottomWidth: 1,
    borderBottomColor: colors.border + '30',
  }

  // 権限チェック
  if (!state.canViewPricing) {
    return (
      <View style={[containerStyle, { justifyContent: 'center', alignItems: 'center' }]}>
        <Card padding="xl" style={{ alignItems: 'center', maxWidth: 320 }}>
          <Ionicons name="lock-closed" size={48} color={colors.semantic.warning} />
          <StyledText variant="heading3" weight="semibold" align="center" style={{ marginTop: spacing[4] }}>
            アクセス権限が必要です
          </StyledText>
          <StyledText variant="body" color="secondary" align="center" style={{ marginTop: spacing[2] }}>
            代表のみが見積最適化機能を利用できます。
          </StyledText>
          <StyledButton
            title="戻る"
            variant="primary"
            size="lg"
            onPress={() => router.back()}
            style={{ marginTop: spacing[6] }}
          />
        </Card>
      </View>
    )
  }

  return (
    <View style={containerStyle}>
      {/* ヘッダー */}
      <View style={headerStyle}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing[2] }}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <StyledText variant="heading2" weight="bold" style={{ marginLeft: spacing[3] }}>
            見積最適化
          </StyledText>
        </View>
        <StyledText variant="caption" color="secondary">
          AI分析による最適な見積金額の算出
        </StyledText>
      </View>

      <ScrollView style={contentStyle} showsVerticalScrollIndicator={false}>
        {/* 統計情報カード */}
        {state.stats && (
          <Card padding="lg" style={[sectionStyle, { backgroundColor: colors.background.secondary }]}>
            <StyledText variant="subtitle" weight="medium" style={{ marginBottom: spacing[3] }}>
              📊 見積統計
            </StyledText>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <View style={{ alignItems: 'center' }}>
                <StyledText variant="heading3" weight="bold" color="primary">
                  {(state.stats.average_acceptance_rate * 100).toFixed(1)}%
                </StyledText>
                <StyledText variant="caption" color="secondary">採択率</StyledText>
              </View>
              <View style={{ alignItems: 'center' }}>
                <StyledText variant="heading3" weight="bold">
                  {state.stats.total_estimates}
                </StyledText>
                <StyledText variant="caption" color="secondary">総見積数</StyledText>
              </View>
              <View style={{ alignItems: 'center' }}>
                <StyledText variant="heading3" weight="bold" color="success">
                  {(state.stats.average_confidence_score * 100).toFixed(0)}
                </StyledText>
                <StyledText variant="caption" color="secondary">信頼度</StyledText>
              </View>
            </View>
          </Card>
        )}

        {/* 基本情報入力 */}
        <View style={sectionStyle}>
          <StyledText variant="subtitle" weight="medium" style={{ marginBottom: spacing[3] }}>
            基本情報
          </StyledText>

          {/* クライアント選択 */}
          <TouchableOpacity
            onPress={() => setState(prev => ({ ...prev, showClientPicker: true }))}
            style={{
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: 8,
              padding: spacing[4],
              marginBottom: spacing[4],
            }}
          >
            <StyledText variant="caption" color="secondary" style={{ marginBottom: spacing[1] }}>
              クライアント *
            </StyledText>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <StyledText variant="body">
                {state.selectedClient ? state.selectedClient.name : '選択してください'}
              </StyledText>
              <Ionicons name="chevron-down" size={20} color={colors.text.secondary} />
            </View>
          </TouchableOpacity>

          <StyledInput
            label="見積金額 *"
            value={state.estimatedAmount}
            onChangeText={(text) => setState(prev => ({ ...prev, estimatedAmount: text }))}
            placeholder="1000000"
            keyboardType="numeric"
            style={{ marginBottom: spacing[4] }}
          />

          <StyledInput
            label="見積タイトル"
            value={state.title}
            onChangeText={(text) => setState(prev => ({ ...prev, title: text }))}
            placeholder="例: 外壁塗装工事"
            style={{ marginBottom: spacing[4] }}
          />

          <StyledInput
            label="説明・備考"
            value={state.description}
            onChangeText={(text) => setState(prev => ({ ...prev, description: text }))}
            placeholder="工事内容や条件など"
            multiline
            numberOfLines={3}
          />
        </View>

        {/* 最適化パラメーター */}
        <View style={sectionStyle}>
          <StyledText variant="subtitle" weight="medium" style={{ marginBottom: spacing[3] }}>
            最適化パラメーター
          </StyledText>

          {/* 緊急度 */}
          <View style={sliderContainerStyle}>
            <View style={sliderLabelStyle}>
              <StyledText variant="caption" weight="medium">緊急度</StyledText>
              <StyledText variant="caption" color="primary" weight="medium">
                {state.urgencyLevel === 'low' ? '低' : state.urgencyLevel === 'medium' ? '中' : '高'}
              </StyledText>
            </View>
            <Slider
              style={{ width: '100%', height: 40 }}
              minimumValue={0}
              maximumValue={2}
              value={state.urgencyLevel === 'low' ? 0 : state.urgencyLevel === 'medium' ? 1 : 2}
              onValueChange={(value) => {
                const level = value < 0.5 ? 'low' : value < 1.5 ? 'medium' : 'high'
                setState(prev => ({ ...prev, urgencyLevel: level }))
              }}
              step={1}
              minimumTrackTintColor={colors.primary}
              maximumTrackTintColor={colors.border}
              thumbStyle={{ backgroundColor: colors.primary }}
            />
          </View>

          {/* 競合状況 */}
          <View style={sliderContainerStyle}>
            <View style={sliderLabelStyle}>
              <StyledText variant="caption" weight="medium">競合状況</StyledText>
              <StyledText variant="caption" color="primary" weight="medium">
                {state.competitionLevel === 'low' ? '少' : state.competitionLevel === 'medium' ? '中' : '多'}
              </StyledText>
            </View>
            <Slider
              style={{ width: '100%', height: 40 }}
              minimumValue={0}
              maximumValue={2}
              value={state.competitionLevel === 'low' ? 0 : state.competitionLevel === 'medium' ? 1 : 2}
              onValueChange={(value) => {
                const level = value < 0.5 ? 'low' : value < 1.5 ? 'medium' : 'high'
                setState(prev => ({ ...prev, competitionLevel: level }))
              }}
              step={1}
              minimumTrackTintColor={colors.semantic.warning}
              maximumTrackTintColor={colors.border}
              thumbStyle={{ backgroundColor: colors.semantic.warning }}
            />
          </View>

          {/* プロジェクト規模 */}
          <View style={sliderContainerStyle}>
            <View style={sliderLabelStyle}>
              <StyledText variant="caption" weight="medium">プロジェクト規模</StyledText>
              <StyledText variant="caption" color="primary" weight="medium">
                {state.projectScale === 'small' ? '小' : state.projectScale === 'medium' ? '中' : '大'}
              </StyledText>
            </View>
            <Slider
              style={{ width: '100%', height: 40 }}
              minimumValue={0}
              maximumValue={2}
              value={state.projectScale === 'small' ? 0 : state.projectScale === 'medium' ? 1 : 2}
              onValueChange={(value) => {
                const scale = value < 0.5 ? 'small' : value < 1.5 ? 'medium' : 'large'
                setState(prev => ({ ...prev, projectScale: scale }))
              }}
              step={1}
              minimumTrackTintColor={colors.semantic.success}
              maximumTrackTintColor={colors.border}
              thumbStyle={{ backgroundColor: colors.semantic.success }}
            />
          </View>
        </View>

        {/* 最適化実行ボタン */}
        <StyledButton
          title="見積を最適化"
          variant="primary"
          size="lg"
          onPress={handleOptimize}
          loading={state.isOptimizing}
          disabled={!state.selectedClient || !state.estimatedAmount}
          style={sectionStyle}
        />

        {/* 最適化結果 */}
        {state.optimizationResult && (
          <Card padding="lg" style={[sectionStyle, resultCardStyle]}>
            <StyledText variant="subtitle" weight="semibold" style={{ marginBottom: spacing[4] }}>
              🎯 最適化結果
            </StyledText>

            {/* 金額比較 */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing[4] }}>
              <View>
                <StyledText variant="caption" color="secondary">元の金額</StyledText>
                <StyledText variant="body" weight="medium">
                  ¥{state.optimizationResult.original_amount.toLocaleString()}
                </StyledText>
              </View>
              <Ionicons name="arrow-forward" size={20} color={colors.text.secondary} />
              <View style={{ alignItems: 'flex-end' }}>
                <StyledText variant="caption" color="secondary">最適化後</StyledText>
                <StyledText variant="title" weight="bold" color="primary">
                  ¥{state.optimizationResult.optimized_amount.toLocaleString()}
                </StyledText>
              </View>
            </View>

            {/* 調整率 */}
            <View style={biasFactorStyle}>
              <StyledText variant="caption">調整率</StyledText>
              <StyledText 
                variant="caption" 
                weight="medium"
                color={state.optimizationResult.adjustment_percentage > 0 ? 'success' : state.optimizationResult.adjustment_percentage < 0 ? 'error' : 'secondary'}
              >
                {state.optimizationResult.adjustment_percentage > 0 ? '+' : ''}{state.optimizationResult.adjustment_percentage.toFixed(1)}%
              </StyledText>
            </View>

            {/* 採択確率 */}
            <View style={biasFactorStyle}>
              <StyledText variant="caption">採択確率</StyledText>
              <StyledText variant="caption" weight="medium" color="primary">
                {(state.optimizationResult.acceptance_probability * 100).toFixed(1)}%
              </StyledText>
            </View>

            {/* 信頼度 */}
            <View style={biasFactorStyle}>
              <StyledText variant="caption">信頼度</StyledText>
              <StyledText variant="caption" weight="medium">
                {(state.optimizationResult.confidence_score * 100).toFixed(0)}%
              </StyledText>
            </View>

            {/* 期待利益 */}
            <View style={[biasFactorStyle, { borderBottomWidth: 0 }]}>
              <StyledText variant="caption">期待利益</StyledText>
              <StyledText variant="caption" weight="medium" color="success">
                ¥{state.optimizationResult.expected_profit.toLocaleString()}
              </StyledText>
            </View>

            {/* バイアス要因の詳細 */}
            {state.optimizationResult.bias_factors.length > 0 && (
              <View style={{ marginTop: spacing[4] }}>
                <StyledText variant="caption" weight="medium" style={{ marginBottom: spacing[2] }}>
                  調整要因
                </StyledText>
                {state.optimizationResult.bias_factors.map((factor, index) => (
                  <View key={index} style={biasFactorStyle}>
                    <StyledText variant="bodySmall">{factor.description}</StyledText>
                    <StyledText 
                      variant="bodySmall" 
                      weight="medium"
                      color={factor.impact > 0 ? 'success' : factor.impact < 0 ? 'error' : 'secondary'}
                    >
                      {factor.impact > 0 ? '+' : ''}{(factor.impact * 100).toFixed(1)}%
                    </StyledText>
                  </View>
                ))}
              </View>
            )}

            {/* 根拠テキスト */}
            {state.optimizationResult.reasoning && (
              <View style={{ marginTop: spacing[4], padding: spacing[3], backgroundColor: colors.surface, borderRadius: 8 }}>
                <StyledText variant="caption" color="secondary">
                  {state.optimizationResult.reasoning}
                </StyledText>
              </View>
            )}

            {/* 見積作成ボタン */}
            <StyledButton
              title="この金額で見積を作成"
              variant="primary"
              size="lg"
              onPress={handleCreateEstimate}
              loading={state.isCreating}
              style={{ marginTop: spacing[4] }}
            />
          </Card>
        )}
      </ScrollView>

      {/* クライアント選択モーダル */}
      {state.showClientPicker && (
        <View style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: spacing[4],
        }}>
          <View style={{
            backgroundColor: colors.surface,
            borderRadius: 16,
            padding: spacing[6],
            width: '100%',
            maxWidth: 400,
            maxHeight: '70%',
          }}>
            <StyledText variant="heading3" weight="semibold" style={{ marginBottom: spacing[4] }}>
              クライアント選択
            </StyledText>

            <ScrollView showsVerticalScrollIndicator={false}>
              {state.clients.map((client) => (
                <TouchableOpacity
                  key={client.id}
                  onPress={() => {
                    setState(prev => ({ 
                      ...prev, 
                      selectedClient: client, 
                      showClientPicker: false 
                    }))
                  }}
                  style={{
                    padding: spacing[4],
                    borderBottomWidth: 1,
                    borderBottomColor: colors.border + '30',
                  }}
                >
                  <StyledText variant="body" weight="medium">
                    {client.name}
                  </StyledText>
                  {client.contact_person && (
                    <StyledText variant="caption" color="secondary">
                      {client.contact_person}
                    </StyledText>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>

            <StyledButton
              title="キャンセル"
              variant="outline"
              size="md"
              onPress={() => setState(prev => ({ ...prev, showClientPicker: false }))}
              style={{ marginTop: spacing[4] }}
            />
          </View>
        </View>
      )}
    </View>
  )
}