'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'

export default function TermsPage() {
  const [content, setContent] = useState<string | null>(null)
  const [updatedAt, setUpdatedAt] = useState<string | null>(null)

  useEffect(() => {
    createClient()
      .from('legal_documents')
      .select('content, updated_at')
      .eq('type', 'terms')
      .single()
      .then(({ data }) => {
        if (data) {
          setContent(data.content)
          setUpdatedAt(data.updated_at)
        }
      })
  }, [])

  const renderContent = (text: string) =>
    text.split('\n').map((line, i) => {
      if (line.startsWith('# '))  return <h1 key={i} className="text-2xl font-bold text-blue-900 mb-4">{line.slice(2)}</h1>
      if (line.startsWith('## ')) return <h2 key={i} className="text-xl font-bold text-blue-900 mt-6 mb-3">{line.slice(3)}</h2>
      if (line.startsWith('- '))  return <li key={i} className="ml-6 list-disc">{line.slice(2)}</li>
      if (line.trim() === '')     return <div key={i} className="h-2" />
      return <p key={i} className="leading-relaxed">{line}</p>
    })

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/uppi/settings">
            <Button variant="ghost" size="icon" className="bg-transparent">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-blue-900">Termos de Uso</h1>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-lg text-gray-700">
          {content === null ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="space-y-1">{renderContent(content)}</div>
          )}
          {updatedAt && (
            <p className="pt-6 mt-6 border-t text-sm text-gray-400">
              Ultima atualizacao: {new Date(updatedAt).toLocaleDateString('pt-BR')}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
