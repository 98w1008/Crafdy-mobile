import { getMyMembership, MembershipRole, MembershipStatus } from './membership-store'

export type AccessContext =
  | { kind: 'unassigned' }
  | { kind: 'assigned'; companyId: string; role: MembershipRole; status: MembershipStatus }

export const getAccessContext = async (): Promise<AccessContext> => {
  const membership = await getMyMembership()
  if (!membership) return { kind: 'unassigned' }

  return {
    kind: 'assigned',
    companyId: membership.companyId,
    role: membership.role,
    status: membership.status,
  }
}

export const isActive = (ctx: AccessContext) => ctx.kind === 'assigned' && ctx.status === 'active'
