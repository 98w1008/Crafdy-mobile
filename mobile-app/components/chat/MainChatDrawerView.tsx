import React from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
} from 'react-native'
import Feather from '@expo/vector-icons/Feather'

/**
 * Phase 1 純UI再現: main-chat の左 drawer
 * Figma 正本: Crafdymainchat/src/app/App.tsx (lines 338-444)
 *
 * 再現対象:
 * - オーバーレイ (bg-black/60 / bg-black/40)
 * - 左パネル w-[280px] (drawerBg, border-r, shadow-2xl)
 * - ヘッダー pt-14 pb-5 px-5 border-b
 *   - "メニュー" text-lg font-medium + X ボタン (w-8 h-8 rounded-full)
 *   - 現在の現場ボックス (px-3 py-2.5 bg-white/5 rounded-xl)
 * - メニューリスト (ScrollView, py-4)
 *   - セクション見出し: px-5 text-xs uppercase tracking-wider text-gray-500 mb-2
 *   - 各アイテム: px-3 py-3 rounded-xl / icon + label + ChevronRight
 *   - danger アイテム: text-red-400
 *
 * Phase 2 で戻す: role-aware 表示 (owner / member / unassigned)
 */

// =============================================================================
// Action types
// =============================================================================

export type DrawerAction =
  | 'dashboard'
  | 'project-list'
  | 'invoices'
  | 'estimates'
  | 'invite'
  | 'company'
  | 'invoice-template'
  | 'billing'
  | 'theme'
  | 'account'
  | 'help'
  | 'logout'

// =============================================================================
// Menu data
// Figma 正本: App.tsx lines 92-123 (drawerMenuSections)
// =============================================================================

interface DrawerItem {
  action: DrawerAction
  label: string
  // lucide → Feather 対応:
  //   LayoutDashboard → grid
  //   Building2       → home / layers
  //   FileText        → file-text
  //   Calculator      → clipboard (Feather に calculator なし)
  //   Users           → users
  //   CreditCard      → credit-card
  //   Palette         → sliders
  //   User            → user
  //   HelpCircle      → help-circle
  //   LogOut          → log-out
  icon: React.ComponentProps<typeof Feather>['name']
  danger?: boolean
}

interface DrawerSection {
  title: string
  items: DrawerItem[]
}

const DRAWER_SECTIONS: DrawerSection[] = [
  {
    title: '仕事',
    items: [
      { action: 'dashboard',    label: 'ダッシュボード',     icon: 'grid' },
      { action: 'project-list', label: '現場一覧 / 切り替え', icon: 'layers' },
      { action: 'invoices',     label: '請求書履歴',          icon: 'file-text' },
      { action: 'estimates',    label: '見積履歴',            icon: 'clipboard' },
    ],
  },
  {
    title: 'チーム',
    items: [
      { action: 'invite', label: 'メンバーを招待', icon: 'users' },
    ],
  },
  {
    title: '設定',
    items: [
      { action: 'company',          label: '会社情報',        icon: 'briefcase' },
      { action: 'invoice-template', label: '請求書テンプレ',  icon: 'file' },
      { action: 'billing',          label: '契約・プラン',    icon: 'credit-card' },
      { action: 'theme',            label: '表示テーマ',      icon: 'sliders' },
    ],
  },
  {
    title: 'その他',
    items: [
      { action: 'account', label: 'アカウント', icon: 'user' },
      { action: 'help',    label: 'ヘルプ',     icon: 'help-circle' },
      { action: 'logout',  label: 'ログアウト', icon: 'log-out', danger: true },
    ],
  },
]

// =============================================================================
// Props
// =============================================================================

interface Props {
  visible: boolean
  onClose: () => void
  onItemAction: (action: DrawerAction) => void
  isDark: boolean
  currentSiteName: string | null
}

// =============================================================================
// Component
// =============================================================================

export function MainChatDrawerView({
  visible,
  onClose,
  onItemAction,
  isDark,
  currentSiteName,
}: Props) {
  // Figma themeStyles.drawerBg
  // dark:  bg-gradient-to-b from-[#0f1922] to-[#0A1628] → 近似単色
  // light: bg-white
  const panelBg       = isDark ? '#0f1922' : '#FFFFFF'
  // Figma themeStyles.drawerBorder
  const borderColor   = isDark ? 'rgba(255,255,255,0.10)' : '#E5E7EB'
  // Figma themeStyles.overlay
  const overlayColor  = isDark ? 'rgba(0,0,0,0.60)' : 'rgba(0,0,0,0.40)'
  // Figma themeStyles.menuItemText: dark text-gray-200 / light text-gray-800
  const textPrimary   = isDark ? '#E5E7EB' : '#1F2937'
  // Figma themeStyles.textSecondary / siteLabelText
  const textSecondary = isDark ? '#9CA3AF' : '#6B7280'
  // Figma themeStyles.sectionHeader: text-gray-500 (both modes)
  const sectionHeaderColor = '#6B7280'
  // Figma themeStyles.siteBg: dark bg-white/5 / light bg-blue-50
  const siteBg        = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(59,130,246,0.06)'
  // Figma themeStyles.siteText: dark text-gray-200 / light text-gray-800
  const siteText      = isDark ? '#E5E7EB' : '#1F2937'
  // Figma themeStyles.buttonBg: dark bg-white/5 / light bg-white (hover:bg-gray-50 → #F9FAFB)
  const closeButtonBg = isDark ? 'rgba(255,255,255,0.05)' : '#F9FAFB'

  const handleItem = (item: DrawerItem) => {
    onClose()
    onItemAction(item.action)
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      {/* フルスクリーンコンテナ — absolute inset-0 z-40 */}
      <View style={styles.container}>
        {/* オーバーレイ — absolute inset-0 bg-black/60 backdrop-blur-sm */}
        <Pressable
          style={[styles.overlay, { backgroundColor: overlayColor }]}
          onPress={onClose}
        />

        {/* Drawer パネル — absolute top-0 left-0 bottom-0 w-[280px] z-50 */}
        <Pressable
          style={[
            styles.panel,
            {
              backgroundColor: panelBg,
              borderRightColor: borderColor,
            },
          ]}
          onPress={() => {
            // パネル内タップでオーバーレイ閉じを止める
          }}
        >
          {/* ===== ヘッダー — pt-14 pb-5 px-5 border-b ===== */}
          <View style={[styles.header, { borderBottomColor: borderColor }]}>
            {/* flex items-center justify-between mb-3 */}
            <View style={styles.headerRow}>
              {/* h2 text-lg font-medium → "メニュー" */}
              <Text style={[styles.headerTitle, { color: textPrimary }]}>
                メニュー
              </Text>
              {/* X ボタン — w-8 h-8 rounded-full buttonBg */}
              <TouchableOpacity
                style={[styles.closeButton, { backgroundColor: closeButtonBg }]}
                onPress={onClose}
                accessibilityLabel="ドロワーを閉じる"
              >
                <Feather name="x" size={18} color={textSecondary} />
              </TouchableOpacity>
            </View>

            {/* 現在の現場 — px-3 py-2.5 bg-white/5 rounded-xl */}
            <View style={[styles.siteBox, { backgroundColor: siteBg }]}>
              {/* text-xs siteLabelText mb-0.5 → "現在の現場" */}
              <Text style={[styles.siteLabel, { color: textSecondary }]}>
                現在の現場
              </Text>
              {/* text-sm siteText */}
              <Text style={[styles.siteName, { color: siteText }]}>
                {currentSiteName ?? '未選択'}
              </Text>
            </View>
          </View>

          {/* ===== メニューリスト — overflow-y-auto py-4 ===== */}
          <ScrollView
            style={styles.menuScroll}
            contentContainerStyle={styles.menuScrollContent}
            showsVerticalScrollIndicator={false}
          >
            {DRAWER_SECTIONS.map(section => (
              <View key={section.title} style={styles.section}>
                {/* h3 px-5 text-xs uppercase tracking-wider text-gray-500 mb-2 */}
                <Text style={[styles.sectionTitle, { color: sectionHeaderColor }]}>
                  {section.title}
                </Text>

                {/* space-y-1 px-2 */}
                <View style={styles.sectionItems}>
                  {section.items.map(item => (
                    <TouchableOpacity
                      key={item.action}
                      style={styles.item}
                      onPress={() => handleItem(item)}
                      activeOpacity={0.7}
                      accessibilityLabel={item.label}
                    >
                      {/* Icon — w-5 h-5 */}
                      <Feather
                        name={item.icon}
                        size={20}
                        color={item.danger ? '#F87171' : textPrimary}
                      />
                      {/* Label — text-sm */}
                      <Text
                        style={[
                          styles.itemLabel,
                          { color: item.danger ? '#F87171' : textPrimary },
                        ]}
                      >
                        {item.label}
                      </Text>
                      {/* ChevronRight — w-4 h-4 ml-auto opacity-40 */}
                      <Feather
                        name="chevron-right"
                        size={16}
                        color={item.danger ? '#F87171' : textPrimary}
                        style={styles.chevron}
                      />
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ))}
          </ScrollView>
        </Pressable>
      </View>
    </Modal>
  )
}

// =============================================================================
// Styles
// =============================================================================

const styles = StyleSheet.create({
  // absolute inset-0 — フルスクリーンラッパー
  container: {
    flex: 1,
  },

  // absolute inset-0 z-40
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },

  // absolute top-0 left-0 bottom-0 w-[280px] z-50
  // shadow-2xl → elevation:24
  panel: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: 280,
    borderRightWidth: 1,
    shadowColor: '#000000',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.30,
    shadowRadius: 16,
    elevation: 24,
  },

  // pt-14 pb-5 px-5 border-b
  // pt-14 = 56px, pb-5 = 20px, px-5 = 20px
  header: {
    paddingTop: 56,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },

  // flex items-center justify-between mb-3
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },

  // h2 text-lg font-medium → fontSize:18 fontWeight:'500'
  headerTitle: {
    fontSize: 18,
    fontWeight: '500',
  },

  // w-8 h-8 rounded-full flex items-center justify-center
  // w-8 = 32px, h-8 = 32px
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // px-3 py-2.5 rounded-xl
  // px-3 = 12px, py-2.5 = 10px, rounded-xl = 12
  siteBox: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
  },

  // text-xs siteLabelText mb-0.5
  // text-xs = 12px, mb-0.5 = 2px
  siteLabel: {
    fontSize: 12,
    marginBottom: 2,
  },

  // text-sm siteText
  siteName: {
    fontSize: 14,
  },

  // overflow-y-auto h-[calc(100%-180px)] → flex:1
  menuScroll: {
    flex: 1,
  },

  // py-4 → paddingVertical:16
  menuScrollContent: {
    paddingVertical: 16,
  },

  // mb-6 → marginBottom:24
  section: {
    marginBottom: 24,
  },

  // px-5 text-xs uppercase tracking-wider mb-2
  // px-5 = 20px, text-xs = 12px, mb-2 = 8px
  sectionTitle: {
    paddingHorizontal: 20,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 8,
  },

  // space-y-1 px-2 → gap:4 paddingHorizontal:8
  sectionItems: {
    paddingHorizontal: 8,
    gap: 4,
  },

  // w-full flex items-center gap-3 px-3 py-3 rounded-xl
  // gap-3 = 12px, px-3 = 12px, py-3 = 12px, rounded-xl = 12
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 12,
  },

  // text-sm flex-1
  itemLabel: {
    fontSize: 14,
    flex: 1,
  },

  // ml-auto opacity-40 → marginLeft:'auto' は RN 非対応なので flex:1 でラベルに寄せる
  // opacity:0.4 を直接 Feather color に乗せるより style.opacity を使う
  chevron: {
    opacity: 0.4,
  },
})
