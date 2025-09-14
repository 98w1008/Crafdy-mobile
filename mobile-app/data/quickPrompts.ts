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
  { id: 'support', name: 'サポート', color: '#607D8B' },
]

/** 
 * Big Tech Style Quick Prompts - Clean and Simple
 */
export const DEFAULT_QUICK_PROMPTS: QuickPrompt[] = [
  {
    id: 'daily-report',
    label: '日報を作成する',
    promptText: '本日の作業内容をまとめて日報を作成します。',
    icon: 'clipboard-text',
    category: 'report',
    priority: 10,
    usageCount: 0,
  },
  {
    id: 'upload-receipt',
    label: 'レシート/搬入をアップロード',
    promptText: 'レシートや搬入資料をアップロードして記録します。',
    icon: 'camera',
    category: 'work',
    priority: 9,
    usageCount: 0,
  },
  {
    id: 'update-progress',
    label: '進捗を%で更新',
    promptText: '現在の作業進捗を%で更新します。',
    icon: 'chart-line',
    category: 'work',
    priority: 8,
    usageCount: 0,
  },
  {
    id: 'estimate-ai',
    label: '見積AIに投げる',
    promptText: 'AIを使って見積を作成します。',
    icon: 'calculator',
    category: 'estimate',
    priority: 7,
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
    'daily-report': '日報作成をサポートします。本日の作業内容と進捗をまとめます。',
    'upload-receipt': 'アップロード機能を開始します。カメラまたはファイルから選択してください。',
    'update-progress': '進捗更新画面を開きます。現在の完了率を入力してください。',
    'estimate-ai': '見積AI機能を起動します。作業内容から自動で見積を生成します。',
  }
  
  return responses[prompt.id] || `${prompt.label}機能をサポートします。`
}