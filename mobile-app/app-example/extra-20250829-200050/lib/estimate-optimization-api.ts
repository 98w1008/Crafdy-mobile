import { supabase } from './supabase'
import {
  Estimate,
  CreateEstimateData,
  UpdateEstimateData,
  EstimateListResponse,
  EstimateResponse,
  EstimateOptimizationResult,
  OptimizeEstimateRequest,
  PriceBias,
  LearningData,
  BiasLearningResult,
  EstimateFilters,
  EstimateStats,
  EstimateExportOptions,
  ApiResponse,
} from '../types/client'

/**
 * 見積最適化API関数群
 * 学習機能付き価格バイアスによる見積金額の最適化
 */

/**
 * 見積一覧の取得
 */
export const getEstimates = async (filters?: EstimateFilters): Promise<EstimateListResponse> => {
  try {
    console.log('📋 Fetching estimates list')
    
    const { data: user } = await supabase.auth.getUser()
    if (!user.user) {
      return { data: [], count: 0, error: '認証が必要です' }
    }

    const { data: userProfile } = await supabase
      .from('users')
      .select('role, company_id')
      .eq('id', user.user.id)
      .single()

    if (!userProfile) {
      return { data: [], count: 0, error: 'ユーザープロファイルが見つかりません' }
    }

    let query = supabase
      .from('estimates')
      .select(`
        *,
        project:projects(id, name),
        client:clients(id, name, contact_person),
        creator:users!created_by(id, full_name)
      `, { count: 'exact' })
      .eq('company_id', userProfile.company_id)

    // 権限制御：職長は金額を見ることができない
    if (userProfile.role !== 'admin') {
      query = query.select(`
        id, project_id, client_id, title, description, status,
        confidence_score, acceptance_probability,
        created_at, updated_at, created_by,
        project:projects(id, name),
        client:clients(id, name, contact_person),
        creator:users!created_by(id, full_name)
      `, { count: 'exact' })
    }

    // フィルター適用
    if (filters?.client_id) {
      query = query.eq('client_id', filters.client_id)
    }

    if (filters?.project_id) {
      query = query.eq('project_id', filters.project_id)
    }

    if (filters?.status && filters.status.length > 0) {
      query = query.in('status', filters.status)
    }

    if (filters?.date_from) {
      query = query.gte('created_at', filters.date_from)
    }

    if (filters?.date_to) {
      query = query.lte('created_at', filters.date_to)
    }

    if (filters?.search_query) {
      query = query.or(`title.ilike.%${filters.search_query}%,description.ilike.%${filters.search_query}%`)
    }

    // 代表のみ金額フィルターを適用
    if (userProfile.role === 'admin') {
      if (filters?.amount_min !== undefined) {
        query = query.gte('estimated_amount', filters.amount_min)
      }

      if (filters?.amount_max !== undefined) {
        query = query.lte('estimated_amount', filters.amount_max)
      }
    }

    query = query.order('created_at', { ascending: false })

    const { data, error, count } = await query

    if (error) {
      console.error('❌ Error fetching estimates:', error)
      return { data: [], count: 0, error: error.message }
    }

    console.log(`✅ Fetched ${data?.length || 0} estimates`)
    return { data: data || [], count: count || 0 }
  } catch (error) {
    console.error('❌ Unexpected error fetching estimates:', error)
    return { data: [], count: 0, error: '見積の取得に失敗しました' }
  }
}

/**
 * 個別見積の取得
 */
export const getEstimate = async (id: string): Promise<EstimateResponse> => {
  try {
    console.log('🎯 Fetching estimate:', id)
    
    const { data: user } = await supabase.auth.getUser()
    if (!user.user) {
      return { data: null, error: '認証が必要です' }
    }

    const { data: userProfile } = await supabase
      .from('users')
      .select('role, company_id')
      .eq('id', user.user.id)
      .single()

    if (!userProfile) {
      return { data: null, error: 'ユーザープロファイルが見つかりません' }
    }

    // 権限に応じて取得するフィールドを制御
    let selectFields = `
      *,
      project:projects(id, name),
      client:clients(id, name, contact_person),
      creator:users!created_by(id, full_name)
    `

    if (userProfile.role !== 'admin') {
      // 職長は金額情報を見ることができない
      selectFields = `
        id, project_id, client_id, title, description, status,
        confidence_score, acceptance_probability, reasoning,
        created_at, updated_at, created_by,
        project:projects(id, name),
        client:clients(id, name, contact_person),
        creator:users!created_by(id, full_name)
      `
    }

    const { data, error } = await supabase
      .from('estimates')
      .select(selectFields)
      .eq('id', id)
      .eq('company_id', userProfile.company_id)
      .single()

    if (error) {
      console.error('❌ Error fetching estimate:', error)
      return { data: null, error: error.message }
    }

    console.log('✅ Estimate fetched successfully')
    return { data }
  } catch (error) {
    console.error('❌ Unexpected error fetching estimate:', error)
    return { data: null, error: '見積の取得に失敗しました' }
  }
}

/**
 * 見積の最適化処理
 * 学習済みの価格バイアスを使用して最適な金額を算出
 */
export const optimizeEstimate = async (request: OptimizeEstimateRequest): Promise<ApiResponse<EstimateOptimizationResult>> => {
  try {
    console.log('🧮 Optimizing estimate for client:', request.client_id)
    
    const { data: user } = await supabase.auth.getUser()
    if (!user.user) {
      return { error: { message: '認証が必要です' } }
    }

    const { data: userProfile } = await supabase
      .from('users')
      .select('role, company_id')
      .eq('id', user.user.id)
      .single()

    if (!userProfile || userProfile.role !== 'admin') {
      return { error: { message: '代表のみ見積最適化を利用できます' } }
    }

    // クライアントの価格バイアスデータを取得
    const { data: biasData, error: biasError } = await supabase
      .from('price_biases')
      .select('*')
      .eq('client_id', request.client_id)

    if (biasError) {
      console.warn('⚠️ Failed to fetch bias data:', biasError)
    }

    // 過去の取引履歴を取得（学習データとして使用）
    const { data: historyData, error: historyError } = await supabase
      .from('learning_data')
      .select('*')
      .eq('client_id', request.client_id)
      .order('created_at', { ascending: false })
      .limit(10)

    if (historyError) {
      console.warn('⚠️ Failed to fetch history data:', historyError)
    }

    // 最適化ロジックの実行
    const optimizationResult = calculateOptimizedPrice(
      request,
      biasData || [],
      historyData || []
    )

    // 結果を監査ログに記録
    try {
      await supabase.rpc('record_audit_log', {
        p_entity_type: 'estimates',
        p_entity_id: 'optimization_' + Date.now(),
        p_action: 'optimize',
        p_before_data: request,
        p_after_data: optimizationResult,
        p_description: `見積最適化を実行（クライアント: ${request.client_id}）`
      })
    } catch (auditError) {
      console.warn('⚠️ Failed to record audit log:', auditError)
    }

    console.log('✅ Estimate optimization completed')
    return { data: optimizationResult }
  } catch (error) {
    console.error('❌ Unexpected error optimizing estimate:', error)
    return { error: { message: '見積最適化に失敗しました' } }
  }
}

/**
 * 最適化ロジックの実装
 */
const calculateOptimizedPrice = (
  request: OptimizeEstimateRequest,
  biasData: PriceBias[],
  historyData: LearningData[]
): EstimateOptimizationResult => {
  const { estimated_amount } = request
  let adjustment = 0
  const biasFactors: { factor_type: string; impact: number; description: string }[] = []

  // 基本的な信頼度
  let baseConfidence = 0.7

  // 1. 緊急度による調整
  if (request.urgency_level) {
    const urgencyBias = biasData.find(b => b.factor_type === 'urgency')
    let urgencyImpact = 0
    
    switch (request.urgency_level) {
      case 'high':
        urgencyImpact = urgencyBias?.factor_value || 0.15 // デフォルト15%上乗せ
        break
      case 'medium':
        urgencyImpact = urgencyBias?.factor_value || 0.05 // デフォルト5%上乗せ
        break
      case 'low':
        urgencyImpact = urgencyBias?.factor_value || -0.05 // デフォルト5%削減
        break
    }
    
    adjustment += urgencyImpact
    biasFactors.push({
      factor_type: 'urgency',
      impact: urgencyImpact,
      description: `緊急度: ${request.urgency_level} (${(urgencyImpact * 100).toFixed(1)}%)`
    })
  }

  // 2. 競合状況による調整
  if (request.competition_level) {
    const competitionBias = biasData.find(b => b.factor_type === 'competition')
    let competitionImpact = 0
    
    switch (request.competition_level) {
      case 'high':
        competitionImpact = competitionBias?.factor_value || -0.10 // デフォルト10%削減
        break
      case 'medium':
        competitionImpact = competitionBias?.factor_value || -0.05 // デフォルト5%削減
        break
      case 'low':
        competitionImpact = competitionBias?.factor_value || 0.05 // デフォルト5%上乗せ
        break
    }
    
    adjustment += competitionImpact
    biasFactors.push({
      factor_type: 'competition',
      impact: competitionImpact,
      description: `競合: ${request.competition_level} (${(competitionImpact * 100).toFixed(1)}%)`
    })
  }

  // 3. プロジェクト規模による調整
  if (request.project_scale) {
    const scaleBias = biasData.find(b => b.factor_type === 'project_scale')
    let scaleImpact = 0
    
    switch (request.project_scale) {
      case 'large':
        scaleImpact = scaleBias?.factor_value || -0.05 // デフォルト5%削減（大規模割引）
        break
      case 'medium':
        scaleImpact = scaleBias?.factor_value || 0
        break
      case 'small':
        scaleImpact = scaleBias?.factor_value || 0.10 // デフォルト10%上乗せ（小規模割増）
        break
    }
    
    adjustment += scaleImpact
    biasFactors.push({
      factor_type: 'project_scale',
      impact: scaleImpact,
      description: `規模: ${request.project_scale} (${(scaleImpact * 100).toFixed(1)}%)`
    })
  }

  // 4. 過去の取引実績による調整
  if (historyData.length > 0) {
    const acceptedDeals = historyData.filter(h => h.was_accepted)
    const acceptanceRate = acceptedDeals.length / historyData.length
    
    // 取引実績が良好な場合は価格を上げる余地がある
    const relationshipBias = biasData.find(b => b.factor_type === 'relationship')
    let relationshipImpact = relationshipBias?.factor_value || (acceptanceRate > 0.7 ? 0.05 : -0.05)
    
    adjustment += relationshipImpact
    baseConfidence += acceptanceRate * 0.2 // 過去の成功率に応じて信頼度を調整
    
    biasFactors.push({
      factor_type: 'relationship',
      impact: relationshipImpact,
      description: `関係性: 採択率${(acceptanceRate * 100).toFixed(1)}% (${(relationshipImpact * 100).toFixed(1)}%)`
    })
  }

  // 調整値の制限（-30%〜+50%の範囲）
  adjustment = Math.max(-0.30, Math.min(0.50, adjustment))

  // 最適化後の金額計算
  const optimized_amount = Math.round(estimated_amount * (1 + adjustment))
  const adjustment_percentage = adjustment * 100

  // 採択確率の計算（簡易的なモデル）
  const acceptance_probability = Math.max(0.1, Math.min(0.9, baseConfidence - Math.abs(adjustment) * 0.5))

  // 期待利益の計算（粗利率30%を仮定）
  const expected_profit = optimized_amount * 0.3 * acceptance_probability

  // 信頼度スコアの計算
  const confidence_score = Math.max(0.3, Math.min(1.0, baseConfidence - Math.abs(adjustment) * 0.3))

  // 根拠テキストの生成
  const reasoning = generateReasoning(biasFactors, adjustment_percentage, acceptance_probability)

  return {
    original_amount: estimated_amount,
    optimized_amount,
    adjustment_percentage,
    confidence_score,
    acceptance_probability,
    expected_profit,
    reasoning,
    bias_factors: biasFactors
  }
}

/**
 * 根拠テキストの生成
 */
const generateReasoning = (
  biasFactors: { factor_type: string; impact: number; description: string }[],
  adjustmentPercentage: number,
  acceptanceProbability: number
): string => {
  const factors = biasFactors.map(f => f.description).join('、')
  
  let reasoning = `過去の取引データと市場要因を分析した結果、`
  
  if (adjustmentPercentage > 0) {
    reasoning += `${adjustmentPercentage.toFixed(1)}%の価格上乗せが推奨されます。`
  } else if (adjustmentPercentage < 0) {
    reasoning += `${Math.abs(adjustmentPercentage).toFixed(1)}%の価格削減が推奨されます。`
  } else {
    reasoning += `現在の価格が適正と判断されます。`
  }
  
  if (biasFactors.length > 0) {
    reasoning += `\n\n主な調整要因: ${factors}`
  }
  
  reasoning += `\n\n採択確率: ${(acceptanceProbability * 100).toFixed(1)}%`
  
  return reasoning
}

/**
 * 見積作成
 */
export const createEstimate = async (estimateData: CreateEstimateData): Promise<EstimateResponse> => {
  try {
    console.log('➕ Creating new estimate')
    
    const { data: user } = await supabase.auth.getUser()
    if (!user.user) {
      return { data: null, error: '認証が必要です' }
    }

    const { data: userProfile } = await supabase
      .from('users')
      .select('role, company_id')
      .eq('id', user.user.id)
      .single()

    if (!userProfile) {
      return { data: null, error: 'ユーザープロファイルが見つかりません' }
    }

    const newEstimate = {
      ...estimateData,
      company_id: userProfile.company_id,
      created_by: user.user.id,
      status: 'draft' as const,
      confidence_score: 0.5,
      acceptance_probability: 0.5,
      expected_profit: estimateData.estimated_amount * 0.3,
      price_bias_factor: 0,
    }

    const { data, error } = await supabase
      .from('estimates')
      .insert(newEstimate)
      .select(`
        *,
        project:projects(id, name),
        client:clients(id, name, contact_person),
        creator:users!created_by(id, full_name)
      `)
      .single()

    if (error) {
      console.error('❌ Error creating estimate:', error)
      return { data: null, error: error.message }
    }

    console.log('✅ Estimate created successfully')
    return { data }
  } catch (error) {
    console.error('❌ Unexpected error creating estimate:', error)
    return { data: null, error: '見積の作成に失敗しました' }
  }
}

/**
 * 見積更新
 */
export const updateEstimate = async (id: string, updateData: UpdateEstimateData): Promise<EstimateResponse> => {
  try {
    console.log('📝 Updating estimate:', id)
    
    const { data: user } = await supabase.auth.getUser()
    if (!user.user) {
      return { data: null, error: '認証が必要です' }
    }

    const { data: userProfile } = await supabase
      .from('users')
      .select('role, company_id')
      .eq('id', user.user.id)
      .single()

    if (!userProfile) {
      return { data: null, error: 'ユーザープロファイルが見つかりません' }
    }

    const { data, error } = await supabase
      .from('estimates')
      .update(updateData)
      .eq('id', id)
      .eq('company_id', userProfile.company_id)
      .select(`
        *,
        project:projects(id, name),
        client:clients(id, name, contact_person),
        creator:users!created_by(id, full_name)
      `)
      .single()

    if (error) {
      console.error('❌ Error updating estimate:', error)
      return { data: null, error: error.message }
    }

    console.log('✅ Estimate updated successfully')
    return { data }
  } catch (error) {
    console.error('❌ Unexpected error updating estimate:', error)
    return { data: null, error: '見積の更新に失敗しました' }
  }
}

/**
 * 学習データの記録
 * 見積の最終結果を学習データとして記録し、将来の最適化に活用
 */
export const recordLearningData = async (
  clientId: string,
  projectCharacteristics: LearningData['project_characteristics'],
  finalAmount: number,
  wasAccepted: boolean,
  negotiationRounds: number = 1,
  timeToDicision: number = 7
): Promise<ApiResponse<boolean>> => {
  try {
    console.log('📚 Recording learning data for client:', clientId)
    
    const learningData: Omit<LearningData, 'created_at'> = {
      client_id: clientId,
      project_characteristics: projectCharacteristics,
      final_amount: finalAmount,
      was_accepted: wasAccepted,
      negotiation_rounds: negotiationRounds,
      time_to_decision: timeToDicision,
    }

    const { error } = await supabase
      .from('learning_data')
      .insert(learningData)

    if (error) {
      console.error('❌ Error recording learning data:', error)
      return { error: { message: error.message } }
    }

    // バイアス学習の更新を非同期で実行
    updateBiasLearning(clientId).catch(err => 
      console.warn('⚠️ Failed to update bias learning:', err)
    )

    console.log('✅ Learning data recorded successfully')
    return { data: true }
  } catch (error) {
    console.error('❌ Unexpected error recording learning data:', error)
    return { error: { message: '学習データの記録に失敗しました' } }
  }
}

/**
 * バイアス学習の更新
 * 蓄積された学習データを基に価格バイアスを自動更新
 */
const updateBiasLearning = async (clientId: string): Promise<void> => {
  try {
    // 最新の学習データを取得
    const { data: recentData } = await supabase
      .from('learning_data')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })
      .limit(20)

    if (!recentData || recentData.length < 5) {
      console.log('⚠️ Insufficient learning data for bias update')
      return
    }

    // 各要因ごとの学習結果を計算
    const biasUpdates = calculateBiasUpdates(recentData)

    // 既存のバイアスデータを更新または新規作成
    for (const update of biasUpdates) {
      await supabase
        .from('price_biases')
        .upsert({
          client_id: clientId,
          factor_type: update.factor_type,
          factor_value: update.factor_value,
          confidence: update.confidence,
          sample_size: update.sample_size,
          last_updated: new Date().toISOString(),
          description: update.description,
        })
    }

    console.log('✅ Bias learning updated successfully')
  } catch (error) {
    console.error('❌ Error updating bias learning:', error)
  }
}

/**
 * バイアス更新値の計算
 */
const calculateBiasUpdates = (learningData: LearningData[]) => {
  const updates: Omit<PriceBias, 'id' | 'client_id' | 'last_updated'>[] = []

  // 緊急度による影響を分析
  const urgencyHigh = learningData.filter(d => d.project_characteristics.urgency === 'high')
  const urgencyMedium = learningData.filter(d => d.project_characteristics.urgency === 'medium')
  const urgencyLow = learningData.filter(d => d.project_characteristics.urgency === 'low')

  if (urgencyHigh.length > 0) {
    const acceptanceRate = urgencyHigh.filter(d => d.was_accepted).length / urgencyHigh.length
    const avgAmount = urgencyHigh.reduce((sum, d) => sum + d.final_amount, 0) / urgencyHigh.length
    const baselineAmount = learningData.reduce((sum, d) => sum + d.final_amount, 0) / learningData.length
    
    updates.push({
      factor_type: 'urgency',
      factor_value: acceptanceRate > 0.7 ? 0.15 : 0.05, // 採択率が高ければ強気の価格設定
      confidence: Math.min(1, urgencyHigh.length / 10),
      sample_size: urgencyHigh.length,
      description: `緊急度高: 採択率${(acceptanceRate * 100).toFixed(1)}%`,
    })
  }

  // プロジェクト規模による影響を分析
  const scaleLarge = learningData.filter(d => d.project_characteristics.scale === 'large')
  if (scaleLarge.length > 0) {
    const acceptanceRate = scaleLarge.filter(d => d.was_accepted).length / scaleLarge.length
    
    updates.push({
      factor_type: 'project_scale',
      factor_value: acceptanceRate > 0.6 ? -0.03 : -0.08, // 大規模プロジェクトは割引が有効
      confidence: Math.min(1, scaleLarge.length / 8),
      sample_size: scaleLarge.length,
      description: `大規模: 採択率${(acceptanceRate * 100).toFixed(1)}%`,
    })
  }

  // 関係性（全体的な採択率）による影響
  const overallAcceptanceRate = learningData.filter(d => d.was_accepted).length / learningData.length
  updates.push({
    factor_type: 'relationship',
    factor_value: overallAcceptanceRate > 0.7 ? 0.08 : overallAcceptanceRate > 0.5 ? 0.03 : -0.05,
    confidence: Math.min(1, learningData.length / 15),
    sample_size: learningData.length,
    description: `関係性: 全体採択率${(overallAcceptanceRate * 100).toFixed(1)}%`,
  })

  return updates
}

/**
 * 見積統計の取得
 */
export const getEstimateStats = async (): Promise<ApiResponse<EstimateStats>> => {
  try {
    const { data: user } = await supabase.auth.getUser()
    if (!user.user) {
      return { error: { message: '認証が必要です' } }
    }

    const { data: userProfile } = await supabase
      .from('users')
      .select('role, company_id')
      .eq('id', user.user.id)
      .single()

    if (!userProfile || userProfile.role !== 'admin') {
      return { error: { message: '代表のみ統計を閲覧できます' } }
    }

    const { data: estimates } = await supabase
      .from('estimates')
      .select('status, estimated_amount, optimized_amount, confidence_score')
      .eq('company_id', userProfile.company_id)

    if (!estimates) {
      return { data: {
        total_estimates: 0,
        accepted_estimates: 0,
        rejected_estimates: 0,
        pending_estimates: 0,
        total_value: 0,
        accepted_value: 0,
        average_acceptance_rate: 0,
        average_confidence_score: 0,
      }}
    }

    const stats: EstimateStats = {
      total_estimates: estimates.length,
      accepted_estimates: estimates.filter(e => e.status === 'approved').length,
      rejected_estimates: estimates.filter(e => e.status === 'rejected').length,
      pending_estimates: estimates.filter(e => e.status === 'draft' || e.status === 'submitted').length,
      total_value: estimates.reduce((sum, e) => sum + (e.optimized_amount || e.estimated_amount), 0),
      accepted_value: estimates
        .filter(e => e.status === 'approved')
        .reduce((sum, e) => sum + (e.optimized_amount || e.estimated_amount), 0),
      average_acceptance_rate: estimates.length > 0 
        ? estimates.filter(e => e.status === 'approved').length / estimates.length
        : 0,
      average_confidence_score: estimates.length > 0
        ? estimates.reduce((sum, e) => sum + (e.confidence_score || 0.5), 0) / estimates.length
        : 0,
    }

    return { data: stats }
  } catch (error) {
    console.error('❌ Error fetching estimate stats:', error)
    return { error: { message: '統計データの取得に失敗しました' } }
  }
}