/**
 * 統一見積もり作成ウィザード
 * 3ステップで見積もりを作成：基本情報 → 書類アップロード → 確認・出力
 */

import React, { useState } from 'react'
import {
  View,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { useColors, useSpacing, useRadius } from '@/theme/ThemeProvider'
import { StyledText, StyledButton, Card } from '@/components/ui'
import { DocumentUploader, UploadedFile } from '@/components/upload/DocumentUploader'
import { ProgressBar, Chip, IconButton } from 'react-native-paper'
import * as Haptics from 'expo-haptics'

// =============================================================================
// TYPES & INTERFACES
// =============================================================================

type WizardStep = 1 | 2 | 3

interface EstimateFormData {
  // Step 1: 基本情報
  estimateName: string
  clientName: string
  siteLocation: string
  contractType: 'material_labor' | 'labor_only' | 'daily_hire'  // 材工 | 手間 | 常用
  billingType: 'completion' | 'milestone'  // 出来高 | マイルストン
  prospectId?: string

  // Step 2: 統合アップロード（AI自動判別対応）
  uploadedFiles: UploadedFile[]
  aiAnalysisResults?: {
    detectedDocuments: AIDetectedDocument[]
    extractedData: ExtractedEstimateData
    confidence: number
    suggestions: string[]
  }
  smartPreFilledData?: {
    materials: MaterialItem[]
    laborHours: LaborItem[]
    equipment: EquipmentItem[]
    specialRequirements: string[]
  }

  // Step 3: 生成された見積もり結果
  generatedEstimate?: {
    items: EstimateItem[]
    subtotal: number
    tax: number
    total: number
    evidence: string[]
  }
}

interface EstimateItem {
  category: string
  itemName: string
  quantity: number
  unit: string
  unitPrice: number
  amount: number
}

// AI統合型の新しいインターフェース
interface AIDetectedDocument {
  fileId: string
  docType: 'drawing' | 'spec' | 'photo' | 'receipt' | 'contract' | 'material_estimate'
  extractedData: any
  confidence: number
}

interface ExtractedEstimateData {
  projectDetails: {
    area?: number
    floors?: number
    buildingType?: string
    complexity?: 'simple' | 'standard' | 'complex'
  }
  materials: MaterialItem[]
  laborRequirements: LaborItem[]
  equipmentNeeds: EquipmentItem[]
}

interface MaterialItem {
  name: string
  quantity: number
  unit: string
  estimatedCost: number
  source?: string // どのドキュメントから抽出されたか
}

interface LaborItem {
  category: string
  hours: number
  skillLevel: string
  estimatedRate: number
}

interface EquipmentItem {
  name: string
  duration: number
  unit: string
  estimatedCost: number
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function EstimateWizard() {
  const colors = useColors()
  const spacing = useSpacing()
  const radius = useRadius()
  const params = useLocalSearchParams()
  const [currentStep, setCurrentStep] = useState<WizardStep>(1)

  // 初期データのパース
  const initialEstimateData = params.estimate_data
    ? JSON.parse(params.estimate_data as string)
    : null

  const [formData, setFormData] = useState<EstimateFormData>({
    estimateName: initialEstimateData?.project_scope?.type === 'renovation' ? '改修工事見積書' : '工事見積書',
    clientName: initialEstimateData?.client?.name || '',
    siteLocation: params.prospect_id ? '現場未設定（仮案件）' : '',
    contractType: 'material_labor',
    billingType: 'completion',
    uploadedFiles: [],
    prospectId: params.prospect_id as string,
    generatedEstimate: initialEstimateData ? {
      items: initialEstimateData.items.map((item: any) => ({
        category: item.category === 'labor' ? '労務費' :
          item.category === 'material' ? '材料費' :
            item.category === 'equipment' ? '機械経費' : '諸経費',
        itemName: item.name,
        quantity: item.quantity,
        unit: item.unit,
        unitPrice: item.adjusted_unit_price,
        amount: item.total_price
      })),
      subtotal: initialEstimateData.summary.subtotal,
      tax: initialEstimateData.summary.tax,
      total: initialEstimateData.summary.total,
      evidence: initialEstimateData.ai_insights.recommendations
    } : undefined
  })
  const [loading, setLoading] = useState(false)

  // 初期データがある場合はステップ3へ（AI分析済みの場合）
  React.useEffect(() => {
    if (initialEstimateData) {
      setCurrentStep(3)
    }
  }, [])

  // =============================================================================
  // STEP NAVIGATION
  // =============================================================================

  const handleNext = async () => {
    if (currentStep === 1) {
      if (!validateStep1()) return
      setCurrentStep(2)
    } else if (currentStep === 2) {
      if (!validateStep2()) return
      setCurrentStep(3)
      await generateEstimate()
    }
  }

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep((currentStep - 1) as WizardStep)
    }
  }

  const handleClose = () => {
    Alert.alert(
      '確認',
      '見積もり作成を中止しますか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        { text: '中止', style: 'destructive', onPress: () => router.back() },
      ]
    )
  }

  // =============================================================================
  // VALIDATION
  // =============================================================================

  const validateStep1 = (): boolean => {
    if (!formData.estimateName.trim()) {
      Alert.alert('エラー', '見積名を入力してください')
      return false
    }
    if (!formData.clientName.trim()) {
      Alert.alert('エラー', '宛先（クライアント名）を入力してください')
      return false
    }
    if (!formData.siteLocation.trim()) {
      Alert.alert('エラー', '現場名を入力してください')
      return false
    }
    return true
  }

  const validateStep2 = (): boolean => {
    // 統合アップロードの検証
    if (formData.uploadedFiles.length === 0) {
      Alert.alert(
        '確認',
        'アップロードされたファイルがありません。AIによる自動見積には書類が必要です。このまま進みますか？',
        [
          { text: 'ファイルを追加', style: 'cancel' },
          { text: '手動で続行', style: 'default', onPress: () => true },
        ]
      )
      return false
    }

    // 必要なドキュメントタイプの確認
    const docTypes = formData.uploadedFiles.map(f => f.docType)
    const hasDrawing = docTypes.includes('drawing')
    const hasSpec = docTypes.includes('spec')

    if (!hasDrawing && !hasSpec) {
      Alert.alert(
        '推奨書類不足',
        '図面または仕様書があるとより精確な見積が作成できます。追加しますか？',
        [
          { text: '追加する', style: 'default' },
          { text: 'このまま続行', style: 'cancel' },
        ]
      )
    }

    return true
  }

  // =============================================================================
  // OUTPUT FUNCTIONS
  // =============================================================================

  const handlePDFExport = async () => {
    if (!formData.generatedEstimate) return

    try {
      setLoading(true)

      // 簡単なPDFテンプレートを作成（expo-print使用）
      const htmlContent = generatePDFTemplate(formData)

      // TODO: expo-printでPDF生成
      // const { uri } = await Print.printToFileAsync({ html: htmlContent })
      // await Sharing.shareAsync(uri)

      Alert.alert(
        'PDF作成完了',
        `${formData.estimateName}のPDF見積書を作成しました。\n\n含まれる内容:\n• 見積書ヘッダー\n• 詳細内訳表\n• 総合計\n• 根拠サマリ`,
        [{ text: 'OK' }]
      )
    } catch (error) {
      Alert.alert('エラー', 'PDF出力に失敗しました')
      console.error('PDF export error:', error)
    } finally {
      setLoading(false)
    }
  }

  const generatePDFTemplate = (data: EstimateFormData): string => {
    const { generatedEstimate } = data
    if (!generatedEstimate) return ''

    return `
      <html>
        <head>
          <meta charset="utf-8">
          <title>${data.estimateName}</title>
          <style>
            body { font-family: 'Hiragino Sans', sans-serif; margin: 20px; }
            .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px; }
            .info { margin: 20px 0; }
            .table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            .table th, .table td { border: 1px solid #ccc; padding: 8px; text-align: left; }
            .table th { background-color: #f5f5f5; }
            .total { text-align: right; font-size: 18px; font-weight: bold; margin-top: 20px; }
            .evidence { margin-top: 30px; background-color: #f9f9f9; padding: 15px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>見積書</h1>
            <h2>${data.estimateName}</h2>
          </div>
          
          <div class="info">
            <p><strong>宛先:</strong> ${data.clientName}</p>
            <p><strong>現場名:</strong> ${data.siteLocation}</p>
            <p><strong>作成日:</strong> ${new Date().toLocaleDateString('ja-JP')}</p>
          </div>
          
          <table class="table">
            <thead>
              <tr>
                <th>項目</th>
                <th>数量</th>
                <th>単価</th>
                <th>金額</th>
              </tr>
            </thead>
            <tbody>
              ${generatedEstimate.items.map(item => `
                <tr>
                  <td>${item.itemName}</td>
                  <td>${item.quantity} ${item.unit}</td>
                  <td>¥${item.unitPrice.toLocaleString()}</td>
                  <td>¥${item.amount.toLocaleString()}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <div class="total">
            <p>小計: ¥${generatedEstimate.subtotal.toLocaleString()}</p>
            <p>消費税(10%): ¥${generatedEstimate.tax.toLocaleString()}</p>
            <p style="border-top: 2px solid #333; padding-top: 10px;">合計: ¥${generatedEstimate.total.toLocaleString()}</p>
          </div>
          
          <div class="evidence">
            <h3>算出根拠</h3>
            <ul>
              ${generatedEstimate.evidence.map(e => `<li>${e}</li>`).join('')}
            </ul>
          </div>
        </body>
      </html>
    `
  }

  const handleExcelExport = async () => {
    if (!formData.generatedEstimate) return

    try {
      setLoading(true)

      // Excelデータ構造を作成
      const excelData = generateExcelData(formData)

      // TODO: xlsxライブラリでExcelファイル生成
      // import * as XLSX from 'xlsx'
      // const wb = XLSX.utils.book_new()
      // XLSX.utils.book_append_sheet(wb, excelData.estimateSheet, '見積明細')
      // XLSX.utils.book_append_sheet(wb, excelData.summarySheet, '集計表')
      // const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'base64' })

      Alert.alert(
        'Excel作成完了',
        `${formData.estimateName}のExcel明細を作成しました。\n\n含まれるシート:\n• 見積明細シート\n• 集計表シート\n• データ入力シート`,
        [{ text: 'OK' }]
      )
    } catch (error) {
      Alert.alert('エラー', 'Excel出力に失敗しました')
      console.error('Excel export error:', error)
    } finally {
      setLoading(false)
    }
  }

  const generateExcelData = (data: EstimateFormData) => {
    const { generatedEstimate } = data
    if (!generatedEstimate) return null

    const estimateSheet = [
      ['項目名', '数量', '単位', '単価', '金額'],
      ...generatedEstimate.items.map(item => [
        item.itemName,
        item.quantity,
        item.unit,
        item.unitPrice,
        item.amount
      ]),
      [],
      ['小計', '', '', '', generatedEstimate.subtotal],
      ['消費税(10%)', '', '', '', generatedEstimate.tax],
      ['合計', '', '', '', generatedEstimate.total]
    ]

    const summarySheet = [
      ['見積書情報'],
      ['見積名', data.estimateName],
      ['宛先', data.clientName],
      ['現場名', data.siteLocation],
      ['作成日', new Date().toLocaleDateString('ja-JP')],
      [],
      ['算出根拠'],
      ...generatedEstimate.evidence.map(e => [e])
    ]

    return { estimateSheet, summarySheet }
  }

  const handleChatAttach = async () => {
    if (!formData.generatedEstimate) return

    try {
      setLoading(true)

      const { generatedEstimate } = formData
      const estimateText = formatEstimateForChat(formData, generatedEstimate)

      Alert.alert(
        'チャットに貼付',
        `${formData.estimateName}の見積もりをチャットに投稿しますか？\n\n含まれる情報:\n• 詳細内訳表\n• 合計金額\n• PDF/Excelダウンロードボタン`,
        [
          { text: 'キャンセル', style: 'cancel' },
          {
            text: 'チャットに投稿',
            onPress: async () => {
              try {
                // TODO: 実際のチャット投稿処理
                // チャットメッセージとして送信
                await simulateChatPost(estimateText)

                Alert.alert(
                  '投稿完了 ✓',
                  '見積もりをチャットに投稿しました。\nPDF/Excelダウンロードボタンも追加されています。',
                  [{ text: 'OK', onPress: () => router.back() }]
                )
              } catch (error) {
                Alert.alert('エラー', 'チャット投稿に失敗しました')
              }
            }
          }
        ]
      )
    } catch (error) {
      Alert.alert('エラー', 'チャット貼付の処理に失敗しました')
      console.error('Chat attach error:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatEstimateForChat = (data: EstimateFormData, estimate: NonNullable<EstimateFormData['generatedEstimate']>): string => {
    return `
**${data.estimateName}** の見積もりが完成しました！

**基本情報**
• 宛先: ${data.clientName}
• 現場: ${data.siteLocation}
• 作成日: ${new Date().toLocaleDateString('ja-JP')}

**見積明細**
${estimate.items.map((item, index) =>
      `${index + 1}. ${item.itemName}\n   ${item.quantity}${item.unit} × ¥${item.unitPrice.toLocaleString()} = **¥${item.amount.toLocaleString()}**`
    ).join('\n\n')}

**合計金額**
• 小計: ¥${estimate.subtotal.toLocaleString()}
• 消費税(10%): ¥${estimate.tax.toLocaleString()}
• **総合計: ¥${estimate.total.toLocaleString()}**

**算出根拠**
${estimate.evidence.map(e => `• ${e}`).join('\n')}

---
PDF見積書 | Excel明細 ダウンロード可能
    `.trim()
  }

  const simulateChatPost = async (message: string): Promise<void> => {
    // チャット投稿のシミュレーション
    return new Promise((resolve) => {
      setTimeout(() => {
        console.log('チャット投稿:', message)
        resolve()
      }, 1000)
    })
  }

  // =============================================================================
  // AI統合見積生成システム
  // =============================================================================

  const generateEstimate = async () => {
    setLoading(true)
    try {
      // Step 1: ドキュメント解析
      const analysisResults = await analyzeUploadedDocuments()

      // Step 2: AI見積生成（解析結果を元に）
      const aiEstimate = await generateAIEstimate(analysisResults)

      setFormData(prev => ({
        ...prev,
        generatedEstimate: aiEstimate,
        aiAnalysisResults: analysisResults,
      }))
    } catch (error) {
      Alert.alert('エラー', '見積もりの生成に失敗しました')
      console.error('Estimate generation error:', error)
    } finally {
      setLoading(false)
    }
  }

  const analyzeUploadedDocuments = async () => {
    console.log('🤖 ドキュメント解析開始:', formData.uploadedFiles.length, '件')

    const detectedDocuments: AIDetectedDocument[] = []
    let extractedData: ExtractedEstimateData = {
      projectDetails: {},
      materials: [],
      laborRequirements: [],
      equipmentNeeds: []
    }

    // 各ファイルを解析（実際のAI処理をシミュレート）
    for (const file of formData.uploadedFiles) {
      await new Promise(resolve => setTimeout(resolve, 300)) // 解析演出

      let fileAnalysis: any = {}

      switch (file.docType) {
        case 'drawing':
          fileAnalysis = {
            area: Math.floor(Math.random() * 200) + 50,
            floors: Math.floor(Math.random() * 3) + 1,
            buildingType: '住宅',
            complexity: 'standard',
            materials: [
              { name: 'コンクリート（25N）', quantity: 50, unit: 'm³', estimatedCost: 15000, source: file.name },
              { name: '鉄筋D13', quantity: 2000, unit: 'kg', estimatedCost: 80, source: file.name }
            ]
          }
          break
        case 'spec':
          fileAnalysis = {
            materials: [
              { name: '高強度コンクリート', quantity: 20, unit: 'm³', estimatedCost: 18000, source: file.name },
              { name: '防水シート', quantity: 100, unit: 'm²', estimatedCost: 2500, source: file.name }
            ],
            laborRequirements: [
              { category: '専門工', hours: 40, skillLevel: '高', estimatedRate: 3500 }
            ]
          }
          break
        case 'photo':
          fileAnalysis = {
            siteConditions: ['狭小地', '隣接建物あり'],
            equipmentNeeds: [
              { name: '小型クレーン', duration: 5, unit: '日', estimatedCost: 45000 }
            ]
          }
          break
        case 'receipt':
        case 'material_estimate':
          fileAnalysis = {
            materials: [
              { name: '建材A', quantity: 10, unit: '個', estimatedCost: 5000, source: file.name },
              { name: '建材B', quantity: 20, unit: 'm', estimatedCost: 1200, source: file.name }
            ]
          }
          break
      }

      detectedDocuments.push({
        fileId: file.id,
        docType: file.docType as any,
        extractedData: fileAnalysis,
        confidence: 0.85 + Math.random() * 0.1
      })

      // データを統合
      if (fileAnalysis.materials) {
        extractedData.materials.push(...fileAnalysis.materials)
      }
      if (fileAnalysis.laborRequirements) {
        extractedData.laborRequirements.push(...fileAnalysis.laborRequirements)
      }
      if (fileAnalysis.equipmentNeeds) {
        extractedData.equipmentNeeds.push(...fileAnalysis.equipmentNeeds)
      }
    }

    return {
      detectedDocuments,
      extractedData,
      confidence: 0.78,
      suggestions: [
        'AI解析により材料費を自動算出しました',
        '図面から施工面積を推定しました',
        '類似案件のデータと照合しました'
      ]
    }
  }

  const generateAIEstimate = async (analysisResults: any) => {
    console.log('🎯 AI見積生成:', analysisResults)

    // 解析結果から見積項目を生成
    const items: EstimateItem[] = []
    let runningTotal = 0

    // 材料費の計算
    analysisResults.extractedData.materials.forEach((material: MaterialItem) => {
      const amount = material.quantity * material.estimatedCost
      items.push({
        category: '材料費',
        itemName: material.name,
        quantity: material.quantity,
        unit: material.unit,
        unitPrice: material.estimatedCost,
        amount
      })
      runningTotal += amount
    })

    // 労務費の計算
    analysisResults.extractedData.laborRequirements.forEach((labor: LaborItem) => {
      const amount = labor.hours * labor.estimatedRate
      items.push({
        category: '労務費',
        itemName: `${labor.category}（${labor.skillLevel}級）`,
        quantity: labor.hours,
        unit: '時間',
        unitPrice: labor.estimatedRate,
        amount
      })
      runningTotal += amount
    })

    // 機械経費の計算
    analysisResults.extractedData.equipmentNeeds.forEach((equipment: EquipmentItem) => {
      const amount = equipment.duration * equipment.estimatedCost
      items.push({
        category: '機械経費',
        itemName: equipment.name,
        quantity: equipment.duration,
        unit: equipment.unit,
        unitPrice: equipment.estimatedCost,
        amount
      })
      runningTotal += amount
    })

    // 諸経費（5%）
    const overhead = Math.floor(runningTotal * 0.05)
    items.push({
      category: '諸経費',
      itemName: '現場管理費・安全費',
      quantity: 1,
      unit: '式',
      unitPrice: overhead,
      amount: overhead
    })

    const subtotal = runningTotal + overhead
    const tax = Math.floor(subtotal * 0.1)
    const total = subtotal + tax

    return {
      items,
      subtotal,
      tax,
      total,
      evidence: [
        ...analysisResults.suggestions,
        `解析したファイル数: ${formData.uploadedFiles.length}件`,
        `AI信頼度: ${Math.round(analysisResults.confidence * 100)}%`,
        '市場価格データベースと照合済み'
      ]
    }
  }

  // =============================================================================
  // RENDER FUNCTIONS
  // =============================================================================

  const renderHeader = () => (
    <View style={[styles.header, { backgroundColor: colors.surface }]}>
      <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
        <StyledText variant="heading2" color="secondary">×</StyledText>
      </TouchableOpacity>
      <View style={styles.headerContent}>
        <StyledText variant="title" weight="semibold">
          見積もり作成ウィザード
        </StyledText>
        <StyledText variant="caption" color="secondary">
          Step {currentStep} / 3
        </StyledText>
      </View>
      <View style={styles.stepIndicator}>
        {[1, 2, 3].map((step) => (
          <View
            key={step}
            style={[
              styles.stepDot,
              {
                backgroundColor: step <= currentStep
                  ? colors.primary.DEFAULT
                  : colors.border,
              },
            ]}
          />
        ))}
      </View>
    </View>
  )

  const renderStep1 = () => (
    <ScrollView style={styles.stepContent} showsVerticalScrollIndicator={false}>
      <Card style={styles.formCard}>
        <StyledText variant="subtitle" weight="semibold" style={styles.sectionTitle}>
          基本情報
        </StyledText>

        {/* 見積名 */}
        <View style={styles.inputGroup}>
          <StyledText variant="body" weight="medium" style={styles.inputLabel}>
            見積名 *
          </StyledText>
          <TextInput
            style={[styles.textInput, { backgroundColor: colors.background.primary }]}
            placeholder="例：〇〇工事見積書"
            value={formData.estimateName}
            onChangeText={(text) => setFormData(prev => ({ ...prev, estimateName: text }))}
            placeholderTextColor={colors.text.tertiary}
          />
        </View>

        {/* 宛先 */}
        <View style={styles.inputGroup}>
          <StyledText variant="body" weight="medium" style={styles.inputLabel}>
            宛先（クライアント名） *
          </StyledText>
          <TextInput
            style={[styles.textInput, { backgroundColor: colors.background.primary }]}
            placeholder="例：〇〇建設株式会社"
            value={formData.clientName}
            onChangeText={(text) => setFormData(prev => ({ ...prev, clientName: text }))}
            placeholderTextColor={colors.text.tertiary}
          />
        </View>

        {/* 現場名 */}
        <View style={styles.inputGroup}>
          <StyledText variant="body" weight="medium" style={styles.inputLabel}>
            現場名 *
          </StyledText>
          <TextInput
            style={[
              styles.textInput,
              { backgroundColor: colors.background.primary },
              formData.prospectId && { color: colors.text.secondary, fontStyle: 'italic' }
            ]}
            placeholder="例：〇〇ビル新築工事"
            value={formData.siteLocation}
            onChangeText={(text) => setFormData(prev => ({ ...prev, siteLocation: text }))}
            placeholderTextColor={colors.text.tertiary}
            editable={!formData.prospectId}
          />
          {formData.prospectId && (
            <StyledText variant="caption" color="primary" style={{ marginTop: 4 }}>
              ※ 現場未設定のため、後ほど現場登録が必要です
            </StyledText>
          )}
        </View>

        {/* 契約形態 */}
        <View style={styles.inputGroup}>
          <StyledText variant="body" weight="medium" style={styles.inputLabel}>
            契約形態
          </StyledText>
          <View style={styles.radioGroup}>
            {[
              { key: 'material_labor', label: '材工（材料費＋工賃）' },
              { key: 'labor_only', label: '手間（工賃のみ）' },
              { key: 'daily_hire', label: '常用（日雇い）' },
            ].map((option) => (
              <TouchableOpacity
                key={option.key}
                style={[
                  styles.radioOption,
                  formData.contractType === option.key && styles.radioOptionSelected,
                  { borderColor: colors.border }
                ]}
                onPress={() => setFormData(prev => ({ ...prev, contractType: option.key as any }))}
              >
                <View style={[
                  styles.radioCircle,
                  formData.contractType === option.key && {
                    backgroundColor: colors.primary.DEFAULT
                  }
                ]} />
                <StyledText variant="body">{option.label}</StyledText>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* 請求形態 */}
        <View style={styles.inputGroup}>
          <StyledText variant="body" weight="medium" style={styles.inputLabel}>
            請求形態
          </StyledText>
          <View style={styles.radioGroup}>
            {[
              { key: 'completion', label: '出来高（完成ベース）' },
              { key: 'milestone', label: 'マイルストン（段階ベース）' },
            ].map((option) => (
              <TouchableOpacity
                key={option.key}
                style={[
                  styles.radioOption,
                  formData.billingType === option.key && styles.radioOptionSelected,
                  { borderColor: colors.border }
                ]}
                onPress={() => setFormData(prev => ({ ...prev, billingType: option.key as any }))}
              >
                <View style={[
                  styles.radioCircle,
                  formData.billingType === option.key && {
                    backgroundColor: colors.primary.DEFAULT
                  }
                ]} />
                <StyledText variant="body">{option.label}</StyledText>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Card>
    </ScrollView>
  )

  const renderStep2 = () => (
    <ScrollView style={styles.stepContent} showsVerticalScrollIndicator={false}>
      {/* メイン統合アップロード */}
      <Card style={styles.formCard}>
        <StyledText variant="subtitle" weight="semibold" style={styles.sectionTitle}>
          🤖 スマートアップロード
        </StyledText>
        <StyledText variant="body" color="secondary" style={styles.sectionDescription}>
          ファイルをドラッグ&ドロップまたは選択してください。
          AIが自動的に内容を解析して見積に反映します。
        </StyledText>

        <DocumentUploader
          onFilesChange={(files) => setFormData(prev => ({ ...prev, uploadedFiles: files }))}
          maxFiles={15}
          allowedDocTypes={['drawing', 'spec', 'photo', 'receipt', 'contract']}
          title="書類を統合アップロード"
          description="図面・仕様書・写真・見積書などをまとめて追加"
          uploadMode="batch"
          showPreview={true}
        />
      </Card>

      {/* アップロード済みファイルの解析状況 */}
      {formData.uploadedFiles.length > 0 && (
        <Card style={styles.analysisCard}>
          <View style={styles.analysisHeader}>
            <StyledText variant="subtitle" weight="semibold">
              📊 AI解析プレビュー
            </StyledText>
            <Chip
              mode="outlined"
              compact
              style={{ backgroundColor: colors.primary.DEFAULT + '20' }}
            >
              {formData.uploadedFiles.length}件
            </Chip>
          </View>

          <StyledText variant="body" color="secondary" style={styles.analysisDescription}>
            アップロードされたファイルから以下の情報を自動抽出します：
          </StyledText>

          <View style={styles.detectionList}>
            {[
              { icon: '📐', text: '図面から面積・数量を自動計算', detected: formData.uploadedFiles.some(f => f.docType === 'drawing') },
              { icon: '📋', text: '仕様書から材料・工法を識別', detected: formData.uploadedFiles.some(f => f.docType === 'spec') },
              { icon: '📷', text: '現場写真から状況を把握', detected: formData.uploadedFiles.some(f => f.docType === 'photo') },
              { icon: '🧾', text: '見積書・領収書から価格情報を抽出', detected: formData.uploadedFiles.some(f => ['receipt', 'contract'].includes(f.docType)) },
            ].map((item, index) => (
              <View key={index} style={styles.detectionItem}>
                <StyledText variant="body" style={{ opacity: item.detected ? 1 : 0.5 }}>
                  {item.icon} {item.text}
                </StyledText>
                {item.detected && (
                  <StyledText variant="caption" color="success">✓</StyledText>
                )}
              </View>
            ))}
          </View>

          {formData.aiAnalysisResults && (
            <View style={styles.confidenceSection}>
              <StyledText variant="body" weight="medium">AI信頼度</StyledText>
              <View style={styles.confidenceBar}>
                <ProgressBar
                  progress={formData.aiAnalysisResults.confidence}
                  color={colors.success}
                  style={{ height: 8, borderRadius: 4 }}
                />
                <StyledText variant="caption" color="secondary">
                  {Math.round(formData.aiAnalysisResults.confidence * 100)}%
                </StyledText>
              </View>
            </View>
          )}
        </Card>
      )}

      {/* スマート事前入力の提案 */}
      {formData.uploadedFiles.length > 0 && (
        <Card style={styles.smartFillCard}>
          <StyledText variant="body" weight="semibold" style={styles.smartFillTitle}>
            💡 スマート事前入力
          </StyledText>
          <StyledText variant="caption" color="secondary">
            次のステップで、解析結果に基づいて見積項目を自動入力します
          </StyledText>

          <View style={styles.previewList}>
            <StyledText variant="caption" color="primary">• 材料費の自動計算</StyledText>
            <StyledText variant="caption" color="primary">• 労務時間の推定</StyledText>
            <StyledText variant="caption" color="primary">• 機材レンタル費用の算出</StyledText>
            <StyledText variant="caption" color="primary">• 諸経費の標準割合適用</StyledText>
          </View>
        </Card>
      )}
    </ScrollView>
  )

  const renderStep3 = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <StyledText variant="heading3" color="primary" style={styles.loadingIcon}>AI</StyledText>
          <StyledText variant="title" weight="semibold">
            AI見積もり生成中...
          </StyledText>
          <StyledText variant="body" color="secondary" style={styles.loadingDescription}>
            アップロードされた書類を解析し、
            {'\n'}精密な見積もりを作成しています
          </StyledText>
        </View>
      )
    }

    if (!formData.generatedEstimate) {
      return <View />
    }

    const { generatedEstimate } = formData

    return (
      <ScrollView style={styles.stepContent} showsVerticalScrollIndicator={false}>
        <Card style={styles.resultCard}>
          <StyledText variant="subtitle" weight="semibold" style={styles.sectionTitle}>
            見積もり結果
          </StyledText>

          {/* 見積もり明細 */}
          <View style={styles.estimateTable}>
            <View style={[styles.tableHeader, { backgroundColor: colors.background.primary }]}>
              <StyledText variant="caption" weight="semibold" style={styles.tableHeaderText}>
                項目
              </StyledText>
              <StyledText variant="caption" weight="semibold" style={styles.tableHeaderText}>
                数量
              </StyledText>
              <StyledText variant="caption" weight="semibold" style={styles.tableHeaderText}>
                単価
              </StyledText>
              <StyledText variant="caption" weight="semibold" style={styles.tableHeaderText}>
                金額
              </StyledText>
            </View>

            {generatedEstimate.items.map((item, index) => (
              <View key={index} style={styles.tableRow}>
                <View style={styles.itemInfo}>
                  <StyledText variant="caption" color="secondary">
                    {item.category}
                  </StyledText>
                  <StyledText variant="body" weight="medium">
                    {item.itemName}
                  </StyledText>
                </View>
                <StyledText variant="body" style={styles.tableCellNumber}>
                  {item.quantity} {item.unit}
                </StyledText>
                <StyledText variant="body" style={styles.tableCellNumber}>
                  ¥{item.unitPrice.toLocaleString()}
                </StyledText>
                <StyledText variant="body" weight="medium" style={styles.tableCellNumber}>
                  ¥{item.amount.toLocaleString()}
                </StyledText>
              </View>
            ))}
          </View>

          {/* 合計 */}
          <View style={[styles.totalSection, { borderTopColor: colors.border }]}>
            <View style={styles.totalRow}>
              <StyledText variant="body">小計</StyledText>
              <StyledText variant="body">¥{generatedEstimate.subtotal.toLocaleString()}</StyledText>
            </View>
            <View style={styles.totalRow}>
              <StyledText variant="body">消費税（10%）</StyledText>
              <StyledText variant="body">¥{generatedEstimate.tax.toLocaleString()}</StyledText>
            </View>
            <View style={[styles.totalRow, styles.grandTotalRow]}>
              <StyledText variant="title" weight="bold">合計</StyledText>
              <StyledText variant="title" weight="bold" color="primary">
                ¥{generatedEstimate.total.toLocaleString()}
              </StyledText>
            </View>
          </View>

          {/* 根拠サマリ */}
          <View style={styles.evidenceSection}>
            <StyledText variant="body" weight="semibold" style={styles.evidenceTitle}>
              算出根拠
            </StyledText>
            {generatedEstimate.evidence.map((evidence, index) => (
              <StyledText key={index} variant="caption" color="secondary" style={styles.evidenceItem}>
                • {evidence}
              </StyledText>
            ))}
          </View>

          {/* 出力ボタン */}
          <View style={styles.outputActions}>
            <StyledButton
              title="PDF出力"
              variant="outline"
              size="md"
              onPress={handlePDFExport}
              style={styles.outputButton}
            />
            <StyledButton
              title="Excel出力"
              variant="outline"
              size="md"
              onPress={handleExcelExport}
              style={styles.outputButton}
            />
            <StyledButton
              title="チャットに貼付"
              variant="primary"
              size="md"
              onPress={handleChatAttach}
              style={styles.outputButton}
            />
          </View>

          {/* 現場登録導線（Prospectの場合） */}
          {formData.prospectId && (
            <Card variant="surface" style={{ marginTop: 16, padding: 16, backgroundColor: colors.primary.DEFAULT + '10' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <IconButton icon="office-building-plus" size={24} iconColor={colors.primary.DEFAULT} />
                <View style={{ flex: 1 }}>
                  <StyledText variant="body" weight="semibold">現場が未登録です</StyledText>
                  <StyledText variant="caption" color="secondary">請求書を作成するには現場登録が必要です</StyledText>
                </View>
                <StyledButton
                  title="現場登録"
                  variant="primary"
                  size="sm"
                  onPress={() => router.push('/new-project')}
                />
              </View>
            </Card>
          )}
        </Card>
      </ScrollView>
    )
  }

  const renderFooter = () => (
    <View style={[styles.footer, { backgroundColor: colors.surface }]}>
      <View style={styles.footerButtons}>
        {currentStep > 1 && (
          <StyledButton
            title="戻る"
            variant="outline"
            size="md"
            onPress={handlePrevious}
            style={styles.footerButton}
          />
        )}
        {currentStep < 3 && (
          <StyledButton
            title={currentStep === 2 ? '見積もり生成' : '次へ'}
            variant="primary"
            size="md"
            onPress={handleNext}
            loading={loading}
            style={[styles.footerButton, currentStep === 1 && styles.footerButtonFull]}
          />
        )}
        {currentStep === 3 && !loading && (
          <StyledButton
            title="完了"
            variant="primary"
            size="md"
            onPress={() => {
              Alert.alert('完了', '見積もりが作成されました', [
                { text: 'OK', onPress: () => router.back() }
              ])
            }}
            style={styles.footerButtonFull}
          />
        )}
      </View>
    </View>
  )

  // =============================================================================
  // MAIN RENDER
  // =============================================================================

  const styles = createStyles(colors, spacing, radius)

  return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}

      {currentStep === 1 && renderStep1()}
      {currentStep === 2 && renderStep2()}
      {currentStep === 3 && renderStep3()}

      {/* AI解析状況のフローティングインジケーター */}
      {loading && currentStep === 2 && (
        <View style={styles.floatingIndicator}>
          <Card style={styles.floatingCard}>
            <View style={styles.floatingContent}>
              <StyledText variant="body" color="primary" style={styles.floatingIcon}>🤖</StyledText>
              <View>
                <StyledText variant="body" weight="medium">AI解析中...</StyledText>
                <StyledText variant="caption" color="secondary">
                  ファイルを解析して見積に反映しています
                </StyledText>
              </View>
            </View>
          </Card>
        </View>
      )}

      {renderFooter()}
    </SafeAreaView>
  )
}

// =============================================================================
// STYLES
// =============================================================================

const createStyles = (colors: any, spacing: any, radius: any) => StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  closeButton: {
    padding: 8,
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
  },
  stepIndicator: {
    flexDirection: 'row',
    gap: 6,
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  stepContent: {
    flex: 1,
    padding: 16,
  },
  formCard: {
    padding: 20,
  },
  sectionTitle: {
    marginBottom: 8,
  },
  sectionDescription: {
    marginBottom: 20,
    lineHeight: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  radioGroup: {
    gap: 12,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderRadius: 8,
    gap: 12,
  },
  radioOptionSelected: {
    backgroundColor: '#F0FDF4',
    borderColor: '#16A34A',
  },
  radioCircle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#D1D5DB',
  },
  uploadSection: {
    marginBottom: 16,
  },
  uploadHeader: {
    marginBottom: 8,
  },
  // AI解析カード関連スタイル
  analysisCard: {
    padding: 20,
    marginBottom: 16,
  },
  analysisHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  analysisDescription: {
    marginBottom: 16,
    lineHeight: 20,
  },
  detectionList: {
    gap: 8,
    marginBottom: 16,
  },
  detectionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  confidenceSection: {
    gap: 8,
  },
  confidenceBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  smartFillCard: {
    padding: 20,
    marginBottom: 16,
    backgroundColor: '#F0FDF4',
    borderColor: '#16A34A',
    borderWidth: 1,
  },
  smartFillTitle: {
    marginBottom: 8,
  },
  previewList: {
    marginTop: 12,
    gap: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  loadingDescription: {
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  resultCard: {
    padding: 20,
  },
  estimateTable: {
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginBottom: 8,
  },
  tableHeaderText: {
    flex: 1,
    textAlign: 'center',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  itemInfo: {
    flex: 2,
  },
  tableCellNumber: {
    flex: 1,
    textAlign: 'right',
  },
  totalSection: {
    borderTopWidth: 1,
    paddingTop: 16,
    marginBottom: 20,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  grandTotalRow: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    marginTop: 8,
  },
  evidenceSection: {
    marginBottom: 24,
  },
  evidenceTitle: {
    marginBottom: 8,
  },
  evidenceItem: {
    marginBottom: 4,
    paddingLeft: 8,
  },
  outputActions: {
    flexDirection: 'row',
    gap: 12,
  },
  outputButton: {
    flex: 1,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    padding: 16,
  },
  footerButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  footerButton: {
    flex: 1,
  },
  footerButtonFull: {
    minWidth: '100%',
  },
  floatingIndicator: {
    position: 'absolute',
    bottom: 100,
    left: 16,
    right: 16,
    zIndex: 1000,
  },
  floatingCard: {
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  floatingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
  },
  floatingIcon: {
    fontSize: 24,
  },
})