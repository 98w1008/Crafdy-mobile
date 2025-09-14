/**
 * 日報編集画面
 * 既存の日報を編集する画面
 */

import React, { useState, useCallback, useEffect } from 'react'
import {
  View,
  StyleSheet,
  SafeAreaView,
  Alert,
  ActivityIndicator
} from 'react-native'
import {
  Surface,
  IconButton
} from 'react-native-paper'
import { router, useLocalSearchParams } from 'expo-router'
import * as Haptics from 'expo-haptics'
import dayjs from 'dayjs'
import timezone from 'dayjs/plugin/timezone'
import utc from 'dayjs/plugin/utc'

import { Colors, Spacing, Shadows } from '@/constants/Colors'
import { StyledText } from '@/components/ui'
import { ReportForm } from '@/components/reports/ReportForm'
import { 
  Report,
  ReportFormData, 
  UpdateReportRequest, 
  WorkSite,
  AttachmentFormData
} from '@/types/reports'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

// dayjs timezone設定
dayjs.extend(utc)
dayjs.extend(timezone)

// =============================================================================
// TYPES
// =============================================================================

interface EditReportScreenState {
  report: Report | null
  workSites: WorkSite[]
  loading: boolean
  error: string | null
}

// =============================================================================
// COMPONENT
// =============================================================================

export default function EditReportScreen() {
  const { user } = useAuth()
  const { id } = useLocalSearchParams<{ id: string }>()
  const [state, setState] = useState<EditReportScreenState>({
    report: null,
    workSites: [],
    loading: true,
    error: null
  })

  // 日報データの取得
  const loadReport = useCallback(async () => {
    if (!user || !id) return

    try {
      // 日報データを取得
      const { data: reportData, error: reportError } = await supabase
        .from('reports')
        .select(`
          *,
          work_site:work_sites(id, name, address),
          approver:users!approved_by(id, full_name),
          attachments:report_attachments(*)
        `)
        .eq('id', id)
        .eq('user_id', user.id) // 自分の日報のみ編集可能
        .single()

      if (reportError) throw reportError

      // 現場データを取得
      const { data: workSitesData, error: sitesError } = await supabase
        .from('work_sites')
        .select('*')
        .eq('company_id', user.company_id)
        .order('name')

      if (sitesError) throw sitesError

      setState({
        report: reportData,
        workSites: workSitesData || [],
        loading: false,
        error: null
      })
    } catch (error) {
      console.error('日報データ取得エラー:', error)
      setState(prev => ({
        ...prev,
        loading: false,
        error: 'データの読み込みに失敗しました'
      }))
    }
  }, [user, id])

  useEffect(() => {
    loadReport()
  }, [loadReport])

  // 日報更新処理
  const updateReport = useCallback(async (updateData: UpdateReportRequest): Promise<void> => {
    if (!user) {
      throw new Error('ユーザー情報がありません')
    }

    // 日報データを更新
    const { error: reportError } = await supabase
      .from('reports')
      .update({
        work_date: updateData.work_date,
        work_site_id: updateData.work_site_id,
        work_hours: updateData.work_hours,
        work_content: updateData.work_content,
        progress_rate: updateData.progress_rate,
        special_notes: updateData.special_notes,
        status: updateData.status,
        submitted_at: updateData.status === 'submitted' ? new Date().toISOString() : null,
        updated_at: new Date().toISOString()
      })
      .eq('id', updateData.id)

    if (reportError) throw reportError

    // 既存の添付ファイルを削除
    const { error: deleteAttachmentError } = await supabase
      .from('report_attachments')
      .delete()
      .eq('report_id', updateData.id)

    if (deleteAttachmentError) {
      console.warn('既存添付ファイル削除エラー:', deleteAttachmentError)
    }

    // 新しい添付ファイルを挿入
    if (updateData.attachments && updateData.attachments.length > 0) {
      const attachmentData = updateData.attachments.map(attachment => ({
        report_id: updateData.id,
        file_name: attachment.file_name,
        file_url: attachment.file_url,
        file_type: attachment.file_type,
        file_size: attachment.file_size
      }))

      const { error: attachmentError } = await supabase
        .from('report_attachments')
        .insert(attachmentData)

      if (attachmentError) {
        console.warn('添付ファイル保存エラー:', attachmentError)
      }
    }

    console.log('日報更新完了:', updateData)
  }, [user])

  // フォーム送信ハンドラー
  const handleSubmit = useCallback(async (
    formData: ReportFormData, 
    action: 'save_draft' | 'submit'
  ) => {
    if (!state.report) return

    try {
      const updateRequest: UpdateReportRequest = {
        id: state.report.id,
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

      await updateReport(updateRequest)
      
      const message = action === 'submit'
        ? `日報を更新・提出しました${formData.attachments.length > 0 ? `（添付${formData.attachments.length}件）` : ''}`
        : '下書きを更新しました'
      
      Alert.alert(
        action === 'submit' ? '提出完了' : '更新完了', 
        message,
        [{
          text: 'OK',
          onPress: () => router.back()
        }]
      )
    } catch (error) {
      console.error('日報更新エラー:', error)
      throw error
    }
  }, [state.report, updateReport])

  // フォーム初期データの準備
  const getInitialFormData = useCallback((): Partial<ReportFormData> | undefined => {
    if (!state.report) return undefined

    const attachments: AttachmentFormData[] = (state.report.attachments || []).map(att => ({
      id: att.id,
      file_name: att.file_name,
      file_url: att.file_url,
      file_type: att.file_type,
      file_size: att.file_size,
      isNew: false
    }))

    return {
      work_date: state.report.work_date,
      work_site_id: state.report.work_site_id || undefined,
      work_hours: state.report.work_hours,
      work_content: state.report.work_content,
      progress_rate: state.report.progress_rate,
      special_notes: state.report.special_notes || undefined,
      attachments
    }
  }, [state.report])

  // ヘッダーレンダリング
  const renderHeader = () => (
    <Surface style={styles.header}>
      <IconButton
        icon="close"
        size={24}
        onPress={() => router.back()}
      />
      <View style={styles.headerCenter}>
        <StyledText variant="title" weight="semibold">日報編集</StyledText>
        {state.report && (
          <StyledText variant="caption" color="secondary">
            {dayjs(state.report.work_date).format('YYYY年MM月DD日')}
          </StyledText>
        )}
      </View>
      <View style={{ width: 48 }} />
    </Surface>
  )

  // 編集権限チェック
  const canEdit = state.report && 
    (state.report.status === 'draft' || state.report.status === 'rejected') &&
    state.report.user_id === user?.id

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

  // 編集権限がない場合
  if (!state.loading && state.report && !canEdit) {
    return (
      <SafeAreaView style={styles.container}>
        {renderHeader()}
        <View style={styles.errorContainer}>
          <StyledText variant="body" color="error" align="center">
            この日報は編集できません
          </StyledText>
          <StyledText variant="caption" color="secondary" align="center" style={styles.errorRetry}>
            提出済みまたは承認済みの日報は編集できません
          </StyledText>
        </View>
      </SafeAreaView>
    )
  }

  // ローディング表示
  if (state.loading) {
    return (
      <SafeAreaView style={styles.container}>
        {renderHeader()}
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <StyledText variant="body" color="secondary" align="center" style={styles.loadingText}>
            日報データを読み込み中...
          </StyledText>
        </View>
      </SafeAreaView>
    )
  }

  const initialData = getInitialFormData()

  return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}
      
      {state.report && initialData && (
        <ReportForm
          initialData={initialData}
          workSites={state.workSites}
          isEditing={true}
          onSubmit={handleSubmit}
          loading={state.loading}
          allowDraft={state.report.status === 'draft' || state.report.status === 'rejected'}
        />
      )}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  loadingText: {
    marginTop: Spacing.md,
  },
})