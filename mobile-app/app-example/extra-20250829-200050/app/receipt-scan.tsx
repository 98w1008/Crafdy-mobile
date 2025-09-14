import React, { useState } from 'react'
import {
  View,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  Image,
} from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { useAuth, useRole } from '@/contexts/AuthContext'
import { Colors, Spacing, Typography, BorderRadius, Shadows } from '@/constants/Colors'
import { StyledText, StyledButton, Card } from '@/components/ui'
import { Surface, Chip, IconButton } from 'react-native-paper'
import * as ImagePicker from 'expo-image-picker'
import * as Haptics from 'expo-haptics'

// =============================================================================
// TYPES
// =============================================================================

type ScanType = 'receipt' | 'delivery' | 'invoice-material'

interface DocumentGuide {
  title: string
  description: string
  tips: string[]
  icon: string
}

interface Project {
  id: string
  name: string
  location: string
}

interface ReceiptData {
  id: string
  image_uri: string
  store_name?: string
  total_amount?: number
  date?: string
  items?: string[]
  scan_type?: ScanType
  delivery_number?: string
  supplier_name?: string
  invoice_number?: string
}

// =============================================================================
// CONSTANTS
// =============================================================================

const DOCUMENT_GUIDES: Record<ScanType, DocumentGuide> = {
  receipt: {
    title: 'レシート撮影',
    description: '経費として計上するレシートを撮影してください',
    tips: [
      '文字がはっきり見えるように',
      '影がかからないように',
      'レシート全体が画面に収まるように'
    ],
    icon: 'receipt'
  },
  delivery: {
    title: '搬入・納品書撮影', 
    description: '搬入書や納品書を撮影してください',
    tips: [
      '日付と数量が明確に見えるように',
      '複数ページある場合は1枚ずつ',
      '材料名・品番が読めるように'
    ],
    icon: 'truck-delivery'
  },
  'invoice-material': {
    title: '材料請求書撮影',
    description: '請求書作成用の材料証憑を撮影してください',
    tips: [
      '品目と金額が見えるように',
      '発行元の会社名を含める',
      '請求先情報も一緒に撮影'
    ],
    icon: 'file-document'
  }
}

export default function ReceiptScanScreen() {
  const params = useLocalSearchParams()
  const scanType = (params.type as ScanType) || 'receipt'
  
  const { user, profile } = useAuth()
  const userRole = useRole()
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [ocrResult, setOcrResult] = useState<ReceiptData | null>(null)
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [expenseCategory, setExpenseCategory] = useState<'site' | 'company' | null>(null)
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<'capture' | 'ocr' | 'selection' | 'confirmation'>('capture')
  
  const guide = DOCUMENT_GUIDES[scanType]

  // サンプルプロジェクトデータ（実際にはSupabaseから取得）
  const projects: Project[] = [
    {
      id: '1',
      name: '新宿オフィスビル建設',
      location: '東京都新宿区'
    },
    {
      id: '2',
      name: 'マンション改修工事',
      location: '神奈川県横浜市'
    },
    {
      id: '3',
      name: '商業施設リニューアル',
      location: '埼玉県さいたま市'
    },
    {
      id: '4',
      name: '住宅建築プロジェクト',
      location: '千葉県船橋市'
    }
  ]

  const takePhoto = async () => {
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
        setSelectedImage(result.assets[0].uri)
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
        processOCR(result.assets[0].uri)
      }
    } catch (error) {
      console.error('写真撮影エラー:', error)
      Alert.alert('エラー', '写真の撮影に失敗しました')
    }
  }

  const pickFromGallery = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (status !== 'granted') {
        Alert.alert('権限エラー', 'フォトライブラリへのアクセス許可が必要です')
        return
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      })

      if (!result.canceled && result.assets[0]) {
        setSelectedImage(result.assets[0].uri)
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
        processOCR(result.assets[0].uri)
      }
    } catch (error) {
      console.error('画像選択エラー:', error)
      Alert.alert('エラー', '画像の選択に失敗しました')
    }
  }

  const processOCR = async (imageUri: string) => {
    setLoading(true)
    setStep('ocr')
    
    try {
      // デモ用OCR結果（実際にはGoogle Vision APIやAWS Textractを使用）
      await new Promise(resolve => setTimeout(resolve, 2000)) // 処理時間をシミュレート
      
      // スキャンタイプに応じてMockデータを生成
      let mockOcrResult: ReceiptData
      
      switch (scanType) {
        case 'receipt':
          mockOcrResult = {
            id: Date.now().toString(),
            image_uri: imageUri,
            scan_type: 'receipt',
            store_name: 'ホームセンター太郎',
            total_amount: 15800,
            date: new Date().toLocaleDateString('ja-JP'),
            items: [
              '木材 2x4 10本',
              'ネジ M6x40 50本',
              '塗料 白色 1L',
              '工具レンタル'
            ]
          }
          break
        
        case 'delivery':
          mockOcrResult = {
            id: Date.now().toString(),
            image_uri: imageUri,
            scan_type: 'delivery',
            supplier_name: '建材商事株式会社',
            delivery_number: 'D-2024-0115-001',
            date: new Date().toLocaleDateString('ja-JP'),
            items: [
              'コンクリート 5m³',
              '鉄筋 D13 50本',
              'セメント 20袋',
              '砕石 2t'
            ]
          }
          break
        
        case 'invoice-material':
          mockOcrResult = {
            id: Date.now().toString(),
            image_uri: imageUri,
            scan_type: 'invoice-material',
            supplier_name: '電材卸売株式会社',
            invoice_number: 'INV-2024-001',
            total_amount: 23100,
            date: new Date().toLocaleDateString('ja-JP'),
            items: [
              'ケーブル VVF2.0×3C 100m',
              'スイッチボックス 20個',
              'コンセント 15個',
              'ブレーカー 5個'
            ]
          }
          break
        
        default:
          mockOcrResult = {
            id: Date.now().toString(),
            image_uri: imageUri,
            scan_type: 'receipt'
          }
      }
      
      setOcrResult(mockOcrResult)
      setStep('selection')
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      
    } catch (error) {
      console.error('OCR処理エラー:', error)
      Alert.alert('エラー', 'ドキュメントの読み取りに失敗しました')
      setStep('capture')
    } finally {
      setLoading(false)
    }
  }

  const handleCategorySelection = (category: 'site' | 'company') => {
    setExpenseCategory(category)
    if (category === 'company') {
      setStep('confirmation')
    } else {
      // 現場関連の場合はプロジェクト選択が必要
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
  }

  const handleProjectSelection = (project: Project) => {
    setSelectedProject(project)
    setStep('confirmation')
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
  }

  const handleConfirmReceipt = async () => {
    if (!ocrResult) return
    
    setLoading(true)
    
    try {
      // スキャンタイプに応じた保存処理
      const documentRecord = {
        ...ocrResult,
        expense_category: expenseCategory,
        project_id: selectedProject?.id || null,
        user_id: user?.id,
        created_at: new Date().toISOString()
      }
      
      console.log('💾 Saving document:', documentRecord)
      
      // 保存処理をシミュレート
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      
      // スキャンタイプに応じた結果画面への遷移
      switch (scanType) {
        case 'receipt':
          Alert.alert(
            '保存完了',
            `レシートが${expenseCategory === 'site' ? '現場経費' : '会社経費'}として保存されました`,
            [
              { text: 'OK', onPress: () => router.back() }
            ]
          )
          break
        
        case 'delivery':
          Alert.alert(
            '保存完了',
            '搬入・納品書を保存しました。在庫管理に反映されます。',
            [
              { 
                text: '在庫確認', 
                onPress: () => router.push('/inventory/materials') 
              },
              { 
                text: 'OK', 
                onPress: () => router.back(),
                style: 'cancel'
              }
            ]
          )
          break
        
        case 'invoice-material':
          Alert.alert(
            '保存完了',
            '材料請求書を保存しました。請求書作成に利用できます。',
            [
              { 
                text: '請求書作成', 
                onPress: () => router.push('/invoice/create') 
              },
              { 
                text: 'OK', 
                onPress: () => router.back(),
                style: 'cancel'
              }
            ]
          )
          break
      }
      
    } catch (error) {
      console.error('ドキュメント保存エラー:', error)
      Alert.alert('エラー', 'ドキュメントの保存に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const resetScan = () => {
    setSelectedImage(null)
    setOcrResult(null)
    setSelectedProject(null)
    setExpenseCategory(null)
    setStep('capture')
  }

  const renderCaptureStep = () => (
    <View style={styles.stepContainer}>
      <Card variant="premium" elevationLevel={3} style={styles.instructionCard}>
        <View style={styles.instructionHeader}>
          <Chip 
            icon={guide.icon}
            mode="outlined"
            compact
            style={styles.scanTypeChip}
          >
            {guide.title}
          </Chip>
        </View>
        <StyledText variant="body" color="secondary" style={styles.instructionText}>
          {guide.description}
        </StyledText>
        
        {/* 撮影のコツ */}
        <View style={styles.tipsContainer}>
          <StyledText variant="body" weight="medium" style={styles.tipsTitle}>
            撮影のコツ:
          </StyledText>
          {guide.tips.map((tip, index) => (
            <StyledText key={index} variant="caption" color="secondary" style={styles.tipItem}>
              • {tip}
            </StyledText>
          ))}
        </View>
      </Card>

      <View style={styles.captureButtons}>
        <StyledButton
          title="写真を撮る"
          variant="primary"
          size="lg"
          elevated={true}
          onPress={takePhoto}
          style={styles.captureButton}
        />
        <StyledButton
          title="ギャラリーから選択"
          variant="outline"
          size="lg"
          onPress={pickFromGallery}
          style={styles.captureButton}
        />
      </View>
    </View>
  )

  const renderOCRStep = () => (
    <View style={styles.stepContainer}>
      <Card variant="elevated" style={styles.processingCard}>
        <View style={styles.processingContent}>
          <StyledText variant="title" weight="semibold" align="center">
            {scanType === 'receipt' ? 'レシートを読み取り中...' :
             scanType === 'delivery' ? '搬入・納品書を読み取り中...' :
             '材料請求書を読み取り中...'}
          </StyledText>
          <StyledText variant="body" color="secondary" align="center">
            しばらくお待ちください
          </StyledText>
        </View>
      </Card>
      
      {selectedImage && (
        <Image source={{ uri: selectedImage }} style={styles.previewImage} />
      )}
    </View>
  )

  const renderSelectionStep = () => (
    <View style={styles.stepContainer}>
      {/* OCR結果表示 */}
      {ocrResult && (
        <Card variant="elevated" style={styles.resultCard}>
          <StyledText variant="subtitle" weight="semibold" style={styles.resultTitle}>
            読み取り結果
          </StyledText>
          <View style={styles.resultContent}>
            {/* 共通フィールド */}
            <View style={styles.resultRow}>
              <StyledText variant="body" weight="medium">日付:</StyledText>
              <StyledText variant="body">{ocrResult.date}</StyledText>
            </View>
            
            {/* スキャンタイプ別フィールド */}
            {scanType === 'receipt' && (
              <>
                <View style={styles.resultRow}>
                  <StyledText variant="body" weight="medium">店名:</StyledText>
                  <StyledText variant="body">{ocrResult.store_name}</StyledText>
                </View>
                <View style={styles.resultRow}>
                  <StyledText variant="body" weight="medium">合計金額:</StyledText>
                  <StyledText variant="body" color="primary" weight="semibold">
                    ¥{ocrResult.total_amount?.toLocaleString()}
                  </StyledText>
                </View>
              </>
            )}
            
            {scanType === 'delivery' && (
              <>
                <View style={styles.resultRow}>
                  <StyledText variant="body" weight="medium">業者名:</StyledText>
                  <StyledText variant="body">{ocrResult.supplier_name}</StyledText>
                </View>
                <View style={styles.resultRow}>
                  <StyledText variant="body" weight="medium">搬入番号:</StyledText>
                  <StyledText variant="body">{ocrResult.delivery_number}</StyledText>
                </View>
              </>
            )}
            
            {scanType === 'invoice-material' && (
              <>
                <View style={styles.resultRow}>
                  <StyledText variant="body" weight="medium">業者名:</StyledText>
                  <StyledText variant="body">{ocrResult.supplier_name}</StyledText>
                </View>
                <View style={styles.resultRow}>
                  <StyledText variant="body" weight="medium">請求書番号:</StyledText>
                  <StyledText variant="body">{ocrResult.invoice_number}</StyledText>
                </View>
                {ocrResult.total_amount && (
                  <View style={styles.resultRow}>
                    <StyledText variant="body" weight="medium">合計金額:</StyledText>
                    <StyledText variant="body" color="primary" weight="semibold">
                      ¥{ocrResult.total_amount.toLocaleString()}
                    </StyledText>
                  </View>
                )}
              </>
            )}
          </View>
        </Card>
      )}

      {/* カテゴリー選択（レシートの場合のみ） */}
      {scanType === 'receipt' && (
        <Card variant="premium" style={styles.categoryCard}>
          <StyledText variant="subtitle" weight="semibold" style={styles.categoryTitle}>
            経費カテゴリーを選択
          </StyledText>
        
        <View style={styles.categoryButtons}>
          <TouchableOpacity
            style={[
              styles.categoryButton,
              expenseCategory === 'site' && styles.categoryButtonSelected
            ]}
            onPress={() => handleCategorySelection('site')}
          >
            <StyledText variant="body" weight="semibold">現場経費</StyledText>
            <StyledText variant="caption" color="secondary" align="center">
              特定の現場に関連する経費
            </StyledText>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.categoryButton,
              expenseCategory === 'company' && styles.categoryButtonSelected
            ]}
            onPress={() => handleCategorySelection('company')}
          >
            <StyledText variant="body" weight="semibold">会社経費</StyledText>
            <StyledText variant="caption" color="secondary" align="center">
              会社全体の一般経費
            </StyledText>
          </TouchableOpacity>
        </View>
        </Card>
      )}
      
      {/* レシート以外の場合は直接確定ボタン */}
      {scanType !== 'receipt' && (
        <Card variant="premium" style={styles.categoryCard}>
          <StyledText variant="subtitle" weight="semibold" style={styles.categoryTitle}>
            {scanType === 'delivery' ? '搬入データとして保存' :
             '請求書材料として保存'}
          </StyledText>
          <StyledText variant="body" color="secondary" align="center" style={styles.directSaveText}>
            {scanType === 'delivery' ? '在庫管理に自動反映されます' :
             '請求書作成時に利用できます'}
          </StyledText>
          <StyledButton
            title={scanType === 'delivery' ? '在庫に追加' : '材料として保存'}
            variant="primary"
            size="lg"
            elevated={true}
            onPress={() => setStep('confirmation')}
            style={styles.directSaveButton}
          />
        </Card>
      )}

      {/* プロジェクト選択（現場経費の場合） */}
      {expenseCategory === 'site' && (
        <Card variant="elevated" style={styles.projectCard}>
          <StyledText variant="subtitle" weight="semibold" style={styles.projectTitle}>
            対象現場を選択
          </StyledText>
          
          <View style={styles.projectList}>
            {projects.map((project) => (
              <TouchableOpacity
                key={project.id}
                style={[
                  styles.projectItem,
                  selectedProject?.id === project.id && styles.projectItemSelected
                ]}
                onPress={() => handleProjectSelection(project)}
              >
                <View style={styles.projectInfo}>
                  <StyledText variant="body" weight="medium" numberOfLines={1}>
                    {project.name}
                  </StyledText>
                  <StyledText variant="caption" color="secondary">
                    {project.location}
                  </StyledText>
                </View>
                {selectedProject?.id === project.id && (
                  <StyledText variant="title" color="primary">✓</StyledText>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </Card>
      )}
    </View>
  )

  const renderConfirmationStep = () => (
    <View style={styles.stepContainer}>
      <Card variant="success" elevationLevel={3} style={styles.confirmationCard}>
        <View style={styles.confirmationHeader}>
          <StyledText variant="title" weight="semibold" align="center">
            登録内容確認
          </StyledText>
        </View>

        {ocrResult && (
          <View style={styles.confirmationContent}>
            <View style={styles.confirmRow}>
              <StyledText variant="body" weight="medium">店名:</StyledText>
              <StyledText variant="body">{ocrResult.store_name}</StyledText>
            </View>
            <View style={styles.confirmRow}>
              <StyledText variant="body" weight="medium">金額:</StyledText>
              <StyledText variant="body" color="primary" weight="semibold">
                ¥{ocrResult.total_amount?.toLocaleString()}
              </StyledText>
            </View>
            <View style={styles.confirmRow}>
              <StyledText variant="body" weight="medium">カテゴリー:</StyledText>
              <StyledText variant="body" color="success" weight="semibold">
                {expenseCategory === 'site' ? '現場経費' : '会社経費'}
              </StyledText>
            </View>
            {selectedProject && (
              <View style={styles.confirmRow}>
                <StyledText variant="body" weight="medium">対象現場:</StyledText>
                <StyledText variant="body" weight="semibold">
                  {selectedProject.name}
                </StyledText>
              </View>
            )}
          </View>
        )}

        <View style={styles.confirmationButtons}>
          <StyledButton
            title="登録する"
            variant="primary"
            size="lg"
            elevated={true}
            onPress={handleConfirmReceipt}
            loading={loading}
            style={styles.confirmButton}
          />
          <StyledButton
            title="修正する"
            variant="outline"
            size="md"
            onPress={() => setStep('selection')}
            style={styles.editButton}
          />
        </View>
      </Card>
    </View>
  )

  return (
    <SafeAreaView style={styles.container}>
      {/* ヘッダー */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <StyledText variant="title" color="primary">←</StyledText>
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <StyledText variant="title" weight="semibold">
            {guide.title}
          </StyledText>
          <StyledText variant="caption" color="secondary">
            {scanType === 'receipt' ? '経費登録・現場管理' :
             scanType === 'delivery' ? '在庫管理・搬入記録' :
             '請求書・材料管理'}
          </StyledText>
        </View>
        {step !== 'capture' && (
          <TouchableOpacity
            style={styles.resetButton}
            onPress={resetScan}
          >
            <StyledText variant="caption" color="primary">リセット</StyledText>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {step === 'capture' && renderCaptureStep()}
        {step === 'ocr' && renderOCRStep()}
        {step === 'selection' && renderSelectionStep()}
        {step === 'confirmation' && renderConfirmationStep()}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  backButton: {
    marginRight: Spacing.md,
  },
  headerContent: {
    flex: 1,
  },
  resetButton: {
    marginLeft: Spacing.md,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.md,
    paddingBottom: Spacing['2xl'],
  },
  stepContainer: {
    gap: Spacing.lg,
  },
  instructionCard: {
    alignItems: 'center',
  },
  instructionHeader: {
    alignItems: 'center',
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  instructionText: {
    textAlign: 'center',
    lineHeight: 22,
  },
  captureButtons: {
    gap: Spacing.md,
  },
  captureButton: {
    minHeight: 56,
  },
  processingCard: {
    alignItems: 'center',
    paddingVertical: Spacing['2xl'],
  },
  processingContent: {
    alignItems: 'center',
    gap: Spacing.md,
  },
  previewImage: {
    width: '100%',
    height: 200,
    borderRadius: BorderRadius.lg,
    resizeMode: 'cover',
  },
  resultCard: {
    marginBottom: Spacing.md,
  },
  resultTitle: {
    marginBottom: Spacing.md,
  },
  resultContent: {
    gap: Spacing.sm,
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryCard: {
  },
  categoryTitle: {
    marginBottom: Spacing.lg,
    textAlign: 'center',
  },
  categoryButtons: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  categoryButton: {
    flex: 1,
    alignItems: 'center',
    padding: Spacing.lg,
    borderWidth: 2,
    borderColor: Colors.border,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.surface,
    gap: Spacing.sm,
  },
  categoryButtonSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '10',
  },
  projectCard: {
  },
  projectTitle: {
    marginBottom: Spacing.md,
  },
  projectList: {
    gap: Spacing.sm,
  },
  projectItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.surface,
  },
  projectItemSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '10',
  },
  projectInfo: {
    flex: 1,
    gap: Spacing.xs,
  },
  confirmationCard: {
    alignItems: 'center',
  },
  confirmationHeader: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  confirmationContent: {
    width: '100%',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  confirmRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
  },
  confirmationButtons: {
    width: '100%',
    gap: Spacing.md,
  },
  confirmButton: {
    minHeight: 56,
  },
  editButton: {
  },
  // 新規スタイル
  scanTypeChip: {
    marginBottom: Spacing.md,
  },
  tipsContainer: {
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  tipsTitle: {
    marginBottom: Spacing.sm,
  },
  tipItem: {
    marginLeft: Spacing.md,
    marginBottom: Spacing.xs,
    lineHeight: 18,
  },
  directSaveText: {
    marginVertical: Spacing.md,
  },
  directSaveButton: {
    marginTop: Spacing.md,
    minHeight: 48,
  },
})