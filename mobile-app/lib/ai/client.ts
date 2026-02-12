import { supabase, supabaseReady } from '@/lib/supabase'
import type { Block, ActionItem } from '@/ui/blocks'

const isMock = (() => {
  const value = process.env.EXPO_PUBLIC_AI_MOCK ?? process.env.AI_MOCK
  return value === undefined ? true : value !== '0' && value !== 'false'
})()

const ALLOWED_ACTIONS = new Set([
  'open_page',
  'export_csv',
  'preview_pdf',
  'materials.ingest',
  'estimate.draft',
  'invoice.create',
])

const MOCK_BLOCKS: Block[] = [
  {
    type: 'text',
    md: '渋谷オフィス改修の**今月材料集計**です。',
    v: 1,
  },
  {
    type: 'stats',
    v: 1,
    items: [
      { label: '材料費 今月', value: '¥482,300' },
      { label: '見積差異', value: '-¥18,200' },
    ],
  },
  {
    type: 'table',
    v: 1,
    columns: ['品名', '数量', '単価', '金額'],
    rows: [
      ['ALCパネル', '24枚', '¥3,200', '¥76,800'],
      ['ボードアンカー(100個)', '2箱', '¥980', '¥1,960'],
    ],
  },
  {
    type: 'actions',
    v: 1,
    items: [
      { kind: 'primary', label: '請求書を作成', action: 'open_page', params: { page: 'invoice', draftId: 'inv_2025-01' } },
      { kind: 'ghost', label: 'Excel出力', action: 'export_csv', params: { type: 'materials', month: '2025-01' } },
    ],
  },
  {
    type: 'suggest',
    v: 1,
    chips: ['見積草案を作る', '材料だけ再計算', '今日の作業を要約'],
  },
]

type AssistPayload = {
  projectId?: string | null
  message: string
}

type ToolPayload = {
  action: string
  params?: Record<string, any>
}

export type ToolRunResult =
  | { kind: 'csv'; filename: string; content: string }
  | { kind: 'open_page'; url: string }
  | { kind: 'blocks'; blocks: Block[] }
  | { kind: 'error'; message: string }
  | { kind: 'unknown'; data: unknown }

export async function invokeAssist(payload: AssistPayload): Promise<Block[]> {
  if (isMock || !supabaseReady || !supabase) {
    await delay(400)
    return MOCK_BLOCKS
  }

  const { data, error } = await supabase.functions.invoke('ai-assist', {
    body: payload,
  })

  if (error) {
    throw new Error(error.message || 'assist_failed')
  }

  if (data && Array.isArray((data as any).blocks)) {
    return (data as any).blocks as Block[]
  }

  throw new Error('invalid_blocks_payload')
}

export async function runTool(payload: ToolPayload): Promise<ToolRunResult> {
  if (!ALLOWED_ACTIONS.has(payload.action)) {
    return { kind: 'error', message: '未対応の操作です。' }
  }

  if (isMock || !supabaseReady || !supabase) {
    return mockTool(payload)
  }

  if (payload.action === 'invoice.create') {
    const params = payload.params || {}
    const projectId = typeof params.projectId === 'string' ? params.projectId : ''
    const templateKey = typeof params.templateKey === 'string' ? params.templateKey : 'standard'
    const periodFrom = typeof params.periodFrom === 'string' ? params.periodFrom : ''
    const periodTo = typeof params.periodTo === 'string' ? params.periodTo : ''
    const { data, error } = await supabase.functions.invoke('invoice-create', {
      body: { projectId, templateKey, periodFrom, periodTo },
    })

    if (error) {
      throw new Error(error.message || 'invoice_create_failed')
    }

    if (data && Array.isArray((data as any).blocks)) {
      return { kind: 'blocks', blocks: (data as any).blocks as Block[] }
    }
    if (data && typeof (data as any).error === 'string') {
      return { kind: 'error', message: String((data as any).error) }
    }
    return { kind: 'unknown', data }
  }

  if (payload.action === 'estimate.draft') {
    const params = payload.params || {}
    const projectId = typeof params.projectId === 'string' ? params.projectId : ''
    const clientId = typeof params.clientId === 'string' ? params.clientId : ''
    const { data, error } = await supabase.functions.invoke('estimate-draft', {
      body: { projectId, clientId, files: params.files },
    })

    if (error) {
      throw new Error(error.message || 'estimate_draft_failed')
    }

    if (data && Array.isArray((data as any).blocks)) {
      return { kind: 'blocks', blocks: (data as any).blocks as Block[] }
    }
    if (data && typeof (data as any).error === 'string') {
      return { kind: 'error', message: String((data as any).error) }
    }
    return { kind: 'unknown', data }
  }

  if (payload.action === 'materials.ingest') {
    const params = payload.params || {}
    const projectId = typeof params.projectId === 'string' ? params.projectId : ''
    const imageUrl = typeof params.imageUrl === 'string' ? params.imageUrl : ''
    const provider = typeof params.provider === 'string' ? params.provider : undefined

    const { data, error } = await supabase.functions.invoke('materials-ingest', {
      body: { projectId, imageUrl, provider },
    })

    if (error) {
      throw new Error(error.message || 'materials_ingest_failed')
    }

    if (data && Array.isArray((data as any).blocks)) {
      return { kind: 'blocks', blocks: (data as any).blocks as Block[] }
    }
    if (data && typeof (data as any).error === 'string') {
      return { kind: 'error', message: String((data as any).error) }
    }
    return { kind: 'unknown', data }
  }

  const needsText = payload.action === 'export_csv'
  const { data, error } = await supabase.functions.invoke('tools-run', {
    body: payload,
    responseType: needsText ? 'text' : 'json',
  })

  if (error) {
    throw new Error(error.message || 'tool_failed')
  }

  if (needsText) {
    return {
      kind: 'csv',
      filename: deriveCsvName(payload),
      content: typeof data === 'string' ? data : '',
    }
  }

  if (typeof data === 'object' && data !== null) {
    const result = data as { url?: string; blocks?: Block[]; error?: string }
    if (typeof result.error === 'string') {
      return { kind: 'error', message: result.error }
    }
    if (Array.isArray(result.blocks)) {
      return { kind: 'blocks', blocks: result.blocks }
    }
    if (typeof result.url === 'string') {
      return { kind: 'open_page', url: result.url }
    }
  }

  return { kind: 'unknown', data }
}

const mockTool = (payload: ToolPayload): ToolRunResult => {
  if (payload.action === 'export_csv') {
    const csv = '品名,数量,単価,金額\nALCパネル,24,3200,76800\nボードアンカー(100個),2,980,1960\n'
    return { kind: 'csv', filename: deriveCsvName(payload), content: csv }
  }
  if (payload.action === 'open_page') {
    const page = payload.params?.page ?? 'invoice'
    return { kind: 'open_page', url: `/${page}` }
  }
  if (payload.action === 'suggest') {
    return { kind: 'blocks', blocks: MOCK_BLOCKS }
  }
  if (payload.action === 'materials.ingest') {
    return { kind: 'blocks', blocks: MOCK_BLOCKS }
  }
  if (payload.action === 'estimate.draft') {
    return { kind: 'blocks', blocks: MOCK_BLOCKS }
  }
  if (payload.action === 'invoice.create') {
    return { kind: 'blocks', blocks: MOCK_BLOCKS }
  }
  if (payload.action === 'preview_pdf') {
    return { kind: 'open_page', url: payload.params?.url ?? 'https://example.com/preview.pdf' }
  }
  if (payload.action === 'preview_pdf') {
    return { kind: 'open_page', url: payload.params?.url ?? 'https://example.com/preview.pdf' }
  }
  return { kind: 'unknown', data: payload }
}

const deriveCsvName = (payload: ToolPayload) => {
  if (payload.params?.month) {
    return `export_${payload.params.month}.csv`
  }
  return 'export.csv'
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

export type { ActionItem }
