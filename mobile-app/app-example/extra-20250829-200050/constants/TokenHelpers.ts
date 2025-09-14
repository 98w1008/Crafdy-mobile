/**
 * 🛡️ Design Token Helpers - Fallback Protection
 * Provides safe access to design tokens with fallbacks
 * Prevents "Cannot read property 'lg' of undefined" errors
 */

import { Spacing, Typography, BorderRadius, Colors, Shadows } from './Colors'

// =============================================================================
// SAFE TOKEN ACCESS HELPERS
// =============================================================================

/**
 * Safely get spacing value with fallback
 * @param token - Spacing token key
 * @param fallback - Fallback value if token doesn't exist
 * @returns Spacing value in pixels
 */
export const getSpacing = (token: keyof typeof Spacing, fallback: number = 16): number => {
  try {
    return Spacing[token] ?? fallback
  } catch {
    console.warn(`⚠️ Spacing token "${String(token)}" not found, using fallback: ${fallback}px`)
    return fallback
  }
}

/**
 * Safely get typography size with fallback
 * @param token - Typography token key
 * @param fallback - Fallback value if token doesn't exist
 * @returns Font size in pixels
 */
export const getTypography = (token: keyof typeof Typography, fallback: number = 16): number => {
  try {
    return Typography[token] ?? fallback
  } catch {
    console.warn(`⚠️ Typography token "${String(token)}" not found, using fallback: ${fallback}px`)
    return fallback
  }
}

/**
 * Safely get border radius with fallback
 * @param token - BorderRadius token key
 * @param fallback - Fallback value if token doesn't exist
 * @returns Border radius value in pixels
 */
export const getBorderRadius = (token: keyof typeof BorderRadius, fallback: number = 8): number => {
  try {
    return BorderRadius[token] ?? fallback
  } catch {
    console.warn(`⚠️ BorderRadius token "${String(token)}" not found, using fallback: ${fallback}px`)
    return fallback
  }
}

/**
 * Safely get color with fallback
 * @param colorPath - Color path (e.g., 'primary', 'text.primary')
 * @param fallback - Fallback color value
 * @returns Color string
 */
export const getColor = (colorPath: string, fallback: string = '#000000'): string => {
  try {
    const keys = colorPath.split('.')
    let value: any = Colors
    
    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key]
      } else {
        throw new Error(`Color path "${colorPath}" not found`)
      }
    }
    
    return typeof value === 'string' ? value : fallback
  } catch {
    console.warn(`⚠️ Color "${colorPath}" not found, using fallback: ${fallback}`)
    return fallback
  }
}

// =============================================================================
// TOKEN VALIDATION
// =============================================================================

/**
 * Validate that all required tokens exist
 * @returns Validation report
 */
export const validateTokens = () => {
  const report = {
    spacing: true,
    typography: true,
    borderRadius: true,
    colors: true,
    shadows: true,
    errors: [] as string[],
  }

  // Check spacing tokens
  const requiredSpacing = ['xs', 'sm', 'md', 'lg', 'xl'] as const
  for (const token of requiredSpacing) {
    if (!(token in Spacing)) {
      report.spacing = false
      report.errors.push(`Missing spacing token: ${token}`)
    }
  }

  // Check typography tokens  
  const requiredTypography = ['xs', 'sm', 'base', 'lg', 'xl'] as const
  for (const token of requiredTypography) {
    if (!(token in Typography)) {
      report.typography = false
      report.errors.push(`Missing typography token: ${token}`)
    }
  }

  // Check border radius tokens
  const requiredBorderRadius = ['none', 'xs', 'sm', 'md', 'lg'] as const
  for (const token of requiredBorderRadius) {
    if (!(token in BorderRadius)) {
      report.borderRadius = false
      report.errors.push(`Missing borderRadius token: ${token}`)
    }
  }

  // Check essential colors
  const requiredColors = ['primary', 'text', 'background'] as const
  for (const token of requiredColors) {
    if (!(token in Colors)) {
      report.colors = false
      report.errors.push(`Missing color token: ${token}`)
    }
  }

  return report
}

// =============================================================================
// COMMON STYLE GENERATORS
// =============================================================================

/**
 * Generate safe padding style
 * @param size - Padding size token
 * @returns Style object with padding
 */
export const safePadding = (size: keyof typeof Spacing) => ({
  padding: getSpacing(size),
})

/**
 * Generate safe margin style  
 * @param size - Margin size token
 * @returns Style object with margin
 */
export const safeMargin = (size: keyof typeof Spacing) => ({
  margin: getSpacing(size),
})

/**
 * Generate safe typography style
 * @param size - Font size token
 * @param weight - Font weight token
 * @returns Style object with typography
 */
export const safeTypography = (
  size: keyof typeof Typography,
  weight?: keyof typeof Typography.weights
) => ({
  fontSize: getTypography(size),
  ...(weight && { fontWeight: Typography.weights[weight] ?? '400' }),
})

/**
 * Generate safe border style
 * @param radius - Border radius token
 * @param color - Border color
 * @param width - Border width
 * @returns Style object with border
 */
export const safeBorder = (
  radius: keyof typeof BorderRadius,
  color?: string,
  width: number = 1
) => ({
  borderRadius: getBorderRadius(radius),
  ...(color && { borderColor: getColor(color, '#E5E7EB'), borderWidth: width }),
})

// =============================================================================
// DEVELOPMENT HELPERS
// =============================================================================

/**
 * Log all available design tokens (development only)
 */
export const debugTokens = () => {
  if (__DEV__) {
    console.group('🎨 Design Tokens Debug')
    console.log('Spacing:', Object.keys(Spacing))
    console.log('Typography:', Object.keys(Typography))
    console.log('BorderRadius:', Object.keys(BorderRadius))
    console.log('Colors:', Object.keys(Colors))
    console.log('Shadows:', Object.keys(Shadows))
    console.groupEnd()
  }
}

/**
 * Check for potential token issues
 */
export const checkTokenHealth = () => {
  if (__DEV__) {
    const report = validateTokens()
    
    if (report.errors.length > 0) {
      console.warn('🚨 Design Token Issues Found:')
      report.errors.forEach(error => console.warn(`  - ${error}`))
    } else {
      console.log('✅ All design tokens are healthy!')
    }
    
    return report
  }
}

// Auto-check tokens in development
if (__DEV__) {
  // Run validation on import
  setTimeout(() => checkTokenHealth(), 100)
}