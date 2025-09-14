/**
 * 🧪 Design Token Test Component
 * Tests that all design tokens are accessible and work properly
 * Prevents "Cannot read property 'lg' of undefined" errors
 */

import React from 'react'
import { View, Text, StyleSheet, ScrollView } from 'react-native'
import { Colors, Spacing, Typography, BorderRadius, Shadows } from '@/constants/Colors'
import { getSpacing, getTypography, getBorderRadius, checkTokenHealth } from '@/constants/TokenHelpers'

export const DesignTokenTest: React.FC = () => {
  // Run token health check
  React.useEffect(() => {
    if (__DEV__) {
      checkTokenHealth()
    }
  }, [])

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>🎨 Design Token Test</Text>
      
      {/* Spacing Test */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Spacing Tokens</Text>
        <View style={[styles.spacingBox, { padding: Spacing.xs }]}>
          <Text>XS: {Spacing.xs}px</Text>
        </View>
        <View style={[styles.spacingBox, { padding: Spacing.sm }]}>
          <Text>SM: {Spacing.sm}px</Text>
        </View>
        <View style={[styles.spacingBox, { padding: Spacing.md }]}>
          <Text>MD: {Spacing.md}px</Text>
        </View>
        <View style={[styles.spacingBox, { padding: Spacing.lg }]}>
          <Text>LG: {Spacing.lg}px</Text>
        </View>
        <View style={[styles.spacingBox, { padding: Spacing.xl }]}>
          <Text>XL: {Spacing.xl}px</Text>
        </View>
      </View>

      {/* Typography Test */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Typography Tokens</Text>
        <Text style={{ fontSize: Typography.xs }}>XS: {Typography.xs}px</Text>
        <Text style={{ fontSize: Typography.sm }}>SM: {Typography.sm}px</Text>
        <Text style={{ fontSize: Typography.base }}>Base: {Typography.base}px</Text>
        <Text style={{ fontSize: Typography.lg }}>LG: {Typography.lg}px</Text>
        <Text style={{ fontSize: Typography.xl }}>XL: {Typography.xl}px</Text>
        <Text style={{ fontSize: Typography['2xl'] }}>2XL: {Typography['2xl']}px</Text>
      </View>

      {/* Border Radius Test */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Border Radius Tokens</Text>
        <View style={[styles.radiusBox, { borderRadius: BorderRadius.none }]}>
          <Text>None: {BorderRadius.none}px</Text>
        </View>
        <View style={[styles.radiusBox, { borderRadius: BorderRadius.sm }]}>
          <Text>SM: {BorderRadius.sm}px</Text>
        </View>
        <View style={[styles.radiusBox, { borderRadius: BorderRadius.md }]}>
          <Text>MD: {BorderRadius.md}px</Text>
        </View>
        <View style={[styles.radiusBox, { borderRadius: BorderRadius.lg }]}>
          <Text>LG: {BorderRadius.lg}px</Text>
        </View>
      </View>

      {/* Safe Helper Test */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Safe Helpers Test</Text>
        <View style={[styles.helperBox, { padding: getSpacing('lg') }]}>
          <Text style={{ fontSize: getTypography('base') }}>
            Safe helpers working! Padding: {getSpacing('lg')}px, Font: {getTypography('base')}px
          </Text>
        </View>
        <View style={[styles.helperBox, { 
          borderRadius: getBorderRadius('md'),
          padding: getSpacing('md', 20) // With fallback
        }]}>
          <Text>With fallback protection</Text>
        </View>
      </View>

      {/* Color Test */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Color Tokens</Text>
        <View style={[styles.colorBox, { backgroundColor: Colors.primary }]}>
          <Text style={{ color: '#fff' }}>Primary Color</Text>
        </View>
        <View style={[styles.colorBox, { backgroundColor: Colors.surface }]}>
          <Text style={{ color: Colors.text }}>Surface Color</Text>
        </View>
        <View style={[styles.colorBox, { backgroundColor: Colors.accent.DEFAULT }]}>
          <Text style={{ color: '#fff' }}>Accent Color</Text>
        </View>
      </View>

      <Text style={styles.success}>✅ All design tokens loaded successfully!</Text>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: Spacing.md,
    backgroundColor: Colors.background,
  },
  title: {
    fontSize: Typography['2xl'],
    fontWeight: Typography.weights.bold,
    marginBottom: Spacing.lg,
    textAlign: 'center',
    color: Colors.text,
  },
  section: {
    marginBottom: Spacing.lg,
    padding: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    ...Shadows.sm,
  },
  sectionTitle: {
    fontSize: Typography.lg,
    fontWeight: Typography.weights.semibold,
    marginBottom: Spacing.sm,
    color: Colors.text,
  },
  spacingBox: {
    backgroundColor: Colors.accent[100],
    marginBottom: Spacing.xs,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
  },
  radiusBox: {
    backgroundColor: Colors.accent[100],
    padding: Spacing.md,
    marginBottom: Spacing.xs,
    alignItems: 'center',
  },
  helperBox: {
    backgroundColor: Colors.accent[50],
    marginBottom: Spacing.sm,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
  },
  colorBox: {
    padding: Spacing.md,
    marginBottom: Spacing.xs,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
  },
  success: {
    fontSize: Typography.lg,
    fontWeight: Typography.weights.semibold,
    textAlign: 'center',
    color: Colors.accent.DEFAULT,
    backgroundColor: Colors.accent[50],
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.lg,
  },
})

export default DesignTokenTest