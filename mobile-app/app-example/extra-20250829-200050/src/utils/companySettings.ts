import { supabase } from '../../lib/supabase';
import { dayjs } from './date';

// 会社設定のデフォルト値
export const DEFAULT_COMPANY_SETTINGS = {
  closing: 'month_end' as const,
  pay_day: 25,
  timezone: 'Asia/Tokyo',
  fiscal_year_start: 4, // 4月開始
  working_hours_start: '09:00',
  working_hours_end: '18:00',
  break_time_minutes: 60,
} as const;

// 会社設定の型定義
export interface CompanySettings {
  id?: string;
  company_id?: string;
  closing: 'month_end' | 'custom_day';
  pay_day: number;
  timezone: string;
  fiscal_year_start: number;
  working_hours_start: string;
  working_hours_end: string;
  break_time_minutes: number;
  created_at?: string;
  updated_at?: string;
}

/**
 * 会社設定に関するエラーのハンドリング
 * データベースのカラム不存在エラーや設定未作成の場合にフェールセーフを提供
 */
export const handleCompanySettingsError = async (error: any, companyId?: string): Promise<CompanySettings> => {
  console.warn('Company settings error:', error);

  // PostgreSQLエラーコード42703: カラムが存在しない場合
  if (error.code === 42703 || error.code === '42703' || 
      error.message?.includes('column') || 
      error.message?.includes('does not exist')) {
    
    console.log('Company settings table/column not found, using defaults');
    return DEFAULT_COMPANY_SETTINGS;
  }

  // 設定が見つからない場合（空の結果）
  if (error.message?.includes('No data') || error.status === 404) {
    console.log('No company settings found, creating default settings');
    
    if (companyId) {
      try {
        // バックグラウンドで新しい設定を作成
        await createDefaultCompanySettings(companyId);
      } catch (createError) {
        console.warn('Failed to create default company settings:', createError);
      }
    }
    
    return DEFAULT_COMPANY_SETTINGS;
  }

  // その他のエラーは再スロー
  throw error;
};

/**
 * デフォルトの会社設定を作成
 */
export const createDefaultCompanySettings = async (companyId: string): Promise<CompanySettings> => {
  try {
    const defaultSettings = {
      ...DEFAULT_COMPANY_SETTINGS,
      company_id: companyId,
      created_at: dayjs().toISOString(),
      updated_at: dayjs().toISOString(),
    };

    const { data, error } = await supabase
      .from('company_settings')
      .insert(defaultSettings)
      .select()
      .single();

    if (error) {
      console.warn('Failed to create default company settings:', error);
      return DEFAULT_COMPANY_SETTINGS;
    }

    console.log('Default company settings created:', data);
    return data;
  } catch (error) {
    console.warn('Exception creating default company settings:', error);
    return DEFAULT_COMPANY_SETTINGS;
  }
};

/**
 * 会社設定を安全に取得
 */
export const getCompanySettings = async (companyId: string): Promise<CompanySettings> => {
  try {
    const { data, error } = await supabase
      .from('company_settings')
      .select('*')
      .eq('company_id', companyId)
      .single();

    if (error) {
      return handleCompanySettingsError(error, companyId);
    }

    if (!data) {
      console.log('No company settings found, creating default');
      return createDefaultCompanySettings(companyId);
    }

    // データが取得できた場合、デフォルト値でマージして欠損フィールドを補完
    return {
      ...DEFAULT_COMPANY_SETTINGS,
      ...data,
    };
  } catch (error) {
    return handleCompanySettingsError(error, companyId);
  }
};

/**
 * 会社設定を更新
 */
export const updateCompanySettings = async (
  companyId: string, 
  settings: Partial<CompanySettings>
): Promise<CompanySettings> => {
  try {
    const updateData = {
      ...settings,
      company_id: companyId,
      updated_at: dayjs().toISOString(),
    };

    const { data, error } = await supabase
      .from('company_settings')
      .upsert(updateData)
      .select()
      .single();

    if (error) {
      console.warn('Failed to update company settings:', error);
      // 更新に失敗した場合は現在の設定を返す
      return getCompanySettings(companyId);
    }

    return data;
  } catch (error) {
    console.warn('Exception updating company settings:', error);
    return getCompanySettings(companyId);
  }
};

/**
 * 給与日の計算（会社設定に基づく）
 */
export const calculatePayDay = (settings: CompanySettings, targetMonth?: dayjs.Dayjs): dayjs.Dayjs => {
  const month = targetMonth || dayjs();
  
  if (settings.closing === 'month_end') {
    // 月末締めの場合、翌月の指定日が給与日
    return month.add(1, 'month').date(settings.pay_day);
  } else {
    // カスタム締め日の場合、当月の指定日が給与日
    return month.date(settings.pay_day);
  }
};

/**
 * 締め日の計算（会社設定に基づく）
 */
export const calculateClosingDay = (settings: CompanySettings, targetMonth?: dayjs.Dayjs): dayjs.Dayjs => {
  const month = targetMonth || dayjs();
  
  if (settings.closing === 'month_end') {
    return month.endOf('month');
  } else {
    return month.date(settings.pay_day);
  }
};

/**
 * 労働時間の計算（会社設定に基づく）
 */
export const calculateWorkingHours = (settings: CompanySettings): number => {
  const start = dayjs(`2000-01-01 ${settings.working_hours_start}`);
  const end = dayjs(`2000-01-01 ${settings.working_hours_end}`);
  const totalMinutes = end.diff(start, 'minute');
  const workingMinutes = totalMinutes - settings.break_time_minutes;
  
  return workingMinutes / 60; // 時間に変換
};