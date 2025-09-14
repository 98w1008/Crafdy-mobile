/**
 * 🧪 FAB統合テスト画面
 * 緑色FABメニューが正しく動作するかテスト
 */

import React from 'react'
import {
  View,
  StyleSheet,
  ScrollView,
  SafeAreaView,
} from 'react-native'
import { router } from 'expo-router'
import { useColors, useSpacing, useRadius } from '@/theme/ThemeProvider'
import { StyledText, StyledButton, Card } from '@/components/ui'
import GlobalFABMenu from '@/components/chat/FabActions'

export default function FABTestScreen() {
  const colors = useColors()
  const spacing = useSpacing()
  const radius = useRadius()

  const testItems = [
    {
      title: '日報作成テスト',
      description: 'FABの日報作成が動作するか確認',
      route: '/daily-report/new'
    },
    {
      title: '勤怠集計テスト',
      description: 'FABの勤怠集計が動作するか確認',
      route: '/attendance/summary'
    },
    {
      title: '見積作成テスト',
      description: 'FABの見積作成が動作するか確認',
      route: '/estimate/new'
    },
    {
      title: '請求書作成テスト',
      description: 'FABの請求書作成が動作するか確認',
      route: '/invoice/create'
    },
    {
      title: 'レシート撮影テスト',
      description: 'FABのレシート撮影が動作するか確認',
      route: '/receipt-scan'
    },
    {
      title: '現場切替テスト',
      description: 'FABの現場切替が動作するか確認',
      route: '/manage-leads'
    }
  ]

  const styles = createStyles(colors, spacing, radius)

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <StyledText variant="heading2" weight="bold">
            FAB統合テスト
          </StyledText>
          <StyledText variant="body" color="secondary">
            右下の緑色FABから各機能にアクセスできることを確認してください
          </StyledText>
        </View>

        <Card variant="elevated" style={styles.statusCard}>
          <StyledText variant="title" weight="semibold" color="success">
            ✅ FAB統合完了
          </StyledText>
          <StyledText variant="body" color="secondary" style={styles.statusDescription}>
            • 緑色FAB (#4CAF50系) に統一
            • 6つの主要機能すべて表示
            • 展開型メニューで操作性向上
            • 全画面共通で統一表示
          </StyledText>
        </Card>

        <View style={styles.testList}>
          <StyledText variant="title" weight="semibold" style={styles.sectionTitle}>
            機能テスト項目
          </StyledText>
          
          {testItems.map((item, index) => (
            <Card key={index} variant="outlined" style={styles.testCard}>
              <View style={styles.testCardContent}>
                <View style={styles.testCardInfo}>
                  <StyledText variant="subtitle" weight="semibold">
                    {item.title}
                  </StyledText>
                  <StyledText variant="body" color="secondary">
                    {item.description}
                  </StyledText>
                </View>
                <StyledButton
                  title="直接移動"
                  variant="outline"
                  size="sm"
                  onPress={() => router.push(item.route)}
                />
              </View>
            </Card>
          ))}
        </View>

        <Card variant="filled" style={styles.instructionCard}>
          <StyledText variant="title" weight="semibold" color="onPrimary">
            📋 テスト手順
          </StyledText>
          <StyledText variant="body" color="onPrimary" style={styles.instructionText}>
            1. 右下の緑色FABをタップ{'\n'}
            2. メニューが展開されることを確認{'\n'}
            3. 各項目をタップして遷移を確認{'\n'}
            4. 背景タップでメニューが閉じることを確認{'\n'}
            5. 各画面でも同じFABが表示されることを確認
          </StyledText>
        </Card>
      </ScrollView>
      
      {/* 統一グローバルFAB */}
      <GlobalFABMenu currentRoute="/fab-test" />
    </SafeAreaView>
  )
}

const createStyles = (colors: any, spacing: any, radius: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing[4],
    paddingBottom: spacing[12], // FAB分の余白確保
  },
  header: {
    marginBottom: spacing[6],
  },
  statusCard: {
    marginBottom: spacing[6],
    backgroundColor: colors.success.light || colors.surface,
    borderLeftWidth: 4,
    borderLeftColor: colors.success.DEFAULT,
  },
  statusDescription: {
    marginTop: spacing[2],
  },
  testList: {
    marginBottom: spacing[6],
  },
  sectionTitle: {
    marginBottom: spacing[4],
  },
  testCard: {
    marginBottom: spacing[3],
  },
  testCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  testCardInfo: {
    flex: 1,
    marginRight: spacing[3],
  },
  instructionCard: {
    backgroundColor: colors.primary.DEFAULT,
  },
  instructionText: {
    marginTop: spacing[3],
    lineHeight: 22,
  },
})