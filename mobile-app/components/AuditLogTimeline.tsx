import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  ViewStyle,
} from 'react-native';
import { StyledText } from './ui/StyledText';
import { Icon } from './ui';
import { useColors, useSpacing, useRadius } from '@/theme/ThemeProvider';
import { getAuditLogs, AuditLog } from '../lib/approval-system';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { ja } from 'date-fns/locale';

interface AuditLogTimelineProps {
  submissionId: string;
  entityType: 'report' | 'receipt' | 'invoice';
  style?: ViewStyle;
}

/**
 * 変更履歴タイムライン表示コンポーネント
 */
export function AuditLogTimeline({
  submissionId,
  entityType,
  style
}: AuditLogTimelineProps) {
  const colors = useColors();
  const spacing = useSpacing();
  const radius = useRadius();

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 監査ログを取得
  const fetchAuditLogs = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const result = await getAuditLogs(submissionId);
      if (result.error) {
        throw new Error(result.error);
      }

      setLogs(result.data || []);
    } catch (err) {
      console.error('Failed to fetch audit logs:', err);
      setError('履歴の取得に失敗しました');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAuditLogs();
  }, [submissionId]);

  // アクションのアイコンと色を取得
  const getActionConfig = (action: AuditLog['action']) => {
    switch (action) {
      case 'create':
        return {
          icon: 'add-circle' as const,
          color: 'success',
          label: '作成'
        };
      case 'edit':
        return {
          icon: 'create' as const,
          color: 'primary',
          label: '編集'
        };
      case 'approve':
        return {
          icon: 'checkmark-circle' as const,
          color: 'success',
          label: '承認'
        };
      case 'reject':
        return {
          icon: 'close-circle' as const,
          color: 'danger',
          label: '却下'
        };
      case 'cancel_approval':
        return {
          icon: 'refresh-circle' as const,
          color: 'warning',
          label: '承認取消'
        };
      default:
        return {
          icon: 'information-circle' as const,
          color: 'secondary',
          label: '変更'
        };
    }
  };

  // 相対時間の表示
  const formatRelativeTime = (dateString: string) => {
    try {
      return formatDistanceToNow(parseISO(dateString), {
        addSuffix: true,
        locale: ja
      });
    } catch {
      return '日時不明';
    }
  };

  // 空の状態
  const renderEmptyState = () => (
    <View style={{
      alignItems: 'center',
      paddingVertical: spacing[8],
    }}>
      <Icon 
        name="time" 
        size={48} 
        color="textTertiary" 
        style={{ marginBottom: spacing[3] }}
      />
      <StyledText variant="subtitle" color="secondary" align="center">
        変更履歴はありません
      </StyledText>
      <StyledText variant="caption" color="tertiary" align="center" style={{ marginTop: spacing[1] }}>
        {entityType === 'report' ? '日報' : 
         entityType === 'receipt' ? 'レシート' : '請求書'}の変更があると表示されます
      </StyledText>
    </View>
  );

  // ログアイテムのレンダリング
  const renderLogItem = (log: AuditLog, index: number) => {
    const actionConfig = getActionConfig(log.action);
    const isLast = index === logs.length - 1;

    return (
      <View key={log.id} style={{ flexDirection: 'row' }}>
        {/* タイムラインライン */}
        <View style={{ alignItems: 'center', marginRight: spacing[3] }}>
          <View style={{
            width: 32,
            height: 32,
            borderRadius: 16,
            backgroundColor: colors.background.primary,
            borderWidth: 2,
            borderColor: colors[actionConfig.color]?.DEFAULT || colors.border,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Icon 
              name={actionConfig.icon} 
              size={16} 
              color={actionConfig.color} 
            />
          </View>
          {!isLast && (
            <View style={{
              width: 2,
              flex: 1,
              backgroundColor: colors.border,
              marginTop: spacing[2],
            }} />
          )}
        </View>

        {/* コンテンツ */}
        <View style={{
          flex: 1,
          backgroundColor: colors.surface,
          borderRadius: radius.md,
          padding: spacing[4],
          marginBottom: isLast ? 0 : spacing[3],
          borderWidth: 1,
          borderColor: colors.border,
        }}>
          <View style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: spacing[2],
          }}>
            <StyledText variant="subtitle" weight="semibold">
              {actionConfig.label}
            </StyledText>
            <StyledText variant="caption" color="tertiary">
              {formatRelativeTime(log.created_at)}
            </StyledText>
          </View>

          {/* ステータス変更情報 */}
          {log.previous_status && log.new_status && (
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginBottom: spacing[2],
            }}>
              <StyledText variant="caption" color="secondary">
                {getStatusLabel(log.previous_status)}
              </StyledText>
              <Icon 
                name="arrow-forward" 
                size={14} 
                color="textSecondary" 
                style={{ marginHorizontal: spacing[2] }}
              />
              <StyledText variant="caption" weight="medium">
                {getStatusLabel(log.new_status)}
              </StyledText>
            </View>
          )}

          {/* メタデータ表示 */}
          {log.metadata?.comment && (
            <View style={{
              backgroundColor: colors.background.secondary,
              borderRadius: radius.sm,
              padding: spacing[2],
              marginTop: spacing[2],
            }}>
              <StyledText variant="caption" color="secondary">
                コメント: {log.metadata.comment}
              </StyledText>
            </View>
          )}

          {log.metadata?.reject_reason && (
            <View style={{
              backgroundColor: colors.danger.light + '20',
              borderRadius: radius.sm,
              padding: spacing[2],
              marginTop: spacing[2],
            }}>
              <StyledText variant="caption" color="danger">
                却下理由: {log.metadata.reject_reason}
              </StyledText>
            </View>
          )}
        </View>
      </View>
    );
  };

  // ステータスラベルの取得
  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'draft': return '下書き';
      case 'submitted': return '未承認';
      case 'approved': return '承認済';
      case 'rejected': return '却下';
      default: return status;
    }
  };

  if (loading) {
    return (
      <View style={[{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing[6],
      }, style]}>
        <ActivityIndicator size="large" color={colors.primary.DEFAULT} />
        <StyledText variant="caption" color="secondary" style={{ marginTop: spacing[3] }}>
          履歴を読み込み中...
        </StyledText>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing[6],
      }, style]}>
        <Icon name="alert-circle" size={48} color="danger" />
        <StyledText variant="subtitle" color="danger" align="center" style={{ marginTop: spacing[3] }}>
          エラーが発生しました
        </StyledText>
        <StyledText variant="caption" color="secondary" align="center" style={{ marginTop: spacing[1] }}>
          {error}
        </StyledText>
      </View>
    );
  }

  return (
    <ScrollView
      style={[{ flex: 1 }, style]}
      contentContainerStyle={{
        padding: spacing[4],
        flexGrow: 1,
      }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => fetchAuditLogs(true)}
          colors={[colors.primary.DEFAULT]}
        />
      }
      showsVerticalScrollIndicator={false}
    >
      {logs.length > 0 ? (
        logs.map((log, index) => renderLogItem(log, index))
      ) : (
        renderEmptyState()
      )}
    </ScrollView>
  );
}

export default AuditLogTimeline;