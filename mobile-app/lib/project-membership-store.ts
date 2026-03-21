import AsyncStorage from '@react-native-async-storage/async-storage'

export type ProjectMembership = {
  id: string
  companyId: string
  projectId: string
  userId: string
  createdAt: string
  revokedAt?: string
}

const PROJECT_MEMBERSHIPS_KEY = 'project_memberships_v1'
const PROJECTS_KEY = 'projects_v1'

const safeParse = <T>(raw: string | null, fallback: T): T => {
  if (!raw) return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

type StoredProjectLite = { id: string }

const seedIfEmpty = async (items: ProjectMembership[]) => {
  if (items.length > 0) return items

  // NOTE: 最小実装（ローカル seed）
  // - companyId/userId は現状の暫定実装に合わせる。
  // - 後続PRで Auth userId と server/DB の割当に置換する。
  const rawProjects = await AsyncStorage.getItem(PROJECTS_KEY)
  const projects = safeParse<StoredProjectLite[]>(rawProjects, [])
  const first = projects[0]
  if (!first?.id) return []

  const nowIso = new Date().toISOString()
  const seeded: ProjectMembership[] = [
    {
      id: `pm-${Date.now()}`,
      companyId: 'local',
      userId: 'local-user',
      projectId: first.id,
      createdAt: nowIso,
    },
  ]

  await AsyncStorage.setItem(PROJECT_MEMBERSHIPS_KEY, JSON.stringify(seeded))
  return seeded
}

export const listProjectMembershipsForUser = async (
  companyId: string,
  userId: string
): Promise<ProjectMembership[]> => {
  const raw = await AsyncStorage.getItem(PROJECT_MEMBERSHIPS_KEY)
  const items = await seedIfEmpty(safeParse<ProjectMembership[]>(raw, []))

  return items.filter(m => m.companyId === companyId && m.userId === userId && !m.revokedAt)
}

export const listProjectIdsForMember = async (companyId: string, userId: string): Promise<string[]> => {
  const ms = await listProjectMembershipsForUser(companyId, userId)
  return ms.map(m => m.projectId)
}
