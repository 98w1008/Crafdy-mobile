/**
 * DateTimePicker のWeb互換性ユーティリティ
 * WebブラウザとネイティブプラットフォームでのDateTimePickerの統一インターフェース
 * dayjsベースで Invalid Date エラーを防ぎ、Asia/Tokyo タイムゾーンに対応
 */

import React from 'react';
import { Platform, TextInput, StyleSheet } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Colors } from '../constants/Colors';
import { dayjs, parseJpDate, formatJpDate, formatJpDateTime, nowJp } from '../src/utils/date';

interface DateTimeFieldProps {
  value: Date;
  onChange: (date: Date) => void;
  mode?: 'date' | 'time' | 'datetime';
  placeholder?: string;
  style?: any;
}

/**
 * Web互換性を持つDateTimePickerコンポーネント
 * Webでは通常のTextInputにフォールバック、ネイティブでは標準のDateTimePickerを使用
 */
export function DateTimeField({
  value,
  onChange,
  mode = 'date',
  placeholder,
  style
}: DateTimeFieldProps) {
  // Web環境の場合は TextInput にフォールバック
  if (Platform.OS === 'web') {
    const formatValue = (date: Date) => {
      const dayjsDate = dayjs(date).tz('Asia/Tokyo');
      if (mode === 'date') {
        return dayjsDate.format('YYYY-MM-DD');
      } else if (mode === 'time') {
        return dayjsDate.format('HH:mm:ss');
      } else {
        return dayjsDate.format('YYYY-MM-DDTHH:mm');
      }
    };

    const parseValue = (stringValue: string) => {
      const parsed = parseJpDate(stringValue);
      return parsed.isValid() ? parsed.toDate() : nowJp().toDate();
    };

    return (
      <TextInput
        style={[styles.webDateInput, style]}
        value={formatValue(value)}
        onChangeText={(text) => onChange(parseValue(text))}
        placeholder={placeholder || `${mode === 'date' ? 'YYYY-MM-DD' : mode === 'time' ? 'HH:MM:SS' : 'YYYY-MM-DDTHH:MM'}`}
        placeholderTextColor={Colors.light.text.tertiary}
      />
    );
  }

  // ネイティブ環境では標準の DateTimePicker を使用
  return (
    <DateTimePicker
      value={value}
      mode={mode}
      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
      onChange={(event, selectedDate) => {
        if (selectedDate) {
          onChange(selectedDate);
        }
      }}
      style={style}
    />
  );
}

/**
 * 日付のフォーマット用ユーティリティ（dayjsベース）
 */
export const formatDate = (date: Date | string | null | undefined, format: 'date' | 'datetime' | 'time' = 'date'): string => {
  if (!date) return '';
  
  const dayjsDate = dayjs(date).tz('Asia/Tokyo');
  if (!dayjsDate.isValid()) {
    console.warn('Invalid date in formatDate:', date);
    return '';
  }
  
  if (format === 'date') {
    return formatJpDate(dayjsDate);
  } else if (format === 'time') {
    return dayjsDate.format('HH:mm:ss');
  } else {
    return formatJpDateTime(dayjsDate);
  }
};

/**
 * 日付の妥当性チェック（dayjsベース）
 */
export const isValidDate = (date: any): boolean => {
  if (date instanceof Date) {
    return !isNaN(date.getTime());
  }
  return dayjs(date).isValid();
};

/**
 * 今日の日付を取得（時間を00:00:00にリセット、Asia/Tokyo）
 */
export const getToday = (): Date => {
  return nowJp().startOf('day').toDate();
};

/**
 * 指定日数後の日付を取得（dayjsベース）
 */
export const addDays = (date: Date | string, days: number): Date => {
  return dayjs(date).tz('Asia/Tokyo').add(days, 'day').toDate();
};

const styles = StyleSheet.create({
  webDateInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
    color: '#000000',
    minHeight: 44, // アクセシビリティのための最小タップ領域
  }
});

export default DateTimeField;