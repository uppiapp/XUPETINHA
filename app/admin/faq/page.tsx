'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { AdminHeader } from '@/components/admin/admin-header'
import { HelpCircle, Plus, Edit2, Trash2, GripVertical, ChevronDown, Save, X, RefreshCw, Eye, EyeOff } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Faq {
  id: string
  question: string
  answer: string
  category: string
  order_index: number
  is_active: boolean
  created_at: string
  updated_at: string
}

const CATEGORIES = ['Corridas', 'Pagamentos', 'Seguranca', 'Motoristas', 'Conta', 'Problemas']

const defaultFaqs: Omit<Faq, 'id' | 'created_at' | 'updated_at'>[] = [
  { question: 'Como funciona a negociacao de preco?', answer: 'Voce informa seu destino e o preco que deseja pagar. Motoristas proximos recebem sua solicitacao e podem aceitar seu preco ou fazer uma contra-oferta.', category: 'Corridas', order_index: 1, is_active: true },
  { question: 'Como sei se o motorista e confiavel?', answer: 'Todos os motoristas passam por verificacao de documentos. Voce pode ver a avaliacao, numero de corridas e comentarios de outros passageiros.', category: 'Seguranca', order_index: 2, is_active: true },
  { question: 'Posso cancelar uma corrida?', answer: 'Sim, voce pode cancelar antes do motorista chegar. Cancelamentos apos o motorista iniciar o deslocamento podem ter taxa.', category: 'Corridas', order_index: 3, is_active: true },
  { question: 'Como funciona o pagamento?', answer: 'Voce pode pagar em dinheiro, cartao de credito/debito ou PIX. O pagamento e processado apenas apos a conclusao da viagem.', category: 'Pagamentos', order_index: 4, is_active: true },
  { question: 'O que fazer em caso de emergencia?', answer: 'Use o botao SOS dentro do app durante a corrida. Suas informacoes e localizacao serao compartilhadas com nosso suporte.', category: 'Seguranca', order_index: 5, is_active: true },
  { question: 'Como adicionar um metodo de pagamento?', answer: 'Va em Perfil > Pagamentos e adicione seu cartao ou configure o PIX. Todos os dados sao criptografados e seguros.', category: 'Pagamentos', order_index: 6, is_active: true },
]

export default function AdminFaqPage() {
  const supabase = createClient()
  const [faqs, setFaqs] = useState<Faq[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | 'new' | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [filterCat, setFilterCat] = useState<string>('all')
  const [form, setForm] = useState({ question: '', answer: '', category: 'Corridas' })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await supabase
        .from('faqs')
        .select('*')
        .order('order_index', { ascending: true })
      setFaqs((data as Faq[]) || [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const startEdit = (faq: Faq) => {
    setEditingId(faq.id)
    setForm({ question: faq.question, answer: faq.answer, category: faq.category })
  }

  const startNew = () => {
    setEditingId('new')
    setForm({ question: '', answer: '', category: 'Corridas' })
  }

  const cancelEdit = () => { setEditingId(null) }

  const save = async () => {
    if (!form.question.trim() || !form.answer.trim()) return
    setSaving(true)
    try {
      if (editingId === 'new') {
        const maxOrder = faqs.reduce((m, f) => Math.max(m, f.order_index), 0)
        const { data, error } = await supabase
          .from('faqs')
          .insert({ ...form, order_index: maxOrder + 1, is_active: true })
          .select()
          .single()
        if (!error && data) setFaqs(prev => [...prev, data as Faq])
      } else {
        const { error } = await supabase
          .from('faqs')
          .update({ ...form, updated_at: new Date().toISOString() })
          .eq('id', editingId)
        if (!error) setFaqs(prev => prev.map(f => f.id === editingId ? { ...f, ...form } : f))
      }
      setEditingId(null)
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async (faq: Faq) => {
    await supabase.from('faqs').update({ is_active: !faq.is_active }).eq('id', faq.id)
    setFaqs(prev => prev.map(f => f.id === faq.id ? { ...f, is_active: !f.is_active } : f))
  }

  const deleteFaq = async (id: string) => {
    if (!confirm('Apagar esta pergunta?')) return
    await supabase.from('faqs').delete().eq('id', id)
    setFaqs(prev => prev.filter(f => f.id !== id))
  }

  const seedDefaults = async () => {
    if (!confirm(`Inserir ${defaultFaqs.length} perguntas padrao?`)) return
    setSaving(true)
    try {
      const { data } = await supabase.from('faqs').insert(defaultFaqs).select()
      if (data) setFaqs(prev => [...prev, ...(data as Faq[])])
    } finally {
      setSaving(false)
    }
  }

  const filtered = filterCat === 'all' ? faqs : faqs.filter(f => f.category === filterCat)

  return (
    <div className="flex flex-col h-screen bg-[#0A0A0A] text-white overflow-hidden">
      <AdminHeader />
      <div className="flex-1 overflow-y-auto p-6 space-y-6">

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Central de Ajuda — FAQ</h1>
            <p className="text-sm text-zinc-400 mt-1">Gerencie as perguntas frequentes exibidas no app</p>
          </div>
          <div className="flex items-center gap-2">
            {faqs.length === 0 && (
              <button onClick={seedDefaults} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg text-sm transition-colors disabled:opacity-50">
                Inserir Perguntas Padrao
              </button>
            )}
            <button onClick={load} className="flex items-center gap-2 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm transition-colors">
              <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
            </button>
            <button onClick={startNew} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium transition-colors">
              <Plus className="w-4 h-4" /> Nova Pergunta
            </button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total de Perguntas', value: faqs.length },
            { label: 'Ativas', value: faqs.filter(f => f.is_active).length },
            { label: 'Inativas', value: faqs.filter(f => !f.is_active).length },
            { label: 'Categorias', value: [...new Set(faqs.map(f => f.category))].length },
          ].map((k, i) => (
            <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <HelpCircle className="w-5 h-5 mb-2 text-blue-400" />
              <p className="text-xs text-zinc-500 mb-1">{k.label}</p>
              <p className="text-xl font-bold text-white">{k.value}</p>
            </div>
          ))}
        </div>

        {/* New / Edit form */}
        {editingId !== null && (
          <div className="bg-zinc-900 border border-blue-500/30 rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-semibold text-blue-400">
              {editingId === 'new' ? 'Nova Pergunta' : 'Editar Pergunta'}
            </h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">Pergunta</label>
                <input
                  value={form.question}
                  onChange={e => setForm(p => ({ ...p, question: e.target.value }))}
                  placeholder="Como funciona...?"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">Resposta</label>
                <textarea
                  value={form.answer}
                  onChange={e => setForm(p => ({ ...p, answer: e.target.value }))}
                  rows={4}
                  placeholder="Explique detalhadamente..."
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-blue-500 resize-none"
                />
              </div>
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">Categoria</label>
                <select
                  value={form.category}
                  onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
                  className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                >
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={save} disabled={saving || !form.question || !form.answer} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors">
                <Save className="w-4 h-4" /> {saving ? 'Salvando...' : 'Salvar'}
              </button>
              <button onClick={cancelEdit} className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm transition-colors">
                <X className="w-4 h-4" /> Cancelar
              </button>
            </div>
          </div>
        )}

        {/* Category filter */}
        <div className="flex gap-2 flex-wrap">
          {['all', ...CATEGORIES].map(cat => (
            <button
              key={cat}
              onClick={() => setFilterCat(cat)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                filterCat === cat ? 'bg-blue-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:text-white'
              )}
            >
              {cat === 'all' ? `Todas (${faqs.length})` : `${cat} (${faqs.filter(f => f.category === cat).length})`}
            </button>
          ))}
        </div>

        {/* FAQ list */}
        <div className="space-y-3">
          {loading ? (
            <div className="text-center py-12 text-zinc-600">Carregando...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <HelpCircle className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
              <p className="text-zinc-500 mb-3">Nenhuma pergunta cadastrada</p>
              <button onClick={seedDefaults} className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm transition-colors">
                Inserir perguntas padrao
              </button>
            </div>
          ) : filtered.map(faq => (
            <div
              key={faq.id}
              className={cn(
                'bg-zinc-900 border rounded-xl overflow-hidden transition-colors',
                faq.is_active ? 'border-zinc-800' : 'border-zinc-800/50 opacity-60'
              )}
            >
              <div className="flex items-center gap-3 px-4 py-3">
                <GripVertical className="w-4 h-4 text-zinc-700 flex-shrink-0 cursor-grab" />
                <button
                  onClick={() => setExpanded(expanded === faq.id ? null : faq.id)}
                  className="flex-1 text-left"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400">{faq.category}</span>
                    <span className={cn('text-xs px-2 py-0.5 rounded-full', faq.is_active ? 'bg-emerald-500/15 text-emerald-400' : 'bg-zinc-700 text-zinc-500')}>
                      {faq.is_active ? 'Ativa' : 'Inativa'}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-white mt-1">{faq.question}</p>
                </button>
                <div className="flex items-center gap-1">
                  <button onClick={() => toggleActive(faq)} className="p-1.5 rounded-lg hover:bg-zinc-800 transition-colors">
                    {faq.is_active ? <Eye className="w-4 h-4 text-zinc-400" /> : <EyeOff className="w-4 h-4 text-zinc-600" />}
                  </button>
                  <button onClick={() => startEdit(faq)} className="p-1.5 rounded-lg hover:bg-zinc-800 transition-colors">
                    <Edit2 className="w-4 h-4 text-blue-400" />
                  </button>
                  <button onClick={() => deleteFaq(faq.id)} className="p-1.5 rounded-lg hover:bg-zinc-800 transition-colors">
                    <Trash2 className="w-4 h-4 text-red-400" />
                  </button>
                  <button onClick={() => setExpanded(expanded === faq.id ? null : faq.id)} className="p-1.5 rounded-lg hover:bg-zinc-800 transition-colors">
                    <ChevronDown className={cn('w-4 h-4 text-zinc-400 transition-transform', expanded === faq.id && 'rotate-180')} />
                  </button>
                </div>
              </div>
              {expanded === faq.id && (
                <div className="px-11 pb-4 pt-0">
                  <p className="text-sm text-zinc-400 leading-relaxed">{faq.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
