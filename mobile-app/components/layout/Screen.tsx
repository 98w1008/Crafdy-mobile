import React from 'react'
import { SafeAreaView, ViewStyle } from 'react-native'
import { useColors } from '@/theme/ThemeProvider'

type Props = {
  children: React.ReactNode
  style?: ViewStyle | ViewStyle[]
}

export default function Screen({ children, style }: Props) {
  const colors = useColors()
  return (
    <SafeAreaView style={[{ flex: 1, backgroundColor: colors.background.primary }, style] as any}>
      {children}
    </SafeAreaView>
  )
}

