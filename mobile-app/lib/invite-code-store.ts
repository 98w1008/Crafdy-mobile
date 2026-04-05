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

export const listInviteCodes = async (): Promise<InviteCode[]> => {
  const raw = await AsyncStorage.getItem(INVITE_CODES_KEY)
  const codes = safeParse<InviteCode[]>(raw, [])
  return seedIfEmpty(codes)
}

const saveInviteCodes = async (codes: InviteCode[]) => {
  await AsyncStorage.setItem(INVITE_CODES_KEY, JSON.stringify(codes))
}

const randomCode = (len: number) => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let out = ''
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)]
  return out
}

export const createInviteCode = async (params: {
  role: InviteCodeRole
  expiresInDays: number
}): Promise<{ code: string; expiresAt: string; id: string }> => {
  const now = new Date()
  const expires = new Date(now)
  expires.setDate(expires.getDate() + Math.max(1, params.expiresInDays || 7))

  const codes = await listInviteCodes()

  const code = (() => {
    // 8-12桁の英数（衝突したら再生成）
    for (let i = 0; i < 10; i++) {
      const c = randomCode(8)
      if (!codes.some(x => x.code.toUpperCase() === c.toUpperCase())) return c
    }
    return randomCode(10)
  })()

  const id = `invite-${now.getTime()}`
  const item: InviteCode = {
    id,
    // NOTE: 最小実装（companyId は暫定で local 固定）
    // TODO: 後続PRで owner の companyId に紐づけて発行する。
    companyId: 'local',
    code,
    role: params.role,
    status: 'active',
    createdAt: now.toISOString(),
    expiresAt: expires.toISOString(),
  }

  const next = [item, ...codes]
  await saveInviteCodes(next)
  return { code: item.code, expiresAt: item.expiresAt, id: item.id }
}

export const revokeInviteCode = async (codeId: string): Promise<void> => {
  const codes = await listInviteCodes()
  const idx = codes.findIndex(c => c.id === codeId)
  if (idx === -1) return

  const prev = codes[idx]
  if (prev.status !== 'active') return

  const nextCodes = [...codes]
  nextCodes[idx] = { ...prev, status: 'revoked' }
  await saveInviteCodes(nextCodes)
}

export const redeemInviteCode = async (
  code: string
): Promise<
  | { ok: true; membership: Membership }
  | { ok: false; reason: 'invalid' | 'expired' | 'used' | 'revoked' }
> => {
  // 招待コードの意味（プロダクト仕様）:
  // - 代表(owner)が会社/チームの親アカウントを作成
  // - 職長/従業員(member)が、割当された現場だけを閲覧/入力するための参加入口
  // - 招待コード参加の成功で unassigned → assigned を成立させ、通常導線（dashboard/main-chat等）に入れる
  // TODO(課金/プラン): 現場プラン(3/6/9等)に応じて「アカウント人数上限（代表+member）」をここで判定できるようにする
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
