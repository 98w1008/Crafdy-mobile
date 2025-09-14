/**
 * 見積管理画面 - Task 6統合版
 * 統合アップロード・AI自動判別対応の見積作成機能を統合
 */

import React, { useEffect, useState } from 'react'
import { View, ScrollView, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native'
import { router } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { EstimateNavigationHub } from '@/components/EstimateNavigationHub'
import { StyledText, Card } from '@/components/ui'
import { useColors, useSpacing } from '@/theme/ThemeProvider'

export default function EstimatesScreen() {
  const [estimates, setEstimates] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const colors = useColors()
  const spacing = useSpacing()

  useEffect(() => {
    fetchEstimates()
  }, [])

  const fetchEstimates = async () => {
    try {
      const { data, error } = await supabase
        .from('estimates')
        .select(`
          *,
          projects (
            name
          )
        `)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching estimates:', error)
      } else {
        setEstimates(data || [])
      }
    } catch (error) {
      console.error('Fetch error:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return '#10b981'
      case 'pending':
        return '#f59e0b'
      case 'rejected':
        return '#ef4444'
      default:
        return '#6b7280'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'approved':
        return '承認済み'
      case 'pending':
        return '承認待ち'
      case 'rejected':
        return '却下'
      default:
        return '下書き'
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <StyledText variant="body">読み込み中...</StyledText>
        </View>
      </SafeAreaView>
    )
  }

  const styles = createStyles(colors, spacing)

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Task 6: 統合見積作成ナビゲーション */}
        <EstimateNavigationHub 
          onOptionSelect={(optionId) => {
            console.log('選択されたオプション:', optionId)
          }}
          showRecentProjects={estimates.length > 0}
        />
        
        {/* 統計カード */}
        {estimates.length > 0 && (
          <Card style={styles.statsCard}>
            <StyledText variant="subtitle" weight="semibold" style={styles.statsTitle}>
              📊 見積統計
            </StyledText>
            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <StyledText variant="title" weight="bold" color="primary">
                  {estimates.length}
                </StyledText>
                <StyledText variant="caption" color="secondary">総見積数</StyledText>
              </View>
              <View style={styles.statItem}>
                <StyledText variant="title" weight="bold" color="success">
                  {estimates.filter(e => e.status === 'approved').length}
                </StyledText>
                <StyledText variant="caption" color="secondary">承認済み</StyledText>
              </View>
              <View style={styles.statItem}>
                <StyledText variant="body" weight="bold" color="primary">
                  ¥{estimates
                    .filter(e => e.status === 'approved')
                    .reduce((sum, e) => sum + (e.total_amount || 0), 0)
                    .toLocaleString()}
                </StyledText>
                <StyledText variant="caption" color="secondary">承認金額</StyledText>
              </View>
            </View>
          </Card>
        )}

        {/* 最近の見積一覧 */}
        {estimates.length > 0 && (
          <Card style={styles.recentEstimatesCard}>
            <View style={styles.recentHeader}>
              <StyledText variant="subtitle" weight="semibold">
                🗓️ 最近の見積
              </StyledText>
              <TouchableOpacity onPress={() => router.push('/estimates/history')}>
                <StyledText variant="body" color="primary">
                  すべて表示 →
                </StyledText>
              </TouchableOpacity>
            </View>
            <View style={styles.estimateList}>
              {estimates.slice(0, 5).map((estimate) => (
                <TouchableOpacity 
                  key={estimate.id} 
                  style={styles.estimateItem}
                  onPress={() => console.log(`見積 ${estimate.id} の詳細表示機能は開発中です`)}
                >
                  <View style={styles.estimateInfo}>
                    <StyledText variant="body" weight="medium" numberOfLines={1}>
                      {estimate.title}
                    </StyledText>
                    <StyledText variant="caption" color="secondary">
                      {estimate.projects?.name || '未分類'} • {new Date(estimate.created_at).toLocaleDateString('ja-JP')}
                    </StyledText>
                  </View>
                  <View style={styles.estimateAmount}>
                    <StyledText variant="body" weight="medium">
                      ¥{(estimate.total_amount || 0).toLocaleString()}
                    </StyledText>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(estimate.status) + '20' }]}>
                      <StyledText 
                        variant="caption" 
                        weight="medium"
                        style={[{ color: getStatusColor(estimate.status) }]}
                      >
                        {getStatusLabel(estimate.status)}
                      </StyledText>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </Card>
        )}

        {/* Task 6 機能紹介 */}
        <Card style={styles.featureCard}>
          <StyledText variant="subtitle" weight="semibold" style={styles.featureTitle}>
            🚀 新機能: AI統合見積システム
          </StyledText>
          <StyledText variant="body" color="secondary" style={styles.featureDescription}>
            Task 6で実装された最新機能をお試しください
          </StyledText>
          
          <View style={styles.featureList}>
            <View style={styles.featureItem}>
              <StyledText variant="body">📁</StyledText>
              <View style={styles.featureContent}>
                <StyledText variant="body" weight="medium">統合アップロード</StyledText>
                <StyledText variant="caption" color="secondary">
                  図面・仕様書・写真を一括アップロード
                </StyledText>
              </View>
            </View>
            <View style={styles.featureItem}>
              <StyledText variant="body">🤖</StyledText>
              <View style={styles.featureContent}>
                <StyledText variant="body" weight="medium">AI自動判別</StyledText>
                <StyledText variant="caption" color="secondary">
                  ドキュメント内容を自動解析して見積に反映
                </StyledText>
              </View>
            </View>
            <View style={styles.featureItem}>
              <StyledText variant="body">⚡</StyledText>
              <View style={styles.featureContent}>
                <StyledText variant="body" weight="medium">スマート事前入力</StyledText>
                <StyledText variant="caption" color="secondary">
                  AI解析結果から自動で見積項目を生成
                </StyledText>
              </View>
            </View>
          </View>
        </Card>

        {/* 空間調整用の余白 */}
        <View style={{ height: spacing[6] }} />
      </ScrollView>
    </SafeAreaView>
  )
}

// =============================================================================
// STYLES
// =============================================================================

const createStyles = (colors: any, spacing: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  statsCard: {
    margin: spacing[4],
    marginTop: 0,
    padding: spacing[5],
  },
  statsTitle: {
    marginBottom: spacing[4],
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
    gap: spacing[2],
  },
  recentEstimatesCard: {
    margin: spacing[4],
    marginTop: 0,
    padding: spacing[5],
  },
  recentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[4],
  },
  estimateList: {
    gap: spacing[3],
  },
  estimateItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  estimateInfo: {
    flex: 1,
    gap: spacing[1],
  },
  estimateAmount: {
    alignItems: 'flex-end',
    gap: spacing[2],
  },
  statusBadge: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderRadius: 12,
  },
  featureCard: {
    margin: spacing[4],
    marginTop: 0,
    padding: spacing[5],
    backgroundColor: colors.primary.DEFAULT + '10',
    borderColor: colors.primary.DEFAULT,
    borderWidth: 1,
  },
  featureTitle: {
    marginBottom: spacing[2],
  },
  featureDescription: {
    marginBottom: spacing[4],
    lineHeight: 20,
  },
  featureList: {
    gap: spacing[4],
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  featureContent: {
    flex: 1,
    gap: spacing[1],
  },
})