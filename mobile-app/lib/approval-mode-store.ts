import AsyncStorage from '@react-native-async-storage/async-storage'

export type ApprovalMode = 'owneronly' | 'ownerplus_office'

const APPROVAL_MODE_KEY = 'approval_mode_v1'
const DEFAULT_MODE: ApprovalMode = 'owneronly'

export const getApprovalMode = async (): Promise<ApprovalMode> => {
  const raw = await AsyncStorage.getItem(APPROVAL_MODE_KEY)
  if (raw === 'ownerplus_office' || raw === 'owneronly') return raw
  return DEFAULT_MODE
}

export const setApprovalMode = async (mode: ApprovalMode): Promise<void> => {
  // NOTE: 最小実装（ローカル保存のみ）。後続PRで server/DB に置換する。
  await AsyncStorage.setItem(APPROVAL_MODE_KEY, mode)
}
