import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'NeuroDesk AI — Personal AI Knowledge OS',
  description: 'An AI-powered Knowledge Operating System with persistent memory, RAG pipelines, and multi-agent intelligence.',
  keywords: 'AI, Knowledge OS, RAG, Ollama, Personal AI, Document Intelligence',
  openGraph: {
    title: 'NeuroDesk AI',
    description: 'Your Personal AI Brain — Chat, Research, Remember',
    type: 'website',
  }
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-[#0a0a0f] text-slate-100 antialiased`}>
        {children}
      </body>
    </html>
  )
}
