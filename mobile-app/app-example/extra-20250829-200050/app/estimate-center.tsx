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
import { useAuth, useRole } from '@/contexts/AuthContext'
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '@/constants/Colors'
import { StyledText, StyledButton, Icon } from '@/components/ui'
import * as Haptics from 'expo-haptics'

type EstimateMode = 'selection' | 'ai_template' | 'inline_editing'

interface EstimateType {
  id: string
  title: string
  description: string
  icon: string
  template: string[]
}

interface EstimateItem {
  id: string
  category: string
  description: string
  quantity: string
  unit: string
  unitPrice: string
  amount: string
}

export default function EstimateCenterScreen() {
  const { user, profile } = useAuth()
  const userRole = useRole()
  
  const [currentMode, setCurrentMode] = useState<EstimateMode>('selection')
  const [selectedEstimateType, setSelectedEstimateType] = useState<EstimateType | null>(null)
  const [projectName, setProjectName] = useState('')
  const [clientName, setClientName] = useState('')
  const [estimateItems, setEstimateItems] = useState<EstimateItem[]>([])
  const [isGeneratingAI, setIsGeneratingAI] = useState(false)
  
  // 権限チェック：見積センターは親方専用
  const canAccessEstimateCenter = userRole === 'parent'

  // 古い見積タイプを削除し、統一フローに誘導

  if (!canAccessEstimateCenter) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <StyledText variant="title" color="error" align="center">
            アクセス権限がありません
          </StyledText>
          <StyledText variant="body" color="secondary" align="center" style={{ marginTop: Spacing.md }}>
            見積センターは親方のみ利用可能です
          </StyledText>
          <StyledButton
            title="戻る"
            onPress={() => router.back()}
            variant="outline"
            style={{ marginTop: Spacing.lg }}
          />
        </View>
      </SafeAreaView>
    )
  }

  // AI見積テンプレート生成
  const generateAITemplate = async (estimateType: EstimateType) => {
    setIsGeneratingAI(true)
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    
    // AIテンプレート生成のシミュレーション (実際のAI連携は後で実装)
    setTimeout(() => {
      const items: EstimateItem[] = estimateType.template.map((item, index) => {
        const [description, quantity, unit, unitPrice, amount] = item.split(',')
        return {
          id: `item-${index}`,
          category: estimateType.title,
          description,
          quantity,
          unit,
          unitPrice,
          amount
        }
      })
      
      setEstimateItems(items)
      setIsGeneratingAI(false)
      setCurrentMode('inline_editing')
    }, 2000)
  }

  // 見積項目の更新
  const updateEstimateItem = (id: string, field: keyof EstimateItem, value: string) => {
    setEstimateItems(prev => prev.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value }
        
        // 数量または単価が変更された場合、金額を再計算
        if (field === 'quantity' || field === 'unitPrice') {
          const quantity = parseFloat(field === 'quantity' ? value : updated.quantity) || 0
          const unitPrice = parseFloat(field === 'unitPrice' ? value : updated.unitPrice) || 0
          updated.amount = (quantity * unitPrice).toString()
        }
        
        return updated
      }
      return item
    }))
  }

  // 合計金額計算
  const getTotalAmount = (): number => {
    return estimateItems.reduce((total, item) => {
      return total + (parseFloat(item.amount) || 0)
    }, 0)
  }

  // 見積項目追加
  const addEstimateItem = () => {
    const newItem: EstimateItem = {
      id: `item-${Date.now()}`,
      category: selectedEstimateType?.title || '追加項目',
      description: '',
      quantity: '1',
      unit: '式',
      unitPrice: '0',
      amount: '0'
    }
    setEstimateItems(prev => [...prev, newItem])
  }

  // 見積項目削除
  const removeEstimateItem = (id: string) => {
    setEstimateItems(prev => prev.filter(item => item.id !== id))
  }

  // 見積保存・出力
  const saveAndExportEstimate = () => {
    if (!projectName || !clientName) {
      Alert.alert('入力エラー', 'プロジェクト名とクライアント名は必須です')
      return
    }
    
    Alert.alert(
      '見積作成完了',
      `${projectName}の見積書を作成しました\n合計金額: ¥${getTotalAmount().toLocaleString()}`,
      [
        { text: 'PDF出力', onPress: () => console.log('PDF出力') },
        { text: 'プロジェクト作成', onPress: () => router.push('/(tabs)/projects') },
        { text: 'OK', style: 'default' }
      ]
    )
  }

  // 統一見積もりフローへのリダイレクト画面
  const renderRedirectMessage = () => (
    <View style={styles.centerContent}>
      <Icon name="chart" size={48} color="primary" style={{ marginBottom: Spacing.lg }} />
      <StyledText variant="heading2" weight="bold" color="text" align="center">
        見積もり機能が統一されました
      </StyledText>
      <StyledText variant="body" color="secondary" align="center" style={{ marginTop: Spacing.md, lineHeight: 24 }}>
        右下のボタンから{"\n"}新しい統一フローをご利用ください
      </StyledText>
      
      <View style={styles.actionButtons}>
        <StyledButton
          title="新しい見積もりフローを開始"
          variant="primary"
          onPress={() => router.push('/estimate/new')}
          style={{ marginTop: Spacing.xl }}
        />
        <StyledButton
          title="戻る"
          variant="outline"
          onPress={() => router.back()}
          style={{ marginTop: Spacing.md }}
        />
      </View>
    </View>
  )

  // Step 2: AI見積テンプレート生成画面
  const renderAITemplateMode = () => (
    <View style={styles.centerContent}>
      <Icon name="settings" size={48} color="primary" style={{ marginBottom: Spacing.lg }} />
      <StyledText variant="title" weight="bold" color="primary" align="center">
        AI見積テンプレート生成中...
      </StyledText>
      <StyledText variant="body" color="secondary" align="center" style={{ marginTop: Spacing.md }}>
        {selectedEstimateType?.title}の標準的な見積項目を生成しています
      </StyledText>
      
      <View style={styles.loadingIndicator}>
        <View style={styles.loadingDot} />
        <View style={[styles.loadingDot, { animationDelay: '0.2s' }]} />
        <View style={[styles.loadingDot, { animationDelay: '0.4s' }]} />
      </View>
    </View>
  )

  // Step 3: インライン編集画面
  const renderInlineEditingMode = () => (
    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <StyledText variant="title" weight="bold" color="text">
          {selectedEstimateType?.title} 見積編集
        </StyledText>
        <StyledText variant="body" color="secondary" style={{ marginTop: Spacing.xs }}>
          項目を編集して見積を調整してください
        </StyledText>
      </View>

      {/* プロジェクト情報入力 */}
      <View style={styles.projectInfoSection}>
        <StyledText variant="subtitle" weight="semibold" color="text" style={{ marginBottom: Spacing.md }}>
          プロジェクト情報
        </StyledText>
        
        <View style={styles.inputGroup}>
          <StyledText variant="label" color="secondary" style={{ marginBottom: Spacing.xs }}>
            プロジェクト名 *
          </StyledText>
          <TextInput
            style={styles.textInput}
            value={projectName}
            onChangeText={setProjectName}
            placeholder="例：田中様邸リフォーム工事"
            placeholderTextColor={Colors.text.tertiary}
          />
        </View>

        <View style={styles.inputGroup}>
          <StyledText variant="label" color="secondary" style={{ marginBottom: Spacing.xs }}>
            クライアント名 *
          </StyledText>
          <TextInput
            style={styles.textInput}
            value={clientName}
            onChangeText={setClientName}
            placeholder="例：田中建設株式会社"
            placeholderTextColor={Colors.text.tertiary}
          />
        </View>
      </View>

      {/* 見積項目一覧 */}
      <View style={styles.estimateItemsSection}>
        <View style={styles.sectionHeader}>
          <StyledText variant="subtitle" weight="semibold" color="text">
            見積項目
          </StyledText>
          <TouchableOpacity
            style={styles.addButton}
            onPress={addEstimateItem}
            activeOpacity={0.7}
          >
            <Icon name="plus" size={16} color="primary" />
            <StyledText variant="body" color="primary" weight="semibold">
              項目追加
            </StyledText>
          </TouchableOpacity>
        </View>

        {estimateItems.map((item, index) => (
          <View key={item.id} style={styles.estimateItem}>
            <View style={styles.itemHeader}>
              <StyledText variant="caption" color="tertiary">
                項目 {index + 1}
              </StyledText>
              <TouchableOpacity
                onPress={() => removeEstimateItem(item.id)}
                style={styles.removeButton}
                activeOpacity={0.7}
              >
                <StyledText variant="caption" color="error">
                  削除
                </StyledText>
              </TouchableOpacity>
            </View>

            <View style={styles.itemInputs}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <StyledText variant="caption" color="secondary">
                  工事内容
                </StyledText>
                <TextInput
                  style={styles.itemInput}
                  value={item.description}
                  onChangeText={(value) => updateEstimateItem(item.id, 'description', value)}
                  placeholder="工事内容"
                />
              </View>

              <View style={styles.itemRow}>
                <View style={[styles.inputGroup, { flex: 1, marginRight: Spacing.sm }]}>
                  <StyledText variant="caption" color="secondary">
                    数量
                  </StyledText>
                  <TextInput
                    style={styles.itemInput}
                    value={item.quantity}
                    onChangeText={(value) => updateEstimateItem(item.id, 'quantity', value)}
                    placeholder="数量"
                    keyboardType="numeric"
                  />
                </View>

                <View style={[styles.inputGroup, { flex: 0.8, marginRight: Spacing.sm }]}>
                  <StyledText variant="caption" color="secondary">
                    単位
                  </StyledText>
                  <TextInput
                    style={styles.itemInput}
                    value={item.unit}
                    onChangeText={(value) => updateEstimateItem(item.id, 'unit', value)}
                    placeholder="単位"
                  />
                </View>

                <View style={[styles.inputGroup, { flex: 1.2 }]}>
                  <StyledText variant="caption" color="secondary">
                    単価
                  </StyledText>
                  <TextInput
                    style={styles.itemInput}
                    value={item.unitPrice}
                    onChangeText={(value) => updateEstimateItem(item.id, 'unitPrice', value)}
                    placeholder="単価"
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <View style={styles.amountRow}>
                <StyledText variant="body" color="secondary">
                  金額: 
                </StyledText>
                <StyledText variant="body" weight="semibold" color="primary">
                  ¥{parseInt(item.amount || '0').toLocaleString()}
                </StyledText>
              </View>
            </View>
          </View>
        ))}

        {/* 合計金額 */}
        <View style={styles.totalSection}>
          <StyledText variant="title" weight="bold" color="text">
            合計金額: ¥{getTotalAmount().toLocaleString()}
          </StyledText>
        </View>
      </View>

      {/* アクションボタン */}
      <View style={styles.actionButtons}>
        <StyledButton
          title="戻る"
          variant="outline"
          onPress={() => {
            setCurrentMode('selection')
            setEstimateItems([])
            setSelectedEstimateType(null)
            setProjectName('')
            setClientName('')
          }}
          style={{ flex: 1, marginRight: Spacing.sm }}
        />
        <StyledButton
          title="見積作成完了"
          variant="primary"
          onPress={saveAndExportEstimate}
          style={{ flex: 2 }}
        />
      </View>
    </ScrollView>
  )

  return (
    <SafeAreaView style={styles.container}>
      {renderRedirectMessage()}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.base.background,
  },
  content: {
    flex: 1,
    padding: Spacing.lg,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  header: {
    marginBottom: Spacing.xl,
  },
  estimateTypeGrid: {
    gap: Spacing.md,
  },
  estimateTypeCard: {
    backgroundColor: Colors.base.surface,
    padding: Spacing.xl,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    marginBottom: Spacing.md,
    ...Shadows.sm,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  loadingIndicator: {
    flexDirection: 'row',
    marginTop: Spacing.xl,
    gap: Spacing.sm,
  },
  loadingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary.DEFAULT,
    opacity: 0.3,
  },
  projectInfoSection: {
    backgroundColor: Colors.base.surface,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.lg,
    ...Shadows.sm,
  },
  inputGroup: {
    marginBottom: Spacing.md,
  },
  textInput: {
    borderWidth: 1,
    borderColor: Colors.border.light,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: Typography?.sizes?.base ?? 16,
    color: Colors.text.primary,
    backgroundColor: Colors.base.surfaceSubtle,
  },
  estimateItemsSection: {
    marginBottom: Spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  addButton: {
    backgroundColor: '#F0FDF4',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.primary[200],
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  estimateItem: {
    backgroundColor: Colors.base.surface,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
    ...Shadows.sm,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  removeButton: {
    backgroundColor: Colors.semantic.errorBg,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  itemInputs: {
    gap: Spacing.md,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  itemInput: {
    borderWidth: 1,
    borderColor: Colors.border.light,
    borderRadius: BorderRadius.sm,
    padding: Spacing.sm,
    fontSize: Typography?.sizes?.sm ?? 14,
    color: Colors.text.primary,
    backgroundColor: Colors.base.background,
    marginTop: Spacing.xs,
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
  },
  totalSection: {
    backgroundColor: '#F0FDF4',
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    marginTop: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.primary[200],
  },
  actionButtons: {
    flexDirection: 'row',
    marginBottom: Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
})