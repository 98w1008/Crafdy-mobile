/**
 * 🎨 Crafdy Mobile - Unified Design Token System
 * Single source of truth for all design tokens
 * Prevents "Cannot read property 'lg' of undefined" errors
 * 
 * Features:
 * ✅ Consistent token structure across all components
 * ✅ TypeScript support with proper typing
 * ✅ Fallback values for safety
 * ✅ Backward compatibility with existing imports
 */

// =============================================================================
// SPACING SYSTEM - 8pt Grid Base
// =============================================================================

export const Spacing = {
  // Base grid values (8pt system)
  xs: 4,          // 4px - 0.5 units
  sm: 8,          // 8px - 1 unit  
  md: 16,         // 16px - 2 units (base)
  lg: 24,         // 24px - 3 units
  xl: 32,         // 32px - 4 units
  '2xl': 48,      // 48px - 6 units
  '3xl': 64,      // 64px - 8 units
  
  // Numeric access (for array access safety)
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
  20: 80,
  24: 96,
} as const

// =============================================================================
// TYPOGRAPHY SYSTEM
// =============================================================================

export const Typography = {
  // Font sizes
  xs: 12,         // Extra small
  sm: 14,         // Small
  base: 16,       // Base/body text
  lg: 18,         // Large
  xl: 20,         // Extra large
  '2xl': 24,      // Heading medium
  '3xl': 30,      // Heading large
  '4xl': 36,      // Display small
  '5xl': 48,      // Display large
  
  // Font weights
  weights: {
    light: '300',
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
  },
  
  // Line heights
  lineHeights: {
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.75,
  },
} as const

// =============================================================================
// BORDER RADIUS SYSTEM  
// =============================================================================

export const BorderRadius = {
  none: 0,
  xs: 2,
  sm: 4,
  md: 8,          // Standard (as requested)
  lg: 12,         // Medium (as requested) 
  xl: 16,
  '2xl': 20,
  '3xl': 24,
  full: 9999,
} as const

// =============================================================================
// COLOR SYSTEM - Theme Aware
// =============================================================================

// Base color tokens
const BaseColors = {
  // Green accent system (unified)
  green: {
    50: '#F0FDF4',
    100: '#DCFCE7', 
    200: '#BBF7D0',
    300: '#86EFAC',
    400: '#4ADE80',
    500: '#16A34A',   // Primary green
    600: '#059669',
    700: '#047857',
    800: '#065F46',
    900: '#064E3B',
  },
  
  // Gray scale for light theme
  gray: {
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
    400: '#9CA3AF',
    500: '#6B7280',
    600: '#4B5563',
    700: '#374151',
    800: '#1F2937',
    900: '#111827',
  },
  
  // Semantic colors
  semantic: {
    success: '#16A34A',
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#2563EB',
  }
} as const

// Light theme colors  
export const LightColors = {
  // Backgrounds
  background: '#FFFFFF',
  backgroundSecondary: '#F9FAFB',
  surface: '#FFFFFF',
  surfaceElevated: '#FFFFFF',
  
  // Text
  text: '#111827',
  textSecondary: '#6B7280',
  textTertiary: '#9CA3AF',
  textOnPrimary: '#FFFFFF',
  
  // Borders  
  border: '#E5E7EB',
  borderLight: '#F3F4F6',
  borderStrong: '#D1D5DB',
  
  // Primary/Accent
  primary: BaseColors.green[500],
  primaryLight: BaseColors.green[100],
  primaryDark: BaseColors.green[600],
  
  // Interactive states
  interactive: '#F3F4F6',
  interactiveHover: '#E5E7EB',
  interactivePressed: '#D1D5DB',
  
  // Semantic
  success: BaseColors.semantic.success,
  successLight: BaseColors.green[50],
  warning: BaseColors.semantic.warning,
  warningLight: '#FFF7ED',
  error: BaseColors.semantic.error,
  errorLight: '#FEF2F2',
  info: BaseColors.semantic.info,
  infoLight: '#EFF6FF',
} as const

// Dark theme colors
export const DarkColors = {
  // Backgrounds
  background: '#111827',
  backgroundSecondary: '#1F2937', 
  surface: '#1F2937',
  surfaceElevated: '#374151',
  
  // Text
  text: '#F9FAFB',
  textSecondary: '#D1D5DB',
  textTertiary: '#9CA3AF', 
  textOnPrimary: '#FFFFFF',
  
  // Borders
  border: '#374151',
  borderLight: '#4B5563',
  borderStrong: '#6B7280',
  
  // Primary/Accent
  primary: BaseColors.green[500],
  primaryLight: BaseColors.green[200],
  primaryDark: BaseColors.green[600],
  
  // Interactive states
  interactive: '#374151',
  interactiveHover: '#4B5563',
  interactivePressed: '#6B7280',
  
  // Semantic (same as light)
  success: BaseColors.semantic.success,
  successLight: '#064E3B',
  warning: BaseColors.semantic.warning,
  warningLight: '#78350F',
  error: BaseColors.semantic.error,
  errorLight: '#7F1D1D',
  info: BaseColors.semantic.info, 
  infoLight: '#1E3A8A',
} as const

// AI特化カラートークン
export const AIColors = {
  // AIバブル用グラデーション
  aiBubbleGradientStart: '#F0FDF4',  // green-50
  aiBubbleGradientEnd: '#DCFCE7',    // green-100
  aiBubbleGlow: '#16A34A',           // green-500 with opacity
  
  // AIバッジ
  aiBadgeBackground: '#16A34A',      // green-500
  aiBadgeText: '#FFFFFF',
  aiBadgeBorder: '#059669',          // green-600
  
  // タイピングドット
  typingDotActive: '#16A34A',        // green-500
  typingDotInactive: '#D1D5DB',      // gray-300
  
  // 現場ピル
  sitePillBackground: '#F3F4F6',     // gray-100
  sitePillText: '#374151',           // gray-700
  sitePillBorder: '#E5E7EB',         // gray-200
} as const

// Current theme colors (defaults to light)
export const Colors = {
  ...LightColors,
  // Additional direct access
  accent: BaseColors.green,
  gray: BaseColors.gray,
  semantic: BaseColors.semantic,
  // AI特化トークン
  ai: AIColors,
} as const

// =============================================================================
// SHADOWS SYSTEM
// =============================================================================

export const Shadows = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  xs: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
    elevation: 1,
  },
  sm: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: '#000000', 
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 15,
    elevation: 8,
  },
  xl: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.2,
    shadowRadius: 25,
    elevation: 12,
  },
  // AI バブル用の微細なグロー
  aiGlow: {
    shadowColor: '#16A34A',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
} as const

// =============================================================================
// UNIFIED EXPORTS - Single Source of Truth
// =============================================================================

// Main export object
export const DesignTokens = {
  spacing: Spacing,
  typography: Typography,
  borderRadius: BorderRadius,
  colors: Colors,
  shadows: Shadows,
} as const

// Individual exports for backward compatibility
export { BaseColors }
export { LightColors, DarkColors }

// Default export
export default DesignTokens

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

export const getSpacing = (size: keyof typeof Spacing): number => {
  return Spacing[size] ?? 16 // Fallback to md (16px)
}

export const getTypography = (size: keyof typeof Typography): number => {
  return Typography[size] ?? 16 // Fallback to base (16px)  
}

export const getBorderRadius = (size: keyof typeof BorderRadius): number => {
  return BorderRadius[size] ?? 8 // Fallback to md (8px)
}

// Theme switcher helper
export const getThemeColors = (isDark: boolean = false) => {
  return isDark ? DarkColors : LightColors
}

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

export type SpacingToken = keyof typeof Spacing
export type TypographyToken = keyof typeof Typography  
export type BorderRadiusToken = keyof typeof BorderRadius
export type ColorToken = keyof typeof Colors
export type ShadowToken = keyof typeof Shadows

export type ThemeMode = 'light' | 'dark'

// Component style helpers
export interface ComponentStyles {
  spacing?: SpacingToken
  typography?: TypographyToken
  borderRadius?: BorderRadiusToken
  shadow?: ShadowToken
}

// =============================================================================
// USAGE EXAMPLES & DOCUMENTATION
// =============================================================================

/*
// ✅ CORRECT USAGE EXAMPLES

// Basic imports
import { Spacing, Typography, BorderRadius, Colors } from '@/constants/DesignTokens'

// Style object
const styles = StyleSheet.create({
  container: {
    padding: Spacing.lg,              // ✅ 24px
    fontSize: Typography.base,        // ✅ 16px  
    borderRadius: BorderRadius.md,    // ✅ 8px
    backgroundColor: Colors.surface,  // ✅ #FFFFFF
  },
  
  // Safe access with fallbacks
  card: {
    padding: Spacing.lg ?? 24,        // ✅ Fallback protection
    borderRadius: BorderRadius.lg ?? 12,
  }
})

// Programmatic access
const cardPadding = getSpacing('lg')      // ✅ 24
const headingSize = getTypography('2xl') // ✅ 24
const buttonRadius = getBorderRadius('md') // ✅ 8

// ❌ AVOID THESE PATTERNS (cause undefined errors)

// Direct property access without checking
padding: Spacing['invalid']     // ❌ Will throw error
fontSize: Typography.invalid   // ❌ Will throw error  

// Better to use:
padding: Spacing.lg ?? 24      // ✅ Safe fallback
fontSize: getTypography('lg')  // ✅ Helper with fallback

*/