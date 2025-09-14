import React, { useState } from 'react'
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Dimensions
} from 'react-native'
import { 
  Surface, 
  Chip, 
  Portal, 
  Modal, 
  Button, 
  ProgressBar,
  IconButton 
} from 'react-native-paper'
import * as Haptics from 'expo-haptics'

import { Colors, Spacing, Typography, BorderRadius, Shadows } from '@/constants/Colors'
import { StyledText, Card } from '@/components/ui'
import { 
  DocType, 
  getDocTypeDisplayName, 
  getDocTypeIcon, 
  getDocTypeColor
} from '@/src/utils/classifyDoc'

// =============================================================================
// TYPES
// =============================================================================

export interface FilePreviewItem {
  id: string
  name: string
  uri: string
  type: string
  size?: number
  docType: DocType
  confidence?: number
  uploadProgress?: number
  isUploading?: boolean
  error?: string
  thumbnailUri?: string
}

interface FilePreviewProps {
  file: FilePreviewItem
  onRemove?: () => void
  onDocTypeChange?: (docType: DocType) => void
  onPreview?: () => void
  allowedDocTypes?: DocType[]
  showProgress?: boolean
  showThumbnail?: boolean
  compact?: boolean
  readOnly?: boolean
}

// =============================================================================
// COMPONENT
// =============================================================================

export const FilePreview: React.FC<FilePreviewProps> = ({
  file,
  onRemove,
  onDocTypeChange,
  onPreview,
  allowedDocTypes,
  showProgress = false,
  showThumbnail = true,
  compact = false,
  readOnly = false
}) => {
  const [showTypeSelector, setShowTypeSelector] = useState(false)
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  
  const docTypes: DocType[] = allowedDocTypes || [
    'receipt', 'delivery_slip', 'contract', 'drawing', 'spec', 'photo', 'invoice'
  ]

  const isImage = file.type.startsWith('image/')
  const screenWidth = Dimensions.get('window').width

  const handleTypeChange = (type: DocType) => {
    onDocTypeChange?.(type)
    setShowTypeSelector(false)
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
  }

  const handlePreview = () => {
    if (onPreview) {
      onPreview()
    } else {
      setShowPreviewModal(true)
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
  }

  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return 'サイズ不明'
    
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const renderThumbnail = () => {
    if (!showThumbnail) return null

    return (
      <TouchableOpacity
        style={styles.thumbnailContainer}
        onPress={handlePreview}
        disabled={!isImage}
      >
        {isImage ? (
          <Image
            source={{ uri: file.thumbnailUri || file.uri }}
            style={styles.thumbnail}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.thumbnail, styles.documentThumbnail]}>
            <StyledText variant="title" style={{ color: getDocTypeColor(file.docType) }}>
              {getDocTypeIcon(file.docType)}
            </StyledText>
            <StyledText variant="caption" color="secondary" align="center" numberOfLines={2}>
              {file.name.split('.').pop()?.toUpperCase()}
            </StyledText>
          </View>
        )}
        
        {isImage && (
          <View style={styles.previewIcon}>
            <IconButton icon="eye" size={16} iconColor={Colors.onPrimary} />
          </View>
        )}
      </TouchableOpacity>
    )
  }

  const renderCompactView = () => (
    <Surface style={styles.compactCard} elevation={1}>
      <View style={styles.compactContent}>
        {renderThumbnail()}
        
        <View style={styles.compactInfo}>
          <StyledText variant="caption" weight="medium" numberOfLines={1}>
            {file.name}
          </StyledText>
          <StyledText variant="micro" color="secondary">
            {formatFileSize(file.size)}
          </StyledText>
        </View>

        <View style={styles.compactActions}>
          {!readOnly && onDocTypeChange && (
            <TouchableOpacity
              style={styles.compactTypeButton}
              onPress={() => setShowTypeSelector(true)}
            >
              <Chip
                icon={getDocTypeIcon(file.docType)}
                mode="outlined"
                compact
                textStyle={styles.compactChipText}
              >
                {getDocTypeDisplayName(file.docType).substring(0, 3)}
              </Chip>
            </TouchableOpacity>
          )}
          
          {!readOnly && onRemove && (
            <TouchableOpacity
              style={styles.compactRemoveButton}
              onPress={onRemove}
            >
              <StyledText variant="caption" color="error">✕</StyledText>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {showProgress && file.isUploading && (
        <ProgressBar
          progress={file.uploadProgress ? file.uploadProgress / 100 : 0}
          color={Colors.primary}
          style={styles.compactProgressBar}
        />
      )}
    </Surface>
  )

  const renderFullView = () => (
    <Card variant="elevated" style={styles.fileCard}>
      <View style={styles.fileHeader}>
        <View style={styles.fileMainInfo}>
          {renderThumbnail()}
          
          <View style={styles.fileDetails}>
            <StyledText variant="body" weight="medium" numberOfLines={2}>
              {file.name}
            </StyledText>
            <StyledText variant="caption" color="secondary">
              {formatFileSize(file.size)} • {file.type}
            </StyledText>
            
            {file.confidence && file.confidence < 0.8 && (
              <StyledText variant="caption" color="warning">
                ⚠️ 分類の確信度が低いため確認してください
              </StyledText>
            )}
            
            {file.error && (
              <StyledText variant="caption" color="error">
                エラー: {file.error}
              </StyledText>
            )}
          </View>
        </View>
        
        {!readOnly && onRemove && (
          <TouchableOpacity
            style={styles.removeButton}
            onPress={onRemove}
          >
            <StyledText variant="body" color="error">✕</StyledText>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.fileActions}>
        {!readOnly && onDocTypeChange && (
          <TouchableOpacity
            style={styles.typeSelector}
            onPress={() => setShowTypeSelector(true)}
          >
            <Chip
              icon={getDocTypeIcon(file.docType)}
              mode="outlined"
              compact
              style={[
                styles.docTypeChip,
                { borderColor: getDocTypeColor(file.docType) }
              ]}
            >
              {getDocTypeDisplayName(file.docType)}
            </Chip>
            <StyledText variant="caption" color="secondary">
              タップして変更
            </StyledText>
          </TouchableOpacity>
        )}
      </View>

      {showProgress && file.isUploading && (
        <ProgressBar
          progress={file.uploadProgress ? file.uploadProgress / 100 : 0}
          color={Colors.primary}
          style={styles.progressBar}
        />
      )}
    </Card>
  )

  return (
    <>
      {compact ? renderCompactView() : renderFullView()}

      {/* ドキュメントタイプ選択モーダル */}
      <Portal>
        <Modal
          visible={showTypeSelector}
          onDismiss={() => setShowTypeSelector(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <Card variant="elevated" style={styles.typeSelectorCard}>
            <StyledText variant="title" weight="semibold" style={styles.modalTitle}>
              ドキュメントタイプを選択
            </StyledText>
            
            <ScrollView style={styles.typeList} showsVerticalScrollIndicator={false}>
              {docTypes.map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.typeOption,
                    file.docType === type && styles.typeOptionSelected
                  ]}
                  onPress={() => handleTypeChange(type)}
                >
                  <View style={styles.typeOptionContent}>
                    <View style={[styles.typeIcon, { backgroundColor: getDocTypeColor(type) + '20' }]}>
                      <StyledText variant="body" style={{ color: getDocTypeColor(type) }}>
                        {getDocTypeIcon(type)}
                      </StyledText>
                    </View>
                    <View>
                      <StyledText variant="body" weight="medium">
                        {getDocTypeDisplayName(type)}
                      </StyledText>
                      <StyledText variant="caption" color="secondary">
                        {getTypeDescription(type)}
                      </StyledText>
                    </View>
                  </View>
                  {file.docType === type && (
                    <StyledText variant="body" color="primary">✓</StyledText>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
            
            <Button mode="text" onPress={() => setShowTypeSelector(false)}>
              キャンセル
            </Button>
          </Card>
        </Modal>
      </Portal>

      {/* プレビューモーダル */}
      <Portal>
        <Modal
          visible={showPreviewModal}
          onDismiss={() => setShowPreviewModal(false)}
          contentContainerStyle={styles.previewModalContainer}
        >
          <Card variant="elevated" style={styles.previewCard}>
            <View style={styles.previewHeader}>
              <StyledText variant="title" weight="semibold" numberOfLines={1}>
                {file.name}
              </StyledText>
              <IconButton
                icon="close"
                onPress={() => setShowPreviewModal(false)}
              />
            </View>
            
            {isImage ? (
              <ScrollView
                style={styles.imagePreviewContainer}
                minimumZoomScale={1}
                maximumZoomScale={3}
                showsVerticalScrollIndicator={false}
              >
                <Image
                  source={{ uri: file.uri }}
                  style={[
                    styles.previewImage,
                    { width: screenWidth - Spacing.xl * 2 }
                  ]}
                  resizeMode="contain"
                />
              </ScrollView>
            ) : (
              <View style={styles.documentPreview}>
                <View style={[styles.documentIcon, { backgroundColor: getDocTypeColor(file.docType) + '20' }]}>
                  <StyledText variant="display" style={{ color: getDocTypeColor(file.docType) }}>
                    {getDocTypeIcon(file.docType)}
                  </StyledText>
                </View>
                <StyledText variant="body" align="center">
                  {getDocTypeDisplayName(file.docType)}
                </StyledText>
                <StyledText variant="caption" color="secondary" align="center">
                  {formatFileSize(file.size)}
                </StyledText>
              </View>
            )}
          </Card>
        </Modal>
      </Portal>
    </>
  )
}

// ヘルパー関数
const getTypeDescription = (type: DocType): string => {
  const descriptions: Record<DocType, string> = {
    receipt: '経費計上用のレシート',
    delivery_slip: '搬入・納品記録',
    contract: '契約書・合意書',
    drawing: '図面・設計資料',
    spec: '仕様書・要件定義',
    photo: '写真・画像',
    invoice: '請求書・見積書',
    unknown: '分類不明'
  }
  
  return descriptions[type]
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  // コンパクトビュー
  compactCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    marginBottom: Spacing.xs,
  },
  compactContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.sm,
    gap: Spacing.sm,
  },
  compactInfo: {
    flex: 1,
    gap: Spacing.xs,
  },
  compactActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  compactTypeButton: {
    opacity: 0.8,
  },
  compactChipText: {
    fontSize: 10,
  },
  compactRemoveButton: {
    padding: Spacing.xs,
  },
  compactProgressBar: {
    height: 2,
  },

  // フルビュー
  fileCard: {
    marginBottom: Spacing.sm,
  },
  fileHeader: {
    flexDirection: 'row',
    marginBottom: Spacing.md,
  },
  fileMainInfo: {
    flex: 1,
    flexDirection: 'row',
    gap: Spacing.md,
  },
  fileDetails: {
    flex: 1,
    gap: Spacing.xs,
  },
  removeButton: {
    padding: Spacing.sm,
  },
  fileActions: {
    gap: Spacing.sm,
  },
  typeSelector: {
    alignItems: 'flex-start',
    gap: Spacing.xs,
  },
  docTypeChip: {
    backgroundColor: Colors.surface,
  },
  progressBar: {
    marginTop: Spacing.sm,
    height: 4,
    borderRadius: 2,
  },

  // サムネイル
  thumbnailContainer: {
    position: 'relative',
  },
  thumbnail: {
    width: 60,
    height: 60,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surfaceVariant,
  },
  documentThumbnail: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
  },
  previewIcon: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: Colors.primary + '80',
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // モーダル
  modalContainer: {
    margin: Spacing.lg,
    backgroundColor: 'white',
    borderRadius: BorderRadius.lg,
    ...Shadows.medium,
  },
  typeSelectorCard: {
    padding: Spacing.lg,
    maxHeight: '80%',
  },
  modalTitle: {
    marginBottom: Spacing.lg,
  },
  typeList: {
    maxHeight: 300,
    marginBottom: Spacing.lg,
  },
  typeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surface,
    marginBottom: Spacing.xs,
  },
  typeOptionSelected: {
    backgroundColor: Colors.primary + '10',
    borderColor: Colors.primary,
    borderWidth: 1,
  },
  typeOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flex: 1,
  },
  typeIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // プレビューモーダル
  previewModalContainer: {
    margin: Spacing.md,
    backgroundColor: 'white',
    borderRadius: BorderRadius.lg,
    ...Shadows.medium,
    maxHeight: '90%',
  },
  previewCard: {
    padding: Spacing.lg,
    maxHeight: '100%',
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  imagePreviewContainer: {
    maxHeight: 400,
  },
  previewImage: {
    height: 400,
  },
  documentPreview: {
    alignItems: 'center',
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  documentIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
})