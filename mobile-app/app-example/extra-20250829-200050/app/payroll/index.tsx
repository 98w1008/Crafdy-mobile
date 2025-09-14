import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  ScrollView,
  RefreshControl,
  Alert,
  Linking,
  ViewStyle,
} from 'react-native'
import { router } from 'expo-router'
import { useFocusEffect } from '@react-navigation/native'
import { StyledText, StyledButton } from '@/components/ui'
import Card from '../../components/ui/Card'
import PayrollSettingsModal from '../../components/PayrollSettingsModal'
import { useAuth } from '@/contexts/AuthContext'
import { useColors, useSpacing } from '@/theme/ThemeProvider'
import {
  getPayrollSettings,
  savePayrollSettings,
  calculatePayrollSummaries,
  checkPayrollPermissions,
  exportPayrollData,
  calculatePayrollPeriod,
  generatePeriodOptions,
} from '../../lib/payroll-api'
import {
  PayrollSettings,
  PayrollSettingsFormData,
  PayrollPeriod,
  PayrollSummary,
  PayrollExportOptions,
} from '../../types/payroll'

interface PayrollScreenState {
  settings?: PayrollSettings
  isSettingsLoading: boolean
  showSettingsModal: boolean
  currentPeriod?: PayrollPeriod
  availablePeriods: PayrollPeriod[]
  selectedPeriodIndex: number
  summaries: PayrollSummary[]
  isSummariesLoading: boolean
  permissions: {
    canViewPayroll: boolean
    canExportPayroll: boolean
    canConfigureSettings: boolean
  }
  isRefreshing: boolean
}

export default function PayrollScreen() {
  const { user, userProfile } = useAuth()
  const colors = useColors()
  const spacing = useSpacing()

  // 状態管理
  const [state, setState] = useState<PayrollScreenState>({
    isSettingsLoading: false,
    showSettingsModal: false,
    availablePeriods: [],
    selectedPeriodIndex: 0,
    summaries: [],
    isSummariesLoading: false,
    permissions: {
      canViewPayroll: false,
      canExportPayroll: false,
      canConfigureSettings: false,
    },
    isRefreshing: false,
  })

  // 初期化処理
  const initializeScreen = useCallback(async () => {
    if (!user || !userProfile?.company_id) return

    setState(prev => ({ ...prev, isSettingsLoading: true }))

    try {
      // 権限確認
      const permissionsResult = await checkPayrollPermissions(user.id, userProfile.company_id)
      const permissions = permissionsResult.data || state.permissions

      // 設定取得
      const settingsResult = await getPayrollSettings(userProfile.company_id)
      const settings = settingsResult.data

      // 設定が存在しない場合、権限があれば初期設定モーダルを表示
      if (!settings && permissions.canConfigureSettings) {
        setState(prev => ({
          ...prev,
          permissions,
          isSettingsLoading: false,
          showSettingsModal: true,
        }))
        return
      }

      // 期間選択肢の生成
      let availablePeriods: PayrollPeriod[] = []
      let currentPeriod: PayrollPeriod | undefined

      if (settings) {
        availablePeriods = generatePeriodOptions(settings.payroll_closing_day)
        currentPeriod = availablePeriods[0]
      }

      setState(prev => ({
        ...prev,
        settings,
        permissions,
        availablePeriods,
        currentPeriod,
        isSettingsLoading: false,
      }))

      // サマリーデータの取得
      if (currentPeriod) {
        loadPayrollSummaries(currentPeriod)
      }
    } catch (error) {
      console.error('Failed to initialize payroll screen:', error)
      setState(prev => ({ ...prev, isSettingsLoading: false }))
      Alert.alert('エラー', '画面の初期化に失敗しました')
    }
  }, [user, userProfile])

  // サマリーデータの読み込み
  const loadPayrollSummaries = async (period: PayrollPeriod) => {
    if (!userProfile?.company_id) return

    setState(prev => ({ ...prev, isSummariesLoading: true }))

    try {
      const result = await calculatePayrollSummaries(userProfile.company_id, period)
      if (result.error) {
        throw new Error(result.error.message)
      }

      setState(prev => ({
        ...prev,
        summaries: result.data || [],
        isSummariesLoading: false,
      }))
    } catch (error) {
      console.error('Failed to load payroll summaries:', error)
      setState(prev => ({ ...prev, isSummariesLoading: false }))
      Alert.alert('エラー', 'データの取得に失敗しました')
    }
  }

  // 設定保存
  const handleSaveSettings = async (formData: PayrollSettingsFormData) => {
    if (!user || !userProfile?.company_id) throw new Error('認証情報が不正です')

    const result = await savePayrollSettings(userProfile.company_id, user.id, formData)
    if (result.error) {
      throw new Error(result.error.message)
    }

    // 設定保存後に画面を再初期化
    setState(prev => ({ ...prev, showSettingsModal: false }))
    setTimeout(() => {
      initializeScreen()
    }, 500)
  }

  // エクスポート処理
  const handleExport = async (format: 'pdf' | 'csv' | 'excel') => {
    if (!state.currentPeriod || !user || !userProfile?.company_id) return

    if (!state.permissions.canExportPayroll) {
      Alert.alert('権限エラー', 'データをエクスポートする権限がありません')
      return
    }

    try {
      const options: PayrollExportOptions = {
        format,
        period: state.currentPeriod,
        include_project_breakdown: true,
        include_daily_breakdown: false,
      }

      const result = await exportPayrollData(userProfile.company_id, user.id, options)
      if (result.error) {
        throw new Error(result.error.message)
      }

      // エクスポート成功
      Alert.alert(
        'エクスポート完了',
        `${format.toUpperCase()}ファイルの生成が完了しました。ダウンロードしますか？`,
        [
          { text: 'キャンセル', style: 'cancel' },
          {
            text: 'ダウンロード',
            onPress: () => {
              if (result.data?.downloadUrl) {
                Linking.openURL(result.data.downloadUrl)
              }
            },
          },
        ]
      )
    } catch (error) {
      console.error('Export failed:', error)
      Alert.alert('エラー', `${format.toUpperCase()}のエクスポートに失敗しました`)
    }
  }

  // リフレッシュ処理
  const handleRefresh = async () => {
    setState(prev => ({ ...prev, isRefreshing: true }))
    await initializeScreen()
    setState(prev => ({ ...prev, isRefreshing: false }))
  }

  // 期間変更
  const handlePeriodChange = (index: number) => {
    if (index >= 0 && index < state.availablePeriods.length) {
      const selectedPeriod = state.availablePeriods[index]
      setState(prev => ({
        ...prev,
        selectedPeriodIndex: index,
        currentPeriod: selectedPeriod,
      }))
      loadPayrollSummaries(selectedPeriod)
    }
  }

  // フォーカス時の初期化
  useFocusEffect(
    useCallback(() => {
      initializeScreen()
    }, [initializeScreen])
  )

  // スタイル定義
  const containerStyle: ViewStyle = {
    flex: 1,
    backgroundColor: colors.background.primary,
  }

  const headerStyle: ViewStyle = {
    padding: spacing[6],
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  }

  const contentStyle: ViewStyle = {
    flex: 1,
    padding: spacing[4],
  }

  const sectionStyle: ViewStyle = {
    marginBottom: spacing[6],
  }

  const cardStyle: ViewStyle = {
    marginBottom: spacing[4],
  }

  const summaryRowStyle: ViewStyle = {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing[2],
    borderBottomWidth: 1,
    borderBottomColor: colors.border + '30',
  }

  const exportButtonsStyle: ViewStyle = {
    flexDirection: 'row',
    gap: spacing[2],
    marginTop: spacing[4],
  }

  const noDataStyle: ViewStyle = {
    alignItems: 'center',
    padding: spacing[8],
  }

  // 設定がない場合の表示
  if (!state.settings && !state.showSettingsModal) {
    return (
      <View style={containerStyle}>
        <View style={headerStyle}>
          <StyledText variant="heading2" weight="bold">
            勤怠集計
          </StyledText>
        </View>

        <View style={[contentStyle, { justifyContent: 'center', alignItems: 'center' }]}>
          <Card padding="xl" style={{ alignItems: 'center', maxWidth: 320 }}>
            <StyledText variant="heading3" weight="semibold" align="center">
              初期設定が必要です
            </StyledText>
            <StyledText variant="body" color="secondary" align="center" style={{ marginTop: spacing[3] }}>
              勤怠集計機能を使用するために、まず締め日と支払日を設定してください。
            </StyledText>
            
            {state.permissions.canConfigureSettings ? (
              <StyledButton
                title="設定を開始"
                variant="primary"
                size="lg"
                onPress={() => setState(prev => ({ ...prev, showSettingsModal: true }))}
                style={{ marginTop: spacing[6] }}
              />
            ) : (
              <View style={{ marginTop: spacing[6], alignItems: 'center' }}>
                <StyledText variant="caption" color="warning" align="center">
                  管理者による設定が完了するまでお待ちください
                </StyledText>
              </View>
            )}
          </Card>
        </View>

        <PayrollSettingsModal
          visible={state.showSettingsModal}
          onClose={() => setState(prev => ({ ...prev, showSettingsModal: false }))}
          onSave={handleSaveSettings}
          canEdit={state.permissions.canConfigureSettings}
        />
      </View>
    )
  }

  // 設定がない場合の表示
  if (!state.settings && !state.showSettingsModal && !state.showFirstTimeModal) {
    return (
      <View style={containerStyle}>
        <View style={headerStyle}>
          <StyledText variant="heading2" weight="bold">
            勤怠集計
          </StyledText>
        </View>

        <View style={[contentStyle, { justifyContent: 'center', alignItems: 'center' }]}>
          <Card padding="xl" style={{ alignItems: 'center', maxWidth: 320 }}>
            <StyledText variant="heading3" weight="semibold" align="center">
              初期設定が必要です
            </StyledText>
            <StyledText variant="body" color="secondary" align="center" style={{ marginTop: spacing[3] }}>
              勤怠集計機能を使用するために、まず締め日と支払日を設定してください。
            </StyledText>
            
            {state.permissions.canConfigureSettings ? (
              <StyledButton
                title="設定を開始"
                variant="primary"
                size="lg"
                onPress={() => setState(prev => ({ ...prev, showSettingsModal: true }))}
                style={{ marginTop: spacing[6] }}
              />
            ) : (
              <View style={{ marginTop: spacing[6], alignItems: 'center' }}>
                <StyledText variant="caption" color="warning" align="center">
                  管理者による設定が完了するまでお待ちください
                </StyledText>
              </View>
            )}
          </Card>
        </View>

        <PayrollSettingsModal
          visible={state.showSettingsModal}
          onClose={() => setState(prev => ({ ...prev, showSettingsModal: false }))}
          onSave={handleSaveSettings}
          canEdit={state.permissions.canConfigureSettings}
        />
      </View>
    )
  }

  return (
    <View style={containerStyle}>
      {/* ヘッダー */}
      <View style={headerStyle}>
        <StyledText variant="heading2" weight="bold">
          勤怠集計
        </StyledText>
        {state.currentPeriod && (
          <StyledText variant="caption" color="secondary" style={{ marginTop: spacing[1] }}>
            {state.currentPeriod.start_date} 〜 {state.currentPeriod.end_date}
          </StyledText>
        )}
      </View>

      <ScrollView
        style={contentStyle}
        refreshControl={
          <RefreshControl refreshing={state.isRefreshing} onRefresh={handleRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* 期間選択 */}
        {state.availablePeriods.length > 0 && (
          <View style={sectionStyle}>
            <Card padding="lg" style={cardStyle}>
              <StyledText variant="subtitle" weight="medium" style={{ marginBottom: spacing[3] }}>
                集計期間
              </StyledText>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={{ flexDirection: 'row', gap: spacing[2] }}>
                  {state.availablePeriods.slice(0, 6).map((period, index) => {
                    const isSelected = index === state.selectedPeriodIndex
                    return (
                      <StyledButton
                        key={`${period.start_date}-${period.end_date}`}
                        title={`${period.start_date.slice(5)} 〜 ${period.end_date.slice(5)}`}
                        variant={isSelected ? 'primary' : 'outline'}
                        size="sm"
                        onPress={() => handlePeriodChange(index)}
                      />
                    )
                  })}
                </View>
              </ScrollView>
            </Card>
          </View>
        )}

        {/* サマリーデータ */}
        {state.isSummariesLoading ? (
          <Card padding="lg" style={cardStyle}>
            <StyledText variant="body" color="secondary" align="center">
              データを取得中...
            </StyledText>
          </Card>
        ) : state.summaries.length > 0 ? (
          <View style={sectionStyle}>
            {state.summaries.map((summary, index) => (
              <Card key={summary.user_id} padding="lg" style={cardStyle}>
                <StyledText variant="subtitle" weight="semibold" style={{ marginBottom: spacing[3] }}>
                  {summary.user_name}
                </StyledText>

                <View style={summaryRowStyle}>
                  <StyledText variant="body">出勤日数</StyledText>
                  <StyledText variant="body" weight="medium">{summary.total_work_days}日</StyledText>
                </View>

                <View style={summaryRowStyle}>
                  <StyledText variant="body">総労働時間</StyledText>
                  <StyledText variant="body" weight="medium">{summary.total_work_hours.toFixed(1)}時間</StyledText>
                </View>

                {summary.total_overtime_hours > 0 && (
                  <View style={summaryRowStyle}>
                    <StyledText variant="body">残業時間</StyledText>
                    <StyledText variant="body" weight="medium" color="warning">
                      {summary.total_overtime_hours.toFixed(1)}時間
                    </StyledText>
                  </View>
                )}

                <View style={[summaryRowStyle, { borderBottomWidth: 0, marginTop: spacing[2] }]}>
                  <StyledText variant="title" weight="semibold">総支給額</StyledText>
                  <StyledText variant="title" weight="bold" color="primary">
                    ¥{summary.total_wage.toLocaleString()}
                  </StyledText>
                </View>

                {/* プロジェクト別詳細 */}
                {summary.projects.length > 1 && (
                  <View style={{ marginTop: spacing[4] }}>
                    <StyledText variant="caption" color="secondary" style={{ marginBottom: spacing[2] }}>
                      プロジェクト別詳細
                    </StyledText>
                    {summary.projects.map((project) => (
                      <View
                        key={project.project_id}
                        style={[summaryRowStyle, { paddingVertical: spacing[1] }]}
                      >
                        <StyledText variant="bodySmall" numberOfLines={1} style={{ flex: 1 }}>
                          {project.project_name}
                        </StyledText>
                        <StyledText variant="bodySmall" weight="medium">
                          {project.work_hours.toFixed(1)}h / ¥{project.wage.toLocaleString()}
                        </StyledText>
                      </View>
                    ))}
                  </View>
                )}
              </Card>
            ))}
          </View>
        ) : (
          <View style={noDataStyle}>
            <StyledText variant="subtitle" color="secondary" align="center">
              選択した期間にデータがありません
            </StyledText>
            <StyledText variant="caption" color="tertiary" align="center" style={{ marginTop: spacing[2] }}>
              勤怠データを入力すると集計結果が表示されます
            </StyledText>
          </View>
        )}

        {/* エクスポートボタン */}
        {state.summaries.length > 0 && (
          <View style={sectionStyle}>
            <Card padding="lg">
              <StyledText variant="subtitle" weight="medium" style={{ marginBottom: spacing[3] }}>
                データエクスポート
              </StyledText>
              <View style={exportButtonsStyle}>
                <StyledButton
                  title="PDF"
                  variant="outline"
                  size="md"
                  onPress={() => handleExport('pdf')}
                  disabled={!state.permissions.canExportPayroll}
                  style={{ flex: 1 }}
                />
                <StyledButton
                  title="CSV"
                  variant="outline"
                  size="md"
                  onPress={() => handleExport('csv')}
                  disabled={!state.permissions.canExportPayroll}
                  style={{ flex: 1 }}
                />
                <StyledButton
                  title="Excel"
                  variant="outline"
                  size="md"
                  onPress={() => handleExport('excel')}
                  disabled={!state.permissions.canExportPayroll}
                  style={{ flex: 1 }}
                />
              </View>
              {!state.permissions.canExportPayroll && (
                <StyledText variant="caption" color="tertiary" align="center" style={{ marginTop: spacing[2] }}>
                  エクスポートには管理者権限が必要です
                </StyledText>
              )}
            </Card>
          </View>
        )}
      </ScrollView>

      {/* 初回アクセス時のモーダル */}
      <Modal
        visible={state.showFirstTimeModal}
        transparent
        animationType="slide"
        onRequestClose={() => setState(prev => ({ ...prev, showFirstTimeModal: false }))}
      >
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: spacing[4]
        }}>
          <View style={{
            backgroundColor: colors.surface,
            borderRadius: radius.lg,
            padding: spacing[6],
            width: '100%',
            maxWidth: 400,
          }}>
            <View style={{ alignItems: 'center', marginBottom: spacing[4] }}>
              <Icon name="calendar" size={48} color="primary" style={{ marginBottom: spacing[3] }} />
              <StyledText variant="heading2" weight="bold" align="center">
                勤怠集計機能へようこそ
              </StyledText>
            </View>
            
            <StyledText variant="body" color="secondary" align="center" style={{ marginBottom: spacing[6] }}>
              勤怠データの集計とエクスポート機能をご利用いただけます。
              {state.permissions.canConfigureSettings 
                ? '\n\n最初に締め日と支払日の設定を行ってください。'
                : '\n\n管理者による初期設定が完了するまでお待ちください。'
              }
            </StyledText>
            
            <View style={{ flexDirection: 'row', gap: spacing[3] }}>
              <StyledButton
                title="後で設定"
                variant="outline"
                size="lg"
                onPress={() => setState(prev => ({ ...prev, showFirstTimeModal: false }))}
                style={{ flex: 1 }}
                disabled={!state.permissions.canConfigureSettings}
              />
              
              {state.permissions.canConfigureSettings && (
                <StyledButton
                  title="今すぐ設定"
                  variant="primary"
                  size="lg"
                  onPress={() => {
                    setState(prev => ({ 
                      ...prev, 
                      showFirstTimeModal: false, 
                      showSettingsModal: true 
                    }))
                  }}
                  style={{ flex: 1 }}
                />
              )}
            </View>
          </View>
        </View>
      </Modal>

      {/* 設定モーダル */}
      <PayrollSettingsModal
        visible={state.showSettingsModal}
        onClose={() => setState(prev => ({ ...prev, showSettingsModal: false }))}
        onSave={handleSaveSettings}
        initialData={
          state.settings
            ? {
                payroll_closing_day: state.settings.payroll_closing_day,
                payroll_pay_day: state.settings.payroll_pay_day,
              }
            : undefined
        }
        canEdit={state.permissions.canConfigureSettings}
      />
    </View>
  )
}