import AsyncStorage from '@react-native-async-storage/async-storage'

export type ExpenseKind = 'receipt' | 'material' | 'subcontract' | 'expense'

export type StoredExpense = {
  id: string
  projectId: string
  kind: ExpenseKind
  amount: number
  memo: string
  date: string // YYYY-MM-DD
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

export const listExpenses = async (): Promise<StoredExpense[]> => {
  const raw = await AsyncStorage.getItem(EXPENSES_KEY)
  return safeParse<StoredExpense[]>(raw, [])
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
    createdAt: now.toISOString(),
  }

  await saveExpenses([expense, ...items])
  return expense
}
