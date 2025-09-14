import React, { useState, useEffect } from 'react'
import {
  View,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  FlatList,
} from 'react-native'
import { router } from 'expo-router'
import { useAuth, useRole } from '@/contexts/AuthContext'
import { Colors, Spacing, Typography, BorderRadius, Shadows } from '@/constants/Colors'
import { StyledText, StyledButton, Card } from '@/components/ui'
import * as Haptics from 'expo-haptics'

interface SupportWorkRecord {
  id: string
  date: string
  workerName: string
  workerRole: string
  billingCompany: string
  startTime?: string
  endTime?: string
  totalHours: number
  unitPrice: number
  totalAmount: number
  memo?: string
  createdAt: string
}

interface Worker {
  id: string
  name: string
  role: string
  dailyRate: number
  overtimeRate: number
  supportUnitPrice: number
}

interface Company {
  id: string
  name: string
  contactPerson?: string
  address?: string
}

interface SupportUnitPrice {
  id: string
  companyId: string
  workerId: string
  unitPrice: number
  effectiveDate: string
}

export default function SupportWorkScreen() {
  const { user, profile } = useAuth()
  const userRole = useRole()
  
  const [records, setRecords] = useState<SupportWorkRecord[]>([
    {
      id: '1',
      date: '2024-12-15',
      workerName: '田中太郎',
      workerRole: '職人',
      billingCompany: '株式会社A建設',
      startTime: '08:00',
      endTime: '17:00',
      totalHours: 8,
      unitPrice: 18000,
      totalAmount: 144000,
      memo: '外壁工事応援',
      createdAt: '2024-12-15T17:30:00Z'
    }
  ])
  
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showMasterModal, setShowMasterModal] = useState(false)
  
  // 新規記録用の状態
  const [newRecord, setNewRecord] = useState({
    date: new Date().toISOString().split('T')[0],
    workerId: '',
    billingCompanyId: '',
    startTime: '',
    endTime: '',
    totalHours: 0,
    unitPrice: 0,
    memo: ''
  })
  
  // マスターデータ
  const [workers, setWorkers] = useState<Worker[]>([
    {
      id: '1',
      name: '田中太郎',
      role: '職人',
      dailyRate: 16000,
      overtimeRate: 2500,
      supportUnitPrice: 18000
    },
    {
      id: '2',
      name: '佐藤花子',
      role: '職人',
      dailyRate: 15000,
      overtimeRate: 2300,
      supportUnitPrice: 17000
    }
  ])
  
  const [companies, setCompanies] = useState<Company[]>([
    {
      id: '1',
      name: '株式会社A建設',
      contactPerson: '山田部長',
      address: '東京都新宿区...'
    },
    {
      id: '2',
      name: '株式会社B工務店',
      contactPerson: '鈴木課長',
      address: '東京都渋谷区...'
    }
  ])

  // 権限チェック：常用記録は親方のみ
  const canManageSupportWork = userRole === 'parent'

  const calculateTotalAmount = () => {
    const hours = newRecord.totalHours || 0
    const price = newRecord.unitPrice || 0
    return hours * price
  }

  const handleTimeChange = (field: 'startTime' | 'endTime', value: string) => {
    setNewRecord(prev => {
      const updated = { ...prev, [field]: value }
      
      // 開始時間と終了時間から総時間を自動計算
      if (updated.startTime && updated.endTime) {
        const start = new Date(`2024-01-01T${updated.startTime}:00`)
        const end = new Date(`2024-01-01T${updated.endTime}:00`)
        const diffMs = end.getTime() - start.getTime()
        const diffHours = Math.max(0, diffMs / (1000 * 60 * 60))
        updated.totalHours = Math.round(diffHours * 10) / 10 // 小数点1桁
      }
      
      return updated
    })
  }

  const handleWorkerSelect = (workerId: string) => {
    const worker = workers.find(w => w.id === workerId)
    if (worker) {
      setNewRecord(prev => ({
        ...prev,
        workerId,
        unitPrice: worker.supportUnitPrice
      }))
    }
  }

  const handleCreateRecord = async () => {
    if (!newRecord.workerId || !newRecord.billingCompanyId) {
      Alert.alert('入力エラー', '職人と請求先会社は必須です')
      return
    }
    
    if (newRecord.totalHours <= 0) {
      Alert.alert('入力エラー', '作業時間を入力してください')
      return
    }

    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      
      const worker = workers.find(w => w.id === newRecord.workerId)
      const company = companies.find(c => c.id === newRecord.billingCompanyId)
      
      const record: SupportWorkRecord = {
        id: Date.now().toString(),
        date: newRecord.date,
        workerName: worker?.name || '',
        workerRole: worker?.role || '',
        billingCompany: company?.name || '',
        startTime: newRecord.startTime,
        endTime: newRecord.endTime,
        totalHours: newRecord.totalHours,
        unitPrice: newRecord.unitPrice,
        totalAmount: calculateTotalAmount(),
        memo: newRecord.memo,
        createdAt: new Date().toISOString()
      }
      
      setRecords(prev => [record, ...prev])
      setShowCreateModal(false)
      
      // フォームリセット
      setNewRecord({
        date: new Date().toISOString().split('T')[0],
        workerId: '',
        billingCompanyId: '',
        startTime: '',
        endTime: '',
        totalHours: 0,
        unitPrice: 0,
        memo: ''
      })
      
      Alert.alert('記録完了', '常用作業記録を保存しました')
    } catch (error) {
      console.error('記録作成エラー:', error)
      Alert.alert('エラー', '記録の保存に失敗しました')
    }
  }

  const handleGenerateBilling = () => {
    Alert.alert(
      '請求書生成',
      '請求書を生成する期間と会社を選択してください',
      [
        { text: 'キャンセル', style: 'cancel' },
        { text: '今月分', onPress: () => generateMonthlyBilling() },
        { text: 'カスタム期間', onPress: () => Alert.alert('開発中', 'カスタム期間選択は開発中です') }
      ]
    )
  }

  const generateMonthlyBilling = () => {
    Alert.alert('請求書生成完了', '今月の常用請求書を生成しました')
  }

  const renderRecord = ({ item }: { item: SupportWorkRecord }) => (
    <Card variant="elevated" style={styles.recordCard}>
      <View style={styles.recordHeader}>
        <View style={styles.recordInfo}>
          <StyledText variant="subtitle" weight="semibold" color="text">
            {item.workerName}
          </StyledText>
          <StyledText variant="caption" color="secondary">
            {item.workerRole} • {item.date}
          </StyledText>
        </View>
        <StyledText variant="subtitle" weight="bold" color="success">
          ¥{item.totalAmount.toLocaleString()}
        </StyledText>
      </View>
      
      <View style={styles.recordDetails}>
        <View style={styles.detailRow}>
          <StyledText variant="body" color="text">請求先</StyledText>
          <StyledText variant="body" weight="medium" color="text">
            {item.billingCompany}
          </StyledText>
        </View>
        
        <View style={styles.detailRow}>
          <StyledText variant="body" color="text">作業時間</StyledText>
          <StyledText variant="body" weight="medium" color="text">
            {item.startTime && item.endTime 
              ? `${item.startTime} - ${item.endTime} (${item.totalHours}h)`
              : `${item.totalHours}時間`
            }
          </StyledText>
        </View>
        
        <View style={styles.detailRow}>
          <StyledText variant="body" color="text">単価</StyledText>
          <StyledText variant="body" weight="medium" color="text">
            ¥{item.unitPrice.toLocaleString()}/時間
          </StyledText>
        </View>
        
        {item.memo && (
          <View style={styles.memoSection}>
            <StyledText variant="caption" color="secondary">
              メモ: {item.memo}
            </StyledText>
          </View>
        )}
      </View>
    </Card>
  )

  const renderCreateModal = () => (
    <Modal
      visible={showCreateModal}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setShowCreateModal(false)}
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <StyledText variant="title" weight="semibold" color="text">
            常用作業記録
          </StyledText>
          <TouchableOpacity
            style={styles.modalCloseButton}
            onPress={() => setShowCreateModal(false)}
          >
            <StyledText variant="title" color="secondary">×</StyledText>
          </TouchableOpacity>
        </View>
        
        <ScrollView style={styles.modalContent}>
          <Card variant="elevated" style={styles.formCard}>
            {/* 日付 */}
            <View style={styles.inputGroup}>
              <StyledText variant="body" weight="medium" color="text">
                作業日 *
              </StyledText>
              <TextInput
                style={styles.textInput}
                value={newRecord.date}
                onChangeText={(text) => setNewRecord(prev => ({...prev, date: text}))}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={Colors.textTertiary}
              />
            </View>

            {/* 職人選択 */}
            <View style={styles.inputGroup}>
              <StyledText variant="body" weight="medium" color="text">
                職人 *
              </StyledText>
              <View style={styles.workerSelection}>
                {workers.map((worker) => (
                  <TouchableOpacity
                    key={worker.id}
                    style={[
                      styles.workerOption,
                      newRecord.workerId === worker.id && styles.workerOptionSelected
                    ]}
                    onPress={() => handleWorkerSelect(worker.id)}
                  >
                    <StyledText 
                      variant="body" 
                      weight="medium"
                      color={newRecord.workerId === worker.id ? "onPrimary" : "text"}
                    >
                      {worker.name}
                    </StyledText>
                    <StyledText 
                      variant="caption" 
                      color={newRecord.workerId === worker.id ? "onPrimary" : "secondary"}
                    >
                      {worker.role} • ¥{worker.supportUnitPrice.toLocaleString()}/h
                    </StyledText>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* 請求先会社 */}
            <View style={styles.inputGroup}>
              <StyledText variant="body" weight="medium" color="text">
                請求先会社 *
              </StyledText>
              <View style={styles.companySelection}>
                {companies.map((company) => (
                  <TouchableOpacity
                    key={company.id}
                    style={[
                      styles.companyOption,
                      newRecord.billingCompanyId === company.id && styles.companyOptionSelected
                    ]}
                    onPress={() => setNewRecord(prev => ({...prev, billingCompanyId: company.id}))}
                  >
                    <StyledText 
                      variant="body" 
                      weight="medium"
                      color={newRecord.billingCompanyId === company.id ? "onPrimary" : "text"}
                    >
                      {company.name}
                    </StyledText>
                    {company.contactPerson && (
                      <StyledText 
                        variant="caption" 
                        color={newRecord.billingCompanyId === company.id ? "onPrimary" : "secondary"}
                      >
                        担当: {company.contactPerson}
                      </StyledText>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* 作業時間 */}
            <View style={styles.inputGroup}>
              <StyledText variant="body" weight="medium" color="text">
                作業時間
              </StyledText>
              <View style={styles.timeInputs}>
                <View style={styles.timeInput}>
                  <StyledText variant="caption" color="secondary">開始</StyledText>
                  <TextInput
                    style={styles.timeField}
                    value={newRecord.startTime}
                    onChangeText={(text) => handleTimeChange('startTime', text)}
                    placeholder="08:00"
                    placeholderTextColor={Colors.textTertiary}
                  />
                </View>
                <StyledText variant="body" color="secondary">〜</StyledText>
                <View style={styles.timeInput}>
                  <StyledText variant="caption" color="secondary">終了</StyledText>
                  <TextInput
                    style={styles.timeField}
                    value={newRecord.endTime}
                    onChangeText={(text) => handleTimeChange('endTime', text)}
                    placeholder="17:00"
                    placeholderTextColor={Colors.textTertiary}
                  />
                </View>
              </View>
              
              <View style={styles.hoursInput}>
                <StyledText variant="caption" color="secondary">
                  または直接時間数を入力
                </StyledText>
                <TextInput
                  style={styles.textInput}
                  value={newRecord.totalHours.toString()}
                  onChangeText={(text) => setNewRecord(prev => ({...prev, totalHours: parseFloat(text) || 0}))}
                  placeholder="8"
                  keyboardType="numeric"
                  placeholderTextColor={Colors.textTertiary}
                />
              </View>
            </View>

            {/* 単価・合計 */}
            <View style={styles.inputGroup}>
              <StyledText variant="body" weight="medium" color="text">
                単価・合計
              </StyledText>
              <View style={styles.priceRow}>
                <View style={styles.priceInput}>
                  <StyledText variant="caption" color="secondary">時間単価</StyledText>
                  <TextInput
                    style={styles.textInput}
                    value={newRecord.unitPrice.toString()}
                    onChangeText={(text) => setNewRecord(prev => ({...prev, unitPrice: parseInt(text) || 0}))}
                    placeholder="18000"
                    keyboardType="numeric"
                    placeholderTextColor={Colors.textTertiary}
                  />
                </View>
                <View style={styles.totalAmount}>
                  <StyledText variant="caption" color="secondary">合計金額</StyledText>
                  <StyledText variant="subtitle" weight="bold" color="success">
                    ¥{calculateTotalAmount().toLocaleString()}
                  </StyledText>
                </View>
              </View>
            </View>

            {/* メモ */}
            <View style={styles.inputGroup}>
              <StyledText variant="body" weight="medium" color="text">
                メモ
              </StyledText>
              <TextInput
                style={[styles.textInput, styles.memoInput]}
                value={newRecord.memo}
                onChangeText={(text) => setNewRecord(prev => ({...prev, memo: text}))}
                placeholder="作業内容や特記事項"
                placeholderTextColor={Colors.textTertiary}
                multiline
              />
            </View>
          </Card>
        </ScrollView>
        
        <View style={styles.modalActions}>
          <StyledButton
            title="保存"
            variant="primary"
            size="lg"
            onPress={handleCreateRecord}
            style={styles.saveButton}
          />
        </View>
      </SafeAreaView>
    </Modal>
  )

  if (!canManageSupportWork) {
    return (
      <SafeAreaView style={styles.container}>
        <Card variant="outlined" style={styles.noAccessCard}>
          <StyledText variant="heading3" align="center" style={styles.noAccessIcon}>
            🔒
          </StyledText>
          <StyledText variant="title" weight="semibold" align="center" color="text">
            常用（応援）管理
          </StyledText>
          <StyledText variant="body" color="secondary" align="center" style={styles.noAccessDescription}>
            この機能は親方のみが利用できます
          </StyledText>
        </Card>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* ヘッダー */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <StyledText variant="title" color="primary">←</StyledText>
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <StyledText variant="title" weight="semibold" color="text">
            常用（応援）管理
          </StyledText>
          <StyledText variant="caption" color="secondary">
            無制限記録・会社別請求
          </StyledText>
        </View>
        <TouchableOpacity 
          style={styles.headerAction}
          onPress={() => setShowMasterModal(true)}
        >
          <StyledText variant="caption" color="primary">⚙️</StyledText>
        </TouchableOpacity>
      </View>

      {/* アクション */}
      <View style={styles.actions}>
        <StyledButton
          title="新規記録"
          variant="primary"
          size="md"
          onPress={() => setShowCreateModal(true)}
          style={styles.actionButton}
        />
        <StyledButton
          title="請求書生成"
          variant="outline"
          size="md"
          onPress={handleGenerateBilling}
          style={styles.actionButton}
        />
      </View>

      {/* 記録一覧 */}
      <FlatList
        data={records}
        renderItem={renderRecord}
        keyExtractor={(item) => item.id}
        style={styles.recordsList}
        contentContainerStyle={styles.recordsContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={() => (
          <Card variant="outlined" style={styles.emptyState}>
            <StyledText variant="heading3" align="center" style={styles.emptyIcon}>
              ⚡
            </StyledText>
            <StyledText variant="title" weight="semibold" align="center" color="text">
              常用作業記録がありません
            </StyledText>
            <StyledText variant="body" color="secondary" align="center" style={styles.emptyDescription}>
              常用・応援作業の記録を開始しましょう
            </StyledText>
          </Card>
        )}
      />

      {/* 作成モーダル */}
      {renderCreateModal()}
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
    backgroundColor: Colors.surfaceElevated,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    ...Shadows.sm,
  },
  backButton: {
    marginRight: Spacing.md,
  },
  headerContent: {
    flex: 1,
  },
  headerAction: {
    padding: Spacing.sm,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.surfaceElevated,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  actionButton: {
    flex: 1,
  },
  recordsList: {
    flex: 1,
  },
  recordsContent: {
    padding: Spacing.md,
    paddingBottom: Spacing['2xl'],
  },
  recordCard: {
    marginBottom: Spacing.md,
  },
  recordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  recordInfo: {
    flex: 1,
  },
  recordDetails: {
    gap: Spacing.xs,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  memoSection: {
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.surfaceElevated,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalCloseButton: {
    padding: Spacing.sm,
  },
  modalContent: {
    flex: 1,
    padding: Spacing.md,
  },
  formCard: {
    marginBottom: Spacing.lg,
  },
  inputGroup: {
    marginBottom: Spacing.lg,
  },
  textInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: Typography.base,
    color: Colors.text,
    backgroundColor: Colors.backgroundSecondary,
    marginTop: Spacing.xs,
  },
  workerSelection: {
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  workerOption: {
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.backgroundSecondary,
  },
  workerOptionSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  companySelection: {
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  companyOption: {
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.backgroundSecondary,
  },
  companyOptionSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  timeInputs: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginTop: Spacing.xs,
  },
  timeInput: {
    flex: 1,
    gap: Spacing.xs,
  },
  timeField: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: Typography.base,
    color: Colors.text,
    backgroundColor: Colors.backgroundSecondary,
    textAlign: 'center',
  },
  hoursInput: {
    marginTop: Spacing.sm,
    gap: Spacing.xs,
  },
  priceRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.xs,
  },
  priceInput: {
    flex: 1,
    gap: Spacing.xs,
  },
  totalAmount: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.md,
    backgroundColor: Colors.successLight,
    borderRadius: BorderRadius.md,
  },
  memoInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  modalActions: {
    padding: Spacing.md,
    backgroundColor: Colors.surfaceElevated,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  saveButton: {
    width: '100%',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing['2xl'],
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: Spacing.lg,
  },
  emptyDescription: {
    marginTop: Spacing.sm,
  },
  noAccessCard: {
    alignItems: 'center',
    paddingVertical: Spacing['2xl'],
    margin: Spacing.md,
  },
  noAccessIcon: {
    fontSize: 48,
    marginBottom: Spacing.lg,
  },
  noAccessDescription: {
    marginTop: Spacing.sm,
  },
})