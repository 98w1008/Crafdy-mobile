/**
 * QuickPromptsBar - クイックプロンプトバー
 * FABアクションと重複しない「プロンプト文言」専用
 * 使用回数による学習機能付き
 */

import React, { useState, useEffect } from 'react'
import { View, ScrollView, TouchableOpacity, StyleSheet } from 'react-native'
import { Chip } from 'react-native-paper'
import { useColors, useSpacing, useRadius } from '@/theme/ThemeProvider'
import { StyledText, Icon } from '../ui'
import { 
  QuickPrompt, 
  DEFAULT_QUICK_PROMPTS, 
  getTopUsedPrompts,
  incrementPromptUsage,
  generateMockAIResponse
} from '@/data/quickPrompts'
import * as Haptics from 'expo-haptics'

// =============================================================================
// TYPES
// =============================================================================

interface QuickPromptsBarProps {
  /** プロンプト選択時のコールバック */
  onSelect: (prompt: string, promptText: string, mockResponse?: string) => void
  /** スタイル */
  style?: any
  /** 最大表示件数 */
  maxItems?: number
  /** 表示するプロンプトを明示的に指定（FABと重複しない推奨セット） */
  items?: (Pick<QuickPrompt, 'id' | 'label' | 'promptText' | 'icon'> & {
    isNavigation?: boolean
    onPress?: () => void
  })[]
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function QuickPromptsBar({ 
  onSelect, 
  style, 
  maxItems = 6,
  items,
}: QuickPromptsBarProps) {
  const colors = useColors()
  const spacing = useSpacing()
  const radius = useRadius()
  
  // プロンプトの使用状況を管理（実際の実装ではAsyncStorageやSupabaseを使用）
  const [prompts, setPrompts] = useState<QuickPrompt[]>(DEFAULT_QUICK_PROMPTS)
  const [displayPrompts, setDisplayPrompts] = useState<QuickPrompt[]>([])

  // よく使用されるプロンプトを取得して表示用にセット
  useEffect(() => {
    if (items && items.length > 0) {
      // 明示指定の表示セットを使用
      setDisplayPrompts(items as QuickPrompt[])
    } else {
      const topPrompts = getTopUsedPrompts(prompts, maxItems)
      setDisplayPrompts(topPrompts)
    }
  }, [prompts, maxItems, items])

  // プロンプト選択処理
  const handlePromptSelect = (prompt: any) => {
    if (Haptics) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    }

    // ナビゲーションアイテムの場合は直接実行
    if (prompt.isNavigation && prompt.onPress) {
      prompt.onPress()
      return
    }

    // 使用回数を増加
    const updatedPrompts = incrementPromptUsage(prompts, prompt.id)
    setPrompts(updatedPrompts)

    // 模擬AIレスポンス生成
    const mockResponse = generateMockAIResponse(prompt)

    // 親コンポーネントに通知
    onSelect(prompt.label, prompt.promptText, mockResponse)
  }

  const styles = createStyles(colors, spacing, radius)

  return (
    <View style={[styles.container, style]}>
      {/* ヘッダー */}
      <View style={styles.header}>
        <Icon name="lightning-bolt" size={14} color="primary" />
        <StyledText 
          variant="caption" 
          weight="semibold"
          color="primary"
          style={styles.headerText}
        >
          クイックプロンプト
        </StyledText>
        <StyledText 
          variant="caption" 
          weight="normal"
          color="tertiary"
        >
          タップして質問
        </StyledText>
      </View>
      
      {/* プロンプトリスト */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {displayPrompts.map((prompt: any) => (
          <TouchableOpacity
            key={prompt.id}
            style={styles.promptItem}
            onPress={() => handlePromptSelect(prompt)}
            activeOpacity={0.7}
            accessibilityLabel={`プロンプト: ${prompt.label}`}
            accessibilityRole="button"
          >
            <View style={styles.promptChip}>
              {prompt.icon ? (
                <Icon 
                  name={prompt.icon} 
                  size={14} 
                  color="primary" 
                  style={styles.promptIcon}
                />
              ) : null}
              <StyledText 
                variant="caption" 
                weight="medium"
                color="primary"
                numberOfLines={2}
                style={styles.promptText}
              >
                {prompt.label}
              </StyledText>
              
              {/* 使用回数バッジ */}
              {(prompt.usageCount || 0) > 0 && (
                <View style={styles.usageBadge}>
                  <StyledText 
                    variant="caption" 
                    weight="bold"
                    color="onPrimary"
                    style={styles.usageCount}
                  >
                    {prompt.usageCount}
                  </StyledText>
                </View>
              )}
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  )
}

// =============================================================================
// STYLES
// =============================================================================

const createStyles = (colors: any, spacing: any, radius: any) => StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingVertical: spacing[3],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    marginBottom: spacing[2],
  },
  headerText: {
    marginHorizontal: spacing[2],
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing[4],
    flexDirection: 'row',
    alignItems: 'center',
  },
  promptItem: {
    marginRight: spacing[2],
  },
  promptChip: {
    flexDirection: 'column',
    alignItems: 'center',
    backgroundColor: colors.primary.light,
    borderRadius: radius.lg,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    minWidth: 80,
    maxWidth: 100,
    borderWidth: 1,
    borderColor: colors.primary.DEFAULT,
    position: 'relative',
  },
  promptIcon: {
    marginBottom: spacing[1],
  },
  promptText: {
    textAlign: 'center',
    lineHeight: 14,
    height: 28, // 2行分の高さを確保
  },
  usageBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: colors.primary.DEFAULT,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  usageCount: {
    fontSize: 10,
    lineHeight: 12,
  },
})

export default QuickPromptsBar
