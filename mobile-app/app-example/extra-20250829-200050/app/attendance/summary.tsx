/**
 * 勤怠集計画面
 */

import React, { useState, useEffect } from 'react'
import {
  View,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
} from 'react-native'
import {
  Surface,
  Text,
  Button,
  IconButton,
  DataTable,
  Card,
  Chip,
} from 'react-native-paper'
import { router } from 'expo-router'
import * as Haptics from 'expo-haptics'

interface AttendanceRecord {
  date: string
  startTime: string
  endTime: string
  breakTime: number
  workHours: number
  status: 'normal' | 'overtime' | 'late' | 'early'
}

export default function AttendanceSummaryScreen() {
  const [selectedMonth, setSelectedMonth] = useState('2024-01')
  const [attendanceData, setAttendanceData] = useState<AttendanceRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Mock data
  useEffect(() => {
    const mockData: AttendanceRecord[] = [
      {
        date: '2024-01-15',
        startTime: '08:00',
        endTime: '17:00',
        breakTime: 1,
        workHours: 8,
        status: 'normal'
      },
      {
        date: '2024-01-16',
        startTime: '08:30',
        endTime: '18:30',
        breakTime: 1,
        workHours: 9,
        status: 'overtime'
      },
      {
        date: '2024-01-17',
        startTime: '08:15',
        endTime: '17:00',
        breakTime: 1,
        workHours: 7.75,
        status: 'late'
      },
    ]
    
    setTimeout(() => {
      setAttendanceData(mockData)
      setIsLoading(false)
    }, 1000)
  }, [selectedMonth])

  const totalWorkHours = attendanceData.reduce((sum, record) => sum + record.workHours, 0)
  const totalWorkDays = attendanceData.length
  const overtimeDays = attendanceData.filter(record => record.status === 'overtime').length

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'normal': return '#4CAF50'
      case 'overtime': return '#FF9800'
      case 'late': return '#F44336'
      case 'early': return '#2196F3'
      default: return '#9E9E9E'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'normal': return '通常'
      case 'overtime': return '残業'
      case 'late': return '遅刻'
      case 'early': return '早退'
      default: return ''
    }
  }

  const handleExport = () => {
    if (Haptics) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    }
    Alert.alert('準備中', 'CSV出力機能は準備中です')
  }

  const renderHeader = () => (
    <Surface style={styles.header}>
      <IconButton
        icon="arrow-left"
        size={24}
        onPress={() => router.back()}
      />
      <Text variant="headlineSmall" style={styles.headerTitle}>勤怠集計</Text>
      <IconButton
        icon="download"
        size={24}
        onPress={handleExport}
      />
    </Surface>
  )

  const renderSummaryCards = () => (
    <View style={styles.summaryContainer}>
      <Card style={styles.summaryCard}>
        <Card.Content style={styles.summaryCardContent}>
          <Text variant="bodySmall" style={styles.summaryLabel}>総勤務時間</Text>
          <Text variant="headlineMedium" style={styles.summaryValue}>
            {totalWorkHours.toFixed(1)}h
          </Text>
        </Card.Content>
      </Card>

      <Card style={styles.summaryCard}>
        <Card.Content style={styles.summaryCardContent}>
          <Text variant="bodySmall" style={styles.summaryLabel}>勤務日数</Text>
          <Text variant="headlineMedium" style={styles.summaryValue}>
            {totalWorkDays}日
          </Text>
        </Card.Content>
      </Card>

      <Card style={styles.summaryCard}>
        <Card.Content style={styles.summaryCardContent}>
          <Text variant="bodySmall" style={styles.summaryLabel}>残業日数</Text>
          <Text variant="headlineMedium" style={styles.summaryValue}>
            {overtimeDays}日
          </Text>
        </Card.Content>
      </Card>
    </View>
  )

  const renderDataTable = () => (
    <Surface style={styles.tableContainer}>
      <Text variant="titleMedium" style={styles.tableTitle}>勤怠詳細</Text>
      
      <DataTable>
        <DataTable.Header>
          <DataTable.Title>日付</DataTable.Title>
          <DataTable.Title numeric>開始</DataTable.Title>
          <DataTable.Title numeric>終了</DataTable.Title>
          <DataTable.Title numeric>時間</DataTable.Title>
          <DataTable.Title>状態</DataTable.Title>
        </DataTable.Header>

        {attendanceData.map((record, index) => (
          <DataTable.Row key={index}>
            <DataTable.Cell>{record.date.slice(5)}</DataTable.Cell>
            <DataTable.Cell numeric>{record.startTime}</DataTable.Cell>
            <DataTable.Cell numeric>{record.endTime}</DataTable.Cell>
            <DataTable.Cell numeric>{record.workHours}h</DataTable.Cell>
            <DataTable.Cell>
              <Chip
                compact
                style={{ backgroundColor: getStatusColor(record.status) }}
                textStyle={{ color: 'white', fontSize: 10 }}
              >
                {getStatusLabel(record.status)}
              </Chip>
            </DataTable.Cell>
          </DataTable.Row>
        ))}
      </DataTable>
    </Surface>
  )

  return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}
      
      <ScrollView style={styles.content}>
        {renderSummaryCards()}
        {renderDataTable()}

        <View style={styles.actionContainer}>
          <Button
            mode="contained"
            onPress={handleExport}
            style={styles.exportButton}
            icon="download"
          >
            CSV出力
          </Button>
        </View>

        <View style={styles.bottomSpacing} />
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 8,
    elevation: 2,
  },
  headerTitle: {
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  summaryContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  summaryCard: {
    flex: 1,
    elevation: 1,
  },
  summaryCardContent: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  summaryLabel: {
    color: '#666',
    marginBottom: 4,
  },
  summaryValue: {
    fontWeight: 'bold',
    color: '#007AFF',
  },
  tableContainer: {
    margin: 16,
    borderRadius: 12,
    elevation: 1,
  },
  tableTitle: {
    fontWeight: 'bold',
    padding: 16,
    paddingBottom: 8,
  },
  actionContainer: {
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  exportButton: {
    paddingVertical: 8,
  },
  bottomSpacing: {
    height: 80,
  },
})