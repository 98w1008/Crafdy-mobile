import AsyncStorage from '@react-native-async-storage/async-storage'

// NOTE: 最小実装（ローカル保存のみ）。後続PRで server/DB に置換する。
// NOTE: uploaded template から将来抽出した会社情報を、この store に保存する前提。
// NOTE: 請求書 / 見積書 / 出来高請求書で共通利用する前提。

export type CompanyBillingProfile = {
  id: string
  companyName?: string
  address?: string
  phone?: string
  invoiceRegistrationNumber?: string
  bankName?: string
  bankBranchName?: string
  bankAccountType?: string
  bankAccountNumber?: string
  bankAccountName?: string
  logoUri?: string
  defaultNote?: string
  createdAt: string
  updatedAt: string
}

const COMPANY_BILLING_PROFILE_KEY = 'company_billing_profile_v1'

const safeParse = <T>(raw: string | null, fallback: T): T => {
  if (!raw) return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

const normalizeOptString = (v: unknown): string | undefined => {
  const s = String(v ?? '').trim()
  return s ? s : undefined
}

export const getCompanyBillingProfile = async (): Promise<CompanyBillingProfile | null> => {
  const raw = await AsyncStorage.getItem(COMPANY_BILLING_PROFILE_KEY)
  const value = safeParse<Partial<CompanyBillingProfile> | null>(raw, null)
  if (!value) return null

  const createdAt = normalizeOptString(value.createdAt) || new Date().toISOString()
  const updatedAt = normalizeOptString(value.updatedAt) || createdAt

  return {
    id: normalizeOptString(value.id) || 'company-billing-profile-default',
    companyName: normalizeOptString(value.companyName),
    address: normalizeOptString(value.address),
    phone: normalizeOptString(value.phone),
    invoiceRegistrationNumber: normalizeOptString(value.invoiceRegistrationNumber),
    bankName: normalizeOptString(value.bankName),
    bankBranchName: normalizeOptString(value.bankBranchName),
    bankAccountType: normalizeOptString(value.bankAccountType),
    bankAccountNumber: normalizeOptString(value.bankAccountNumber),
    bankAccountName: normalizeOptString(value.bankAccountName),
    logoUri: normalizeOptString(value.logoUri),
    defaultNote: normalizeOptString(value.defaultNote),
    createdAt,
    updatedAt,
  }
}

export const saveCompanyBillingProfile = async (params: {
  companyName?: string
  address?: string
  phone?: string
  invoiceRegistrationNumber?: string
  bankName?: string
  bankBranchName?: string
  bankAccountType?: string
  bankAccountNumber?: string
  bankAccountName?: string
  logoUri?: string
  defaultNote?: string
}): Promise<CompanyBillingProfile> => {
  const prev = await getCompanyBillingProfile()
  const now = new Date().toISOString()

  const next: CompanyBillingProfile = {
    id: prev?.id || 'company-billing-profile-default',
    companyName: normalizeOptString(params.companyName) ?? prev?.companyName,
    address: normalizeOptString(params.address) ?? prev?.address,
    phone: normalizeOptString(params.phone) ?? prev?.phone,
    invoiceRegistrationNumber: normalizeOptString(params.invoiceRegistrationNumber) ?? prev?.invoiceRegistrationNumber,
    bankName: normalizeOptString(params.bankName) ?? prev?.bankName,
    bankBranchName: normalizeOptString(params.bankBranchName) ?? prev?.bankBranchName,
    bankAccountType: normalizeOptString(params.bankAccountType) ?? prev?.bankAccountType,
    bankAccountNumber: normalizeOptString(params.bankAccountNumber) ?? prev?.bankAccountNumber,
    bankAccountName: normalizeOptString(params.bankAccountName) ?? prev?.bankAccountName,
    logoUri: normalizeOptString(params.logoUri) ?? prev?.logoUri,
    defaultNote: normalizeOptString(params.defaultNote) ?? prev?.defaultNote,
    createdAt: prev?.createdAt || now,
    updatedAt: now,
  }

  await AsyncStorage.setItem(COMPANY_BILLING_PROFILE_KEY, JSON.stringify(next))
  return next
}
