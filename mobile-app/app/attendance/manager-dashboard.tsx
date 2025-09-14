/**
 * 勤怠ダッシュボード（管理者ビュー）
 * 管理者向けの社員カードグリッド表示画面
 */

import React, { useState, useEffect, useMemo } from 'react'
import {
  View,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  FlatList,
  Alert,
  RefreshControl,
  Dimensions,
} from 'react-native'
import { router } from 'expo-router'
import { Surface, IconButton, Text, useTheme, Chip, FAB, Button, Divider, ActivityIndicator } from 'react-native-paper'
import dayjs from 'dayjs'
import 'dayjs/locale/ja'
import { MaterialIcons } from '@expo/vector-icons'
import EmployeeCard from '../../components/attendance/EmployeeCard'
import { EmployeeCardData, DailyAttendanceDetail, AttendanceStatus } from '../../types/attendance'
import * as Haptics from 'expo-haptics'

// =============================================================================
// TYPES
// =============================================================================

const { width: screenWidth } = Dimensions.get('window')
const CARD_MARGIN = 8
const CARDS_PER_ROW = 2
const CARD_WIDTH = (screenWidth - (CARD_MARGIN * (CARDS_PER_ROW + 1))) / CARDS_PER_ROW

// Status filter options
type FilterOption = 'all' | AttendanceStatus

interface StatusFilterChip {
  key: FilterOption
  label: string
  color: string
  icon: string
}

// =============================================================================
// MAIN COMPONENT  
// =============================================================================

function ManagerDashboard() {
  const theme = useTheme()
  
  // State
  const [employees, setEmployees] = useState<EmployeeCardData[]>([])
  const [attendanceData, setAttendanceData] = useState<DailyAttendanceDetail[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [currentMonth, setCurrentMonth] = useState(dayjs().format('YYYY-MM'))
  const [statusFilter, setStatusFilter] = useState<FilterOption>('all')
  const [sortBy, setSortBy] = useState<'name' | 'hours' | 'days'>('name')

  useEffect(() => {
    loadEmployeeData()
  }, [currentMonth])

  // 社員データ読み込み
  const loadEmployeeData = async () => {
    setIsLoading(true)
    
    try {
      // Mock 社員データ
      const mockEmployees: EmployeeCardData[] = [
        {
          id: 'emp001',
          name: '佐藤 太郎',
          thisMonthDays: 22,
          totalHours: 176.5,
          overtimeDays: 5,
          status: 'normal',
        },
        {
          id: 'emp002', 
          name: '田中 花子',
          thisMonthDays: 20,
          totalHours: 160.0,
          overtimeDays: 3,
          status: 'overtime',
        },
        {
          id: 'emp003',
          name: '山田 次郎',
          thisMonthDays: 21,
          totalHours: 168.0,
          overtimeDays: 0,
          status: 'normal',
        },
        {
          id: 'emp004',
          name: '鈴木 三郎',
          thisMonthDays: 18,
          totalHours: 144.0,
          overtimeDays: 2,
          status: 'night_shift',
        },
        {
          id: 'emp005',
          name: '高橋 美子',
          thisMonthDays: 19,
          totalHours: 152.0,
          overtimeDays: 1,
          status: 'normal',
        },
        {
          id: 'emp006',
          name: '渡辺 健一',
          thisMonthDays: 0,
          totalHours: 0,
          overtimeDays: 0,
          status: 'holiday',
        },
        {
          id: 'emp007',
          name: '伊藤 涼子',
          thisMonthDays: 23,
          totalHours: 184.0,
          overtimeDays: 8,
          status: 'overtime',
        },
        {
          id: 'emp008',
          name: '中村 大輔',
          thisMonthDays: 22,
          totalHours: 176.0,
          overtimeDays: 4,
          status: 'normal',
        },
      ]
      
      // Mock 勤怠詳細データ
      const mockAttendanceData: DailyAttendanceDetail[] = []
      
      // 各社員の1ヶ月分のデータを生成
      mockEmployees.forEach(employee => {
        const daysInMonth = dayjs(currentMonth).daysInMonth()
        
        for (let day = 1; day <= daysInMonth; day++) {
          const date = dayjs(currentMonth).date(day).format('YYYY-MM-DD')
          const isWeekend = dayjs(date).day() === 0 || dayjs(date).day() === 6
          const isPresent = !isWeekend && Math.random() > 0.1 // 90%出勤率
          
          if (isPresent) {
            const startHour = 8 + Math.floor(Math.random() * 2) // 8-9時開始
            const endHour = 17 + Math.floor(Math.random() * 3) // 17-19時終了
            const totalHours = endHour - startHour
            
            mockAttendanceData.push({
              date,
              clockIn: `${startHour.toString().padStart(2, '0')}:${Math.floor(Math.random() * 60).toString().padStart(2, '0')}`,
              clockOut: `${endHour.toString().padStart(2, '0')}:${Math.floor(Math.random() * 60).toString().padStart(2, '0')}`,
              workSite: ['渋谷現場A', '新宿現場B', '品川現場C'][Math.floor(Math.random() * 3)],
              status: Math.random() > 0.8 ? 'overtime' : 'normal',
              totalHours,
              breakHours: 1,
              workType: 'construction',
              isPresent: true,
            })
          } else {
            mockAttendanceData.push({
              date,
              status: isWeekend ? 'holiday' : 'holiday',
              totalHours: 0,
              breakHours: 0,
              workType: 'construction',
              isPresent: false,
            })
          }
        }
      })
      
      setEmployees(mockEmployees)
      setAttendanceData(mockAttendanceData)
      
    } catch (error) {
      console.error('社員データ読み込みエラー:', error)
      Alert.alert('エラー', 'データの読み込みに失敗しました')
    } finally {
      setIsLoading(false)
    }
  }

  // 社員カードタップハンドラー
  const handleEmployeePress = (employeeId: string) => {
    if (Haptics) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    }
    router.push(`/attendance/employee-detail/${employeeId}`)
  }

  const handleStatusFilterChange = (filter: FilterOption) => {
    if (Haptics) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    }
    setStatusFilter(filter)
  }

  const handleSortChange = () => {
    if (Haptics) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    }
    const sortOptions: ('name' | 'hours' | 'days')[] = ['name', 'hours', 'days']
    const currentIndex = sortOptions.indexOf(sortBy)
    const nextIndex = (currentIndex + 1) % sortOptions.length
    setSortBy(sortOptions[nextIndex])
  }

  const getSortLabel = (): string => {
    switch (sortBy) {
      case 'name': return '名前順'
      case 'hours': return '時間順'
      case 'days': return '日数順'
      default: return '名前順'
    }
  }

  // リフレッシュ
  const onRefresh = async () => {
    setRefreshing(true)
    await loadEmployeeData()
    setRefreshing(false)
  }

  // 社員カードリストのレンダー
  const renderEmployeeCard = ({ item, index }: { item: EmployeeCardData; index: number }) => {
    return (
      <View style={[styles.cardWrapper, { width: CARD_WIDTH }]}>
        <EmployeeCard 
          employee={item} 
          onPress={handleEmployeePress}
        />
      </View>
    )
  }

  const renderStatusFilterChips = () => (
    <View style={styles.filterContainer}>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterScrollContainer}
      >
        {statusFilterChips.map((chip) => {
          const isSelected = statusFilter === chip.key
          return (
            <Chip
              key={chip.key}
              mode={isSelected ? 'flat' : 'outlined'}
              selected={isSelected}
              onPress={() => handleStatusFilterChange(chip.key)}
              style={[
                styles.filterChip,
                isSelected && { backgroundColor: `${chip.color}20` }
              ]}
              textStyle={[{
                color: isSelected ? chip.color : theme.colors.onSurfaceVariant,
                fontWeight: isSelected ? '600' : '400'
              }]}
              icon={({ size }) => (
                <MaterialIcons 
                  name={chip.icon as any} 
                  size={16} 
                  color={isSelected ? chip.color : theme.colors.onSurfaceVariant} 
                />
              )}
            >
              {chip.label}
            </Chip>
          )
        })}
      </ScrollView>
    </View>
  )

  // Status filter chips configuration
  const statusFilterChips: StatusFilterChip[] = [
    { key: 'all', label: '全て', color: theme.colors.primary, icon: 'group' },
    { key: 'normal', label: '通常勤務', color: '#4CAF50', icon: 'work' },
    { key: 'overtime', label: '残業', color: '#FF9800', icon: 'schedule' },
    { key: 'night_shift', label: '夜勤', color: '#3F51B5', icon: 'nights-stay' },
    { key: 'holiday', label: '休暇', color: '#9E9E9E', icon: 'event-busy' },
  ]

  // Filtered and sorted employees
  const filteredAndSortedEmployees = useMemo(() => {
    let filtered = employees
    
    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = employees.filter(emp => emp.status === statusFilter)
    }
    
    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name, 'ja')
        case 'hours':
          return b.totalHours - a.totalHours
        case 'days':
          return b.thisMonthDays - a.thisMonthDays
        default:
          return 0
      }
    })
    
    return sorted
  }, [employees, statusFilter, sortBy])

  // Enhanced monthly statistics with status breakdown
  const monthlyStats = useMemo(() => {
    const totalEmployees = employees.length
    const totalHours = employees.reduce((sum, emp) => sum + emp.totalHours, 0)
    const totalDays = employees.reduce((sum, emp) => sum + emp.thisMonthDays, 0)
    const overtimeEmployees = employees.filter(emp => emp.overtimeDays > 0).length
    
    // Status breakdown
    const statusBreakdown = {
      normal: employees.filter(emp => emp.status === 'normal').length,
      overtime: employees.filter(emp => emp.status === 'overtime').length,
      night_shift: employees.filter(emp => emp.status === 'night_shift').length,
      holiday: employees.filter(emp => emp.status === 'holiday').length,
    }
    
    // Average calculations
    const avgHoursPerEmployee = totalEmployees > 0 ? totalHours / totalEmployees : 0
    const avgDaysPerEmployee = totalEmployees > 0 ? totalDays / totalEmployees : 0
    
    return {
      totalEmployees,
      totalHours,
      totalDays,
      overtimeEmployees,
      statusBreakdown,
      avgHoursPerEmployee,
      avgDaysPerEmployee,
    }
  }, [employees])

  return (
    <SafeAreaView style={styles.container}>
      {/* Enhanced Header */}
      <Surface style={[styles.header, { backgroundColor: theme.colors.surface }]}>
        <View style={styles.headerRow}>
          <IconButton 
            icon="arrow-left" 
            onPress={() => router.back()}
            iconColor={theme.colors.onSurface}
            size={24}
          />
          <View style={styles.headerContent}>
            <Text variant="headlineSmall" style={[styles.headerTitle, { color: theme.colors.onSurface }]}>
              勤怠管理
            </Text>
            <Text variant="bodySmall" style={[styles.headerSubtitle, { color: theme.colors.onSurfaceVariant }]}>
              {dayjs(currentMonth).format('YYYY年MM月')} | {filteredAndSortedEmployees.length}/{employees.length}名
            </Text>
          </View>
          <View style={styles.headerActions}>
            <IconButton 
              icon="refresh" 
              onPress={onRefresh}
              disabled={refreshing}
              iconColor={theme.colors.onSurface}
              size={24}
            />
            <Button
              mode="outlined"
              onPress={handleSortChange}
              icon={({ size, color }) => (
                <MaterialIcons name="sort" size={16} color={color} />
              )}
              contentStyle={styles.sortButtonContent}
              labelStyle={styles.sortButtonLabel}
            >
              {getSortLabel()}
            </Button>
          </View>
        </View>
      </Surface>

      {/* Enhanced Monthly Statistics */}
      <Surface style={[styles.statsHeader, { backgroundColor: theme.colors.surfaceVariant }]}>
        <Text variant="titleMedium" style={[styles.statsTitle, { color: theme.colors.onSurface }]}>
          月次統計概要
        </Text>
        
        {/* Primary Stats */}
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Text variant="headlineSmall" style={[styles.statValue, { color: theme.colors.primary }]}>
              {monthlyStats.totalEmployees}
            </Text>
            <Text variant="bodySmall" style={[styles.statLabel, { color: theme.colors.onSurfaceVariant }]}>
              総職人数
            </Text>
          </View>
          
          <View style={styles.statItem}>
            <Text variant="headlineSmall" style={[styles.statValue, { color: theme.colors.primary }]}>
              {monthlyStats.totalDays}
            </Text>
            <Text variant="bodySmall" style={[styles.statLabel, { color: theme.colors.onSurfaceVariant }]}>
              総出面日数
            </Text>
          </View>
          
          <View style={styles.statItem}>
            <Text variant="headlineSmall" style={[styles.statValue, { color: theme.colors.primary }]}>
              {monthlyStats.totalHours.toFixed(0)}
            </Text>
            <Text variant="bodySmall" style={[styles.statLabel, { color: theme.colors.onSurfaceVariant }]}>
              総労働時間
            </Text>
          </View>
          
          <View style={styles.statItem}>
            <Text variant="headlineSmall" style={[styles.statValue, { color: theme.colors.tertiary }]}>
              {monthlyStats.overtimeEmployees}
            </Text>
            <Text variant="bodySmall" style={[styles.statLabel, { color: theme.colors.onSurfaceVariant }]}>
              残業者数
            </Text>
          </View>
        </View>
        
        <Divider style={styles.statsDivider} />
        
        {/* Status Breakdown */}
        <View style={styles.statusBreakdownContainer}>
          <Text variant="titleSmall" style={[styles.statusBreakdownTitle, { color: theme.colors.onSurface }]}>
            勤務状況別内訳
          </Text>
          <View style={styles.statusBreakdownGrid}>
            <View style={styles.statusBreakdownItem}>
              <View style={[styles.statusIndicator, { backgroundColor: '#4CAF50' }]} />
              <Text variant="bodySmall" style={[styles.statusBreakdownLabel, { color: theme.colors.onSurfaceVariant }]}>
                通常勤務: {monthlyStats.statusBreakdown.normal}名
              </Text>
            </View>
            <View style={styles.statusBreakdownItem}>
              <View style={[styles.statusIndicator, { backgroundColor: '#FF9800' }]} />
              <Text variant="bodySmall" style={[styles.statusBreakdownLabel, { color: theme.colors.onSurfaceVariant }]}>
                残業: {monthlyStats.statusBreakdown.overtime}名
              </Text>
            </View>
            <View style={styles.statusBreakdownItem}>
              <View style={[styles.statusIndicator, { backgroundColor: '#3F51B5' }]} />
              <Text variant="bodySmall" style={[styles.statusBreakdownLabel, { color: theme.colors.onSurfaceVariant }]}>
                夜勤: {monthlyStats.statusBreakdown.night_shift}名
              </Text>
            </View>
            <View style={styles.statusBreakdownItem}>
              <View style={[styles.statusIndicator, { backgroundColor: '#9E9E9E' }]} />
              <Text variant="bodySmall" style={[styles.statusBreakdownLabel, { color: theme.colors.onSurfaceVariant }]}>
                休暇: {monthlyStats.statusBreakdown.holiday}名
              </Text>
            </View>
          </View>
        </View>
      </Surface>
      
      {/* Status Filter Chips */}
      {renderStatusFilterChips()}

      {/* Employee Cards Grid with Enhanced Loading/Empty States */}
      <View style={styles.content}>
        {isLoading && !refreshing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text variant="bodyLarge" style={[styles.loadingText, { color: theme.colors.onSurface }]}>
              職人データを読み込み中...
            </Text>
          </View>
        ) : filteredAndSortedEmployees.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialIcons name="group" size={64} color={theme.colors.onSurfaceVariant} />
            <Text variant="headlineSmall" style={[styles.emptyTitle, { color: theme.colors.onSurface }]}>
              {statusFilter === 'all' ? '職人データがありません' : `${statusFilterChips.find(chip => chip.key === statusFilter)?.label}の職人がいません`}
            </Text>
            <Text variant="bodyMedium" style={[styles.emptyMessage, { color: theme.colors.onSurfaceVariant }]}>
              {statusFilter !== 'all' ? 'フィルターを変更してください' : '職人を追加してから再度お試しください'}
            </Text>
            {statusFilter !== 'all' && (
              <Button
                mode="outlined"
                onPress={() => setStatusFilter('all')}
                style={styles.resetFilterButton}
                icon="refresh"
              >
                フィルターをリセット
              </Button>
            )}
          </View>
        ) : (
          <FlatList
            data={filteredAndSortedEmployees}
            renderItem={renderEmployeeCard}
            keyExtractor={(item) => item.id}
            numColumns={CARDS_PER_ROW}
            contentContainerStyle={styles.cardGrid}
            columnWrapperStyle={styles.cardRow}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl 
                refreshing={refreshing} 
                onRefresh={onRefresh}
                colors={[theme.colors.primary]}
                tintColor={theme.colors.primary}
                title="更新中..."
                titleColor={theme.colors.onSurface}
              />
            }
            ListHeaderComponent={
              <View style={styles.listHeader}>
                <Text variant="bodyMedium" style={[styles.resultCount, { color: theme.colors.onSurfaceVariant }]}>
                  {filteredAndSortedEmployees.length}人の職人を表示中
                </Text>
              </View>
            }
          />
        )}
      </View>
      
      {/* Enhanced FAB for Quick Actions */}
      <FAB
        icon={({ size, color }) => (
          <MaterialIcons name="add" size={size} color={color} />
        )}
        style={[styles.fab, { backgroundColor: '#4CAF50' }]}
        onPress={() => {
          if (Haptics) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
          }
          Alert.alert('準備中', '職人追加機能は準備中です')
        }}
        label="職人追加"
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
    backgroundColor: '#F5F5F5',
  },
  header: {
    paddingHorizontal: 8,
    paddingVertical: 8,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontWeight: '600',
  },
  headerSubtitle: {
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sortButtonContent: {
    height: 36,
    paddingHorizontal: 12,
  },
  sortButtonLabel: {
    fontSize: 12,
  },
  statsHeader: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 12,
    borderRadius: 12,
    elevation: 1,
  },
  statsTitle: {
    fontWeight: '600',
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontWeight: '700',
    marginBottom: 4,
  },
  statLabel: {
    textAlign: 'center',
    fontSize: 12,
  },
  statsDivider: {
    marginVertical: 12,
  },
  statusBreakdownContainer: {
    marginTop: 8,
  },
  statusBreakdownTitle: {
    fontWeight: '600',
    marginBottom: 8,
  },
  statusBreakdownGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusBreakdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
    marginBottom: 4,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusBreakdownLabel: {
    fontSize: 12,
  },
  filterContainer: {
    paddingVertical: 8,
  },
  filterScrollContainer: {
    paddingHorizontal: 16,
  },
  filterChip: {
    marginRight: 8,
    height: 36,
  },
  content: {
    flex: 1,
    paddingHorizontal: CARD_MARGIN,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  loadingText: {
    marginTop: 16,
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 80,
  },
  emptyTitle: {
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyMessage: {
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  resetFilterButton: {
    marginTop: 8,
  },
  listHeader: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  resultCount: {
    fontSize: 12,
  },
  cardGrid: {
    paddingBottom: 100, // Extra padding for FAB
  },
  cardRow: {
    justifyContent: 'space-between',
  },
  cardWrapper: {
    marginBottom: CARD_MARGIN,
  },
  fab: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    borderRadius: 16,
  },
})

export default ManagerDashboard