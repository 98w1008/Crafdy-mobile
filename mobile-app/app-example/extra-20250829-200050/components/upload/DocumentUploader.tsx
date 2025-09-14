import React, { useState, useCallback } from 'react'
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  FlatList
} from 'react-native'
import { Surface, Chip, FAB, Portal, Modal, Button, ProgressBar } from 'react-native-paper'
import * as ImagePicker from 'expo-image-picker'
import * as DocumentPicker from 'expo-document-picker'
import * as Haptics from 'expo-haptics'

import { Colors, Spacing, Typography, BorderRadius, Shadows } from '@/constants/Colors'
import { StyledText, StyledButton, Card } from '@/components/ui'
import { 
  DocType, 
  guessDocType, 
  classifyDocumentDetailed, 
  getDocTypeDisplayName, 
  getDocTypeIcon, 
  getDocTypeColor,
  getMimeTypeFromExtension
} from '@/src/utils/classifyDoc'

// =============================================================================
// TYPES
// =============================================================================

export interface UploadedFile {
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
}

interface DocumentUploaderProps {
  onFilesChange: (files: UploadedFile[]) => void
  maxFiles?: number
  acceptedTypes?: string[]
  allowedDocTypes?: DocType[]
  showPreview?: boolean
  uploadMode?: 'immediate' | 'batch'
  title?: string
  description?: string
}

// =============================================================================
// COMPONENT
// =============================================================================

export const DocumentUploader: React.FC<DocumentUploaderProps> = ({
  onFilesChange,
  maxFiles = 10,
  acceptedTypes = ['image/*', 'application/pdf'],
  allowedDocTypes,
  showPreview = true,
  uploadMode = 'batch',
  title = 'ファイルをアップロード',
  description = 'ドラッグ&ドロップまたはクリックしてファイルを選択'
}) => {
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [isPickerOpen, setIsPickerOpen] = useState(false)
  const [isDragActive, setIsDragActive] = useState(false)

  // ファイル追加処理
  const addFiles = useCallback((newFiles: UploadedFile[]) => {
    const updatedFiles = [...files, ...newFiles].slice(0, maxFiles)
    setFiles(updatedFiles)
    onFilesChange(updatedFiles)
    
    if (uploadMode === 'immediate') {
      // 即座にアップロード開始
      newFiles.forEach(file => {
        simulateUpload(file.id)
      })
    }
  }, [files, maxFiles, onFilesChange, uploadMode])

  // ファイル削除処理
  const removeFile = useCallback((fileId: string) => {
    const updatedFiles = files.filter(file => file.id !== fileId)
    setFiles(updatedFiles)
    onFilesChange(updatedFiles)
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
  }, [files, onFilesChange])

  // ドキュメントタイプ変更処理
  const updateDocType = useCallback((fileId: string, docType: DocType) => {
    const updatedFiles = files.map(file => 
      file.id === fileId ? { ...file, docType } : file
    )
    setFiles(updatedFiles)
    onFilesChange(updatedFiles)
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
  }, [files, onFilesChange])

  // カメラ撮影
  const takePicture = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync()
      if (status !== 'granted') {
        Alert.alert('権限エラー', 'カメラへのアクセス許可が必要です')
        return
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      })

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0]
        const classification = classifyDocumentDetailed(asset.fileName || '写真')
        
        const file: UploadedFile = {
          id: Date.now().toString(),
          name: asset.fileName || `写真_${new Date().getTime()}.jpg`,
          uri: asset.uri,
          type: 'image/jpeg',
          size: asset.fileSize,
          docType: classification.type || 'photo',
          confidence: classification.confidence,
          uploadProgress: 0
        }

        addFiles([file])
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
      }
    } catch (error) {
      console.error('カメラエラー:', error)
      Alert.alert('エラー', '写真の撮影に失敗しました')
    }
  }

  // ギャラリーから選択
  const pickFromGallery = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (status !== 'granted') {
        Alert.alert('権限エラー', 'フォトライブラリへのアクセス許可が必要です')
        return
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        selectionLimit: maxFiles - files.length,
        quality: 0.8,
      })

      if (!result.canceled) {
        const newFiles: UploadedFile[] = result.assets.map(asset => {
          const classification = classifyDocumentDetailed(asset.fileName || '画像')
          
          return {
            id: `${Date.now()}_${Math.random()}`,
            name: asset.fileName || `画像_${new Date().getTime()}.jpg`,
            uri: asset.uri,
            type: getMimeTypeFromExtension(asset.fileName || '.jpg'),
            size: asset.fileSize,
            docType: classification.type || 'photo',
            confidence: classification.confidence,
            uploadProgress: 0
          }
        })

        addFiles(newFiles)
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
      }
    } catch (error) {
      console.error('ギャラリー選択エラー:', error)
      Alert.alert('エラー', '画像の選択に失敗しました')
    }
  }

  // ドキュメント選択
  const pickDocuments = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: acceptedTypes,
        multiple: true,
        copyToCacheDirectory: true
      })

      if (!result.canceled) {
        const newFiles: UploadedFile[] = result.assets.map(asset => {
          const classification = classifyDocumentDetailed(asset.name)
          
          return {
            id: `${Date.now()}_${Math.random()}`,
            name: asset.name,
            uri: asset.uri,
            type: asset.mimeType || getMimeTypeFromExtension(asset.name),
            size: asset.size || undefined,
            docType: classification.type,
            confidence: classification.confidence,
            uploadProgress: 0
          }
        })

        addFiles(newFiles)
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
      }
    } catch (error) {
      console.error('ドキュメント選択エラー:', error)
      Alert.alert('エラー', 'ドキュメントの選択に失敗しました')
    }
  }

  // アップロードシミュレーション
  const simulateUpload = (fileId: string) => {
    const updateProgress = (progress: number) => {
      setFiles(currentFiles => 
        currentFiles.map(file => 
          file.id === fileId 
            ? { ...file, uploadProgress: progress, isUploading: progress < 100 }
            : file
        )
      )
    }

    // プログレスシミュレーション
    let progress = 0
    const interval = setInterval(() => {
      progress += Math.random() * 20
      if (progress >= 100) {
        progress = 100
        clearInterval(interval)
        updateProgress(100)
        
        // 成功通知
        setTimeout(() => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
        }, 200)
      } else {
        updateProgress(progress)
      }
    }, 200)
  }

  const renderDropZone = () => (
    <TouchableOpacity
      style={[
        styles.dropZone,
        isDragActive && styles.dropZoneActive,
        files.length > 0 && styles.dropZoneCompact
      ]}
      onPress={() => setIsPickerOpen(true)}
      activeOpacity={0.7}
    >
      <View style={styles.dropContent}>
        <StyledText variant="title" color="primary" style={styles.dropIcon}>
          📁
        </StyledText>
        <StyledText variant="body" weight="medium" align="center">
          {title}
        </StyledText>
        <StyledText variant="caption" color="secondary" align="center">
          {description}
        </StyledText>
        <StyledText variant="caption" color="tertiary" align="center">
          最大{maxFiles}ファイル
        </StyledText>
      </View>
    </TouchableOpacity>
  )

  const renderFileItem = ({ item }: { item: UploadedFile }) => (
    <FilePreview
      file={item}
      onRemove={() => removeFile(item.id)}
      onDocTypeChange={(docType) => updateDocType(item.id, docType)}
      allowedDocTypes={allowedDocTypes}
      showProgress={uploadMode === 'immediate'}
    />
  )

  return (
    <View style={styles.container}>
      {renderDropZone()}
      
      {files.length > 0 && (
        <View style={styles.filesContainer}>
          <StyledText variant="body" weight="medium" style={styles.filesTitle}>
            選択されたファイル ({files.length}/{maxFiles})
          </StyledText>
          
          <FlatList
            data={files}
            renderItem={renderFileItem}
            keyExtractor={(item) => item.id}
            style={styles.filesList}
            showsVerticalScrollIndicator={false}
          />
        </View>
      )}

      {/* ファイル選択モーダル */}
      <Portal>
        <Modal
          visible={isPickerOpen}
          onDismiss={() => setIsPickerOpen(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <Card variant="elevated" style={styles.pickerCard}>
            <StyledText variant="title" weight="semibold" align="center" style={styles.modalTitle}>
              ファイル追加方法を選択
            </StyledText>
            
            <View style={styles.pickerButtons}>
              <StyledButton
                title="📷 カメラで撮影"
                variant="primary"
                size="lg"
                onPress={() => {
                  setIsPickerOpen(false)
                  takePicture()
                }}
                style={styles.pickerButton}
              />
              
              <StyledButton
                title="🖼️ ギャラリーから選択"
                variant="outline"
                size="lg"
                onPress={() => {
                  setIsPickerOpen(false)
                  pickFromGallery()
                }}
                style={styles.pickerButton}
              />
              
              <StyledButton
                title="📄 ドキュメント選択"
                variant="outline"
                size="lg"
                onPress={() => {
                  setIsPickerOpen(false)
                  pickDocuments()
                }}
                style={styles.pickerButton}
              />
            </View>
            
            <Button mode="text" onPress={() => setIsPickerOpen(false)}>
              キャンセル
            </Button>
          </Card>
        </Modal>
      </Portal>
    </View>
  )
}

// FilePreview コンポーネント
interface FilePreviewProps {
  file: UploadedFile
  onRemove: () => void
  onDocTypeChange: (docType: DocType) => void
  allowedDocTypes?: DocType[]
  showProgress?: boolean
}

const FilePreview: React.FC<FilePreviewProps> = ({
  file,
  onRemove,
  onDocTypeChange,
  allowedDocTypes,
  showProgress = false
}) => {
  const [showTypeSelector, setShowTypeSelector] = useState(false)
  
  const docTypes: DocType[] = allowedDocTypes || [
    'receipt', 'delivery_slip', 'contract', 'drawing', 'spec', 'photo', 'invoice'
  ]

  return (
    <Card variant="elevated" style={styles.filePreviewCard}>
      <View style={styles.fileHeader}>
        <View style={styles.fileInfo}>
          <StyledText variant="body" weight="medium" numberOfLines={1}>
            {file.name}
          </StyledText>
          <StyledText variant="caption" color="secondary">
            {file.size ? `${(file.size / 1024).toFixed(1)} KB` : 'サイズ不明'}
          </StyledText>
        </View>
        
        <TouchableOpacity
          style={styles.removeButton}
          onPress={onRemove}
        >
          <StyledText variant="body" color="error">✕</StyledText>
        </TouchableOpacity>
      </View>

      <View style={styles.fileContent}>
        <TouchableOpacity
          style={styles.typeChip}
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
        </TouchableOpacity>
        
        {file.confidence && file.confidence < 0.8 && (
          <StyledText variant="caption" color="warning">
            分類の確信度が低いため、手動で確認してください
          </StyledText>
        )}
      </View>

      {showProgress && file.isUploading && (
        <ProgressBar
          progress={file.uploadProgress ? file.uploadProgress / 100 : 0}
          color={Colors.primary}
          style={styles.progressBar}
        />
      )}

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
            
            <ScrollView style={styles.typeList}>
              {docTypes.map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.typeOption,
                    file.docType === type && styles.typeOptionSelected
                  ]}
                  onPress={() => {
                    onDocTypeChange(type)
                    setShowTypeSelector(false)
                  }}
                >
                  <View style={styles.typeOptionContent}>
                    <StyledText variant="body" style={{ color: getDocTypeColor(type) }}>
                      {getDocTypeIcon(type)}
                    </StyledText>
                    <StyledText variant="body" weight="medium">
                      {getDocTypeDisplayName(type)}
                    </StyledText>
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
    </Card>
  )
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    gap: Spacing.md,
  },
  dropZone: {
    borderWidth: 2,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
    backgroundColor: Colors.surface,
    minHeight: 120,
    justifyContent: 'center',
  },
  dropZoneActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '10',
  },
  dropZoneCompact: {
    minHeight: 80,
    padding: Spacing.md,
  },
  dropContent: {
    alignItems: 'center',
    gap: Spacing.sm,
  },
  dropIcon: {
    fontSize: 32,
  },
  filesContainer: {
    gap: Spacing.md,
  },
  filesTitle: {
    marginBottom: Spacing.sm,
  },
  filesList: {
    maxHeight: 300,
  },
  filePreviewCard: {
    marginBottom: Spacing.sm,
  },
  fileHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  fileInfo: {
    flex: 1,
    gap: Spacing.xs,
  },
  removeButton: {
    padding: Spacing.xs,
  },
  fileContent: {
    gap: Spacing.sm,
  },
  typeChip: {
    alignSelf: 'flex-start',
  },
  docTypeChip: {
    backgroundColor: Colors.surface,
  },
  progressBar: {
    marginTop: Spacing.sm,
    height: 4,
    borderRadius: 2,
  },
  modalContainer: {
    margin: Spacing.lg,
    backgroundColor: 'white',
    borderRadius: BorderRadius.lg,
    ...Shadows.medium,
  },
  pickerCard: {
    padding: Spacing.lg,
  },
  modalTitle: {
    marginBottom: Spacing.lg,
  },
  pickerButtons: {
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  pickerButton: {
    minHeight: 48,
  },
  typeSelectorCard: {
    padding: Spacing.lg,
    maxHeight: '80%',
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
  },
})