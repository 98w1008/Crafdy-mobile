/**
 * 見積作成ナビゲーションハブ
 * Task 6 統合: 統合アップロード・AI自動判別対応の見積作成オプション
 */

import React from 'react'
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native'
import { router } from 'expo-router'
import { useColors, useSpacing } from '@/theme/ThemeProvider'
import { StyledText, StyledButton, Card } from '@/components/ui'
import { IconButton, Chip } from 'react-native-paper'
import * as Haptics from 'expo-haptics'

// =============================================================================
// TYPES
// =============================================================================

interface EstimateOption {
  id: string
  title: string
  subtitle: string
  icon: string
  route: string
  features: string[]
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  estimatedTime: string
  isNew?: boolean
}

interface EstimateNavigationHubProps {
  onOptionSelect?: (optionId: string) => void
  showRecentProjects?: boolean
}

// =============================================================================
// COMPONENT
// =============================================================================

export const EstimateNavigationHub: React.FC<EstimateNavigationHubProps> = ({
  onOptionSelect,
  showRecentProjects = true
}) => {
  const colors = useColors()
  const spacing = useSpacing()

  // 見積作成オプション
  const estimateOptions: EstimateOption[] = [
    {
      id: 'quick-estimate',
      title: 'クイック見積',
      subtitle: 'AI統合による高速見積作成',
      icon: '⚡',
      route: '/estimate/quick-estimate',
      features: ['統合アップロード', 'AI自動判別', 'スマート事前入力'],
      difficulty: 'beginner',
      estimatedTime: '5分',
      isNew: true
    },
    {
      id: 'smart-estimate',
      title: 'スマート見積',
      subtitle: 'AI学習による最適化見積',
      icon: '🧠',
      route: '/estimates/smart-estimate',
      features: ['クライアント分析', '価格最適化', '市場データ統合'],
      difficulty: 'intermediate',
      estimatedTime: '10分'
    },
    {
      id: 'wizard-estimate',
      title: '見積ウィザード',
      subtitle: '段階的な詳細見積作成',
      icon: '📋',
      route: '/estimate/new',
      features: ['詳細入力', 'PDF出力', 'Excel出力'],
      difficulty: 'intermediate',
      estimatedTime: '15分'
    },
    {
      id: 'manual-estimate',
      title: '手動見積',
      subtitle: '従来の詳細入力方式',
      icon: '✏️',
      route: '/estimates/manual',
      features: ['完全制御', '詳細カスタマイズ', 'プロ向け'],
      difficulty: 'advanced',
      estimatedTime: '30分'
    }
  ]

  // オプション選択処理
  const handleOptionSelect = (option: EstimateOption) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    
    if (onOptionSelect) {
      onOptionSelect(option.id)
    }
    
    router.push(option.route)
  }

  // 難易度ラベル
  const getDifficultyLabel = (difficulty: EstimateOption['difficulty']) => {
    switch (difficulty) {
      case 'beginner': return '初心者向け'
      case 'intermediate': return '中級者向け'  
      case 'advanced': return '上級者向け'
    }
  }

  // 難易度カラー
  const getDifficultyColor = (difficulty: EstimateOption['difficulty']) => {
    switch (difficulty) {
      case 'beginner': return colors.success
      case 'intermediate': return colors.warning
      case 'advanced': return colors.error
    }
  }

  const styles = createStyles(colors, spacing)

  return (
    <View style={styles.container}>
      {/* ヘッダー */}
      <View style={styles.header}>
        <StyledText variant="title" weight="bold">
          見積作成
        </StyledText>
        <StyledText variant="body" color="secondary">
          プロジェクトに最適な方法を選択してください
        </StyledText>
      </View>

      {/* 推奨オプション (クイック見積) */}
      <Card style={styles.recommendedCard} variant="premium">
        <View style={styles.recommendedHeader}>
          <View style={styles.recommendedBadge}>
            <StyledText variant="caption" color="onPrimary" weight="bold">推奨</StyledText>
          </View>
          {estimateOptions[0].isNew && (
            <Chip mode="outlined" compact style={styles.newChip}>NEW</Chip>
          )}
        </View>
        
        <TouchableOpacity 
          style={styles.recommendedContent}
          onPress={() => handleOptionSelect(estimateOptions[0])}
        >
          <View style={styles.recommendedInfo}>
            <View style={styles.optionHeader}>
              <StyledText variant="heading3">{estimateOptions[0].icon}</StyledText>
              <View style={styles.optionTitleArea}>
                <StyledText variant="subtitle" weight="bold">
                  {estimateOptions[0].title}
                </StyledText>
                <StyledText variant="caption" color="secondary">
                  {estimateOptions[0].subtitle}
                </StyledText>
              </View>
            </View>
            
            <View style={styles.featuresContainer}>
              {estimateOptions[0].features.map((feature, index) => (
                <Chip key={index} mode="outlined" compact style={styles.featureChip}>
                  {feature}
                </Chip>
              ))}
            </View>
            
            <View style={styles.optionMeta}>
              <StyledText variant="caption" color="success">
                ⏱️ {estimateOptions[0].estimatedTime}
              </StyledText>
              <StyledText variant="caption" color="secondary">
                {getDifficultyLabel(estimateOptions[0].difficulty)}
              </StyledText>
            </View>
          </View>
          
          <IconButton 
            icon="arrow-right" 
            size={24}
            iconColor={colors.primary.DEFAULT}
          />
        </TouchableOpacity>
      </Card>

      {/* その他のオプション */}
      <View style={styles.otherOptionsSection}>
        <StyledText variant="body" weight="medium" style={styles.sectionTitle}>
          その他のオプション
        </StyledText>
        
        {estimateOptions.slice(1).map((option) => (
          <Card key={option.id} style={styles.optionCard} variant="elevated">
            <TouchableOpacity 
              style={styles.optionContent}
              onPress={() => handleOptionSelect(option)}
            >
              <View style={styles.optionInfo}>
                <View style={styles.optionHeader}>
                  <StyledText variant="heading3">{option.icon}</StyledText>
                  <View style={styles.optionTitleArea}>
                    <StyledText variant="body" weight="semibold">
                      {option.title}
                    </StyledText>
                    <StyledText variant="caption" color="secondary">
                      {option.subtitle}
                    </StyledText>
                  </View>
                </View>
                
                <View style={styles.compactFeatures}>
                  {option.features.slice(0, 2).map((feature, index) => (
                    <StyledText key={index} variant="caption" color="secondary">
                      • {feature}
                    </StyledText>
                  ))}
                  {option.features.length > 2 && (
                    <StyledText variant="caption" color="tertiary">
                      +{option.features.length - 2}個の機能
                    </StyledText>
                  )}
                </View>
                
                <View style={styles.optionMeta}>
                  <StyledText variant="caption" color="secondary">
                    ⏱️ {option.estimatedTime}
                  </StyledText>
                  <Chip 
                    mode="outlined" 
                    compact 
                    style={[
                      styles.difficultyChip,
                      { borderColor: getDifficultyColor(option.difficulty) }
                    ]}
                  >
                    {getDifficultyLabel(option.difficulty)}
                  </Chip>
                </View>
              </View>
              
              <IconButton 
                icon="arrow-right" 
                size={20}
                iconColor={colors.text.secondary}
              />
            </TouchableOpacity>
          </Card>
        ))}
      </View>

      {/* 最近のプロジェクト (オプショナル) */}
      {showRecentProjects && (
        <View style={styles.recentSection}>
          <StyledText variant="body" weight="medium" style={styles.sectionTitle}>
            最近のプロジェクト
          </StyledText>
          <Card style={styles.recentCard}>
            <StyledText variant="body" color="secondary" style={styles.placeholderText}>
              最近作成した見積がここに表示されます
            </StyledText>
            <StyledButton
              title="過去の見積を表示"
              variant="outline"
              size="sm"
              onPress={() => router.push('/estimates/history')}
            />
          </Card>
        </View>
      )}
    </View>
  )
}

// =============================================================================
// STYLES
// =============================================================================

const createStyles = (colors: any, spacing: any) => StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing[4],
    gap: spacing[5],
  },
  header: {
    gap: spacing[2],
  },
  recommendedCard: {
    padding: spacing[5],
    borderWidth: 2,
    borderColor: colors.primary.DEFAULT,
  },
  recommendedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  recommendedBadge: {
    backgroundColor: colors.primary.DEFAULT,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderRadius: 12,
  },
  newChip: {
    backgroundColor: colors.success + '20',
    borderColor: colors.success,
  },
  recommendedContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  recommendedInfo: {
    flex: 1,
    gap: spacing[3],
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  optionTitleArea: {
    flex: 1,
    gap: spacing[1],
  },
  featuresContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  featureChip: {
    backgroundColor: colors.surface,
  },
  optionMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  otherOptionsSection: {
    gap: spacing[3],
  },
  sectionTitle: {
    marginBottom: spacing[2],
  },
  optionCard: {
    marginBottom: spacing[2],
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[4],
    gap: spacing[3],
  },
  optionInfo: {
    flex: 1,
    gap: spacing[2],
  },
  compactFeatures: {
    gap: spacing[1],
  },
  difficultyChip: {
    backgroundColor: colors.surface,
  },
  recentSection: {
    gap: spacing[3],
  },
  recentCard: {
    padding: spacing[4],
    alignItems: 'center',
    gap: spacing[3],
  },
  placeholderText: {
    textAlign: 'center',
  },
})

export default EstimateNavigationHub