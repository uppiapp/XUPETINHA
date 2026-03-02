'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { AdminHeader } from '@/components/admin/admin-header'
import {
  AlertTriangle, RefreshCw, MapPin, Clock, CheckCircle, XCircle,
  Phone, Shield, User, Mic, Share2, Bell, Filter,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface EmergencyAlert {
  id: string
  user_id: string
  latitude: number | null
  longitude: number | null
  status: string
  notes: string | null
  created_at: string
  resolved_at: string | null
  profile?: { full_name: string; phone: string; avatar_url: string | null } | null
}

const STATUS_CFG: Record<string, { label: string; color: string; icon: any; pulse?: boolean }> = {
  active: { label: 'ATIVO', color: 'bg-red-500/20 text-red-400 border border-red-500/30', icon: AlertTriangle, pulse: true },
  acknowledged: { label: 'Em Atendimento', color: 'bg-amber-500/15 text-amber-400', icon: Shield },
  resolved: { label: 'Resolvido', color: 'bg-emerald-500/15 text-emerald-400', icon: CheckCircle },
  false_alarm: { label: 'Falso Alarme', color: 'bg-slate-500/15 text-slate-400', icon: XCircle },
}

function getRelativeTime(d: string) {
  const diff = Date.now() - new Date(d).getTime()
  const m = Math.floor(diff / 60000)
  const h = Math.floor(m / 60)
  const day = Math.floor(h / 24)
  if (m < 1) return 'agora'
  if (m < 60) return `${m}m atrás`
  if (h < 24) return `${h}h atrás`
  return `${day}d atrás`
}

export default function AdminEmergencyPage() {
  const [alerts, setAlerts] = useState<EmergencyAlert[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [selected, setSelected] = useState<EmergencyAlert | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const channelRef = useRef<any>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const prevActiveRef = useRef(0)

  const fetchAlerts = useCallback(async () => {
    const supabase = createClient()
    let query = supabase
      .from('emergency_alerts')
      .select(`
        id, user_id, latitude, longitude, status, notes, created_at, resolved_at,
        profile:profiles!emergency_alerts_user_id_fkey(full_name, phone, avatar_url)
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .limit(100)

    if (statusFilter !== 'all') query = query.eq('status', statusFilter)

    const { data, count } = await query
    const newAlerts = (data as any) || []
    const activeCount = newAlerts.filter((a: EmergencyAlert) => a.status === 'active').length

    // Tocar alerta se novo SOS ativo aparecer
    if (activeCount > prevActiveRef.current && prevActiveRef.current >= 0) {
      try {
        if (!audioRef.current) {
          audioRef.current = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq4NKMjJSh8LgsXs9HB1DdaOzmm4yFRo5X4ehmW8sCAolT3+YlHA0BAkpVHuQj2wzAgsrUnmOjGY3AA4vUnSLh2A2Ag82Tm+GiFs1Bhk7TGqBhFY0Bxo9SmR+glI0CRk8SmN9gVE0CRg9SmN9gVA0Cxg7S2N8gFE0DBg7S2N8gFE0Cxk7S2N8gVE0DBg8Sl98gFE0CRg9SmF/gVA0Cxg7Smp+gVE0DBg8Sl98gFA0CRg9Sl9/gFE0CRg9Sl9/gFE0CRg9Sl9/gFE0CRg9Sl9/gFE0CRg9Sl9/gFE0CRg9Sl9/gFE0CRg9Sl9/gFE=')
          audioRef.current.volume = 0.4
        }
        audioRef.current.play().catch(() => {})
      } catch {}
    }
    prevActiveRef.current = activeCount

    setAlerts(newAlerts)
    setTotal(count || 0)
    setLastUpdated(new Date())
    setLoading(false)
  }, [statusFilter])

  useEffect(() => {
    fetchAlerts()
    const supabase = createClient()
    channelRef.current = supabase
      .channel('admin-emergency-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'emergency_alerts' }, fetchAlerts)
      .subscribe()
    return () => { if (channelRef.current) supabase.removeChannel(channelRef.current) }
  }, [fetchAlerts])

  const updateStatus = async (alertId: string, newStatus: string) => {
    setUpdatingId(alertId)
    const supabase = createClient()
    const updates: any = { status: newStatus }
    if (newStatus === 'resolved' || newStatus === 'false_alarm') {
      updates.resolved_at = new Date().toISOString()
    }
    await supabase.from('emergency_alerts').update(updates).eq('id', alertId)
    await fetchAlerts()
    if (selected?.id === alertId) {
      setSelected(prev => prev ? { ...prev, status: newStatus, resolved_at: updates.resolved_at } : null)
    }
    setUpdatingId(null)
  }

  const stats = {
    active: alerts.filter(a => a.status === 'active').length,
    acknowledged: alerts.filter(a => a.status === 'acknowledged').length,
    resolved: alerts.filter(a => a.status === 'resolved').length,
    total,
  }

  const headerActions = (
    <div className="flex items-center gap-2">
      {stats.active > 0 && (
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/15 border border-red-500/30 text-[12px] font-bold text-red-400">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
          </span>
          {stats.active} ATIVO{stats.active > 1 ? 'S' : ''}
        </div>
      )}
      <button
        type="button"
        onClick={fetchAlerts}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] text-[12px] font-medium text-slate-400 hover:text-slate-200 transition-colors"
      >
        <RefreshCw className="w-3 h-3" />
        {lastUpdated && (
          <span className="hidden sm:inline">
            {lastUpdated.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
        )}
      </button>
    </div>
  )

  return (
    <>
      <AdminHeader title="Central de Emergencias" subtitle="Alertas SOS em tempo real" actions={headerActions} />
      <div className="flex-1 overflow-y-auto bg-[hsl(var(--admin-bg))]">
        <div className="p-5 space-y-5">

          {/* Active SOS Banner */}
          {stats.active > 0 && (
            <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-400 animate-pulse" />
              </div>
              <div>
                <p className="text-[14px] font-bold text-red-400">
                  {stats.active} alerta{stats.active > 1 ? 's' : ''} SOS ativo{stats.active > 1 ? 's' : ''}
                </p>
                <p className="text-[12px] text-red-400/70">Requer atencao imediata. Verifique os alertas abaixo.</p>
              </div>
            </div>
          )}

          {/* KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Ativos', value: stats.active, color: 'text-red-400', bg: 'bg-red-500/10' },
              { label: 'Em Atendimento', value: stats.acknowledged, color: 'text-amber-400', bg: 'bg-amber-500/10' },
              { label: 'Resolvidos', value: stats.resolved, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
              { label: 'Total', value: stats.total, color: 'text-blue-400', bg: 'bg-blue-500/10' },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-[hsl(var(--admin-surface))] rounded-xl p-4 border border-[hsl(var(--admin-border))]">
                <p className={cn('text-[22px] font-bold tabular-nums', color)}>{value}</p>
                <p className="text-[11px] text-slate-500 font-medium mt-1">{label}</p>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            {['all', 'active', 'acknowledged', 'resolved', 'false_alarm'].map(s => (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter(s)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-colors',
                  statusFilter === s
                    ? s === 'active'
                      ? 'bg-red-500/15 text-red-400 border border-red-500/30'
                      : 'bg-[hsl(var(--admin-green))]/15 text-[hsl(var(--admin-green))]'
                    : 'bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] text-slate-500 hover:text-slate-300'
                )}
              >
                {s === 'all' ? 'Todos' : STATUS_CFG[s]?.label || s}
              </button>
            ))}
          </div>

          <div className={cn('flex gap-5', selected ? 'flex-col lg:flex-row' : '')}>
            {/* Alerts List */}
            <div className={cn('bg-[hsl(var(--admin-surface))] rounded-xl border border-[hsl(var(--admin-border))]', selected ? 'flex-1' : 'w-full')}>
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-[hsl(var(--admin-border))]">
                <h3 className="text-[13px] font-bold text-slate-200">Alertas ({alerts.length})</h3>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-60" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                </span>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="w-6 h-6 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : alerts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <Shield className="w-10 h-10 text-slate-700" />
                  <p className="text-[13px] text-slate-500">Nenhum alerta encontrado</p>
                </div>
              ) : (
                <div className="divide-y divide-[hsl(var(--admin-border))]">
                  {alerts.map(alert => {
                    const statusCfg = STATUS_CFG[alert.status] || STATUS_CFG.active
                    const StatusIcon = statusCfg.icon
                    const profile = alert.profile as any

                    return (
                      <div
                        key={alert.id}
                        onClick={() => setSelected(selected?.id === alert.id ? null : alert)}
                        className={cn(
                          'flex items-start gap-4 px-5 py-4 cursor-pointer transition-colors',
                          alert.status === 'active' ? 'bg-red-500/5 hover:bg-red-500/10' : 'hover:bg-[hsl(var(--sidebar-accent))]/30',
                          selected?.id === alert.id && 'border-l-2 border-red-500'
                        )}
                      >
                        {/* Icon */}
                        <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0', alert.status === 'active' ? 'bg-red-500/20' : 'bg-[hsl(var(--admin-bg))]')}>
                          <StatusIcon className={cn('w-4 h-4', alert.status === 'active' ? 'text-red-400 animate-pulse' : 'text-slate-500')} />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="text-[13px] font-bold text-slate-200 truncate">
                              {profile?.full_name || 'Usuário desconhecido'}
                            </span>
                            <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold', statusCfg.color)}>
                              {statusCfg.pulse && <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />}
                              {statusCfg.label}
                            </span>
                            <span className="text-[11px] text-slate-600 ml-auto">{getRelativeTime(alert.created_at)}</span>
                          </div>

                          {profile?.phone && (
                            <div className="flex items-center gap-1.5 mb-1">
                              <Phone className="w-3 h-3 text-slate-600 shrink-0" />
                              <span className="text-[12px] text-slate-400">{profile.phone}</span>
                            </div>
                          )}

                          {alert.latitude && alert.longitude && (
                            <div className="flex items-center gap-1.5">
                              <MapPin className="w-3 h-3 text-slate-600 shrink-0" />
                              <a
                                href={`https://maps.google.com/?q=${alert.latitude},${alert.longitude}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={e => e.stopPropagation()}
                                className="text-[12px] text-blue-400 hover:text-blue-300 underline-offset-2 hover:underline"
                              >
                                {alert.latitude.toFixed(5)}, {alert.longitude.toFixed(5)}
                              </a>
                            </div>
                          )}

                          {/* Quick actions for active */}
                          {alert.status === 'active' && (
                            <div className="flex items-center gap-2 mt-2">
                              <button
                                type="button"
                                onClick={e => { e.stopPropagation(); updateStatus(alert.id, 'acknowledged') }}
                                disabled={updatingId === alert.id}
                                className="px-2.5 py-1 rounded-md bg-amber-500/15 text-amber-400 text-[10px] font-bold hover:bg-amber-500/25 transition-colors disabled:opacity-40"
                              >
                                {updatingId === alert.id ? '...' : 'Atender'}
                              </button>
                              <button
                                type="button"
                                onClick={e => { e.stopPropagation(); updateStatus(alert.id, 'false_alarm') }}
                                disabled={updatingId === alert.id}
                                className="px-2.5 py-1 rounded-md bg-slate-500/15 text-slate-400 text-[10px] font-bold hover:bg-slate-500/25 transition-colors disabled:opacity-40"
                              >
                                Falso Alarme
                              </button>
                              {profile?.phone && (
                                <a
                                  href={`tel:${profile.phone}`}
                                  onClick={e => e.stopPropagation()}
                                  className="ml-auto px-2.5 py-1 rounded-md bg-emerald-500/15 text-emerald-400 text-[10px] font-bold hover:bg-emerald-500/25 transition-colors flex items-center gap-1"
                                >
                                  <Phone className="w-3 h-3" />
                                  Ligar
                                </a>
                              )}
                            </div>
                          )}
                          {alert.status === 'acknowledged' && (
                            <button
                              type="button"
                              onClick={e => { e.stopPropagation(); updateStatus(alert.id, 'resolved') }}
                              disabled={updatingId === alert.id}
                              className="mt-2 px-2.5 py-1 rounded-md bg-emerald-500/15 text-emerald-400 text-[10px] font-bold hover:bg-emerald-500/25 transition-colors disabled:opacity-40"
                            >
                              {updatingId === alert.id ? 'Salvando...' : 'Marcar Resolvido'}
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Detail Panel */}
            {selected && (
              <div className="w-full lg:w-[320px] bg-[hsl(var(--admin-surface))] rounded-xl border border-[hsl(var(--admin-border))] h-fit shrink-0">
                <div className="flex items-center justify-between px-5 py-3.5 border-b border-[hsl(var(--admin-border))]">
                  <h3 className="text-[13px] font-bold text-slate-200">Detalhes do Alerta</h3>
                  <button type="button" onClick={() => setSelected(null)} className="text-slate-500 hover:text-slate-300 text-[11px] font-medium">Fechar</button>
                </div>
                <div className="p-5 space-y-4">
                  {/* Status */}
                  {(() => {
                    const cfg = STATUS_CFG[selected.status] || STATUS_CFG.active
                    const Icon = cfg.icon
                    return (
                      <div>
                        <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-2">Status</p>
                        <span className={cn('inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-bold', cfg.color)}>
                          <Icon className="w-3.5 h-3.5" />
                          {cfg.label}
                        </span>
                      </div>
                    )
                  })()}

                  {/* Usuário */}
                  {(() => {
                    const p = selected.profile as any
                    return (
                      <div>
                        <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-2">Usuario</p>
                        <div className="flex items-center gap-3 p-3 bg-[hsl(var(--admin-bg))] rounded-xl">
                          <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center text-red-400 font-bold text-[14px] shrink-0">
                            {p?.full_name?.charAt(0) || '?'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-bold text-slate-200">{p?.full_name || 'Desconhecido'}</p>
                            <p className="text-[12px] text-slate-500">{p?.phone || 'Sem telefone'}</p>
                          </div>
                          {p?.phone && (
                            <a
                              href={`tel:${p.phone}`}
                              className="w-9 h-9 rounded-full bg-emerald-500 flex items-center justify-center shrink-0"
                            >
                              <Phone className="w-4 h-4 text-white" />
                            </a>
                          )}
                        </div>
                      </div>
                    )
                  })()}

                  {/* Localização */}
                  {selected.latitude && selected.longitude && (
                    <div>
                      <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-2">Localizacao</p>
                      <div className="p-3 bg-[hsl(var(--admin-bg))] rounded-xl space-y-2">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-3.5 h-3.5 text-red-400 shrink-0" />
                          <span className="text-[12px] font-mono text-slate-300">
                            {selected.latitude.toFixed(6)}, {selected.longitude.toFixed(6)}
                          </span>
                        </div>
                        <a
                          href={`https://maps.google.com/?q=${selected.latitude},${selected.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-blue-500/15 text-blue-400 text-[12px] font-bold hover:bg-blue-500/25 transition-colors"
                        >
                          <MapPin className="w-3.5 h-3.5" />
                          Ver no Maps
                        </a>
                      </div>
                    </div>
                  )}

                  {/* Acoes */}
                  {selected.status !== 'resolved' && selected.status !== 'false_alarm' && (
                    <div>
                      <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-2">Acoes</p>
                      <div className="space-y-2">
                        {selected.status === 'active' && (
                          <button
                            type="button"
                            onClick={() => updateStatus(selected.id, 'acknowledged')}
                            disabled={updatingId === selected.id}
                            className="w-full py-2.5 rounded-xl bg-amber-500/15 text-amber-400 text-[13px] font-bold hover:bg-amber-500/25 transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
                          >
                            <Shield className="w-4 h-4" />
                            Iniciar Atendimento
                          </button>
                        )}
                        {(selected.status === 'active' || selected.status === 'acknowledged') && (
                          <>
                            <button
                              type="button"
                              onClick={() => updateStatus(selected.id, 'resolved')}
                              disabled={updatingId === selected.id}
                              className="w-full py-2.5 rounded-xl bg-emerald-500/15 text-emerald-400 text-[13px] font-bold hover:bg-emerald-500/25 transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
                            >
                              <CheckCircle className="w-4 h-4" />
                              Marcar Resolvido
                            </button>
                            <button
                              type="button"
                              onClick={() => updateStatus(selected.id, 'false_alarm')}
                              disabled={updatingId === selected.id}
                              className="w-full py-2.5 rounded-xl bg-slate-500/15 text-slate-400 text-[13px] font-bold hover:bg-slate-500/25 transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
                            >
                              <XCircle className="w-4 h-4" />
                              Falso Alarme
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Datas */}
                  <div>
                    <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-2">Datas</p>
                    <div className="space-y-1.5">
                      <div className="flex justify-between">
                        <span className="text-[12px] text-slate-500">Ativado</span>
                        <span className="text-[12px] text-slate-400">
                          {new Date(selected.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      {selected.resolved_at && (
                        <div className="flex justify-between">
                          <span className="text-[12px] text-slate-500">Resolvido</span>
                          <span className="text-[12px] text-emerald-400">
                            {new Date(selected.resolved_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">ID</p>
                    <p className="text-[11px] font-mono text-slate-500 break-all">{selected.id}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </>
  )
}
