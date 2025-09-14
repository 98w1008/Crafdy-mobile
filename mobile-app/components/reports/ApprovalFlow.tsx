/**
 * 承認フローコンポーネント
 * 日報の承認・差戻し機能を提供
 */

import React, { useState, useCallback } from 'react'
import {
  View,
  StyleSheet,
  Alert,
  ScrollView
} from 'react-native'
import {
  Surface,
  TextInput,
  Chip,
  Divider,
  IconButton,
  Avatar
} from 'react-native-paper'
import * as Haptics from 'expo-haptics'
import dayjs from 'dayjs'

import { Colors, Spacing, Typography, BorderRadius, Shadows } from '@/constants/Colors'
import { StyledText, StyledButton, Card } from '@/components/ui'
import { 
  Report, 
  ReportStatus, 
  ApprovalAction, 
  ApprovalRequest,
  REPORT_STATUS_LABELS
} from '@/types/reports'

// =============================================================================
// TYPES
// =============================================================================

interface ApprovalFlowProps {
  report: Report
  currentUserId: string
  canApprove?: boolean
  onApprovalAction?: (request: ApprovalRequest) => Promise<void>
  onEdit?: () => void
  onWithdraw?: () => void
  loading?: boolean
  readonly?: boolean
}

interface StatusTimelineItem {
  status: ReportStatus
  timestamp?: string
  user?: {
    id: string
    name: string
  }
  reason?: string
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

const getStatusColor = (status: ReportStatus): string => {
  switch (status) {
    case 'draft':
      return Colors.warning
    case 'submitted':
      return Colors.info
    case 'approved':
      return Colors.success
    case 'rejected':
      return Colors.error
    default:
      return Colors.onSurface
  }
}

const getStatusIcon = (status: ReportStatus): string => {
  switch (status) {
    case 'draft':
      return 'file-document-edit-outline'
    case 'submitted':
      return 'send'
    case 'approved':
      return 'check-circle'
    case 'rejected':
      return 'close-circle'
    default:
      return 'help-circle'
  }
}

const canUserEdit = (report: Report, currentUserId: string): boolean => {
  return report.user_id === currentUserId && 
         (report.status === 'draft' || report.status === 'rejected')
}

const canUserWithdraw = (report: Report, currentUserId: string): boolean => {
  return report.user_id === currentUserId && report.status === 'submitted'
}

// =============================================================================
// COMPONENT
// =============================================================================

export const ApprovalFlow: React.FC<ApprovalFlowProps> = ({
  report,
  currentUserId,
  canApprove = false,
  onApprovalAction,
  onEdit,
  onWithdraw,
  loading = false,
  readonly = false
}) => {
  const [rejectionReason, setRejectionReason] = useState('')
  const [showRejectionInput, setShowRejectionInput] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // タイムライン生成
  const generateTimeline = (): StatusTimelineItem[] => {
    const timeline: StatusTimelineItem[] = []

    // 作成
    timeline.push({
      status: 'draft',
      timestamp: report.created_at,
      user: { id: report.user_id, name: '作成者' }
    })

    // 提出
    if (report.submitted_at) {
      timeline.push({
        status: 'submitted',
        timestamp: report.submitted_at,
        user: { id: report.user_id, name: '提出者' }
      })
    }

    // 承認・差戻し
    if (report.status === 'approved' && report.approved_at) {
      timeline.push({
        status: 'approved',
        timestamp: report.approved_at,
        user: report.approver ? { 
          id: report.approver.id, 
          name: report.approver.full_name 
        } : undefined
      })
    } else if (report.status === 'rejected') {
      timeline.push({
        status: 'rejected',
        timestamp: report.updated_at,
        user: report.approver ? { 
          id: report.approver.id, 
          name: report.approver.full_name 
        } : undefined,
        reason: report.rejection_reason
      })
    }

    return timeline.reverse() // 最新順に表示
  }

  // 承認処理
  const handleApprove = useCallback(async () => {
    if (!onApprovalAction || readonly) return

    Alert.alert(
      '承認確認',
      'この日報を承認しますか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '承認する',
          style: 'default',
          onPress: async () => {
            setIsSubmitting(true)
            try {
              await onApprovalAction({
                report_id: report.id,
                action: 'approve'
              })
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
            } catch (error) {
              console.error('承認エラー:', error)
              Alert.alert('エラー', '承認処理に失敗しました')
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
            } finally {
              setIsSubmitting(false)
            }
          }
        }
      ]
    )
  }, [onApprovalAction, report.id, readonly])

  // 差戻し処理
  const handleReject = useCallback(async () => {
    if (!onApprovalAction || readonly) return

    if (!rejectionReason.trim()) {
      Alert.alert('入力エラー', '差戻し理由を入力してください')
      return
    }

    Alert.alert(
      '差戻し確認',
      `この日報を差戻ししますか？\n\n理由: ${rejectionReason}`,
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '差戻し',
          style: 'destructive',
          onPress: async () => {
            setIsSubmitting(true)
            try {
              await onApprovalAction({
                report_id: report.id,
                action: 'reject',
                rejection_reason: rejectionReason
              })
              setShowRejectionInput(false)
              setRejectionReason('')
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
            } catch (error) {
              console.error('差戻しエラー:', error)
              Alert.alert('エラー', '差戻し処理に失敗しました')
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
            } finally {
              setIsSubmitting(false)
            }
          }
        }
      ]
    )
  }, [onApprovalAction, report.id, rejectionReason, readonly])

  // 取り下げ処理
  const handleWithdraw = useCallback(() => {
    if (!onWithdraw || readonly) return

    Alert.alert(
      '取り下げ確認',
      'この日報を取り下げて下書きに戻しますか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '取り下げ',
          style: 'destructive',
          onPress: () => {
            onWithdraw()
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
          }
        }
      ]
    )
  }, [onWithdraw, readonly])

  // 差戻し理由入力の表示切り替え
  const toggleRejectionInput = useCallback(() => {
    setShowRejectionInput(!showRejectionInput)
    if (showRejectionInput) {
      setRejectionReason('')
    }
  }, [showRejectionInput])

  const timeline = generateTimeline()
  const isOwner = report.user_id === currentUserId
  const userCanEdit = canUserEdit(report, currentUserId)
  const userCanWithdraw = canUserWithdraw(report, currentUserId)

  return (
    <Card variant="elevated" style={styles.container}>
      {/* ステータス表示 */}
      <View style={styles.statusHeader}>
        <View style={styles.statusInfo}>
          <Chip
            icon={getStatusIcon(report.status)}
            style={[styles.statusChip, { backgroundColor: getStatusColor(report.status) }]}
            textStyle={styles.statusChipText}
          >
            {REPORT_STATUS_LABELS[report.status]}
          </Chip>
          <StyledText variant="caption" color="secondary" style={styles.statusDate}>
            {dayjs(report.updated_at).format('YYYY年MM月DD日 HH:mm')}
          </StyledText>
        </View>

        {/* 承認者表示 */}
        {report.approver && (report.status === 'approved' || report.status === 'rejected') && (
          <View style={styles.approverInfo}>
            <Avatar.Text
              size={32}
              label={report.approver.full_name.charAt(0)}
              style={styles.approverAvatar}
            />
            <StyledText variant="caption" color="secondary">
              {report.status === 'approved' ? '承認者' : '差戻し者'}
            </StyledText>
            <StyledText variant="caption" weight="medium">
              {report.approver.full_name}
            </StyledText>
          </View>
        )}
      </View>

      {/* 差戻し理由表示 */}
      {report.status === 'rejected' && report.rejection_reason && (
        <Surface style={styles.rejectionReasonDisplay}>
          <StyledText variant="caption" color="error" weight="medium" style={styles.rejectionLabel}>
            差戻し理由
          </StyledText>
          <StyledText variant="body" style={styles.rejectionText}>
            {report.rejection_reason}
          </StyledText>
        </Surface>
      )}

      <Divider style={styles.divider} />

      {/* タイムライン */}
      <View style={styles.timelineSection}>
        <StyledText variant="subtitle" weight="semibold" style={styles.timelineTitle}>
          承認履歴
        </StyledText>
        
        <ScrollView style={styles.timeline}>
          {timeline.map((item, index) => (
            <View key={`${item.status}-${index}`} style={styles.timelineItem}>
              <View style={styles.timelineItemHeader}>
                <Chip
                  icon={getStatusIcon(item.status)}
                  compact
                  style={[styles.timelineChip, { backgroundColor: getStatusColor(item.status) }]}
                  textStyle={styles.timelineChipText}
                >
                  {REPORT_STATUS_LABELS[item.status]}
                </Chip>
                
                {item.timestamp && (
                  <StyledText variant="caption" color="secondary">
                    {dayjs(item.timestamp).format('MM/DD HH:mm')}
                  </StyledText>
                )}
              </View>
              
              {item.user && (
                <StyledText variant="caption" color="secondary" style={styles.timelineUser}>
                  {item.user.name}
                </StyledText>
              )}
              
              {item.reason && (
                <StyledText variant="caption" style={styles.timelineReason}>
                  理由: {item.reason}
                </StyledText>
              )}
            </View>
          ))}
        </ScrollView>
      </View>

      {!readonly && (
        <>
          <Divider style={styles.divider} />

          {/* アクションボタン */}
          <View style={styles.actionsSection}>
            {/* 提出者のアクション */}
            {isOwner && (
              <View style={styles.ownerActions}>
                {userCanEdit && (
                  <StyledButton
                    title="編集"
                    variant="outline"
                    size="md"
                    onPress={onEdit}
                    disabled={loading}
                    style={styles.actionButton}
                  />
                )}
                
                {userCanWithdraw && (
                  <StyledButton
                    title="取り下げ"
                    variant="outline"
                    size="md"
                    onPress={handleWithdraw}
                    disabled={loading}
                    style={styles.actionButton}
                  />
                )}
              </View>
            )}

            {/* 承認者のアクション */}
            {canApprove && report.status === 'submitted' && (
              <View style={styles.approverActions}>
                <StyledButton
                  title="承認"
                  variant="primary"
                  size="md"
                  onPress={handleApprove}
                  loading={isSubmitting}
                  disabled={loading || isSubmitting}
                  style={styles.approveButton}
                />
                
                <StyledButton
                  title={showRejectionInput ? 'キャンセル' : '差戻し'}
                  variant="outline"
                  size="md"
                  onPress={toggleRejectionInput}
                  disabled={loading || isSubmitting}
                  style={styles.rejectButton}
                />
              </View>
            )}

            {/* 差戻し理由入力 */}
            {showRejectionInput && (
              <View style={styles.rejectionInput}>
                <TextInput
                  mode="outlined"
                  label="差戻し理由"
                  placeholder="修正が必要な点を具体的に記入してください"
                  value={rejectionReason}
                  onChangeText={setRejectionReason}
                  multiline
                  numberOfLines={3}
                  error={!rejectionReason.trim()}
                  style={styles.rejectionTextInput}
                />
                
                <StyledButton
                  title="差戻し実行"
                  variant="destructive"
                  size="md"
                  onPress={handleReject}
                  loading={isSubmitting}
                  disabled={!rejectionReason.trim() || loading || isSubmitting}
                  style={styles.executeRejectButton}
                />
              </View>
            )}
          </View>
        </>
      )}
    </Card>
  )
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.lg,
    padding: Spacing.md
  },
  
  // Status Header
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.md
  },
  statusInfo: {
    flex: 1
  },
  statusChip: {
    marginBottom: Spacing.xs
  },
  statusChipText: {
    color: Colors.onPrimary,
    fontWeight: '600'
  },
  statusDate: {
    marginLeft: Spacing.xs
  },
  approverInfo: {
    alignItems: 'center',
    gap: Spacing.xs
  },
  approverAvatar: {
    backgroundColor: Colors.primary
  },
  
  // Rejection Reason Display
  rejectionReasonDisplay: {
    padding: Spacing.md,
    backgroundColor: Colors.errorContainer,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md
  },
  rejectionLabel: {
    marginBottom: Spacing.xs
  },
  rejectionText: {
    color: Colors.onErrorContainer
  },
  
  divider: {
    marginVertical: Spacing.md
  },
  
  // Timeline
  timelineSection: {
    marginBottom: Spacing.md
  },
  timelineTitle: {
    marginBottom: Spacing.md
  },
  timeline: {
    maxHeight: 200
  },
  timelineItem: {
    marginBottom: Spacing.md,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.outline
  },
  timelineItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs
  },
  timelineChip: {
    height: 28
  },
  timelineChipText: {
    color: Colors.onPrimary,
    fontSize: 12
  },
  timelineUser: {
    marginBottom: Spacing.xs
  },
  timelineReason: {
    fontStyle: 'italic'
  },
  
  // Actions
  actionsSection: {
    gap: Spacing.md
  },
  ownerActions: {
    flexDirection: 'row',
    gap: Spacing.md
  },
  approverActions: {
    flexDirection: 'row',
    gap: Spacing.md
  },
  actionButton: {
    flex: 1
  },
  approveButton: {
    flex: 1
  },
  rejectButton: {
    flex: 1
  },
  
  // Rejection Input
  rejectionInput: {
    gap: Spacing.md,
    padding: Spacing.md,
    backgroundColor: Colors.errorContainer,
    borderRadius: BorderRadius.md
  },
  rejectionTextInput: {
    backgroundColor: Colors.surface
  },
  executeRejectButton: {
    alignSelf: 'flex-end',
    minWidth: 120
  }
})

export default ApprovalFlow