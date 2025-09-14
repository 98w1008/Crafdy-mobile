/**
 * 日報詳細・承認画面
 * 日報の詳細表示と承認操作を行う画面
 */

import React, { useState, useCallback, useEffect } from 'react'
import {
  View,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
  ActivityIndicator,
  TouchableOpacity
} from 'react-native'
import {
  Surface,
  IconButton,
  Chip,
  Badge,
  Divider
} from 'react-native-paper'
import { router, useLocalSearchParams } from 'expo-router'
import * as Haptics from 'expo-haptics'
import dayjs from 'dayjs'
import timezone from 'dayjs/plugin/timezone'
import utc from 'dayjs/plugin/utc'

import { Colors, Spacing, Typography, BorderRadius, Shadows } from '@/constants/Colors'
import { StyledText, StyledButton, Card } from '@/components/ui'
import { ApprovalFlow } from '@/components/reports/ApprovalFlow'
import { AttachmentSection } from '@/components/reports/AttachmentSection'
import { 
  Report, 
  ApprovalRequest, 
  AttachmentFormData,
  REPORT_STATUS_LABELS,
  ATTACHMENT_FILE_TYPE_LABELS
} from '@/types/reports'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useApprovalPermissions } from '@/hooks/useApprovalPermissions'

// dayjs timezone設定
dayjs.extend(utc)
dayjs.extend(timezone)

// =============================================================================
// TYPES
// =============================================================================

interface DetailScreenState {
  report: Report | null
  loading: boolean
  error: string | null
}

// =============================================================================
// COMPONENT
// =============================================================================

export default function ReportDetailScreen() {
  const { user } = useAuth()
  const { id } = useLocalSearchParams<{ id: string }>()
  const { canApprove } = useApprovalPermissions()
  
  const [state, setState] = useState<DetailScreenState>({
    report: null,
    loading: true,
    error: null
  })

  // 日報データの取得
  const loadReport = useCallback(async () => {
    if (!user || !id) return

    try {
      setState(prev => ({ ...prev, loading: true, error: null }))

      const { data, error } = await supabase
        .from('reports')
        .select(`
          *,
          work_site:work_sites(id, name, address),
          user:users!user_id(id, full_name),
          approver:users!approved_by(id, full_name),
          attachments:report_attachments(*)
        `)
        .eq('id', id)
        .single()

      if (error) throw error

      setState({
        report: data,
        loading: false,
        error: null
      })
    } catch (error) {
      console.error('日報データ取得エラー:', error)
      setState({
        report: null,
        loading: false,
        error: 'データの読み込みに失敗しました'
      })
    }
  }, [user, id])

  useEffect(() => {
    loadReport()
  }, [loadReport])

  // 承認処理
  const handleApprovalAction = useCallback(async (request: ApprovalRequest) => {
    if (!user) return

    try {
      const updateData: any = {
        status: request.action === 'approve' ? 'approved' : 'rejected',
        updated_at: new Date().toISOString()
      }

      if (request.action === 'approve') {
        updateData.approved_at = new Date().toISOString()
        updateData.approved_by = user.id
        updateData.rejection_reason = null
      } else {
        updateData.rejection_reason = request.rejection_reason
        updateData.approved_by = user.id
        updateData.approved_at = null
      }

      const { error } = await supabase
        .from('reports')
        .update(updateData)
        .eq('id', request.report_id)

      if (error) throw error

      // データを再取得
      await loadReport()

      // 通知（モック）
      console.log('📬 承認通知:', {
        type: request.action === 'approve' ? 'report_approved' : 'report_rejected',
        report_id: request.report_id,
        user_name: user.full_name,
        rejection_reason: request.rejection_reason
      })

    } catch (error) {
      console.error('承認処理エラー:', error)
      throw error
    }
  }, [user, loadReport])

  // 編集画面へ遷移
  const handleEdit = useCallback(() => {
    if (state.report) {
      router.push(`/reports/edit/${state.report.id}`)
    }
  }, [state.report])

  // 取り下げ処理
  const handleWithdraw = useCallback(async () => {
    if (!state.report) return

    try {
      const { error } = await supabase
        .from('reports')
        .update({
          status: 'draft',
          submitted_at: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', state.report.id)

      if (error) throw error

      Alert.alert('取り下げ完了', '日報を下書きに戻しました', [
        { text: 'OK', onPress: () => router.back() }
      ])
    } catch (error) {
      console.error('取り下げエラー:', error)
      Alert.alert('エラー', '取り下げ処理に失敗しました')
    }
  }, [state.report])

  // ヘッダーレンダリング
  const renderHeader = () => (
    <Surface style={styles.header}>
      <IconButton
        icon="arrow-left"
        size={24}
        onPress={() => router.back()}
      />
      <View style={styles.headerCenter}>
        <StyledText variant="title" weight="semibold">日報詳細</StyledText>
        {state.report && (
          <StyledText variant="caption" color="secondary">
            {dayjs(state.report.work_date).format('YYYY年MM月DD日')}
          </StyledText>
        )}
      </View>
      <View style={{ width: 48 }} />
    </Surface>
  )

  // 日報詳細情報の表示
  const renderReportDetails = () => {
    if (!state.report) return null

    const attachmentData: AttachmentFormData[] = (state.report.attachments || []).map(att => ({
      id: att.id,
      file_name: att.file_name,
      file_url: att.file_url,
      file_type: att.file_type,
      file_size: att.file_size,
      isNew: false
    }))

    return (
      <>
        {/* 基本情報 */}
        <Card variant="elevated" style={styles.section}>
          <StyledText variant="subtitle" weight="semibold" style={styles.sectionTitle}>
            📅 基本情報
          </StyledText>
          
          <View style={styles.infoRow}>
            <StyledText variant="body" weight="medium" style={styles.infoLabel}>
              作業日
            </StyledText>
            <StyledText variant="body">
              {dayjs(state.report.work_date).format('YYYY年MM月DD日 (ddd)')}
            </StyledText>
          </View>

          {state.report.work_site && (
            <View style={styles.infoRow}>
              <StyledText variant="body" weight="medium" style={styles.infoLabel}>
                作業現場
              </StyledText>
              <View style={styles.workSiteInfo}>
                <StyledText variant="body">{state.report.work_site.name}</StyledText>
                {state.report.work_site.address && (
                  <StyledText variant="caption" color="secondary">
                    {state.report.work_site.address}
                  </StyledText>
                )}
              </View>
            </View>
          )}

          <View style={styles.infoRow}>
            <StyledText variant="body" weight="medium" style={styles.infoLabel}>
              作業時間
            </StyledText>
            <StyledText variant="body">
              {state.report.work_hours}時間
            </StyledText>
          </View>

          <View style={styles.infoRow}>
            <StyledText variant="body" weight="medium" style={styles.infoLabel}>
              進捗率
            </StyledText>
            <Chip style={styles.progressChip}>
              {state.report.progress_rate}%
            </Chip>
          </View>

          {state.report.user && (
            <View style={styles.infoRow}>
              <StyledText variant="body" weight="medium" style={styles.infoLabel}>
                作業者
              </StyledText>
              <StyledText variant="body">
                {state.report.user.full_name}
              </StyledText>
            </View>
          )}
        </Card>

        {/* 作業内容 */}
        <Card variant="elevated" style={styles.section}>
          <StyledText variant="subtitle" weight="semibold" style={styles.sectionTitle}>
            🔨 作業内容
          </StyledText>
          <StyledText variant="body" style={styles.workContentText}>
            {state.report.work_content}
          </StyledText>
        </Card>

        {/* 特記事項 */}
        {state.report.special_notes && (
          <Card variant="elevated" style={styles.section}>
            <StyledText variant="subtitle" weight="semibold" style={styles.sectionTitle}>
              📝 特記事項
            </StyledText>
            <StyledText variant="body" style={styles.specialNotesText}>
              {state.report.special_notes}
            </StyledText>
          </Card>
        )}

        {/* 添付ファイル */}
        {attachmentData.length > 0 && (
          <AttachmentSection
            attachments={attachmentData}
            onAttachmentsChange={() => {}} // 読み取り専用
            readonly={true}
          />
        )}

        {/* 承認フロー */}
        <ApprovalFlow
          report={state.report}
          currentUserId={user?.id || ''}
          canApprove={canApprove}
          onApprovalAction={handleApprovalAction}
          onEdit={handleEdit}
          onWithdraw={handleWithdraw}
        />
      </>
    )
  }

  // エラー表示
  if (state.error) {
    return (
      <SafeAreaView style={styles.container}>
        {renderHeader()}
        <View style={styles.errorContainer}>
          <StyledText variant="body" color="error" align="center">
            {state.error}
          </StyledText>
          <StyledButton
            title="再試行"
            variant="outline"
            onPress={loadReport}
            style={styles.retryButton}
          />
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
            日報を読み込み中...
          </StyledText>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}
      
      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {renderReportDetails()}
      </ScrollView>
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
  
  // Header
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
  
  // Content
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.md,
    paddingBottom: Spacing['2xl'],
  },
  
  // Sections
  section: {
    marginBottom: Spacing.lg,
    padding: Spacing.md,
  },
  sectionTitle: {
    marginBottom: Spacing.md,
  },
  
  // Info Rows
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
    minHeight: 24,
  },
  infoLabel: {
    width: 100,
    flexShrink: 0,
    color: Colors.onSurfaceVariant,
  },
  workSiteInfo: {
    flex: 1,
    gap: Spacing.xs,
  },
  progressChip: {
    backgroundColor: Colors.primaryContainer,
    height: 32,
  },
  
  // Content Text
  workContentText: {
    lineHeight: 22,
    color: Colors.onSurface,
  },
  specialNotesText: {
    lineHeight: 22,
    color: Colors.onSurface,
    fontStyle: 'italic',
  },
  
  // States
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  retryButton: {
    minWidth: 120,
  },
})