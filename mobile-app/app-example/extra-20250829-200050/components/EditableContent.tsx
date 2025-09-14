import React, { useState, useEffect } from 'react';
import { View, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StyledText } from './ui/StyledText';
import { StyledButton } from './ui/StyledButton';
import { Colors } from '../constants/Colors';
import { useColorScheme } from '../hooks/useColorScheme';
import { useApprovalPermissions } from '../hooks/useApprovalPermissions';
import { StatusBadge } from './ApprovalActions';
import { SubmissionStatus } from '../lib/approval-system';

interface EditableContentProps {
  submissionId: string;
  userId: string;
  initialContent: string;
  currentStatus: SubmissionStatus;
  onContentChange?: (newContent: string) => void;
  multiline?: boolean;
  placeholder?: string;
  maxLength?: number;
  style?: any;
  contentStyle?: any;
  readonly?: boolean;
}

/**
 * 権限に応じて編集可能/読み取り専用を切り替えるコンテンツコンポーネント
 */
export function EditableContent({
  submissionId,
  userId,
  initialContent,
  currentStatus,
  onContentChange,
  multiline = true,
  placeholder = '内容を入力してください',
  maxLength = 1000,
  style,
  contentStyle,
  readonly = false
}: EditableContentProps) {
  const colorScheme = useColorScheme();
  const {
    canEdit,
    showEditButton,
    loading: permissionsLoading,
    error: permissionsError,
    editSubmissionContent
  } = useApprovalPermissions({ submissionId, userId });

  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(initialContent);
  const [isSaving, setIsSaving] = useState(false);

  // 初期コンテンツが変更された場合の同期
  useEffect(() => {
    setEditContent(initialContent);
  }, [initialContent]);

  // 編集保存処理
  const handleSave = async () => {
    if (!editContent.trim()) {
      Alert.alert('エラー', '内容を入力してください');
      return;
    }

    if (editContent === initialContent) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    try {
      const result = await editSubmissionContent(editContent.trim());
      
      if (result.success) {
        setIsEditing(false);
        onContentChange?.(editContent.trim());
        Alert.alert('成功', '内容を更新しました');
      } else {
        Alert.alert('エラー', result.error || '保存に失敗しました');
      }
    } catch (error) {
      Alert.alert('エラー', '保存処理でエラーが発生しました');
    } finally {
      setIsSaving(false);
    }
  };

  // 編集キャンセル処理
  const handleCancel = () => {
    Alert.alert(
      '確認',
      '編集をキャンセルしますか？変更は保存されません。',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: 'OK',
          onPress: () => {
            setEditContent(initialContent);
            setIsEditing(false);
          }
        }
      ]
    );
  };

  // 編集開始
  const startEditing = () => {
    if (!canEdit) {
      Alert.alert('権限なし', '編集権限がありません');
      return;
    }
    setIsEditing(true);
  };

  // 読み取り専用表示
  const renderReadOnlyContent = () => (
    <View style={[
      {
        backgroundColor: Colors[colorScheme].background,
        borderRadius: 8,
        padding: 12,
        borderWidth: 1,
        borderColor: Colors[colorScheme].border
      },
      contentStyle
    ]}>
      <StyledText 
        style={{
          fontSize: 16,
          lineHeight: 24,
          minHeight: multiline ? 100 : 44
        }}
      >
        {initialContent || placeholder}
      </StyledText>
    </View>
  );

  // 編集中の表示
  const renderEditingContent = () => (
    <View>
      <TextInput
        style={[
          {
            backgroundColor: Colors[colorScheme].background,
            borderRadius: 8,
            padding: 12,
            borderWidth: 2,
            borderColor: Colors[colorScheme].tint,
            fontSize: 16,
            lineHeight: 24,
            color: Colors[colorScheme].text,
            minHeight: multiline ? 100 : 44,
            textAlignVertical: multiline ? 'top' : 'center'
          },
          contentStyle
        ]}
        value={editContent}
        onChangeText={setEditContent}
        multiline={multiline}
        placeholder={placeholder}
        placeholderTextColor={Colors[colorScheme].tabIconDefault}
        maxLength={maxLength}
        autoFocus
      />
      
      {maxLength && (
        <StyledText style={{
          fontSize: 12,
          textAlign: 'right',
          marginTop: 4,
          color: Colors[colorScheme].tabIconDefault
        }}>
          {editContent.length} / {maxLength}
        </StyledText>
      )}

      <View style={{
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginTop: 12
      }}>
        <StyledButton
          title="キャンセル"
          onPress={handleCancel}
          variant="outline"
          style={{ flex: 1, marginRight: 8 }}
          disabled={isSaving}
        />
        <StyledButton
          title={isSaving ? "保存中..." : "保存"}
          onPress={handleSave}
          variant="filled"
          style={{ flex: 1, marginLeft: 8 }}
          disabled={isSaving || !editContent.trim()}
        />
      </View>
    </View>
  );

  // 権限ロード中
  if (permissionsLoading) {
    return (
      <View style={[{ padding: 16, alignItems: 'center' }, style]}>
        <ActivityIndicator size="small" color={Colors[colorScheme].tint} />
        <StyledText style={{ marginTop: 8, fontSize: 14 }}>
          読み込み中...
        </StyledText>
      </View>
    );
  }

  // 権限エラー
  if (permissionsError) {
    return (
      <View style={[{ padding: 16 }, style]}>
        <StyledText style={{ 
          color: Colors[colorScheme].tabIconDefault, 
          fontSize: 14 
        }}>
          {permissionsError}
        </StyledText>
      </View>
    );
  }

  return (
    <View style={style}>
      {/* ステータスバッジと編集ボタンのヘッダー */}
      <View style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12
      }}>
        <StatusBadge status={currentStatus} />
        
        {!readonly && !isEditing && showEditButton && (
          <TouchableOpacity
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 6,
              backgroundColor: Colors[colorScheme].tint,
              minHeight: 44
            }}
            onPress={startEditing}
            activeOpacity={0.7}
          >
            <Ionicons 
              name="pencil" 
              size={16} 
              color="#FFFFFF" 
              style={{ marginRight: 4 }} 
            />
            <StyledText style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '600' }}>
              編集
            </StyledText>
          </TouchableOpacity>
        )}
      </View>

      {/* コンテンツ表示 */}
      {isEditing ? renderEditingContent() : renderReadOnlyContent()}
    </View>
  );
}

/**
 * 簡易版の編集可能テキストコンポーネント
 */
interface SimpleEditableTextProps {
  text: string;
  onSave: (newText: string) => Promise<boolean>;
  canEdit: boolean;
  placeholder?: string;
  style?: any;
  multiline?: boolean;
}

export function SimpleEditableText({
  text,
  onSave,
  canEdit,
  placeholder = 'テキストを入力',
  style,
  multiline = false
}: SimpleEditableTextProps) {
  const colorScheme = useColorScheme();
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(text);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setEditText(text);
  }, [text]);

  const handleSave = async () => {
    if (editText.trim() === text) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    try {
      const success = await onSave(editText.trim());
      if (success) {
        setIsEditing(false);
      }
    } catch (error) {
      console.error('Save error:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditText(text);
    setIsEditing(false);
  };

  if (isEditing && canEdit) {
    return (
      <View style={style}>
        <TextInput
          style={{
            borderWidth: 1,
            borderColor: Colors[colorScheme].tint,
            borderRadius: 4,
            padding: 8,
            fontSize: 16,
            color: Colors[colorScheme].text,
            backgroundColor: Colors[colorScheme].background,
            minHeight: multiline ? 80 : 40,
            textAlignVertical: multiline ? 'top' : 'center'
          }}
          value={editText}
          onChangeText={setEditText}
          multiline={multiline}
          placeholder={placeholder}
          placeholderTextColor={Colors[colorScheme].tabIconDefault}
          autoFocus
        />
        <View style={{ flexDirection: 'row', marginTop: 8 }}>
          <TouchableOpacity
            style={{
              flex: 1,
              padding: 8,
              backgroundColor: Colors[colorScheme].border,
              borderRadius: 4,
              alignItems: 'center',
              marginRight: 4
            }}
            onPress={handleCancel}
            disabled={isSaving}
          >
            <StyledText>キャンセル</StyledText>
          </TouchableOpacity>
          <TouchableOpacity
            style={{
              flex: 1,
              padding: 8,
              backgroundColor: Colors[colorScheme].tint,
              borderRadius: 4,
              alignItems: 'center',
              marginLeft: 4,
              opacity: isSaving ? 0.6 : 1
            }}
            onPress={handleSave}
            disabled={isSaving}
          >
            <StyledText style={{ color: '#FFFFFF' }}>
              {isSaving ? '保存中...' : '保存'}
            </StyledText>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <TouchableOpacity
      style={[
        {
          padding: 8,
          minHeight: 44,
          justifyContent: 'center'
        },
        style
      ]}
      onPress={() => canEdit && setIsEditing(true)}
      disabled={!canEdit}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <StyledText style={{ 
          flex: 1, 
          fontSize: 16,
          color: text ? Colors[colorScheme].text : Colors[colorScheme].tabIconDefault
        }}>
          {text || placeholder}
        </StyledText>
        {canEdit && (
          <Ionicons 
            name="pencil" 
            size={16} 
            color={Colors[colorScheme].tabIconDefault}
            style={{ marginLeft: 8 }} 
          />
        )}
      </View>
    </TouchableOpacity>
  );
}