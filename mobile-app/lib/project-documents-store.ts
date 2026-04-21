import AsyncStorage from '@react-native-async-storage/async-storage'

export type DocumentKind = '工事明細' | '請書' | '工程表' | '材料見積' | 'その他'

export const DOCUMENT_KINDS: DocumentKind[] = [
  '工事明細',
  '請書',
  '工程表',
  '材料見積',
  'その他',
]

export type ProjectDocument = {
  id: string
  projectId: string
  kind: DocumentKind
  filename: string
  uri: string        // local file URI — 後続 PR で Supabase Storage へ upload
  size?: number      // bytes
  mimeType?: string
  createdAt: string
}

const KEY = 'project_documents_v1'

const loadAll = async (): Promise<ProjectDocument[]> => {
  try {
    const raw = await AsyncStorage.getItem(KEY)
    if (!raw) return []
    return JSON.parse(raw) as ProjectDocument[]
  } catch {
    return []
  }
}

const saveAll = async (docs: ProjectDocument[]): Promise<void> => {
  await AsyncStorage.setItem(KEY, JSON.stringify(docs))
}

export const addDocument = async (
  input: Omit<ProjectDocument, 'id' | 'createdAt'>
): Promise<ProjectDocument> => {
  const all = await loadAll()
  const doc: ProjectDocument = {
    ...input,
    id: `doc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    createdAt: new Date().toISOString(),
  }
  await saveAll([...all, doc])
  return doc
}

export const listDocuments = async (projectId: string): Promise<ProjectDocument[]> => {
  const all = await loadAll()
  return all
    .filter(d => d.projectId === projectId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export const removeDocument = async (id: string): Promise<void> => {
  const all = await loadAll()
  await saveAll(all.filter(d => d.id !== id))
}
