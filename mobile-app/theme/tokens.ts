/**
 * 🎨 Crafdy Mobile - Modern Theme System
 * Instagram/X/ChatGPTスタイルのシンプルなダーク/ライト切替
 * グレー系 + アクセント1色のみのミニマルシステム
 */

// =============================================================================
// CORE PALETTE (Instagram/X inspired)
// =============================================================================

export const palette = {
  gray: {
    900: '#0A0A0A',    // 純黒に近い
    800: '#121212',    // ダーク背景
    700: '#1E1E1E',    // ダークサーフェス
    600: '#2A2A2A',    // ダークボーダー
    500: '#505050',    // 中間グレー
    400: '#6A6A6A',    // セカンダリテキスト
    300: '#8A8A8A',    // 薄いテキスト
    200: '#B5B5B5',    // 境界線
    100: '#E5E5E5',    // ライト境界
    50: '#F5F5F5',     // ライト背景
    0: '#FFFFFF',      // 純白
  },
  
  // シンプルなアクセント（後で変更可能）
  primary: {
    DEFAULT: '#16A34A',
    50: '#F0FDF4',
    100: '#DCFCE7',
    light: '#DCFCE7',
    500: '#22C55E',
    600: '#16A34A',
    700: '#15803D',
    900: '#14532D',
    contrastText: '#FFFFFF',
  },
  
  // ステータスカラー
  success: {
    DEFAULT: '#16A34A',
    light: '#DCFCE7',
  },
  warning: {
    DEFAULT: '#F59E0B',
    light: '#FEF3C7',
  },
  error: {
    DEFAULT: '#DC2626',
    light: '#FEE2E2',
  },
  secondary: {
    DEFAULT: '#6B7280',
    light: '#F3F4F6',
  },
} as const

// =============================================================================
// THEME DEFINITIONS (Instagram/X/ChatGPT style)
// =============================================================================

export const light = {
  background: {
    primary: palette.gray[0],        // 純白背景
    secondary: palette.gray[50],     // ライトグレー背景
  },
  text: {
    primary: palette.gray[900],      // 純黒テキスト
    secondary: palette.gray[500],    // セカンダリテキスト
    tertiary: palette.gray[400],     // 3次テキスト
  },
  surface: palette.gray[0],          // カード/サーフェス
  border: palette.gray[200],         // 境界線
  primary: palette.primary,          // アクセントカラー
  success: palette.success,          // 成功カラー
  warning: palette.warning,          // 警告カラー
  error: palette.error,              // エラーカラー
  secondary: palette.secondary,      // セカンダリカラー
} as const

export const dark = {
  background: {
    primary: palette.gray[900],      // 純黒背景
    secondary: palette.gray[800],    // ダークグレー背景
  },
  text: {
    primary: palette.gray[0],        // 純白テキスト
    secondary: palette.gray[300],    // セカンダリテキスト
    tertiary: palette.gray[400],     // 3次テキスト
  },
  surface: palette.gray[800],        // カード/サーフェス
  border: palette.gray[600],         // 境界線
  primary: palette.primary,          // アクセントカラー
  success: palette.success,          // 成功カラー
  warning: palette.warning,          // 警告カラー
  error: palette.error,              // エラーカラー
  secondary: palette.secondary,      // セカンダリカラー
} as const

// =============================================================================
// DESIGN TOKENS
// =============================================================================

export const spacing = {
  0: 0,
  0.5: 2,
  1: 4,
  1.5: 6,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
} as const

export const radius = {
  none: 0,
  sm: 4,
  DEFAULT: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
} as const

export const typography = {
  fontSize: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
  },
  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
  lineHeight: {
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.625,
  },
} as const

export const shadows = {
  sm: {
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  lg: {
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
} as const

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

export type ThemeMode = 'light' | 'dark' | 'system'
export type ThemeColors = typeof light | typeof dark

// =============================================================================
// UNIFIED THEME INTERFACE
// =============================================================================

export interface Theme {
  colors: ThemeColors
  spacing: typeof spacing
  radius: typeof radius
  typography: typeof typography
  shadows: typeof shadows
}

// =============================================================================
// THEME CREATOR
// =============================================================================

export const createTheme = (mode: 'light' | 'dark'): Theme => ({
  colors: mode === 'dark' ? dark : light,
  spacing,
  radius,
  typography,
  shadows,
})

// =============================================================================
// FIGMA MAIN-CHAT TOKENS
// Figma正本: Crafdymainchat/src/app/App.tsx のテーマ定義を RN 向けに整理
// 既存の gray ベーストークンとは別に、main-chat 系専用として管理する
// =============================================================================

/**
 * main-chat 系コンポーネントが参照するデザイントークン
 * Figma themeStyles (dark / light) に対応
 *
 * dark:  #0A1628 ベースの深いネイビー
 * light: #F5F7FA ベースの明るいグレー/ブルー寄り
 */
export const mainChatTokens = {
  dark: {
    background: {
      // Figma: bg-[#0A1628]
      page: '#0A1628',
      // Figma: from-[#1a2635] to-[#1E293B] (gradient 近似単色)
      surface: '#1a2635',
      // Figma: bg-white/6
      card: 'rgba(255,255,255,0.06)',
    },
    border: {
      // Figma: border-white/15 (inputRow)
      input: 'rgba(255,255,255,0.15)',
      // Figma: border-white/10 (chips, sheet top)
      default: 'rgba(255,255,255,0.10)',
      // Figma: border-white/5 (gridItem)
      card: 'rgba(255,255,255,0.05)',
    },
    text: {
      // Figma: text-white
      primary: '#F9FAFB',
      // Figma: text-gray-400
      secondary: '#9CA3AF',
    },
    // Figma: bg-blue-500/12, border-blue-500/25, text-blue-400
    site: {
      bg: 'rgba(59,130,246,0.12)',
      border: 'rgba(59,130,246,0.25)',
      text: '#60A5FA',
    },
    button: {
      // Figma: from-blue-500 to-blue-600
      plus: '#3B82F6',
      // Figma: from-emerald-500 to-emerald-600
      send: '#10B981',
      // Figma: bg-white/10 border-white/10
      mic: 'rgba(255,255,255,0.10)',
      // Figma: bg-white/5 (ハンバーガー)
      hamburger: 'rgba(255,255,255,0.05)',
    },
    // Figma: bg-white/8 (attach sheet icon box)
    iconBox: 'rgba(255,255,255,0.08)',
    // Figma: bg-white/20 (sheet handle)
    handle: 'rgba(255,255,255,0.20)',
    // Figma: bg-black/60 (overlay)
    overlay: 'rgba(0,0,0,0.60)',
  },

  light: {
    background: {
      // Figma: bg-[#F5F7FA]
      page: '#F5F7FA',
      // Figma: bg-white (inputBg)
      surface: '#FFFFFF',
      // Figma: bg-gray-50
      card: '#F9FAFB',
    },
    border: {
      // Figma: border-gray-300
      input: '#D1D5DB',
      // Figma: border-gray-200
      default: '#E5E7EB',
      // Figma: border-gray-200 (gridItem)
      card: '#E5E7EB',
    },
    text: {
      // Figma: text-gray-900
      primary: '#1F2937',
      // Figma: text-gray-600
      secondary: '#6B7280',
    },
    // Figma: bg-blue-500/15, border-blue-500/30, text-blue-600
    site: {
      bg: 'rgba(59,130,246,0.08)',
      border: 'rgba(59,130,246,0.20)',
      text: '#2563EB',
    },
    button: {
      plus: '#3B82F6',
      send: '#10B981',
      // Figma: bg-gray-100 border-gray-200
      mic: '#F3F4F6',
      // Figma: bg-black/4
      hamburger: 'rgba(0,0,0,0.04)',
    },
    // Figma: bg-white (attach sheet icon box)
    iconBox: '#FFFFFF',
    // Figma: bg-gray-300
    handle: '#D1D5DB',
    // Figma: bg-black/40
    overlay: 'rgba(0,0,0,0.40)',
  },

  // アイコン色 (Figma attachActions)
  // text-blue-400 / text-purple-400 / text-emerald-400 / text-amber-400
  attachIconColors: {
    photo:   '#60A5FA',  // blue-400
    camera:  '#C084FC',  // purple-400
    file:    '#34D399',  // emerald-400
    receipt: '#FBBF24',  // amber-400
  },
} as const

export type MainChatTokenSet = typeof mainChatTokens.dark

// =============================================================================
// CHAT DESIGN TOKENS — セマンティック版
// main-chat 系コンポーネントが共通で参照する最小セット
//
// mainChatTokens (上記) は Figma 正本の細粒度マッピング
// chatTokens (こちら) はコンポーネントが実際に参照するセマンティック API
//
// 使い方:
//   const c = isDark ? chatTokens.colors.dark : chatTokens.colors.light
//   const { spacing: sp, radius: r, typography: typo } = chatTokens
// =============================================================================

export const chatTokens = {
  colors: {
    dark: {
      // Figma: bg-[#0A1628]
      background:      '#0A1628',
      // Figma: from-[#1a2635] (input row, sheet, surface)
      surface:         '#1a2635',
      // Figma: bg-white/6 (elevated card surface)
      surfaceElevated: 'rgba(255,255,255,0.06)',
      // Figma: border-white/10
      border:          'rgba(255,255,255,0.10)',
      // Figma: text-white
      textPrimary:     '#F9FAFB',
      // Figma: text-gray-400
      textSecondary:   '#9CA3AF',
      // Figma: blue-500 (plus button, site badge)
      accent:          '#3B82F6',
    },
    light: {
      // Figma: bg-[#F5F7FA]
      background:      '#F5F7FA',
      // Figma: bg-white
      surface:         '#FFFFFF',
      // Figma: bg-gray-50
      surfaceElevated: '#F9FAFB',
      // Figma: border-gray-200
      border:          '#E5E7EB',
      // Figma: text-gray-900
      textPrimary:     '#1F2937',
      // Figma: text-gray-600
      textSecondary:   '#6B7280',
      // Figma: blue-600 (plus button, site badge)
      accent:          '#2563EB',
    },
  },

  // Figma px/py/gap 値 (1単位 = 4px)
  spacing: {
    xs:    4,   // p-1
    sm:    8,   // p-2
    md:    12,  // p-3
    base:  16,  // p-4
    lg:    20,  // px-5
    xl:    24,  // px-6
    '2xl': 32,  // pb-8
    '3xl': 40,  // pt-10
    header: 56, // pt-14 (header top padding)
  },

  // Figma rounded-* 対応
  radius: {
    sm:    8,    // rounded-lg
    md:    12,   // rounded-xl  (icon box)
    lg:    16,   // rounded-2xl (grid card, buttons)
    xl:    24,   // rounded-3xl
    sheet: 32,   // rounded-t-[32px] (bottom sheet)
    pill:  9999, // rounded-full (chips, input)
  },

  typography: {
    size: {
      xs:    12,
      sm:    14,
      base:  16,
      lg:    18,
      xl:    20,
      '2xl': 24,
      '3xl': 30,
    },
    weight: {
      normal:   '400' as const,
      medium:   '500' as const,
      semibold: '600' as const,
      bold:     '700' as const,
    },
    lineHeight: {
      tight:   1.25,  // leading-tight
      normal:  1.5,   // leading-normal
      relaxed: 1.625, // leading-relaxed
    },
  },

  shadow: {
    // カード・インラインサーフェス用
    card: {
      shadowColor:   '#000000',
      shadowOffset:  { width: 0, height: 1 },
      shadowOpacity: 0.08,
      shadowRadius:  4,
      elevation:     2,
    },
    // ボトムシート用 (shadow-2xl に近似)
    sheet: {
      shadowColor:   '#000000',
      shadowOffset:  { width: 0, height: -4 },
      shadowOpacity: 0.30,
      shadowRadius:  16,
      elevation:     24,
    },
  },
} as const

export type ChatColorSet = typeof chatTokens.colors.dark