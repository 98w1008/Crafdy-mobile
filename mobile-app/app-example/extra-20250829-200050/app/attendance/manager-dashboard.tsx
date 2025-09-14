/**
 * 勤怠ダッシュボード（管理者ビュー）
 * 管理者向けの社員カードグリッド表示画面
 */

import React, { useState, useEffect } from 'react'
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
import { Surface, IconButton, Text, useTheme } from 'react-native-paper'
import dayjs from 'dayjs'
import 'dayjs/locale/ja'
import EmployeeCard from '../../components/attendance/EmployeeCard'
import { EmployeeCardData, DailyAttendanceDetail } from '../../types/attendance'
import * as Haptics from 'expo-haptics'

// =============================================================================
// TYPES
// =============================================================================

const { width: screenWidth } = Dimensions.get('window')
const CARD_MARGIN = 8
const CARDS_PER_ROW = 2
const CARD_WIDTH = (screenWidth - (CARD_MARGIN * (CARDS_PER_ROW + 1))) / CARDS_PER_ROW

// =============================================================================
// MAIN COMPONENT  
// =============================================================================

export default function AttendanceManagerDashboard() {
  const theme = useTheme()
  
  // State
  const [employees, setEmployees] = useState<EmployeeCardData[]>([])
  const [attendanceData, setAttendanceData] = useState<DailyAttendanceDetail[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [currentMonth, setCurrentMonth] = useState(dayjs().format('YYYY-MM'))

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

  // 月次統計の計算
  const monthlyStats = {
    totalEmployees: employees.length,
    totalHours: employees.reduce((sum, emp) => sum + emp.totalHours, 0),
    totalDays: employees.reduce((sum, emp) => sum + emp.thisMonthDays, 0),
    overtimeEmployees: employees.filter(emp => emp.overtimeDays > 0).length,
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* ヘッダー */}
      <Surface style={[styles.header, { backgroundColor: theme.colors.surface }]}>
        <IconButton 
          icon="arrow-left" 
          onPress={() => router.back()}
          iconColor={theme.colors.onSurface}
        />
        <View style={styles.headerContent}>
          <Text variant="headlineSmall" style={[styles.headerTitle, { color: theme.colors.onSurface }]}>
            勤怠管理
          </Text>
          <Text variant="bodySmall" style={[styles.headerSubtitle, { color: theme.colors.onSurfaceVariant }]}>
            {dayjs(currentMonth).format('YYYY年MM月')} | {employees.length}名
          </Text>
        </View>
        <IconButton 
          icon="refresh" 
          onPress={onRefresh}
          disabled={refreshing}
          iconColor={theme.colors.onSurface}
        />
      </Surface>

      {/* 月次統計サマリー */}
      <Surface style={[styles.statsHeader, { backgroundColor: theme.colors.surfaceVariant }]}>
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Text variant="headlineSmall" style={[styles.statValue, { color: theme.colors.primary }]}>
              {monthlyStats.totalEmployees}
            </Text>
            <Text variant="bodySmall" style={[styles.statLabel, { color: theme.colors.onSurfaceVariant }]}>
              総社員数
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
      </Surface>

      {/* 社員カードグリッド */}
      <View style={styles.content}>
        <FlatList
          data={employees}
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
            />
          }
        />
      </View>
    </SafeAreaView>
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    elevation: 2,
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
  statsHeader: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 16,
    borderRadius: 12,
    elevation: 1,
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
  content: {
    flex: 1,
    paddingHorizontal: CARD_MARGIN,
  },
  cardGrid: {
    paddingBottom: 20,
  },
  cardRow: {
    justifyContent: 'space-between',
  },
  cardWrapper: {
    marginBottom: CARD_MARGIN,
  },
})