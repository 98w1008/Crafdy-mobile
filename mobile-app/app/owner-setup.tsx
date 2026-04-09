import React from 'react'
import { SafeAreaView, ScrollView, StyleSheet, View } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'

import { Card, StyledButton, StyledText } from '@/components/ui'
import { Colors, Spacing } from '@/constants/Colors'

export default function OwnerSetupScreen() {
  const router = useRouter()
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>()

  const toMain = String(returnTo || '').trim() || '/main-chat'

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <StyledText variant="title" weight="bold">はじめにやること</StyledText>
          <StyledText variant="body" color="secondary" style={{ marginTop: 8 }}>
            代表・親方として、まずはこの順で進めるとスムーズです。
          </StyledText>
        </View>

        <Card>
          <StyledText variant="subtitle" weight="semibold">最初の3ステップ</StyledText>
          <View style={{ marginTop: 10 }}>
            <StyledText variant="body">1. 会社情報を設定</StyledText>
            <StyledText variant="body">2. 現場を作る / 選ぶ</StyledText>
            <StyledText variant="body">3. main-chat で日報・経費などを入力</StyledText>
          </View>
        </Card>

        <View style={{ marginTop: Spacing.lg }}>
          <StyledButton
            label="会社情報を設定"
            onPress={() => router.push({ pathname: '/company-billing-profile', params: { returnTo: '/owner-setup' } } as any)}
          />
          <View style={{ height: 10 }} />
          <StyledButton
            variant="secondary"
            label="現場を作る / 選ぶ"
            onPress={() => router.push({ pathname: '/project-selector', params: { returnTo: '/owner-setup' } } as any)}
          />
          <View style={{ height: 10 }} />
          <StyledButton
            variant="ghost"
            label="main-chat を使い始める"
            onPress={() => router.replace(toMain as any)}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  content: {
    padding: Spacing.lg,
    paddingBottom: Spacing['2xl'],
  },
  header: {
    marginTop: Spacing.md,
    marginBottom: Spacing.lg,
  },
})
