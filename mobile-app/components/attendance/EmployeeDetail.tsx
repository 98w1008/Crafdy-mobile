import React, { useState, useMemo } from 'react';
import { View, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { Surface, Text, Avatar, Card, Chip, useTheme, Divider, Button } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import 'dayjs/locale/ja';
import { EmployeeCardData, DailyAttendanceDetail, AttendanceStatus } from '../../types/attendance';
import CalendarView from './CalendarView';
import DailyTimeList from './DailyTimeList';

interface EmployeeDetailProps {
  employee: EmployeeCardData;
  attendanceData: DailyAttendanceDetail[];
  onClose?: () => void;
}

const { width: screenWidth } = Dimensions.get('window');

const EmployeeDetail: React.FC<EmployeeDetailProps> = ({
  employee,
  attendanceData,
  onClose,
}) => {
  const theme = useTheme();
  const [selectedDate, setSelectedDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [currentMonth, setCurrentMonth] = useState(dayjs().format('YYYY-MM'));

  const getStatusColor = (status: AttendanceStatus): string => {
    switch (status) {
      case 'normal': return theme.colors.primary;
      case 'overtime': return theme.colors.tertiary;
      case 'night_shift': return theme.colors.secondary;
      case 'holiday': return theme.colors.outline;
      default: return theme.colors.primary;
    }
  };

  const getStatusText = (status: AttendanceStatus): string => {
    switch (status) {
      case 'normal': return '通常勤務';
      case 'overtime': return '残業';
      case 'night_shift': return '夜勤';
      case 'holiday': return '休暇';
      default: return '通常勤務';
    }
  };

  // 今月の統計データを計算
  const monthlyStats = useMemo(() => {
    const currentMonthData = attendanceData.filter(
      record => dayjs(record.date).format('YYYY-MM') === currentMonth
    );

    const workingDays = currentMonthData.filter(record => record.isPresent);
    const totalHours = workingDays.reduce((sum, record) => sum + record.totalHours, 0);
    const overtimeDays = workingDays.filter(record => record.status === 'overtime').length;
    const nightShiftDays = workingDays.filter(record => record.status === 'night_shift').length;
    const averageHours = workingDays.length > 0 ? totalHours / workingDays.length : 0;

    return {
      workingDays: workingDays.length,
      totalHours,
      overtimeDays,
      nightShiftDays,
      averageHours,
      attendanceRate: (workingDays.length / currentMonthData.length) * 100,
    };
  }, [attendanceData, currentMonth]);

  // 選択日の詳細データ
  const selectedDayDetail = useMemo(() => {
    return attendanceData.find(record => record.date === selectedDate);
  }, [attendanceData, selectedDate]);

  const handleDateSelect = (date: string) => {
    setSelectedDate(date);
  };

  const handleMonthChange = (month: string) => {
    setCurrentMonth(month);
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* ヘッダー */}
      <Surface style={[styles.header, { backgroundColor: theme.colors.surface }]}>
        <View style={styles.headerContent}>
          <View style={styles.employeeInfo}>
            <Avatar.Text
              size={64}
              label={employee.name.charAt(0)}
              style={[styles.avatar, { backgroundColor: getStatusColor(employee.status) }]}
            />
            <View style={styles.employeeDetails}>
              <Text variant="headlineSmall" style={[styles.employeeName, { color: theme.colors.onSurface }]}>
                {employee.name}
              </Text>
              <Chip
                mode="flat"
                style={[styles.statusChip, { backgroundColor: `${getStatusColor(employee.status)}20` }]}
                textStyle={{ color: getStatusColor(employee.status), fontSize: 12 }}
                icon={({ size, color }) => (
                  <MaterialIcons name="work" size={16} color={color} />
                )}
              >
                {getStatusText(employee.status)}
              </Chip>
              <Text variant="bodySmall" style={[styles.monthLabel, { color: theme.colors.onSurfaceVariant }]}>
                {dayjs(currentMonth).format('YYYY年MM月')} の勤怠状況
              </Text>
            </View>
          </View>
          
          {onClose && (
            <Button
              mode="text"
              onPress={onClose}
              contentStyle={styles.closeButtonContent}
              labelStyle={styles.closeButtonLabel}
            >
              閉じる
            </Button>
          )}
        </View>
      </Surface>

      {/* 月次統計カード */}
      <Card style={[styles.statsCard, { backgroundColor: theme.colors.surface }]}>
        <Card.Content style={styles.statsContent}>
          <Text variant="titleMedium" style={[styles.statsTitle, { color: theme.colors.onSurface }]}>
            月次統計
          </Text>
          
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text variant="headlineMedium" style={[styles.statValue, { color: theme.colors.primary }]}>
                {monthlyStats.workingDays}
              </Text>
              <Text variant="bodySmall" style={[styles.statLabel, { color: theme.colors.onSurfaceVariant }]}>
                出勤日数
              </Text>
            </View>

            <View style={styles.statItem}>
              <Text variant="headlineMedium" style={[styles.statValue, { color: theme.colors.primary }]}>
                {monthlyStats.totalHours.toFixed(1)}
              </Text>
              <Text variant="bodySmall" style={[styles.statLabel, { color: theme.colors.onSurfaceVariant }]}>
                総労働時間
              </Text>
            </View>

            <View style={styles.statItem}>
              <Text variant="headlineMedium" style={[styles.statValue, { color: theme.colors.tertiary }]}>
                {monthlyStats.overtimeDays}
              </Text>
              <Text variant="bodySmall" style={[styles.statLabel, { color: theme.colors.onSurfaceVariant }]}>
                残業日数
              </Text>
            </View>

            <View style={styles.statItem}>
              <Text variant="headlineMedium" style={[styles.statValue, { color: theme.colors.secondary }]}>
                {monthlyStats.nightShiftDays}
              </Text>
              <Text variant="bodySmall" style={[styles.statLabel, { color: theme.colors.onSurfaceVariant }]}>
                夜勤日数
              </Text>
            </View>
          </View>

          <Divider style={styles.divider} />

          <View style={styles.additionalStats}>
            <View style={styles.additionalStatItem}>
              <Text variant="bodyMedium" style={[styles.additionalStatLabel, { color: theme.colors.onSurfaceVariant }]}>
                平均労働時間/日
              </Text>
              <Text variant="titleMedium" style={[styles.additionalStatValue, { color: theme.colors.onSurface }]}>
                {monthlyStats.averageHours.toFixed(1)}時間
              </Text>
            </View>
            <View style={styles.additionalStatItem}>
              <Text variant="bodyMedium" style={[styles.additionalStatLabel, { color: theme.colors.onSurfaceVariant }]}>
                出勤率
              </Text>
              <Text variant="titleMedium" style={[styles.additionalStatValue, { color: theme.colors.onSurface }]}>
                {monthlyStats.attendanceRate.toFixed(1)}%
              </Text>
            </View>
          </View>
        </Card.Content>
      </Card>

      {/* カレンダービュー */}
      <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
        カレンダー
      </Text>
      <CalendarView
        attendanceData={attendanceData}
        selectedDate={selectedDate}
        onDateSelect={handleDateSelect}
        currentMonth={currentMonth}
        onMonthChange={handleMonthChange}
      />

      {/* 選択日の詳細 */}
      {selectedDayDetail && (
        <Card style={[styles.selectedDayCard, { backgroundColor: theme.colors.surface }]}>
          <Card.Content style={styles.selectedDayContent}>
            <Text variant="titleMedium" style={[styles.selectedDayTitle, { color: theme.colors.onSurface }]}>
              {dayjs(selectedDate).format('M月D日(ddd)')} の詳細
            </Text>
            
            {selectedDayDetail.isPresent ? (
              <View style={styles.selectedDayDetails}>
                <View style={styles.timeRow}>
                  <MaterialIcons name="login" size={20} color={theme.colors.primary} />
                  <Text variant="bodyLarge" style={styles.timeLabel}>出勤: </Text>
                  <Text variant="titleMedium" style={[styles.timeValue, { color: theme.colors.primary }]}>
                    {dayjs(selectedDayDetail.clockIn).format('HH:mm')}
                  </Text>
                </View>
                
                <View style={styles.timeRow}>
                  <MaterialIcons name="logout" size={20} color={theme.colors.secondary} />
                  <Text variant="bodyLarge" style={styles.timeLabel}>退勤: </Text>
                  <Text variant="titleMedium" style={[styles.timeValue, { color: theme.colors.secondary }]}>
                    {selectedDayDetail.clockOut ? dayjs(selectedDayDetail.clockOut).format('HH:mm') : '未退勤'}
                  </Text>
                </View>
                
                <View style={styles.selectedDayStats}>
                  <Text variant="bodyMedium" style={[styles.selectedDayStatLabel, { color: theme.colors.onSurfaceVariant }]}>
                    労働時間: {selectedDayDetail.totalHours.toFixed(1)}時間
                  </Text>
                  {selectedDayDetail.workSite && (
                    <Text variant="bodyMedium" style={[styles.selectedDayStatLabel, { color: theme.colors.onSurfaceVariant }]}>
                      現場: {selectedDayDetail.workSite}
                    </Text>
                  )}
                </View>
              </View>
            ) : (
              <View style={styles.absentInfo}>
                <MaterialIcons name="event-busy" size={24} color={theme.colors.onSurfaceVariant} />
                <Text variant="bodyLarge" style={[styles.absentText, { color: theme.colors.onSurfaceVariant }]}>
                  {getStatusText(selectedDayDetail.status)}
                </Text>
              </View>
            )}
          </Card.Content>
        </Card>
      )}

      {/* 日別リスト */}
      <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
        日別勤怠記録
      </Text>
      <DailyTimeList
        attendanceData={attendanceData}
        selectedMonth={currentMonth}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 16,
    elevation: 3,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  headerContent: {
    flex: 1,
  },
  employeeInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 20,
  },
  avatar: {
    elevation: 3,
  },
  statusIndicator: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: 'white',
  },
  employeeDetails: {
    flex: 1,
  },
  employeeName: {
    fontWeight: '700',
    marginBottom: 12,
    letterSpacing: 0.15,
  },
  statusChip: {
    alignSelf: 'flex-start',
    marginBottom: 12,
    height: 32,
  },
  monthNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthLabel: {
    fontWeight: '600',
    marginHorizontal: 8,
  },
  viewModeContainer: {
    paddingTop: 12,
  },
  segmentedButtons: {
    marginHorizontal: 16,
  },
  performanceCard: {
    marginHorizontal: 16,
    marginBottom: 20,
    borderRadius: 16,
    elevation: 2,
  },
  performanceContent: {
    padding: 24,
  },
  performanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  performanceTitle: {
    fontWeight: '700',
  },
  performanceBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
  },
  kpiGrid: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 20,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.02)',
    borderRadius: 12,
    padding: 16,
  },
  kpiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  kpiValue: {
    fontWeight: '700',
  },
  kpiLabel: {
    marginBottom: 8,
    fontSize: 12,
  },
  kpiProgress: {
    height: 6,
    borderRadius: 3,
  },
  detailStatsGrid: {
    gap: 16,
  },
  detailStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  detailStatContent: {
    marginLeft: 16,
    flex: 1,
  },
  detailStatValue: {
    fontWeight: '600',
    marginBottom: 2,
  },
  detailStatLabel: {
    fontSize: 12,
  },
  healthAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(244, 67, 54, 0.1)',
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
  },
  healthAlertText: {
    marginLeft: 8,
    fontWeight: '500',
  },
  divider: {
    marginVertical: 20,
  },
  sectionTitle: {
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 12,
    fontWeight: '700',
  },
  selectedDayCard: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 16,
    borderRadius: 12,
    elevation: 2,
  },
  selectedDayContent: {
    padding: 16,
  },
  selectedDayTitle: {
    fontWeight: '600',
    marginBottom: 16,
  },
  selectedDayDetails: {
    gap: 12,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeLabel: {
    marginLeft: 8,
    flex: 1,
  },
  timeValue: {
    fontWeight: '600',
  },
  selectedDayStats: {
    marginTop: 8,
    gap: 4,
  },
  selectedDayStatLabel: {
    fontSize: 14,
  },
  absentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  absentText: {
    marginLeft: 8,
    fontSize: 16,
  },
});

export default EmployeeDetail;