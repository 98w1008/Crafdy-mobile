import React, { useState, useRef } from 'react'
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
  Modal,
  Dimensions,
} from 'react-native'
import { Colors, Spacing, Typography, BorderRadius, Shadows } from '@/constants/Colors'
import { StyledText, StyledButton, Card } from '@/components/ui'

interface MaterialOCRTabProps {
  projectId: string
  projectName: string
  userRole: string | null
  user: any
}

interface OCRResult {
  id: string
  type: 'receipt' | 'material_list' | 'invoice'
  imageUri: string
  extractedData: {
    storeName?: string
    date?: string
    totalAmount?: number
    items?: {
      name: string
      quantity: number
      unitPrice: number
      totalPrice: number
    }[]
    rawText?: string
  }
  status: 'processing' | 'completed' | 'failed'
  createdAt: string
  submittedBy: string
}

const { width: screenWidth } = Dimensions.get('window')

export default function MaterialOCRTab({ projectId, projectName, userRole, user }: MaterialOCRTabProps) {
  const [ocrResults, setOCRResults] = useState<OCRResult[]>([
    {
      id: '1',
      type: 'receipt',
      imageUri: 'https://via.placeholder.com/300x400/1E3A8A/F8FAFC?text=Receipt+Sample',
      extractedData: {
        storeName: 'ビルダーズストア',
        date: '2024-02-15',
        totalAmount: 45680,
        items: [
          { name: '2×4材 3m', quantity: 10, unitPrice: 980, totalPrice: 9800 },
          { name: 'コンクリートビス', quantity: 2, unitPrice: 1250, totalPrice: 2500 },
          { name: '防水シート', quantity: 1, unitPrice: 12380, totalPrice: 12380 },
        ]
      },
      status: 'completed',
      createdAt: '2024-02-15T10:30:00Z',
      submittedBy: 'tanaka@example.com'
    }
  ])
  
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [showCamera, setShowCamera] = useState(false)

  // 権限チェック：職長とワーカーは撮影可能
  const canTakePhoto = userRole === 'parent' || userRole === 'lead' || userRole === 'worker'

  const handleTakePhoto = () => {
    if (!canTakePhoto) {
      Alert.alert('権限エラー', '写真撮影の権限がありません')
      return
    }

    Alert.alert(
      'カメラ機能',
      'どの方法で撮影しますか？',
      [
        { text: 'カメラで撮影', onPress: () => simulatePhotoCapture() },
        { text: 'ギャラリーから選択', onPress: () => simulatePhotoCapture() },
        { text: 'キャンセル', style: 'cancel' }
      ]
    )
  }

  const simulatePhotoCapture = () => {
    // 実際の実装では react-native-image-picker や expo-camera を使用
    const newOCR: OCRResult = {
      id: Date.now().toString(),
      type: 'receipt',
      imageUri: 'https://via.placeholder.com/300x400/2563EB/F8FAFC?text=New+Receipt',
      extractedData: { rawText: '処理中...' },
      status: 'processing',
      createdAt: new Date().toISOString(),
      submittedBy: user?.email || 'unknown'
    }

    setOCRResults(prev => [newOCR, ...prev])

    // 処理中をシミュレート
    setTimeout(() => {
      setOCRResults(prev => 
        prev.map(item => 
          item.id === newOCR.id 
            ? {
                ...item,
                status: 'completed' as const,
                extractedData: {
                  storeName: 'ホームセンター太郎',
                  date: new Date().toLocaleDateString(),
                  totalAmount: 15800,
                  items: [
                    { name: 'セメント', quantity: 2, unitPrice: 4500, totalPrice: 9000 },
                    { name: '砂利', quantity: 1, unitPrice: 6800, totalPrice: 6800 }
                  ]
                }
              }
            : item
        )
      )
    }, 3000)
  }

  const getTypeIcon = (type: OCRResult['type']) => {
    switch (type) {
      case 'receipt': return '🧾'
      case 'material_list': return '📝'
      case 'invoice': return '📄'
      default: return '📷'
    }
  }

  const getTypeText = (type: OCRResult['type']) => {
    switch (type) {
      case 'receipt': return 'レシート'
      case 'material_list': return '材料リスト'
      case 'invoice': return '請求書'
      default: return '書類'
    }
  }

  const getStatusColor = (status: OCRResult['status']) => {
    switch (status) {
      case 'completed': return Colors.success
      case 'processing': return Colors.warning
      case 'failed': return Colors.error
      default: return Colors.textTertiary
    }
  }

  const getStatusText = (status: OCRResult['status']) => {
    switch (status) {
      case 'completed': return '完了'
      case 'processing': return '処理中'
      case 'failed': return '失敗'
      default: return '不明'
    }
  }

  const renderOCRCard = (result: OCRResult) => (
    <Card key={result.id} variant="elevated" style={styles.ocrCard}>
      <View style={styles.cardHeader}>
        <View style={styles.typeInfo}>
          <StyledText variant="title" style={styles.typeIcon}>
            {getTypeIcon(result.type)}
          </StyledText>
          <View>
            <StyledText variant="subtitle" weight="semibold" color="text">
              {getTypeText(result.type)}
            </StyledText>
            <StyledText variant="caption" color="secondary">
              {new Date(result.createdAt).toLocaleString('ja-JP')}
            </StyledText>
          </View>
        </View>
        
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(result.status) + '20' }]}>
          <StyledText 
            variant="caption" 
            weight="medium"
            style={{ color: getStatusColor(result.status) }}
          >
            {getStatusText(result.status)}
          </StyledText>
        </View>
      </View>

      <View style={styles.cardContent}>
        {/* 画像プレビュー */}
        <TouchableOpacity 
          style={styles.imageContainer}
          onPress={() => setSelectedImage(result.imageUri)}
        >
          <Image 
            source={{ uri: result.imageUri }} 
            style={styles.previewImage}
            resizeMode="cover"
          />
          <View style={styles.imageOverlay}>
            <StyledText variant="caption" color="onPrimary" weight="medium">
              🔍 タップして拡大
            </StyledText>
          </View>
        </TouchableOpacity>

        {/* 抽出データ */}
        {result.status === 'completed' && result.extractedData && (
          <View style={styles.extractedData}>
            {result.extractedData.storeName && (
              <View style={styles.dataRow}>
                <StyledText variant="body" weight="semibold" color="text">
                  🏪 店舗名
                </StyledText>
                <StyledText variant="body" color="secondary">
                  {result.extractedData.storeName}
                </StyledText>
              </View>
            )}

            {result.extractedData.date && (
              <View style={styles.dataRow}>
                <StyledText variant="body" weight="semibold" color="text">
                  📅 日付
                </StyledText>
                <StyledText variant="body" color="secondary">
                  {result.extractedData.date}
                </StyledText>
              </View>
            )}

            {result.extractedData.totalAmount && (
              <View style={styles.dataRow}>
                <StyledText variant="body" weight="semibold" color="text">
                  💰 合計金額
                </StyledText>
                <StyledText variant="subtitle" weight="bold" color="primary">
                  ¥{result.extractedData.totalAmount.toLocaleString()}
                </StyledText>
              </View>
            )}

            {result.extractedData.items && result.extractedData.items.length > 0 && (
              <View style={styles.itemsSection}>
                <StyledText variant="body" weight="semibold" color="text" style={styles.itemsTitle}>
                  📦 購入品目
                </StyledText>
                {result.extractedData.items.map((item, index) => (
                  <View key={index} style={styles.itemRow}>
                    <View style={styles.itemInfo}>
                      <StyledText variant="body" weight="medium" color="text">
                        {item.name}
                      </StyledText>
                      <StyledText variant="caption" color="secondary">
                        {item.quantity}個 × ¥{item.unitPrice.toLocaleString()}
                      </StyledText>
                    </View>
                    <StyledText variant="body" weight="semibold" color="primary">
                      ¥{item.totalPrice.toLocaleString()}
                    </StyledText>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {result.status === 'processing' && (
          <View style={styles.processingContainer}>
            <StyledText variant="body" color="warning" align="center">
              ⏳ OCR処理中です...
            </StyledText>
            <StyledText variant="caption" color="secondary" align="center">
              画像からテキストを抽出しています
            </StyledText>
          </View>
        )}

        {result.status === 'failed' && (
          <View style={styles.errorContainer}>
            <StyledText variant="body" color="error" align="center">
              ❌ 処理に失敗しました
            </StyledText>
            <StyledText variant="caption" color="secondary" align="center">
              画像が不鮮明か、対応していない形式です
            </StyledText>
            <StyledButton
              title="再試行"
              variant="outline"
              size="sm"
              onPress={() => Alert.alert('開発中', '再試行機能は開発中です')}
              style={styles.retryButton}
            />
          </View>
        )}
      </View>

      <View style={styles.cardFooter}>
        <StyledText variant="caption" color="tertiary">
          提出者: {result.submittedBy}
        </StyledText>
      </View>
    </Card>
  )

  const renderImageModal = () => (
    <Modal
      visible={!!selectedImage}
      transparent={true}
      onRequestClose={() => setSelectedImage(null)}
    >
      <View style={styles.modalContainer}>
        <TouchableOpacity 
          style={styles.modalOverlay}
          onPress={() => setSelectedImage(null)}
        >
          <View style={styles.modalContent}>
            {selectedImage && (
              <Image 
                source={{ uri: selectedImage }} 
                style={styles.fullImage}
                resizeMode="contain"
              />
            )}
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setSelectedImage(null)}
            >
              <StyledText variant="title" color="onPrimary">✕</StyledText>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </View>
    </Modal>
  )

  const renderEmptyState = () => (
    <Card variant="outlined" style={styles.emptyCard}>
      <StyledText variant="heading3" align="center" style={styles.emptyIcon}>
        📷
      </StyledText>
      <StyledText variant="title" weight="semibold" align="center" color="text">
        材料OCRデータがありません
      </StyledText>
      <StyledText variant="body" color="secondary" align="center" style={styles.emptyDescription}>
        レシートや材料リストを撮影して、自動でデータ化しましょう
      </StyledText>
      {canTakePhoto && (
        <StyledButton
          title="写真を撮影"
          variant="primary"
          size="lg"
          elevated={true}
          icon={<StyledText variant="title" color="onPrimary">📷</StyledText>}
          onPress={handleTakePhoto}
          style={styles.emptyButton}
        />
      )}
    </Card>
  )

  return (
    <View style={styles.container}>
      {/* ヘッダーアクション */}
      {canTakePhoto && (
        <View style={styles.headerActions}>
          <StyledButton
            title="写真撮影"
            variant="primary"
            size="md"
            icon={<StyledText variant="body" color="onPrimary">📷</StyledText>}
            onPress={handleTakePhoto}
            style={styles.captureButton}
          />
        </View>
      )}

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* OCR結果一覧 */}
        {ocrResults.length > 0 ? (
          ocrResults.map(renderOCRCard)
        ) : (
          renderEmptyState()
        )}
      </ScrollView>

      {/* 画像拡大モーダル */}
      {renderImageModal()}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  headerActions: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.surfaceElevated,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  captureButton: {
    alignSelf: 'flex-end',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.md,
    paddingBottom: Spacing['2xl'],
  },
  ocrCard: {
    marginBottom: Spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  typeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  typeIcon: {
    fontSize: 24,
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  cardContent: {
    gap: Spacing.md,
  },
  imageContainer: {
    position: 'relative',
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  previewImage: {
    width: '100%',
    height: 200,
    backgroundColor: Colors.surfaceNeutral,
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingVertical: Spacing.xs,
    alignItems: 'center',
  },
  extractedData: {
    gap: Spacing.sm,
  },
  dataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  itemsSection: {
    marginTop: Spacing.sm,
  },
  itemsTitle: {
    marginBottom: Spacing.sm,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    backgroundColor: Colors.surfaceNeutral,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.xs,
  },
  itemInfo: {
    flex: 1,
    gap: Spacing.xs,
  },
  processingContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    gap: Spacing.sm,
  },
  errorContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    gap: Spacing.sm,
  },
  retryButton: {
    marginTop: Spacing.sm,
    minWidth: 100,
  },
  cardFooter: {
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    marginTop: Spacing.md,
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: Spacing['2xl'],
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: Spacing.lg,
  },
  emptyDescription: {
    marginTop: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  emptyButton: {
    minWidth: 200,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: screenWidth * 0.9,
    height: screenWidth * 1.2,
    position: 'relative',
  },
  fullImage: {
    width: '100%',
    height: '100%',
  },
  closeButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    backgroundColor: Colors.overlay,
    borderRadius: 20,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
})