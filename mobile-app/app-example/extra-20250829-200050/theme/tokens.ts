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