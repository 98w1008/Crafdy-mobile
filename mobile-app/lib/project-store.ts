import AsyncStorage from '@react-native-async-storage/async-storage'

export type StoredProject = {
  id: string
  name: string
  address?: string
  memo?: string
  createdAt: string
}

const PROJECTS_KEY = 'projects_v1'
const SELECTED_PROJECT_KEY = 'selected_project_v1'

const safeParse = <T>(raw: string | null, fallback: T): T => {
  if (!raw) return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export const listProjects = async (): Promise<StoredProject[]> => {
  const raw = await AsyncStorage.getItem(PROJECTS_KEY)
  return safeParse<StoredProject[]>(raw, [])
}

export const getProjectById = async (id: string): Promise<StoredProject | null> => {
  const projects = await listProjects()
  return projects.find(p => p.id === id) ?? null
}

export const saveProjects = async (projects: StoredProject[]) => {
  await AsyncStorage.setItem(PROJECTS_KEY, JSON.stringify(projects))
}

export const createProject = async (params: {
  name: string
  address?: string
  memo?: string
}): Promise<StoredProject> => {
  const projects = await listProjects()
  const now = new Date()
  const project: StoredProject = {
    id: `${now.getTime()}`,
    name: params.name.trim(),
    address: params.address?.trim() || undefined,
    memo: params.memo?.trim() || undefined,
    createdAt: now.toISOString(),
  }

  await saveProjects([project, ...projects])
  await setSelectedProject(project)
  return project
}

export const updateProject = async (params: {
  id: string
  address?: string
  memo?: string
}): Promise<StoredProject | null> => {
  const projects = await listProjects()
  const idx = projects.findIndex(p => p.id === params.id)
  if (idx === -1) return null

  const prev = projects[idx]
  const next: StoredProject = {
    ...prev,
    address: params.address !== undefined ? (params.address.trim() || undefined) : prev.address,
    memo: params.memo !== undefined ? (params.memo.trim() || undefined) : prev.memo,
  }

  const nextProjects = [...projects]
  nextProjects[idx] = next
  await saveProjects(nextProjects)
  return next
}

export const setSelectedProject = async (project: Pick<StoredProject, 'id' | 'name'> | null) => {
  if (!project) {
    await AsyncStorage.removeItem(SELECTED_PROJECT_KEY)
    return
  }
  await AsyncStorage.setItem(SELECTED_PROJECT_KEY, JSON.stringify(project))
}

export const getSelectedProject = async (): Promise<Pick<StoredProject, 'id' | 'name'> | null> => {
  const raw = await AsyncStorage.getItem(SELECTED_PROJECT_KEY)
  return safeParse(raw, null)
}
