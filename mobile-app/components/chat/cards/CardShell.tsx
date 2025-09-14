import React from 'react'
import { View, StyleSheet, ViewStyle } from 'react-native'

interface CardShellProps {
  children: React.ReactNode
  style?: ViewStyle | ViewStyle[]
}

export default function CardShell({ children, style }: CardShellProps) {
  return <View style={[styles.card, style as any]}>{children}</View>
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: '#161A22',
    padding: 16,
  },
})

