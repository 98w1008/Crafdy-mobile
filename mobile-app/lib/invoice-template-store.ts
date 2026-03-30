import AsyncStorage from '@react-native-async-storage/async-storage'

export type InvoiceTemplateKind = 'standard' | 'uploaded'
export type InvoiceTemplateFileType = 'pdf' | 'image' | 'word' | 'excel' | 'unknown'
export type InvoiceTemplateApplyStatus = 'ready_for_future_apply' | 'unsupported_yet'

export type InvoiceTemplate = {
  id: string
  name: string
  kind: InvoiceTemplateKind
  templateKey?: 'standard_simple' | 'standard_detail' | 'standard_site'
  sourceUri?: string
  fileType?: InvoiceTemplateFileType
  applyStatus?: InvoiceTemplateApplyStatus
  isActive: boolean
  createdAt: string
}

const INVOICE_TEMPLATES_KEY = 'invoice_templates_v1'

const safeParse = <T>(raw: string | null, fallback: T): T => {
  if (!raw) return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

const saveInvoiceTemplates = async (items: InvoiceTemplate[]) => {
  await AsyncStorage.setItem(INVOICE_TEMPLATES_KEY, JSON.stringify(items))
}

const normalizeTemplate = (t: InvoiceTemplate): InvoiceTemplate => {
  const fileType: InvoiceTemplateFileType =
    t.kind === 'uploaded'
      ? (t.fileType ?? 'unknown')
      : (t.fileType as InvoiceTemplateFileType | undefined)

  const applyStatus: InvoiceTemplateApplyStatus | undefined = (() => {
    if (t.kind !== 'uploaded') return t.applyStatus
    if (t.applyStatus) return t.applyStatus
    // uploaded の後方互換：未設定は安全に unknown/unsupported をデフォルト
    if (fileType === 'unknown') return 'unsupported_yet'
    return 'ready_for_future_apply'
  })()

  return {
    ...t,
    fileType: t.kind === 'uploaded' ? fileType : t.fileType,
    applyStatus,
  }
}

const guessFileType = (params: { name?: string; sourceUri?: string }): InvoiceTemplateFileType => {
  const raw = `${params.name ?? ''} ${params.sourceUri ?? ''}`.toLowerCase()
  const ext = raw.split('?')[0].split('#')[0].split('.').pop() || ''

  if (ext === 'pdf') return 'pdf'
  if (['jpg', 'jpeg', 'png', 'webp'].includes(ext)) return 'image'
  if (['doc', 'docx'].includes(ext)) return 'word'
  if (['xls', 'xlsx'].includes(ext)) return 'excel'

  // uri に拡張子が無いケースは最小で unknown
  return 'unknown'
}

export const seedStandardInvoiceTemplates = async (): Promise<void> => {
  // NOTE: 最小実装（ローカル保存のみ）。後続PRで server/DB に置換する。
  const raw = await AsyncStorage.getItem(INVOICE_TEMPLATES_KEY)
  const items = safeParse<InvoiceTemplate[]>(raw, []).map(normalizeTemplate)

  const now = new Date().toISOString()

  const ensure = (t: InvoiceTemplate) => {
    const hit = items.find(x => x.id === t.id)
    if (hit) return
    items.push(t)
  }

  ensure({
    id: 'invoice-template-standard-simple',
    name: 'クラフディ標準 シンプル',
    kind: 'standard',
    templateKey: 'standard_simple',
    isActive: false,
    createdAt: now,
  })
  ensure({
    id: 'invoice-template-standard-detail',
    name: 'クラフディ標準 明細',
    kind: 'standard',
    templateKey: 'standard_detail',
    isActive: false,
    createdAt: now,
  })
  ensure({
    id: 'invoice-template-standard-site',
    name: 'クラフディ標準 現場向け',
    kind: 'standard',
    templateKey: 'standard_site',
    isActive: false,
    createdAt: now,
  })

  // active は1件だけ（未設定ならシンプルをactive）
  const activeCount = items.filter(x => x.isActive).length
  if (activeCount === 0) {
    const simple = items.find(x => x.id === 'invoice-template-standard-simple')
    if (simple) simple.isActive = true
  } else if (activeCount > 1) {
    let kept = false
    for (const x of items) {
      if (x.isActive && !kept) {
        kept = true
      } else {
        x.isActive = false
      }
    }
  }

  await saveInvoiceTemplates(items)
}

export const listInvoiceTemplates = async (): Promise<InvoiceTemplate[]> => {
  await seedStandardInvoiceTemplates()
  const raw = await AsyncStorage.getItem(INVOICE_TEMPLATES_KEY)
  const items = safeParse<InvoiceTemplate[]>(raw, []).map(normalizeTemplate)

  // 後方互換の補完を永続化（軽量）
  await saveInvoiceTemplates(items)

  return items.slice().sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
}

export const getActiveInvoiceTemplate = async (): Promise<InvoiceTemplate | null> => {
  const items = await listInvoiceTemplates()
  const active = items.find(x => x.isActive)
  return active || null
}

export const setActiveInvoiceTemplate = async (id: string): Promise<void> => {
  const items = await listInvoiceTemplates()
  const next = items.map(x => ({ ...x, isActive: x.id === id }))
  await saveInvoiceTemplates(next)
}

export const createUploadedInvoiceTemplate = async (params: {
  name: string
  sourceUri: string
}): Promise<InvoiceTemplate> => {
  // NOTE: 最小実装（ローカル保存のみ）。後続PRで server/DB + file upload に置換する。
  const sourceUri = String(params.sourceUri || '').trim()
  if (!sourceUri) throw new Error('sourceUri is required')

  const fallbackName = (() => {
    const last = sourceUri.split('/').filter(Boolean).pop()
    return last ? decodeURIComponent(last) : 'アップロードテンプレ'
  })()

  const name = String(params.name || '').trim() || fallbackName

  const items = await listInvoiceTemplates()

  // 同じ sourceUri の重複登録は避ける（最小）
  const hit = items.find(t => t.kind === 'uploaded' && String(t.sourceUri || '').trim() === sourceUri)
  if (hit) return hit

  const fileType = guessFileType({ name, sourceUri })
  const applyStatus: InvoiceTemplateApplyStatus = fileType === 'unknown' ? 'unsupported_yet' : 'ready_for_future_apply'

  const now = new Date()
  const created: InvoiceTemplate = {
    id: `invoice-template-uploaded-${now.getTime()}`,
    name,
    kind: 'uploaded',
    sourceUri,
    fileType,
    applyStatus,
    isActive: false,
    createdAt: now.toISOString(),
  }

  await saveInvoiceTemplates([created, ...items])
  return created
}
