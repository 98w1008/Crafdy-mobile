import AsyncStorage from '@react-native-async-storage/async-storage'

export type ExpenseKind = 'receipt' | 'material' | 'subcontract' | 'expense'

export type ReviewStatus = 'draft' | 'submitted' | 'approved'

export type StoredExpense = {
  id: string
  projectId: string
  kind: ExpenseKind
  amount: number
  memo: string
  date: string // YYYY-MM-DD
  reviewStatus: ReviewStatus
  createdAt: string
}

const EXPENSES_KEY = 'expenses_v1'

const safeParse = <T>(raw: string | null, fallback: T): T => {
  if (!raw) return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

const ensureReviewStatus = (v: any): ReviewStatus => {
  if (v === 'submitted' || v === 'approved') return v
  return 'draft'
}

export const listExpenses = async (): Promise<StoredExpense[]> => {
  const raw = await AsyncStorage.getItem(EXPENSES_KEY)
  const items = safeParse<any[]>(raw, [])
  return items.map((e: any) => ({
    ...e,
    reviewStatus: ensureReviewStatus(e?.reviewStatus),
  })) as StoredExpense[]
}

export const saveExpenses = async (items: StoredExpense[]) => {
  await AsyncStorage.setItem(EXPENSES_KEY, JSON.stringify(items))
}

export const listExpensesByProject = async (projectId: string): Promise<StoredExpense[]> => {
  const all = await listExpenses()
  return all.filter(e => e.projectId === projectId)
}

export const createExpense = async (params: {
  projectId: string
  kind: ExpenseKind
  amount: number
  memo: string
  date: string // YYYY-MM-DD
}): Promise<StoredExpense> => {
  const items = await listExpenses()
  const now = new Date()
  const expense: StoredExpense = {
    id: `${now.getTime()}`,
    projectId: params.projectId,
    kind: params.kind,
    amount: params.amount,
    memo: params.memo,
    date: params.date,
    reviewStatus: 'draft',
    createdAt: now.toISOString(),
  }

  await saveExpenses([expense, ...items])
  return expense
}

export const submitExpense = async (expenseId: string): Promise<void> => {
  const items = await listExpenses()
  const idx = items.findIndex(e => e.id === expenseId)
  if (idx === -1) return

  const prev = items[idx]
  if (prev.reviewStatus !== 'draft') return

  const next = [...items]
  next[idx] = { ...prev, reviewStatus: 'submitted' }
  await saveExpenses(next)
}
