import React, { useState } from 'react'
import {
  View,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native'
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '@/constants/Colors'
import { StyledText, StyledButton, Card } from '@/components/ui'

interface DailyReportTabProps {
  projectId: string
  projectName: string
  userRole: string | null
  user: any
}

interface DailyReport {
  id: string
  date: string
  weather: string
  workContent: string
  workers: number
  progress: string
  issues: string
  materials: string
  photos: string[]
  submittedBy: string
  createdAt: string
}

export default function DailyReportTab({ projectId, projectName, userRole, user }: DailyReportTabProps) {
  const [reports, setReports] = useState<DailyReport[]>([])
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [formData, setFormData] = useState({
    weather: '',
    workContent: '',
    workers: '',
    progress: '',
    issues: '',
    materials: ''
  })

  // 権限チェック：職長は作成・編集可能、ワーカーは閲覧のみ
  const canCreateReport = userRole === 'parent' || userRole === 'lead'
  const canEditReport = userRole === 'parent' || userRole === 'lead'

  const handleCreateReport = () => {
    if (!canCreateReport) {
      Alert.alert('権限エラー', '日報の作成権限がありません')
      return
    }

    if (!formData.workContent.trim() || !formData.workers) {
      Alert.alert('入力エラー', '作業内容と作業人数は必須です')
      return
    }

    const newReport: DailyReport = {
      id: Date.now().toString(),
      date: new Date().toLocaleDateString('ja-JP'),
      weather: formData.weather,
      workContent: formData.workContent,
      workers: parseInt(formData.workers),
      progress: formData.progress,
      issues: formData.issues,
      materials: formData.materials,
      photos: [],
      submittedBy: user?.email || 'Unknown',
      createdAt: new Date().toISOString()
    }

    setReports(prev => [newReport, ...prev])
    setFormData({
      weather: '',
      workContent: '',
      workers: '',
      progress: '',
      issues: '',
      materials: ''
    })
    setShowCreateForm(false)
    Alert.alert('成功', '日報を作成しました')
  }

  const renderCreateForm = () => {
    if (!showCreateForm) return null

    return (
      <Card variant="elevated" style={styles.createForm}>
        <StyledText variant="subtitle" weight="semibold" style={styles.formTitle}>
          📝 日報作成
        </StyledText>
        
        <View style={styles.formRow}>
          <StyledText variant="body" weight="medium" color="text">天候</StyledText>
          <TextInput
            style={styles.textInput}
            placeholder="晴れ/曇り/雨など"
            value={formData.weather}
            onChangeText={(text) => setFormData(prev => ({ ...prev, weather: text }))}
            placeholderTextColor={Colors?.text?.muted ?? '#9CA3AF'}
          />
        </View>

        <View style={styles.formRow}>
          <StyledText variant="body" weight="medium" color="text">作業内容 *</StyledText>
          <TextInput
            style={[styles.textInput, styles.multilineInput]}
            placeholder="本日の作業内容を詳しく記載してください"
            value={formData.workContent}
            onChangeText={(text) => setFormData(prev => ({ ...prev, workContent: text }))}
            multiline
            numberOfLines={3}
            placeholderTextColor={Colors?.text?.muted ?? '#9CA3AF'}
          />
        </View>

        <View style={styles.formRow}>
          <StyledText variant="body" weight="medium" color="text">作業人数 *</StyledText>
          <TextInput
            style={styles.textInput}
            placeholder="5"
            value={formData.workers}
            onChangeText={(text) => setFormData(prev => ({ ...prev, workers: text }))}
            keyboardType="numeric"
            placeholderTextColor={Colors?.text?.muted ?? '#9CA3AF'}
          />
        </View>

        <View style={styles.formRow}>
          <StyledText variant="body" weight="medium" color="text">進捗状況</StyledText>
          <TextInput
            style={[styles.textInput, styles.multilineInput]}
            placeholder="工程の進捗、完了した作業など"
            value={formData.progress}
            onChangeText={(text) => setFormData(prev => ({ ...prev, progress: text }))}
            multiline
            numberOfLines={2}
            placeholderTextColor={Colors?.text?.muted ?? '#9CA3AF'}
          />
        </View>

        <View style={styles.formRow}>
          <StyledText variant="body" weight="medium" color="text">問題・課題</StyledText>
          <TextInput
            style={[styles.textInput, styles.multilineInput]}
            placeholder="発生した問題や明日への申し送り事項"
            value={formData.issues}
            onChangeText={(text) => setFormData(prev => ({ ...prev, issues: text }))}
            multiline
            numberOfLines={2}
            placeholderTextColor={Colors?.text?.muted ?? '#9CA3AF'}
          />
        </View>

        <View style={styles.formRow}>
          <StyledText variant="body" weight="medium" color="text">使用材料</StyledText>
          <TextInput
            style={[styles.textInput, styles.multilineInput]}
            placeholder="使用した材料、消耗品など"
            value={formData.materials}
            onChangeText={(text) => setFormData(prev => ({ ...prev, materials: text }))}
            multiline
            numberOfLines={2}
            placeholderTextColor={Colors?.text?.muted ?? '#9CA3AF'}
          />
        </View>

        <View style={styles.formActions}>
          <StyledButton
            title="キャンセル"
            variant="outline"
            size="md"
            onPress={() => setShowCreateForm(false)}
            style={styles.cancelButton}
          />
          <StyledButton
            title="作成"
            variant="primary"
            size="md"
            onPress={handleCreateReport}
            style={styles.submitButton}
          />
        </View>
      </Card>
    )
  }

  const renderReportCard = (report: DailyReport) => (
    <Card key={report.id} variant="elevated" style={styles.reportCard}>
      <View style={styles.reportHeader}>
        <View>
          <StyledText variant="subtitle" weight="semibold" color="text">
            📅 {report.date}
          </StyledText>
          <StyledText variant="caption" color="secondary">
            提出者: {report.submittedBy}
          </StyledText>
        </View>
        <View style={styles.weatherBadge}>
          <StyledText variant="caption" weight="medium" color="text">
            🌤️ {report.weather || '記録なし'}
          </StyledText>
        </View>
      </View>

      <View style={styles.reportContent}>
        <View style={styles.contentSection}>
          <StyledText variant="body" weight="semibold" color="text">
            作業内容
          </StyledText>
          <StyledText variant="body" color="secondary" style={styles.contentText}>
            {report.workContent}
          </StyledText>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <StyledText variant="caption" color="tertiary">作業人数</StyledText>
            <StyledText variant="title" weight="bold" color="primary">
              {report.workers}名
            </StyledText>
          </View>
        </View>

        {report.progress && (
          <View style={styles.contentSection}>
            <StyledText variant="body" weight="semibold" color="text">
              📊 進捗状況
            </StyledText>
            <StyledText variant="body" color="secondary" style={styles.contentText}>
              {report.progress}
            </StyledText>
          </View>
        )}

        {report.issues && (
          <View style={styles.contentSection}>
            <StyledText variant="body" weight="semibold" color="warning">
              ⚠️ 問題・課題
            </StyledText>
            <StyledText variant="body" color="secondary" style={styles.contentText}>
              {report.issues}
            </StyledText>
          </View>
        )}

        {report.materials && (
          <View style={styles.contentSection}>
            <StyledText variant="body" weight="semibold" color="text">
              📦 使用材料
            </StyledText>
            <StyledText variant="body" color="secondary" style={styles.contentText}>
              {report.materials}
            </StyledText>
          </View>
        )}
      </View>
    </Card>
  )

  const renderEmptyState = () => (
    <Card variant="outlined" style={styles.emptyCard}>
      <StyledText variant="heading3" align="center" style={styles.emptyIcon}>
        📝
      </StyledText>
      <StyledText variant="title" weight="semibold" align="center" color="text">
        日報がありません
      </StyledText>
      <StyledText variant="body" color="secondary" align="center" style={styles.emptyDescription}>
        {canCreateReport 
          ? '新しい日報を作成して、作業記録を開始しましょう'
          : '日報が提出されると、ここに表示されます'
        }
      </StyledText>
      {canCreateReport && (
        <StyledButton
          title="日報作成"
          variant="primary"
          size="lg"
          elevated={true}
          icon={<StyledText variant="title" color="onPrimary">📝</StyledText>}
          onPress={() => setShowCreateForm(true)}
          style={styles.emptyButton}
        />
      )}
    </Card>
  )

  return (
    <View style={styles.container}>
      {/* ヘッダーアクション */}
      {canCreateReport && !showCreateForm && (
        <View style={styles.headerActions}>
          <StyledButton
            title="日報作成"
            variant="primary"
            size="md"
            icon={<StyledText variant="body" color="onPrimary">📝</StyledText>}
            onPress={() => setShowCreateForm(true)}
            style={styles.createButton}
          />
        </View>
      )}

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 作成フォーム */}
        {renderCreateForm()}

        {/* 日報一覧 */}
        {reports.length > 0 ? (
          reports.map(renderReportCard)
        ) : !showCreateForm ? (
          renderEmptyState()
        ) : null}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors?.base?.background ?? '#F3F4F6',
  },
  headerActions: {
    paddingHorizontal: Spacing?.md,
    paddingVertical: Spacing?.sm,
    backgroundColor: Colors?.base?.surface ?? '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: Colors?.border?.light ?? '#E5E7EB',
  },
  createButton: {
    alignSelf: 'flex-end',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing?.md,
    paddingBottom: Spacing['2xl'],
  },
  createForm: {
    marginBottom: Spacing?.lg,
  },
  formTitle: {
    marginBottom: Spacing?.lg,
    textAlign: 'center',
  },
  formRow: {
    marginBottom: Spacing?.md,
  },
  textInput: {
    borderWidth: 1,
    borderColor: Colors?.border?.light ?? '#E5E7EB',
    borderRadius: BorderRadius?.md,
    paddingHorizontal: Spacing?.md,
    paddingVertical: Spacing?.sm,
    fontSize: Typography?.sizes?.base ?? 18,
    backgroundColor: Colors?.base?.surface ?? '#FFFFFF',
    color: Colors?.text?.primary ?? '#111827',
    marginTop: Spacing?.xs,
  },
  multilineInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  formActions: {
    flexDirection: 'row',
    gap: Spacing?.md,
    marginTop: Spacing?.lg,
  },
  cancelButton: {
    flex: 1,
  },
  submitButton: {
    flex: 1,
  },
  reportCard: {
    marginBottom: Spacing?.md,
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing?.md,
  },
  weatherBadge: {
    backgroundColor: Colors?.base?.surfaceSubtle ?? '#F9FAFB',
    paddingHorizontal: Spacing?.sm,
    paddingVertical: Spacing?.xs,
    borderRadius: BorderRadius?.sm,
  },
  reportContent: {
    gap: Spacing?.md,
  },
  contentSection: {
    gap: Spacing?.xs,
  },
  contentText: {
    lineHeight: 20,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing?.lg,
  },
  statItem: {
    alignItems: 'center',
    gap: Spacing?.xs,
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: Spacing['2xl'],
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: Spacing?.lg,
  },
  emptyDescription: {
    marginTop: Spacing?.sm,
    marginBottom: Spacing?.lg,
  },
  emptyButton: {
    minWidth: 200,
  },
})