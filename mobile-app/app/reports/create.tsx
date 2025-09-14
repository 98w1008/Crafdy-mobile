/**
 * 日報作成画面 - 最小実務項目最適化版
 */

import React, { useState, useCallback, useEffect } from 'react'
import {
  View,
  StyleSheet,
  SafeAreaView,
  Alert
} from 'react-native'
import {
  Surface,
  IconButton
} from 'react-native-paper'
import { router } from 'expo-router'
import * as Haptics from 'expo-haptics'
import dayjs from 'dayjs'
import timezone from 'dayjs/plugin/timezone'
import utc from 'dayjs/plugin/utc'

import { Colors, Spacing, Shadows } from '@/constants/Colors'
import { StyledText } from '@/components/ui'
import { ReportForm } from '@/components/reports/ReportForm'
import { 
  ReportFormData, 
  CreateReportRequest, 
  WorkSite 
} from '@/types/reports'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

// dayjs timezone設定
dayjs.extend(utc)
dayjs.extend(timezone)

// =============================================================================
// TYPES
// =============================================================================

interface CreateReportScreenState {
  workSites: WorkSite[]
  loading: boolean
  error: string | null
}

// =============================================================================
// COMPONENT
// =============================================================================

export default function CreateReportScreen() {
  const { user } = useAuth()
  const [state, setState] = useState<CreateReportScreenState>({
    workSites: [],
    loading: true,
    error: null
  })

  // 現場データの取得
  const loadWorkSites = useCallback(async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('work_sites')
        .select('*')
        .eq('company_id', user.company_id)
        .order('name')

      if (error) throw error

      setState(prev => ({
        ...prev,
        workSites: data || [],
        loading: false,
        error: null
      }))
    } catch (error) {
      console.error('現場データ取得エラー:', error)
      setState(prev => ({
        ...prev,
        loading: false,
        error: '現場データの読み込みに失敗しました'
      }))
    }
  }, [user])

  useEffect(() => {
    loadWorkSites()
  }, [loadWorkSites])

  // 日報作成処理
  const createReport = useCallback(async (reportData: CreateReportRequest): Promise<void> => {
    if (!user) {
      throw new Error('ユーザー情報がありません')
    }

    // 日報データを挿入
    const { data: report, error: reportError } = await supabase
      .from('reports')
      .insert({
        user_id: user.id,
        work_date: reportData.work_date,
        work_site_id: reportData.work_site_id,
        work_hours: reportData.work_hours,
        work_content: reportData.work_content,
        progress_rate: reportData.progress_rate,
        special_notes: reportData.special_notes,
        status: reportData.status || 'draft'
      })
      .select()
      .single()

    if (reportError) throw reportError

    // 添付ファイルがある場合の処理
    if (reportData.attachments && reportData.attachments.length > 0) {
      const attachmentData = reportData.attachments.map(attachment => ({
        report_id: report.id,
        file_name: attachment.file_name,
        file_url: attachment.file_url,
        file_type: attachment.file_type,
        file_size: attachment.file_size
      }))

      const { error: attachmentError } = await supabase
        .from('report_attachments')
        .insert(attachmentData)

      if (attachmentError) {
        console.warn('添付ファイルの保存に失敗:', attachmentError)
        // 添付ファイルエラーは警告のみで続行
      }
    }

    console.log('日報作成完了:', report)
  }, [user])

  // フォーム送信ハンドラー
  const handleSubmit = useCallback(async (
    formData: ReportFormData, 
    action: 'save_draft' | 'submit'
  ) => {
    try {
      const reportRequest: CreateReportRequest = {
        work_date: formData.work_date,
        work_site_id: formData.work_site_id,
        work_hours: formData.work_hours,
        work_content: formData.work_content,
        progress_rate: formData.progress_rate,
        special_notes: formData.special_notes,
        status: action === 'submit' ? 'submitted' : 'draft',
        attachments: formData.attachments.map(att => ({
          file_name: att.file_name,
          file_url: att.file_url,
          file_type: att.file_type,
          file_size: att.file_size
        }))
      }

      await createReport(reportRequest)
      
      const message = action === 'submit'
        ? `日報を提出しました${formData.attachments.length > 0 ? `（添付${formData.attachments.length}件）` : ''}`
        : '下書きを保存しました'
      
      Alert.alert(
        action === 'submit' ? '提出完了' : '保存完了', 
        message,
        [{
          text: 'OK',
          onPress: () => router.back()
        }]
      )
    } catch (error) {
      console.error('日報作成エラー:', error)
      throw error
    }
  }, [createReport])

  // ヘッダーレンダリング
  const renderHeader = () => (
    <Surface style={styles.header}>
      <IconButton
        icon="close"
        size={24}
        onPress={() => router.back()}
      />
      <View style={styles.headerCenter}>
        <StyledText variant="title" weight="semibold">日報作成</StyledText>
        <StyledText variant="caption" color="secondary">
          {dayjs().tz('Asia/Tokyo').format('YYYY年MM月DD日')}
        </StyledText>
      </View>
      <View style={{ width: 48 }} />
    </Surface>
  )

  // エラー表示
  if (state.error) {
    return (
      <SafeAreaView style={styles.container}>
        {renderHeader()}
        <View style={styles.errorContainer}>
          <StyledText variant="body" color="error" align="center">
            {state.error}
          </StyledText>
          <StyledText variant="caption" color="secondary" align="center" style={styles.errorRetry}>
            画面を再読み込みしてください
          </StyledText>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}
      
      <ReportForm
        workSites={state.workSites}
        onSubmit={handleSubmit}
        loading={state.loading}
        allowDraft={true}
      />
    </SafeAreaView>
  )
}

// =============================================================================
// STYLES  
// =============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    ...Shadows.small,
  },
  headerCenter: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  errorRetry: {
    marginTop: Spacing.sm,
  },
})