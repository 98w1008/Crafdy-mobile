import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Card, Avatar, Text, Badge, useTheme } from 'react-native-paper';
import { router } from 'expo-router';
import { EmployeeCardData, AttendanceStatus } from '../../types/attendance';

interface EmployeeCardProps {
  employee: EmployeeCardData;
  onPress?: (employeeId: string) => void;
}

const EmployeeCard: React.FC<EmployeeCardProps> = ({ employee, onPress }) => {
  const theme = useTheme();

  const handlePress = () => {
    if (onPress) {
      onPress(employee.id);
    } else {
      router.push(`/attendance/employee-detail/${employee.id}`);
    }
  };

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

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`${employee.name}の勤怠詳細を確認`}
      style={styles.touchable}
    >
      <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
        <Card.Content style={styles.cardContent}>
          {/* ヘッダー部分：アバターと名前 */}
          <View style={styles.header}>
            <Avatar.Text
              size={48}
              label={employee.name.charAt(0)}
              style={[styles.avatar, { backgroundColor: getStatusColor(employee.status) }]}
            />
            <View style={styles.nameSection}>
              <Text variant="titleMedium" style={styles.name} numberOfLines={1}>
                {employee.name}
              </Text>
              <Badge
                size={20}
                style={[styles.statusBadge, { backgroundColor: getStatusColor(employee.status) }]}
              >
                {getStatusText(employee.status)}
              </Badge>
            </View>
          </View>

          {/* 勤怠統計 */}
          <View style={styles.stats}>
            <View style={styles.statItem}>
              <Text variant="headlineSmall" style={[styles.statValue, { color: theme.colors.primary }]}>
                {employee.thisMonthDays}
              </Text>
              <Text variant="bodySmall" style={[styles.statLabel, { color: theme.colors.onSurfaceVariant }]}>
                今月出面
              </Text>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.statItem}>
              <Text variant="headlineSmall" style={[styles.statValue, { color: theme.colors.primary }]}>
                {employee.totalHours.toFixed(1)}
              </Text>
              <Text variant="bodySmall" style={[styles.statLabel, { color: theme.colors.onSurfaceVariant }]}>
                総時間
              </Text>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.statItem}>
              <View style={styles.overtimeContainer}>
                <Text variant="headlineSmall" style={[styles.statValue, { color: theme.colors.tertiary }]}>
                  {employee.overtimeDays}
                </Text>
                {employee.overtimeDays > 0 && (
                  <Badge
                    size={16}
                    style={[styles.overtimeBadge, { backgroundColor: theme.colors.tertiary }]}
                  >
                    残業
                  </Badge>
                )}
              </View>
              <Text variant="bodySmall" style={[styles.statLabel, { color: theme.colors.onSurfaceVariant }]}>
                残業日数
              </Text>
            </View>
          </View>
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  touchable: {
    minHeight: 44, // アクセシビリティ最小タッチ領域
  },
  card: {
    marginHorizontal: 8,
    marginVertical: 6,
    elevation: 2,
    borderRadius: 12,
  },
  cardContent: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    marginRight: 12,
  },
  nameSection: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  name: {
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  statusBadge: {
    height: 24,
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontWeight: '700',
    marginBottom: 4,
  },
  statLabel: {
    textAlign: 'center',
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#E0E0E0',
    marginHorizontal: 8,
  },
  overtimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  overtimeBadge: {
    marginLeft: 4,
    height: 18,
  },
});

export default EmployeeCard;