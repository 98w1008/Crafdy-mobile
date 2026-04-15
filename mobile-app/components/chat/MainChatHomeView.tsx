import React from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native'

export interface HomeChip {
  id: string
  label: string
  text: string
}

interface Props {
  displayName: string
  chips: HomeChip[]
  onChipPress: (text: string) => void
  isDark: boolean
}

/**
 * Phase 1 純UI再現: main-chat ホーム本体
 * Figma 正本: Crafdymainchat/src/app/App.tsx (lines 253-281)
 *
 * 再現対象:
 * - AIウェルカムメッセージ (text-3xl / mb-3 / leading-tight)
 * - 補助テキスト (text-sm / textSecondary / leading-relaxed)
 * - Prompt Chips (horizontal scroll / -mx-5 bleed / gap-2.5 / px-4 py-2.5 rounded-full)
 */
export function MainChatHomeView({ displayName, chips, onChipPress, isDark }: Props) {
  const textPrimary = isDark ? '#F9FAFB' : '#1F2937'
  const textSecondary = isDark ? '#9CA3AF' : '#6B7280'
  const chipBg = isDark ? 'rgba(255,255,255,0.06)' : '#FFFFFF'
  const chipBorder = isDark ? 'rgba(255,255,255,0.10)' : '#D1D5DB'

  return (
    <View style={styles.homeContainer}>
      {/* AIウェルカムメッセージ — mb-7 mt-2 */}
      <View style={styles.homeWelcome}>
        {/* text-3xl mb-3 leading-tight */}
        <Text style={[styles.homeWelcomeTitle, { color: textPrimary }]}>
          {displayName ? `${displayName}さん、お疲れさまです。` : 'お疲れさまです。'}
          {'\n'}今日は何を手伝いましょうか？
        </Text>
        {/* text-sm textSecondary leading-relaxed */}
        <Text style={[styles.homeWelcomeSubtext, { color: textSecondary }]}>
          日報・経費・請求・見積を、{'\n'}チャットでそのまま進められます。
        </Text>
      </View>

      {/* Prompt Chips — mb-8 -mx-5 (edge-to-edge horizontal scroll) */}
      <View style={styles.chipsOuter}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsInner}
          keyboardShouldPersistTaps="handled"
        >
          {chips.map(chip => (
            <TouchableOpacity
              key={chip.id}
              style={[styles.chip, { backgroundColor: chipBg, borderColor: chipBorder }]}
              onPress={() => onChipPress(chip.text)}
              activeOpacity={0.7}
              accessibilityLabel={`プロンプト: ${chip.label}`}
            >
              {/* text-sm whitespace-nowrap */}
              <Text style={[styles.chipText, { color: textPrimary }]} numberOfLines={1}>
                {chip.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* flex-1 spacer */}
      <View style={{ flex: 1 }} />
    </View>
  )
}

const styles = StyleSheet.create({
  // flex-1 flex flex-col  (main content area)
  homeContainer: {
    flex: 1,
    paddingTop: 8, // mt-2
  },

  // mb-7 mt-2
  homeWelcome: {
    marginTop: 8,
    marginBottom: 28,
  },

  // text-3xl mb-3 leading-tight
  // text-3xl = 30px, leading-tight ≈ 1.2 → lineHeight 36
  homeWelcomeTitle: {
    fontSize: 30,
    fontWeight: '400',
    lineHeight: 36,
    marginBottom: 12,
  },

  // text-sm leading-relaxed
  // text-sm = 14px, leading-relaxed ≈ 1.6 → lineHeight 22
  homeWelcomeSubtext: {
    fontSize: 14,
    lineHeight: 22,
  },

  // -mx-5 mb-8: negative margin to escape parent paddingHorizontal:20
  // chips ScrollView bleeds to screen edges
  chipsOuter: {
    marginHorizontal: -20,
    marginBottom: 32,
  },

  // flex gap-2.5 px-5 pb-2
  // gap = 10px, paddingHorizontal = 20px (restore -mx-5), paddingBottom = 8px
  chipsInner: {
    paddingHorizontal: 20,
    gap: 10,
    paddingBottom: 8,
  },

  // flex-shrink-0 px-4 py-2.5 rounded-full border
  // px-4 = 16px, py-2.5 = 10px
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
  },

  // text-sm whitespace-nowrap
  chipText: {
    fontSize: 14,
    fontWeight: '400',
  },
})
