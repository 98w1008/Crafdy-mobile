/**
 * 🎨 Crafdy Mobile Design System v4.0
 * Light/Dark Theme with Green Accent Unification
 * 
 * Features:
 * ✨ Two themes only: Light (white background) / Dark (near black background)
 * 🟢 Single accent color: Green for CTA buttons, progress bars, key badges
 * 📖 High contrast section headers (dark gray on light, light gray on dark)
 * 🃏 Clear card hierarchy: light surface + shadow (Light) / border (Dark)
 */

interface ThemeColors {
  // Background hierarchy
  background: {
    primary: string     // Main app background
    surface: string     // Card/modal backgrounds
    elevated: string    // Elevated surfaces (modals, dropdowns)
    subtle: string      // Subtle section backgrounds
  }
  
  // Text hierarchy
  text: {
    primary: string     // Main text
    secondary: string   // Secondary/supporting text
    tertiary: string    // Tertiary/placeholder text
    disabled: string    // Disabled state text
    inverse: string     // Text on primary/dark backgrounds
  }
  
  // Border system
  border: {
    light: string       // Light borders
    medium: string      // Standard borders
    strong: string      // Strong borders/dividers
  }
  
  // Interactive states
  interactive: {
    default: string     // Default interactive elements
    hover: string       // Hover/touched state
    pressed: string     // Pressed/active state
    disabled: string    // Disabled interactive elements
  }
}

// Single accent color system (Green only)
const Accent = {
  DEFAULT: '#16A34A',           // Primary green - WCAG AA compliant
  50: '#F0FDF4',               // Lightest tint for backgrounds
  100: '#DCFCE7',              // Very light
  200: '#BBF7D0',              // Light
  300: '#86EFAC',              // Medium light
  400: '#4ADE80',              // Medium
  500: '#16A34A',              // Default - main CTA color
  600: '#059669',              // Darker - hover states
  700: '#047857',              // Dark - pressed states
  800: '#065F46',              // Very dark
  900: '#064E3B',              // Darkest
  alpha: {
    10: 'rgba(22, 163, 74, 0.1)',
    20: 'rgba(22, 163, 74, 0.2)',
    30: 'rgba(22, 163, 74, 0.3)',
  }
} as const

// Light Theme Colors
const LightTheme: ThemeColors = {
  background: {
    primary: '#FFFFFF',         // Pure white main background
    surface: '#F8F9FA',         // Subtle card surface
    elevated: '#FFFFFF',        // Pure white for modals
    subtle: '#F1F3F4',          // Very subtle section backgrounds
  },
  
  text: {
    primary: '#1F2937',         // Dark gray - excellent contrast (8.59:1)
    secondary: '#4B5563',       // Medium gray - good contrast (5.86:1)
    tertiary: '#6B7280',        // Light gray - minimum contrast (4.54:1)
    disabled: '#9CA3AF',        // Very light gray - disabled state
    inverse: '#FFFFFF',         // White text on dark/accent backgrounds
  },
  
  border: {
    light: '#E5E7EB',          // Very light borders
    medium: '#D1D5DB',         // Standard borders
    strong: '#9CA3AF',         // Strong dividers
  },
  
  interactive: {
    default: '#F3F4F6',        // Light gray interactive background
    hover: '#E5E7EB',          // Slightly darker on hover
    pressed: '#D1D5DB',        // Darker on press
    disabled: '#F9FAFB',       // Very light disabled state
  }
}

// Dark Theme Colors
const DarkTheme: ThemeColors = {
  background: {
    primary: '#111827',         // Near black main background
    surface: '#1F2937',         // Dark gray card surface
    elevated: '#374151',        // Lighter gray for modals
    subtle: '#1A202C',          // Subtle dark section backgrounds
  },
  
  text: {
    primary: '#F9FAFB',         // Near white - excellent contrast
    secondary: '#D1D5DB',       // Light gray - good contrast
    tertiary: '#9CA3AF',        // Medium gray - minimum contrast
    disabled: '#6B7280',        // Darker gray - disabled state
    inverse: '#111827',         // Dark text on light backgrounds
  },
  
  border: {
    light: '#374151',          // Dark borders
    medium: '#4B5563',         // Standard dark borders
    strong: '#6B7280',         // Strong dark dividers
  },
  
  interactive: {
    default: '#374151',        // Dark gray interactive background
    hover: '#4B5563',          // Lighter on hover
    pressed: '#6B7280',        // Even lighter on press
    disabled: '#1F2937',       // Very dark disabled state
  }
}

// Shadow system for light theme
const Shadows = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  sm: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
} as const

// Semantic colors (only essential ones, using green where appropriate)
const Semantic = {
  success: Accent.DEFAULT,      // Use green for success
  warning: '#F59E0B',          // Keep orange for warnings only
  error: '#EF4444',            // Red for errors only
  info: Accent[300],           // Light green for info
} as const

// Main export - theme-aware colors
export const Colors = {
  // Single accent color system
  accent: Accent,
  
  // Theme-specific colors
  light: LightTheme,
  dark: DarkTheme,
  
  // Shadow system (primarily for light theme)
  shadows: Shadows,
  
  // Legacy shadow API support
  shadow: {
    DEFAULT: '#000000',
    ...Shadows,
  },
  
  // Semantic colors
  semantic: Semantic,
  
  // Legacy support - will be gradually deprecated
  primary: Accent,              // Map old primary to accent
  base: LightTheme.background,  // Map old base to light theme
  text: LightTheme.text,        // Map old text to light theme
  border: LightTheme.border,    // Map old border to light theme
  
} as const

// Type definitions
export type ColorScheme = 'light' | 'dark'
export type ThemeColorKey = keyof ThemeColors
export type AccentColorKey = keyof typeof Accent

// Helper function to get theme colors
export const getThemeColors = (scheme: ColorScheme): ThemeColors => {
  return scheme === 'dark' ? Colors.dark : Colors.light
}

// Helper function for card styles with theme awareness
export const getCardStyle = (scheme: ColorScheme) => {
  const theme = getThemeColors(scheme)
  
  if (scheme === 'dark') {
    // Dark theme: use borders instead of shadows
    return {
      backgroundColor: theme.background.surface,
      borderWidth: 1,
      borderColor: theme.border.light,
      borderRadius: 8,
    }
  } else {
    // Light theme: use shadows
    return {
      backgroundColor: theme.background.surface,
      borderRadius: 8,
      ...Colors.shadows.sm,
    }
  }
}

// =============================================================================
// MISSING DESIGN TOKENS - Backward Compatibility
// =============================================================================

// Add missing Spacing tokens that other files expect
export const Spacing = {
  xs: 4,
  sm: 8, 
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
  '3xl': 64,
} as const

// Add missing Typography tokens  
export const Typography = {
  sizes: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
    '5xl': 48,
  },
  
  weights: {
    light: '300',
    normal: '400', 
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
  },
  
  lineHeights: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.6,
  },
} as const

// Add missing BorderRadius tokens
export const BorderRadius = {
  none: 0,
  xs: 2,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  '2xl': 20,
  full: 9999,
} as const

// Export Shadows for backward compatibility
export { Shadows }

/**
 * Usage Examples:
 * 
 * // CTA Button (only use accent green)
 * backgroundColor: Colors.accent.DEFAULT
 * 
 * // Progress Bar (use accent green)  
 * backgroundColor: Colors.accent[400]
 * 
 * // Section Header (theme-aware)
 * const theme = getThemeColors(colorScheme)
 * color: theme.text.primary
 * 
 * // Card (theme-aware with proper hierarchy)
 * const cardStyle = getCardStyle(colorScheme)
 * 
 * // Spacing usage
 * padding: Spacing.lg        // 24px
 * margin: Spacing.md         // 16px
 * 
 * // Typography usage
 * fontSize: Typography.base  // 16px
 * fontWeight: Typography.weights.semibold
 * 
 * // Border radius usage
 * borderRadius: BorderRadius.md  // 8px
 */