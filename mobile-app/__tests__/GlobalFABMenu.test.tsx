/**
 * 🧪 GlobalFABMenu 統合テスト
 * 緑色FABの動作とメニュー項目を検証
 */

import React from 'react'
import { render, fireEvent, waitFor } from '@testing-library/react-native'
import { router } from 'expo-router'
import GlobalFABMenu from '@/components/chat/FabActions'

// Expo Routerのモック
jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
  },
}))

// Theme Providerのモック
jest.mock('@/theme/ThemeProvider', () => ({
  useColors: () => ({
    surface: '#FFFFFF',
    primary: { DEFAULT: '#16A34A' },
    success: '#16A34A',
    successLight: '#F0FDF4',
  }),
  useSpacing: () => ({
    2: 8,
    3: 12,
    4: 16,
    6: 24,
  }),
  useRadius: () => ({
    lg: 12,
    xl: 16,
    full: 9999,
  }),
}))

// Expo Hapticsのモック
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: {
    Light: 'light',
    Medium: 'medium',
  },
}))

describe('GlobalFABMenu', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('メインFABが正しく表示される', () => {
    const { getByLabelText } = render(<GlobalFABMenu />)
    
    const fabButton = getByLabelText('アクションメニューを開く')
    expect(fabButton).toBeTruthy()
  })

  it('FABタップでメニューが展開される', async () => {
    const { getByLabelText, getByText } = render(<GlobalFABMenu />)
    
    const fabButton = getByLabelText('アクションメニューを開く')
    fireEvent.press(fabButton)

    await waitFor(() => {
      // 6つの必須メニュー項目が表示されることを確認
      expect(getByText('日報作成')).toBeTruthy()
      expect(getByText('勤怠集計')).toBeTruthy()
      expect(getByText('見積作成')).toBeTruthy()
      expect(getByText('請求書作成')).toBeTruthy()
      expect(getByText('レシート・搬入撮影')).toBeTruthy()
      expect(getByText('新規現場登録')).toBeTruthy()
    })
  })

  it('日報作成メニューから正しいルートに遷移する', async () => {
    const { getByLabelText, getByText } = render(<GlobalFABMenu />)
    
    // メニューを展開
    const fabButton = getByLabelText('アクションメニューを開く')
    fireEvent.press(fabButton)

    await waitFor(() => {
      const dailyReportButton = getByText('日報作成')
      fireEvent.press(dailyReportButton)
    })

    expect(router.push).toHaveBeenCalledWith('/daily-report/new')
  })

  it('レシート撮影メニューから正しいルートに遷移する', async () => {
    const { getByLabelText, getByText } = render(<GlobalFABMenu />)
    
    const fabButton = getByLabelText('アクションメニューを開く')
    fireEvent.press(fabButton)

    await waitFor(() => {
      const receiptButton = getByText('レシート・搬入撮影')
      fireEvent.press(receiptButton)
    })

    expect(router.push).toHaveBeenCalledWith('/receipt-scan')
  })

  it('新規現場登録から正しいルートに遷移する', async () => {
    const { getByLabelText, getByText } = render(<GlobalFABMenu />)
    const fabButton = getByLabelText('アクションメニューを開く')
    fireEvent.press(fabButton)
    await waitFor(() => {
      const siteNewButton = getByText('新規現場登録')
      fireEvent.press(siteNewButton)
    })
    expect(router.push).toHaveBeenCalledWith('/new-project')
  })

  // 現場切替は固定メニューから除外（新規現場登録に統合）

  it('hidden propでFABが非表示になる', () => {
    const { queryByLabelText } = render(
      <GlobalFABMenu hidden={true} />
    )
    
    const fabButton = queryByLabelText('アクションメニューを開く')
    expect(fabButton).toBeNull()
  })

  it('アクセシビリティラベルが正しく設定されている', () => {
    const { getByLabelText } = render(<GlobalFABMenu />)
    
    const fabButton = getByLabelText('アクションメニューを開く')
    expect(fabButton).toBeTruthy()
    expect(fabButton.props.accessibilityRole).toBe('button')
  })

  it('メニュー展開時にアクセシビリティラベルが変更される', async () => {
    const { getByLabelText } = render(<GlobalFABMenu />)
    
    const fabButton = getByLabelText('アクションメニューを開く')
    fireEvent.press(fabButton)

    await waitFor(() => {
      const closeButton = getByLabelText('アクションメニューを閉じる')
      expect(closeButton).toBeTruthy()
    })
  })
})
