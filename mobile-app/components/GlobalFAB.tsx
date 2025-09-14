/**
 * 🚀 統合GlobalFAB - 緑色FABMenuへの移行
 * 統一FABシステムへのリダイレクト
 * @deprecated GlobalFABMenuを直接使用してください
 */

import React from 'react'
import GlobalFABMenu from '@/components/chat/FabActions'

// =============================================================================
// TYPES
// =============================================================================

interface GlobalFABProps {
  /** 非表示にするか（特定の画面でFABを隠す場合） */
  hidden?: boolean
}

// =============================================================================
// MAIN COMPONENT - DEPRECATED
// =============================================================================

/**
 * @deprecated 
 * このコンポーネントは非推奨です。
 * 代わりに GlobalFABMenu を使用してください。
 * 統一FABシステムで6つの機能メニューが利用できます。
 */
export default function GlobalFAB({ hidden = false }: GlobalFABProps) {
  // 統一FABMenuにリダイレクト
  return <GlobalFABMenu hidden={hidden} />
}

