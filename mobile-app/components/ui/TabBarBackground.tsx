import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Colors } from '@/constants/GrayDesignTokens';

// Android・Web向け新仕様タブバー背景
export default function CrafdyTabBarBackground() {
  return <View style={[StyleSheet.absoluteFill, styles.background]} />;
}

const styles = StyleSheet.create({
  background: {
    backgroundColor: (Colors.base?.surface ?? '#F7F8FA'),
    // ライトモード対応
    borderTopWidth: 1,
    borderTopColor: (Colors.border?.light ?? '#E2E8F0'),
    // Android向けelevation効果
    elevation: 8,
    shadowColor: (Colors.shadow?.DEFAULT ?? 'rgba(0,0,0,0.12)'),
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
});

export function useBottomTabOverflow() {
  return 0;
}
