'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { AdminHeader } from '@/components/admin/admin-header'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Search, HeadphonesIcon, User, Clock, CheckCircle, Circle,
  Send, AlertTriangle, MessageCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface SupportTicket {
  id: string
  user_id: string
  subject: string
  message: string
  status: string
  priority: string
  category: string
  created_at: string
  resolved_at: string | null
  admin_notes: string | null
  user?: { full_name: string; phone: string; user_type: string } | null
}

type StatusFilter = 'all' | 'open' | 'in_progress' | 'resolved'
type PriorityFilter = 'all' | 'high' | 'medium' | 'low'

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  open: { label: 'Aberto', color: 'text-amber-400', bg: 'bg-amber-500/15' },
  in_progress: { label: 'Em Atendimento', color: 'text-blue-400', bg: 'bg-blue-500/15' },
  resolved: { label: 'Resolvido', color: 'text-emerald-400', bg: 'bg-emerald-500/15' },
}

const priorityConfig: Record<string, { label: string; color: string }> = {
  high: { label: 'Alta', color: 'text-red-400' },
  medium: { label: 'Media', color: 'text-amber-400' },
  low: { label: 'Baixa', color: 'text-slate-400' },
}

export default function AdminSupportPage() {
  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [adminNote, setAdminNote] = useState('')
  const noteRef = useRef<HTMLTextAreaElement>(null)

  const fetchTickets = useCallback(async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('support_tickets')
      .select('*, user:profiles!support_tickets_user_id_fkey(full_name, phone, user_type)')
      .order('created_at', { ascending: false })
      .limit(200)
    if (data) setTickets(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchTickets()
    const supabase = createClient()
    const channel = supabase
      .channel('admin-support-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_tickets' }, () => fetchTickets())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [fetchTickets])

  const updateTicketStatus = async (id: string, status: string) => {
    const supabase = createClient()
    await supabase.from('support_tickets').update({
      status,
      ...(status === 'resolved' ? { resolved_at: new Date().toISOString() } : {}),
    }).eq('id', id)
    await fetchTickets()
  }

  const saveAdminNote = async (id: string) => {
    if (!adminNote.trim()) return
    setSaving(true)
    const supabase = createClient()
    await supabase.from('support_tickets').update({ admin_notes: adminNote }).eq('id', id)
    await fetchTickets()
    setSaving(false)
  }

  const openCount = tickets.filter(t => t.status === 'open').length
  const inProgressCount = tickets.filter(t => t.status === 'in_progress').length
  const resolvedCount = tickets.filter(t => t.status === 'resolved').length
  const highPriorityCount = tickets.filter(t => t.priority === 'high' && t.status !== 'resolved').length

  const filtered = tickets.filter((t) => {
    if (statusFilter !== 'all' && t.status !== statusFilter) return false
    if (search) {
      const q = search.toLowerCase()
      return (
        t.subject.toLowerCase().includes(q) ||
        t.message.toLowerCase().includes(q) ||
        t.user?.full_name?.toLowerCase().includes(q) ||
        t.id.includes(q)
      )
    }
    return true
  })

  const selectedTicket = tickets.find(t => t.id === selected)

  useEffect(() => {
    if (selectedTicket) {
      setAdminNote(selectedTicket.admin_notes || '')
    }
  }, [selected, selectedTicket])

  if (loading) {
    return (
      <>
        <AdminHeader title="Suporte" subtitle="Carregando..." />
        <div className="flex-1 flex items-center justify-center bg-[hsl(var(--admin-bg))]">
          <div className="w-6 h-6 border-2 border-[hsl(var(--admin-green))] border-t-transparent rounded-full animate-spin" />
        </div>
      </>
    )
  }

  return (
    <>
      <AdminHeader
        title="Suporte"
        subtitle={`${openCount} abertos · ${inProgressCount} em atendimento · ${resolvedCount} resolvidos`}
      />
      <div className="flex-1 overflow-hidden flex bg-[hsl(var(--admin-bg))]">

        {/* Left panel: ticket list */}
        <div className="w-[340px] shrink-0 flex flex-col border-r border-[hsl(var(--admin-border))]">
          {/* KPIs */}
          <div className="p-3 grid grid-cols-2 gap-2 border-b border-[hsl(var(--admin-border))]">
            {[
              { label: 'Abertos', value: openCount, color: 'text-amber-400' },
              { label: 'Alta Prior.', value: highPriorityCount, color: 'text-red-400' },
            ].map((kpi) => (
              <div key={kpi.label} className="bg-[hsl(var(--admin-surface))] rounded-xl p-3 border border-[hsl(var(--admin-border))]">
                <p className="text-[10px] text-slate-500">{kpi.label}</p>
                <p className={cn('text-[20px] font-bold tabular-nums', kpi.color)}>{kpi.value}</p>
              </div>
            ))}
          </div>

          {/* Search + filter */}
          <div className="p-3 space-y-2 border-b border-[hsl(var(--admin-border))]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
              <Input
                placeholder="Buscar ticket..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-9 rounded-xl bg-[hsl(var(--admin-surface))] border-[hsl(var(--admin-border))] text-slate-200 placeholder:text-slate-600 text-[12px]"
              />
            </div>
            <div className="flex gap-1">
              {([
                { key: 'all', label: 'Todos' },
                { key: 'open', label: 'Abertos' },
                { key: 'in_progress', label: 'Em Aten.' },
                { key: 'resolved', label: 'Resolvidos' },
              ] as { key: StatusFilter; label: string }[]).map((f) => (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setStatusFilter(f.key)}
                  className={cn(
                    'flex-1 py-1 rounded-lg text-[11px] font-semibold transition-colors',
                    statusFilter === f.key
                      ? 'bg-[hsl(var(--admin-green))]/15 text-[hsl(var(--admin-green))]'
                      : 'bg-[hsl(var(--admin-surface))] text-slate-500 hover:text-slate-300 border border-[hsl(var(--admin-border))]'
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tickets */}
          <div className="flex-1 overflow-y-auto">
            {filtered.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-slate-600">
                <HeadphonesIcon className="w-8 h-8 mb-2 opacity-30" />
                <p className="text-[13px]">Nenhum ticket</p>
              </div>
            )}
            {filtered.map((ticket) => {
              const sc = statusConfig[ticket.status] || statusConfig.open
              const pc = priorityConfig[ticket.priority] || priorityConfig.medium
              return (
                <button
                  key={ticket.id}
                  type="button"
                  onClick={() => setSelected(ticket.id === selected ? null : ticket.id)}
                  className={cn(
                    'w-full text-left px-4 py-3 border-b border-[hsl(var(--admin-border))] transition-colors hover:bg-[hsl(var(--admin-surface))]/60',
                    selected === ticket.id && 'bg-[hsl(var(--admin-surface))] border-l-2 border-l-[hsl(var(--admin-green))]'
                  )}
                >
                  <div className="flex items-start gap-2 mb-1">
                    <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded', sc.color, sc.bg)}>{sc.label}</span>
                    <span className={cn('text-[10px] font-semibold ml-auto', pc.color)}>{pc.label}</span>
                  </div>
                  <p className="text-[12px] font-semibold text-slate-200 truncate mb-0.5">{ticket.subject}</p>
                  <p className="text-[11px] text-slate-400 truncate">{ticket.message}</p>
                  <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-600">
                    <User className="w-3 h-3" />
                    <span>{ticket.user?.full_name || 'Usuario'}</span>
                    <Clock className="w-3 h-3 ml-auto" />
                    <span>{new Date(ticket.created_at).toLocaleDateString('pt-BR')}</span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Right panel: ticket detail */}
        <div className="flex-1 flex flex-col min-w-0">
          {!selectedTicket ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-600">
              <HeadphonesIcon className="w-12 h-12 mb-3 opacity-20" />
              <p className="text-[14px] font-medium">Selecione um ticket</p>
              <p className="text-[12px] mt-1 opacity-60">Clique em um ticket para ver os detalhes</p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* Header */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h2 className="text-[17px] font-bold text-slate-100 mb-1">{selectedTicket.subject}</h2>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={cn('text-[11px] font-bold px-2 py-0.5 rounded', statusConfig[selectedTicket.status]?.color, statusConfig[selectedTicket.status]?.bg)}>
                      {statusConfig[selectedTicket.status]?.label}
                    </span>
                    <span className={cn('text-[11px] font-semibold', priorityConfig[selectedTicket.priority]?.color)}>
                      Prioridade {priorityConfig[selectedTicket.priority]?.label}
                    </span>
                    <span className="text-[11px] text-slate-500">{selectedTicket.category}</span>
                  </div>
                </div>
                {/* Status actions */}
                <div className="flex gap-2 shrink-0">
                  {selectedTicket.status !== 'in_progress' && selectedTicket.status !== 'resolved' && (
                    <button
                      type="button"
                      onClick={() => updateTicketStatus(selectedTicket.id, 'in_progress')}
                      className="px-3 py-1.5 rounded-lg bg-blue-500/15 text-blue-400 text-[12px] font-bold hover:bg-blue-500/25 transition-colors flex items-center gap-1.5"
                    >
                      <Circle className="w-3.5 h-3.5" /> Atender
                    </button>
                  )}
                  {selectedTicket.status !== 'resolved' && (
                    <button
                      type="button"
                      onClick={() => updateTicketStatus(selectedTicket.id, 'resolved')}
                      className="px-3 py-1.5 rounded-lg bg-emerald-500/15 text-emerald-400 text-[12px] font-bold hover:bg-emerald-500/25 transition-colors flex items-center gap-1.5"
                    >
                      <CheckCircle className="w-3.5 h-3.5" /> Resolver
                    </button>
                  )}
                </div>
              </div>

              {/* User info */}
              <div className="bg-[hsl(var(--admin-surface))] rounded-xl border border-[hsl(var(--admin-border))] p-4">
                <p className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider mb-2 flex items-center gap-1">
                  <User className="w-3 h-3" /> Usuario
                </p>
                <p className="text-[14px] font-semibold text-slate-200">{selectedTicket.user?.full_name || 'Desconhecido'}</p>
                <p className="text-[12px] text-slate-500">{selectedTicket.user?.phone || 'Sem telefone'}</p>
                <p className="text-[11px] text-slate-600 mt-0.5 capitalize">{selectedTicket.user?.user_type || 'Tipo desconhecido'}</p>
              </div>

              {/* Message */}
              <div className="bg-[hsl(var(--admin-surface))] rounded-xl border border-[hsl(var(--admin-border))] p-4">
                <p className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider mb-2 flex items-center gap-1">
                  <MessageCircle className="w-3 h-3" /> Mensagem
                </p>
                <p className="text-[13px] text-slate-300 leading-relaxed">{selectedTicket.message}</p>
                <p className="text-[11px] text-slate-600 mt-3">
                  Enviado em {new Date(selectedTicket.created_at).toLocaleString('pt-BR')}
                </p>
                {selectedTicket.resolved_at && (
                  <p className="text-[11px] text-emerald-500 mt-1">
                    Resolvido em {new Date(selectedTicket.resolved_at).toLocaleString('pt-BR')}
                  </p>
                )}
              </div>

              {/* Admin notes */}
              <div className="bg-[hsl(var(--admin-surface))] rounded-xl border border-[hsl(var(--admin-border))] p-4">
                <p className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider mb-2 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> Notas Internas (Admin)
                </p>
                <textarea
                  ref={noteRef}
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  placeholder="Adicione notas internas sobre este ticket..."
                  rows={4}
                  className="w-full bg-[hsl(var(--admin-bg))] text-slate-300 text-[13px] rounded-lg p-3 border border-[hsl(var(--admin-border))] resize-none focus:outline-none focus:ring-1 focus:ring-[hsl(var(--admin-green))]/50 placeholder:text-slate-600"
                />
                <button
                  type="button"
                  onClick={() => saveAdminNote(selectedTicket.id)}
                  disabled={saving || !adminNote.trim()}
                  className="mt-2 px-4 py-2 rounded-lg bg-[hsl(var(--admin-green))]/15 text-[hsl(var(--admin-green))] text-[12px] font-bold hover:bg-[hsl(var(--admin-green))]/25 transition-colors flex items-center gap-2 disabled:opacity-40"
                >
                  {saving
                    ? <div className="w-3.5 h-3.5 border border-current border-t-transparent rounded-full animate-spin" />
                    : <Send className="w-3.5 h-3.5" />}
                  Salvar Nota
                </button>
              </div>

              <p className="text-[10px] text-slate-700 font-mono">ID: {selectedTicket.id}</p>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
