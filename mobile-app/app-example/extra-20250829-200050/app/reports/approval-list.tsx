/**
 * 承認待ち日報一覧画面
 * 管理者が承認対象の日報一覧を確認する画面
 */

import React, { useState, useCallback, useEffect } from 'react'
import {
  View,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert
} from 'react-native'
import {
  Surface,
  IconButton,
  SearchBar,
  Chip,
  FAB,
  Badge,
  Avatar,
  Divider
} from 'react-native-paper'
import { router } from 'expo-router'
import * as Haptics from 'expo-haptics'
import dayjs from 'dayjs'
import timezone from 'dayjs/plugin/timezone'
import utc from 'dayjs/plugin/utc'

import { Colors, Spacing, Typography, BorderRadius, Shadows } from '@/constants/Colors'
import { StyledText, StyledButton, Card } from '@/components/ui'
import { 
  Report, 
  ReportStatus, 
  ReportSearchFilter, 
  PendingApprovalsResponse,
  REPORT_STATUS_LABELS
} from '@/types/reports'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

// dayjs timezone設定
dayjs.extend(utc)
dayjs.extend(timezone)

// =============================================================================
// TYPES
// =============================================================================

interface ApprovalListScreenState {
  reports: Report[]
  loading: boolean
  refreshing: boolean
  error: string | null
  searchText: string
  selectedStatus: ReportStatus[]
  totalCount: number
}

interface ReportListItemProps {
  report: Report
  onPress: (report: Report) => void
  onQuickApproval?: (report: Report) => void
}

// =============================================================================
// COMPONENTS
// =============================================================================

const ReportListItem: React.FC<ReportListItemProps> = ({ 
  report, 
  onPress, 
  onQuickApproval 
}) => {
  const getStatusColor = (status: ReportStatus): string => {
    switch (status) {
      case 'submitted': return Colors.info
      case 'approved': return Colors.success
      case 'rejected': return Colors.error
      case 'draft': return Colors.warning
      default: return Colors.onSurface
    }
  }

  const formatWorkDate = (date: string): string => {
    return dayjs(date).format('MM/DD')
  }

  const formatSubmittedDate = (date?: string): string => {
    if (!date) return ''
    return dayjs(date).fromNow()
  }

  const handleQuickApproval = (e: any) => {
    e.stopPropagation()
    if (onQuickApproval && report.status === 'submitted') {
      onQuickApproval(report)
    }
  }

  return (
    <TouchableOpacity onPress={() => onPress(report)} style={styles.reportItem}>
      <Card variant="elevated" style={styles.reportCard}>
        {/* ヘッダー */}
        <View style={styles.reportHeader}>
          <View style={styles.reportHeaderLeft}>
            <Avatar.Text
              size={40}
              label="報"
              style={[styles.reportAvatar, { backgroundColor: getStatusColor(report.status) }]}
            />
            <View style={styles.reportInfo}>
              <StyledText variant="body" weight="semibold">
                {formatWorkDate(report.work_date)} の日報
              </StyledText>
              <StyledText variant="caption" color="secondary">
                作業時間: {report.work_hours}時間 / 進捗: {report.progress_rate}%
              </StyledText>
            </View>
          </View>
          
          <View style={styles.reportHeaderRight}>
            <Chip
              icon={report.status === 'submitted' ? 'clock-outline' : 'check-circle'}
              style={[styles.statusChip, { backgroundColor: getStatusColor(report.status) }]}
              textStyle={styles.statusChipText}
            >
              {REPORT_STATUS_LABELS[report.status]}
            </Chip>
            
            {report.attachments && report.attachments.length > 0 && (
              <Badge size={16} style={styles.attachmentBadge}>
                {report.attachments.length}
              </Badge>
            )}
          </View>
        </View>

        {/* 作業内容プレビュー */}
        <View style={styles.contentPreview}>
          <StyledText variant="body" numberOfLines={2} style={styles.workContent}>
            {report.work_content}
          </StyledText>
          
          {report.work_site && (
            <StyledText variant="caption" color="secondary" style={styles.workSite}>
              📍 {report.work_site.name}
            </StyledText>
          )}
        </View>

        {/* アクションボタン */}
        <View style={styles.reportActions}>
          <View style={styles.reportMeta}>
            {report.submitted_at && (
              <StyledText variant="caption" color="secondary">
                提出: {formatSubmittedDate(report.submitted_at)}
              </StyledText>
            )}
          </View>
          
          {report.status === 'submitted' && onQuickApproval && (
            <StyledButton
              title="承認"
              variant="primary"
              size="sm"
              onPress={handleQuickApproval}
              style={styles.quickApprovalButton}
            />
          )}
        </View>
      </Card>
    </TouchableOpacity>
  )
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function ApprovalListScreen() {
  const { user } = useAuth()
  const [state, setState] = useState<ApprovalListScreenState>({
    reports: [],
    loading: true,
    refreshing: false,
    error: null,
    searchText: '',
    selectedStatus: ['submitted'],
    totalCount: 0
  })

  // 承認待ち日報の取得
  const loadPendingReports = useCallback(async (refresh = false) => {
    if (!user) return

    try {
      setState(prev => ({ 
        ...prev, 
        loading: !refresh, 
        refreshing: refresh,
        error: null 
      }))

      // 管理者権限チェック（簡易版）
      const canApprove = user.role === 'admin' || user.role === 'manager'
      if (!canApprove) {
        throw new Error('承認権限がありません')
      }

      let query = supabase
        .from('reports')
        .select(`
          *,
          work_site:work_sites(id, name, address),
          user:users!user_id(id, full_name),
          attachments:report_attachments(*)
        `)
        .eq('user_id', user.company_id) // 同じ会社のユーザーの日報のみ

      // ステータスフィルター
      if (state.selectedStatus.length > 0) {
        query = query.in('status', state.selectedStatus)
      }

      // 検索テキストフィルター
      if (state.searchText.trim()) {
        query = query.ilike('work_content', `%${state.searchText}%`)
      }

      const { data, error, count } = await query
        .order('submitted_at', { ascending: false })
        .order('work_date', { ascending: false })
        .limit(50)

      if (error) throw error

      setState(prev => ({
        ...prev,
        reports: data || [],
        totalCount: count || 0,
        loading: false,
        refreshing: false
      }))

    } catch (error) {
      console.error('承認待ち日報取得エラー:', error)
      setState(prev => ({
        ...prev,
        loading: false,
        refreshing: false,
        error: error instanceof Error ? error.message : 'データの取得に失敗しました'
      }))
    }
  }, [user, state.searchText, state.selectedStatus])

  useEffect(() => {
    loadPendingReports()
  }, [loadPendingReports])

  // リフレッシュ処理
  const handleRefresh = useCallback(() => {
    loadPendingReports(true)
  }, [loadPendingReports])

  // 検索処理
  const handleSearch = useCallback((text: string) => {
    setState(prev => ({ ...prev, searchText: text }))
  }, [])

  // ステータスフィルター変更
  const toggleStatusFilter = useCallback((status: ReportStatus) => {
    setState(prev => {
      const newSelected = prev.selectedStatus.includes(status)
        ? prev.selectedStatus.filter(s => s !== status)
        : [...prev.selectedStatus, status]
      return { ...prev, selectedStatus: newSelected }
    })
  }, [])

  // 日報詳細画面へ遷移
  const handleReportPress = useCallback((report: Report) => {
    router.push(`/reports/detail/${report.id}`)
  }, [])

  // クイック承認処理
  const handleQuickApproval = useCallback(async (report: Report) => {
    try {
      Alert.alert(
        '確認',
        `${dayjs(report.work_date).format('MM月DD日')}の日報を承認しますか？`,
        [
          { text: 'キャンセル', style: 'cancel' },
          {
            text: '承認',
            style: 'default',
            onPress: async () => {
              const { error } = await supabase
                .from('reports')
                .update({
                  status: 'approved',
                  approved_at: new Date().toISOString(),
                  approved_by: user?.id
                })
                .eq('id', report.id)

              if (error) throw error

              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
              Alert.alert('承認完了', '日報を承認しました')
              
              // リストを更新
              handleRefresh()
            }
          }
        ]
      )
    } catch (error) {
      console.error('クイック承認エラー:', error)
      Alert.alert('エラー', '承認処理に失敗しました')
    }
  }, [user, handleRefresh])

  // ヘッダーレンダリング
  const renderHeader = () => (
    <Surface style={styles.header}>
      <IconButton
        icon="arrow-left"
        size={24}
        onPress={() => router.back()}
      />
      <View style={styles.headerCenter}>
        <StyledText variant="title" weight="semibold">承認待ち日報</StyledText>
        {state.totalCount > 0 && (
          <Badge style={styles.headerBadge}>{state.totalCount}</Badge>
        )}
      </View>
      <IconButton
        icon="refresh"
        size={24}
        onPress={handleRefresh}
      />
    </Surface>
  )

  // フィルターレンダリング
  const renderFilters = () => (
    <Surface style={styles.filtersContainer}>
      {/* 検索バー */}
      <SearchBar
        placeholder="作業内容で検索..."
        value={state.searchText}
        onChangeText={handleSearch}
        style={styles.searchBar}
      />
      
      {/* ステータスフィルター */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statusFilters}>
        {(['submitted', 'approved', 'rejected'] as ReportStatus[]).map(status => (
          <Chip
            key={status}
            selected={state.selectedStatus.includes(status)}
            onPress={() => toggleStatusFilter(status)}
            style={styles.statusFilterChip}
          >
            {REPORT_STATUS_LABELS[status]}
          </Chip>
        ))}
      </ScrollView>
    </Surface>
  )

  // エラー表示
  if (state.error) {
    return (
      <SafeAreaView style={styles.container}>
        {renderHeader()}
        <View style={styles.errorContainer}>
          <StyledText variant="body" color="error" align="center">
            {state.error}
          </StyledText>
          <StyledButton
            title="再試行"
            variant="outline"
            onPress={() => loadPendingReports()}
            style={styles.retryButton}
          />
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}
      
      {renderFilters()}
      
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={state.refreshing}
            onRefresh={handleRefresh}
            colors={[Colors.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {state.loading && state.reports.length === 0 ? (
          <View style={styles.loadingContainer}>
            <StyledText variant="body" color="secondary" align="center">
              読み込み中...
            </StyledText>
          </View>
        ) : state.reports.length === 0 ? (
          <View style={styles.emptyContainer}>
            <StyledText variant="body" color="secondary" align="center">
              {state.selectedStatus.includes('submitted') 
                ? '承認待ちの日報はありません'
                : '条件に一致する日報がありません'
              }
            </StyledText>
          </View>
        ) : (
          state.reports.map(report => (
            <ReportListItem
              key={report.id}
              report={report}
              onPress={handleReportPress}
              onQuickApproval={report.status === 'submitted' ? handleQuickApproval : undefined}
            />
          ))
        )}
      </ScrollView>

      {/* 新規作成FAB */}
      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => router.push('/reports/create')}
        label="新規作成"
      />
    </SafeAreaView>
  )
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    ...Shadows.small,
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  headerBadge: {
    backgroundColor: Colors.primary,
  },
  
  // Filters
  filtersContainer: {
    padding: Spacing.md,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  searchBar: {
    marginBottom: Spacing.md,
    backgroundColor: Colors.surfaceVariant,
  },
  statusFilters: {
    flexDirection: 'row',
  },
  statusFilterChip: {
    marginRight: Spacing.sm,
  },
  
  // Content
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.md,
    paddingBottom: Spacing['4xl'], // FABのためのスペース
  },
  
  // Report List Item
  reportItem: {
    marginBottom: Spacing.md,
  },
  reportCard: {
    padding: Spacing.md,
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  reportHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: Spacing.md,
  },
  reportAvatar: {
    backgroundColor: Colors.primary,
  },
  reportInfo: {
    flex: 1,
  },
  reportHeaderRight: {
    alignItems: 'flex-end',
    gap: Spacing.xs,
  },
  statusChip: {
    height: 28,
  },
  statusChipText: {
    color: Colors.onPrimary,
    fontSize: 12,
    fontWeight: '600',
  },
  attachmentBadge: {
    backgroundColor: Colors.secondary,
  },
  
  // Content Preview
  contentPreview: {
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  workContent: {
    lineHeight: 20,
  },
  workSite: {
    fontStyle: 'italic',
  },
  
  // Actions
  reportActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.outline,
  },
  reportMeta: {
    flex: 1,
  },
  quickApprovalButton: {
    minWidth: 80,
  },
  
  // States
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing['2xl'],
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing['2xl'],
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  retryButton: {
    minWidth: 120,
  },
  
  // FAB
  fab: {
    position: 'absolute',
    right: Spacing.md,
    bottom: Spacing.md,
    backgroundColor: Colors.primary,
  },
})