'use client'
import { useEffect, useState, useRef } from 'react'
import api from '@/lib/api'
import { Network, ZoomIn, ZoomOut, Maximize2, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'

interface GraphNode {
  id: string
  label: string
  type: string
  importance: number
  x?: number
  y?: number
  vx?: number
  vy?: number
}

interface GraphEdge {
  source: string
  target: string
  weight: number
}

const NODE_COLORS: Record<string, string> = {
  document: '#10b981',
  memory: '#6366f1',
  conversation: '#06b6d4',
  general: '#8b5cf6',
  default: '#475569'
}

const NODE_ICONS: Record<string, string> = {
  document: '📄',
  memory: '🧠',
  conversation: '💬',
  general: '⚡',
}

export default function GraphPage() {
  const [nodes, setNodes] = useState<GraphNode[]>([])
  const [edges, setEdges] = useState<GraphEdge[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 })
  const containerRef = useRef<HTMLDivElement>(null)

  const loadGraph = async () => {
    setLoading(true)
    try {
      const res = await api.get('/memory/graph')
      const { nodes: n = [], edges: e = [] } = res.data
      // Initialize positions
      const w = containerRef.current?.clientWidth || 800
      const h = containerRef.current?.clientHeight || 600
      const initialized = n.map((node: GraphNode) => ({
        ...node,
        x: Math.random() * w * 0.7 + w * 0.15,
        y: Math.random() * h * 0.7 + h * 0.15,
        vx: 0, vy: 0
      }))
      setNodes(initialized)
      setEdges(e)
    } catch { toast.error('Failed to load graph') }
    finally { setLoading(false) }
  }

  useEffect(() => {
    loadGraph()
    const handleResize = () => {
      if (containerRef.current) {
        setDimensions({ width: containerRef.current.clientWidth, height: containerRef.current.clientHeight })
      }
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Force-directed layout simulation
  useEffect(() => {
    if (nodes.length === 0) return
    let frameNodes = [...nodes]

    const simulate = () => {
      frameNodes = frameNodes.map(node => {
        let fx = 0, fy = 0
        // Repulsion
        frameNodes.forEach(other => {
          if (other.id === node.id) return
          const dx = (node.x || 0) - (other.x || 0)
          const dy = (node.y || 0) - (other.y || 0)
          const dist = Math.sqrt(dx * dx + dy * dy) + 1
          const force = 3000 / (dist * dist)
          fx += (dx / dist) * force
          fy += (dy / dist) * force
        })
        // Attraction through edges
        edges.forEach(edge => {
          if (edge.source === node.id || edge.target === node.id) {
            const otherId = edge.source === node.id ? edge.target : edge.source
            const other = frameNodes.find(n => n.id === otherId)
            if (!other) return
            const dx = (other.x || 0) - (node.x || 0)
            const dy = (other.y || 0) - (node.y || 0)
            const dist = Math.sqrt(dx * dx + dy * dy) + 1
            const force = dist * 0.01
            fx += (dx / dist) * force
            fy += (dy / dist) * force
          }
        })
        // Center gravity
        const cx = dimensions.width / 2
        const cy = dimensions.height / 2
        fx += ((cx - (node.x || 0)) * 0.002)
        fy += ((cy - (node.y || 0)) * 0.002)

        const vx = ((node.vx || 0) + fx) * 0.85
        const vy = ((node.vy || 0) + fy) * 0.85
        return {
          ...node,
          x: Math.max(60, Math.min(dimensions.width - 60, (node.x || 0) + vx)),
          y: Math.max(60, Math.min(dimensions.height - 60, (node.y || 0) + vy)),
          vx, vy
        }
      })
      setNodes([...frameNodes])
    }

    const timer = setInterval(simulate, 50)
    const stop = setTimeout(() => clearInterval(timer), 8000)
    return () => { clearInterval(timer); clearTimeout(stop) }
  }, [nodes.length, edges.length, dimensions])

  // Canvas rendering
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.save()
    ctx.translate(pan.x, pan.y)
    ctx.scale(zoom, zoom)

    // Draw edges
    edges.forEach(edge => {
      const source = nodes.find(n => n.id === edge.source)
      const target = nodes.find(n => n.id === edge.target)
      if (!source || !target) return
      ctx.beginPath()
      ctx.moveTo(source.x || 0, source.y || 0)
      ctx.lineTo(target.x || 0, target.y || 0)
      ctx.strokeStyle = `rgba(99, 102, 241, ${edge.weight * 0.4})`
      ctx.lineWidth = Math.max(1, edge.weight * 3)
      ctx.stroke()
    })

    // Draw nodes
    nodes.forEach(node => {
      const x = node.x || 0
      const y = node.y || 0
      const r = 20 + (node.importance || 0.5) * 15
      const color = NODE_COLORS[node.type] || NODE_COLORS.default
      const isSelected = selectedNode?.id === node.id

      // Glow for selected
      if (isSelected) {
        const glow = ctx.createRadialGradient(x, y, r, x, y, r * 2)
        glow.addColorStop(0, color + '40')
        glow.addColorStop(1, 'transparent')
        ctx.beginPath()
        ctx.arc(x, y, r * 2, 0, Math.PI * 2)
        ctx.fillStyle = glow
        ctx.fill()
      }

      // Node circle
      ctx.beginPath()
      ctx.arc(x, y, r, 0, Math.PI * 2)
      const grad = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, 0, x, y, r)
      grad.addColorStop(0, color + 'ee')
      grad.addColorStop(1, color + '99')
      ctx.fillStyle = grad
      ctx.fill()
      ctx.strokeStyle = isSelected ? '#fff' : color
      ctx.lineWidth = isSelected ? 2.5 : 1.5
      ctx.stroke()

      // Label
      ctx.fillStyle = '#e2e8f0'
      ctx.font = `${isSelected ? 'bold ' : ''}${Math.max(9, 12 - node.label.length * 0.1)}px Inter, sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'top'
      const label = node.label.length > 20 ? node.label.slice(0, 18) + '…' : node.label
      ctx.fillText(label, x, y + r + 5)
    })

    ctx.restore()
  }, [nodes, edges, zoom, pan, selectedNode])

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return
    const x = (e.clientX - rect.left - pan.x) / zoom
    const y = (e.clientY - rect.top - pan.y) / zoom
    const clicked = nodes.find(n => {
      const r = 20 + (n.importance || 0.5) * 15
      const dx = (n.x || 0) - x, dy = (n.y || 0) - y
      return Math.sqrt(dx * dx + dy * dy) <= r
    })
    setSelectedNode(clicked || null)
  }

  const typeCount = nodes.reduce((acc, n) => { acc[n.type] = (acc[n.type] || 0) + 1; return acc }, {} as Record<string, number>)

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-[rgba(99,102,241,0.1)] flex items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-linear-to-br from-violet-600 to-indigo-600 flex items-center justify-center">
            <Network className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-slate-100">Knowledge Graph</h1>
            <p className="text-xs text-slate-600">{nodes.length} nodes · {edges.length} connections</p>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {/* Type legend */}
          {Object.entries(typeCount).map(([type, count]) => (
            <div key={type} className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs border" style={{ borderColor: NODE_COLORS[type] + '40', backgroundColor: NODE_COLORS[type] + '15', color: NODE_COLORS[type] }}>
              <span>{NODE_ICONS[type] || '•'}</span> {type} ({count})
            </div>
          ))}
          <div className="flex items-center gap-1 ml-4">
            <button onClick={() => setZoom(z => Math.max(0.3, z - 0.2))} className="p-2 rounded-lg hover:bg-slate-800 text-slate-500 hover:text-slate-300 transition-colors"><ZoomOut className="w-4 h-4" /></button>
            <span className="text-xs text-slate-600 w-12 text-center">{Math.round(zoom * 100)}%</span>
            <button onClick={() => setZoom(z => Math.min(3, z + 0.2))} className="p-2 rounded-lg hover:bg-slate-800 text-slate-500 hover:text-slate-300 transition-colors"><ZoomIn className="w-4 h-4" /></button>
            <button onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }) }} className="p-2 rounded-lg hover:bg-slate-800 text-slate-500 hover:text-slate-300 transition-colors"><Maximize2 className="w-4 h-4" /></button>
            <button onClick={loadGraph} className="p-2 rounded-lg hover:bg-slate-800 text-slate-500 hover:text-slate-300 transition-colors"><RefreshCw className="w-4 h-4" /></button>
          </div>
        </div>
      </div>

      {/* Canvas area */}
      <div className="flex-1 relative overflow-hidden" ref={containerRef}>
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="w-12 h-12 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-slate-500">Loading graph…</p>
            </div>
          </div>
        ) : nodes.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center text-center">
            <div>
              <Network className="w-16 h-16 text-slate-700 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-slate-400 mb-2">Knowledge Graph is Empty</h3>
              <p className="text-slate-600 text-sm">Upload documents and chat to build your knowledge graph</p>
            </div>
          </div>
        ) : (
          <canvas ref={canvasRef} width={dimensions.width} height={dimensions.height}
            onClick={handleCanvasClick}
            className="w-full h-full cursor-crosshair"
            style={{ background: 'radial-gradient(ellipse at center, #0d0d20 0%, #0a0a0f 100%)' }} />
        )}

        {/* Selected node panel */}
        {selectedNode && (
          <div className="absolute top-4 right-4 glass rounded-2xl p-5 w-72 animate-slide-in">
            <div className="flex items-start gap-3">
              <div className="text-2xl">{NODE_ICONS[selectedNode.type] || '⚡'}</div>
              <div className="flex-1 min-w-0">
                <div className="text-xs text-slate-600 uppercase tracking-wide mb-1">{selectedNode.type}</div>
                <div className="font-semibold text-slate-200 text-sm leading-tight">{selectedNode.label}</div>
                <div className="mt-2">
                  <div className="text-xs text-slate-600 mb-1">Importance</div>
                  <div className="w-full bg-slate-800 rounded-full h-1.5">
                    <div className="h-1.5 rounded-full bg-linear-to-r from-indigo-600 to-violet-600"
                      style={{ width: `${(selectedNode.importance || 0.5) * 100}%` }} />
                  </div>
                  <div className="text-xs text-slate-600 mt-1">{Math.round((selectedNode.importance || 0.5) * 100)}%</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
