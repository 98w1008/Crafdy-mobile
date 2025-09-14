// Types for chat and messaging functionality
export interface Message {
  id: string
  content: string
  role: 'user' | 'assistant' | 'system'
  timestamp: Date
  metadata?: {
    tokens?: number
    model?: string
    error?: string
  }
}

export interface Thread {
  id: string
  title: string
  messages: Message[]
  createdAt: Date
  updatedAt: Date
  projectId?: string
}

export interface ChatSession {
  threadId: string
  isActive: boolean
  participants: string[]
}

export type ThreadType = 'chat' | 'project' | 'support'