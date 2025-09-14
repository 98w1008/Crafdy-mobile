import React, { useMemo } from 'react';
import { View, StyleSheet, FlatList, ListRenderItem } from 'react-native';
import { Card, Text, Chip, useTheme, Surface, Divider } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import 'dayjs/locale/ja';
import { DailyAttendanceDetail, AttendanceStatus, WorkType } from '../../types/attendance';

interface DailyTimeListProps {
  attendanceData: DailyAttendanceDetail[];
  selectedMonth: string;
}

const DailyTimeList: React.FC<DailyTimeListProps> = ({
  attendanceData,
  selectedMonth,
}) => {
  const theme = useTheme();

  // 選択月の日別データをフィルタリング・ソート
  const filteredData = useMemo(() => {
    return attendanceData
      .filter(record => dayjs(record.date).format('YYYY-MM') === selectedMonth)
      .sort((a, b) => dayjs(b.date).diff(dayjs(a.date))) // 新しい日付順
      .slice(0, 31); // 最大31日分
  }, [attendanceData, selectedMonth]);

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

  const getWorkTypeText = (workType: WorkType): string => {
    switch (workType) {
      case 'construction': return '建設作業';
      case 'equipment': return '重機操作';
      case 'management': return '現場管理';
      case 'safety': return '安全管理';
      case 'cleanup': return '清掃・片付け';
      default: return '建設作業';
    }
  };

  const getStatusIcon = (status: AttendanceStatus): string => {
    switch (status) {
      case 'normal': return 'work';
      case 'overtime': return 'schedule';
      case 'night_shift': return 'nights-stay';
      case 'holiday': return 'event-available';
      default: return 'work';
    }
  };

  const formatTime = (timeString?: string): string => {
    if (!timeString) return '--:--';
    return dayjs(timeString).format('HH:mm');
  };

  const renderDailyItem: ListRenderItem<DailyAttendanceDetail> = ({ item }) => {
    const isToday = dayjs(item.date).isSame(dayjs(), 'day');
    const dayOfWeek = dayjs(item.date).locale('ja').format('ddd');
    const dateNumber = dayjs(item.date).date();
    
    return (
      <Card 
        style={[
          styles.itemCard, 
          { 
            backgroundColor: theme.colors.surface,
            borderLeftColor: getStatusColor(item.status),
            borderLeftWidth: isToday ? 4 : 2,
          }
        ]}
      >
        <Card.Content style={styles.itemContent}>
          {/* 日付ヘッダー */}
          <View style={styles.dateHeader}>
            <View style={styles.dateInfo}>
              <Text 
                variant="headlineSmall" 
                style={[
                  styles.dateNumber, 
                  { color: isToday ? theme.colors.primary : theme.colors.onSurface }
                ]}
              >
                {dateNumber}
              </Text>
              <Text 
                variant="bodySmall" 
                style={[
                  styles.dayOfWeek,
                  { color: theme.colors.onSurfaceVariant }
                ]}
              >
                {dayOfWeek}
              </Text>
            </View>
            
            <View style={styles.statusContainer}>
              <MaterialIcons
                name={getStatusIcon(item.status) as any}
                size={20}
                color={getStatusColor(item.status)}
              />
              <Chip 
                mode="flat"
                style={[styles.statusChip, { backgroundColor: `${getStatusColor(item.status)}20` }]}
                textStyle={{ color: getStatusColor(item.status), fontSize: 12 }}
              >
                {getStatusText(item.status)}
              </Chip>
            </View>
          </View>

          {item.isPresent ? (
            <>
              {/* 勤務時間情報 */}
              <View style={styles.timeInfo}>
                <View style={styles.timeRow}>
                  <MaterialIcons name="login" size={16} color={theme.colors.primary} />
                  <Text variant="bodyMedium" style={styles.timeLabel}>出勤</Text>
                  <Text variant="titleSmall" style={[styles.timeValue, { color: theme.colors.primary }]}>
                    {formatTime(item.clockIn)}
                  </Text>
                </View>
                
                <View style={styles.timeRow}>
                  <MaterialIcons name="logout" size={16} color={theme.colors.secondary} />
                  <Text variant="bodyMedium" style={styles.timeLabel}>退勤</Text>
                  <Text variant="titleSmall" style={[styles.timeValue, { color: theme.colors.secondary }]}>
                    {formatTime(item.clockOut)}
                  </Text>
                </View>
              </View>

              <Divider style={styles.divider} />

              {/* 作業詳細 */}
              <View style={styles.workDetails}>
                <View style={styles.workDetailRow}>
                  <Text variant="bodySmall" style={[styles.detailLabel, { color: theme.colors.onSurfaceVariant }]}>
                    作業種別
                  </Text>
                  <Text variant="bodyMedium" style={[styles.detailValue, { color: theme.colors.onSurface }]}>
                    {getWorkTypeText(item.workType)}
                  </Text>
                </View>

                {item.workSite && (
                  <View style={styles.workDetailRow}>
                    <Text variant="bodySmall" style={[styles.detailLabel, { color: theme.colors.onSurfaceVariant }]}>
                      現場
                    </Text>
                    <Text variant="bodyMedium" style={[styles.detailValue, { color: theme.colors.onSurface }]} numberOfLines={1}>
                      {item.workSite}
                    </Text>
                  </View>
                )}

                <View style={styles.hoursRow}>
                  <View style={styles.hourItem}>
                    <Text variant="bodySmall" style={[styles.detailLabel, { color: theme.colors.onSurfaceVariant }]}>
                      実働時間
                    </Text>
                    <Text variant="titleMedium" style={[styles.hourValue, { color: theme.colors.primary }]}>
                      {item.totalHours.toFixed(1)}h
                    </Text>
                  </View>
                  
                  {item.breakHours > 0 && (
                    <View style={styles.hourItem}>
                      <Text variant="bodySmall" style={[styles.detailLabel, { color: theme.colors.onSurfaceVariant }]}>
                        休憩時間
                      </Text>
                      <Text variant="titleMedium" style={[styles.hourValue, { color: theme.colors.onSurfaceVariant }]}>
                        {item.breakHours.toFixed(1)}h
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </>
          ) : (
            <View style={styles.absentInfo}>
              <MaterialIcons name="event-busy" size={24} color={theme.colors.onSurfaceVariant} />
              <Text variant="bodyMedium" style={[styles.absentText, { color: theme.colors.onSurfaceVariant }]}>
                {getStatusText(item.status)}
              </Text>
            </View>
          )}
        </Card.Content>
      </Card>
    );
  };

  return (
    <View style={styles.container}>
      <Surface style={[styles.header, { backgroundColor: theme.colors.surfaceVariant }]}>
        <Text variant="titleMedium" style={[styles.headerTitle, { color: theme.colors.onSurfaceVariant }]}>
          {dayjs(selectedMonth).format('YYYY年MM月')} の勤怠記録
        </Text>
        <Text variant="bodySmall" style={[styles.headerSubtitle, { color: theme.colors.onSurfaceVariant }]}>
          {filteredData.length} 件の記録
        </Text>
      </Surface>

      <FlatList
        data={filteredData}
        renderItem={renderDailyItem}
        keyExtractor={(item) => item.date}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 8,
  },
  headerTitle: {
    fontWeight: '600',
  },
  headerSubtitle: {
    marginTop: 2,
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  separator: {
    height: 8,
  },
  itemCard: {
    elevation: 1,
    borderRadius: 12,
  },
  itemContent: {
    padding: 16,
  },
  dateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  dateInfo: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  dateNumber: {
    fontWeight: '700',
    marginRight: 8,
  },
  dayOfWeek: {
    fontWeight: '500',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusChip: {
    marginLeft: 8,
    height: 28,
  },
  timeInfo: {
    marginBottom: 12,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  timeLabel: {
    marginLeft: 8,
    flex: 1,
  },
  timeValue: {
    fontWeight: '600',
  },
  divider: {
    marginVertical: 12,
  },
  workDetails: {
    gap: 8,
  },
  workDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    flex: 1,
  },
  detailValue: {
    flex: 2,
    textAlign: 'right',
  },
  hoursRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  hourItem: {
    alignItems: 'center',
  },
  hourValue: {
    fontWeight: '700',
    marginTop: 4,
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

export default DailyTimeList;