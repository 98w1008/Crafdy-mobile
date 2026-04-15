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
 * Phase 1 純UI再現: main-chat の + アクションシート
 * Figma 正本: Crafdymainchat/src/app/App.tsx (lines 450-531)
 *
 * 再現対象:
 * - オーバーレイ (bg-black/60)
 * - bottom sheet (rounded-t-[32px] sheetBg border-t border-white/10)
 * - ハンドル (w-10 h-1 bg-white/20 rounded-full)
 * - ヘッダー "添付" + "ファイルや写真を追加" (X ボタンなし、overlay tap で閉じる)
 * - 2列グリッド (grid-cols-2 gap-3)
 *   - 各カード: icon box (w-12 h-12 rounded-xl) + colored icon + label
 * - セーフエリア h-8 (32px)
 */

type ActionKind = 'photo' | 'camera' | 'file' | 'receipt'

interface AttachAction {
  kind: ActionKind
  label: string
  // Feather icon name
  icon: React.ComponentProps<typeof Feather>['name']
  // Figma color token → hex
  color: string
}

interface Props {
  visible: boolean
  onClose: () => void
  onAction: (kind: ActionKind) => void
  isDark: boolean
}

// Figma attachActions (lines 69-90)
// text-blue-400 / text-purple-400 / text-emerald-400 / text-amber-400
const ATTACH_ACTIONS: AttachAction[] = [
  { kind: 'photo',   label: '写真を追加',    icon: 'image',     color: '#60A5FA' },
  { kind: 'camera',  label: 'カメラで撮る',   icon: 'camera',    color: '#C084FC' },
  { kind: 'file',    label: 'ファイルを添付', icon: 'paperclip', color: '#34D399' },
  { kind: 'receipt', label: 'レシートを追加', icon: 'file-text', color: '#FBBF24' },
]

export function MainChatAttachSheetView({ visible, onClose, onAction, isDark }: Props) {
  // Figma themeStyles.sheetBg (dark): from-[#1a2635] to-[#0f1922] → 近似単色
  const sheetBg      = isDark ? '#1a2635' : '#FFFFFF'
  // border-t border-white/10 / border-gray-200
  const borderTop    = isDark ? 'rgba(255,255,255,0.10)' : '#E5E7EB'
  // handle: bg-white/20 / bg-gray-300
  const handleBg     = isDark ? 'rgba(255,255,255,0.20)' : '#D1D5DB'
  const textPrimary  = isDark ? '#F9FAFB' : '#1F2937'
  const textSecondary = isDark ? '#9CA3AF' : '#6B7280'
  // card: bg-white/6 border-white/5 / bg-gray-50 border-gray-200
  const cardBg       = isDark ? 'rgba(255,255,255,0.06)' : '#F9FAFB'
  const cardBorder   = isDark ? 'rgba(255,255,255,0.05)' : '#E5E7EB'
  // icon box: bg-white/8 / bg-white
  const iconBoxBg    = isDark ? 'rgba(255,255,255,0.08)' : '#FFFFFF'

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        {/* オーバーレイ — absolute inset-0 bg-black/60 backdrop-blur-sm */}
        <Pressable style={styles.overlay} onPress={onClose} />

        {/* Bottom Sheet — absolute bottom-0 left-0 right-0 rounded-t-[32px] shadow-2xl border-t */}
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: sheetBg,
              borderTopColor: borderTop,
            },
          ]}
        >
          {/* ハンドル — flex justify-center pt-3 pb-3 / w-10 h-1 bg-white/20 rounded-full */}
          <View style={styles.handleRow}>
            <View style={[styles.handle, { backgroundColor: handleBg }]} />
          </View>

          {/* ヘッダー — px-6 pb-5 */}
          <View style={styles.sheetHeader}>
            {/* h3 text-lg font-medium → "添付" */}
            <Text style={[styles.sheetTitle, { color: textPrimary }]}>添付</Text>
            {/* p text-sm textSecondary mt-1 → "ファイルや写真を追加" */}
            <Text style={[styles.sheetSubtitle, { color: textSecondary }]}>
              ファイルや写真を追加
            </Text>
          </View>

          {/* アクショングリッド — px-5 pb-8 / grid grid-cols-2 gap-3 */}
          <View style={styles.grid}>
            {ATTACH_ACTIONS.map(item => (
              <TouchableOpacity
                key={item.kind}
                style={[
                  styles.gridItem,
                  { backgroundColor: cardBg, borderColor: cardBorder },
                ]}
                onPress={() => {
                  onClose()
                  onAction(item.kind)
                }}
                activeOpacity={0.75}
                accessibilityLabel={item.label}
              >
                {/* icon box — w-12 h-12 rounded-xl bg-white/8 flex items-center justify-center flex-shrink-0 */}
                <View style={[styles.iconBox, { backgroundColor: iconBoxBg }]}>
                  <Feather name={item.icon} size={24} color={item.color} />
                </View>
                {/* span text-sm text-left leading-snug flex-1 */}
                <Text style={[styles.itemLabel, { color: textPrimary }]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* セーフエリア — h-8 (32px) */}
          <View style={styles.safeArea} />
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  // full-screen wrapper: justify-content:'flex-end' で sheet を下端に寄せる
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },

  // absolute inset-0 bg-black/60
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.60)',
  },

  // bottom-0 left-0 right-0
  // rounded-t-[32px] → borderTopLeftRadius:32 borderTopRightRadius:32
  // border-t border-white/10 → borderTopWidth:1
  // shadow-2xl → elevation:24
  sheet: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderTopWidth: 1,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.30,
    shadowRadius: 16,
    elevation: 24,
  },

  // flex justify-center pt-3 pb-3
  handleRow: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 12,
  },

  // w-10 h-1 rounded-full
  // w-10 = 40px, h-1 = 4px (RN では 1px が細すぎるので 4px に読み替え)
  handle: {
    width: 40,
    height: 4,
    borderRadius: 99,
  },

  // px-6 pb-5 → paddingHorizontal:24 paddingBottom:20
  sheetHeader: {
    paddingHorizontal: 24,
    paddingBottom: 20,
  },

  // h3 text-lg font-medium → fontSize:18 fontWeight:'500'
  sheetTitle: {
    fontSize: 18,
    fontWeight: '500',
  },

  // p text-sm mt-1 → fontSize:14 marginTop:4
  sheetSubtitle: {
    fontSize: 14,
    marginTop: 4,
  },

  // px-5 pb-8 → paddingHorizontal:20 paddingBottom:32
  // grid-cols-2 gap-3 → flexDirection:'row' flexWrap:'wrap' gap:12
  grid: {
    paddingHorizontal: 20,
    paddingBottom: 32,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },

  // flex items-center gap-4 p-4 rounded-2xl border
  // gap-4 = 16px, p-4 = 16px, rounded-2xl = borderRadius:16
  // width: 2列 (48% ≈ (100% - gap) / 2)
  gridItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    width: '48%',
  },

  // w-12 h-12 rounded-xl flex-shrink-0 flex items-center justify-center
  // w-12 = 48px, h-12 = 48px, rounded-xl = borderRadius:12
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },

  // text-sm text-left leading-snug flex-1
  // text-sm = 14px, leading-snug ≈ 1.375 → lineHeight:19
  itemLabel: {
    fontSize: 14,
    lineHeight: 19,
    flex: 1,
  },

  // h-8 = 32px セーフエリア
  safeArea: {
    height: 32,
  },
})
