// dev-blocks: UI block playground (dependencies not yet wired in this branch)
// Real implementation lives in src/ui/blocks — import path @/ui/blocks resolves to
// mobile-app/ui/blocks which does not exist until src/ is merged.
// Replaced with stub to prevent Bundling failed on Expo Go startup.
import React from 'react'
import { View, Text, StyleSheet } from 'react-native'

export default function BlockDemoScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>dev-blocks: stub (src/ui not wired)</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#111827' },
  text: { color: '#6B7280', fontSize: 14 },
})
