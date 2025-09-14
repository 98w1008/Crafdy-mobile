import React, { useState } from 'react'
import {
  View,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Alert,
} from 'react-native'
import { useAuth, useRole } from '@/contexts/AuthContext'
import { Colors, Spacing, Typography, BorderRadius } from '@/constants/Colors'
import { StyledText, StyledButton, Card } from '@/components/ui'

interface Task {
  id: string
  title: string
  description: string
  priority: 'high' | 'medium' | 'low'
  status: 'pending' | 'in_progress' | 'completed'
  dueDate?: string
  projectName?: string
  assignee?: string
}

export default function TasksTab() {
  const { user, profile } = useAuth()
  const userRole = useRole()

  const [tasks, setTasks] = useState<Task[]>([
    {
      id: '1',
      title: '見積書作成',
      description: '新築マンション案件の見積書作成',
      priority: 'high',
      status: 'pending',
      dueDate: '2024-12-20',
      projectName: '新築マンション建設',
    },
    {
      id: '2', 
      title: '安全点検',
      description: '月次安全点検の実施',
      priority: 'high',
      status: 'in_progress',
      dueDate: '2024-12-18',
    },
    {
      id: '3',
      title: '材料発注',
      description: 'コンクリート材料の追加発注',
      priority: 'medium',
      status: 'completed',
      dueDate: '2024-12-15',
      projectName: 'オフィスビル改修',
    },
  ])

  const getPriorityColor = (priority: Task['priority']) => {
    switch (priority) {
      case 'high': return Colors.semantic.error
      case 'medium': return Colors.secondary.DEFAULT
      case 'low': return Colors.text.tertiary
    }
  }

  const getStatusColor = (status: Task['status']) => {
    switch (status) {
      case 'pending': return Colors.text.tertiary
      case 'in_progress': return Colors.secondary.DEFAULT
      case 'completed': return Colors.primary.DEFAULT
    }
  }

  const getStatusText = (status: Task['status']) => {
    switch (status) {
      case 'pending': return '未着手'
      case 'in_progress': return '進行中'
      case 'completed': return '完了'
    }
  }

  const renderTask = (task: Task) => (
    <Card key={task.id} variant="default" style={styles.taskCard} pressable onPress={() => {
      Alert.alert('タスク詳細', `${task.title}\n\n${task.description}`)
    }}>
      <View style={styles.taskHeader}>
        <View style={styles.taskInfo}>
          <StyledText variant="body" weight="semibold" color="primary">
            {task.title}
          </StyledText>
          <StyledText variant="caption" color="secondary">
            {task.description}
          </StyledText>
        </View>
        <View style={styles.taskBadges}>
          <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(task.priority) + '20' }]}>
            <StyledText 
              variant="caption" 
              weight="semibold"
              style={{ color: getPriorityColor(task.priority) }}
            >
              {task.priority.toUpperCase()}
            </StyledText>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(task.status) + '20' }]}>
            <StyledText 
              variant="caption" 
              weight="semibold"
              style={{ color: getStatusColor(task.status) }}
            >
              {getStatusText(task.status)}
            </StyledText>
          </View>
        </View>
      </View>

      <View style={styles.taskFooter}>
        {task.projectName && (
          <StyledText variant="caption" color="tertiary">
            📁 {task.projectName}
          </StyledText>
        )}
        {task.dueDate && (
          <StyledText variant="caption" color="tertiary">
            📅 期限: {task.dueDate}
          </StyledText>
        )}
      </View>
    </Card>
  )

  return (
    <SafeAreaView style={styles.container}>
      {/* ヘッダー */}
      <View style={styles.header}>
        <StyledText variant="heading2" weight="bold" color="primary">
          タスク管理
        </StyledText>
        <StyledText variant="body" color="secondary">
          お疲れさまです、{profile?.full_name || 'ユーザー'}さん
        </StyledText>
      </View>

      {/* サマリーカード */}
      <Card variant="elevated" style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <StyledText variant="heading3" weight="bold" color="error">
              {tasks.filter(t => t.status === 'pending').length}
            </StyledText>
            <StyledText variant="caption" color="secondary">未着手</StyledText>
          </View>
          <View style={styles.summaryItem}>
            <StyledText variant="heading3" weight="bold" color="warning">
              {tasks.filter(t => t.status === 'in_progress').length}
            </StyledText>
            <StyledText variant="caption" color="secondary">進行中</StyledText>
          </View>
          <View style={styles.summaryItem}>
            <StyledText variant="heading3" weight="bold" color="success">
              {tasks.filter(t => t.status === 'completed').length}
            </StyledText>
            <StyledText variant="caption" color="secondary">完了</StyledText>
          </View>
        </View>
      </Card>

      {/* タスク一覧 */}
      <ScrollView 
        style={styles.tasksList}
        contentContainerStyle={styles.tasksContent}
        showsVerticalScrollIndicator={false}
      >
        <StyledText variant="subtitle" weight="semibold" color="primary" style={styles.sectionTitle}>
          今日やること
        </StyledText>
        
        {tasks
          .filter(task => task.status !== 'completed')
          .map(renderTask)
        }

        <StyledText variant="subtitle" weight="semibold" color="primary" style={styles.sectionTitle}>
          完了済み
        </StyledText>
        
        {tasks
          .filter(task => task.status === 'completed')
          .map(renderTask)
        }

        {/* 新規タスク作成ボタン */}
        <StyledButton
          title="+ 新しいタスクを追加"
          variant="outline"
          size="lg"
          onPress={() => Alert.alert('開発中', '新規タスク作成機能は開発中です')}
          style={styles.addButton}
        />
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.base.background,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.base.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  summaryCard: {
    margin: Spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  summaryItem: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  tasksList: {
    flex: 1,
  },
  tasksContent: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing['2xl'],
  },
  sectionTitle: {
    marginTop: Spacing.lg,
    marginBottom: Spacing.md,
  },
  taskCard: {
    marginBottom: Spacing.md,
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  taskInfo: {
    flex: 1,
    marginRight: Spacing.md,
    gap: Spacing.xs,
  },
  taskBadges: {
    gap: Spacing.xs,
    alignItems: 'flex-end',
  },
  priorityBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  taskFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
  },
  addButton: {
    marginTop: Spacing.lg,
  },
})