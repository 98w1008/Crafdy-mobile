/**
 * 社員別勤怠詳細画面
 * 動的ルーティングで個別の社員の勤怠詳細を表示
 */

import React, { useState, useEffect } from 'react'
import {
  View,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Alert,
} from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { Surface, IconButton, Text, useTheme, ActivityIndicator } from 'react-native-paper'
import dayjs from 'dayjs'
import 'dayjs/locale/ja'
import EmployeeDetail from '../../../components/attendance/EmployeeDetail'
import { EmployeeCardData, DailyAttendanceDetail } from '../../../types/attendance'

export default function EmployeeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const theme = useTheme()
  
  // State
  const [employee, setEmployee] = useState<EmployeeCardData | null>(null)
  const [attendanceData, setAttendanceData] = useState<DailyAttendanceDetail[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (id) {
      loadEmployeeDetail(id)
    }
  }, [id])

  // 社員詳細データ読み込み
  const loadEmployeeDetail = async (employeeId: string) => {
    setIsLoading(true)
    
    try {
      // Mock 社員データ - 実際の実装では API からデータを取得
      const mockEmployees: Record<string, EmployeeCardData> = {
        'emp001': {
          id: 'emp001',
          name: '佐藤 太郎',
          thisMonthDays: 22,
          totalHours: 176.5,
          overtimeDays: 5,
          status: 'normal',
        },
        'emp002': {
          id: 'emp002', 
          name: '田中 花子',
          thisMonthDays: 20,
          totalHours: 160.0,
          overtimeDays: 3,
          status: 'overtime',
        },
        'emp003': {
          id: 'emp003',
          name: '山田 次郎',
          thisMonthDays: 21,
          totalHours: 168.0,
          overtimeDays: 0,
          status: 'normal',
        },
        'emp004': {
          id: 'emp004',
          name: '鈴木 三郎',
          thisMonthDays: 18,
          totalHours: 144.0,
          overtimeDays: 2,
          status: 'night_shift',
        },
        'emp005': {
          id: 'emp005',
          name: '高橋 美子',
          thisMonthDays: 19,
          totalHours: 152.0,
          overtimeDays: 1,
          status: 'normal',
        },
        'emp006': {
          id: 'emp006',
          name: '渡辺 健一',
          thisMonthDays: 0,
          totalHours: 0,
          overtimeDays: 0,
          status: 'holiday',
        },
        'emp007': {
          id: 'emp007',
          name: '伊藤 涼子',
          thisMonthDays: 23,
          totalHours: 184.0,
          overtimeDays: 8,
          status: 'overtime',
        },
        'emp008': {
          id: 'emp008',
          name: '中村 大輔',
          thisMonthDays: 22,
          totalHours: 176.0,
          overtimeDays: 4,
          status: 'normal',
        },
      }

      const employeeData = mockEmployees[employeeId]
      if (!employeeData) {
        Alert.alert('エラー', '指定された社員が見つかりません')
        router.back()
        return
      }

      setEmployee(employeeData)

      // Mock 勤怠詳細データを生成
      const currentMonth = dayjs().format('YYYY-MM')
      const daysInMonth = dayjs(currentMonth).daysInMonth()
      const mockAttendanceData: DailyAttendanceDetail[] = []

      for (let day = 1; day <= daysInMonth; day++) {
        const date = dayjs(currentMonth).date(day).format('YYYY-MM-DD')
        const isWeekend = dayjs(date).day() === 0 || dayjs(date).day() === 6
        const isPresent = !isWeekend && Math.random() > 0.15 // 85%出勤率

        if (isPresent) {
          const startHour = 8 + Math.floor(Math.random() * 2) // 8-9時開始
          const endHour = 17 + Math.floor(Math.random() * 3) // 17-19時終了
          const totalHours = endHour - startHour
          const hasOvertime = Math.random() > 0.7
          const status = hasOvertime ? 'overtime' : (Math.random() > 0.9 ? 'night_shift' : 'normal')

          mockAttendanceData.push({
            date,
            clockIn: `2024-01-${day.toString().padStart(2, '0')}T${startHour.toString().padStart(2, '0')}:${Math.floor(Math.random() * 60).toString().padStart(2, '0')}:00`,
            clockOut: `2024-01-${day.toString().padStart(2, '0')}T${endHour.toString().padStart(2, '0')}:${Math.floor(Math.random() * 60).toString().padStart(2, '0')}:00`,
            workSite: ['渋谷現場A', '新宿現場B', '品川現場C', '池袋現場D'][Math.floor(Math.random() * 4)],
            status,
            totalHours,
            breakHours: 1,
            workType: ['construction', 'equipment', 'management', 'safety', 'cleanup'][Math.floor(Math.random() * 5)] as any,
            isPresent: true,
          })
        } else {
          mockAttendanceData.push({
            date,
            status: isWeekend ? 'holiday' : (Math.random() > 0.5 ? 'holiday' : 'normal'),
            totalHours: 0,
            breakHours: 0,
            workType: 'construction',
            isPresent: false,
          })
        }
      }

      setAttendanceData(mockAttendanceData)

    } catch (error) {
      console.error('社員詳細読み込みエラー:', error)
      Alert.alert('エラー', 'データの読み込みに失敗しました')
      router.back()
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    router.back()
  }

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text variant="bodyLarge" style={[styles.loadingText, { color: theme.colors.onSurface }]}>
          読み込み中...
        </Text>
      </SafeAreaView>
    )
  }

  if (!employee) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text variant="headlineSmall" style={[styles.errorText, { color: theme.colors.error }]}>
            社員データが見つかりません
          </Text>
          <IconButton
            icon="arrow-left"
            mode="contained"
            onPress={handleClose}
            style={styles.backButton}
          />
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <EmployeeDetail
        employee={employee}
        attendanceData={attendanceData}
        onClose={handleClose}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  errorText: {
    textAlign: 'center',
    marginBottom: 32,
  },
  backButton: {
    alignSelf: 'center',
  },
})