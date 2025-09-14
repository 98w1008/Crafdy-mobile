import React, { useState, useEffect } from 'react'
import {
  View,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native'
import { router } from 'expo-router'
import { useAuth, useRole } from '@/contexts/AuthContext'
import { useColors, useSpacing, useRadius } from '@/theme/ThemeProvider'
import { StyledText, Card, StyledButton, Icon } from '@/components/ui'
import { EditableContent } from '@/components/EditableContent'
import { ApprovalActions, StatusBadge } from '@/components/ApprovalActions'
import { getSubmissions, SubmissionItem, SubmissionStatus } from '@/lib/approval-system'

interface ApprovalCenterTab {
  key: 'pending' | 'approved' | 'rejected' | 'all'
  title: string
  icon: string
}

const TABS: ApprovalCenterTab[] = [
  { key: 'pending', title: '承認待ち', icon: 'clock' },
  { key: 'approved', title: '承認済み', icon: 'checkmark-circle' },
  { key: 'rejected', title: '却下', icon: 'close-circle' },
  { key: 'all', title: 'すべて', icon: 'list' },
]

export default function ApprovalCenterScreen() {
  const { user, profile } = useAuth()
  const userRole = useRole()
  const colors = useColors()
  const spacing = useSpacing()
  const radius = useRadius()

  const [activeTab, setActiveTab] = useState<ApprovalCenterTab['key']>('pending')
  const [submissions, setSubmissions] = useState<SubmissionItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // 代表以外はアクセス禁止
  useEffect(() => {
    if (userRole !== 'owner' && userRole !== 'admin') {
      Alert.alert('アクセス拒否', 'この画面にアクセスする権限がありません', [
        { text: 'OK', onPress: () => router.back() }
      ])
    }
  }, [userRole])

  // 提出物を取得
  const fetchSubmissions = async () => {
    if (!user) return

    try {
      // TODO: 実際の実装では全プロジェクトのIDを取得する必要があります
      const projectIds = ['1', '2', '3', '4'] // サンプルプロジェクトID
      
      const allSubmissions = await Promise.all(
        projectIds.map(projectId => getSubmissions(projectId, user.id))
      )
      
      const flatSubmissions = allSubmissions.flat()
      setSubmissions(flatSubmissions)
    } catch (error) {
      console.error('Failed to fetch submissions:', error)
      Alert.alert('エラー', '提出物の取得に失敗しました')
    }
  }

  // 初期ロード
  useEffect(() => {
    const initialize = async () => {
      setLoading(true)
      await fetchSubmissions()
      setLoading(false)
    }

    if (user) {
      initialize()
    }
  }, [user])

  // リフレッシュ
  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchSubmissions()
    setRefreshing(false)
  }

  // フィルタリング
  const getFilteredSubmissions = (): SubmissionItem[] => {
    switch (activeTab) {
      case 'pending':
        return submissions.filter(s => s.status === 'submitted')
      case 'approved':
        return submissions.filter(s => s.status === 'approved')
      case 'rejected':
        return submissions.filter(s => s.status === 'rejected')
      case 'all':
      default:
        return submissions
    }
  }

  const filteredSubmissions = getFilteredSubmissions()

  // ステータス変更ハンドラ
  const handleStatusChange = (submissionId: string, newStatus: SubmissionStatus) => {
    setSubmissions(prev =>
      prev.map(submission =>
        submission.id === submissionId
          ? { ...submission, status: newStatus }
          : submission
      )
    )
  }

  // コンテンツ変更ハンドラ
  const handleContentChange = (submissionId: string, newContent: string) => {
    setSubmissions(prev =>
      prev.map(submission =>
        submission.id === submissionId
          ? { ...submission, content: newContent }
          : submission
      )
    )
  }

  // タブレンダリング
  const renderTab = (tab: ApprovalCenterTab) => {
    const isActive = activeTab === tab.key
    const count = getFilteredSubmissions().length

    return (
      <TouchableOpacity
        key={tab.key}
        style={[
          styles.tab,
          isActive && styles.activeTab
        ]}
        onPress={() => setActiveTab(tab.key)}
        activeOpacity={0.7}
      >
        <Icon 
          name={tab.icon} 
          size={20} 
          color={isActive ? 'primary' : 'textSecondary'} 
        />
        <StyledText 
          variant="body" 
          weight={isActive ? 'semibold' : 'medium'}
          color={isActive ? 'primary' : 'secondary'}
          style={{ marginLeft: 8 }}
        >
          {tab.title}
        </StyledText>
        {tab.key === activeTab && (
          <View style={styles.tabBadge}>
            <StyledText variant="caption" weight="bold" color="onPrimary">
              {count}
            </StyledText>
          </View>
        )}
      </TouchableOpacity>
    )
  }

  // 提出物カードレンダリング
  const renderSubmissionCard = (submission: SubmissionItem) => {
    return (
      <Card key={submission.id} variant="outlined" style={styles.submissionCard}>
        {/* ヘッダー */}
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleContainer}>
            <StyledText variant="title" weight="semibold">
              {submission.type === 'report' ? '日報' : 'レシート'}
            </StyledText>
            <StatusBadge status={submission.status} style={{ marginLeft: 12 }} />
          </View>
          <StyledText variant="caption" color="secondary">
            {new Date(submission.created_at).toLocaleDateString('ja-JP', {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </StyledText>
        </View>

        {/* 編集可能コンテンツ */}
        <EditableContent
          submissionId={submission.id}
          userId={user?.id || ''}
          initialContent={submission.content}
          currentStatus={submission.status}
          onContentChange={(newContent) => handleContentChange(submission.id, newContent)}
          style={styles.cardContent}
        />

        {/* 承認アクション */}
        <ApprovalActions
          submissionId={submission.id}
          userId={user?.id || ''}
          currentStatus={submission.status}
          onStatusChange={(newStatus) => handleStatusChange(submission.id, newStatus)}
          style={styles.cardActions}
        />
      </Card>
    )
  }

  // 空状態レンダリング
  const renderEmptyState = () => (
    <Card variant="outlined" style={styles.emptyCard}>
      <Icon name="clipboard" size={48} color="textSecondary" style={styles.emptyIcon} />
      <StyledText variant="title" weight="semibold" align="center">
        {activeTab === 'pending' && '承認待ちの提出物はありません'}
        {activeTab === 'approved' && '承認済みの提出物はありません'}
        {activeTab === 'rejected' && '却下された提出物はありません'}
        {activeTab === 'all' && '提出物はありません'}
      </StyledText>
      <StyledText variant="body" color="secondary" align="center" style={styles.emptyDescription}>
        職長からの日報やレシートの提出をお待ちください
      </StyledText>
    </Card>
  )

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary.DEFAULT} />
          <StyledText variant="body" color="secondary" style={{ marginTop: 16 }}>
            提出物を読み込み中...
          </StyledText>
        </View>
      </SafeAreaView>
    )
  }

  const styles = createStyles(colors, spacing, radius)

  return (
    <SafeAreaView style={styles.container}>
      {/* ヘッダー */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Icon name="arrow-back" size={24} color="primary" />
        </TouchableOpacity>
        
        <View style={styles.headerCenter}>
          <StyledText variant="heading2" weight="bold">
            承認センター
          </StyledText>
          <StyledText variant="body" color="secondary">
            提出物の承認・管理
          </StyledText>
        </View>

        <TouchableOpacity
          style={styles.refreshButton}
          onPress={handleRefresh}
          disabled={refreshing}
        >
          <Icon 
            name="refresh" 
            size={24} 
            color={refreshing ? "textSecondary" : "primary"} 
          />
        </TouchableOpacity>
      </View>

      {/* タブナビゲーション */}
      <View style={styles.tabContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabContent}
        >
          {TABS.map(renderTab)}
        </ScrollView>
      </View>

      {/* メインコンテンツ */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary.DEFAULT]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {filteredSubmissions.length > 0 ? (
          filteredSubmissions.map(renderSubmissionCard)
        ) : (
          renderEmptyState()
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const createStyles = (colors: any, spacing: any, radius: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingTop: spacing[2],
    paddingBottom: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  refreshButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabContainer: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tabContent: {
    paddingHorizontal: spacing[2],
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    marginHorizontal: spacing[1],
    borderRadius: radius.md,
  },
  activeTab: {
    backgroundColor: colors.primary.light || colors.background.secondary,
  },
  tabBadge: {
    backgroundColor: colors.primary.DEFAULT,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 8,
    minWidth: 20,
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing[4],
    paddingBottom: spacing[8],
  },
  submissionCard: {
    marginBottom: spacing[4],
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing[3],
  },
  cardTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  cardContent: {
    marginBottom: spacing[3],
  },
  cardActions: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing[3],
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: spacing[12],
  },
  emptyIcon: {
    marginBottom: spacing[4],
  },
  emptyDescription: {
    marginTop: spacing[2],
  },
})