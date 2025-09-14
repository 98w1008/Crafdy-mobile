import React, { useState, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import { Text, useTheme } from 'react-native-paper';
import dayjs from 'dayjs';
import 'dayjs/locale/ja';
import { DailyAttendanceDetail, CalendarMarkedDates, AttendanceStatus } from '../../types/attendance';

// 日本語ロケール設定
LocaleConfig.locales['ja'] = {
  monthNames: ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'],
  monthNamesShort: ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'],
  dayNames: ['日曜日', '月曜日', '火曜日', '水曜日', '木曜日', '金曜日', '土曜日'],
  dayNamesShort: ['日', '月', '火', '水', '木', '金', '土'],
  today: '今日'
};
LocaleConfig.defaultLocale = 'ja';

interface CalendarViewProps {
  attendanceData: DailyAttendanceDetail[];
  selectedDate: string;
  onDateSelect: (date: string) => void;
  currentMonth?: string;
  onMonthChange?: (month: string) => void;
}

const CalendarView: React.FC<CalendarViewProps> = ({
  attendanceData,
  selectedDate,
  onDateSelect,
  currentMonth,
  onMonthChange,
}) => {
  const theme = useTheme();
  const [displayMonth, setDisplayMonth] = useState(currentMonth || dayjs().format('YYYY-MM'));

  const getStatusColor = (status: AttendanceStatus): string => {
    switch (status) {
      case 'normal': return theme.colors.primary;
      case 'overtime': return theme.colors.tertiary;
      case 'night_shift': return theme.colors.secondary;
      case 'holiday': return theme.colors.outline;
      default: return theme.colors.primary;
    }
  };

  // カレンダーマーカー用データを準備
  const markedDates: CalendarMarkedDates = useMemo(() => {
    const marked: CalendarMarkedDates = {};
    
    // 勤怠データをマーク
    attendanceData.forEach((record) => {
      const dateKey = record.date;
      const statusColor = getStatusColor(record.status);
      
      marked[dateKey] = {
        marked: record.isPresent,
        dotColor: statusColor,
        customStyles: {
          container: {
            backgroundColor: record.isPresent ? `${statusColor}20` : 'transparent',
            borderRadius: 8,
          },
          text: {
            color: record.isPresent ? statusColor : theme.colors.onSurface,
            fontWeight: record.isPresent ? '600' : 'normal',
          }
        }
      };
    });

    // 選択日をマーク
    if (selectedDate && marked[selectedDate]) {
      marked[selectedDate] = {
        ...marked[selectedDate],
        selectedColor: theme.colors.primary,
        customStyles: {
          ...marked[selectedDate].customStyles,
          container: {
            backgroundColor: theme.colors.primary,
            borderRadius: 8,
          },
          text: {
            color: theme.colors.onPrimary,
            fontWeight: '700',
          }
        }
      };
    } else if (selectedDate) {
      marked[selectedDate] = {
        selectedColor: theme.colors.primary,
        customStyles: {
          container: {
            backgroundColor: theme.colors.primary,
            borderRadius: 8,
          },
          text: {
            color: theme.colors.onPrimary,
            fontWeight: '700',
          }
        }
      };
    }

    return marked;
  }, [attendanceData, selectedDate, theme]);

  const handleDayPress = (day: { dateString: string }) => {
    onDateSelect(day.dateString);
  };

  const handleMonthChange = (month: { month: number; year: number }) => {
    const monthString = dayjs(`${month.year}-${month.month}-01`).format('YYYY-MM');
    setDisplayMonth(monthString);
    onMonthChange?.(monthString);
  };

  return (
    <View style={styles.container}>
      <View style={[styles.calendarContainer, { backgroundColor: theme.colors.surface }]}>
        <Calendar
          current={displayMonth}
          onDayPress={handleDayPress}
          onMonthChange={handleMonthChange}
          markingType="custom"
          markedDates={markedDates}
          theme={{
            calendarBackground: theme.colors.surface,
            textSectionTitleColor: theme.colors.onSurface,
            selectedDayBackgroundColor: theme.colors.primary,
            selectedDayTextColor: theme.colors.onPrimary,
            todayTextColor: theme.colors.primary,
            dayTextColor: theme.colors.onSurface,
            textDisabledColor: theme.colors.onSurfaceVariant,
            dotColor: theme.colors.primary,
            selectedDotColor: theme.colors.onPrimary,
            arrowColor: theme.colors.primary,
            disabledArrowColor: theme.colors.onSurfaceVariant,
            monthTextColor: theme.colors.onSurface,
            indicatorColor: theme.colors.primary,
            textDayFontFamily: 'System',
            textMonthFontFamily: 'System',
            textDayHeaderFontFamily: 'System',
            textDayFontWeight: '400',
            textMonthFontWeight: '600',
            textDayHeaderFontWeight: '600',
            textDayFontSize: 16,
            textMonthFontSize: 18,
            textDayHeaderFontSize: 14,
          }}
          style={styles.calendar}
          enableSwipeMonths={true}
          hideExtraDays={true}
          firstDay={1} // 月曜日始まり
          showWeekNumbers={false}
        />
      </View>

      {/* 凡例 */}
      <View style={[styles.legend, { backgroundColor: theme.colors.surfaceVariant }]}>
        <Text variant="bodySmall" style={[styles.legendTitle, { color: theme.colors.onSurfaceVariant }]}>
          凡例
        </Text>
        <View style={styles.legendItems}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: getStatusColor('normal') }]} />
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>通常</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: getStatusColor('overtime') }]} />
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>残業</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: getStatusColor('night_shift') }]} />
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>夜勤</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: getStatusColor('holiday') }]} />
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>休暇</Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  calendarContainer: {
    borderRadius: 12,
    marginHorizontal: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  calendar: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  legend: {
    marginHorizontal: 16,
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
  },
  legendTitle: {
    fontWeight: '600',
    marginBottom: 8,
  },
  legendItems: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 6,
  },
});

export default CalendarView;