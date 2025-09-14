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
    minHeight: 44, // Accessibility minimum touch area
  },
  card: {
    marginHorizontal: 4,
    marginVertical: 6,
    elevation: 3,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
  },
  cardContent: {
    padding: 18,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 18,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 16,
  },
  avatar: {
    elevation: 2,
  },
  statusRing: {
    position: 'absolute',
    top: -2,
    left: -2,
    right: -2,
    bottom: -2,
    borderRadius: 28,
    borderWidth: 2,
  },
  nameSection: {
    flex: 1,
    gap: 6,
  },
  name: {
    fontWeight: '700',
    letterSpacing: 0.15,
  },
  statusChip: {
    alignSelf: 'flex-start',
    height: 28,
    borderRadius: 14,
  },
  statusChipText: {
    fontSize: 11,
    fontWeight: '600',
  },
  attendanceRateContainer: {
    gap: 4,
  },
  attendanceRateLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  statIcon: {
    marginRight: 4,
  },
  statValue: {
    fontWeight: '700',
    fontSize: 20,
  },
  warningIcon: {
    marginLeft: 2,
  },
  statLabel: {
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '500',
  },
  statDivider: {
    width: 1,
    height: 44,
    backgroundColor: 'rgba(0,0,0,0.12)',
    marginHorizontal: 8,
  },
  quickActions: {
    alignItems: 'flex-end',
    marginTop: -4,
  },
});

export default EmployeeCard;