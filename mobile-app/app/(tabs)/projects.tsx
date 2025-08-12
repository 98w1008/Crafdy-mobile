import React, { useState } from 'react'
import {
  View,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Alert,
} from 'react-native'
import { router } from 'expo-router'
import { useAuth, useRole } from '@/contexts/AuthContext'
import { Colors, getThemeColors, getCardStyle } from '@/constants/Colors'
import { useColorScheme } from '@/hooks/useColorScheme'
import { StyledText } from '@/components/ui'

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
  const { colorScheme } = useColorScheme()
  const theme = getThemeColors(colorScheme)

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



  const getStatusColor = (status: Project['status']) => {
    switch (status) {
      case 'active': return Colors.accent.DEFAULT
      case 'completed': return Colors.accent[600]
      case 'paused': return Colors.semantic.warning
      case 'planning': return Colors.accent[300]
      default: return theme.text.secondary
    }
  }

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



  const renderProjectCard = (project: Project) => (
    <TouchableOpacity
      key={project.id}
      style={[styles.projectCard, getCardStyle(colorScheme)]}
      onPress={() => handleProjectPress(project)}
      activeOpacity={0.8}
    >
      {/* Project Header with Name and Status */}
      <View style={styles.projectHeader}>
        <StyledText variant="title" weight="semibold" numberOfLines={1} style={{ color: theme.text.primary }}>
          {project.name}
        </StyledText>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(project.status) + '20' }]}>
          <View style={[styles.statusDot, { backgroundColor: getStatusColor(project.status) }]} />
          <StyledText 
            variant="caption" 
            weight="medium"
            style={{ color: getStatusColor(project.status) }}
          >
            {getStatusText(project.status)}
          </StyledText>
        </View>
      </View>

      {/* Key Information Grid */}
      <View style={styles.infoGrid}>
        {/* Location */}
        <View style={styles.infoItem}>
          <StyledText variant="caption" style={{ color: theme.text.tertiary }}>📍 場所</StyledText>
          <StyledText variant="body" weight="medium" style={{ color: theme.text.primary }}>
            {project.location}
          </StyledText>
        </View>

        {/* Progress */}
        <View style={styles.infoItem}>
          <StyledText variant="caption" style={{ color: theme.text.tertiary }}>📊 進捗</StyledText>
          <StyledText variant="body" weight="bold" style={{ color: Colors.accent.DEFAULT }}>
            {project.progress}%
          </StyledText>
        </View>

        {/* Team Count */}
        <View style={styles.infoItem}>
          <StyledText variant="caption" style={{ color: theme.text.tertiary }}>👥 人数</StyledText>
          <StyledText variant="body" weight="medium" style={{ color: theme.text.primary }}>
            {project.team.length}名
          </StyledText>
        </View>

        {/* Monthly Cost */}
        <View style={styles.infoItem}>
          <StyledText variant="caption" style={{ color: theme.text.tertiary }}>💰 今月コスト</StyledText>
          <StyledText variant="body" weight="bold" style={{ color: theme.text.primary }}>
            {project.monthlyCost > 0 ? `¥${(project.monthlyCost / 10000).toLocaleString()}万` : '---'}
          </StyledText>
        </View>
      </View>

      {/* Progress Bar */}
      {project.status !== 'planning' && project.progress > 0 && (
        <View style={styles.progressContainer}>
          <View style={[styles.progressBar, { backgroundColor: theme.border.light }]}>
            <View 
              style={[
                styles.progressFill, 
                { 
                  width: `${project.progress}%`,
                  backgroundColor: Colors.accent.DEFAULT
                }
              ]} 
            />
          </View>
        </View>
      )}
    </TouchableOpacity>
  )

  const renderEmptyState = () => (
    <Card variant="outlined" style={styles.emptyCard}>
      <StyledText variant="heading3" align="center" style={styles.emptyIcon}>
        📋
      </StyledText>
      <StyledText variant="title" weight="semibold" align="center">
        プロジェクトがありません
      </StyledText>
      <StyledText variant="body" color="secondary" align="center" style={styles.emptyDescription}>
        新しいプロジェクトを作成して、工事管理を始めましょう
      </StyledText>
      <StyledButton
        title="新規プロジェクト作成"
        variant="success"
        size="lg"
        elevated={true}
        icon={<StyledText variant="title" color="onPrimary">🚀</StyledText>}
        onPress={handleNewProject}
        style={styles.emptyButton}
      />
    </Card>
  )

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background.primary }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ヘッダー */}
        <View style={styles.header}>
          <StyledText variant="heading2" weight="bold" style={{ color: theme.text.primary }}>
            現場一覧
          </StyledText>
          <StyledText variant="body" style={{ color: theme.text.secondary }}>
            案件名・場所・進捗・人数・コストを一覧表示
          </StyledText>
        </View>

        {/* 新規作成ボタン - 大きく目立つボタン */}
        <TouchableOpacity
          style={[styles.newProjectButton, { backgroundColor: Colors.accent.DEFAULT }]}
          onPress={handleNewProject}
          activeOpacity={0.8}
        >
          <StyledText variant="title" weight="bold" style={{ color: Colors.accent[50] }}>
            ➕ 新規プロジェクト作成
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background.primary, // Will be overridden by theme
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    marginBottom: 24,
    paddingTop: 8,
  },
  newProjectButton: {
    marginBottom: 24,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
  },
  projectsList: {
    gap: 16,
  },
  projectCard: {
    padding: 16,
    marginBottom: 8,
  },
  projectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 12,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
    flexShrink: 0,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
    gap: 12,
  },
  infoItem: {
    width: '48%',
    minWidth: 120,
  },
  progressContainer: {
    marginTop: 8,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyDescription: {
    marginTop: 8,
    marginBottom: 24,
  },
  emptyButton: {
    minWidth: 200,
  },
})