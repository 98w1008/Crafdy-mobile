import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import localizedFormat from 'dayjs/plugin/localizedFormat';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';

// プラグイン拡張
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(localizedFormat);
dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

// デフォルトタイムゾーンを日本に設定
dayjs.tz.setDefault('Asia/Tokyo');

/**
 * 日本の日付形式を安全にパース
 * Invalid Dateエラーを防ぐため、複数のフォーマットを試行
 */
export const parseJpDate = (input: string | null | undefined): dayjs.Dayjs => {
  if (!input || input.trim() === '') {
    return dayjs().tz();
  }

  const cleanInput = input.trim();
  
  // 複数のフォーマットを試行
  const formats = [
    'YYYY-MM-DD',
    'YYYY/MM/DD', 
    'YYYY年MM月DD日',
    dayjs.ISO_8601 as any
  ];

  for (const format of formats) {
    const parsed = dayjs(cleanInput, format, true).tz();
    if (parsed.isValid()) {
      return parsed;
    }
  }

  // すべてのフォーマットが失敗した場合、デフォルトパースを試行
  const defaultParsed = dayjs(cleanInput).tz();
  if (defaultParsed.isValid()) {
    return defaultParsed;
  }

  // すべて失敗した場合は現在時刻を返す
  console.warn(`Invalid date input: ${input}, using current date`);
  return dayjs().tz();
};

/**
 * 日本語形式で日付をフォーマット（YYYY年MM月DD日）
 */
export const formatJpDate = (date: dayjs.Dayjs | string | null | undefined): string => {
  if (!date) return '';
  
  const parsed = typeof date === 'string' ? parseJpDate(date) : dayjs(date).tz();
  return parsed.format('YYYY年MM月DD日');
};

/**
 * 日本語形式で日時をフォーマット（YYYY年MM月DD日 HH:mm）
 */
export const formatJpDateTime = (date: dayjs.Dayjs | string | null | undefined): string => {
  if (!date) return '';
  
  const parsed = typeof date === 'string' ? parseJpDate(date) : dayjs(date).tz();
  return parsed.format('YYYY年MM月DD日 HH:mm');
};

/**
 * ISO形式で日付をフォーマット（YYYY-MM-DD）
 */
export const formatIsoDate = (date: dayjs.Dayjs | string | null | undefined): string => {
  if (!date) return '';
  
  const parsed = typeof date === 'string' ? parseJpDate(date) : dayjs(date).tz();
  return parsed.format('YYYY-MM-DD');
};

// Modern Pack v3: Invoice date normalizer
export type InvoiceRule = { type: 'days' | 'eom'; value?: number };

export const normalizeInvoiceDates = (
  issue?: string,
  rule?: InvoiceRule
) => {
  const base = issue && dayjs(issue).isValid() ? dayjs(issue) : dayjs();
  let due = base.add(30, 'day');
  if (rule?.type === 'days' && rule.value) due = base.add(rule.value, 'day');
  if (rule?.type === 'eom') due = base.endOf('month');
  if (due.isBefore(base)) due = base.add(30, 'day');
  return {
    issueDate: base.tz('Asia/Tokyo').format('YYYY-MM-DD'),
    dueDate: due.tz('Asia/Tokyo').format('YYYY-MM-DD'),
  };
};

/**
 * データベース用のISO文字列を生成
 */
export const toIsoString = (date: dayjs.Dayjs | string | null | undefined): string => {
  if (!date) return dayjs().tz().toISOString();
  
  const parsed = typeof date === 'string' ? parseJpDate(date) : dayjs(date).tz();
  return parsed.toISOString();
};

/**
 * 現在の日時を日本時間で取得
 */
export const nowJp = (): dayjs.Dayjs => dayjs().tz('Asia/Tokyo');

/**
 * 今日の日付を日本時間で取得（時刻を00:00:00にリセット）
 */
export const todayJp = (): dayjs.Dayjs => nowJp().startOf('day');

/**
 * 月末日を取得
 */
export const getMonthEnd = (date?: dayjs.Dayjs | string): dayjs.Dayjs => {
  const target = date ? (typeof date === 'string' ? parseJpDate(date) : dayjs(date).tz()) : nowJp();
  return target.endOf('month');
};

/**
 * 月初日を取得
 */
export const getMonthStart = (date?: dayjs.Dayjs | string): dayjs.Dayjs => {
  const target = date ? (typeof date === 'string' ? parseJpDate(date) : dayjs(date).tz()) : nowJp();
  return target.startOf('month');
};

/**
 * 相対日時の表示（例：3時間前、2日前）
 */
export const formatRelativeTime = (date: dayjs.Dayjs | string | null | undefined): string => {
  if (!date) return '';
  
  const parsed = typeof date === 'string' ? parseJpDate(date) : dayjs(date).tz();
  const now = nowJp();
  
  const diffMinutes = now.diff(parsed, 'minute');
  const diffHours = now.diff(parsed, 'hour');
  const diffDays = now.diff(parsed, 'day');
  
  if (diffMinutes < 1) return 'たった今';
  if (diffMinutes < 60) return `${diffMinutes}分前`;
  if (diffHours < 24) return `${diffHours}時間前`;
  if (diffDays < 7) return `${diffDays}日前`;
  
  return formatJpDate(parsed);
};

// dayjsオブジェクト自体もエクスポート
export { dayjs };

// 型エクスポート
export type DateInput = dayjs.Dayjs | string | null | undefined;
