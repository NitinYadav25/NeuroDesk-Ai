'use client'
import { useEffect, useState, useCallback } from 'react'
import api from '@/lib/api'
import { useDropzone } from 'react-dropzone'
import { FileText, Upload, Trash2, CheckCircle, Clock, AlertCircle, Loader2, File, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'

interface Document {
  id: string
  title: string
  file_type: string
  file_size: number
  embedding_status: 'pending' | 'processing' | 'completed' | 'failed'
  created_at: string
  metadata?: any
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([])
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadDocuments() }, [])

  // Poll processing documents
  useEffect(() => {
    const processing = documents.filter(d => d.embedding_status === 'processing' || d.embedding_status === 'pending')
    if (processing.length > 0) {
      const timer = setTimeout(loadDocuments, 3000)
      return () => clearTimeout(timer)
    }
  }, [documents])

  const loadDocuments = async () => {
    try {
      const res = await api.get('/documents')
      setDocuments(res.data.documents || [])
    } catch { toast.error('Failed to load documents') }
    finally { setLoading(false) }
  }

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    for (const file of acceptedFiles) {
      await uploadFile(file)
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: { 'application/pdf': ['.pdf'], 'text/plain': ['.txt'], 'text/markdown': ['.md', '.markdown'] },
    multiple: true
  })

  const uploadFile = async (file: File) => {
    setUploading(true)
    setUploadProgress(0)
    const formData = new FormData()
    formData.append('file', file)
    formData.append('title', file.name.replace(/\.[^.]+$/, ''))
    try {
      const res = await api.post('/documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => setUploadProgress(Math.round((e.loaded * 100) / (e.total || 1)))
      })
      toast.success(`"${res.data.document.title}" uploaded! Processing...`)
      setDocuments(prev => [res.data.document, ...prev])
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Upload failed')
    } finally { setUploading(false); setUploadProgress(0) }
  }

  const deleteDocument = async (id: string, title: string) => {
    if (!confirm(`Delete "${title}"?`)) return
    try {
      await api.delete(`/documents/${id}`)
      setDocuments(prev => prev.filter(d => d.id !== id))
      toast.success('Document deleted')
    } catch { toast.error('Delete failed') }
  }

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const StatusIcon = ({ status }: { status: string }) => {
    if (status === 'completed') return <CheckCircle className="w-4 h-4 text-emerald-400" />
    if (status === 'processing' || status === 'pending') return <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />
    if (status === 'failed') return <AlertCircle className="w-4 h-4 text-rose-400" />
    return <Clock className="w-4 h-4 text-slate-500" />
  }

  const getStatusText = (status: string) => {
    if (status === 'completed') return 'Ready'
    if (status === 'processing') return 'Processing…'
    if (status === 'pending') return 'Pending…'
    if (status === 'failed') return 'Failed'
    return status
  }

  const getFileIcon = (type: string) => {
    if (type === 'pdf') return '📄'
    if (type === 'md' || type === 'markdown') return '📝'
    return '📃'
  }

  return (
    <div className="flex-1 overflow-y-auto p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-600 flex items-center justify-center">
              <FileText className="w-6 h-6 text-white" />
            </div>
            Documents
          </h1>
          <p className="text-slate-500 mt-1 ml-14">Upload and manage your knowledge base</p>
        </div>
        <button onClick={loadDocuments} className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600 transition-all text-sm">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Upload Zone */}
      <div {...getRootProps()} className={`relative mb-8 rounded-2xl border-2 border-dashed transition-all duration-300 cursor-pointer ${
        isDragActive ? 'border-indigo-500 bg-indigo-500/10' : 'border-slate-700 hover:border-slate-600 bg-slate-800/20 hover:bg-slate-800/40'}`}>
        <input {...getInputProps()} />
        <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
          {uploading ? (
            <div className="w-full max-w-xs">
              <Loader2 className="w-10 h-10 text-indigo-400 animate-spin mx-auto mb-4" />
              <p className="text-slate-400 mb-3">Uploading…</p>
              <div className="w-full bg-slate-800 rounded-full h-2">
                <div className="bg-gradient-to-r from-indigo-600 to-violet-600 h-2 rounded-full transition-all" style={{ width: `${uploadProgress}%` }} />
              </div>
              <p className="text-xs text-slate-600 mt-2">{uploadProgress}%</p>
            </div>
          ) : (
            <>
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 transition-all ${isDragActive ? 'bg-indigo-500/20 scale-110' : 'bg-slate-800'}`}>
                <Upload className={`w-8 h-8 ${isDragActive ? 'text-indigo-400' : 'text-slate-500'}`} />
              </div>
              <p className="text-lg font-semibold text-slate-300 mb-2">
                {isDragActive ? 'Drop files here' : 'Upload Documents'}
              </p>
              <p className="text-slate-600 text-sm">Drag & drop or click to browse</p>
              <div className="flex gap-2 mt-4">
                {['PDF', 'TXT', 'Markdown'].map(f => (
                  <span key={f} className="px-3 py-1 rounded-full bg-slate-800 text-slate-500 text-xs border border-slate-700">{f}</span>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Documents List */}
      <div className="space-y-3">
        {loading ? (
          Array(3).fill(0).map((_, i) => (
            <div key={i} className="glass rounded-2xl p-5 animate-pulse">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-slate-800 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-slate-800 rounded w-2/3" />
                  <div className="h-3 bg-slate-800 rounded w-1/3" />
                </div>
              </div>
            </div>
          ))
        ) : documents.length === 0 ? (
          <div className="text-center py-16 text-slate-600">
            <File className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No documents yet. Upload your first document above.</p>
          </div>
        ) : documents.map(doc => (
          <div key={doc.id} className="glass rounded-2xl p-5 flex items-center gap-4 hover:border-slate-600 transition-all group animate-fade-in">
            <div className="text-2xl">{getFileIcon(doc.file_type)}</div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-slate-200 truncate">{doc.title}</h3>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-xs text-slate-600 uppercase">{doc.file_type}</span>
                <span className="text-xs text-slate-700">•</span>
                <span className="text-xs text-slate-600">{formatSize(doc.file_size)}</span>
                <span className="text-xs text-slate-700">•</span>
                <span className="text-xs text-slate-600">{new Date(doc.created_at).toLocaleDateString()}</span>
                {doc.metadata?.chunksProcessed && (
                  <>
                    <span className="text-xs text-slate-700">•</span>
                    <span className="text-xs text-emerald-600">{doc.metadata.chunksProcessed} chunks indexed</span>
                  </>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <StatusIcon status={doc.embedding_status} />
              <span className={`text-xs font-medium ${
                doc.embedding_status === 'completed' ? 'text-emerald-400' :
                doc.embedding_status === 'failed' ? 'text-rose-400' : 'text-amber-400'}`}>
                {getStatusText(doc.embedding_status)}
              </span>
            </div>
            <button onClick={() => deleteDocument(doc.id, doc.title)}
              className="opacity-0 group-hover:opacity-100 text-slate-700 hover:text-rose-400 transition-all ml-2">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
