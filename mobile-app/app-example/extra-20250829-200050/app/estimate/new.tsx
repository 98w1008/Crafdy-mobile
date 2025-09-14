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
import { router } from 'expo-router'
import { useColors, useSpacing, useRadius } from '@/theme/ThemeProvider'
import { StyledText, StyledButton, Card } from '@/components/ui'

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
  
  // Step 2: アップロードファイル
  uploadedFiles: {
    drawings: File[]
    specifications: File[]
    materialEstimates: File[]
    dailyReports: File[]
  }
  reportPeriod?: {
    startDate: string
    endDate: string
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

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function EstimateWizard() {
  const colors = useColors()
  const spacing = useSpacing()
  const radius = useRadius()
  const [currentStep, setCurrentStep] = useState<WizardStep>(1)
  const [formData, setFormData] = useState<EstimateFormData>({
    estimateName: '',
    clientName: '',
    siteLocation: '',
    contractType: 'material_labor',
    billingType: 'completion',
    uploadedFiles: {
      drawings: [],
      specifications: [],
      materialEstimates: [],
      dailyReports: [],
    },
  })
  const [loading, setLoading] = useState(false)

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
    // アップロードファイルは任意だが、少なくとも1つはあることが推奨
    const hasAnyFile = Object.values(formData.uploadedFiles).some(files => files.length > 0)
    if (!hasAnyFile) {
      Alert.alert(
        '確認',
        'アップロードされたファイルがありません。このまま進みますか？',
        [
          { text: 'ファイルを追加', style: 'cancel' },
          { text: '続行', style: 'default' },
        ]
      )
      return false
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
  // AI ESTIMATE GENERATION
  // =============================================================================

  const generateEstimate = async () => {
    setLoading(true)
    try {
      // TODO: 実際のAI見積もり生成API呼び出し
      // OpenAI GPT-4 + 建設業界特化プロンプト + アップロード書類解析
      
      // 仮の見積もりデータ生成（デモ用）
      const mockEstimate = {
        items: [
          {
            category: '材料費',
            itemName: 'コンクリート（25N）',
            quantity: 50,
            unit: 'm³',
            unitPrice: 15000,
            amount: 750000,
          },
          {
            category: '労務費',
            itemName: '主任技術者',
            quantity: 20,
            unit: '日',
            unitPrice: 25000,
            amount: 500000,
          },
          {
            category: '機械経費',
            itemName: 'バックホウレンタル',
            quantity: 10,
            unit: '日',
            unitPrice: 35000,
            amount: 350000,
          },
        ],
        subtotal: 1600000,
        tax: 160000,
        total: 1760000,
        evidence: [
          '図面から算出した材料数量に基づく',
          '標準作業工数表による労務費算定',
          '地域相場を参考にした機械レンタル単価',
        ],
      }

      // 2秒待機（AIっぽい演出）
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      setFormData(prev => ({
        ...prev,
        generatedEstimate: mockEstimate,
      }))
    } catch (error) {
      Alert.alert('エラー', '見積もりの生成に失敗しました')
      console.error('Estimate generation error:', error)
    } finally {
      setLoading(false)
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
            style={[styles.textInput, { backgroundColor: colors.background.primary }]}
            placeholder="例：〇〇ビル新築工事"
            value={formData.siteLocation}
            onChangeText={(text) => setFormData(prev => ({ ...prev, siteLocation: text }))}
            placeholderTextColor={colors.text.tertiary}
          />
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
      <Card style={styles.formCard}>
        <StyledText variant="subtitle" weight="semibold" style={styles.sectionTitle}>
          必要書類アップロード
        </StyledText>
        <StyledText variant="body" color="secondary" style={styles.sectionDescription}>
          見積もり精度向上のため、関連書類をアップロードしてください（任意）
        </StyledText>

        {/* アップロードセクション */}
        {[
          { key: 'drawings', label: '図面', icon: '・', description: 'CAD図面、手書き図面など' },
          { key: 'specifications', label: '仕様書', icon: '・', description: '工事仕様書、設計書など' },
          { key: 'materialEstimates', label: '材料見積PDF', icon: '・', description: '材料業者からの見積書' },
          { key: 'dailyReports', label: '過去日報', icon: '・', description: '類似工事の日報データ' },
        ].map((section) => (
          <View key={section.key} style={styles.uploadSection}>
            <View style={styles.uploadHeader}>
              <StyledText variant="body" weight="medium">
                {section.icon} {section.label}
              </StyledText>
              <StyledText variant="caption" color="secondary">
                {section.description}
              </StyledText>
            </View>
            <TouchableOpacity
              style={[styles.uploadButton, { borderColor: colors.border }]}
              onPress={() => Alert.alert('開発中', 'ファイルアップロード機能は開発中です')}
            >
              <StyledText variant="body" color="secondary">
                ファイルを選択
              </StyledText>
            </TouchableOpacity>
          </View>
        ))}

        {/* 過去日報期間指定 */}
        <View style={styles.inputGroup}>
          <StyledText variant="body" weight="medium" style={styles.inputLabel}>
            過去日報期間指定（参考工事の日報がある場合）
          </StyledText>
          <View style={styles.dateRange}>
            <TextInput
              style={[styles.dateInput, { backgroundColor: colors.background.primary }]}
              placeholder="開始日 (YYYY-MM-DD)"
              placeholderTextColor={colors.text.tertiary}
            />
            <StyledText variant="body" style={styles.dateSeparator}>〜</StyledText>
            <TextInput
              style={[styles.dateInput, { backgroundColor: colors.background.primary }]}
              placeholder="終了日 (YYYY-MM-DD)"
              placeholderTextColor={colors.text.tertiary}
            />
          </View>
        </View>
      </Card>
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
  uploadButton: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 8,
    paddingVertical: 20,
    alignItems: 'center',
  },
  dateRange: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  dateSeparator: {
    marginHorizontal: 4,
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
})