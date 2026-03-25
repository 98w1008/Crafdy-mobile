import React, { useEffect, useMemo, useState } from 'react'
import {
  View,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Alert,
} from 'react-native'
import { router, useFocusEffect } from 'expo-router'
import { getAccessContext, type AccessContext } from '@/lib/access-context'
import { useAuth, useRole } from '@/contexts/AuthContext'
import { Colors, Spacing, Typography, BorderRadius } from '@/constants/Colors'
import { StyledText, StyledButton, Card, Icon } from '@/components/ui'
import { listProjects, StoredProject } from '@/lib/project-store'
import { approveExpense, listExpenses, StoredExpense } from '@/lib/expense-store'
import { approveDailyReport, listDailyReports, StoredDailyReport } from '@/lib/daily-report-store'
import { listProjectIdsForMember } from '@/lib/project-membership-store'
import { getApprovalMode, type ApprovalMode } from '@/lib/approval-mode-store'

interface DashboardMetric {
  id: string
  title: string
  value: string | number
  subValue?: string
  trend?: 'up' | 'down' | 'neutral'
  color: 'primary' | 'success' | 'warning' | 'info'
  icon: string
}

interface RecentActivity {
  id: string
  type: 'project_update' | 'message' | 'document' | 'progress'
  title: string
  description: string
  time: string
  projectName?: string
}

interface QuickAction {
  id: string
  title: string
  description: string
  icon: string
  color: string
  route: string
}

type ProjectKpi = {
  projectId: string
  projectName: string
  revenue: number | null
  expenseTotal: number
  grossProfit: number | null
  grossProfitRate: number | null
  dailyReportCount: number
  latestWork: string | null
  inputStatus: string
  selfWorkersTotal: number
  partnerWorkersTotal: number
}

export default function DashboardTab() {
  const { user, profile } = useAuth()
  const userRole = useRole()
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'year'>('month')

  const [projects, setProjects] = useState<StoredProject[]>([])
  const [expenses, setExpenses] = useState<StoredExpense[]>([])
  const [dailyReports, setDailyReports] = useState<StoredDailyReport[]>([])

  const [access, setAccess] = useState<AccessContext | null>(null)
  const [memberProjectIds, setMemberProjectIds] = useState<string[] | null>(null)
  const [approvalMode, setApprovalModeState] = useState<ApprovalMode>('owneronly')
  const isUnassigned = access?.kind === 'unassigned'
  const isOwner = access?.kind === 'assigned' ? access.role === 'owner' : true
  const canSeeCompanySettings = access?.kind === 'assigned' && access.role === 'owner'
  const canSeeWorkforceTotals = access?.kind === 'assigned' && (access.role === 'owner' || access.role === 'office')
  const canSeeWorkerAttendance = access?.kind === 'assigned' && (access.role === 'owner' || access.role === 'office')
  const canSeePartnerWorkforce = access?.kind === 'assigned' && (access.role === 'owner' || access.role === 'office')

  const reload = async () => {
    try {
      const [p, e, r] = await Promise.all([listProjects(), listExpenses(), listDailyReports()])
      setProjects(p)
      setExpenses(e)
      setDailyReports(r)
    } catch (err) {
      console.error('Failed to load dashboard data', err)
    }
  }

  useEffect(() => {
    reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    ;(async () => {
      const [ctx, mode] = await Promise.all([getAccessContext(), getApprovalMode()])
      setAccess(ctx)
      setApprovalModeState(mode)

      if (ctx.kind === 'assigned' && ctx.role === 'member') {
        // NOTE: 最小実装（userIdは暫定で local-user 固定）
        const ids = await listProjectIdsForMember(ctx.companyId, 'local-user')
        setMemberProjectIds(ids)
      } else {
        setMemberProjectIds(null)
      }
    })()
  }, [])

  useFocusEffect(
    React.useCallback(() => {
      reload()
    }, [])
  )

  const projectKpis: ProjectKpi[] = useMemo(() => {
    const expenseByProject = new Map<string, number>()
    const expenseDatesByProject = new Map<string, Set<string>>()
    for (const e of expenses) {
      expenseByProject.set(e.projectId, (expenseByProject.get(e.projectId) ?? 0) + (e.amount ?? 0))
      const set = expenseDatesByProject.get(e.projectId) ?? new Set<string>()
      if (e.date) set.add(e.date)
      expenseDatesByProject.set(e.projectId, set)
    }

    const reportsByProject = new Map<string, StoredDailyReport[]>()
    const workforceByProject = new Map<string, { self: number; partner: number }>()

    for (const r of dailyReports) {
      const arr = reportsByProject.get(r.projectId) ?? []
      arr.push(r)
      reportsByProject.set(r.projectId, arr)

      const prev = workforceByProject.get(r.projectId) ?? { self: 0, partner: 0 }
      const self = prev.self + (Number.isFinite(r.selfWorkersCount) ? (r.selfWorkersCount as number) : 0)
      const partner =
        prev.partner +
        (r.partnerWorkers || []).reduce((sum, p) => sum + (Number.isFinite(p.workersCount) ? p.workersCount : 0), 0)
      workforceByProject.set(r.projectId, { self, partner })
    }

    const visibleProjects = (() => {
      if (access?.kind === 'assigned' && access.role === 'member' && memberProjectIds) {
        const allowed = new Set(memberProjectIds)
        return projects.filter(p => allowed.has(p.id))
      }
      return projects
    })()

    return visibleProjects.map(p => {
      const projectExpenses = expenseByProject.get(p.id) ?? 0
      const reports = (reportsByProject.get(p.id) ?? []).slice().sort((a, b) => b.date.localeCompare(a.date))
      const latest = reports[0]

      const wf = workforceByProject.get(p.id) ?? { self: 0, partner: 0 }

      const revenue = Number.isFinite(p.revenue) ? (p.revenue as number) : null
      const grossProfit = revenue !== null ? revenue - projectExpenses : null
      const grossProfitRate =
        revenue !== null && revenue > 0 ? Math.round((grossProfit! / revenue) * 1000) / 10 : null

      const inputNotes: string[] = []
      if (revenue === null) inputNotes.push('売上未設定')
      if (projectExpenses <= 0) inputNotes.push('経費0件')
      if (reports.length === 0) inputNotes.push('日報0件')
      if (reports.length > 0 && !(latest?.nextPlan || '').trim()) inputNotes.push('最新日報: 明日の予定なし')

      if (latest?.date) {
        const hasExpenseSameDate = expenseDatesByProject.get(p.id)?.has(latest.date) ?? false
        const expenseCheckNone = latest.expenseCheckStatus === 'none'
        if (!hasExpenseSameDate && !expenseCheckNone) inputNotes.push('最新日報: 経費未確認')
      }

      if (latest) {
        const hasSelf = typeof latest.selfWorkersCount === 'number'
        const hasPartners = (latest.partnerWorkers || []).length > 0
        if (!hasSelf && !hasPartners) inputNotes.push('最新日報: 出面未入力')
      }

      const inputStatus = inputNotes.length === 0 ? '入力状況: OK' : `要確認: ${inputNotes.join(' / ')}`

      return {
        projectId: p.id,
        projectName: p.name,
        revenue,
        expenseTotal: projectExpenses,
        grossProfit,
        grossProfitRate,
        dailyReportCount: reports.length,
        latestWork: latest?.work ?? null,
        inputStatus,
        selfWorkersTotal: wf.self,
        partnerWorkersTotal: wf.partner,
      }
    })
  }, [projects, expenses, dailyReports, access?.kind, access?.role, memberProjectIds])

  // 建設業界特化ダッシュボードメトリクス（親方用）
  const dashboardMetrics: DashboardMetric[] = [
    {
      id: 'active_projects',
      title: '進行中プロジェクト',
      value: 8,
      subValue: '総12件中',
      trend: 'up',
      color: 'primary',
      icon: 'construct'
    },
    {
      id: 'monthly_revenue',
      title: '今月売上実績',
      value: '¥3,280',
      subValue: '万円 (予算比 +8%)',
      trend: 'up',
      color: 'primary',
      icon: 'yen'
    },
    {
      id: 'safety_score',
      title: '安全管理指数',
      value: '92',
      subValue: 'ポイント (優良)',
      trend: 'up',
      color: 'primary',
      icon: 'shield'
    },
    {
      id: 'completion_rate',
      title: '工程達成率',
      value: '87%',
      subValue: '予定より3日早い',
      trend: 'up',
      color: 'primary',
      icon: 'chart'
    },
    {
      id: 'material_costs',
      title: '材料費効率',
      value: '¥2,150',
      subValue: '万円 (予算内)',
      trend: 'neutral',
      color: 'primary',
      icon: 'box'
    },
    {
      id: 'labor_productivity',
      title: '生産性指標',
      value: '105%',
      subValue: 'vs 昨月',
      trend: 'up',
      color: 'primary',
      icon: 'users'
    }
  ]

  // 最近のアクティビティ
  const recentActivities: RecentActivity[] = [
    {
      id: '1',
      type: 'project_update',
      title: 'プロジェクト進捗更新',
      description: '新宿オフィスビル建設 - 70%完了',
      time: '2時間前',
      projectName: '新宿オフィスビル建設'
    },
    {
      id: '2',
      type: 'progress',
      title: '作業完了報告',
      description: 'マンション改修工事 - 外壁作業完了',
      time: '4時間前',
      projectName: 'マンション改修工事'
    },
    {
      id: '3',
      type: 'message',
      title: '新しいメッセージ',
      description: '田中さんから現場報告が届きました',
      time: '6時間前'
    },
    {
      id: '4',
      type: 'document',
      title: 'ドキュメント追加',
      description: '施工図面がアップロードされました',
      time: '8時間前',
      projectName: '住宅建築プロジェクト'
    }
  ]

  // クイックアクション
  const quickActions: QuickAction[] = [
    {
      id: 'payroll_summary',
      title: '勤怠集計',
      description: '給与計算・締め日管理',
      icon: 'calendar',
      color: Colors.success,
      route: '/payroll'
    },
    {
      id: 'invoice_management',
      title: '請求書管理',
      description: '請求書作成・期日管理',
      icon: 'file-text',
      color: Colors.info,
      route: '/invoice'
    },
    {
      id: 'new_estimate',
      title: '新規見積',
      description: '新規案件の見積作成',
      icon: 'yen',
      color: Colors.primary,
      route: '/estimate-center'
    },
    {
      id: 'new_project',
      title: '新規プロジェクト',
      description: 'プロジェクトを作成',
      icon: 'plus',
      color: Colors.primary,
      route: '/new-project'
    },
    {
      id: 'manage_leads',
      title: '職長管理',
      description: '職長の招待・権限・引き継ぎ',
      icon: 'users',
      color: Colors.textSecondary,
      route: '/manage-leads'
    },
    ...(userRole === 'admin' ? [{
      id: 'client_management',
      title: '元請け管理',
      description: '元請け企業・価格バイアス管理',
      icon: 'building',
      color: Colors.warning,
      route: '/clients'
    }] : []),
    {
      id: 'receipt_scan',
      title: 'レシート読み取り',
      description: '現場経費・会社経費を登録',
      icon: 'camera',
      color: Colors.textSecondary,
      route: '/receipt-scan'
    },
    {
      id: 'support_work',
      title: '応援（常用）記録',
      description: '常用作業の記録・請求',
      icon: 'zap',
      color: Colors.textSecondary,
      route: '/support-work'
    }
  ]

  const getActivityIcon = (type: RecentActivity['type']) => {
    switch (type) {
      case 'project_update': return 'clipboard'
      case 'progress': return 'check'
      case 'message': return 'message'
      case 'document': return 'file'
      default: return 'bell'
    }
  }

  const getActivityColor = (type: RecentActivity['type']) => {
    switch (type) {
      case 'project_update': return Colors.primary
      case 'progress': return Colors.primary
      case 'message': return Colors.primary
      case 'document': return Colors.primary
      default: return Colors.textSecondary
    }
  }

  const getTrendIcon = (trend?: 'up' | 'down' | 'neutral') => {
    switch (trend) {
      case 'up': return 'trending-up'
      case 'down': return 'trending-down'
      case 'neutral': return 'minus'
      default: return ''
    }
  }

  const handleQuickAction = (route: string) => {
    if (route.startsWith('/')) {
      router.push(route as any)
    } else {
      Alert.alert('開発中', 'この機能は開発中です')
    }
  }

  const renderWelcomeCard = () => (
    <Card variant="elevated" style={styles.welcomeCard}>
      <View style={styles.welcomeContent}>
        <View>
          <StyledText variant="title" weight="semibold">
            おかえりなさい、{profile?.full_name || 'ユーザー'}さん
          </StyledText>
          <StyledText variant="body" color="secondary">
            {userRole === 'parent' ? '親方ダッシュボード' : userRole === 'lead' ? '職長ダッシュボード' : 'ワーカーダッシュボード'}
          </StyledText>
        </View>
        <View style={styles.welcomeIcon}>
          <StyledText variant="heading2" color="primary">●</StyledText>
        </View>
      </View>
      <View style={styles.todayStats}>
        <StyledText variant="caption" color="secondary">
          今日は {new Date().toLocaleDateString('ja-JP', { 
            month: 'long', 
            day: 'numeric', 
            weekday: 'long' 
          })} です
        </StyledText>
      </View>
    </Card>
  )

  const renderJoinByCodeCard = () => {
    if (!isUnassigned) return null

    return (
      <Card variant="elevated" style={styles.joinCard}>
        <StyledText variant="subtitle" weight="semibold">会社に参加してください</StyledText>
        <StyledText variant="caption" color="secondary" style={{ marginTop: 4 }}>
          招待コードを入力して会社に参加すると、現場・日報・経費の記録が使えます。
        </StyledText>
        <View style={{ marginTop: Spacing.sm }}>
          <StyledButton
            title="招待コード入力へ"
            variant="primary"
            onPress={() => router.push('/join/by-code' as any)}
          />
        </View>
      </Card>
    )
  }

  const renderCompanySettingsLink = () => {
    if (!canSeeCompanySettings) return null

    return (
      <Card variant="elevated" style={styles.companySettingsCard}>
        <StyledText variant="subtitle" weight="semibold">会社設定</StyledText>
        <StyledText variant="caption" color="secondary" style={{ marginTop: 4 }}>
          招待コードの発行/無効化
        </StyledText>
        <View style={{ marginTop: Spacing.sm }}>
          <StyledButton
            title="招待コード管理へ"
            variant="secondary"
            onPress={() => router.push('/company/settings' as any)}
          />
        </View>
      </Card>
    )
  }

  const canSeePendingReviews =
    access?.kind === 'assigned' &&
    (access.role === 'owner' || (access.role === 'office' && approvalMode === 'ownerplus_office'))

  const canApprovePendingReviews = canSeePendingReviews

  const pendingDailyReports = useMemo(() => {
    if (!canSeePendingReviews) return [] as StoredDailyReport[]
    return dailyReports.filter(r => r.reviewStatus === 'submitted')
  }, [dailyReports, canSeePendingReviews])

  const pendingExpenses = useMemo(() => {
    if (!canSeePendingReviews) return [] as StoredExpense[]
    return expenses.filter(e => e.reviewStatus === 'submitted')
  }, [expenses, canSeePendingReviews])

  const currentYm = (() => {
    // NOTE: 表示と集計で同じ「ローカル時刻のYYYY-MM」を使う（TZ境界のズレ回避）
    const now = new Date()
    const y = now.getFullYear()
    const m = String(now.getMonth() + 1).padStart(2, '0')
    return `${y}-${m}`
  })()

  const workerAttendanceRows = useMemo(() => {
    if (!canSeeWorkerAttendance) return [] as { name: string; days: number }[]

    const byKey = new Map<string, { name: string; dates: Set<string> }>()

    for (const r of dailyReports) {
      if (!r?.date || !String(r.date).startsWith(currentYm)) continue

      const ids = (r.selfWorkerIds || []).filter(Boolean)
      const names = (r.selfWorkerNames || []).filter(Boolean)

      if (ids.length > 0) {
        for (let i = 0; i < ids.length; i++) {
          const id = ids[i]
          const name = names[i] || names[0] || id
          const key = `id:${id}`
          const prev = byKey.get(key) ?? { name, dates: new Set<string>() }
          prev.dates.add(r.date)
          byKey.set(key, prev)
        }
      } else if (names.length > 0) {
        for (const name of names) {
          const key = `name:${name}`
          const prev = byKey.get(key) ?? { name, dates: new Set<string>() }
          prev.dates.add(r.date)
          byKey.set(key, prev)
        }
      }
    }

    const rows = Array.from(byKey.values()).map(v => ({ name: v.name, days: v.dates.size }))
    rows.sort((a, b) => b.days - a.days)
    return rows.slice(0, 5)
  }, [dailyReports, canSeeWorkerAttendance, currentYm])

  const renderWorkerAttendanceCard = () => {
    if (!canSeeWorkerAttendance) return null

    return (
      <Card variant="elevated" style={styles.workerAttendanceCard}>
        <StyledText variant="subtitle" weight="semibold">自社職人の今月出勤</StyledText>
        <StyledText variant="caption" color="secondary" style={{ marginTop: 4 }}>
          対象月: {currentYm}
        </StyledText>

        {workerAttendanceRows.length === 0 ? (
          <StyledText variant="body" color="secondary" style={{ marginTop: Spacing.sm }}>
            まだ出勤データがありません。
          </StyledText>
        ) : (
          <View style={{ marginTop: Spacing.sm, gap: 8 }}>
            {workerAttendanceRows.map(r => (
              <View key={r.name} style={styles.workerAttendanceRow}>
                <StyledText variant="caption" weight="semibold" numberOfLines={1} style={{ flex: 1 }}>
                  {r.name}
                </StyledText>
                <StyledText variant="caption" color="secondary">{r.days}日</StyledText>
              </View>
            ))}
          </View>
        )}
      </Card>
    )
  }

  const partnerWorkforceRows = useMemo(() => {
    if (!canSeePartnerWorkforce) return [] as { key: string; name: string; workersTotal: number }[]

    const byKey = new Map<string, { key: string; name: string; workersTotal: number }>()

    for (const r of dailyReports) {
      if (!r?.date || !String(r.date).startsWith(currentYm)) continue
      if (!Array.isArray(r.partnerWorkers) || r.partnerWorkers.length === 0) continue

      for (const pw of r.partnerWorkers) {
        const name = String(pw?.companyName || '').trim()
        if (!name) continue

        const n = Number(pw?.workersCount)
        if (!Number.isFinite(n) || n <= 0) continue

        const id = pw?.partnerCompanyId ? String(pw.partnerCompanyId).trim() : ''
        const key = id ? `id:${id}` : `name:${name}`

        const prev = byKey.get(key) ?? { key, name, workersTotal: 0 }
        prev.workersTotal += Math.floor(n)
        byKey.set(key, prev)
      }
    }

    const rows = Array.from(byKey.values())
    rows.sort((a, b) => b.workersTotal - a.workersTotal)
    return rows.slice(0, 5)
  }, [dailyReports, canSeePartnerWorkforce, currentYm])

  const renderPartnerWorkforceCard = () => {
    if (!canSeePartnerWorkforce) return null

    return (
      <Card variant="elevated" style={styles.partnerWorkforceCard}>
        <StyledText variant="subtitle" weight="semibold">協力会社の今月人工</StyledText>
        <StyledText variant="caption" color="secondary" style={{ marginTop: 4 }}>
          対象月: {currentYm}
        </StyledText>

        {partnerWorkforceRows.length === 0 ? (
          <StyledText variant="body" color="secondary" style={{ marginTop: Spacing.sm }}>
            まだ協力会社データがありません。
          </StyledText>
        ) : (
          <View style={{ marginTop: Spacing.sm, gap: 8 }}>
            {partnerWorkforceRows.map(r => (
              <View key={r.key} style={styles.partnerWorkforceRow}>
                <StyledText variant="caption" weight="semibold" numberOfLines={1} style={{ flex: 1 }}>
                  {r.name}
                </StyledText>
                <StyledText variant="caption" color="secondary">{r.workersTotal}人工</StyledText>
              </View>
            ))}
          </View>
        )}
      </Card>
    )
  }

  const renderPendingReviewsCard = () => {
    if (!canSeePendingReviews) return null

    const items = [
      ...pendingDailyReports.map(r => ({
        key: `dr-${r.id}`,
        id: r.id,
        type: '日報' as const,
        projectId: r.projectId,
        primary: `${r.date} / ${r.work}`,
        secondary: '確認待ち',
      })),
      ...pendingExpenses.map(e => ({
        key: `ex-${e.id}`,
        id: e.id,
        type: '経費' as const,
        projectId: e.projectId,
        primary: `${e.kind} / ¥${(e.amount ?? 0).toLocaleString('ja-JP')}`,
        secondary: '確認待ち',
      })),
    ]

    const projectNameById = new Map(projects.map(p => [p.id, p.name]))
    const count = items.length

    return (
      <Card variant="elevated" style={styles.pendingReviewsCard}>
        <StyledText variant="subtitle" weight="semibold">確認待ち</StyledText>
        <StyledText variant="caption" color="secondary" style={{ marginTop: 4 }}>
          submitted: {count}件
        </StyledText>

        {count === 0 ? (
          <StyledText variant="body" color="secondary" style={{ marginTop: Spacing.sm }}>
            確認待ちはありません。
          </StyledText>
        ) : (
          <View style={{ marginTop: Spacing.sm, gap: 8 }}>
            {items.slice(0, 6).map(it => (
              <View key={it.key} style={styles.pendingRow}>
                <StyledText variant="caption" weight="semibold">[{it.type}]</StyledText>
                <StyledText variant="caption" color="secondary" numberOfLines={1} style={{ flex: 1 }}>
                  {projectNameById.get(it.projectId) || '（不明）'}
                </StyledText>
                <StyledText variant="caption" color="secondary" numberOfLines={1} style={{ flex: 2 }}>
                  {it.primary}
                </StyledText>

                {canApprovePendingReviews ? (
                  <TouchableOpacity
                    style={styles.approveButton}
                    onPress={async () => {
                      if (it.type === '日報') await approveDailyReport(it.id)
                      else await approveExpense(it.id)
                      await reload()
                    }}
                    accessibilityLabel="承認"
                  >
                    <StyledText variant="caption" weight="semibold" color="primary">
                      承認
                    </StyledText>
                  </TouchableOpacity>
                ) : null}
              </View>
            ))}
          </View>
        )}
      </Card>
    )
  }

  const renderProjectKpis = () => (
    <Card variant="elevated" style={styles.projectKpiCard}>
      <View style={styles.projectKpiHeader}>
        <StyledText variant="subtitle" weight="semibold">
          {isOwner ? '現場別（売上/経費/粗利）' : '現場別（経費/日報）'}
        </StyledText>
        <StyledText variant="caption" color="secondary">
          {isOwner ? '経費と日報から集計（売上は main-chat から設定）' : '経費と日報から集計'}
        </StyledText>
      </View>

      {projectKpis.length === 0 ? (
        <StyledText variant="body" color="secondary">現場がまだありません。main-chat から現場を作成してください。</StyledText>
      ) : (
        <View style={styles.projectKpiList}>
          {projectKpis.map(kpi => (
            <View key={kpi.projectId} style={styles.projectKpiItem}>
              <View style={{ flex: 1 }}>
                <StyledText variant="body" weight="semibold" numberOfLines={1}>
                  {kpi.projectName}
                </StyledText>
                <StyledText variant="caption" color="secondary" numberOfLines={1}>
                  日報{kpi.dailyReportCount}件 / 最新: {kpi.latestWork ?? 'なし'}
                </StyledText>
                <StyledText variant="caption" color="secondary" numberOfLines={1}>
                  経費: ¥{kpi.expenseTotal.toLocaleString('ja-JP')}
                  {isOwner && kpi.grossProfit !== null ? ` / 粗利: ¥${kpi.grossProfit.toLocaleString('ja-JP')}` : ''}
                  {isOwner && kpi.grossProfitRate !== null ? `（${kpi.grossProfitRate}%）` : ''}
                </StyledText>
                <StyledText variant="caption" color="secondary" numberOfLines={1}>
                  {kpi.inputStatus}
                </StyledText>
                {canSeeWorkforceTotals && (kpi.selfWorkersTotal > 0 || kpi.partnerWorkersTotal > 0) ? (
                  <StyledText variant="caption" color="secondary" numberOfLines={1}>
                    出面: 自社 {kpi.selfWorkersTotal}人
                    {kpi.partnerWorkersTotal > 0 ? ` / 協力会社 ${kpi.partnerWorkersTotal}人` : ''}
                  </StyledText>
                ) : null}
              </View>
              <View style={styles.projectKpiRight}>
                {isOwner ? (
                  kpi.revenue === null ? (
                    <>
                      <StyledText variant="body" weight="semibold">売上未設定</StyledText>
                      <StyledText variant="caption" color="secondary">main-chatで設定</StyledText>
                    </>
                  ) : (
                    <>
                      <StyledText variant="body" weight="semibold">¥{kpi.revenue.toLocaleString('ja-JP')}</StyledText>
                      <StyledText variant="caption" color="secondary">売上</StyledText>
                    </>
                  )
                ) : (
                  <>
                    <StyledText variant="body" weight="semibold">¥{kpi.expenseTotal.toLocaleString('ja-JP')}</StyledText>
                    <StyledText variant="caption" color="secondary">経費合計</StyledText>
                  </>
                )}
              </View>
            </View>
          ))}
        </View>
      )}

      <View style={{ marginTop: Spacing.sm }}>
        <StyledText variant="caption" color="secondary">※ 売上未設定の現場は main-chat から売上を設定してください。</StyledText>
      </View>
    </Card>
  )

  const renderMetricsGrid = () => (
    <View style={styles.metricsGrid}>
      {dashboardMetrics.map((metric) => (
        <Card 
          key={metric.id} 
          variant="elevated" 
          style={styles.metricCard}
          elevationLevel={2}
          pressable={true}
          hapticFeedback={true}
          onPress={() => Alert.alert('詳細表示', `${metric.title}の詳細データを表示します`)}
        >
          <View style={styles.metricHeader}>
            <Icon 
              name={metric.icon} 
              size={24} 
              color={metric.color}
            />
            {metric.trend && (
              <View style={[styles.trendBadge, { backgroundColor: Colors.surfacePrimary }]}>
                <Icon 
                  name={getTrendIcon(metric.trend)} 
                  size={12} 
                  color="primary"
                />
              </View>
            )}
          </View>
          
          <StyledText variant="heading2" weight="bold" color={metric.color} style={styles.metricValue}>
            {metric.value}
          </StyledText>
          
          <StyledText variant="body" weight="semibold" color="text" numberOfLines={1}>
            {metric.title}
          </StyledText>
          
          {metric.subValue && (
            <StyledText variant="caption" color="secondary" numberOfLines={1}>
              {metric.subValue}
            </StyledText>
          )}
        </Card>
      ))}
    </View>
  )

  const renderQuickActions = () => (
    <Card variant="premium" elevationLevel={3} glowEffect={true} style={styles.quickActionsCard}>
      <StyledText variant="subtitle" weight="semibold" style={styles.sectionTitle}>
        クイックアクション
      </StyledText>
      <View style={styles.quickActionsGrid}>
        {quickActions.map((action) => (
          <TouchableOpacity
            key={action.id}
            style={styles.quickActionItem}
            onPress={() => handleQuickAction(action.route)}
            activeOpacity={0.7}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: action.color + '20' }]}>
              <Icon 
                name={action.icon} 
                size={20} 
                color={action.color}
              />
            </View>
            <StyledText variant="body" weight="medium" numberOfLines={1}>
              {action.title}
            </StyledText>
            <StyledText variant="caption" color="secondary" numberOfLines={1}>
              {action.description}
            </StyledText>
          </TouchableOpacity>
        ))}
      </View>
    </Card>
  )

  const renderRecentActivity = () => (
    <Card variant="elevated" style={styles.activityCard}>
      <View style={styles.activityHeader}>
        <StyledText variant="subtitle" weight="semibold">
          最近のアクティビティ
        </StyledText>
        <TouchableOpacity onPress={() => Alert.alert('開発中', 'すべて表示機能は開発中です')}>
          <StyledText variant="caption" color="primary">
            すべて表示
          </StyledText>
        </TouchableOpacity>
      </View>
      
      <View style={styles.activityList}>
        {recentActivities.map((activity) => (
          <TouchableOpacity
            key={activity.id}
            style={styles.activityItem}
            onPress={() => Alert.alert('開発中', '詳細表示機能は開発中です')}
            activeOpacity={0.7}
          >
            <View style={[
              styles.activityIconContainer,
              { backgroundColor: getActivityColor(activity.type) + '20' }
            ]}>
              <Icon 
                name={getActivityIcon(activity.type)} 
                size={16} 
                color={getActivityColor(activity.type)}
              />
            </View>
            
            <View style={styles.activityContent}>
              <StyledText variant="body" weight="medium" numberOfLines={1}>
                {activity.title}
              </StyledText>
              <StyledText variant="caption" color="secondary" numberOfLines={2}>
                {activity.description}
              </StyledText>
              {activity.projectName && (
                <StyledText variant="caption" color="primary">
                  {activity.projectName}
                </StyledText>
              )}
            </View>
            
            <View style={styles.activityTime}>
              <StyledText variant="caption" color="tertiary">
                {activity.time}
              </StyledText>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </Card>
  )

  if (isUnassigned) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {renderJoinByCodeCard()}
        </ScrollView>
      </SafeAreaView>
    )
  }

  // 親方専用表示（userRole === 'parent'の場合のみ）
  if (userRole !== 'parent') {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {renderWelcomeCard()}
          {renderCompanySettingsLink()}
          {renderPendingReviewsCard()}
          {renderWorkerAttendanceCard()}
          {renderPartnerWorkforceCard()}
          {renderQuickActions()}
          {renderRecentActivity()}
        </ScrollView>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ヘッダー */}
        <View style={styles.header}>
          <StyledText variant="heading2" weight="bold">
            親方ダッシュボード
          </StyledText>
          <StyledText variant="body" color="secondary">
            プロジェクト全体の管理と統計
          </StyledText>
        </View>

        {/* ウェルカムカード */}
        {renderWelcomeCard()}

        {renderCompanySettingsLink()}

        {renderPendingReviewsCard()}

        {renderWorkerAttendanceCard()}
        {renderPartnerWorkforceCard()}

        {renderJoinByCodeCard()}

        {/* 現場別（粗利/進捗の最小） */}
        {renderProjectKpis()}

        {/* メトリクスグリッド */}
        {renderMetricsGrid()}

        {/* クイックアクション */}
        {renderQuickActions()}

        {/* 最近のアクティビティ */}
        {renderRecentActivity()}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.md,
    paddingBottom: Spacing['2xl'],
  },
  header: {
    marginBottom: Spacing.lg,
    paddingTop: Spacing.sm,
  },
  welcomeCard: {
    marginBottom: Spacing.lg,
  },
  joinCard: {
    marginBottom: Spacing.lg,
    padding: Spacing.md,
  },
  companySettingsCard: {
    marginBottom: Spacing.lg,
    padding: Spacing.md,
  },
  pendingReviewsCard: {
    marginBottom: Spacing.lg,
    padding: Spacing.md,
  },
  workerAttendanceCard: {
    marginBottom: Spacing.lg,
    padding: Spacing.md,
  },
  workerAttendanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  partnerWorkforceCard: {
    marginBottom: Spacing.lg,
    padding: Spacing.md,
  },
  partnerWorkforceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  pendingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  approveButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  projectKpiCard: {
    marginBottom: Spacing.lg,
    padding: Spacing.md,
  },
  projectKpiHeader: {
    marginBottom: Spacing.sm,
    gap: 2,
  },
  projectKpiList: {
    gap: Spacing.sm,
  },
  projectKpiItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  projectKpiRight: {
    alignItems: 'flex-end',
    minWidth: 96,
  },
  welcomeContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  welcomeIcon: {
    width: 50,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayStats: {
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
    justifyContent: 'space-between',
  },
  metricCard: {
    width: '48%',
    minHeight: 140,
    justifyContent: 'space-between',
    padding: Spacing.md,
  },
  metricHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  trendBadge: {
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
    minWidth: 24,
    alignItems: 'center',
  },
  metricValue: {
    marginBottom: Spacing.xs,
  },
  quickActionsCard: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    marginBottom: Spacing.md,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  quickActionItem: {
    width: '48%',
    alignItems: 'center',
    padding: Spacing.md,
    backgroundColor: Colors.surfaceGray,
    borderRadius: BorderRadius.lg,
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  activityCard: {
    marginBottom: Spacing.lg,
  },
  activityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  activityList: {
    gap: Spacing.sm,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  activityIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  activityContent: {
    flex: 1,
    gap: Spacing.xs,
  },
  activityTime: {
    alignItems: 'flex-end',
  },
})