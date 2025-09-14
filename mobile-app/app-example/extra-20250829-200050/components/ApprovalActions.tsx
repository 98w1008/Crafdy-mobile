import React, { useState } from 'react';
import { View, Text, Modal, TextInput, Alert, ActivityIndicator } from 'react-native';
import { TouchableOpacity } from 'react-native';
import { StyledButton } from './ui/StyledButton';
import { StyledText } from './ui/StyledText';
import { Colors } from '../constants/Colors';
import { useColorScheme } from '../hooks/useColorScheme';
import { useApprovalPermissions } from '../hooks/useApprovalPermissions';
import { SubmissionStatus } from '../lib/approval-system';

interface ApprovalActionsProps {
  submissionId: string;
  userId: string;
  currentStatus: SubmissionStatus;
  onStatusChange?: (newStatus: SubmissionStatus) => void;
  style?: any;
  disabled?: boolean;
}

interface ActionButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  loading?: boolean;
  style?: any;
}

/**
 * 承認・却下・承認取消ボタンを提供するコンポーネント
 */
export function ApprovalActions({
  submissionId,
  userId,
  currentStatus,
  onStatusChange,
  style,
  disabled = false
}: ApprovalActionsProps) {
  const colorScheme = useColorScheme();
  const {
    canApprove,
    canReject,
    loading: permissionsLoading,
    error: permissionsError,
    approveSubmission,
    rejectSubmission,
    cancelApproval
  } = useApprovalPermissions({ submissionId, userId });

  const [actionLoading, setActionLoading] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const ActionButton: React.FC<ActionButtonProps> = ({ 
    title, 
    onPress, 
    variant = 'secondary', 
    disabled: buttonDisabled,
    loading,
    style: buttonStyle 
  }) => {
    const getButtonColors = () => {
      const colors = Colors[colorScheme];
      switch (variant) {
        case 'primary':
          return {
            backgroundColor: colors.tint,
            textColor: '#FFFFFF'
          };
        case 'danger':
          return {
            backgroundColor: colors.tabIconDefault,
            textColor: '#FFFFFF'
          };
        default:
          return {
            backgroundColor: colors.background,
            textColor: colors.text,
            borderColor: colors.border,
            borderWidth: 1
          };
      }
    };

    const buttonColors = getButtonColors();

    return (
      <TouchableOpacity
        style={[
          {
            paddingHorizontal: 16,
            paddingVertical: 8,
            borderRadius: 8,
            minHeight: 44,
            justifyContent: 'center',
            alignItems: 'center',
            flexDirection: 'row',
            opacity: (buttonDisabled || loading) ? 0.6 : 1,
            ...buttonColors
          },
          buttonStyle
        ]}
        onPress={onPress}
        disabled={buttonDisabled || loading}
        activeOpacity={0.7}
      >
        {loading ? (
          <ActivityIndicator 
            size="small" 
            color={buttonColors.textColor} 
            style={{ marginRight: 8 }} 
          />
        ) : null}
        <Text style={{ 
          color: buttonColors.textColor, 
          fontSize: 16, 
          fontWeight: '600' 
        }}>
          {title}
        </Text>
      </TouchableOpacity>
    );
  };

  // 承認実行
  const handleApprove = async () => {
    setActionLoading(true);
    try {
      const result = await approveSubmission({
        approved_at: new Date().toISOString(),
        comment: '承認されました'
      });

      if (result.success) {
        Alert.alert('成功', '承認しました');
        onStatusChange?.('approved');
      } else {
        Alert.alert('エラー', result.error || '承認に失敗しました');
      }
    } catch (error) {
      Alert.alert('エラー', '承認処理でエラーが発生しました');
    } finally {
      setActionLoading(false);
    }
  };

  // 却下実行
  const handleReject = async () => {
    setActionLoading(true);
    try {
      const result = await rejectSubmission({
        rejected_at: new Date().toISOString(),
        reject_reason: rejectReason.trim() || '却下されました'
      });

      if (result.success) {
        Alert.alert('成功', '却下しました');
        onStatusChange?.('rejected');
        setShowRejectModal(false);
        setRejectReason('');
      } else {
        Alert.alert('エラー', result.error || '却下に失敗しました');
      }
    } catch (error) {
      Alert.alert('エラー', '却下処理でエラーが発生しました');
    } finally {
      setActionLoading(false);
    }
  };

  // 承認取消実行
  const handleCancelApproval = async () => {
    setActionLoading(true);
    try {
      const result = await cancelApproval({
        cancelled_at: new Date().toISOString(),
        comment: '承認を取り消しました'
      });

      if (result.success) {
        Alert.alert('成功', '承認を取り消しました');
        onStatusChange?.('submitted');
        setShowCancelModal(false);
      } else {
        Alert.alert('エラー', result.error || '承認取消に失敗しました');
      }
    } catch (error) {
      Alert.alert('エラー', '承認取消処理でエラーが発生しました');
    } finally {
      setActionLoading(false);
    }
  };

  if (permissionsLoading) {
    return (
      <View style={[{ padding: 16, alignItems: 'center' }, style]}>
        <ActivityIndicator size="small" color={Colors[colorScheme].tint} />
        <StyledText style={{ marginTop: 8, fontSize: 14 }}>
          権限を確認中...
        </StyledText>
      </View>
    );
  }

  if (permissionsError) {
    return (
      <View style={[{ padding: 16 }, style]}>
        <StyledText style={{ color: Colors[colorScheme].tabIconDefault, fontSize: 14 }}>
          {permissionsError}
        </StyledText>
      </View>
    );
  }

  // 表示するボタンを決定
  const shouldShowActions = !disabled && (canApprove || canReject);
  
  if (!shouldShowActions) {
    return null;
  }

  return (
    <>
      <View style={[
        { 
          flexDirection: 'row', 
          justifyContent: 'space-around', 
          padding: 16,
          borderTopWidth: 1,
          borderTopColor: Colors[colorScheme].border
        }, 
        style
      ]}>
        {/* 承認ボタン - 提出済みの場合のみ表示 */}
        {canApprove && currentStatus === 'submitted' && (
          <ActionButton
            title="承認"
            variant="primary"
            onPress={handleApprove}
            loading={actionLoading}
            style={{ flex: 1, marginRight: canReject ? 8 : 0 }}
          />
        )}

        {/* 却下ボタン - 提出済みまたは承認済みの場合に表示 */}
        {canReject && (currentStatus === 'submitted' || currentStatus === 'approved') && (
          <ActionButton
            title={currentStatus === 'approved' ? "承認取消" : "却下"}
            variant="danger"
            onPress={() => {
              if (currentStatus === 'approved') {
                setShowCancelModal(true);
              } else {
                setShowRejectModal(true);
              }
            }}
            loading={actionLoading}
            style={{ flex: 1, marginLeft: canApprove && currentStatus === 'submitted' ? 8 : 0 }}
          />
        )}
      </View>

      {/* 却下理由入力モーダル */}
      <Modal
        visible={showRejectModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowRejectModal(false)}
      >
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <View style={{
            backgroundColor: Colors[colorScheme].background,
            padding: 20,
            borderRadius: 12,
            width: '90%',
            maxWidth: 400
          }}>
            <StyledText style={{ fontSize: 18, fontWeight: '600', marginBottom: 16 }}>
              却下理由を入力してください
            </StyledText>
            
            <TextInput
              style={{
                borderWidth: 1,
                borderColor: Colors[colorScheme].border,
                borderRadius: 8,
                padding: 12,
                minHeight: 100,
                textAlignVertical: 'top',
                color: Colors[colorScheme].text,
                backgroundColor: Colors[colorScheme].background
              }}
              multiline
              placeholder="却下理由（任意）"
              placeholderTextColor={Colors[colorScheme].tabIconDefault}
              value={rejectReason}
              onChangeText={setRejectReason}
            />

            <View style={{
              flexDirection: 'row',
              justifyContent: 'space-around',
              marginTop: 20
            }}>
              <ActionButton
                title="キャンセル"
                variant="secondary"
                onPress={() => {
                  setShowRejectModal(false);
                  setRejectReason('');
                }}
                style={{ flex: 1, marginRight: 8 }}
              />
              <ActionButton
                title="却下"
                variant="danger"
                onPress={handleReject}
                loading={actionLoading}
                style={{ flex: 1, marginLeft: 8 }}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* 承認取消確認モーダル */}
      <Modal
        visible={showCancelModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCancelModal(false)}
      >
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <View style={{
            backgroundColor: Colors[colorScheme].background,
            padding: 20,
            borderRadius: 12,
            width: '90%',
            maxWidth: 400
          }}>
            <StyledText style={{ fontSize: 18, fontWeight: '600', marginBottom: 16 }}>
              承認取消の確認
            </StyledText>
            
            <StyledText style={{ fontSize: 16, marginBottom: 20 }}>
              この承認を取り消してもよろしいですか？
            </StyledText>

            <View style={{
              flexDirection: 'row',
              justifyContent: 'space-around'
            }}>
              <ActionButton
                title="キャンセル"
                variant="secondary"
                onPress={() => setShowCancelModal(false)}
                style={{ flex: 1, marginRight: 8 }}
              />
              <ActionButton
                title="承認取消"
                variant="danger"
                onPress={handleCancelApproval}
                loading={actionLoading}
                style={{ flex: 1, marginLeft: 8 }}
              />
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

/**
 * ステータス表示バッジコンポーネント
 */
interface StatusBadgeProps {
  status: SubmissionStatus;
  style?: any;
}

export function StatusBadge({ status, style }: StatusBadgeProps) {
  const colorScheme = useColorScheme();
  
  const getStatusConfig = () => {
    switch (status) {
      case 'draft':
        return {
          text: '下書き',
          backgroundColor: Colors[colorScheme].tabIconDefault,
          textColor: '#FFFFFF'
        };
      case 'submitted':
        return {
          text: '未承認',
          backgroundColor: '#FF9800',
          textColor: '#FFFFFF'
        };
      case 'approved':
        return {
          text: '承認済',
          backgroundColor: '#4CAF50',
          textColor: '#FFFFFF'
        };
      case 'rejected':
        return {
          text: '却下',
          backgroundColor: '#F44336',
          textColor: '#FFFFFF'
        };
      default:
        return {
          text: '不明',
          backgroundColor: Colors[colorScheme].border,
          textColor: Colors[colorScheme].text
        };
    }
  };

  const config = getStatusConfig();

  return (
    <View style={[
      {
        backgroundColor: config.backgroundColor,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
        alignSelf: 'flex-start'
      },
      style
    ]}>
      <Text style={{
        color: config.textColor,
        fontSize: 12,
        fontWeight: '600'
      }}>
        {config.text}
      </Text>
    </View>
  );
}