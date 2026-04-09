import React from 'react'
import { SafeAreaView, ScrollView, StyleSheet, View } from 'react-native'
import { useRouter } from 'expo-router'

import { Card, StyledButton, StyledText } from '@/components/ui'
import { Colors, Spacing } from '@/constants/Colors'

export default function MemberSetupScreen() {
  const router = useRouter()

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <StyledText variant="title" weight="bold">参加できました</StyledText>
          <StyledText variant="body" color="secondary" style={{ marginTop: 8 }}>
            まずは担当の現場を確認して、main-chat から日報・経費を入力します。
          </StyledText>
        </View>

        <Card>
          <StyledText variant="subtitle" weight="semibold">最初にやること</StyledText>
          <View style={{ marginTop: 10 }}>
            <StyledText variant="body">1. 担当現場を確認 / 選ぶ</StyledText>
            <StyledText variant="body">2. 日報を書く</StyledText>
            <StyledText variant="body">3. 経費を入れる</StyledText>
          </View>
        </Card>

        <View style={{ marginTop: Spacing.lg }}>
          <StyledButton
            label="担当現場を確認 / 選ぶ"
            onPress={() => router.push({ pathname: '/project-selector', params: { returnTo: '/member-setup' } } as any)}
          />
          <View style={{ height: 10 }} />
          <StyledButton
            variant="secondary"
            label="main-chat を開く"
            onPress={() => router.replace('/main-chat' as any)}
          />
        </View>

        <View style={{ marginTop: Spacing.lg }}>
          <StyledText variant="caption" color="secondary">
            ※ 会社情報・請求書テンプレなどの設定は代表向けです。
          </StyledText>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background },
  content: { padding: Spacing.lg, paddingBottom: Spacing['2xl'] },
  header: { marginTop: Spacing.md, marginBottom: Spacing.lg },
})
