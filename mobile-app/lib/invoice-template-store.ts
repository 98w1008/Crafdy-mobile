import AsyncStorage from '@react-native-async-storage/async-storage'

export type InvoiceTemplateKind = 'standard' | 'uploaded'
export type InvoiceTemplate = {
  id: string
  name: string
  kind: InvoiceTemplateKind
  templateKey?: 'standard_simple' | 'standard_detail' | 'standard_site'
  sourceUri?: string
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

export const seedStandardInvoiceTemplates = async (): Promise<void> => {
  // NOTE: 最小実装（ローカル保存のみ）。後続PRで server/DB に置換する。
  const raw = await AsyncStorage.getItem(INVOICE_TEMPLATES_KEY)
  const items = safeParse<InvoiceTemplate[]>(raw, [])

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
  const items = safeParse<InvoiceTemplate[]>(raw, [])
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

  const now = new Date()
  const created: InvoiceTemplate = {
    id: `invoice-template-uploaded-${now.getTime()}`,
    name,
    kind: 'uploaded',
    sourceUri,
    isActive: false,
    createdAt: now.toISOString(),
  }

  await saveInvoiceTemplates([created, ...items])
  return created
}
