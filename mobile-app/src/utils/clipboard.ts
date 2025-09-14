/**
 * 📋 Clipboard Utility - Expo対応クリップボードラッパー
 * 
 * Features:
 * - Expo Go対応（expo-clipboard使用）
 * - 将来のDev Build対応準備済み
 * - エラーハンドリング内蔵
 * - TypeScript完全対応
 */

import { Platform } from 'react-native';
import * as ExpoClipboard from 'expo-clipboard';

/**
 * テキストをクリップボードにコピー
 * @param text - コピーするテキスト
 * @returns Promise<boolean> - 成功時true、失敗時false
 */
export async function copyText(text: string): Promise<boolean> {
  if (!text || typeof text !== 'string') {
    console.warn('copyText: 無効なテキストです', text);
    return false;
  }

  try {
    // Expo Clipboard使用（Expo Go対応）
    await ExpoClipboard.setStringAsync(text);
    console.log('📋 クリップボードにコピー成功:', text.substring(0, 20) + '...');
    return true;
  } catch (error) {
    console.error('📋 クリップボードコピーエラー:', error);
    return false;
  }
}

/**
 * クリップボードからテキストを取得
 * @returns Promise<string> - クリップボードのテキスト、失敗時は空文字
 */
export async function pasteText(): Promise<string> {
  try {
    const text = await ExpoClipboard.getStringAsync();
    console.log('📋 クリップボードから取得成功:', text ? text.substring(0, 20) + '...' : '(空)');
    return text || '';
  } catch (error) {
    console.error('📋 クリップボード取得エラー:', error);
    return '';
  }
}

/**
 * クリップボードにテキストが存在するかチェック
 * @returns Promise<boolean> - テキスト存在時true
 */
export async function hasText(): Promise<boolean> {
  try {
    const hasString = await ExpoClipboard.hasStringAsync();
    console.log('📋 クリップボードテキスト存在チェック:', hasString);
    return hasString;
  } catch (error) {
    console.error('📋 クリップボード存在チェックエラー:', error);
    return false;
  }
}

/**
 * クリップボードをクリア（デバッグ用）
 * @returns Promise<boolean> - 成功時true
 */
export async function clearClipboard(): Promise<boolean> {
  try {
    await ExpoClipboard.setStringAsync('');
    console.log('📋 クリップボードクリア成功');
    return true;
  } catch (error) {
    console.error('📋 クリップボードクリアエラー:', error);
    return false;
  }
}

/**
 * 将来のDev Build対応用の設定
 * 現在はExpo Clipboardのみ使用
 */
export const ClipboardConfig = {
  preferNativeModule: false, // 将来のDev Build時にtrueに変更
  platform: Platform.OS,
  implementation: 'expo-clipboard' as const,
} as const;