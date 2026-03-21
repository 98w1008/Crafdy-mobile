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

export const getMyMembership = async (): Promise<Membership | null> => {
  // NOTE: 暫定実装（後続PRで本実装に置換）
  // - 現時点ではバックエンド未接続でも Must 導線を壊さないことを最優先する。
  // - unassigned (= Membership が存在しない) 扱いにしてしまうと join 導線がまだ無いため詰まる。
  // TODO: Supabase 等の永続ストアから membership を取得する実装に置換する。

  const now = new Date().toISOString()

  return {
    id: 'local-membership',
    companyId: 'local',
    userId: 'local-user',
    role: 'owner',
    status: 'active',
    createdAt: now,
  }
}
