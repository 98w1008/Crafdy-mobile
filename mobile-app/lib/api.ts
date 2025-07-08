import { supabase } from './supabase'

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
  // ダッシュボードデータ取得
  static async getDashboardSummary(): Promise<ApiResponse<DashboardSummary>> {
    try {
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
      const { data, error } = await supabase
        .from('reports')
        .insert({
          project_id: reportData.projectId,
          user_id: reportData.userId,
          content: reportData.content,
          work_date: reportData.workDate,
          weather: reportData.weather,
          workers_count: reportData.workersCount,
          photo_urls: reportData.photoUrls
        })
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

  // 見積書作成
  static async createEstimate(estimateData: EstimateData): Promise<ApiResponse<{ id: string }>> {
    try {
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

      // 見積書本体を作成
      const { data: estimate, error: estimateError } = await supabase
        .from('estimates')
        .insert({
          project_id: estimateData.projectId,
          company_id: userInfo.company_id,
          title: estimateData.title,
          description: estimateData.description,
          customer_name: estimateData.customerName,
          customer_email: estimateData.customerEmail,
          customer_address: estimateData.customerAddress,
          issue_date: estimateData.issueDate,
          due_date: estimateData.dueDate,
          created_by: user.user.id
        })
        .select('id')
        .single()

      if (estimateError) throw estimateError

      // 見積項目を作成
      if (estimateData.items.length > 0) {
        const items = estimateData.items.map((item, index) => ({
          estimate_id: estimate.id,
          name: item.name,
          description: item.description,
          quantity: item.quantity,
          unit: item.unit,
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
      const { data: user } = await supabase.auth.getUser()
      if (!user.user) {
        throw new Error('認証が必要です')
      }

      // TODO: OpenAI APIと連携してAI回答を生成
      const answer = `【AIコーチからの回答】
      
質問: ${question}

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
          question: question,
          answer: answer
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