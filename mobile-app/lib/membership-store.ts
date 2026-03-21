import AsyncStorage from '@react-native-async-storage/async-storage'

export type MembershipRole = 'owner' | 'member' | 'office'
export type MembershipStatus = 'active' | 'disabled'

export type Membership = {
  id: string
  companyId: string
  userId: string
  role: MembershipRole
  status: MembershipStatus
  createdAt: string
}

const MY_MEMBERSHIP_KEY = 'my_membership_v1'

const safeParse = <T>(raw: string | null, fallback: T): T => {
  if (!raw) return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export const setMyMembership = async (membership: Membership | null): Promise<void> => {
  // NOTE: PR2 で「暫定 owner 固定」から置換。
  // - 招待コード参加（join/by-code）で membership を保存し、unassigned→assigned を成立させる。
  // TODO: 後続PRで server/DB の membership と同期する。
  if (!membership) {
    await AsyncStorage.removeItem(MY_MEMBERSHIP_KEY)
    return
  }
  await AsyncStorage.setItem(MY_MEMBERSHIP_KEY, JSON.stringify(membership))
}

export const getMyMembership = async (): Promise<Membership | null> => {
  // NOTE: PR1 は Must 導線維持のため owner 固定だったが、PR2 でローカル保存参照に置換。
  // - unassigned = Membership が存在しない状態
  // TODO: 後続PRで本実装（Auth userId と membership の取得）に置換。
  const raw = await AsyncStorage.getItem(MY_MEMBERSHIP_KEY)
  return safeParse<Membership | null>(raw, null)
}
