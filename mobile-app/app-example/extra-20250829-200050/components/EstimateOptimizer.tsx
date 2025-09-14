import React, { useState } from 'react'
import {
  View,
  TouchableOpacity,
  ViewStyle,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import Slider from '@react-native-community/slider'
import StyledText from './ui/StyledText'
import StyledButton from './ui/StyledButton'
import Card from './ui/Card'
import { useColors, useSpacing } from '@/theme/ThemeProvider'
import {
  EstimateOptimizationResult,
  OptimizeEstimateRequest,
} from '../types/client'

interface EstimateOptimizerProps {
  // 入力データ
  clientId: string
  projectId: string
  estimatedAmount: number
  
  // 初期パラメーター
  initialUrgency?: 'low' | 'medium' | 'high'
  initialCompetition?: 'low' | 'medium' | 'high'
  initialScale?: 'small' | 'medium' | 'large'
  
  // コールバック
  onOptimize: (request: OptimizeEstimateRequest) => Promise<EstimateOptimizationResult | null>
  onResultChange?: (result: EstimateOptimizationResult | null) => void
  
  // UI制御
  disabled?: boolean
  showAdvanced?: boolean
  compact?: boolean
  
  // スタイル
  style?: ViewStyle
}

export default function EstimateOptimizer({
  clientId,
  projectId,
  estimatedAmount,
  initialUrgency = 'medium',
  initialCompetition = 'medium',
  initialScale = 'medium',
  onOptimize,
  onResultChange,
  disabled = false,
  showAdvanced = true,
  compact = false,
  style,
}: EstimateOptimizerProps) {
  const colors = useColors()
  const spacing = useSpacing()

  // 状態管理
  const [urgencyLevel, setUrgencyLevel] = useState<'low' | 'medium' | 'high'>(initialUrgency)
  const [competitionLevel, setCompetitionLevel] = useState<'low' | 'medium' | 'high'>(initialCompetition)
  const [projectScale, setProjectScale] = useState<'small' | 'medium' | 'large'>(initialScale)
  const [result, setResult] = useState<EstimateOptimizationResult | null>(null)
  const [isOptimizing, setIsOptimizing] = useState(false)
  const [showParameters, setShowParameters] = useState(!compact)

  // 最適化実行
  const handleOptimize = async () => {
    if (disabled || estimatedAmount <= 0) return

    setIsOptimizing(true)
    try {
      const request: OptimizeEstimateRequest = {
        project_id: projectId,
        client_id: clientId,
        estimated_amount: estimatedAmount,
        urgency_level: urgencyLevel,
        competition_level: competitionLevel,
        project_scale: projectScale,
      }

      const optimizationResult = await onOptimize(request)
      setResult(optimizationResult)
      onResultChange?.(optimizationResult)
    } catch (error) {
      console.error('Optimization error:', error)
      setResult(null)
      onResultChange?.(null)
    } finally {
      setIsOptimizing(false)
    }
  }

  // パラメーター値から表示文字列を取得
  const getLevelDisplay = (level: string, type: 'urgency' | 'competition' | 'scale') => {
    switch (type) {
      case 'urgency':
        return level === 'low' ? '低' : level === 'medium' ? '中' : '高'
      case 'competition':
        return level === 'low' ? '少' : level === 'medium' ? '中' : '多'
      case 'scale':
        return level === 'small' ? '小' : level === 'medium' ? '中' : '大'
    }
  }

  // パラメーター値を数値に変換
  const levelToValue = (level: string) => {
    return level === 'low' ? 0 : level === 'medium' ? 1 : 2
  }

  // 数値をパラメーター値に変換
  const valueToLevel = (value: number): 'low' | 'medium' | 'high' => {
    return value < 0.5 ? 'low' : value < 1.5 ? 'medium' : 'high'
  }

  const valueToScale = (value: number): 'small' | 'medium' | 'large' => {
    return value < 0.5 ? 'small' : value < 1.5 ? 'medium' : 'large'
  }

  // スタイル定義
  const containerStyle: ViewStyle = {
    ...style,
  }

  const parameterSectionStyle: ViewStyle = {
    marginBottom: spacing[4],
  }

  const sliderContainerStyle: ViewStyle = {
    marginVertical: spacing[3],
  }

  const sliderLabelStyle: ViewStyle = {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[2],
  }

  const resultCardStyle: ViewStyle = {
    backgroundColor: colors.primary + '10',
    borderWidth: 1,
    borderColor: colors.primary + '30',
    marginTop: spacing[4],
  }

  const comparisonStyle: ViewStyle = {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing[4],
  }

  const metricRowStyle: ViewStyle = {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing[2],
    borderBottomWidth: 1,
    borderBottomColor: colors.border + '30',
  }

  return (
    <View style={containerStyle}>
      {/* パラメーター調整セクション */}
      {showAdvanced && (
        <View style={parameterSectionStyle}>
          <TouchableOpacity
            onPress={() => setShowParameters(!showParameters)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: spacing[3],
            }}
          >
            <StyledText variant="subtitle" weight="medium">
              最適化パラメーター
            </StyledText>
            <Ionicons 
              name={showParameters ? 'chevron-up' : 'chevron-down'} 
              size={20} 
              color={colors.text.secondary} 
            />
          </TouchableOpacity>

          {showParameters && (
            <View>
              {/* 緊急度スライダー */}
              <View style={sliderContainerStyle}>
                <View style={sliderLabelStyle}>
                  <StyledText variant="caption" weight="medium">
                    緊急度
                  </StyledText>
                  <StyledText variant="caption" color="primary" weight="medium">
                    {getLevelDisplay(urgencyLevel, 'urgency')}
                  </StyledText>
                </View>
                <Slider
                  style={{ width: '100%', height: 40 }}
                  minimumValue={0}
                  maximumValue={2}
                  value={levelToValue(urgencyLevel)}
                  onValueChange={(value) => setUrgencyLevel(valueToLevel(value))}
                  step={1}
                  minimumTrackTintColor={colors.primary}
                  maximumTrackTintColor={colors.border}
                  thumbStyle={{ backgroundColor: colors.primary }}
                  disabled={disabled}
                />
                <StyledText variant="bodySmall" color="secondary">
                  緊急度が高いほど価格上乗せの余地があります
                </StyledText>
              </View>

              {/* 競合状況スライダー */}
              <View style={sliderContainerStyle}>
                <View style={sliderLabelStyle}>
                  <StyledText variant="caption" weight="medium">
                    競合状況
                  </StyledText>
                  <StyledText variant="caption" color="warning" weight="medium">
                    {getLevelDisplay(competitionLevel, 'competition')}
                  </StyledText>
                </View>
                <Slider
                  style={{ width: '100%', height: 40 }}
                  minimumValue={0}
                  maximumValue={2}
                  value={levelToValue(competitionLevel)}
                  onValueChange={(value) => setCompetitionLevel(valueToLevel(value))}
                  step={1}
                  minimumTrackTintColor={colors.semantic.warning}
                  maximumTrackTintColor={colors.border}
                  thumbStyle={{ backgroundColor: colors.semantic.warning }}
                  disabled={disabled}
                />
                <StyledText variant="bodySmall" color="secondary">
                  競合が多いほど価格削減が必要になります
                </StyledText>
              </View>

              {/* プロジェクト規模スライダー */}
              <View style={sliderContainerStyle}>
                <View style={sliderLabelStyle}>
                  <StyledText variant="caption" weight="medium">
                    プロジェクト規模
                  </StyledText>
                  <StyledText variant="caption" color="success" weight="medium">
                    {getLevelDisplay(projectScale, 'scale')}
                  </StyledText>
                </View>
                <Slider
                  style={{ width: '100%', height: 40 }}
                  minimumValue={0}
                  maximumValue={2}
                  value={levelToValue(projectScale)}
                  onValueChange={(value) => setProjectScale(valueToScale(value))}
                  step={1}
                  minimumTrackTintColor={colors.semantic.success}
                  maximumTrackTintColor={colors.border}
                  thumbStyle={{ backgroundColor: colors.semantic.success }}
                  disabled={disabled}
                />
                <StyledText variant="bodySmall" color="secondary">
                  大規模プロジェクトでは単価削減が一般的です
                </StyledText>
              </View>
            </View>
          )}
        </View>
      )}

      {/* 最適化実行ボタン */}
      <StyledButton
        title="見積を最適化"
        variant="primary"
        size={compact ? 'md' : 'lg'}
        onPress={handleOptimize}
        loading={isOptimizing}
        disabled={disabled || estimatedAmount <= 0}
        leftIcon="analytics"
      />

      {/* 最適化結果表示 */}
      {result && (
        <Card padding="lg" style={resultCardStyle}>
          <StyledText variant="subtitle" weight="semibold" style={{ marginBottom: spacing[4] }}>
            🎯 最適化結果
          </StyledText>

          {/* 金額比較 */}
          <View style={comparisonStyle}>
            <View>
              <StyledText variant="caption" color="secondary">
                元の金額
              </StyledText>
              <StyledText variant={compact ? 'body' : 'title'} weight="medium">
                ¥{result.original_amount.toLocaleString()}
              </StyledText>
            </View>
            <Ionicons name="arrow-forward" size={compact ? 16 : 20} color={colors.text.secondary} />
            <View style={{ alignItems: 'flex-end' }}>
              <StyledText variant="caption" color="secondary">
                最適化後
              </StyledText>
              <StyledText variant={compact ? 'title' : 'heading3'} weight="bold" color="primary">
                ¥{result.optimized_amount.toLocaleString()}
              </StyledText>
            </View>
          </View>

          {/* メトリクス */}
          <View style={metricRowStyle}>
            <StyledText variant="caption">調整率</StyledText>
            <StyledText 
              variant="caption" 
              weight="medium"
              color={result.adjustment_percentage > 0 ? 'success' : result.adjustment_percentage < 0 ? 'error' : 'secondary'}
            >
              {result.adjustment_percentage > 0 ? '+' : ''}{result.adjustment_percentage.toFixed(1)}%
            </StyledText>
          </View>

          <View style={metricRowStyle}>
            <StyledText variant="caption">採択確率</StyledText>
            <StyledText variant="caption" weight="medium" color="primary">
              {(result.acceptance_probability * 100).toFixed(1)}%
            </StyledText>
          </View>

          <View style={metricRowStyle}>
            <StyledText variant="caption">信頼度</StyledText>
            <StyledText variant="caption" weight="medium">
              {(result.confidence_score * 100).toFixed(0)}%
            </StyledText>
          </View>

          <View style={[metricRowStyle, { borderBottomWidth: 0 }]}>
            <StyledText variant="caption">期待利益</StyledText>
            <StyledText variant="caption" weight="medium" color="success">
              ¥{result.expected_profit.toLocaleString()}
            </StyledText>
          </View>

          {/* 根拠テキスト（コンパクト表示でない場合） */}
          {!compact && result.reasoning && (
            <View style={{ 
              marginTop: spacing[4], 
              padding: spacing[3], 
              backgroundColor: colors.surface, 
              borderRadius: 8 
            }}>
              <StyledText variant="caption" color="secondary">
                {result.reasoning}
              </StyledText>
            </View>
          )}

          {/* バイアス要因の詳細（コンパクト表示でない場合） */}
          {!compact && result.bias_factors.length > 0 && (
            <View style={{ marginTop: spacing[4] }}>
              <StyledText variant="caption" weight="medium" style={{ marginBottom: spacing[2] }}>
                調整要因の詳細
              </StyledText>
              {result.bias_factors.slice(0, 3).map((factor, index) => (
                <View key={index} style={metricRowStyle}>
                  <StyledText variant="bodySmall" numberOfLines={1} style={{ flex: 1 }}>
                    {factor.description}
                  </StyledText>
                  <StyledText 
                    variant="bodySmall" 
                    weight="medium"
                    color={factor.impact > 0 ? 'success' : factor.impact < 0 ? 'error' : 'secondary'}
                    style={{ marginLeft: spacing[2] }}
                  >
                    {factor.impact > 0 ? '+' : ''}{(factor.impact * 100).toFixed(1)}%
                  </StyledText>
                </View>
              ))}
              {result.bias_factors.length > 3 && (
                <StyledText variant="bodySmall" color="tertiary" style={{ marginTop: spacing[2] }}>
                  +{result.bias_factors.length - 3} 件のその他要因
                </StyledText>
              )}
            </View>
          )}
        </Card>
      )}
    </View>
  )
}

/**
 * 簡易版の見積最適化コンポーネント
 * より少ないスペースでの利用に適している
 */
interface CompactEstimateOptimizerProps extends Omit<EstimateOptimizerProps, 'showAdvanced' | 'compact'> {
  showOnlyResult?: boolean
}

export function CompactEstimateOptimizer(props: CompactEstimateOptimizerProps) {
  return (
    <EstimateOptimizer
      {...props}
      compact={true}
      showAdvanced={!props.showOnlyResult}
    />
  )
}

/**
 * インライン版の見積最適化コンポーネント
 * フォーム内での利用に適している
 */
interface InlineEstimateOptimizerProps extends EstimateOptimizerProps {
  onAmountOptimized?: (optimizedAmount: number) => void
}

export function InlineEstimateOptimizer({ 
  onAmountOptimized, 
  ...props 
}: InlineEstimateOptimizerProps) {
  const handleResultChange = (result: EstimateOptimizationResult | null) => {
    if (result && onAmountOptimized) {
      onAmountOptimized(result.optimized_amount)
    }
    props.onResultChange?.(result)
  }

  return (
    <EstimateOptimizer
      {...props}
      onResultChange={handleResultChange}
      compact={true}
      showAdvanced={false}
    />
  )
}