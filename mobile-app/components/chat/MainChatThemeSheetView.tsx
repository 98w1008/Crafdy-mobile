import React from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Pressable,
  StyleSheet,
} from 'react-native'
import Feather from '@expo/vector-icons/Feather'

/**
 * Phase 1 純UI再現: main-chat のテーマ選択モーダル
 * Figma 正本: Crafdymainchat/src/app/App.tsx (lines 533-638)
 *
 * 再現対象:
 * - オーバーレイ (bg-black/60 / bg-black/40)
 * - 中央寄せモーダル (w-full max-w-sm = 384px, p-6 で画面中央)
 * - パネル: rounded-3xl shadow-2xl border
 *   - dark: bg-gradient-to-b from-[#1a2635] to-[#0f1922] → 近似単色
 *   - light: from-white to-gray-50 → #FFFFFF
 * - ヘッダー: px-6 pt-6 pb-4 border-b
 *   - "表示テーマ" text-xl font-medium + X ボタン w-8 h-8 rounded-full
 *   - 補助文 "お好みの表示モードを選択" text-sm textSecondary mt-2
 * - オプション p-6 space-y-3 (3択)
 *   - w-full flex items-center gap-4 p-4 rounded-2xl border-2
 *   - アイコンボックス w-12 h-12 rounded-xl (選択中: bg-blue-500)
 *   - ラベル text-base font-medium + 説明 text-xs
 *   - 選択中チェックバッジ w-6 h-6 rounded-full bg-blue-500
 */

// =============================================================================
// Theme option data
// Figma 正本: App.tsx lines 125-144
// =============================================================================

type ThemeMode = 'light' | 'dark' | 'system'

interface ThemeOption {
  value: ThemeMode
  label: string
  // lucide → Feather: Sun→sun, Moon→moon, Smartphone→smartphone
  icon: React.ComponentProps<typeof Feather>['name']
  description: string
}

const THEME_OPTIONS: ThemeOption[] = [
  { value: 'light',  label: 'ライト',       icon: 'sun',        description: '明るい表示' },
  { value: 'dark',   label: 'ダーク',        icon: 'moon',       description: '暗い表示' },
  { value: 'system', label: '端末に合わせる', icon: 'smartphone', description: '自動切替' },
]

// =============================================================================
// Props
// =============================================================================

interface Props {
  visible: boolean
  onClose: () => void
  currentTheme: ThemeMode
  onSelectTheme: (mode: ThemeMode) => void
  isDark: boolean
}

// =============================================================================
// Component
// =============================================================================

export function MainChatThemeSheetView({
  visible,
  onClose,
  currentTheme,
  onSelectTheme,
  isDark,
}: Props) {
  // Figma themeStyles.modalBg
  // dark: bg-gradient-to-b from-[#1a2635] to-[#0f1922] → 近似単色
  // light: from-white to-gray-50 → #FFFFFF
  const panelBg = isDark ? '#1a2635' : '#FFFFFF'

  // Figma themeStyles.modalBorder / drawerBorder
  const borderColor = isDark ? 'rgba(255,255,255,0.10)' : '#E5E7EB'

  // Figma themeStyles.overlay
  const overlayColor = isDark ? 'rgba(0,0,0,0.60)' : 'rgba(0,0,0,0.40)'

  // Figma text colors
  const textPrimary   = isDark ? '#F9FAFB' : '#1F2937'
  const textSecondary = isDark ? '#9CA3AF' : '#6B7280'

  // Figma themeStyles.buttonBg
  const closeButtonBg = isDark ? 'rgba(255,255,255,0.05)' : '#F9FAFB'

  const handleSelect = (mode: ThemeMode) => {
    onSelectTheme(mode)
    // Figma: setTimeout(() => setShowThemeModal(false), 300)
    setTimeout(onClose, 300)
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      {/* absolute inset-0 z-50 — オーバーレイ + 中央配置コンテナ */}
      <View style={styles.container}>
        {/* オーバーレイ — absolute inset-0 */}
        <Pressable
          style={[styles.overlay, { backgroundColor: overlayColor }]}
          onPress={onClose}
        />

        {/* absolute inset-0 z-60 flex items-center justify-center p-6 */}
        <View style={styles.centerWrapper} pointerEvents="box-none">
          {/* w-full max-w-sm rounded-3xl shadow-2xl border overflow-hidden */}
          <Pressable
            style={[
              styles.panel,
              {
                backgroundColor: panelBg,
                borderColor,
              },
            ]}
            onPress={() => {
              // パネル内タップで overlay 閉じを止める
            }}
          >
            {/* ===== ヘッダー — px-6 pt-6 pb-4 border-b ===== */}
            <View style={[styles.header, { borderBottomColor: borderColor }]}>
              {/* flex items-center justify-between */}
              <View style={styles.headerRow}>
                {/* h3 text-xl font-medium → "表示テーマ" */}
                <Text style={[styles.headerTitle, { color: textPrimary }]}>
                  表示テーマ
                </Text>
                {/* X ボタン — w-8 h-8 rounded-full buttonBg */}
                <TouchableOpacity
                  style={[styles.closeButton, { backgroundColor: closeButtonBg }]}
                  onPress={onClose}
                  accessibilityLabel="閉じる"
                >
                  <Feather name="x" size={18} color={textSecondary} />
                </TouchableOpacity>
              </View>

              {/* p text-sm textSecondary mt-2 → "お好みの表示モードを選択" */}
              <Text style={[styles.headerSubtitle, { color: textSecondary }]}>
                お好みの表示モードを選択
              </Text>
            </View>

            {/* ===== テーマオプション — p-6 space-y-3 ===== */}
            <View style={styles.options}>
              {THEME_OPTIONS.map(option => {
                const isSelected = currentTheme === option.value

                // Figma selectedBg / unselectedBg
                const optionBg = isSelected
                  ? (isDark ? 'rgba(59,130,246,0.25)' : 'rgba(59,130,246,0.08)')
                  : (isDark ? 'rgba(255,255,255,0.05)' : '#FFFFFF')

                // Figma border-2: selected dark border-blue-400, selected light border-blue-500
                const optionBorder = isSelected
                  ? (isDark ? '#60A5FA' : '#3B82F6')
                  : (isDark ? 'rgba(255,255,255,0.10)' : '#D1D5DB')

                // Figma icon box: selected bg-blue-500, unselected dark bg-white/10, light bg-gray-100
                const iconBoxBg = isSelected
                  ? '#3B82F6'
                  : (isDark ? 'rgba(255,255,255,0.10)' : '#F3F4F6')

                // Figma icon color: selected text-white, unselected dark text-gray-400, light text-gray-500
                const iconColor = isSelected
                  ? '#FFFFFF'
                  : (isDark ? '#9CA3AF' : '#6B7280')

                // Figma label selected: dark text-blue-400, light text-blue-600
                const labelColor = isSelected
                  ? (isDark ? '#60A5FA' : '#2563EB')
                  : textPrimary

                return (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.optionRow,
                      {
                        backgroundColor: optionBg,
                        borderColor: optionBorder,
                      },
                    ]}
                    onPress={() => handleSelect(option.value)}
                    activeOpacity={0.8}
                    accessibilityLabel={option.label}
                  >
                    {/* アイコンボックス — w-12 h-12 rounded-xl flex-shrink-0 */}
                    <View style={[styles.iconBox, { backgroundColor: iconBoxBg }]}>
                      <Feather name={option.icon} size={24} color={iconColor} />
                    </View>

                    {/* テキスト — flex-1 text-left */}
                    <View style={styles.optionText}>
                      {/* text-base font-medium */}
                      <Text style={[styles.optionLabel, { color: labelColor }]}>
                        {option.label}
                      </Text>
                      {/* text-xs textSecondary mt-0.5 */}
                      <Text style={[styles.optionDescription, { color: textSecondary }]}>
                        {option.description}
                      </Text>
                    </View>

                    {/* チェックバッジ — 選択中のみ w-6 h-6 rounded-full bg-blue-500 */}
                    {isSelected && (
                      <View style={styles.checkBadge}>
                        {/* Check w-4 h-4 text-white → Feather check size:16 */}
                        <Feather name="check" size={14} color="#FFFFFF" />
                      </View>
                    )}
                  </TouchableOpacity>
                )
              })}
            </View>
          </Pressable>
        </View>
      </View>
    </Modal>
  )
}

// =============================================================================
// Styles
// =============================================================================

const styles = StyleSheet.create({
  // absolute inset-0 — フルスクリーン
  container: {
    flex: 1,
  },

  // absolute inset-0
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },

  // absolute inset-0 z-60 flex items-center justify-center p-6
  // p-6 = 24px
  centerWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },

  // w-full max-w-sm rounded-3xl shadow-2xl border overflow-hidden
  // max-w-sm = 384px, rounded-3xl = 24, shadow-2xl → elevation:24
  panel: {
    width: '100%',
    maxWidth: 384,
    borderRadius: 24,
    borderWidth: 1,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 24,
    overflow: 'hidden',
  },

  // px-6 pt-6 pb-4 border-b
  // px-6 = 24px, pt-6 = 24px, pb-4 = 16px
  header: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },

  // flex items-center justify-between
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  // h3 text-xl font-medium → fontSize:20 fontWeight:'500'
  headerTitle: {
    fontSize: 20,
    fontWeight: '500',
  },

  // w-8 h-8 rounded-full flex items-center justify-center
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // text-sm textSecondary mt-2
  // text-sm = 14px, mt-2 = 8px
  headerSubtitle: {
    fontSize: 14,
    marginTop: 8,
  },

  // p-6 space-y-3
  // p-6 = 24px, space-y-3 = gap:12
  options: {
    padding: 24,
    gap: 12,
  },

  // w-full flex items-center gap-4 p-4 rounded-2xl border-2
  // gap-4 = 16px, p-4 = 16px, rounded-2xl = 16
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 16,
    borderRadius: 16,
    borderWidth: 2,
  },

  // w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0
  // w-12 = 48px, h-12 = 48px, rounded-xl = 12
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },

  // flex-1 text-left
  optionText: {
    flex: 1,
  },

  // text-base font-medium → fontSize:16 fontWeight:'500'
  optionLabel: {
    fontSize: 16,
    fontWeight: '500',
  },

  // text-xs textSecondary mt-0.5
  // text-xs = 12px, mt-0.5 = 2px
  optionDescription: {
    fontSize: 12,
    marginTop: 2,
  },

  // w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0
  // w-6 = 24px, h-6 = 24px
  checkBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
})
