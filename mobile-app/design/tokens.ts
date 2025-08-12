/**
 * Crafdy Mobile Design Tokens
 * 安全な参照とフォールバックを含むデザイントークン定義
 */

export const Colors = {
  base: { 
    background: '#FFFFFF', 
    surface: '#F7F8FA', 
    surfaceSubtle: '#EEF1F6' 
  },
  text: { 
    primary: '#0F172A', 
    secondary: '#475569' 
  },
  primary: { 
    DEFAULT: '#16A34A' 
  },
  secondary: { 
    DEFAULT: '#0EA5E9' 
  },
  accent: { 
    DEFAULT: '#6366F1' 
  },
  border: { 
    light: '#E2E8F0' 
  },
  shadow: { 
    DEFAULT: 'rgba(0,0,0,0.12)' 
  }
} as const;

export const Typography = {
  sizes: { 
    xs: 12, 
    sm: 14, 
    base: 16, 
    md: 18, 
    lg: 20, 
    xl: 24 
  }
} as const;

export const Spacing = {
  xs: 4, 
  sm: 8, 
  md: 12, 
  lg: 16, 
  xl: 20, 
  '2xl': 24
} as const;

export const BorderRadius = {
  sm: 6, 
  md: 10, 
  lg: 14
} as const;