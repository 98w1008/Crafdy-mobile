/**
 * 添付セクションコンポーネント
 * 日報用の添付ファイル管理UI
 */

import React, { useState, useCallback, useMemo } from 'react'
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView
} from 'react-native'
import {
  Surface,
  Chip,
  SegmentedButtons,
  Badge,
  Divider,
  IconButton
} from 'react-native-paper'
import * as Haptics from 'expo-haptics'

import { Colors, Spacing, Typography, BorderRadius } from '@/constants/Colors'
import { StyledText, Card } from '@/components/ui'
import { DocumentUploader, FilePreview, UploadedFile } from '@/components/upload'
import { DocType, getDocTypeDisplayName, getDocTypeIcon } from '@/src/utils/classifyDoc'
import { 
  AttachmentFormData, 
  AttachmentFileType, 
  ATTACHMENT_FILE_TYPE_LABELS,
  MAX_ATTACHMENTS
} from '@/types/reports'

// =============================================================================
// TYPES
// =============================================================================

interface AttachmentSectionProps {
  attachments: AttachmentFormData[]
  onAttachmentsChange: (attachments: AttachmentFormData[]) => void
  readonly?: boolean
  maxFiles?: number
}

type AttachmentCategory = 'photos' | 'receipts' | 'delivery_slips' | 'all'

// =============================================================================
// CONSTANTS
// =============================================================================

const ATTACHMENT_CATEGORIES = [
  { 
    value: 'photos', 
    label: '写真', 
    icon: 'camera',
    types: ['photo'] as DocType[],
    description: '作業現場の写真'
  },
  { 
    value: 'receipts', 
    label: 'レシート', 
    icon: 'receipt',
    types: ['receipt'] as DocType[],
    description: '経費に関するレシート'
  },
  { 
    value: 'delivery_slips', 
    label: '搬入書', 
    icon: 'truck-delivery',
    types: ['delivery_slip'] as DocType[],
    description: '材料搬入の記録'
  },
  { 
    value: 'all', 
    label: 'すべて', 
    icon: 'file-multiple',
    types: ['photo', 'receipt', 'delivery_slip', 'spec', 'drawing'] as DocType[],
    description: '全種類のファイル'
  }
] as const

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

// UploadedFile を AttachmentFormData に変換
const convertToAttachmentFormData = (files: UploadedFile[]): AttachmentFormData[] => {
  return files.map(file => ({
    id: file.id,
    file_name: file.name,
    file_url: file.uri,
    file_type: mapDocTypeToFileType(file.docType),
    file_size: file.size,
    isNew: true
  }))
}

// AttachmentFormData を UploadedFile に変換
const convertToUploadedFile = (attachments: AttachmentFormData[]): UploadedFile[] => {
  return attachments.map(attachment => ({
    id: attachment.id || `temp-${Date.now()}-${Math.random()}`,
    name: attachment.file_name,
    uri: attachment.file_url,
    type: 'image/jpeg', // デフォルト
    size: attachment.file_size,
    docType: mapFileTypeToDocType(attachment.file_type)
  }))
}

// DocType を AttachmentFileType にマッピング
const mapDocTypeToFileType = (docType: DocType): AttachmentFileType => {
  switch (docType) {
    case 'receipt':
      return 'receipt'
    case 'delivery_slip':
      return 'delivery_slip'
    case 'photo':
    default:
      return 'photo'
  }
}

// AttachmentFileType を DocType にマッピング
const mapFileTypeToDocType = (fileType: AttachmentFileType): DocType => {
  switch (fileType) {
    case 'receipt':
      return 'receipt'
    case 'delivery_slip':
      return 'delivery_slip'
    case 'photo':
    default:
      return 'photo'
  }
}

// =============================================================================
// COMPONENT
// =============================================================================

export const AttachmentSection: React.FC<AttachmentSectionProps> = ({
  attachments,
  onAttachmentsChange,
  readonly = false,
  maxFiles = MAX_ATTACHMENTS
}) => {
  const [attachmentCategory, setAttachmentCategory] = useState<AttachmentCategory>('photos')
  const [showAttachments, setShowAttachments] = useState(false)

  // 添付ファイルをUploadedFile形式に変換
  const uploadedFiles = useMemo(() => 
    convertToUploadedFile(attachments), 
    [attachments]
  )

  // 添付ファイル変更ハンドラー
  const handleFilesChange = useCallback((newFiles: UploadedFile[]) => {
    const newAttachments = convertToAttachmentFormData(newFiles)
    onAttachmentsChange(newAttachments)
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
  }, [onAttachmentsChange])

  // 添付カテゴリ変更ハンドラー
  const handleCategoryChange = useCallback((category: AttachmentCategory) => {
    setAttachmentCategory(category)
    
    // カテゴリ変更時に既存のファイルを適切なタイプに更新
    const allowedTypes = ATTACHMENT_CATEGORIES.find(c => c.value === category)?.types || []
    if (allowedTypes.length > 0 && attachments.length > 0) {
      const updatedAttachments = attachments.map(attachment => {
        const currentDocType = mapFileTypeToDocType(attachment.file_type)
        if (!allowedTypes.includes(currentDocType)) {
          return {
            ...attachment,
            file_type: mapDocTypeToFileType(allowedTypes[0])
          }
        }
        return attachment
      })
      onAttachmentsChange(updatedAttachments)
    }
  }, [attachments, onAttachmentsChange])

  // 個別ファイル削除
  const handleRemoveFile = useCallback((fileId: string) => {
    Alert.alert(
      '確認',
      'この添付ファイルを削除しますか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除',
          style: 'destructive',
          onPress: () => {
            const updatedAttachments = attachments.filter(a => a.id !== fileId)
            onAttachmentsChange(updatedAttachments)
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
          }
        }
      ]
    )
  }, [attachments, onAttachmentsChange])

  // 現在のカテゴリの許可ファイルタイプ
  const getCurrentAllowedTypes = useCallback((): DocType[] => {
    return ATTACHMENT_CATEGORIES.find(c => c.value === attachmentCategory)?.types || ['photo']
  }, [attachmentCategory])

  // 添付ファイルサマリー
  const getAttachmentSummary = useCallback(() => {
    if (attachments.length === 0) return null

    const summary = attachments.reduce((acc, file) => {
      const label = ATTACHMENT_FILE_TYPE_LABELS[file.file_type]
      acc[label] = (acc[label] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return Object.entries(summary).map(([type, count]) => 
      `${type}: ${count}件`
    ).join(' / ')
  }, [attachments])

  // 添付ファイル表示の切り替え
  const toggleAttachments = useCallback(() => {
    setShowAttachments(!showAttachments)
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
  }, [showAttachments])

  return (
    <Card variant="premium" style={styles.container}>
      {/* ヘッダー */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <StyledText variant="subtitle" weight="semibold">
            📎 添付ファイル
          </StyledText>
          {attachments.length > 0 && (
            <Badge size={20} style={styles.badge}>
              {attachments.length}
            </Badge>
          )}
        </View>
        
        <TouchableOpacity 
          onPress={toggleAttachments}
          style={styles.toggleButton}
          disabled={readonly}
        >
          <StyledText variant="caption" color="primary">
            {showAttachments ? '閉じる' : '開く'}
          </StyledText>
          <IconButton
            icon={showAttachments ? 'chevron-up' : 'chevron-down'}
            size={16}
            style={styles.chevron}
          />
        </TouchableOpacity>
      </View>

      {/* サマリー表示（折りたたみ時） */}
      {attachments.length > 0 && !showAttachments && (
        <Surface style={styles.summary}>
          <StyledText variant="caption" color="secondary">
            {getAttachmentSummary()}
          </StyledText>
        </Surface>
      )}

      {/* 詳細表示（展開時） */}
      {showAttachments && (
        <>
          <Divider style={styles.divider} />
          
          {!readonly && (
            <>
              {/* カテゴリ選択 */}
              <View style={styles.categorySection}>
                <StyledText variant="body" weight="medium" style={styles.fieldLabel}>
                  添付タイプ
                </StyledText>
                <SegmentedButtons
                  value={attachmentCategory}
                  onValueChange={handleCategoryChange}
                  buttons={ATTACHMENT_CATEGORIES.map(cat => ({
                    value: cat.value,
                    label: cat.label,
                    icon: cat.icon
                  }))}
                  style={styles.categoryButtons}
                />
                <StyledText variant="caption" color="secondary" style={styles.categoryDescription}>
                  {ATTACHMENT_CATEGORIES.find(c => c.value === attachmentCategory)?.description}
                </StyledText>
              </View>

              {/* アップローダー */}
              <DocumentUploader
                onFilesChange={handleFilesChange}
                maxFiles={maxFiles}
                allowedDocTypes={getCurrentAllowedTypes()}
                title={`${ATTACHMENT_CATEGORIES.find(c => c.value === attachmentCategory)?.label}を追加`}
                description="作業に関連するファイルを添付"
                uploadMode="batch"
                showPreview={false}
                initialFiles={uploadedFiles}
              />
            </>
          )}

          {/* 添付ファイル一覧 */}
          {attachments.length > 0 && (
            <View style={styles.filesList}>
              <StyledText variant="body" weight="medium" style={styles.filesListTitle}>
                添付ファイル ({attachments.length}件)
              </StyledText>
              
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.filesContainer}>
                  {attachments.map((attachment) => (
                    <View key={attachment.id} style={styles.fileItem}>
                      <FilePreview
                        file={{
                          id: attachment.id || `temp-${Date.now()}`,
                          name: attachment.file_name,
                          uri: attachment.file_url,
                          type: 'image/jpeg', // デフォルト
                          size: attachment.file_size,
                          docType: mapFileTypeToDocType(attachment.file_type)
                        }}
                        onRemove={readonly ? undefined : () => handleRemoveFile(attachment.id!)}
                        style={styles.filePreview}
                      />
                      
                      {/* ファイル情報 */}
                      <View style={styles.fileInfo}>
                        <Chip 
                          icon={getDocTypeIcon(mapFileTypeToDocType(attachment.file_type))}
                          compact
                          style={styles.fileTypeChip}
                        >
                          {ATTACHMENT_FILE_TYPE_LABELS[attachment.file_type]}
                        </Chip>
                        
                        <StyledText 
                          variant="caption" 
                          color="secondary" 
                          numberOfLines={1}
                          style={styles.fileName}
                        >
                          {attachment.file_name}
                        </StyledText>
                      </View>
                    </View>
                  ))}
                </View>
              </ScrollView>
            </View>
          )}

          {/* 制限情報 */}
          <Surface style={styles.limitsInfo}>
            <StyledText variant="caption" color="secondary" align="center">
              最大{maxFiles}件まで添付可能 / ファイルサイズ上限: 10MB
            </StyledText>
          </Surface>
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
  
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm
  },
  badge: {
    backgroundColor: Colors.primary
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.xs
  },
  chevron: {
    margin: 0
  },
  
  // Summary
  summary: {
    padding: Spacing.sm,
    backgroundColor: Colors.surfaceVariant,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.sm
  },
  
  // Category
  divider: {
    marginVertical: Spacing.md
  },
  categorySection: {
    marginBottom: Spacing.lg
  },
  fieldLabel: {
    marginBottom: Spacing.sm
  },
  categoryButtons: {
    marginBottom: Spacing.sm
  },
  categoryDescription: {
    textAlign: 'center'
  },
  
  // Files List
  filesList: {
    marginTop: Spacing.lg
  },
  filesListTitle: {
    marginBottom: Spacing.md
  },
  filesContainer: {
    flexDirection: 'row',
    gap: Spacing.md,
    paddingHorizontal: Spacing.xs
  },
  fileItem: {
    width: 120,
    alignItems: 'center'
  },
  filePreview: {
    width: 120,
    height: 120,
    marginBottom: Spacing.sm
  },
  fileInfo: {
    alignItems: 'center',
    gap: Spacing.xs,
    width: '100%'
  },
  fileTypeChip: {
    height: 24
  },
  fileName: {
    textAlign: 'center',
    width: '100%'
  },
  
  // Limits
  limitsInfo: {
    padding: Spacing.sm,
    backgroundColor: Colors.surfaceVariant,
    borderRadius: BorderRadius.sm,
    marginTop: Spacing.md
  }
})

export default AttachmentSection