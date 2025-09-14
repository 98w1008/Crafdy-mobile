import React from 'react'
import { Text, TextStyle } from 'react-native'
import { Colors } from '@/constants/Colors'

export interface IconProps {
  name: string
  size?: number
  color?: keyof typeof Colors | string
  style?: TextStyle
  /** タップ可能にするか */
  onPress?: () => void
  /** アクセシビリティラベル */
  accessibilityLabel?: string
}

// シンプルなアイコンマッピング（テキストベース）
const ICON_MAP: Record<string, string> = {
  // 基本アイコン
  'plus': '+',
  'minus': '−',
  'check': '✓',
  'x': '×',
  'close': '×',
  'arrow-left': '←',
  'arrow-right': '→',
  'arrow-up': '↑',
  'arrow-down': '↓',
  'chevron-down': '⌄',
  'chevron-right': '›',
  'chevron-left': '‹',
  
  // ビジネス・業務
  'yen': '¥',
  'chart': '□',
  'chart-line': '📈',
  'trending-up': '↗',
  'trending-down': '↘',
  'bell': '🔔',
  'users': '👥',
  'user': '👤',
  'calculator': '🧮',
  
  // ファイル・ドキュメント
  'file': '📄',
  'file-document': '📄',
  'file-invoice': '🧾',
  'folder': '📁',
  'clipboard': '📋',
  'clipboard-text': '📋',
  'document': '📄',
  'note-edit': '📝',
  'note-plus': '📝',
  
  // コミュニケーション
  'message': '💬',
  'message-text': '💬',
  'mail': '✉️',
  'phone': '📞',
  'send': '📤',
  
  // アクション
  'search': '🔍',
  'filter': '🔽',
  'edit': '✏️',
  'trash': '🗑️',
  'download': '⬇️',
  'upload': '⬆️',
  'hand-wave': '👋',
  
  // 場所・地図
  'map-marker': '📍',
  'map-marker-multiple': '📍',
  'home': '🏠',
  
  // 時間・カレンダー
  'calendar-check': '📅',
  'calendar-clock': '🕐',
  'clock': '🕐',
  
  // 撮影・画像
  'camera': '📷',
  'receipt': '🧾',
  'credit-card': '💳',
  
  // 建設業界
  'construct': '🚧',
  'shield': '🛡️',
  'box': '📦',
  'plus-box': '📦',
  'package-variant': '📦',
  'zap': '⚡',
  'lightning-bolt': '⚡',
  
  // UI・設定
  'settings': '⚙️',
  'cog': '⚙️',
  'info': 'ℹ️',
  'help': '❓',
  'help-circle': '❓',
  'star': '⭐',
  'heart': '❤️',
}

export default function Icon({ 
  name, 
  size = 16, 
  color = 'textPrimary', 
  style,
  onPress,
  accessibilityLabel 
}: IconProps) {
  const iconChar = ICON_MAP[name] || '○'
  
  const resolvedColor = typeof color === 'string' && color in Colors 
    ? Colors[color as keyof typeof Colors] 
    : color

  const iconComponent = (
    <Text
      style={[
        {
          fontSize: size,
          color: resolvedColor,
          fontWeight: '500',
          textAlign: 'center',
          lineHeight: size * 1.2,
        },
        style,
      ]}
    >
      {iconChar}
    </Text>
  )

  // タップ可能な場合はTouchableOpacityでラップ
  if (onPress) {
    const { TouchableOpacity } = require('react-native')
    return (
      <TouchableOpacity 
        onPress={onPress}
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="button"
        style={{ padding: 4 }}
      >
        {iconComponent}
      </TouchableOpacity>
    )
  }

  return iconComponent
}