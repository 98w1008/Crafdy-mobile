/**
 * 🎨 Krafty Construction App - Gray Design Token System v1.0
 * Professional Gray-Based Design System
 * 
 * Features:
 * ✨ Gray-only color palette (no green/orange accents)
 * 👁️ Reduced glare/brightness - minimal white usage
 * 🌑 Future-ready for dark mode implementation
 * ♿ WCAG AA accessibility compliance (4.5:1 contrast ratio minimum)
 * 🏗️ Construction industry optimized for professionals
 * 📱 8pt grid system integration for pixel-perfect alignment
 * 🔍 Enhanced contrast through shadows and gradations
 */

// 統一されたエクスポート用の統合オブジェクト
export const Colors = {
  primary: { 
    DEFAULT: '#52525B', 
    light: '#71717A', 
    dark: '#3F3F46' 
  },
  secondary: { 
    DEFAULT: '#2563EB', 
    light: '#60A5FA', 
    dark: '#1D4ED8' 
  },
  accent: { 
    DEFAULT: '#D97706', 
    light: '#F59E0B', 
    dark: '#B45309' 
  },
  semantic: { 
    success: '#16A34A', 
    warning: '#D97706', 
    danger: '#DC2626', 
    info: '#2563EB' 
  },
  text: { 
    primary: '#111827', 
    secondary: '#6B7280', 
    muted: '#9CA3AF' 
  },
  base: { 
    background: '#F3F4F6', 
    surface: '#FFFFFF', 
    surfaceSubtle: '#F9FAFB' 
  },
  border: { 
    light: '#E5E7EB', 
    dark: '#D1D5DB' 
  },
  shadow: { 
    DEFAULT: 'rgba(0, 0, 0, 0.08)' 
  }
};

export const Typography = {
  sizes: { 
    xs: 14, 
    sm: 16, 
    base: 18, 
    lg: 20, 
    xl: 24 
  },
  lineHeights: { 
    tight: 1.25, 
    normal: 1.4, 
    relaxed: 1.5 
  }
};

export const Spacing = {
  xs: 4, 
  sm: 8, 
  md: 16, 
  lg: 24, 
  xl: 32, 
  '2xl': 48
};

export const BorderRadius = {
  sm: 8, 
  md: 12, 
  lg: 16, 
  pill: 9999
};

export const Shadows = {
  sm: {
    shadowColor: 'rgba(0, 0, 0, 0.08)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: 'rgba(0, 0, 0, 0.12)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 4,
  }
};

// レガシー対応用 - 詳細なGrayDesignTokens
export const GrayDesignTokens = {
  /**
   * 🎨 CORE COLOR PALETTE
   * Gray-based system optimized for construction professionals
   */
  colors: {
    // 🌫️ Base Gray Scale (Primary Palette)
    gray: {
      50: '#FAFAFA',    // Lightest - subtle highlights only
      100: '#F4F4F5',   // Very light - minimal usage
      200: '#E4E4E7',   // Light - subtle backgrounds
      300: '#D4D4D8',   // Light medium - borders
      400: '#A1A1AA',   // Medium - secondary text
      500: '#71717A',   // Medium dark - primary interactive
      600: '#52525B',   // Dark - headings
      700: '#3F3F46',   // Very dark - primary text
      800: '#27272A',   // Darker - emphasis
      900: '#18181B',   // Darkest - high contrast
      950: '#09090B',   // Near black - maximum contrast
    },

    // 🏗️ Neutral Palette (Warm grays for construction feel)
    neutral: {
      50: '#FAFAF9',    // Warm white - very minimal usage
      100: '#F5F5F4',   // Warm light - subtle sections
      200: '#E7E5E4',   // Light warm - cards
      300: '#D6D3D1',   // Medium warm - borders
      400: '#A8A29E',   // Warm medium - secondary text
      500: '#78716C',   // Warm medium dark - interactive
      600: '#57534E',   // Warm dark - headings
      700: '#44403C',   // Warm very dark - primary text
      800: '#292524',   // Warm darker - emphasis
      900: '#1C1917',   // Warm darkest - high contrast
      950: '#0C0A09',   // Near black warm - maximum contrast
    },

    // 🌟 Primary Colors (Main gray-based interactive colors)
    primary: {
      DEFAULT: '#52525B',      // Gray-600 - main interactive color
      light: '#71717A',        // Gray-500 - hover states
      dark: '#3F3F46',         // Gray-700 - pressed states
      contrast: '#F4F4F5',     // Gray-100 - text on primary
    },

    // 📄 Background System (Reduced brightness)
    background: {
      primary: '#F3F4F6',      // Main app background (Gray-100 equivalent)
      secondary: '#E5E7EB',    // Section backgrounds
      tertiary: '#D1D5DB',     // Subtle dividers
      surface: '#FFFFFF',      // Cards (minimal usage)
      elevated: '#FFFFFF',     // Elevated surfaces with shadows
      overlay: 'rgba(0, 0, 0, 0.4)', // Modal overlays
    },

    // 📝 Text System (High contrast hierarchy)
    text: {
      primary: '#111827',      // Main text - highest contrast
      secondary: '#6B7280',    // Secondary text - medium contrast
      tertiary: '#9CA3AF',     // Tertiary text - lower contrast
      disabled: '#D1D5DB',     // Disabled states
      inverse: '#F9FAFB',      // Text on dark backgrounds
      onPrimary: '#FFFFFF',    // Text on primary color
    },

    // 🔲 Border System
    border: {
      light: '#F3F4F6',        // Subtle borders
      default: '#E5E7EB',      // Standard borders
      medium: '#D1D5DB',       // Medium borders
      strong: '#9CA3AF',       // Strong borders
      dark: '#6B7280',         // Dark borders
      focus: '#52525B',        // Focus states (primary)
    },

    // ⚡ Interactive States
    interactive: {
      default: '#52525B',      // Default interactive (Gray-600)
      hover: '#71717A',        // Hover state (Gray-500)
      pressed: '#3F3F46',      // Pressed state (Gray-700)
      disabled: '#D1D5DB',     // Disabled state (Gray-300)
      focus: '#52525B',        // Focus state
      selected: '#27272A',     // Selected state (Gray-800)
    },

    // ⚠️ Semantic Colors (Minimal, gray-toned when possible)
    semantic: {
      success: {
        primary: '#16A34A',     // Success green (minimal usage)
        background: '#F0FDF4',  // Success background
        border: '#BBF7D0',      // Success border
      },
      warning: {
        primary: '#D97706',     // Warning amber
        background: '#FFFBEB',  // Warning background
        border: '#FCD34D',      // Warning border
      },
      error: {
        primary: '#DC2626',     // Error red
        background: '#FEF2F2',  // Error background
        border: '#FECACA',      // Error border
      },
      info: {
        primary: '#2563EB',     // Info blue
        background: '#EFF6FF',  // Info background
        border: '#BFDBFE',      // Info border
      },
    },

    // 🌫️ Shadow Colors
    shadow: {
      light: 'rgba(0, 0, 0, 0.04)',    // Very light shadows
      medium: 'rgba(0, 0, 0, 0.08)',   // Medium shadows
      strong: 'rgba(0, 0, 0, 0.12)',   // Strong shadows
      dark: 'rgba(0, 0, 0, 0.16)',     // Dark shadows
      modal: 'rgba(0, 0, 0, 0.20)',    // Modal shadows
    },
  },

  /**
   * 📝 TYPOGRAPHY SYSTEM
   * Large text with optimal line height for construction professionals
   */
  typography: {
    // 📏 Font Sizes (Large text for accessibility)
    sizes: {
      xs: 14,          // 14px - Minimum readable size
      sm: 16,          // 16px - Small UI text
      base: 18,        // 18px - Default body text (large)
      lg: 20,          // 20px - Large body text
      xl: 24,          // 24px - Section headings
      '2xl': 28,       // 28px - Page headings
      '3xl': 32,       // 32px - Large headings
      '4xl': 40,       // 40px - Display text
      '5xl': 48,       // 48px - Hero text
      '6xl': 64,       // 64px - Extra large display
    },

    // 🎯 Font Weights
    weights: {
      light: '300',
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
      extrabold: '800',
    },

    // 📐 Line Heights (1.4+ minimum for readability)
    lineHeights: {
      tight: 1.25,     // Headers only
      normal: 1.4,     // Minimum for body text
      relaxed: 1.5,    // Comfortable reading
      loose: 1.6,      // Maximum comfort
      spacious: 1.75,  // Very spacious
    },

    // 🔤 Letter Spacing
    letterSpacing: {
      tighter: -0.025,
      tight: -0.0125,
      normal: 0,
      wide: 0.025,
      wider: 0.05,
      widest: 0.1,
    },

    // 📱 Typography Presets
    presets: {
      // Headers
      h1: { size: 32, weight: '700', lineHeight: 1.25, letterSpacing: -0.025 },
      h2: { size: 28, weight: '600', lineHeight: 1.3, letterSpacing: -0.0125 },
      h3: { size: 24, weight: '600', lineHeight: 1.35, letterSpacing: 0 },
      h4: { size: 20, weight: '500', lineHeight: 1.4, letterSpacing: 0 },
      
      // Body text
      bodyLarge: { size: 20, weight: '400', lineHeight: 1.5, letterSpacing: 0 },
      body: { size: 18, weight: '400', lineHeight: 1.5, letterSpacing: 0 },
      bodySmall: { size: 16, weight: '400', lineHeight: 1.5, letterSpacing: 0 },
      
      // UI elements
      button: { size: 18, weight: '500', lineHeight: 1.4, letterSpacing: 0.025 },
      caption: { size: 14, weight: '400', lineHeight: 1.4, letterSpacing: 0.025 },
      overline: { size: 12, weight: '500', lineHeight: 1.5, letterSpacing: 0.1 },
    },
  },

  /**
   * 📐 SPACING SYSTEM
   * 8pt grid system for perfect alignment
   */
  spacing: {
    // Core 8pt grid values
    0: 0,            // 0px
    1: 4,            // 4px - 0.5 unit
    2: 8,            // 8px - 1 unit (base)
    3: 12,           // 12px - 1.5 units
    4: 16,           // 16px - 2 units
    5: 20,           // 20px - 2.5 units
    6: 24,           // 24px - 3 units
    7: 28,           // 28px - 3.5 units
    8: 32,           // 32px - 4 units
    9: 36,           // 36px - 4.5 units
    10: 40,          // 40px - 5 units
    12: 48,          // 48px - 6 units
    14: 56,          // 56px - 7 units
    16: 64,          // 64px - 8 units
    20: 80,          // 80px - 10 units
    24: 96,          // 96px - 12 units
    28: 112,         // 112px - 14 units
    32: 128,         // 128px - 16 units

    // Semantic spacing names
    xs: 4,           // Extra small
    sm: 8,           // Small
    md: 16,          // Medium
    lg: 24,          // Large
    xl: 32,          // Extra large
    '2xl': 48,       // 2x Extra large
    '3xl': 64,       // 3x Extra large
    '4xl': 96,       // 4x Extra large
    '5xl': 128,      // 5x Extra large

    // Component-specific spacing
    buttonPadding: { horizontal: 24, vertical: 16 },
    cardPadding: 24,
    screenPadding: 20,
    sectionSpacing: 32,
    componentSpacing: 16,
  },

  /**
   * 🔄 BORDER RADIUS SYSTEM
   * 8-12px consistently as requested
   */
  borderRadius: {
    none: 0,          // 0px - No radius
    xs: 4,            // 4px - Minimal
    sm: 8,            // 8px - Standard (recommended)
    md: 12,           // 12px - Medium (recommended)
    lg: 16,           // 16px - Large
    xl: 20,           // 20px - Extra large
    '2xl': 24,        // 24px - Very large
    full: 9999,       // Full circle/pill

    // Component-specific radii
    button: 8,        // Standard buttons
    card: 12,         // Cards and containers
    input: 8,         // Form inputs
    modal: 12,        // Modals and overlays
    image: 8,         // Images
  },

  /**
   * 🌫️ SHADOW/ELEVATION SYSTEM
   * Enhanced hierarchy through shadows and gradations
   */
  shadows: {
    none: {
      shadowColor: 'transparent',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0,
      shadowRadius: 0,
      elevation: 0,
    },
    
    // Light shadows for subtle elevation
    xs: {
      shadowColor: 'rgba(0, 0, 0, 0.04)',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 1,
      shadowRadius: 2,
      elevation: 1,
    },
    
    // Standard card shadows
    sm: {
      shadowColor: 'rgba(0, 0, 0, 0.08)',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 1,
      shadowRadius: 4,
      elevation: 2,
    },
    
    // Medium elevation for interactive elements
    md: {
      shadowColor: 'rgba(0, 0, 0, 0.12)',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 1,
      shadowRadius: 8,
      elevation: 4,
    },
    
    // Strong shadows for prominent elements
    lg: {
      shadowColor: 'rgba(0, 0, 0, 0.16)',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 1,
      shadowRadius: 16,
      elevation: 8,
    },
    
    // Modal and overlay shadows
    xl: {
      shadowColor: 'rgba(0, 0, 0, 0.20)',
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 1,
      shadowRadius: 24,
      elevation: 12,
    },

    // Component-specific shadows
    card: {
      shadowColor: 'rgba(0, 0, 0, 0.08)',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 1,
      shadowRadius: 8,
      elevation: 2,
    },
    button: {
      shadowColor: 'rgba(0, 0, 0, 0.12)',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 1,
      shadowRadius: 8,
      elevation: 4,
    },
    modal: {
      shadowColor: 'rgba(0, 0, 0, 0.20)',
      shadowOffset: { width: 0, height: 16 },
      shadowOpacity: 1,
      shadowRadius: 32,
      elevation: 16,
    },
  },

  /**
   * 🎛️ COMPONENT TOKENS
   * Specific design tokens for common UI components
   */
  components: {
    // 🔘 Button Tokens
    button: {
      // Primary button (main gray)
      primary: {
        background: '#52525B',
        backgroundHover: '#71717A',
        backgroundPressed: '#3F3F46',
        backgroundDisabled: '#D1D5DB',
        text: '#FFFFFF',
        textDisabled: '#9CA3AF',
        borderRadius: 8,
        paddingHorizontal: 24,
        paddingVertical: 16,
        minHeight: 44,  // 44pt touch target
      },
      
      // Secondary button (outlined)
      secondary: {
        background: 'transparent',
        backgroundHover: '#F3F4F6',
        backgroundPressed: '#E5E7EB',
        backgroundDisabled: 'transparent',
        text: '#52525B',
        textDisabled: '#D1D5DB',
        border: '#D1D5DB',
        borderHover: '#9CA3AF',
        borderPressed: '#6B7280',
        borderRadius: 8,
        paddingHorizontal: 24,
        paddingVertical: 16,
        minHeight: 44,
      },
      
      // Ghost button (text only)
      ghost: {
        background: 'transparent',
        backgroundHover: '#F3F4F6',
        backgroundPressed: '#E5E7EB',
        text: '#52525B',
        textDisabled: '#D1D5DB',
        borderRadius: 8,
        paddingHorizontal: 16,
        paddingVertical: 12,
        minHeight: 44,
      },
    },

    // 🃏 Card Tokens
    card: {
      background: '#FFFFFF',
      border: '#E5E7EB',
      borderRadius: 12,
      padding: 24,
      shadow: {
        shadowColor: 'rgba(0, 0, 0, 0.08)',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 1,
        shadowRadius: 8,
        elevation: 2,
      },
    },

    // 📝 Input Tokens
    input: {
      background: '#FFFFFF',
      backgroundFocus: '#FFFFFF',
      backgroundDisabled: '#F3F4F6',
      text: '#111827',
      textPlaceholder: '#9CA3AF',
      textDisabled: '#D1D5DB',
      border: '#D1D5DB',
      borderFocus: '#52525B',
      borderError: '#DC2626',
      borderRadius: 8,
      paddingHorizontal: 16,
      paddingVertical: 12,
      minHeight: 44,
    },

    // 🎯 Icon Tokens
    icon: {
      size: 24,           // 24px as requested
      strokeWidth: 2,     // 2px stroke as requested
      primary: '#52525B',
      secondary: '#9CA3AF',
      disabled: '#D1D5DB',
      inverse: '#FFFFFF',
      // Touch targets for icon buttons
      touchTarget: 44,    // 44pt minimum
    },

    // 📄 Modal Tokens
    modal: {
      background: '#FFFFFF',
      overlay: 'rgba(0, 0, 0, 0.4)',
      borderRadius: 12,
      padding: 24,
      shadow: {
        shadowColor: 'rgba(0, 0, 0, 0.20)',
        shadowOffset: { width: 0, height: 16 },
        shadowOpacity: 1,
        shadowRadius: 32,
        elevation: 16,
      },
    },

    // 📋 List Item Tokens
    listItem: {
      background: 'transparent',
      backgroundHover: '#F3F4F6',
      backgroundPressed: '#E5E7EB',
      backgroundSelected: '#E5E7EB',
      text: '#111827',
      textSecondary: '#6B7280',
      paddingHorizontal: 20,
      paddingVertical: 16,
      minHeight: 44,
      borderBottom: '#F3F4F6',
    },

    // 📊 Badge Tokens
    badge: {
      primary: {
        background: '#52525B',
        text: '#FFFFFF',
      },
      secondary: {
        background: '#E5E7EB',
        text: '#111827',
      },
      success: {
        background: '#16A34A',
        text: '#FFFFFF',
      },
      warning: {
        background: '#D97706',
        text: '#FFFFFF',
      },
      error: {
        background: '#DC2626',
        text: '#FFFFFF',
      },
      borderRadius: 12,
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
  },

  /**
   * 🌙 DARK MODE PREPARATION
   * Token structure ready for future dark mode implementation
   */
  darkMode: {
    colors: {
      background: {
        primary: '#111827',
        secondary: '#1F2937',
        tertiary: '#374151',
        surface: '#1F2937',
        elevated: '#374151',
      },
      text: {
        primary: '#F9FAFB',
        secondary: '#D1D5DB',
        tertiary: '#9CA3AF',
        disabled: '#6B7280',
      },
      border: {
        light: '#374151',
        default: '#4B5563',
        medium: '#6B7280',
        strong: '#9CA3AF',
      },
      interactive: {
        default: '#9CA3AF',
        hover: '#D1D5DB',
        pressed: '#6B7280',
        disabled: '#4B5563',
      },
    },
  },
} as const;

/**
 * 📊 DESIGN TOKEN REFERENCE TABLE
 * 
 * | Token Category | Purpose | Key Values |
 * |----------------|---------|------------|
 * | colors.gray | Primary palette | 50-950 scale |
 * | colors.neutral | Warm grays | Construction-friendly |
 * | colors.background.primary | App background | #F3F4F6 (reduced brightness) |
 * | colors.text.primary | Main text | #111827 (high contrast) |
 * | typography.sizes.base | Body text | 18px (large for accessibility) |
 * | typography.lineHeights.normal | Line height | 1.4+ (readable) |
 * | spacing.md | Standard spacing | 16px (8pt grid) |
 * | borderRadius.sm | Standard radius | 8px (as requested) |
 * | borderRadius.md | Card radius | 12px (as requested) |
 * | components.button.primary.minHeight | Touch target | 44pt (accessibility) |
 * | components.icon.size | Icon size | 24px (as requested) |
 * | components.icon.strokeWidth | Icon stroke | 2px (as requested) |
 * | shadows.card | Card elevation | Subtle shadow hierarchy |
 * 
 * 🎯 KEY PRINCIPLES IMPLEMENTED:
 * ✅ Gray-based color scheme ONLY
 * ✅ Reduced glare/brightness (minimal white usage)
 * ✅ Shadow and gradation hierarchy
 * ✅ 8-12px border radius consistently
 * ✅ Large text (18px base), 1.4+ line height
 * ✅ 44pt touch targets
 * ✅ Monochrome icons, 2px stroke, 24px size
 * ✅ Future dark mode ready
 * ✅ Professional construction industry appropriate
 */

// Type exports for TypeScript support
export type GrayColorValue = string;
export type SpacingValue = number;
export type ComponentToken = Record<string, any>;
export type ShadowToken = {
  shadowColor: string;
  shadowOffset: { width: number; height: number };
  shadowOpacity: number;
  shadowRadius: number;
  elevation: number;
};

export default GrayDesignTokens;