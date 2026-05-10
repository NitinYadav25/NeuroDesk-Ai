import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import api from '@/lib/api'

interface User {
  id: string
  email: string
  username: string
  created_at?: string
}

interface AuthState {
  user: User | null
  token: string | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, username: string, password: string) => Promise<void>
  logout: () => void
  setUser: (user: User) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isLoading: false,
      login: async (email, password) => {
        set({ isLoading: true })
        try {
          const res = await api.post('/auth/login', { email, password })
          const { token, user } = res.data
          if (typeof window !== 'undefined') {
            localStorage.setItem('nd_token', token)
            localStorage.setItem('nd_user', JSON.stringify(user))
          }
          set({ user, token, isLoading: false })
        } catch (err: unknown) {
          set({ isLoading: false })
          if (err instanceof Error) {
            throw err
          }
          throw new Error('Login failed')
        }
      },
      register: async (email, username, password) => {
        set({ isLoading: true })
        try {
          const res = await api.post('/auth/register', { email, username, password })
          const { token, user } = res.data
          if (typeof window !== 'undefined') {
            localStorage.setItem('nd_token', token)
            localStorage.setItem('nd_user', JSON.stringify(user))
          }
          set({ user, token, isLoading: false })
        } catch (err: unknown) {
          set({ isLoading: false })
          if (err instanceof Error) {
            throw err
          }
          throw new Error('Registration failed')
        }
      },
      logout: () => {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('nd_token')
          localStorage.removeItem('nd_user')
        }
        set({ user: null, token: null })
      },
      setUser: (user) => set({ user }),
    }),
    {
      name: 'nd-auth',
      partialize: (state) => ({ user: state.user, token: state.token }),
    }
  )
)

// ── App Store ──────────────────────────────────────────────────────────────

interface Conversation {
  id: string
  title: string
  model: string
  agent_type: string
  created_at: string
  updated_at: string
}

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
  metadata?: Record<string, unknown>
}

interface Document {
  id: string
  title: string
  file_type: string
  file_size: number
  embedding_status: 'pending' | 'processing' | 'completed' | 'failed'
  created_at: string
}

interface Note {
  id: string
  title: string
  content: string
  tags: string[]
  is_pinned: boolean
  created_at: string
  updated_at: string
}


interface AppState {
  conversations: Conversation[]
  activeConversation: Conversation | null
  messages: Message[]
  documents: Document[]
  notes: Note[]
  isStreaming: boolean
  selectedModel: string
  explainReasoning: boolean
  selectedDocuments: string[]
  setConversations: (convs: Conversation[]) => void
  setActiveConversation: (conv: Conversation | null) => void
  addMessage: (msg: Message) => void
  setMessages: (msgs: Message[]) => void
  setDocuments: (docs: Document[]) => void
  setNotes: (notes: Note[]) => void
  setIsStreaming: (v: boolean) => void
  setSelectedModel: (m: string) => void
  setExplainReasoning: (v: boolean) => void
  toggleDocumentSelection: (id: string) => void
  clearDocumentSelection: () => void
}

export const useAppStore = create<AppState>((set) => ({
  conversations: [],
  activeConversation: null,
  messages: [],
  documents: [],
  notes: [],
  isStreaming: false,
  selectedModel: 'mistral',
  explainReasoning: false,
  selectedDocuments: [],
  setConversations: (conversations) => set({ conversations }),
  setActiveConversation: (activeConversation) => set({ activeConversation }),
  addMessage: (msg) => set((s) => ({ messages: [...s.messages, msg] })),
  setMessages: (messages) => set({ messages }),
  setDocuments: (documents) => set({ documents }),
  setNotes: (notes) => set({ notes }),
  setIsStreaming: (isStreaming) => set({ isStreaming }),
  setSelectedModel: (selectedModel) => set({ selectedModel }),
  setExplainReasoning: (explainReasoning) => set({ explainReasoning }),
  toggleDocumentSelection: (id) =>
    set((s) => ({
      selectedDocuments: s.selectedDocuments.includes(id)
        ? s.selectedDocuments.filter((d) => d !== id)
        : [...s.selectedDocuments, id],
    })),
  clearDocumentSelection: () => set({ selectedDocuments: [] }),
}))
