import React, { useState, useEffect } from 'react'
import {
  View,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native'
import { router } from 'expo-router'
import { useAuth, useRole } from '@/contexts/AuthContext'
import { useColors, useSpacing, useRadius } from '@/theme/ThemeProvider'
import { StyledText, Card, StyledButton, Icon } from '@/components/ui'
import { StatusBadge } from '@/components/ApprovalActions'
import { getSubmissions, SubmissionItem } from '@/lib/approval-system'

interface Project {
  id: string
  name: string
  description: string
  status: 'planning' | 'active' | 'completed' | 'paused'
  progress: number
  startDate: string
  endDate?: string
  location: string
  budget: number
  team: string[]
  monthlyCost: number
}


export default function ProjectsScreen() {
  const { user, profile } = useAuth()
  const userRole = useRole()
  const colors = useColors()
  const spacing = useSpacing()
  const radius = useRadius()

  const [pendingSubmissions, setPendingSubmissions] = useState<SubmissionItem[]>([])
  const [loadingSubmissions, setLoadingSubmissions] = useState(true)

  // 承認待ちの提出物を取得
  useEffect(() => {
    if (!user) return

    const fetchPendingSubmissions = async () => {
      try {
        setLoadingSubmissions(true)
        // 全プロジェクトの承認待ち提出物を取得
        const allSubmissions = await Promise.all(
          projects.map(project => getSubmissions(project.id, user.id))
        )
        
        const flatSubmissions = allSubmissions.flat()
        const pending = flatSubmissions.filter(s => s.status === 'submitted')
        
        setPendingSubmissions(pending)
      } catch (error) {
        console.error('Failed to fetch pending submissions:', error)
      } finally {
        setLoadingSubmissions(false)
      }
    }

    fetchPendingSubmissions()
  }, [user])

  // サンプルプロジェクトデータ（実際にはSupabaseから取得）
  const projects: Project[] = [
    {
      id: '1',
      name: '新宿オフィスビル建設',
      description: '地上15階建てオフィスビル新築工事',
      status: 'active',
      progress: 65,
      startDate: '2024-01-15',
      endDate: '2024-12-30',
      location: '東京都新宿区',
      budget: 150000000,
      team: ['田中', '佐藤', '山田', '鈴木'],
      monthlyCost: 12500000
    },
    {
      id: '2',
      name: 'マンション改修工事',
      description: '築20年マンションの大規模改修',
      status: 'active',
      progress: 30,
      startDate: '2024-02-01',
      endDate: '2024-08-31',
      location: '神奈川県横浜市',
      budget: 80000000,
      team: ['高橋', '伊藤'],
      monthlyCost: 8900000
    },
    {
      id: '3',
      name: '商業施設リニューアル',
      description: 'ショッピングモール内装工事',
      status: 'completed',
      progress: 100,
      startDate: '2023-10-01',
      endDate: '2024-01-15',
      location: '埼玉県さいたま市',
      budget: 45000000,
      team: ['渡辺', '加藤'],
      monthlyCost: 0
    },
    {
      id: '4',
      name: '住宅建築プロジェクト',
      description: '戸建て住宅新築工事',
      status: 'planning',
      progress: 10,
      startDate: '2024-04-01',
      location: '千葉県船橋市',
      budget: 35000000,
      team: ['中村'],
      monthlyCost: 2800000
    }
  ]



  const getStatusText = (status: Project['status']) => {
    switch (status) {
      case 'active': return '進行中'
      case 'completed': return '完了'
      case 'paused': return '一時停止'
      case 'planning': return '計画中'
      default: return '不明'
    }
  }

  const handleProjectPress = (project: Project) => {
    router.push({ 
      pathname: '/projects/[id]/chat', 
      params: { id: project.id, name: project.name } 
    });
  }

  const handleNewProject = () => {
    router.push('/new-project')
  }

  const handleApprovalScreen = () => {
    router.push('/approval-center')
  }

  const renderApprovalSummaryCard = () => {
    if (userRole !== 'owner' && userRole !== 'admin') {
      return null // 代表のみ表示
    }

    const pendingCount = pendingSubmissions.length

    return (
      <TouchableOpacity
        style={styles.approvalCard}
        onPress={handleApprovalScreen}
        activeOpacity={0.8}
        accessibilityLabel={`承認待ち ${pendingCount}件`}
        accessibilityHint="タップして承認画面を表示"
      >
        <View style={styles.approvalHeader}>
          <Icon name="checkmark-circle" size={24} color="warning" />
          <StyledText variant="title" weight="bold" color="warning">
            承認待ち
          </StyledText>
        </View>
        
        <StyledText variant="heading2" weight="bold" color="primary" style={styles.approvalCount}>
          {pendingCount}件
        </StyledText>
        
        <StyledText variant="body" color="secondary">
          職長からの提出物をご確認ください
        </StyledText>

        {loadingSubmissions && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={colors.primary.DEFAULT} />
            <StyledText variant="caption" color="secondary" style={{ marginLeft: 8 }}>
              読み込み中...
            </StyledText>
          </View>
        )}
      </TouchableOpacity>
    )
  }



  const renderProjectCard = (project: Project) => (
    <TouchableOpacity
      key={project.id}
      style={styles.projectCard}
      onPress={() => handleProjectPress(project)}
      activeOpacity={0.8}
      accessibilityLabel={`プロジェクト: ${project.name}`}
      accessibilityHint="タップして詳細を表示"
    >
      {/* プロジェクト名 */}
      <StyledText variant="heading3" weight="semibold" numberOfLines={2} style={styles.projectName}>
        {project.name}
      </StyledText>
      
      {/* 主要指標を2行で表示 */}
      <View style={styles.metricsContainer}>
        {/* 1行目: 場所・進捗 */}
        <View style={styles.metricsRow}>
          <View style={styles.metricItem}>
            <StyledText variant="caption" color="secondary" accessibilityLabel="場所">場所</StyledText>
            <StyledText variant="body" weight="medium" numberOfLines={1} accessibilityLabel={`場所: ${project.location}`}>
              {project.location}
            </StyledText>
          </View>
          <View style={styles.metricItem}>
            <StyledText variant="caption" color="secondary" accessibilityLabel="進捗">進捗</StyledText>
            <StyledText variant="body" weight="bold" color="primary" accessibilityLabel={`進捗: ${project.progress}%`}>
              {project.progress}%
            </StyledText>
          </View>
        </View>
        
        {/* 2行目: 人数・今月コスト */}
        <View style={styles.metricsRow}>
          <View style={styles.metricItem}>
            <StyledText variant="caption" color="secondary" accessibilityLabel="人数">人数</StyledText>
            <StyledText variant="body" weight="medium" accessibilityLabel={`チーム人数: ${project.team.length}名`}>
              {project.team.length}名
            </StyledText>
          </View>
          <View style={styles.metricItem}>
            <StyledText variant="caption" color="secondary" accessibilityLabel="今月コスト">今月コスト</StyledText>
            <StyledText variant="body" weight="bold" accessibilityLabel={`今月コスト: ${project.monthlyCost > 0 ? `${(project.monthlyCost / 10000).toLocaleString()}万円` : 'なし'}`}>
              {project.monthlyCost > 0 ? `¥${(project.monthlyCost / 10000).toLocaleString()}万` : '---'}
            </StyledText>
          </View>
        </View>
      </View>

      {/* 進捗バー（PRIMARYアクセント色のみ） */}
      {project.progress > 0 && (
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { width: `${project.progress}%` }
              ]} 
            />
          </View>
        </View>
      )}
    </TouchableOpacity>
  )

  const renderEmptyState = () => (
    <Card variant="outlined" style={styles.emptyCard}>
      <Icon name="clipboard" size={48} color="textSecondary" style={styles.emptyIcon} />
      <StyledText variant="title" weight="semibold" align="center">
        プロジェクトがありません
      </StyledText>
      <StyledText variant="body" color="secondary" align="center" style={styles.emptyDescription}>
        新しいプロジェクトを作成して、工事管理を始めましょう
      </StyledText>
      <StyledButton
        title="新規プロジェクト作成"
        variant="primary"
        size="lg"
        elevated={true}
        onPress={handleNewProject}
        style={styles.emptyButton}
      />
    </Card>
  )

  const styles = createStyles(colors, spacing, radius)
  
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ヘッダー */}
        <View style={styles.header}>
          <StyledText variant="heading2" weight="bold">
            現場一覧
          </StyledText>
          <StyledText variant="body" color="secondary">
            案件名・場所・進捗・人数・コストを一覧表示
          </StyledText>
        </View>

        {/* 承認待ちサマリーカード（代表のみ） */}
        {renderApprovalSummaryCard()}

        {/* 新規作成ボタン */}
        <TouchableOpacity
          style={styles.newProjectButton}
          onPress={handleNewProject}
          activeOpacity={0.8}
          accessibilityLabel="新規プロジェクト作成"
          accessibilityHint="新しいプロジェクトを作成します"
        >
          <StyledText variant="title" weight="bold" color="onPrimary">
            新規プロジェクト作成
          </StyledText>
        </TouchableOpacity>

        {/* プロジェクト一覧 */}
        <View style={styles.projectsList}>
          {projects.length > 0 ? (
            projects.map(renderProjectCard)
          ) : (
            renderEmptyState()
          )}
        </View>
      </ScrollView>
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
    paddingBottom: spacing[8],
  },
  header: {
    marginBottom: spacing[4],
    paddingTop: spacing[1],
  },
  newProjectButton: {
    marginBottom: spacing[4],
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    backgroundColor: colors.primary.DEFAULT,
  },
  projectsList: {
    gap: spacing[3],
  },
  projectCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing[4],
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 140, // 1画面で3件表示用
  },
  projectName: {
    marginBottom: spacing[3],
    color: colors.text.primary,
    minHeight: 48, // 2行分の高さを確保
  },
  metricsContainer: {
    flex: 1,
    gap: spacing[3],
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing[4],
  },
  metricItem: {
    flex: 1,
    gap: spacing[1],
  },
  progressContainer: {
    marginTop: spacing[3],
  },
  progressBar: {
    height: 6,
    borderRadius: radius.sm,
    backgroundColor: colors.border,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: radius.sm,
    backgroundColor: colors.primary.DEFAULT,
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
    marginBottom: spacing[6],
  },
  emptyButton: {
    minWidth: 200,
  },
  approvalCard: {
    backgroundColor: colors.warning.light || colors.surface,
    borderRadius: radius.lg,
    padding: spacing[4],
    marginBottom: spacing[4],
    borderWidth: 1,
    borderColor: colors.warning.DEFAULT,
  },
  approvalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[2],
    gap: spacing[2],
  },
  approvalCount: {
    marginBottom: spacing[1],
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing[2],
  },
})