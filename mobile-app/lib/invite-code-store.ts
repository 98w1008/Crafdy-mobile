import AsyncStorage from '@react-native-async-storage/async-storage'

import { Membership, MembershipStatus, MembershipRole, setMyMembership } from '@/lib/membership-store'

export type InviteCodeRole = 'member' | 'office'
export type InviteCodeStatus = 'active' | 'used' | 'revoked'

export type InviteCode = {
  id: string
  companyId: string
  code: string
  role: InviteCodeRole
  status: InviteCodeStatus
  expiresAt: string
  usedByUserId?: string
  usedAt?: string
  createdAt: string
}

const INVITE_CODES_KEY = 'invite_codes_v1'

const safeParse = <T>(raw: string | null, fallback: T): T => {
  if (!raw) return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

const seedIfEmpty = async (codes: InviteCode[]) => {
  if (codes.length > 0) return codes

  // NOTE: 最小実装（ローカルにダミー招待コードを1件用意）
  // - 後続PRで server/DB 連携（発行・失効・履歴）に置換する。
  const now = new Date()
  const expires = new Date(now)
  expires.setDate(expires.getDate() + 7)

  const seeded: InviteCode[] = [
    {
      id: 'invite-local-test1234',
      companyId: 'local',
      code: 'TEST1234',
      role: 'member',
      status: 'active',
      createdAt: now.toISOString(),
      expiresAt: expires.toISOString(),
    },
  ]

  await AsyncStorage.setItem(INVITE_CODES_KEY, JSON.stringify(seeded))
  return seeded
}

const listInviteCodes = async (): Promise<InviteCode[]> => {
  const raw = await AsyncStorage.getItem(INVITE_CODES_KEY)
  const codes = safeParse<InviteCode[]>(raw, [])
  return seedIfEmpty(codes)
}

const saveInviteCodes = async (codes: InviteCode[]) => {
  await AsyncStorage.setItem(INVITE_CODES_KEY, JSON.stringify(codes))
}

export const redeemInviteCode = async (
  code: string
): Promise<
  | { ok: true; membership: Membership }
  | { ok: false; reason: 'invalid' | 'expired' | 'used' | 'revoked' }
> => {
  const normalized = code.trim().toUpperCase()
  if (!normalized) return { ok: false, reason: 'invalid' }

  const codes = await listInviteCodes()
  const idx = codes.findIndex(c => c.code.toUpperCase() === normalized)
  if (idx === -1) return { ok: false, reason: 'invalid' }

  const target = codes[idx]
  if (target.status === 'revoked') return { ok: false, reason: 'revoked' }
  if (target.status === 'used') return { ok: false, reason: 'used' }

  const expiresAtMs = Date.parse(target.expiresAt)
  if (!Number.isFinite(expiresAtMs) || expiresAtMs < Date.now()) return { ok: false, reason: 'expired' }

  const nowIso = new Date().toISOString()

  const role: MembershipRole = target.role === 'office' ? 'office' : 'member'
  const status: MembershipStatus = 'active'

  // NOTE: 最小実装（userId はローカル固定）
  // - 後続PRで Auth の userId と紐づける。
  const membership: Membership = {
    id: `membership-${Date.now()}`,
    companyId: target.companyId,
    userId: 'local-user',
    role,
    status,
    createdAt: nowIso,
  }

  await setMyMembership(membership)

  const next: InviteCode = {
    ...target,
    status: 'used',
    usedByUserId: membership.userId,
    usedAt: nowIso,
  }

  const nextCodes = [...codes]
  nextCodes[idx] = next
  await saveInviteCodes(nextCodes)

  return { ok: true, membership }
}
