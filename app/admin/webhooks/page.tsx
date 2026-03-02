'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { AdminHeader } from '@/components/admin/admin-header'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Webhook, Plus, Trash2, CheckCircle2, XCircle, Clock,
  Copy, Check, RefreshCw, X, ChevronDown, ChevronUp,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface WebhookEndpoint {
  id: string
  url: string
  events: string[]
  secret: string
  is_active: boolean
  last_triggered_at: string | null
  last_status_code: number | null
  total_deliveries: number
  failed_deliveries: number
  created_at: string
}

const AVAILABLE_EVENTS = [
  { value: 'ride.created', label: 'Corrida criada', group: 'Corridas' },
  { value: 'ride.accepted', label: 'Corrida aceita', group: 'Corridas' },
  { value: 'ride.completed', label: 'Corrida finalizada', group: 'Corridas' },
  { value: 'ride.cancelled', label: 'Corrida cancelada', group: 'Corridas' },
  { value: 'payment.completed', label: 'Pagamento confirmado', group: 'Pagamentos' },
  { value: 'payment.failed', label: 'Pagamento falhou', group: 'Pagamentos' },
  { value: 'driver.verified', label: 'Motorista verificado', group: 'Motoristas' },
  { value: 'driver.banned', label: 'Motorista banido', group: 'Motoristas' },
  { value: 'user.registered', label: 'Novo usuário', group: 'Usuários' },
  { value: 'user.banned', label: 'Usuário banido', group: 'Usuários' },
]

function CreateModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [url, setUrl] = useState('')
  const [selectedEvents, setSelectedEvents] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const toggleEvent = (event: string) => {
    setSelectedEvents(prev =>
      prev.includes(event) ? prev.filter(e => e !== event) : [...prev, event]
    )
  }

  const handleSave = async () => {
    if (!url.trim()) { setError('Informe a URL do endpoint'); return }
    if (selectedEvents.length === 0) { setError('Selecione ao menos um evento'); return }
    try { new URL(url) } catch { setError('URL inválida'); return }

    setSaving(true)
    setError('')
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const { error: err } = await supabase.from('webhook_endpoints').insert({
      url: url.trim(),
      events: selectedEvents,
      created_by: user?.id,
    })
    if (err) { setError(err.message); setSaving(false); return }
    onSaved()
    onClose()
  }

  const groups = [...new Set(AVAILABLE_EVENTS.map(e => e.group))]

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] rounded-xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[hsl(var(--admin-border))]">
          <h2 className="text-[14px] font-bold text-slate-100">Novo Webhook</h2>
          <button type="button" onClick={onClose} className="w-7 h-7 rounded-lg hover:bg-[hsl(var(--sidebar-accent))] flex items-center justify-center text-slate-400 hover:text-slate-200 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-[11px] text-slate-500 font-semibold mb-1.5 block uppercase tracking-wide">URL do Endpoint *</label>
            <Input
              type="url"
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="https://api.seusite.com/webhooks"
              className="bg-[hsl(var(--admin-bg))] border-[hsl(var(--admin-border))] text-slate-100 h-10 rounded-lg font-mono text-[13px]"
            />
          </div>
          <div>
            <label className="text-[11px] text-slate-500 font-semibold mb-2 block uppercase tracking-wide">Eventos *</label>
            <div className="space-y-3">
              {groups.map(group => (
                <div key={group}>
                  <p className="text-[10px] text-slate-600 uppercase font-bold tracking-widest mb-1.5">{group}</p>
                  <div className="space-y-1">
                    {AVAILABLE_EVENTS.filter(e => e.group === group).map(event => (
                      <label key={event.value} className="flex items-center gap-2.5 cursor-pointer group">
                        <div
                          onClick={() => toggleEvent(event.value)}
                          className={cn(
                            'w-4 h-4 rounded border-2 flex items-center justify-center transition-colors cursor-pointer shrink-0',
                            selectedEvents.includes(event.value)
                              ? 'bg-[hsl(var(--admin-green))] border-[hsl(var(--admin-green))]'
                              : 'border-[hsl(var(--admin-border))] hover:border-[hsl(var(--admin-green))]/50'
                          )}
                        >
                          {selectedEvents.includes(event.value) && <Check className="w-2.5 h-2.5 text-white" />}
                        </div>
                        <span
                          onClick={() => toggleEvent(event.value)}
                          className="text-[12px] text-slate-300 group-hover:text-slate-100 transition-colors cursor-pointer"
                        >
                          {event.label}
                        </span>
                        <code className="text-[10px] text-slate-600 font-mono ml-auto">{event.value}</code>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
          {error && <p className="text-[12px] text-red-400 bg-red-500/10 px-3 py-2 rounded-lg">{error}</p>}
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 h-10 rounded-lg bg-[hsl(var(--admin-bg))] border border-[hsl(var(--admin-border))] text-slate-400 text-[13px] font-semibold hover:text-slate-200 transition-colors">
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="flex-1 h-10 rounded-lg bg-[hsl(var(--admin-green))]/20 text-[hsl(var(--admin-green))] text-[13px] font-bold border border-[hsl(var(--admin-green))]/30 hover:bg-[hsl(var(--admin-green))]/30 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {saving ? <div className="w-4 h-4 border-2 border-[hsl(var(--admin-green))] border-t-transparent rounded-full animate-spin" /> : <Plus className="w-4 h-4" />}
              Criar Webhook
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button
      type="button"
      onClick={handleCopy}
      className="w-6 h-6 rounded flex items-center justify-center text-slate-500 hover:text-slate-300 transition-colors shrink-0"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-[hsl(var(--admin-green))]" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  )
}

export default function WebhooksPage() {
  const [endpoints, setEndpoints] = useState<WebhookEndpoint[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)

  const fetchEndpoints = useCallback(async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('webhook_endpoints')
      .select('*')
      .order('created_at', { ascending: false })
    setEndpoints(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchEndpoints() }, [fetchEndpoints])

  const toggleActive = async (endpoint: WebhookEndpoint) => {
    const supabase = createClient()
    await supabase.from('webhook_endpoints').update({ is_active: !endpoint.is_active }).eq('id', endpoint.id)
    fetchEndpoints()
  }

  const deleteEndpoint = async (id: string) => {
    if (!confirm('Remover este webhook endpoint?')) return
    const supabase = createClient()
    await supabase.from('webhook_endpoints').delete().eq('id', id)
    fetchEndpoints()
  }

  const totalDeliveries = endpoints.reduce((s, e) => s + (e.total_deliveries || 0), 0)
  const totalFailed = endpoints.reduce((s, e) => s + (e.failed_deliveries || 0), 0)
  const activeCount = endpoints.filter(e => e.is_active).length

  const headerActions = (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={fetchEndpoints}
        className="w-8 h-8 rounded-lg bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] flex items-center justify-center text-slate-400 hover:text-slate-200 transition-colors"
      >
        <RefreshCw className="w-3.5 h-3.5" />
      </button>
      <button
        type="button"
        onClick={() => setShowModal(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[hsl(var(--admin-green))]/15 text-[hsl(var(--admin-green))] border border-[hsl(var(--admin-green))]/30 text-[12px] font-semibold hover:bg-[hsl(var(--admin-green))]/25 transition-colors"
      >
        <Plus className="w-3.5 h-3.5" />
        Novo Webhook
      </button>
    </div>
  )

  return (
    <>
      {showModal && <CreateModal onClose={() => setShowModal(false)} onSaved={fetchEndpoints} />}
      <AdminHeader title="Webhooks" subtitle="Endpoints para eventos em tempo real" actions={headerActions} />
      <div className="flex-1 overflow-y-auto bg-[hsl(var(--admin-bg))] p-5 space-y-5">

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Total', value: endpoints.length, color: 'text-blue-400', bg: 'bg-blue-500/10' },
            { label: 'Ativos', value: activeCount, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
            { label: 'Entregas', value: totalDeliveries, color: 'text-violet-400', bg: 'bg-violet-500/10' },
            { label: 'Falhas', value: totalFailed, color: 'text-red-400', bg: 'bg-red-500/10' },
          ].map(s => (
            <div key={s.label} className="bg-[hsl(var(--admin-surface))] rounded-xl p-4 border border-[hsl(var(--admin-border))] flex items-center gap-3">
              <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center shrink-0', s.bg)}>
                <Webhook className={cn('w-4 h-4', s.color)} />
              </div>
              <div>
                <p className="text-[20px] font-bold text-slate-100 tabular-nums">{s.value}</p>
                <p className="text-[11px] text-slate-500">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Endpoints list */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-6 h-6 border-2 border-[hsl(var(--admin-green))] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : endpoints.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-600 bg-[hsl(var(--admin-surface))] rounded-xl border border-[hsl(var(--admin-border))]">
            <Webhook className="w-10 h-10 mb-3 opacity-30" />
            <p className="text-[14px] font-medium text-slate-500">Nenhum webhook configurado</p>
            <p className="text-[12px] mt-1">Crie um endpoint para receber eventos da plataforma</p>
            <button
              type="button"
              onClick={() => setShowModal(true)}
              className="mt-4 flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[hsl(var(--admin-green))]/15 text-[hsl(var(--admin-green))] border border-[hsl(var(--admin-green))]/30 text-[13px] font-semibold hover:bg-[hsl(var(--admin-green))]/25 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Criar primeiro webhook
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {endpoints.map(ep => {
              const isExpanded = expanded === ep.id
              const successRate = ep.total_deliveries > 0
                ? (((ep.total_deliveries - ep.failed_deliveries) / ep.total_deliveries) * 100).toFixed(0)
                : '—'

              return (
                <div
                  key={ep.id}
                  className="bg-[hsl(var(--admin-surface))] rounded-xl border border-[hsl(var(--admin-border))] overflow-hidden"
                >
                  {/* Header row */}
                  <div className="flex items-center gap-3 px-5 py-4">
                    <div className="shrink-0">
                      {ep.is_active
                        ? <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                        : <XCircle className="w-5 h-5 text-slate-600" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-mono font-semibold text-slate-200 truncate">{ep.url}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {ep.events.slice(0, 4).map(e => (
                          <span key={e} className="text-[10px] font-mono text-slate-500 bg-[hsl(var(--admin-bg))] border border-[hsl(var(--admin-border))] px-1.5 py-0.5 rounded">
                            {e}
                          </span>
                        ))}
                        {ep.events.length > 4 && (
                          <span className="text-[10px] text-slate-600">+{ep.events.length - 4} mais</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Badge className={cn(
                        'text-[10px] font-bold border-0 mr-1',
                        ep.is_active ? 'bg-emerald-500/15 text-emerald-400' : 'bg-slate-500/15 text-slate-500'
                      )}>
                        {ep.is_active ? 'Ativo' : 'Inativo'}
                      </Badge>
                      <button
                        type="button"
                        onClick={() => toggleActive(ep)}
                        className={cn(
                          'w-7 h-7 rounded-lg flex items-center justify-center transition-colors',
                          ep.is_active ? 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20' : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                        )}
                        title={ep.is_active ? 'Desativar' : 'Ativar'}
                      >
                        {ep.is_active
                          ? <XCircle className="w-3.5 h-3.5" />
                          : <CheckCircle2 className="w-3.5 h-3.5" />
                        }
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteEndpoint(ep.id)}
                        className="w-7 h-7 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 flex items-center justify-center transition-colors"
                        title="Remover"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setExpanded(isExpanded ? null : ep.id)}
                        className="w-7 h-7 rounded-lg bg-[hsl(var(--admin-bg))] border border-[hsl(var(--admin-border))] text-slate-400 flex items-center justify-center transition-colors"
                      >
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  {/* Expandido */}
                  {isExpanded && (
                    <div className="border-t border-[hsl(var(--admin-border))] p-5 space-y-4">
                      {/* Métricas */}
                      <div className="grid grid-cols-3 gap-3 text-[12px]">
                        <div className="bg-[hsl(var(--admin-bg))] rounded-lg p-3 border border-[hsl(var(--admin-border))]">
                          <p className="text-slate-500 mb-0.5">Entregas</p>
                          <p className="text-[17px] font-bold text-slate-100 tabular-nums">{ep.total_deliveries || 0}</p>
                        </div>
                        <div className="bg-[hsl(var(--admin-bg))] rounded-lg p-3 border border-[hsl(var(--admin-border))]">
                          <p className="text-slate-500 mb-0.5">Falhas</p>
                          <p className={cn('text-[17px] font-bold tabular-nums', ep.failed_deliveries > 0 ? 'text-red-400' : 'text-slate-100')}>
                            {ep.failed_deliveries || 0}
                          </p>
                        </div>
                        <div className="bg-[hsl(var(--admin-bg))] rounded-lg p-3 border border-[hsl(var(--admin-border))]">
                          <p className="text-slate-500 mb-0.5">Taxa sucesso</p>
                          <p className={cn('text-[17px] font-bold tabular-nums', Number(successRate) >= 90 ? 'text-emerald-400' : 'text-amber-400')}>
                            {successRate}{successRate !== '—' ? '%' : ''}
                          </p>
                        </div>
                      </div>

                      {/* Último disparo e status */}
                      <div className="flex items-center gap-3 text-[12px] text-slate-500">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Último disparo: {ep.last_triggered_at ? new Date(ep.last_triggered_at).toLocaleString('pt-BR') : 'Nunca'}</span>
                        {ep.last_status_code && (
                          <Badge className={cn(
                            'text-[10px] border-0',
                            ep.last_status_code < 300 ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'
                          )}>
                            HTTP {ep.last_status_code}
                          </Badge>
                        )}
                      </div>

                      {/* Secret */}
                      <div>
                        <p className="text-[11px] text-slate-500 font-semibold mb-1.5 uppercase tracking-wide">Signing Secret (HMAC-SHA256)</p>
                        <div className="flex items-center gap-2 bg-[hsl(var(--admin-bg))] border border-[hsl(var(--admin-border))] rounded-lg px-3 py-2.5">
                          <code className="text-[11px] font-mono text-slate-400 flex-1 truncate">{ep.secret}</code>
                          <CopyButton text={ep.secret} />
                        </div>
                        <p className="text-[10px] text-slate-600 mt-1.5">Use este secret para validar a assinatura dos webhooks recebidos.</p>
                      </div>

                      {/* Todos os eventos */}
                      <div>
                        <p className="text-[11px] text-slate-500 font-semibold mb-1.5 uppercase tracking-wide">Eventos Inscritos ({ep.events.length})</p>
                        <div className="flex flex-wrap gap-1.5">
                          {ep.events.map(e => (
                            <span key={e} className="text-[11px] font-mono text-[hsl(var(--admin-green))] bg-[hsl(var(--admin-green))]/10 border border-[hsl(var(--admin-green))]/20 px-2 py-0.5 rounded">
                              {e}
                            </span>
                          ))}
                        </div>
                      </div>

                      <p className="text-[10px] text-slate-700 font-mono">ID: {ep.id}</p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}
