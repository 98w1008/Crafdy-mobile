import AsyncStorage from '@react-native-async-storage/async-storage'
import { supabase } from './supabase'
import { safeJSONStringify, sanitizeUnicodeForJSON } from './unicode-utils'
import type { EstimateDraft, EstimateItem as StructuredEstimateItem, InvoiceDraft, InvoiceItem as StructuredInvoiceItem } from '@/types/documents'
import { getTemplateKey, TemplateMode, TemplateType } from '@/lib/templates'
import { getAppMode } from '@/lib/appMode'
import { getAccessToken } from '@/lib/token-store'

// API型定義
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface DashboardSummary {
  totalProjects: number
  activeProjects: number
  completedProjects: number
  totalBudget: number
  totalCosts: number
  totalUsers: number
  monthlyProgress: Array<{
    month: string
    budget: number
    costs: number
    profit: number
  }>
}

export interface ProjectStats {
  id: string
  name: string
  totalBudget: number
  totalCosts: number
  progressRate: number
  reportCount: number
  workerCount: number
  totalManHours: number
}

export interface ReportData {
  id?: string
  projectId: string
  userId: string
  content: string
  workDate: string
  weather?: string
  workersCount?: number
  photoUrls?: string[]
}

export interface EstimateData {
  id?: string
  projectId?: string
  prospectId?: string
  title: string
  description?: string
  customerName?: string
  customerEmail?: string
  customerAddress?: string
  issueDate: string
  dueDate?: string
  items: EstimateItem[]
}

export interface EstimateItem {
  name: string
  description?: string
  quantity: number
  unit: string
  unitPrice: number
}

export interface ReceiptUpload {
  file: File | string
  projectId?: string
  description?: string
}

// API クラス
export class CraftdyAPI {
  // 現在のスコープ（モードとID）を取得
  static async getCurrentScope(): Promise<{ mode: TemplateMode; scopeId: string }> {
    const mode = await getAppMode()
    if (mode === 'demo') {
      return { mode: 'demo', scopeId: 'demo' }
    }

    if (!supabase) return { mode: 'prod', scopeId: 'default' }

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return { mode: 'prod', scopeId: 'guest' }

      // 会社IDの取得を試みる
      const { data: userInfo } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', user.id)
        .single()

      return { mode: 'prod', scopeId: userInfo?.company_id || user.id }
    } catch (e) {
      console.warn('[api] failed to get current scope', e)
      return { mode: 'prod', scopeId: 'error' }
    }
  }

  // ダッシュボードデータ取得
  static async getDashboardSummary(): Promise<ApiResponse<DashboardSummary>> {
    try {
      if (!supabase) throw new Error('Supabase client is not initialized')
      const { data: user } = await supabase.auth.getUser()
      if (!user.user) {
        throw new Error('認証が必要です')
      }

      // ユーザーの会社IDを取得
      const { data: userInfo } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', user.user.id)
        .single()

      if (!userInfo?.company_id) {
        throw new Error('会社情報が見つかりません')
      }

      // 会社ダッシュボードデータを取得
      const { data: dashboardData, error } = await supabase
        .from('company_dashboard')
        .select('*')
        .eq('company_id', userInfo.company_id)
        .single()

      if (error) throw error

      // 月次進捗データを取得（簡略化）
      const monthlyProgress = await this.getMonthlyProgress(userInfo.company_id)

      const summary: DashboardSummary = {
        totalProjects: dashboardData.total_projects || 0,
        activeProjects: dashboardData.active_projects || 0,
        completedProjects: (dashboardData.total_projects || 0) - (dashboardData.active_projects || 0),
        totalBudget: dashboardData.total_budget || 0,
        totalCosts: dashboardData.total_costs || 0,
        totalUsers: dashboardData.total_users || 0,
        monthlyProgress: monthlyProgress
      }

      return { success: true, data: summary }
    } catch (error) {
      console.error('Dashboard API error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : '不明なエラー'
      }
    }
  }

  // プロジェクト統計取得
  static async getProjectStats(projectId?: string): Promise<ApiResponse<ProjectStats[]>> {
    try {
      if (!supabase) throw new Error('Supabase client is not initialized')
      const { data: user } = await supabase.auth.getUser()
      if (!user.user) {
        throw new Error('認証が必要です')
      }

      let query = supabase.from('project_statistics').select('*')

      if (projectId) {
        query = query.eq('id', projectId)
      }

      const { data, error } = await query

      if (error) throw error

      const stats: ProjectStats[] = data?.map(item => ({
        id: item.id,
        name: item.name,
        totalBudget: item.total_budget || 0,
        totalCosts: item.total_costs || 0,
        progressRate: item.progress_rate || 0,
        reportCount: item.report_count || 0,
        workerCount: item.worker_count || 0,
        totalManHours: item.total_man_hours || 0,
      })) || []

      return { success: true, data: stats }
    } catch (error) {
      console.error('Project stats API error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : '不明なエラー'
      }
    }
  }

  // 日報投稿
  static async createReport(reportData: ReportData): Promise<ApiResponse<{ id: string }>> {
    try {
      if (!supabase) throw new Error('Supabase client is not initialized')
      // Unicode文字を安全に処理
      const safeReportData = {
        project_id: reportData.projectId,
        user_id: reportData.userId,
        content: sanitizeUnicodeForJSON(reportData.content),
        work_date: reportData.workDate,
        weather: reportData.weather ? sanitizeUnicodeForJSON(reportData.weather) : undefined,
        workers_count: reportData.workersCount,
        photo_urls: reportData.photoUrls
      }

      const { data, error } = await supabase
        .from('reports')
        .insert(safeReportData)
        .select('id')
        .single()

      if (error) throw error

      // AI解析を非同期で実行（実装は後で）
      this.analyzeReportAsync(data.id)

      return {
        success: true,
        data: { id: data.id },
        message: '日報が正常に投稿されました'
      }
    } catch (error) {
      console.error('Create report API error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : '日報の投稿に失敗しました'
      }
    }
  }

  // プロジェクトの日報取得
  static async getProjectReports(projectId: string, limit = 50): Promise<ApiResponse<any[]>> {
    try {
      if (!supabase) throw new Error('Supabase client is not initialized')
      const { data, error } = await supabase
        .from('reports')
        .select(`
          *,
          users (
            full_name,
            email
          )
        `)
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) throw error

      return { success: true, data: data || [] }
    } catch (error) {
      console.error('Get project reports API error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : '日報の取得に失敗しました'
      }
    }
  }

  // 現場（プロジェクト）が存在するか確認
  static async hasProjects(): Promise<boolean> {
    try {
      if (!supabase) return false
      const { data: user } = await supabase.auth.getUser()
      if (!user.user) return false

      const { count, error } = await supabase
        .from('project_statistics')
        .select('*', { count: 'exact', head: true })

      if (error) throw error
      return (count || 0) > 0
    } catch (error) {
      console.error('Has projects check error:', error)
      return false
    }
  }

  // 見積書作成
  static async createEstimate(estimateData: EstimateData): Promise<ApiResponse<{ id: string }>> {
    try {
      if (!supabase) throw new Error('Supabase client is not initialized')
      const { data: user } = await supabase.auth.getUser()
      if (!user.user) {
        throw new Error('認証が必要です')
      }

      // ユーザーの会社IDを取得
      const { data: userInfo } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', user.user.id)
        .single()

      if (!userInfo?.company_id) {
        throw new Error('会社情報が見つかりません')
      }

      // Unicode文字を安全に処理
      const safeEstimateData = {
        project_id: estimateData.projectId || null,
        prospect_id: estimateData.prospectId || null,
        company_id: userInfo.company_id,
        title: sanitizeUnicodeForJSON(estimateData.title),
        description: estimateData.description ? sanitizeUnicodeForJSON(estimateData.description) : undefined,
        customer_name: estimateData.customerName ? sanitizeUnicodeForJSON(estimateData.customerName) : undefined,
        customer_email: estimateData.customerEmail,
        customer_address: estimateData.customerAddress ? sanitizeUnicodeForJSON(estimateData.customerAddress) : undefined,
        issue_date: estimateData.issueDate,
        due_date: estimateData.dueDate,
        created_by: user.user.id
      }

      // 見積書本体を作成
      const { data: estimate, error: estimateError } = await supabase
        .from('estimates')
        .insert(safeEstimateData)
        .select('id')
        .single()

      if (estimateError) throw estimateError

      // 見積項目を作成
      if (estimateData.items.length > 0) {
        const items = estimateData.items.map((item, index) => ({
          estimate_id: estimate.id,
          name: sanitizeUnicodeForJSON(item.name),
          description: item.description ? sanitizeUnicodeForJSON(item.description) : undefined,
          quantity: item.quantity,
          unit: sanitizeUnicodeForJSON(item.unit),
          unit_price: item.unitPrice,
          order_index: index
        }))

        const { error: itemsError } = await supabase
          .from('estimate_items')
          .insert(items)

        if (itemsError) throw itemsError
      }

      return {
        success: true,
        data: { id: estimate.id },
        message: '見積書が正常に作成されました'
      }
    } catch (error) {
      console.error('Create estimate API error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : '見積書の作成に失敗しました'
      }
    }
  }

  // OCRアップロード
  static async uploadReceipt(upload: ReceiptUpload): Promise<ApiResponse<{ id: string }>> {
    try {
      if (!supabase) throw new Error('Supabase client is not initialized')
      const { data: user } = await supabase.auth.getUser()
      if (!user.user) {
        throw new Error('認証が必要です')
      }

      // ユーザーの会社IDを取得
      const { data: userInfo } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', user.user.id)
        .single()

      if (!userInfo?.company_id) {
        throw new Error('会社情報が見つかりません')
      }

      // TODO: ファイルをSupabase Storageにアップロード
      const fileUrl = typeof upload.file === 'string' ? upload.file : 'temp-url'

      const { data, error } = await supabase
        .from('receipts')
        .insert({
          company_id: userInfo.company_id,
          project_id: upload.projectId,
          file_url: fileUrl,
          status: 'pending',
          uploaded_by: user.user.id
        })
        .select('id')
        .single()

      if (error) throw error

      // OCR処理を非同期で実行（実装は後で）
      this.processOCRAsync(data.id)

      return {
        success: true,
        data: { id: data.id },
        message: 'レシートのアップロードが完了しました。OCR処理中です。'
      }
    } catch (error) {
      console.error('Upload receipt API error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'レシートのアップロードに失敗しました'
      }
    }
  }

  // AIコーチング
  static async askCoach(question: string, projectId?: string): Promise<ApiResponse<{ answer: string }>> {
    try {
      if (!supabase) throw new Error('Supabase client is not initialized')
      const { data: user } = await supabase.auth.getUser()
      if (!user.user) {
        throw new Error('認証が必要です')
      }

      // Unicode文字を安全に処理
      const safeQuestion = sanitizeUnicodeForJSON(question)

      // TODO: OpenAI APIと連携してAI回答を生成
      const answer = `【AIコーチからの回答】
      
質問: ${safeQuestion}

回答: これは開発中のAIコーチング機能です。現在は以下のような回答を提供予定です：

• 建設現場での安全管理のベストプラクティス
• 効率的な作業手順の提案
• コスト削減のアドバイス
• 品質管理のポイント
• チームマネジメントのコツ

実際のAI機能は今後実装予定です。`

      // コーチング履歴を保存
      const { error } = await supabase
        .from('ai_coaching')
        .insert({
          user_id: user.user.id,
          project_id: projectId,
          question: safeQuestion,
          answer: sanitizeUnicodeForJSON(answer)
        })

      if (error) {
        console.error('Coaching history save error:', error)
      }

      return {
        success: true,
        data: { answer },
        message: 'AIコーチからの回答を取得しました'
      }
    } catch (error) {
      console.error('AI coaching API error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'AIコーチング機能でエラーが発生しました'
      }
    }
  }

  // 月次進捗データ取得（プライベートメソッド）
  private static async getMonthlyProgress(companyId: string) {
    try {
      // 簡略化されたダミーデータ
      const months = ['1月', '2月', '3月', '4月', '5月', '6月']
      return months.map(month => ({
        month,
        budget: Math.floor(Math.random() * 10000000) + 5000000,
        costs: Math.floor(Math.random() * 8000000) + 3000000,
        profit: Math.floor(Math.random() * 3000000) + 1000000
      }))
    } catch (error) {
      console.error('Monthly progress error:', error)
      return []
    }
  }

  // AI日報解析（非同期処理）
  private static async analyzeReportAsync(reportId: string) {
    try {
      // TODO: OpenAI APIと連携
      console.log(`AI analysis started for report: ${reportId}`)

      // ダミーの解析結果
      setTimeout(async () => {
        if (!supabase) return
        await supabase
          .from('reports')
          .update({
            ai_analysis: 'AI解析完了: 作業効率が良好です。安全管理も適切に行われています。',
            man_hours: Math.random() * 8 + 4 // 4-12時間のランダムな工数
          })
          .eq('id', reportId)
      }, 3000)
    } catch (error) {
      console.error('AI analysis error:', error)
    }
  }

  // OCR処理（非同期処理）
  private static async processOCRAsync(receiptId: string) {
    try {
      // TODO: Google Cloud Vision APIと連携
      console.log(`OCR processing started for receipt: ${receiptId}`)

      // ダミーのOCR結果
      setTimeout(async () => {
        const dummyData = {
          vendor: 'サンプル商店',
          total: 15000,
          date: new Date().toISOString().split('T')[0],
          items: [
            { name: '材料A', price: 8000 },
            { name: '材料B', price: 7000 }
          ]
        }

        if (!supabase) return
        await supabase
          .from('receipts')
          .update({
            status: 'processed',
            raw_text: 'OCRで読み取った生テキスト...',
            processed_data: dummyData,
            confidence_score: 0.95,
            processed_at: new Date().toISOString()
          })
          .eq('id', receiptId)
      }, 5000)
    } catch (error) {
      console.error('OCR processing error:', error)
    }
  }
}

export type MissingField = { key: string; label: string; type: string }

export type BlocksResponse = {
  blocks: any
  meta: any
  missing_fields: MissingField[]
  previewUrl?: string | null
}

export type EstimatePreviewPayload = {
  draft: EstimateDraft
  previewUrl: string | null
  meta: any
}

export type InvoicePreviewPayload = {
  draft: InvoiceDraft
  previewUrl: string | null
  meta: any
}

const TEMPLATE_PREFIX = (process.env.EXPO_PUBLIC_TEMPLATE_PREFIX || 'templates').replace(/\/$/, '')

const templateFromPrefix = (filename: string) => `${TEMPLATE_PREFIX}/${filename}`

export const TEMPLATE_ESTIMATE_KEY = templateFromPrefix('estimate.pdf')
export const TEMPLATE_INVOICE_STANDARD_KEY = templateFromPrefix('invoice-standard.pdf')
export const TEMPLATE_INVOICE_PROGRESS_KEY = templateFromPrefix('invoice-progress.pdf')
const SUPABASE_PROJECT_REF =
  process.env.EXPO_PUBLIC_SUPABASE_PROJECT_REF ||
  process.env.SUPABASE_PROJECT_REF ||
  'aerscsgzulqfsecltyjz'

console.log('TEMPLATE_PREFIX=', process.env.EXPO_PUBLIC_TEMPLATE_PREFIX)
console.log('TEMPLATE_ESTIMATE_KEY=', TEMPLATE_ESTIMATE_KEY)
let anonToken: string | null = null
const DEMO_KEY = 'craftdy_use_demo'

let demoFlag = false
let demoLoaded = false
const API_BASE = (process.env.EXPO_PUBLIC_HOST_BASE || '').replace(/\/$/, '')
const SUPABASE_ANON_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  ''

export async function loadDemoFlag(): Promise<boolean> {
  if (!demoLoaded) {
    const mode = await getAppMode()
    demoFlag = mode === 'demo'
    demoLoaded = true
  }
  return demoFlag
}

export function isDemoEnabled() {
  return demoFlag
}

export async function setDemoFlag(flag: boolean) {
  demoFlag = flag
  demoLoaded = true
  try {
    if (flag) {
      await AsyncStorage.setItem(DEMO_KEY, '1')
    } else {
      await AsyncStorage.removeItem(DEMO_KEY)
    }
  } catch (error) {
    console.warn('[api] failed to persist demo flag', error)
  }
}

function withDemo(path: string, opts?: { demo?: boolean }) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  const useDemo = opts?.demo ?? demoFlag
  if (!useDemo) return normalizedPath
  return normalizedPath.includes('?') ? `${normalizedPath}&demo=1` : `${normalizedPath}?demo=1`
}

async function getAuthHeaders() {
  if (!SUPABASE_ANON_KEY) {
    throw new Error('Supabase anon key is not configured')
  }

  const token = getAccessToken()

  if (!token) {
    throw new Error('Authorization token is not available')
  }

  return {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${token}`,
  }
}

async function invokeEdgeFunction<T>(
  path: string,
  body: Record<string, unknown> = {},
  opts?: { demo?: boolean }
): Promise<T> {
  if (!supabase) {
    throw new Error('Supabase client is not initialized')
  }

  const functionName = path.replace(/^\//, '')
  const invokeOptions: {
    body: Record<string, unknown>
    headers: Record<string, string>
    query?: Record<string, string>
  } = {
    body,
    headers: { 'Content-Type': 'application/json' },
  }

  const useDemo = opts?.demo ?? demoFlag
  if (useDemo) {
    invokeOptions.query = { demo: '1' }
  }

  const { data, error } = await supabase.functions.invoke<T>(functionName, invokeOptions)
  if (error) {
    throw new Error(error.message ?? 'Supabase function invocation failed')
  }
  if (data == null) {
    throw new Error('Supabase function returned no data')
  }
  return data
}

export async function genInvoice(
  body: Record<string, any>,
  opts?: { demo?: boolean }
): Promise<BlocksResponse> {
  if (!API_BASE) {
    throw new Error('EXPO_PUBLIC_HOST_BASE is not configured')
  }

  return callEdge<BlocksResponse>('invoices/generate', body, {
    demo: opts?.demo ?? demoFlag,
    anonKey: SUPABASE_ANON_KEY,
    projectRef: SUPABASE_PROJECT_REF,
    hostBase: API_BASE,
  })
}

export function genEstimate(payload: any, opts?: { demo?: boolean }) {
  if (!API_BASE) {
    throw new Error('EXPO_PUBLIC_HOST_BASE is not configured')
  }

  return callEdge<BlocksResponse>('estimates/generate', payload, {
    demo: opts?.demo ?? demoFlag,
    anonKey: SUPABASE_ANON_KEY,
    projectRef: SUPABASE_PROJECT_REF,
    hostBase: API_BASE,
  })
}

export async function fetchEstimateDemo(): Promise<EstimatePreviewPayload> {
  const templateKey = await getTemplateKey('estimate', 'demo', 'demo')
  const body = { projectId: 'demo', template_key: templateKey }
  console.log('estimate template_key (demo) =', body.template_key)
  const response = await genEstimate(body, { demo: true })
  console.log('estimate preview:', response?.blocks?.actions?.preview_pdf?.url ?? response?.previewUrl ?? null)
  return mapEstimateResponse(response, templateKey)
}

export async function fetchInvoiceDemoNormal(): Promise<InvoicePreviewPayload> {
  const templateKey = await getTemplateKey('invoiceStandard', 'demo', 'demo')
  const response = await genInvoice(
    { projectId: 'demo', type: 'normal', template_key: templateKey },
    { demo: true }
  )
  return mapInvoiceResponse(response, 'normal')
}

export async function fetchInvoiceDemoProgress(): Promise<InvoicePreviewPayload> {
  const templateKey = await getTemplateKey('invoiceProgress', 'demo', 'demo')
  const response = await genInvoice(
    { projectId: 'demo', type: 'progress', template_key: templateKey },
    { demo: true }
  )
  return mapInvoiceResponse(response, 'progress')
}

export async function updateEstimateFromDraft(draft: EstimateDraft): Promise<EstimatePreviewPayload> {
  const { mode, scopeId } = await CraftdyAPI.getCurrentScope()
  const templateKey = await getTemplateKey('estimate', mode, scopeId)
  const response = await genEstimate({ draft, template_key: templateKey })
  return mapEstimateResponse(response, templateKey)
}

export async function updateInvoiceFromDraft(draft: InvoiceDraft): Promise<InvoicePreviewPayload> {
  const { mode, scopeId } = await CraftdyAPI.getCurrentScope()
  const templateKey = await getTemplateKey(
    draft.kind === 'progress' ? 'invoiceProgress' : 'invoiceStandard',
    mode,
    scopeId
  )
  const response = await genInvoice({
    draft,
    type: draft.kind,
    template_key: templateKey,
  })
  return mapInvoiceResponse(response, draft.kind)
}

function mapEstimateResponse(response: BlocksResponse, templateKey: string): EstimatePreviewPayload {
  const summary = response?.blocks?.summary ?? {}
  const items = Array.isArray(response?.blocks?.items) ? response.blocks.items : []
  const previewFromServer = response?.blocks?.actions?.preview_pdf?.url ?? null
  const shouldForceUserTemplate =
    typeof process.env.EXPO_PUBLIC_TEMPLATE_PREFIX === 'string' &&
    process.env.EXPO_PUBLIC_TEMPLATE_PREFIX.startsWith('user-templates/')
  const forceUserTemplateUrl = shouldForceUserTemplate
    ? `https://${SUPABASE_PROJECT_REF}.supabase.co/storage/v1/object/public/${templateKey}`
    : null
  const previewUrl = forceUserTemplateUrl || previewFromServer || null

  const draft: EstimateDraft = {
    title: ensureString(summary.title, '見積書'),
    customer: ensureString(summary.customer, '宛先未設定'),
    project_name: ensureString(summary.project_name, 'プロジェクト未設定'),
    subtotal: ensureNumber(summary.subtotal),
    tax: ensureNumber(summary.tax),
    total: ensureNumber(summary.total),
    items: items.map(normalizeEstimateItem),
  }

  return {
    draft,
    previewUrl,
    meta: response?.meta ?? {},
  }
}

function mapInvoiceResponse(response: BlocksResponse, fallbackKind: 'normal' | 'progress'): InvoicePreviewPayload {
  const summary = response?.blocks?.summary ?? {}
  const items = Array.isArray(response?.blocks?.items) ? response.blocks.items : []
  const kind = summary.kind === 'progress' || summary.kind === 'normal' ? summary.kind : fallbackKind
  const draft: InvoiceDraft = {
    title: ensureString(summary.title, kind === 'progress' ? '出来高請求書' : '請求書'),
    customer: ensureString(summary.customer, '宛先未設定'),
    project_name: ensureString(summary.project_name, 'プロジェクト未設定'),
    subtotal: ensureNumber(summary.subtotal),
    tax: ensureNumber(summary.tax),
    total: ensureNumber(summary.total),
    closing_day: typeof summary.closing_day === 'number' ? summary.closing_day : undefined,
    payment_term_label: typeof summary.payment_term_label === 'string' ? summary.payment_term_label : undefined,
    items: items.map(normalizeInvoiceItem),
    kind,
  }

  return {
    draft,
    previewUrl: response?.blocks?.actions?.preview_pdf?.url ?? null,
    meta: response?.meta ?? {},
  }
}

function normalizeEstimateItem(entry: any): StructuredEstimateItem {
  const label = ensureString(entry?.label, '項目')
  const quantity = ensureNumber(entry?.quantity, 0)
  const unit = ensureString(entry?.unit, '式')
  const unit_price = ensureNumber(entry?.unit_price, 0)
  const amount = ensureNumber(entry?.amount, quantity * unit_price)
  const note = typeof entry?.note === 'string' ? entry.note : undefined
  return { label, quantity, unit, unit_price, amount, note }
}

function normalizeInvoiceItem(entry: any): StructuredInvoiceItem {
  const label = ensureString(entry?.label, '項目')
  const quantity = typeof entry?.quantity === 'number' ? entry.quantity : undefined
  const unit = typeof entry?.unit === 'string' ? entry.unit : undefined
  const unit_price = typeof entry?.unit_price === 'number' ? entry.unit_price : undefined
  const amount = ensureNumber(entry?.amount, (quantity ?? 0) * (unit_price ?? 0))
  const note = typeof entry?.note === 'string' ? entry.note : undefined
  return { label, quantity, unit, unit_price, amount, note }
}

function ensureNumber(value: any, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function ensureString(value: any, fallback: string): string {
  return typeof value === 'string' && value.trim().length ? value : fallback
}

export type PreviewEnv = {
  hostBase: string
  anonKey: string
  projectRef: string
}

export async function getAnonToken(anonKey: string, projectRef: string): Promise<string> {
  if (anonToken) return anonToken
  if (!projectRef) throw new Error('projectRef is required for anon token')
  const response = await fetch(`https://${projectRef}.supabase.co/auth/v1/signup?provider=anonymous`, {
    method: 'POST',
    headers: {
      apikey: anonKey,
      'Content-Type': 'application/json',
    },
    body: '{}',
  })
  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`anon signup failed: ${response.status} ${text}`.trim())
  }
  const json = await response.json().catch(() => ({}))
  const token = json?.access_token
  if (typeof token !== 'string' || !token) {
    throw new Error('anon signup response missing access_token')
  }
  anonToken = token
  return token
}

export async function callEdge<T = any>(
  path: string,
  body: Record<string, unknown>,
  opts: { demo?: boolean; anonKey: string; projectRef: string; hostBase: string }
): Promise<T> {
  const base = opts.hostBase.replace(/\/$/, '')
  const endpointPath = path.replace(/^\//, '')
  let url = `${base}/${endpointPath}`
  if (opts.demo) {
    url += url.includes('?') ? '&demo=1' : '?demo=1'
  }

  const token = await getAnonToken(opts.anonKey, opts.projectRef)

  const makeRequest = async (authToken: string) =>
    fetch(url, {
      method: 'POST',
      headers: {
        apikey: opts.anonKey,
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body ?? {}),
    })

  let response = await makeRequest(token)
  if (response.status === 401) {
    anonToken = null
    const refreshed = await getAnonToken(opts.anonKey, opts.projectRef)
    response = await makeRequest(refreshed)
  }

  if (!response.ok) {
    const text = await response.text().catch(() => '')

    // 詳細なログ出力
    console.error(`[API Error]
Endpoint: ${url}
Status: ${response.status}
Response: ${text}
Payload: ${JSON.stringify(body)}`)

    // UI フィードバック
    const { Alert } = require('react-native')
    if (response.status === 401) {
      Alert.alert(
        '認証エラー',
        'セッションの有効期限が切れています。\nターミナルで sh scripts/refresh-token.sh を実行し、アプリを再起動してください。',
        [{ text: 'OK' }]
      )
    } else {
      Alert.alert(
        'エラー',
        `APIリクエストに失敗しました (${response.status})\n${text.slice(0, 100)}${text.length > 100 ? '...' : ''}`,
        [{ text: 'OK' }]
      )
    }

    throw new Error(`edge call failed: ${response.status} ${text}`.trim())
  }

  return (await response.json()) as T
}

export async function previewEstimate(projectId: string, templateKey: string, env: PreviewEnv) {
  const body = { projectId, template_key: templateKey }
  return callEdge<BlocksResponse>('estimates/generate', body, {
    demo: true,
    anonKey: env.anonKey,
    projectRef: env.projectRef,
    hostBase: env.hostBase,
  })
}

export async function previewInvoice(
  projectId: string,
  type: 'normal' | 'progress',
  templateKey: string,
  env: PreviewEnv
) {
  const body = { projectId, type, template_key: templateKey }
  return callEdge<BlocksResponse>('invoices/generate', body, {
    demo: true,
    anonKey: env.anonKey,
    projectRef: env.projectRef,
    hostBase: env.hostBase,
  })
}

const toISODate = (date: Date) => date.toISOString().slice(0, 10)

export function thisMonthRange() {
  const today = new Date()
  const from = new Date(today.getFullYear(), today.getMonth(), 1)
  const to = new Date(today.getFullYear(), today.getMonth() + 1, 0)
  return { from: toISODate(from), to: toISODate(to) }
}

export function lastMonthRange() {
  const today = new Date()
  const from = new Date(today.getFullYear(), today.getMonth() - 1, 1)
  const to = new Date(today.getFullYear(), today.getMonth(), 0)
  return { from: toISODate(from), to: toISODate(to) }
}
