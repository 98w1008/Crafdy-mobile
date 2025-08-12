import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import { StyleSheet, View } from 'react-native';
import { Colors } from '@/design/tokens';

export default function CrafdyTabBarBackground() {
  return (
    <View style={[StyleSheet.absoluteFill, styles.background]}>
      {/* ライトモード対応BlurView */}
      <BlurView
        tint="light"
        intensity={95}
        style={[StyleSheet.absoluteFill, { backgroundColor: (Colors.base?.surface ?? '#F7F8FA') + 'F5' }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  background: {
    backgroundColor: (Colors.base?.surface ?? '#F7F8FA'),
    // ライトモード対応のボーダー
    borderTopWidth: 1,
    borderTopColor: (Colors.border?.light ?? '#E2E8F0'),
    // iOS特有のshadow効果（ライト調整）
    shadowColor: (Colors.shadow?.DEFAULT ?? 'rgba(0,0,0,0.12)'),
    shadowOffset: { width: 0, height: -1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
  },
});

export function useBottomTabOverflow() {
  return useBottomTabBarHeight();
}
