/**
 * 🏡 Crafty Mobile - Greeting Card Hook
 * 「お疲れ様です○○さん」カードの表示制御
 * Instagram/X/ChatGPTスタイルの「最初だけ」表示システム
 */

import { useState, useEffect, useCallback } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'

// =============================================================================
// CONSTANTS
// =============================================================================

const STORAGE_KEY = 'greeting_hidden_until'
const HIDE_HOURS = 24
const SCROLL_THRESHOLD = 50 // 50px以上のスクロールで非表示

// =============================================================================
// TYPES
// =============================================================================

interface UseGreetingCardReturn {
  /** カードを表示するか */
  isVisible: boolean
  /** カードを非表示にする（ユーザー操作時に呼び出し） */
  hideCard: () => void
  /** フォーカス操作ハンドラ */
  onFocus: () => void
  /** テキスト入力操作ハンドラ（1文字以上で非表示） */
  onChangeText: (text: string) => void
  /** スクロール操作ハンドラ（50px以上で非表示） */
  onScroll: (event: { nativeEvent: { contentOffset: { y: number } } }) => void
  /** プレス操作ハンドラ */
  onPress: () => void
  /** 読み込み中状態 */
  isLoading: boolean
}

// =============================================================================
// HOOK
// =============================================================================

/**
 * 挨拶カードの表示制御フック
 * 
 * 機能:
 * - 初回表示（起動時のみ）
 * - ユーザー操作で即座に非表示
 * - 24時間後に再表示
 * - AsyncStorageでの永続化
 */
export function useGreetingCard(): UseGreetingCardReturn {
  const [isVisible, setIsVisible] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // 初期化: AsyncStorageから状態を読み込み
  useEffect(() => {
    checkVisibility()
  }, [])

  /**
   * 表示可否をチェック
   */
  const checkVisibility = useCallback(async () => {
    try {
      const hiddenUntilStr = await AsyncStorage.getItem(STORAGE_KEY)
      
      if (!hiddenUntilStr) {
        // 初回表示
        setIsVisible(true)
        setIsLoading(false)
        return
      }

      const hiddenUntil = new Date(hiddenUntilStr)
      const now = new Date()

      if (now >= hiddenUntil) {
        // 24時間経過、再表示
        setIsVisible(true)
        // 古いデータを削除
        await AsyncStorage.removeItem(STORAGE_KEY)
      } else {
        // まだ非表示期間中
        setIsVisible(false)
      }
    } catch (error) {
      console.warn('Failed to check greeting card visibility:', error)
      // エラー時はデフォルトで表示
      setIsVisible(true)
    } finally {
      setIsLoading(false)
    }
  }, [])

  /**
   * カードを非表示にする
   */
  const hideCard = useCallback(async () => {
    if (!isVisible) return

    try {
      const hideUntil = new Date()
      hideUntil.setHours(hideUntil.getHours() + HIDE_HOURS)
      
      await AsyncStorage.setItem(STORAGE_KEY, hideUntil.toISOString())
      setIsVisible(false)
    } catch (error) {
      console.warn('Failed to hide greeting card:', error)
    }
  }, [isVisible])

  /**
   * フォーカス操作ハンドラ
   */
  const onFocus = useCallback(() => {
    hideCard()
  }, [hideCard])

  /**
   * テキスト入力操作ハンドラ
   * 1文字以上入力で非表示
   */
  const onChangeText = useCallback((text: string) => {
    if (text.length >= 1) {
      hideCard()
    }
  }, [hideCard])

  /**
   * スクロール操作ハンドラ
   * 50px以上スクロールで非表示
   */
  const onScroll = useCallback((event: { nativeEvent: { contentOffset: { y: number } } }) => {
    const scrollY = event.nativeEvent.contentOffset.y
    if (Math.abs(scrollY) >= SCROLL_THRESHOLD) {
      hideCard()
    }
  }, [hideCard])

  /**
   * プレス操作ハンドラ
   */
  const onPress = useCallback(() => {
    hideCard()
  }, [hideCard])

  return {
    isVisible,
    hideCard,
    onFocus,
    onChangeText,
    onScroll,
    onPress,
    isLoading,
  }
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * デバッグ用: 挨拶カード状態をリセット
 */
export const resetGreetingCard = async () => {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY)
    console.log('Greeting card state reset')
  } catch (error) {
    console.warn('Failed to reset greeting card:', error)
  }
}

/**
 * デバッグ用: 次回表示時刻を確認
 */
export const getGreetingCardStatus = async () => {
  try {
    const hiddenUntilStr = await AsyncStorage.getItem(STORAGE_KEY)
    if (hiddenUntilStr) {
      const hiddenUntil = new Date(hiddenUntilStr)
      const now = new Date()
      const isHidden = now < hiddenUntil
      
      return {
        isHidden,
        hiddenUntil: hiddenUntil.toLocaleString(),
        timeRemaining: isHidden ? hiddenUntil.getTime() - now.getTime() : 0
      }
    }
    return { isHidden: false, hiddenUntil: null, timeRemaining: 0 }
  } catch (error) {
    console.warn('Failed to get greeting card status:', error)
    return { isHidden: false, hiddenUntil: null, timeRemaining: 0 }
  }
}