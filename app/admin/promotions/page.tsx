'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { AdminHeader } from '@/components/admin/admin-header'
import {
  Megaphone, Users, TrendingUp, Search, Plus, ToggleLeft, ToggleRight,
  Trash2, RefreshCw, Target, Clock, CheckCircle2, XCircle, Eye, Pencil,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Campaign {
  id: string
  title: string
  description: string | null
  type: 'banner' | 'push' | 'discount' | 'cashback'
  target_audience: 'all' | 'passengers' | 'drivers' | 'inactive' | 'new'
  discount_value: number | null
  discount_type: 'percentage' | 'fixed' | null
  start_date: string | null
  end_date: string | null
  is_active: boolean
  impressions: number
  clicks: number
  conversions: number
  created_at: string
}

const TYPE_LABEL: Record<string, string> = {
  banner: 'Banner',
  push: 'Push Notification',
  discount: 'Desconto',
  cashback: 'Cashback',
}

const TYPE_COLOR: Record<string, string> = {
  banner: 'text-blue-400 bg-blue-500/10',
  push: 'text-violet-400 bg-violet-500/10',
  discount: 'text-emerald-400 bg-emerald-500/10',
  cashback: 'text-amber-400 bg-amber-500/10',
}

const AUDIENCE_LABEL: Record<string, string> = {
  all: 'Todos os usuarios',
  passengers: 'Passageiros',
  drivers: 'Motoristas',
  inactive: 'Inativos 30d',
  new: 'Novos usuarios',
}

const EMPTY_FORM: Partial<Campaign> = {
  title: '',
  description: '',
  type: 'banner',
  target_audience: 'all',
  discount_value: null,
  discount_type: null,
  start_date: '',
  end_date: '',
  is_active: true,
}

export default function AdminPromotionsPage() {
  const supabase = createClient()
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState<string>('all')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<Partial<Campaign>>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  const fetchCampaigns = async () => {
    const { data } = await supabase
      .from('campaigns')
      .select('*')
      .order('created_at', { ascending: false })
    setCampaigns((data as Campaign[]) || [])
    setLoading(false)
  }

  useEffect(() => {
    fetchCampaigns()
    channelRef.current = supabase
      .channel('admin-campaigns')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'campaigns' }, fetchCampaigns)
      .subscribe()
    return () => { if (channelRef.current) supabase.removeChannel(channelRef.current) }
  }, [])

  const handleSave = async () => {
    if (!form.title?.trim()) return
    setSaving(true)
    const payload = {
      title: form.title,
      description: form.description || null,
      type: form.type || 'banner',
      target_audience: form.target_audience || 'all',
      discount_value: form.discount_value || null,
      discount_type: form.discount_type || null,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      is_active: form.is_active ?? true,
    }
    if (editId) {
      await supabase.from('campaigns').update(payload).eq('id', editId)
    } else {
      await supabase.from('campaigns').insert({ ...payload, impressions: 0, clicks: 0, conversions: 0 })
    }
    setSaving(false)
    setShowForm(false)
    setEditId(null)
    setForm(EMPTY_FORM)
    fetchCampaigns()
  }

  const handleToggle = async (id: string, current: boolean) => {
    await supabase.from('campaigns').update({ is_active: !current }).eq('id', id)
    setCampaigns(prev => prev.map(c => c.id === id ? { ...c, is_active: !current } : c))
  }

  const handleDelete = async (id: string) => {
    await supabase.from('campaigns').delete().eq('id', id)
    setCampaigns(prev => prev.filter(c => c.id !== id))
  }

  const handleEdit = (c: Campaign) => {
    setForm(c)
    setEditId(c.id)
    setShowForm(true)
  }

  const filtered = campaigns.filter(c => {
    const q = search.toLowerCase()
    const matchSearch = c.title.toLowerCase().includes(q) || (c.description || '').toLowerCase().includes(q)
    const matchType = filterType === 'all' || c.type === filterType
    return matchSearch && matchType
  })

  const totalImpressions = campaigns.reduce((s, c) => s + (c.impressions || 0), 0)
  const totalClicks = campaigns.reduce((s, c) => s + (c.clicks || 0), 0)
  const totalConversions = campaigns.reduce((s, c) => s + (c.conversions || 0), 0)
  const ctr = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(1) : '0.0'

  const headerActions = (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={fetchCampaigns}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] text-[12px] font-medium text-slate-400 hover:text-slate-200 transition-colors"
      >
        <RefreshCw className="w-3 h-3" />
        Atualizar
      </button>
      <button
        type="button"
        onClick={() => { setForm(EMPTY_FORM); setEditId(null); setShowForm(true) }}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[hsl(var(--admin-green))] text-[hsl(var(--admin-bg))] text-[12px] font-bold hover:opacity-90 transition-opacity"
      >
        <Plus className="w-3.5 h-3.5" />
        Nova Campanha
      </button>
    </div>
  )

  if (loading) {
    return (
      <>
        <AdminHeader title="Campanhas e Promocoes" subtitle="Carregando..." />
        <div className="flex-1 flex items-center justify-center bg-[hsl(var(--admin-bg))]">
          <div className="w-6 h-6 border-2 border-[hsl(var(--admin-green))] border-t-transparent rounded-full animate-spin" />
        </div>
      </>
    )
  }

  return (
    <>
      <AdminHeader
        title="Campanhas e Promocoes"
        subtitle={`${campaigns.length} campanhas — ${campaigns.filter(c => c.is_active).length} ativas`}
        actions={headerActions}
      />
      <div className="flex-1 overflow-y-auto bg-[hsl(var(--admin-bg))]">
        <div className="p-5 space-y-5">

          {/* KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Total Campanhas', value: campaigns.length, icon: Megaphone, color: 'text-blue-400', bg: 'bg-blue-500/10' },
              { label: 'Impressoes', value: totalImpressions.toLocaleString('pt-BR'), icon: Eye, color: 'text-violet-400', bg: 'bg-violet-500/10' },
              { label: 'Cliques (CTR)', value: `${totalClicks.toLocaleString('pt-BR')} (${ctr}%)`, icon: Target, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
              { label: 'Conversoes', value: totalConversions.toLocaleString('pt-BR'), icon: TrendingUp, color: 'text-amber-400', bg: 'bg-amber-500/10' },
            ].map(k => (
              <div key={k.label} className="bg-[hsl(var(--admin-surface))] rounded-xl p-4 border border-[hsl(var(--admin-border))] flex flex-col gap-3">
                <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', k.bg)}>
                  <k.icon className={cn('w-4 h-4', k.color)} />
                </div>
                <div>
                  <p className="text-[22px] font-bold text-slate-100 tracking-tight tabular-nums leading-none">{k.value}</p>
                  <p className="text-[11px] text-slate-500 font-medium mt-1">{k.label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="Buscar campanha..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] text-[13px] text-slate-200 placeholder:text-slate-600 outline-none focus:border-[hsl(var(--admin-green))]"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {['all', 'banner', 'push', 'discount', 'cashback'].map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setFilterType(t)}
                  className={cn(
                    'px-3 py-2 rounded-lg text-[12px] font-semibold transition-colors',
                    filterType === t
                      ? 'bg-[hsl(var(--admin-green))] text-[hsl(var(--admin-bg))]'
                      : 'bg-[hsl(var(--admin-surface))] text-slate-400 border border-[hsl(var(--admin-border))] hover:text-slate-200'
                  )}
                >
                  {t === 'all' ? 'Todos' : TYPE_LABEL[t]}
                </button>
              ))}
            </div>
          </div>

          {/* Form */}
          {showForm && (
            <div className="bg-[hsl(var(--admin-surface))] rounded-xl border border-[hsl(var(--admin-border))] p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-[14px] font-bold text-slate-200">
                  {editId ? 'Editar Campanha' : 'Nova Campanha'}
                </h3>
                <button type="button" onClick={() => setShowForm(false)} className="text-slate-500 hover:text-slate-300 text-[12px]">Cancelar</button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="text-[11px] text-slate-500 font-semibold block mb-1">Titulo *</label>
                  <input
                    type="text"
                    value={form.title || ''}
                    onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                    placeholder="Ex: Black Friday 30% off"
                    className="w-full px-3 py-2 rounded-lg bg-[hsl(var(--admin-bg))] border border-[hsl(var(--admin-border))] text-[13px] text-slate-200 outline-none focus:border-[hsl(var(--admin-green))]"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-[11px] text-slate-500 font-semibold block mb-1">Descricao</label>
                  <textarea
                    value={form.description || ''}
                    onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                    rows={2}
                    className="w-full px-3 py-2 rounded-lg bg-[hsl(var(--admin-bg))] border border-[hsl(var(--admin-border))] text-[13px] text-slate-200 outline-none focus:border-[hsl(var(--admin-green))] resize-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-500 font-semibold block mb-1">Tipo</label>
                  <select
                    value={form.type || 'banner'}
                    onChange={e => setForm(p => ({ ...p, type: e.target.value as Campaign['type'] }))}
                    className="w-full px-3 py-2 rounded-lg bg-[hsl(var(--admin-bg))] border border-[hsl(var(--admin-border))] text-[13px] text-slate-200 outline-none focus:border-[hsl(var(--admin-green))]"
                  >
                    {Object.entries(TYPE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] text-slate-500 font-semibold block mb-1">Publico Alvo</label>
                  <select
                    value={form.target_audience || 'all'}
                    onChange={e => setForm(p => ({ ...p, target_audience: e.target.value as Campaign['target_audience'] }))}
                    className="w-full px-3 py-2 rounded-lg bg-[hsl(var(--admin-bg))] border border-[hsl(var(--admin-border))] text-[13px] text-slate-200 outline-none focus:border-[hsl(var(--admin-green))]"
                  >
                    {Object.entries(AUDIENCE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
                {(form.type === 'discount' || form.type === 'cashback') && (
                  <>
                    <div>
                      <label className="text-[11px] text-slate-500 font-semibold block mb-1">Tipo de Desconto</label>
                      <select
                        value={form.discount_type || 'percentage'}
                        onChange={e => setForm(p => ({ ...p, discount_type: e.target.value as Campaign['discount_type'] }))}
                        className="w-full px-3 py-2 rounded-lg bg-[hsl(var(--admin-bg))] border border-[hsl(var(--admin-border))] text-[13px] text-slate-200 outline-none focus:border-[hsl(var(--admin-green))]"
                      >
                        <option value="percentage">Porcentagem (%)</option>
                        <option value="fixed">Valor fixo (R$)</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-500 font-semibold block mb-1">Valor</label>
                      <input
                        type="number"
                        value={form.discount_value || ''}
                        onChange={e => setForm(p => ({ ...p, discount_value: Number(e.target.value) }))}
                        className="w-full px-3 py-2 rounded-lg bg-[hsl(var(--admin-bg))] border border-[hsl(var(--admin-border))] text-[13px] text-slate-200 outline-none focus:border-[hsl(var(--admin-green))]"
                      />
                    </div>
                  </>
                )}
                <div>
                  <label className="text-[11px] text-slate-500 font-semibold block mb-1">Inicio</label>
                  <input
                    type="date"
                    value={form.start_date?.split('T')[0] || ''}
                    onChange={e => setForm(p => ({ ...p, start_date: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg bg-[hsl(var(--admin-bg))] border border-[hsl(var(--admin-border))] text-[13px] text-slate-200 outline-none focus:border-[hsl(var(--admin-green))]"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-500 font-semibold block mb-1">Fim</label>
                  <input
                    type="date"
                    value={form.end_date?.split('T')[0] || ''}
                    onChange={e => setForm(p => ({ ...p, end_date: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg bg-[hsl(var(--admin-bg))] border border-[hsl(var(--admin-border))] text-[13px] text-slate-200 outline-none focus:border-[hsl(var(--admin-green))]"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-[hsl(var(--admin-border))]">
                <label className="flex items-center gap-2 cursor-pointer">
                  <span className="text-[12px] text-slate-400">Ativar imediatamente</span>
                  <button
                    type="button"
                    onClick={() => setForm(p => ({ ...p, is_active: !p.is_active }))}
                    className="text-slate-400"
                  >
                    {form.is_active
                      ? <ToggleRight className="w-5 h-5 text-[hsl(var(--admin-green))]" />
                      : <ToggleLeft className="w-5 h-5" />
                    }
                  </button>
                </label>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving || !form.title?.trim()}
                  className="px-4 py-2 rounded-lg bg-[hsl(var(--admin-green))] text-[hsl(var(--admin-bg))] text-[12px] font-bold disabled:opacity-50 hover:opacity-90 transition-opacity"
                >
                  {saving ? 'Salvando...' : editId ? 'Salvar Alteracoes' : 'Criar Campanha'}
                </button>
              </div>
            </div>
          )}

          {/* Table */}
          <div className="bg-[hsl(var(--admin-surface))] rounded-xl border border-[hsl(var(--admin-border))]">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-[hsl(var(--admin-border))]">
              <h3 className="text-[13px] font-bold text-slate-200">
                Campanhas {search && `— ${filtered.length} resultado${filtered.length !== 1 ? 's' : ''}`}
              </h3>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[hsl(var(--admin-green))] opacity-60" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[hsl(var(--admin-green))]" />
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="border-b border-[hsl(var(--admin-border))]">
                    {['Campanha', 'Tipo', 'Publico', 'Periodo', 'Impressoes', 'Cliques', 'Conversoes', 'Status', 'Acoes'].map(h => (
                      <th key={h} className="text-left px-4 py-2.5 text-slate-500 font-semibold whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(c => {
                    const now = new Date()
                    const started = c.start_date ? new Date(c.start_date) <= now : true
                    const ended = c.end_date ? new Date(c.end_date) < now : false
                    const ctr = c.impressions > 0 ? ((c.clicks / c.impressions) * 100).toFixed(1) : '0.0'
                    return (
                      <tr key={c.id} className="border-b border-[hsl(var(--admin-border))]/50 hover:bg-[hsl(var(--sidebar-accent))]/50 transition-colors">
                        <td className="px-4 py-3 max-w-[180px]">
                          <p className="text-slate-200 font-medium truncate">{c.title}</p>
                          {c.description && <p className="text-slate-500 text-[11px] truncate">{c.description}</p>}
                          {c.discount_value && (
                            <span className="text-emerald-400 text-[11px] font-bold">
                              {c.discount_type === 'percentage' ? `${c.discount_value}% off` : `R$ ${c.discount_value} off`}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className={cn('px-2 py-0.5 rounded-full text-[11px] font-semibold', TYPE_COLOR[c.type])}>
                            {TYPE_LABEL[c.type]}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 text-slate-400">
                            <Users className="w-3 h-3" />
                            <span>{AUDIENCE_LABEL[c.target_audience]}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                          {c.start_date ? new Date(c.start_date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : '—'}
                          {c.end_date ? ` → ${new Date(c.end_date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}` : ''}
                          {ended && <span className="ml-1 text-red-400 text-[10px]">(encerrada)</span>}
                        </td>
                        <td className="px-4 py-3 text-slate-300 tabular-nums">{c.impressions.toLocaleString('pt-BR')}</td>
                        <td className="px-4 py-3 text-slate-300 tabular-nums">{c.clicks.toLocaleString('pt-BR')} <span className="text-slate-600">({ctr}%)</span></td>
                        <td className="px-4 py-3 text-slate-300 tabular-nums">{c.conversions.toLocaleString('pt-BR')}</td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => handleToggle(c.id, c.is_active)}
                            className="flex items-center gap-1.5 text-[11px] font-semibold"
                          >
                            {c.is_active && !ended
                              ? <><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /><span className="text-emerald-400">Ativa</span></>
                              : ended
                              ? <><Clock className="w-3.5 h-3.5 text-slate-500" /><span className="text-slate-500">Encerrada</span></>
                              : <><XCircle className="w-3.5 h-3.5 text-red-400" /><span className="text-red-400">Inativa</span></>
                            }
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleEdit(c)}
                              className="p-1.5 rounded-md bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors"
                            >
                              <Pencil className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(c.id)}
                              className="p-1.5 rounded-md bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={9} className="px-4 py-12 text-center text-slate-600">
                        <Megaphone className="w-8 h-8 mx-auto mb-2 opacity-30" />
                        <p>Nenhuma campanha encontrada</p>
                        <button
                          type="button"
                          onClick={() => { setForm(EMPTY_FORM); setEditId(null); setShowForm(true) }}
                          className="mt-3 text-[hsl(var(--admin-green))] text-[12px] hover:underline"
                        >
                          Criar primeira campanha
                        </button>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>
    </>
  )
}
