/**
 * 📋 Clipboard Test Component
 * クリップボード機能のテスト用コンポーネント（開発用）
 */

import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { copyText, pasteText, hasText, clearClipboard } from '@/src/utils/clipboard';

// StyledTextとStyledButtonがない場合の代替
import { Text as StyledText, TouchableOpacity } from 'react-native';

const ClipboardTestButton: React.FC<{ title: string; onPress: () => void; style?: any }> = ({ 
  title, 
  onPress, 
  style = {} 
}) => (
  <TouchableOpacity 
    style={[styles.button, style]} 
    onPress={onPress}
    activeOpacity={0.7}
  >
    <StyledText style={styles.buttonText}>{title}</StyledText>
  </TouchableOpacity>
);

export const ClipboardTest: React.FC = () => {
  const [lastResult, setLastResult] = useState<string>('');
  const [testText] = useState('CRAFDY-TEST-' + Date.now());

  const showResult = (message: string, success = true) => {
    setLastResult(message);
    Alert.alert(success ? '✅ 成功' : '❌ 失敗', message);
  };

  const testCopy = async () => {
    console.log('📋 クリップボードコピーテスト開始');
    try {
      const success = await copyText(testText);
      if (success) {
        showResult(`テキストをコピーしました: ${testText}`);
      } else {
        showResult('コピーに失敗しました', false);
      }
    } catch (error) {
      console.error('コピーテストエラー:', error);
      showResult(`エラー: ${error}`, false);
    }
  };

  const testPaste = async () => {
    console.log('📋 クリップボードペーストテスト開始');
    try {
      const text = await pasteText();
      showResult(`クリップボードの内容: "${text}"`);
    } catch (error) {
      console.error('ペーストテストエラー:', error);
      showResult(`エラー: ${error}`, false);
    }
  };

  const testHasText = async () => {
    console.log('📋 クリップボード存在チェックテスト開始');
    try {
      const exists = await hasText();
      showResult(`テキスト存在: ${exists ? 'あり' : 'なし'}`);
    } catch (error) {
      console.error('存在チェックテストエラー:', error);
      showResult(`エラー: ${error}`, false);
    }
  };

  const testClear = async () => {
    console.log('📋 クリップボードクリアテスト開始');
    try {
      const success = await clearClipboard();
      if (success) {
        showResult('クリップボードをクリアしました');
      } else {
        showResult('クリアに失敗しました', false);
      }
    } catch (error) {
      console.error('クリアテストエラー:', error);
      showResult(`エラー: ${error}`, false);
    }
  };

  return (
    <View style={styles.container}>
      <StyledText style={styles.title}>📋 クリップボードテスト</StyledText>
      <StyledText style={styles.subtitle}>テスト文字: {testText}</StyledText>
      
      <ClipboardTestButton title="📝 コピーテスト" onPress={testCopy} />
      <ClipboardTestButton title="📄 ペーストテスト" onPress={testPaste} />
      <ClipboardTestButton title="🔍 存在チェックテスト" onPress={testHasText} />
      <ClipboardTestButton title="🗑️ クリアテスト" onPress={testClear} />
      
      {lastResult ? (
        <View style={styles.result}>
          <StyledText style={styles.resultText}>{lastResult}</StyledText>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    margin: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#16A34A',
    padding: 12,
    borderRadius: 6,
    marginBottom: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
  },
  result: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#e5f7ea',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#16A34A',
  },
  resultText: {
    fontSize: 12,
    color: '#0f5132',
  },
});