'use client'
import { useEffect, useState } from 'react'
import api from '@/lib/api'
import { API_URL } from '@/lib/api'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { BookOpen, Plus, Trash2, Pin, PinOff, Sparkles, X, Save, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

interface Note {
  id: string
  title: string
  content: string
  tags: string[]
  is_pinned: boolean
  created_at: string
  updated_at: string
}

export default function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([])
  const [selectedNote, setSelectedNote] = useState<Note | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editContent, setEditContent] = useState('')
  const [saving, setSaving] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [aiPrompt, setAiPrompt] = useState('')
  const [showAiModal, setShowAiModal] = useState(false)
  const [generatedContent, setGeneratedContent] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadNotes() }, [])

  const loadNotes = async () => {
    try {
      const res = await api.get('/notes')
      setNotes(res.data.notes || [])
    } catch { toast.error('Failed to load notes') }
    finally { setLoading(false) }
  }

  const createNote = async () => {
    try {
      const res = await api.post('/notes', { title: 'Untitled Note', content: '' })
      const note = res.data.note
      setNotes(prev => [note, ...prev])
      openNote(note)
    } catch { toast.error('Failed to create note') }
  }

  const openNote = (note: Note) => {
    setSelectedNote(note)
    setEditTitle(note.title)
    setEditContent(note.content)
    setIsEditing(false)
  }

  const saveNote = async () => {
    if (!selectedNote) return
    setSaving(true)
    try {
      const res = await api.put(`/notes/${selectedNote.id}`, { title: editTitle, content: editContent })
      const updated = res.data.note
      setNotes(prev => prev.map(n => n.id === updated.id ? updated : n))
      setSelectedNote(updated)
      toast.success('Note saved')
    } catch { toast.error('Failed to save') }
    finally { setSaving(false); setIsEditing(false) }
  }

  const deleteNote = async (id: string) => {
    if (!confirm('Delete this note?')) return
    try {
      await api.delete(`/notes/${id}`)
      setNotes(prev => prev.filter(n => n.id !== id))
      if (selectedNote?.id === id) setSelectedNote(null)
      toast.success('Deleted')
    } catch { toast.error('Failed to delete') }
  }

  const togglePin = async (note: Note) => {
    try {
      const res = await api.put(`/notes/${note.id}`, { is_pinned: !note.is_pinned })
      setNotes(prev => prev.map(n => n.id === note.id ? res.data.note : n))
    } catch {}
  }

  const generateAINote = async () => {
    if (!aiPrompt.trim()) return
    setGenerating(true)
    setGeneratedContent('')
    const token = typeof window !== 'undefined' ? localStorage.getItem('nd_token') : ''
    try {
      const response = await fetch(`${API_URL}/notes/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ prompt: aiPrompt })
      })
      if (!response.body) throw new Error('No stream')
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let content = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const text = decoder.decode(value)
        const lines = text.split('\n\n').filter(l => l.startsWith('data: '))
        for (const line of lines) {
          const data = line.slice(6)
          if (data === '[DONE]') break
          try {
            const parsed = JSON.parse(data)
            if (parsed.token) { content += parsed.token; setGeneratedContent(content) }
          } catch {}
        }
      }
      // Create note with generated content
      if (content) {
        const firstLine = content.split('\n')[0]?.replace(/^#+\s*/, '')
        const res = await api.post('/notes', { title: firstLine?.slice(0, 80) || 'AI Note', content })
        const note = res.data.note
        setNotes(prev => [note, ...prev])
        openNote(note)
        setShowAiModal(false)
        setAiPrompt('')
        setGeneratedContent('')
        toast.success('AI note created!')
      }
    } catch (err: any) {
      toast.error('Failed to generate: ' + err.message)
    } finally { setGenerating(false) }
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* Notes List */}
      <div className="w-72 flex-shrink-0 flex flex-col border-r border-[rgba(99,102,241,0.1)] bg-[#0d0d18]">
        <div className="p-3 border-b border-[rgba(99,102,241,0.1)] flex gap-2">
          <button onClick={createNote} className="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/20 text-indigo-400 text-sm font-medium transition-all">
            <Plus className="w-4 h-4" /> New Note
          </button>
          <button onClick={() => setShowAiModal(true)} className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-violet-600/20 hover:bg-violet-600/30 border border-violet-500/20 text-violet-400 text-sm font-medium transition-all" title="Generate with AI">
            <Sparkles className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {loading ? (
            Array(5).fill(0).map((_, i) => <div key={i} className="h-16 bg-slate-800/30 rounded-xl animate-pulse" />)
          ) : notes.length === 0 ? (
            <div className="text-center py-10 text-slate-600 text-sm px-4">
              <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-30" />
              No notes yet
            </div>
          ) : notes.map(note => (
            <div key={note.id} onClick={() => openNote(note)}
              className={`group relative px-3 py-3 rounded-xl cursor-pointer transition-all ${
                selectedNote?.id === note.id ? 'bg-indigo-500/15 border border-indigo-500/20' : 'hover:bg-slate-800/40'}`}>
              {note.is_pinned && <div className="absolute top-2 right-2 text-amber-400 text-xs">📌</div>}
              <div className="font-medium text-slate-300 text-sm truncate pr-4">{note.title || 'Untitled'}</div>
              <div className="text-slate-600 text-xs truncate mt-0.5">
                {note.content?.slice(0, 60) || 'Empty note'}
              </div>
              <div className="text-slate-700 text-xs mt-1">{new Date(note.updated_at).toLocaleDateString()}</div>
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 flex gap-1 transition-all">
                <button onClick={(e) => { e.stopPropagation(); togglePin(note) }} className="text-slate-600 hover:text-amber-400 p-0.5">
                  {note.is_pinned ? <PinOff className="w-3 h-3" /> : <Pin className="w-3 h-3" />}
                </button>
                <button onClick={(e) => { e.stopPropagation(); deleteNote(note.id) }} className="text-slate-600 hover:text-rose-400 p-0.5">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Note Editor */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {selectedNote ? (
          <>
            <div className="px-6 py-3 border-b border-[rgba(99,102,241,0.1)] flex items-center gap-3">
              {isEditing ? (
                <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)}
                  className="flex-1 bg-transparent text-xl font-bold text-slate-100 outline-none border-b border-indigo-500/50 pb-1"
                  placeholder="Note title" autoFocus />
              ) : (
                <h2 className="flex-1 text-xl font-bold text-slate-100 truncate">{selectedNote.title || 'Untitled'}</h2>
              )}
              <div className="flex items-center gap-2">
                {isEditing ? (
                  <>
                    <button onClick={() => { setIsEditing(false); setEditTitle(selectedNote.title); setEditContent(selectedNote.content) }}
                      className="px-3 py-1.5 text-sm text-slate-500 hover:text-slate-300 transition-colors">Cancel</button>
                    <button onClick={saveNote} disabled={saving}
                      className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-60">
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save
                    </button>
                  </>
                ) : (
                  <button onClick={() => setIsEditing(true)}
                    className="px-4 py-1.5 rounded-lg bg-slate-800 text-slate-400 text-sm font-medium hover:bg-slate-700 hover:text-slate-200 transition-all border border-slate-700">
                    Edit
                  </button>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {isEditing ? (
                <textarea value={editContent} onChange={(e) => setEditContent(e.target.value)}
                  placeholder="Start writing... (Markdown supported)"
                  className="w-full h-full bg-transparent text-slate-300 text-sm leading-relaxed outline-none resize-none font-mono placeholder-slate-700"
                  style={{ minHeight: '400px' }} />
              ) : (
                <div className="prose-dark max-w-none">
                  {selectedNote.content ? (
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{selectedNote.content}</ReactMarkdown>
                  ) : (
                    <p className="text-slate-700 italic cursor-pointer" onClick={() => setIsEditing(true)}>
                      Click Edit to start writing...
                    </p>
                  )}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-center">
            <div>
              <BookOpen className="w-12 h-12 text-slate-700 mx-auto mb-4" />
              <p className="text-slate-600">Select a note or create a new one</p>
              <div className="flex gap-3 mt-6 justify-center">
                <button onClick={createNote} className="px-5 py-2.5 rounded-xl bg-indigo-600/20 border border-indigo-500/20 text-indigo-400 text-sm font-medium hover:bg-indigo-600/30 transition-all">
                  <span className="flex items-center gap-2"><Plus className="w-4 h-4" /> New Note</span>
                </button>
                <button onClick={() => setShowAiModal(true)} className="px-5 py-2.5 rounded-xl bg-violet-600/20 border border-violet-500/20 text-violet-400 text-sm font-medium hover:bg-violet-600/30 transition-all">
                  <span className="flex items-center gap-2"><Sparkles className="w-4 h-4" /> Generate with AI</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* AI Generate Modal */}
      {showAiModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="glass rounded-2xl p-8 w-full max-w-lg mx-4 animate-scale-in">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Sparkles className="w-6 h-6 text-violet-400" />
                <h3 className="text-xl font-bold text-slate-100">Generate AI Note</h3>
              </div>
              <button onClick={() => { setShowAiModal(false); setAiPrompt(''); setGeneratedContent('') }} className="text-slate-600 hover:text-slate-300">
                <X className="w-5 h-5" />
              </button>
            </div>
            <textarea value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)}
              placeholder="What should the AI write about? e.g., 'Create a note about React hooks best practices'"
              rows={4} className="w-full px-4 py-3 rounded-xl bg-slate-800/60 border border-slate-700 text-slate-200 placeholder-slate-600 outline-none focus:border-indigo-500 text-sm resize-none mb-4" />
            {generatedContent && (
              <div className="max-h-48 overflow-y-auto glass rounded-xl p-4 mb-4 text-sm text-slate-400 prose-dark">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{generatedContent}</ReactMarkdown>
                {generating && <span className="typing-cursor" />}
              </div>
            )}
            <button onClick={generateAINote} disabled={generating || !aiPrompt.trim()}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-medium hover:opacity-90 transition-all disabled:opacity-60">
              {generating ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating…</> : <><Sparkles className="w-4 h-4" /> Generate Note</>}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
