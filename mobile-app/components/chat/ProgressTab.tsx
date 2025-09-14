import React, { useState } from 'react'
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native'
import { Colors, Spacing, Typography, BorderRadius, Shadows } from '@/constants/Colors'
import { StyledText, StyledButton, Card } from '@/components/ui'

interface ProgressTabProps {
  projectId: string
  projectName: string
  userRole: string | null
  user: any
}

interface ProgressItem {
  id: string
  title: string
  description: string
  status: 'not_started' | 'in_progress' | 'completed' | 'on_hold'
  progress: number
  startDate: string
  endDate?: string
  assignedTo: string[]
  priority: 'low' | 'medium' | 'high'
  updatedAt: string
  category: 'foundation' | 'structure' | 'finishing' | 'equipment' | 'exterior'
}

export default function ProgressTab({ projectId, projectName, userRole, user }: ProgressTabProps) {
  const [progressItems] = useState<ProgressItem[]>([
    {
      id: '1',
      title: '基礎工事',
      description: '建物の基礎コンクリート工事',
      status: 'completed',
      progress: 100,
      startDate: '2024-01-15',
      endDate: '2024-02-10',
      assignedTo: ['田中', '佐藤'],
      priority: 'high',
      updatedAt: '2024-02-10',
      category: 'foundation'
    },
    {
      id: '2',
      title: '鉄骨組立',
      description: '建物骨組みの鉄骨組立作業',
      status: 'in_progress',
      progress: 65,
      startDate: '2024-02-05',
      assignedTo: ['山田', '鈴木', '高橋'],
      priority: 'high',
      updatedAt: '2024-02-15',
      category: 'structure'
    },
    {
      id: '3',
      title: '外壁工事',
      description: '外壁パネル取り付けと防水工事',
      status: 'not_started',
      progress: 0,
      startDate: '2024-03-01',
      assignedTo: ['伊藤'],
      priority: 'medium',
      updatedAt: '2024-02-15',
      category: 'exterior'
    },
    {
      id: '4',
      title: '電気設備',
      description: '配線・照明・コンセント設置',
      status: 'not_started',
      progress: 0,
      startDate: '2024-03-15',
      assignedTo: ['渡辺'],
      priority: 'medium',
      updatedAt: '2024-02-15',
      category: 'equipment'
    }
  ])

  const [selectedCategory, setSelectedCategory] = useState<string>('all')

  // 権限チェック：職長と親方は進捗更新可能
  const canUpdateProgress = userRole === 'parent' || userRole === 'lead'

  const getStatusColor = (status: ProgressItem['status']) => {
    switch (status) {
      case 'completed': return Colors.success
      case 'in_progress': return Colors.primary
      case 'on_hold': return Colors.warning
      case 'not_started': return Colors.textTertiary
      default: return Colors.textTertiary
    }
  }

  const getStatusText = (status: ProgressItem['status']) => {
    switch (status) {
      case 'completed': return '完了'
      case 'in_progress': return '進行中'
      case 'on_hold': return '一時停止'
      case 'not_started': return '未着手'
      default: return '不明'
    }
  }

  const getPriorityColor = (priority: ProgressItem['priority']) => {
    switch (priority) {
      case 'high': return Colors.error
      case 'medium': return Colors.warning
      case 'low': return Colors.info
      default: return Colors.textTertiary
    }
  }

  const getPriorityText = (priority: ProgressItem['priority']) => {
    switch (priority) {
      case 'high': return '高'
      case 'medium': return '中'
      case 'low': return '低'
      default: return '-'
    }
  }

  const getCategoryIcon = (category: ProgressItem['category']) => {
    switch (category) {
      case 'foundation': return '🏗️'
      case 'structure': return '🔩'
      case 'finishing': return '🎨'
      case 'equipment': return '⚡'
      case 'exterior': return '🏠'
      default: return '📋'
    }
  }

  const categories = [
    { id: 'all', name: '全て', icon: '📋' },
    { id: 'foundation', name: '基礎', icon: '🏗️' },
    { id: 'structure', name: '構造', icon: '🔩' },
    { id: 'finishing', name: '仕上げ', icon: '🎨' },
    { id: 'equipment', name: '設備', icon: '⚡' },
    { id: 'exterior', name: '外装', icon: '🏠' },
  ]

  const filteredItems = selectedCategory === 'all' 
    ? progressItems 
    : progressItems.filter(item => item.category === selectedCategory)

  const handleUpdateProgress = (item: ProgressItem) => {
    if (!canUpdateProgress) {
      Alert.alert('権限エラー', '進捗の更新権限がありません')
      return
    }
    
    Alert.alert('開発中', 'Progress update functionality coming soon')
  }

  const renderCategoryFilter = () => (
    <View style={styles.categoryFilter}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.categoryButtons}>
          {categories.map((category) => (
            <TouchableOpacity
              key={category.id}
              style={[
                styles.categoryButton,
                selectedCategory === category.id && styles.categoryButtonActive
              ]}
              onPress={() => setSelectedCategory(category.id)}
            >
              <StyledText variant="body" style={styles.categoryIcon}>
                {category.icon}
              </StyledText>
              <StyledText 
                variant="caption" 
                weight="medium"
                color={selectedCategory === category.id ? 'onPrimary' : 'secondary'}
              >
                {category.name}
              </StyledText>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  )

  const renderOverallProgress = () => {
    const totalItems = progressItems.length
    const completedItems = progressItems.filter(item => item.status === 'completed').length
    const inProgressItems = progressItems.filter(item => item.status === 'in_progress').length
    const overallProgress = Math.round((completedItems / totalItems) * 100)

    return (
      <Card variant="premium" elevationLevel={3} glowEffect={true} style={styles.overallCard}>
        <StyledText variant="subtitle" weight="semibold" style={styles.overallTitle}>
          📊 プロジェクト全体進捗
        </StyledText>
        
        <View style={styles.overallStats}>
          <View style={styles.overallProgressContainer}>
            <StyledText variant="heading2" weight="bold" color="primary">
              {overallProgress}%
            </StyledText>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill, 
                  { width: `${overallProgress}%` }
                ]} 
              />
            </View>
          </View>
          
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <StyledText variant="title" weight="bold" color="success">
                {completedItems}
              </StyledText>
              <StyledText variant="caption" color="secondary">完了</StyledText>
            </View>
            <View style={styles.statItem}>
              <StyledText variant="title" weight="bold" color="primary">
                {inProgressItems}
              </StyledText>
              <StyledText variant="caption" color="secondary">進行中</StyledText>
            </View>
            <View style={styles.statItem}>
              <StyledText variant="title" weight="bold" color="text">
                {totalItems}
              </StyledText>
              <StyledText variant="caption" color="secondary">総数</StyledText>
            </View>
          </View>
        </View>
      </Card>
    )
  }

  const renderProgressItem = (item: ProgressItem) => (
    <Card
      key={item.id}
      variant="elevated"
      pressable={canUpdateProgress}
      onPress={() => handleUpdateProgress(item)}
      style={styles.progressCard}
    >
      <View style={styles.progressHeader}>
        <View style={styles.titleContainer}>
          <StyledText variant="body" style={styles.categoryIcon}>
            {getCategoryIcon(item.category)}
          </StyledText>
          <View style={styles.titleInfo}>
            <StyledText variant="subtitle" weight="semibold" color="text">
              {item.title}
            </StyledText>
            <StyledText variant="caption" color="secondary">
              {item.description}
            </StyledText>
          </View>
        </View>
        
        <View style={styles.badges}>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
            <StyledText 
              variant="caption" 
              weight="medium"
              style={{ color: getStatusColor(item.status) }}
            >
              {getStatusText(item.status)}
            </StyledText>
          </View>
          <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(item.priority) + '20' }]}>
            <StyledText 
              variant="caption" 
              weight="medium"
              style={{ color: getPriorityColor(item.priority) }}
            >
              優先度: {getPriorityText(item.priority)}
            </StyledText>
          </View>
        </View>
      </View>

      {item.status !== 'not_started' && (
        <View style={styles.progressContainer}>
          <View style={styles.progressInfo}>
            <StyledText variant="caption" color="secondary">進捗</StyledText>
            <StyledText variant="caption" weight="semibold" color="primary">
              {item.progress}%
            </StyledText>
          </View>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { 
                  width: `${item.progress}%`,
                  backgroundColor: getStatusColor(item.status)
                }
              ]} 
            />
          </View>
        </View>
      )}

      <View style={styles.progressDetails}>
        <View style={styles.detailRow}>
          <StyledText variant="caption" color="tertiary">📅</StyledText>
          <StyledText variant="caption" color="secondary">
            開始: {item.startDate}
            {item.endDate && ` / 完了: ${item.endDate}`}
          </StyledText>
        </View>
        
        <View style={styles.detailRow}>
          <StyledText variant="caption" color="tertiary">👥</StyledText>
          <StyledText variant="caption" color="secondary">
            担当: {item.assignedTo.join(', ')}
          </StyledText>
        </View>
        
        <View style={styles.detailRow}>
          <StyledText variant="caption" color="tertiary">🕒</StyledText>
          <StyledText variant="caption" color="secondary">
            更新: {item.updatedAt}
          </StyledText>
        </View>
      </View>
    </Card>
  )

  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 全体進捗 */}
        {renderOverallProgress()}

        {/* カテゴリフィルター */}
        {renderCategoryFilter()}

        {/* 進捗アイテム一覧 */}
        <View style={styles.progressList}>
          {filteredItems.map(renderProgressItem)}
        </View>

        {filteredItems.length === 0 && (
          <Card variant="outlined" style={styles.emptyCard}>
            <StyledText variant="heading3" align="center" style={styles.emptyIcon}>
              📊
            </StyledText>
            <StyledText variant="title" weight="semibold" align="center" color="text">
              該当する作業がありません
            </StyledText>
            <StyledText variant="body" color="secondary" align="center">
              他のカテゴリを確認してください
            </StyledText>
          </Card>
        )}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.md,
    paddingBottom: Spacing['2xl'],
  },
  overallCard: {
    marginBottom: Spacing.lg,
  },
  overallTitle: {
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  overallStats: {
    gap: Spacing.lg,
  },
  overallProgressContainer: {
    alignItems: 'center',
    gap: Spacing.sm,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  categoryFilter: {
    marginBottom: Spacing.lg,
  },
  categoryButtons: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.sm,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.xs,
  },
  categoryButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  categoryIcon: {
    fontSize: 16,
  },
  progressList: {
    gap: Spacing.md,
  },
  progressCard: {},
  progressHeader: {
    marginBottom: Spacing.md,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  titleInfo: {
    flex: 1,
    gap: Spacing.xs,
  },
  badges: {
    flexDirection: 'row',
    gap: Spacing.sm,
    flexWrap: 'wrap',
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  priorityBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  progressContainer: {
    marginBottom: Spacing.md,
  },
  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  progressBar: {
    height: 8,
    backgroundColor: Colors.surfaceNeutral,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 4,
  },
  progressDetails: {
    gap: Spacing.xs,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: Spacing['2xl'],
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: Spacing.lg,
  },
})