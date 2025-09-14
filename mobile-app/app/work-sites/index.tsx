/**
 * 現場一覧画面 - Work Sites Index
 * 現場の一覧表示と基本的な管理機能を提供
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
  Searchbar,
  Chip,
  FAB,
  Badge,
  Avatar,
  Divider
} from 'react-native-paper'
import { router } from 'expo-router'
import * as Haptics from 'expo-haptics'
import dayjs from 'dayjs'

import { Colors, Spacing, Typography, BorderRadius, Shadows } from '@/constants/Colors'
import { useColors } from '@/theme/ThemeProvider'
import { StyledText, StyledButton, Card } from '@/components/ui'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

// =============================================================================
// TYPES
// =============================================================================

interface WorkSite {
  id: string
  name: string
  address?: string
  status: 'active' | 'inactive' | 'completed'
  client_name?: string
  start_date?: string
  end_date?: string
  manager_id?: string
  notes?: string
  created_at: string
  updated_at: string
}

interface WorkSitesScreenState {
  workSites: WorkSite[]
  loading: boolean
  refreshing: boolean
  error: string | null
  searchText: string
  selectedStatus: string[]
  totalCount: number
}

interface WorkSiteListItemProps {
  workSite: WorkSite
  onPress: (workSite: WorkSite) => void
}

// =============================================================================
// COMPONENTS
// =============================================================================

const WorkSiteListItem: React.FC<WorkSiteListItemProps> = ({ 
  workSite, 
  onPress 
}) => {
  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'active': return Colors.semantic.success
      case 'completed': return Colors.semantic.info
      case 'inactive': return Colors.semantic.warning
      default: return Colors.text.primary
    }
  }

  const getStatusLabel = (status: string): string => {
    switch (status) {
      case 'active': return '進行中'
      case 'completed': return '完了'
      case 'inactive': return '停止中'
      default: return '不明'
    }
  }

  const formatDate = (date?: string): string => {
    if (!date) return ''
    return dayjs(date).format('MM/DD')
  }

  return (
    <TouchableOpacity onPress={() => onPress(workSite)} style={styles.workSiteItem}>
      <Card variant="elevated" style={styles.workSiteCard}>
        {/* ヘッダー */}
        <View style={styles.workSiteHeader}>
          <View style={styles.workSiteHeaderLeft}>
            <Avatar.Text
              size={40}
              label="現"
              style={[styles.workSiteAvatar, { backgroundColor: getStatusColor(workSite.status) }]}
            />
            <View style={styles.workSiteInfo}>
              <StyledText variant="body" weight="semibold">
                {workSite.name}
              </StyledText>
              {workSite.client_name && (
                <StyledText variant="caption" color="secondary">
                  {workSite.client_name}
                </StyledText>
              )}
            </View>
          </View>
          
          <View style={styles.workSiteHeaderRight}>
            <Chip
              icon={workSite.status === 'active' ? 'play' : workSite.status === 'completed' ? 'check' : 'pause'}
              style={[styles.statusChip, { backgroundColor: getStatusColor(workSite.status) }]}
              textStyle={styles.statusChipText}
            >
              {getStatusLabel(workSite.status)}
            </Chip>
          </View>
        </View>

        {/* 住所 */}
        {workSite.address && (
          <View style={styles.addressPreview}>
            <StyledText variant="caption" color="secondary" numberOfLines={1}>
              📍 {workSite.address}
            </StyledText>
          </View>
        )}

        {/* 期間情報 */}
        <View style={styles.workSiteActions}>
          <View style={styles.workSiteMeta}>
            {workSite.start_date && (
              <StyledText variant="caption" color="secondary">
                開始: {formatDate(workSite.start_date)}
                {workSite.end_date && ` - 終了: ${formatDate(workSite.end_date)}`}
              </StyledText>
            )}
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  )
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function WorkSitesScreen() {
  const { user } = useAuth()
  const themeColors = useColors()
  const [state, setState] = useState<WorkSitesScreenState>({
    workSites: [],
    loading: true,
    refreshing: false,
    error: null,
    searchText: '',
    selectedStatus: ['active'],
    totalCount: 0
  })

  // 現場データの取得
  const loadWorkSites = useCallback(async (refresh = false) => {
    if (!user) return

    try {
      setState(prev => ({ 
        ...prev, 
        loading: !refresh, 
        refreshing: refresh,
        error: null 
      }))

      if (!supabase) {
        throw new Error('Supabase is not initialized. Check EXPO_PUBLIC_SUPABASE_URL/ANON_KEY in env.')
      }

      let query = supabase
        .from('work_sites')
        .select('*', { count: 'exact', head: false })

      // ステータスフィルター
      if (state.selectedStatus.length > 0) {
        query = query.in('status', state.selectedStatus)
      }

      // 検索テキストフィルター
      if (state.searchText.trim()) {
        query = query.or(
          `name.ilike.%${state.searchText}%,address.ilike.%${state.searchText}%,client_name.ilike.%${state.searchText}%`
        )
      }

      const { data, error, count } = await query
        .order('updated_at', { ascending: false })
        .limit(50)

      if (error) throw error

      setState(prev => ({
        ...prev,
        workSites: data || [],
        totalCount: count || 0,
        loading: false,
        refreshing: false
      }))

    } catch (error) {
      console.error('現場データ取得エラー:', error)
      setState(prev => ({
        ...prev,
        loading: false,
        refreshing: false,
        error: error instanceof Error ? error.message : 'データの取得に失敗しました'
      }))
    }
  }, [user, state.searchText, state.selectedStatus])

  useEffect(() => {
    loadWorkSites()
  }, [loadWorkSites])

  // リフレッシュ処理
  const handleRefresh = useCallback(() => {
    loadWorkSites(true)
  }, [loadWorkSites])

  // 検索処理
  const handleSearch = useCallback((text: string) => {
    setState(prev => ({ ...prev, searchText: text }))
  }, [])

  // ステータスフィルター変更
  const toggleStatusFilter = useCallback((status: string) => {
    setState(prev => {
      const newSelected = prev.selectedStatus.includes(status)
        ? prev.selectedStatus.filter(s => s !== status)
        : [...prev.selectedStatus, status]
      return { ...prev, selectedStatus: newSelected }
    })
  }, [])

  // 現場詳細画面へ遷移
  const handleWorkSitePress = useCallback((workSite: WorkSite) => {
    router.push(`/work-sites/detail/${workSite.id}`)
  }, [])

  // ヘッダーレンダリング
  const renderHeader = () => (
    <Surface style={[styles.header, { backgroundColor: themeColors.surface, borderBottomColor: themeColors.border }]}>
      <IconButton
        icon="arrow-left"
        size={24}
        onPress={() => router.back()}
      />
      <View style={styles.headerCenter}>
        <StyledText variant="title" weight="semibold">現場管理</StyledText>
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
    <Surface style={[styles.filtersContainer, { backgroundColor: themeColors.surface, borderBottomColor: themeColors.border }]}>
      {/* 検索バー */}
      <Searchbar
        placeholder="現場名、住所、顧客名で検索..."
        value={state.searchText}
        onChangeText={handleSearch}
        style={[styles.searchBar, { backgroundColor: themeColors.background.secondary }]}
      />
      
      {/* ステータスフィルター */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statusFilters}>
        {(['active', 'completed', 'inactive'] as const).map(status => (
          <Chip
            key={status}
            selected={state.selectedStatus.includes(status)}
            onPress={() => toggleStatusFilter(status)}
            style={styles.statusFilterChip}
          >
            {status === 'active' ? '進行中' : status === 'completed' ? '完了' : '停止中'}
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
            onPress={() => loadWorkSites()}
            style={styles.retryButton}
          />
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background.primary }]}>
      {renderHeader()}
      
      {renderFilters()}
      
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={state.refreshing}
            onRefresh={handleRefresh}
            colors={[themeColors.primary?.DEFAULT || Colors.accent.DEFAULT]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {state.loading && state.workSites.length === 0 ? (
          <View style={styles.loadingContainer}>
            <StyledText variant="body" color="secondary" align="center">
              読み込み中...
            </StyledText>
          </View>
        ) : state.workSites.length === 0 ? (
          <View style={styles.emptyContainer}>
            <StyledText variant="body" color="secondary" align="center">
              {state.selectedStatus.includes('active') 
                ? '進行中の現場はありません'
                : '条件に一致する現場がありません'
              }
            </StyledText>
            <StyledButton
              title="新しい現場を登録"
              variant="outline"
              onPress={() => router.push('/work-sites/create')}
              style={styles.createButton}
            />
          </View>
        ) : (
          state.workSites.map(workSite => (
            <WorkSiteListItem
              key={workSite.id}
              workSite={workSite}
              onPress={handleWorkSitePress}
            />
          ))
        )}
      </ScrollView>

      {/* 新規作成FAB */}
      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => router.push('/work-sites/create')}
        label="新規現場"
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
    backgroundColor: Colors.light.background.primary,
  },
  
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.light.background.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border.light,
    ...Shadows.sm,
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  headerBadge: {
    backgroundColor: Colors.accent.DEFAULT,
  },
  
  // Filters
  filtersContainer: {
    padding: Spacing.md,
    backgroundColor: Colors.light.background.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border.light,
  },
  searchBar: {
    marginBottom: Spacing.md,
    backgroundColor: Colors.light.interactive.default,
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
  
  // Work Site List Item
  workSiteItem: {
    marginBottom: Spacing.md,
  },
  workSiteCard: {
    padding: Spacing.md,
  },
  workSiteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  workSiteHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: Spacing.md,
  },
  workSiteAvatar: {
    backgroundColor: Colors.accent.DEFAULT,
  },
  workSiteInfo: {
    flex: 1,
  },
  workSiteHeaderRight: {
    alignItems: 'flex-end',
  },
  statusChip: {
    height: 28,
  },
  statusChipText: {
    color: Colors.text.inverse,
    fontSize: 12,
    fontWeight: '600',
  },
  
  // Address Preview
  addressPreview: {
    marginBottom: Spacing.sm,
  },
  
  // Actions
  workSiteActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border.medium,
  },
  workSiteMeta: {
    flex: 1,
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
    gap: Spacing.md,
  },
  createButton: {
    minWidth: 160,
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
    backgroundColor: Colors.accent.DEFAULT,
  },
})
