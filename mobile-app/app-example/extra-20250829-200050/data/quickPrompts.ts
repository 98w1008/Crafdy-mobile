/**
 * クイックプロンプトデータ
 * FABアクションと重複しないプロンプト文言を管理
 * 使用回数によるソート機能付き
 */

// =============================================================================
// TYPES
// =============================================================================

export interface QuickPrompt {
  id: string
  /** 表示文言（プロンプト形式） */
  label: string
  /** AIに送信されるプロンプトテキスト */
  promptText: string
  /** アイコン名 */
  icon: string
  /** カテゴリ */
  category: 'work' | 'report' | 'estimate' | 'expense' | 'support'
  /** 使用回数（学習機能用） */
  usageCount?: number
  /** 優先度（高いほど前に表示） */
  priority?: number
}

export interface QuickPromptCategory {
  id: string
  name: string
  color: string
}

// =============================================================================
// DATA
// =============================================================================

/** プロンプトカテゴリ定義 */
export const PROMPT_CATEGORIES: QuickPromptCategory[] = [
  { id: 'work', name: '作業', color: '#2196F3' },
  { id: 'report', name: '報告', color: '#4CAF50' },
  { id: 'estimate', name: '見積', color: '#FF9800' },
  { id: 'expense', name: '経費', color: '#9C27B0' },
  { id: 'support', name: 'サポート', color: '#607D8B' },
]

/** 基本クイックプロンプト */
export const DEFAULT_QUICK_PROMPTS: QuickPrompt[] = [
  // 作業関連
  {
    id: 'work-status',
    label: '今日の作業内容をまとめて',
    promptText: '本日の作業内容をまとめて報告書形式で作成してください。進捗状況、完了した作業、明日の予定を含めてお願いします。',
    icon: 'clipboard-text',
    category: 'work',
    priority: 10,
    usageCount: 0,
  },
  {
    id: 'work-progress',
    label: '作業進捗を確認したい',
    promptText: '現在の作業進捗状況を教えてください。予定と比べてどのような状況でしょうか？',
    icon: 'chart-line',
    category: 'work',
    priority: 8,
    usageCount: 0,
  },
  {
    id: 'work-schedule',
    label: '明日の作業予定を教えて',
    promptText: '明日の作業予定と必要な準備について教えてください。',
    icon: 'calendar-clock',
    category: 'work',
    priority: 7,
    usageCount: 0,
  },

  // 見積・請求関連
  {
    id: 'estimate-rough',
    label: 'この現場の概算見積を出して',
    promptText: '現在の現場について、これまでの作業内容と進捗を基に概算見積を作成してください。',
    icon: 'calculator',
    category: 'estimate',
    priority: 9,
    usageCount: 0,
  },
  {
    id: 'invoice-monthly',
    label: '今月分の請求金額を計算して',
    promptText: '今月の作業実績を基に請求金額を計算してください。詳細な内訳も含めてお願いします。',
    icon: 'file-invoice',
    category: 'estimate',
    priority: 8,
    usageCount: 0,
  },

  // 勤怠・報告関連
  {
    id: 'attendance-check',
    label: '今月の出勤状況を確認したい',
    promptText: '今月の出勤状況と勤務時間を確認して、勤怠表を作成してください。',
    icon: 'calendar-check',
    category: 'report',
    priority: 7,
    usageCount: 0,
  },
  {
    id: 'daily-report',
    label: '日報を簡単に作成したい',
    promptText: '本日の作業内容を基に日報を作成してください。作業時間、進捗、気づいた点を含めてお願いします。',
    icon: 'note-edit',
    category: 'report',
    priority: 9,
    usageCount: 0,
  },

  // 経費・レシート関連
  {
    id: 'expense-organize',
    label: '経費の領収書を整理したい',
    promptText: 'レシートや領収書の情報を整理して、経費精算書を作成する手順を教えてください。',
    icon: 'receipt',
    category: 'expense',
    priority: 6,
    usageCount: 0,
  },
  {
    id: 'expense-summary',
    label: '今月の経費をまとめて',
    promptText: '今月発生した経費をカテゴリ別にまとめて、経費レポートを作成してください。',
    icon: 'credit-card',
    category: 'expense',
    priority: 5,
    usageCount: 0,
  },

  // 現場・サポート関連
  {
    id: 'site-switch',
    label: '別の現場の状況を見せて',
    promptText: '他の進行中の現場の状況と今後の予定について教えてください。',
    icon: 'map-marker-multiple',
    category: 'support',
    priority: 6,
    usageCount: 0,
  },
  {
    id: 'help-general',
    label: 'この作業のやり方を教えて',
    promptText: '現在の作業について、効率的な進め方やコツを教えてください。',
    icon: 'help-circle',
    category: 'support',
    priority: 4,
    usageCount: 0,
  },
  {
    id: 'material-check',
    label: '必要な材料を確認したい',
    promptText: '今後の作業で必要になる材料や工具を教えてください。発注が必要なものがあれば併せてお願いします。',
    icon: 'package-variant',
    category: 'work',
    priority: 5,
    usageCount: 0,
  },
]

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * プロンプトを使用回数と優先度でソート
 */
export function sortPromptsByUsage(prompts: QuickPrompt[]): QuickPrompt[] {
  return [...prompts].sort((a, b) => {
    // 使用回数が多い順、同じ場合は優先度が高い順
    const usageA = a.usageCount || 0
    const usageB = b.usageCount || 0
    const priorityA = a.priority || 0
    const priorityB = b.priority || 0
    
    if (usageA !== usageB) {
      return usageB - usageA
    }
    return priorityB - priorityA
  })
}

/**
 * カテゴリでプロンプトをフィルタ
 */
export function filterPromptsByCategory(
  prompts: QuickPrompt[], 
  category: QuickPrompt['category']
): QuickPrompt[] {
  return prompts.filter(prompt => prompt.category === category)
}

/**
 * プロンプトの使用回数を増加
 */
export function incrementPromptUsage(
  prompts: QuickPrompt[], 
  promptId: string
): QuickPrompt[] {
  return prompts.map(prompt => 
    prompt.id === promptId 
      ? { ...prompt, usageCount: (prompt.usageCount || 0) + 1 }
      : prompt
  )
}

/**
 * よく使われるプロンプトを取得（上位N件）
 */
export function getTopUsedPrompts(
  prompts: QuickPrompt[], 
  limit: number = 6
): QuickPrompt[] {
  return sortPromptsByUsage(prompts).slice(0, limit)
}

/**
 * カテゴリ情報を取得
 */
export function getCategoryInfo(categoryId: string): QuickPromptCategory | undefined {
  return PROMPT_CATEGORIES.find(cat => cat.id === categoryId)
}

/**
 * AIレスポンス生成（模擬）
 */
export function generateMockAIResponse(prompt: QuickPrompt): string {
  const responses: Record<string, string> = {
    'work-status': 'かしこまりました。本日の作業内容をまとめますね。現在の進捗状況と明日の予定も併せて整理いたします。',
    'estimate-rough': '現場の概算見積を作成いたします。これまでの作業実績と今後の予定を基に計算しますね。',
    'attendance-check': '今月の出勤状況を確認いたします。勤務時間の集計も併せて行いますね。',
    'daily-report': '本日の日報を作成いたします。作業内容、進捗、気づいた点をまとめますね。',
    'expense-organize': '経費の整理をサポートいたします。領収書の分類と精算書作成の手順をご案内しますね。',
    'site-switch': '他の現場の状況をお調べいたします。進捗と今後の予定を確認しますね。',
  }
  
  return responses[prompt.id] || `「${prompt.label}」について詳しくサポートいたします。どのような点をお手伝いしましょうか？`
}