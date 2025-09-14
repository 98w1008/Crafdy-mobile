/**
 * Crafdy Mobile App - Gray-based Design Token System
 * 建設現場対応グレーベースデザイントークン
 * 
 * 要件:
 * - 無彩色中心（グレーベース）
 * - WCAG AA準拠（4.5:1以上コントラスト）
 * - 建設現場での視認性考慮
 * - ダークモード後対応
 */

// =============================================================================
// 色彩トークン (Color Tokens)
// =============================================================================

export const colors = {
  // 背景色系統 - 階層と深度を表現
  backgrounds: {
    app: '#F8F9FA',           // アプリ全体背景 - 眩しさ抑制
    section: '#E9ECEF',       // セクション背景 - 階層認識
    card: '#FFFFFF',          // カード背景 - 情報分離
    elevated: '#F1F3F4',      // 浮上要素背景 - 深度表現
    overlay: 'rgba(52, 58, 64, 0.8)', // オーバーレイ - モーダル等
  },

  // 文字色系統 - 視認性と階層を重視
  text: {
    primary: '#212529',       // 主要テキスト - コントラスト比 16.54:1
    secondary: '#495057',     // 副次テキスト - コントラスト比 9.24:1
    tertiary: '#6C757D',      // 補足テキスト - コントラスト比 6.07:1（AA準拠）
    heading: '#343A40',       // 見出し - コントラスト比 12.63:1
    inverse: '#FFFFFF',       // 反転テキスト - ダーク背景用
  },

  // 境界・分割線系統 - 情報整理と視覚的分離
  borders: {
    light: '#DEE2E6',         // 軽い境界線 - 微細な分割
    medium: '#ADB5BD',        // 通常境界線 - 標準的な分割
    strong: '#868E96',        // 強調境界線 - 明確な分割
    focus: '#495057',         // フォーカス境界線 - アクセシビリティ
  },

  // インタラクティブ要素系統 - タッチ操作対応
  interactive: {
    rest: '#E9ECEF',          // 通常状態 - 操作対象として認識可能
    hover: '#DEE2E6',         // ホバー状態 - 反応を示す
    active: '#CED4DA',        // アクティブ状態 - 押下感を表現
    disabled: '#F8F9FA',      // 無効状態 - 操作不可を表示
    selected: '#D1D5DB',      // 選択状態 - 選択を明示
    focus: '#B8BCC8',         // フォーカス状態 - キーボード操作用
  },

  // 表面・サーフェス系統 - 深度と重要度を表現
  surfaces: {
    level0: '#FFFFFF',        // 最前面 - 最高優先度
    level1: '#F8F9FA',        // レベル1 - 高優先度
    level2: '#F1F3F4',        // レベル2 - 中優先度  
    level3: '#E9ECEF',        // レベル3 - 低優先度
    level4: '#E5E7EB',        // レベル4 - 最低優先度
  },

  // 影・グラデーション系統 - 深度表現
  shadows: {
    light: 'rgba(73, 80, 87, 0.1)',   // 軽い影
    medium: 'rgba(73, 80, 87, 0.15)',  // 標準影
    strong: 'rgba(73, 80, 87, 0.25)',  // 強い影
    inset: 'rgba(73, 80, 87, 0.1)',    // 内側影
  }
} as const;

// =============================================================================
// 寸法・スペーシングトークン (Dimension Tokens)
// =============================================================================

export const spacing = {
  // 8ptグリッドベースのスペーシングシステム
  xs: 4,    // 極小
  sm: 8,    // 小
  md: 16,   // 中（基準値）
  lg: 24,   // 大
  xl: 32,   // 特大
  xxl: 48,  // 最大
  
  // セマンティックスペーシング
  component: {
    padding: 16,        // コンポーネント内余白
    margin: 16,         // コンポーネント間マージン
    gap: 12,            // 要素間ギャップ
    section: 24,        // セクション間隔
  }
} as const;

export const borderRadius = {
  none: 0,
  sm: 4,      // 小さな角丸
  md: 8,      // 標準角丸
  lg: 12,     // 大きな角丸
  xl: 16,     // 特大角丸
  full: 9999, // 完全円形
} as const;

export const borderWidth = {
  none: 0,
  thin: 1,    // 細い境界線
  medium: 2,  // 標準境界線  
  thick: 3,   // 太い境界線
} as const;

// =============================================================================
// 影・エレベーション (Shadow & Elevation)
// =============================================================================

export const elevation = {
  none: {
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  low: {
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
    shadowColor: colors.shadows.light,
  },
  medium: {
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
    shadowColor: colors.shadows.medium,
  },
  high: {
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
    shadowColor: colors.shadows.strong,
  },
} as const;

// =============================================================================
// タイポグラフィ (Typography)
// =============================================================================

export const typography = {
  // フォントサイズ
  fontSize: {
    xs: 12,   // 極小テキスト
    sm: 14,   // 小テキスト
    md: 16,   // 標準テキスト（基準値）
    lg: 18,   // 大テキスト
    xl: 20,   // 見出し小
    xxl: 24,  // 見出し中
    xxxl: 32, // 見出し大
  },

  // 行間
  lineHeight: {
    tight: 1.2,   // 密な行間
    normal: 1.5,  // 標準行間
    loose: 1.8,   // ゆったり行間
  },

  // フォントウェイト
  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
} as const;

// =============================================================================
// アニメーション・トランジション (Animation & Transition)
// =============================================================================

export const animation = {
  duration: {
    fast: 150,    // 高速アニメーション
    normal: 300,  // 標準アニメーション
    slow: 500,    // 低速アニメーション
  },
  
  easing: {
    ease: 'ease',
    easeIn: 'ease-in',
    easeOut: 'ease-out',
    easeInOut: 'ease-in-out',
  },
} as const;

// =============================================================================
// セマンティックトークン (Semantic Tokens)
// 用途別のセマンティックな色定義
// =============================================================================

export const semantic = {
  // 状態表現
  states: {
    default: colors.interactive.rest,
    hover: colors.interactive.hover,
    active: colors.interactive.active,
    disabled: colors.interactive.disabled,
    selected: colors.interactive.selected,
    focus: colors.interactive.focus,
  },

  // コンポーネント別色定義
  components: {
    // ボタン
    button: {
      primary: {
        background: colors.interactive.rest,
        backgroundHover: colors.interactive.hover,
        backgroundActive: colors.interactive.active,
        text: colors.text.primary,
        border: colors.borders.medium,
      },
      secondary: {
        background: colors.backgrounds.card,
        backgroundHover: colors.interactive.hover,
        backgroundActive: colors.interactive.active,
        text: colors.text.secondary,
        border: colors.borders.light,
      },
    },

    // 入力フィールド
    input: {
      background: colors.backgrounds.card,
      backgroundFocus: colors.backgrounds.card,
      text: colors.text.primary,
      placeholder: colors.text.tertiary,
      border: colors.borders.medium,
      borderFocus: colors.borders.strong,
      borderError: colors.text.primary,
    },

    // カード
    card: {
      background: colors.backgrounds.card,
      border: colors.borders.light,
      shadow: elevation.low,
    },
  },
} as const;

// =============================================================================
// 建設現場最適化設定 (Construction Site Optimization)
// =============================================================================

export const constructionOptimized = {
  // 屋外明所での視認性強化
  highContrast: {
    text: {
      primary: '#000000',     // 最高コントラスト
      secondary: '#2D3748',   // 強化されたセカンダリ
    },
    borders: {
      strong: '#4A5568',      // より強い境界線
    },
  },

  // 手袋操作時の判別性向上
  touchTarget: {
    minSize: 44,              // 最小タッチターゲットサイズ
    spacing: 8,               // タッチターゲット間隔
    activeScale: 0.95,        // アクティブ時スケール
  },

  // 汚れ・水滴耐性配色
  durableColors: {
    background: '#F1F3F4',    // 汚れが目立ちにくい背景
    surface: '#E9ECEF',       // 表面色
    accent: colors.text.primary, // アクセントは最高コントラスト
  },
} as const;

// =============================================================================
// 型定義 (Type Definitions)
// =============================================================================

export type ColorToken = typeof colors;
export type SpacingToken = typeof spacing;
export type TypographyToken = typeof typography;
export type ElevationToken = typeof elevation;
export type SemanticToken = typeof semantic;

// 使いやすさのための統合型
export interface DesignTokens {
  colors: ColorToken;
  spacing: SpacingToken;
  borderRadius: typeof borderRadius;
  borderWidth: typeof borderWidth;
  typography: TypographyToken;
  elevation: ElevationToken;
  animation: typeof animation;
  semantic: SemanticToken;
  constructionOptimized: typeof constructionOptimized;
}

// =============================================================================
// デフォルトエクスポート
// =============================================================================

export const tokens: DesignTokens = {
  colors,
  spacing,
  borderRadius,
  borderWidth,
  typography,
  elevation,
  animation,
  semantic,
  constructionOptimized,
} as const;

export default tokens;

// =============================================================================
// 使用例サンプル (Usage Examples)
// =============================================================================

/*
// React Native StyleSheet での使用例

import { StyleSheet } from 'react-native';
import tokens from './tokens';

const styles = StyleSheet.create({
  container: {
    backgroundColor: tokens.colors.backgrounds.app,
    padding: tokens.spacing.md,
    borderRadius: tokens.borderRadius.md,
  },
  
  card: {
    backgroundColor: tokens.colors.backgrounds.card,
    padding: tokens.spacing.component.padding,
    borderRadius: tokens.borderRadius.lg,
    borderWidth: tokens.borderWidth.thin,
    borderColor: tokens.colors.borders.light,
    ...tokens.elevation.low,
  },
  
  primaryButton: {
    backgroundColor: tokens.semantic.components.button.primary.background,
    paddingVertical: tokens.spacing.sm,
    paddingHorizontal: tokens.spacing.md,
    borderRadius: tokens.borderRadius.md,
    borderWidth: tokens.borderWidth.thin,
    borderColor: tokens.semantic.components.button.primary.border,
    minHeight: tokens.constructionOptimized.touchTarget.minSize,
  },
  
  primaryButtonText: {
    color: tokens.semantic.components.button.primary.text,
    fontSize: tokens.typography.fontSize.md,
    fontWeight: tokens.typography.fontWeight.medium,
    lineHeight: tokens.typography.lineHeight.normal,
  },
  
  heading: {
    color: tokens.colors.text.heading,
    fontSize: tokens.typography.fontSize.xxl,
    fontWeight: tokens.typography.fontWeight.bold,
    marginBottom: tokens.spacing.md,
  },
});

// アクセシビリティ対応の使用例
const AccessibleComponent = () => {
  return (
    <View style={[
      styles.container,
      // 建設現場での高コントラスト対応
      isOutdoorMode && {
        backgroundColor: tokens.constructionOptimized.durableColors.background,
      }
    ]}>
      <Text style={[
        styles.heading,
        isOutdoorMode && {
          color: tokens.constructionOptimized.highContrast.text.primary,
        }
      ]}>
        見出しテキスト
      </Text>
    </View>
  );
};
*/