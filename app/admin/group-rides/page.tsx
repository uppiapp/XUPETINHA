'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { AdminHeader } from '@/components/admin/admin-header'
import { Users, Car, Hash, MapPin, RefreshCw, Copy, CheckCheck, Clock, DollarSign } from 'lucide-react'
import { cn } from '@/lib/utils'

interface GroupRide {
  id: string
  invite_code: string
  status: string
  max_passengers: number
  split_method: string
  pickup_address: string
  dropoff_address: string
  created_at: string
  ride_id: string | null
  creator?: { full_name: string } | null
  member_count?: number
  ride?: { status: string; final_price: number | null } | null
}

const STATUS_CFG: Record<string, { label: string; color: string }> = {
  open: { label: 'Aberto', color: 'bg-emerald-500/15 text-emerald-400' },
  full: { label: 'Lotado', color: 'bg-amber-500/15 text-amber-400' },
  in_progress: { label: 'Em Andamento', color: 'bg-blue-500/15 text-blue-400' },
  completed: { label: 'Concluido', color: 'bg-slate-500/15 text-slate-400' },
  cancelled: { label: 'Cancelado', color: 'bg-red-500/15 text-red-400' },
}

const SPLIT_LABELS: Record<string, string> = {
  equal: 'Igualitario',
  by_distance: 'Por Distancia',
  custom: 'Customizado',
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

export default function AdminGroupRidesPage() {
  const [groups, setGroups] = useState<GroupRide[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [copiedCode, setCopiedCode] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const channelRef = useRef<any>(null)

  const fetchGroups = useCallback(async () => {
    const supabase = createClient()

    let query = supabase
      .from('group_rides')
      .select(`
        id, invite_code, status, max_passengers, split_method,
        pickup_address, dropoff_address, created_at, ride_id,
        creator:profiles!group_rides_creator_id_fkey(full_name),
        ride:rides!group_rides_ride_id_fkey(status, final_price)
      `)
      .order('created_at', { ascending: false })
      .limit(100)

    if (statusFilter !== 'all') query = query.eq('status', statusFilter)

    const { data } = await query

    // Buscar contagem de membros
    const ids = (data || []).map(g => g.id)
    let memberCounts: Record<string, number> = {}
    if (ids.length > 0) {
      const { data: members } = await supabase
        .from('group_ride_members')
        .select('group_ride_id')
        .in('group_ride_id', ids)

      for (const m of members || []) {
        memberCounts[m.group_ride_id] = (memberCounts[m.group_ride_id] || 0) + 1
      }
    }

    setGroups((data || []).map(g => ({ ...g, member_count: memberCounts[g.id] || 0 } as any)))
    setLastUpdated(new Date())
    setLoading(false)
  }, [statusFilter])

  useEffect(() => {
    fetchGroups()
    const supabase = createClient()
    channelRef.current = supabase
      .channel('admin-group-rides-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'group_rides' }, fetchGroups)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'group_ride_members' }, fetchGroups)
      .subscribe()
    return () => { if (channelRef.current) supabase.removeChannel(channelRef.current) }
  }, [fetchGroups])

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code)
    setCopiedCode(code)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  const stats = {
    total: groups.length,
    open: groups.filter(g => g.status === 'open').length,
    inProgress: groups.filter(g => g.status === 'in_progress').length,
    completed: groups.filter(g => g.status === 'completed').length,
  }

  const headerActions = (
    <button
      type="button"
      onClick={fetchGroups}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] text-[12px] font-medium text-slate-400 hover:text-slate-200 transition-colors"
    >
      <RefreshCw className="w-3 h-3" />
      {lastUpdated && (
        <span className="hidden sm:inline">
          {lastUpdated.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </span>
      )}
    </button>
  )

  return (
    <>
      <AdminHeader title="Corridas em Grupo" subtitle="Grupos ativos em tempo real" actions={headerActions} />
      <div className="flex-1 overflow-y-auto bg-[hsl(var(--admin-bg))]">
        <div className="p-5 space-y-5">

          {/* KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Total de Grupos', value: stats.total, color: 'text-blue-400' },
              { label: 'Abertos', value: stats.open, color: 'text-emerald-400', pulse: true },
              { label: 'Em Andamento', value: stats.inProgress, color: 'text-amber-400', pulse: true },
              { label: 'Concluidos', value: stats.completed, color: 'text-slate-400' },
            ].map(({ label, value, color, pulse }) => (
              <div key={label} className="bg-[hsl(var(--admin-surface))] rounded-xl p-4 border border-[hsl(var(--admin-border))]">
                <div className="flex items-center justify-between mb-2">
                  <div className={cn('text-[22px] font-bold tabular-nums', color)}>{value}</div>
                  {pulse && value > 0 && (
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 font-medium">{label}</p>
              </div>
            ))}
          </div>

          {/* Filtro de status */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {['all', 'open', 'full', 'in_progress', 'completed', 'cancelled'].map(s => (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter(s)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-colors',
                  statusFilter === s
                    ? 'bg-[hsl(var(--admin-green))]/15 text-[hsl(var(--admin-green))]'
                    : 'bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] text-slate-500 hover:text-slate-300'
                )}
              >
                {s === 'all' ? 'Todos' : STATUS_CFG[s]?.label || s}
                {s !== 'all' && (
                  <span className="ml-1.5 text-[10px] opacity-60">
                    {groups.filter(g => g.status === s).length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Lista de grupos */}
          <div className="bg-[hsl(var(--admin-surface))] rounded-xl border border-[hsl(var(--admin-border))]">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-[hsl(var(--admin-border))]">
              <h3 className="text-[13px] font-bold text-slate-200">Grupos ({groups.length})</h3>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-6 h-6 border-2 border-[hsl(var(--admin-green))] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : groups.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <Users className="w-10 h-10 text-slate-700" />
                <p className="text-[13px] text-slate-500">Nenhum grupo encontrado</p>
              </div>
            ) : (
              <div className="divide-y divide-[hsl(var(--admin-border))]">
                {groups.map(group => {
                  const statusCfg = STATUS_CFG[group.status] || STATUS_CFG.open
                  const creator = group.creator as any
                  const ride = group.ride as any

                  return (
                    <div key={group.id} className="px-5 py-4 hover:bg-[hsl(var(--sidebar-accent))]/30 transition-colors">
                      <div className="flex items-start justify-between gap-4">
                        {/* Left */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                            {/* Invite code */}
                            <button
                              type="button"
                              onClick={() => copyCode(group.invite_code)}
                              className="flex items-center gap-1.5 px-2.5 py-1 bg-[hsl(var(--admin-bg))] border border-[hsl(var(--admin-border))] rounded-md hover:border-[hsl(var(--admin-green))]/40 transition-colors"
                              title="Copiar código"
                            >
                              <Hash className="w-3 h-3 text-slate-500" />
                              <span className="text-[12px] font-mono font-bold text-slate-200 tracking-wider">{group.invite_code}</span>
                              {copiedCode === group.invite_code ? (
                                <CheckCheck className="w-3 h-3 text-emerald-400" />
                              ) : (
                                <Copy className="w-3 h-3 text-slate-600" />
                              )}
                            </button>
                            <span className={cn('px-2 py-0.5 rounded-md text-[10px] font-bold', statusCfg.color)}>
                              {statusCfg.label}
                            </span>
                            <span className="text-[11px] text-slate-600 ml-auto">{getRelativeTime(group.created_at)}</span>
                          </div>

                          {/* Route */}
                          <div className="flex items-start gap-1.5 mb-2">
                            <MapPin className="w-3 h-3 text-slate-600 mt-0.5 shrink-0" />
                            <div className="min-w-0">
                              <p className="text-[12px] text-slate-400 truncate">{group.pickup_address || '—'}</p>
                              <p className="text-[12px] text-slate-600 truncate">→ {group.dropoff_address || '—'}</p>
                            </div>
                          </div>

                          {/* Meta */}
                          <div className="flex items-center gap-4 flex-wrap">
                            <span className="flex items-center gap-1 text-[11px] text-slate-500">
                              <Users className="w-3 h-3" />
                              {group.member_count}/{group.max_passengers} passageiros
                            </span>
                            <span className="flex items-center gap-1 text-[11px] text-slate-500">
                              <Car className="w-3 h-3" />
                              {SPLIT_LABELS[group.split_method] || group.split_method}
                            </span>
                            {creator?.full_name && (
                              <span className="text-[11px] text-slate-600">
                                Criador: <span className="text-slate-400">{creator.full_name}</span>
                              </span>
                            )}
                            {ride?.final_price && (
                              <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-semibold">
                                <DollarSign className="w-3 h-3" />
                                R$ {Number(ride.final_price).toFixed(2)} total
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Membros visual */}
                        <div className="flex flex-col items-center gap-1.5 shrink-0">
                          <div className="flex -space-x-1.5">
                            {Array.from({ length: Math.min(group.member_count || 0, 4) }).map((_, i) => (
                              <div
                                key={i}
                                className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500/40 to-violet-500/40 border-2 border-[hsl(var(--admin-surface))] flex items-center justify-center text-[9px] font-bold text-slate-300"
                              >
                                {i + 1}
                              </div>
                            ))}
                            {(group.member_count || 0) === 0 && (
                              <div className="w-7 h-7 rounded-full bg-[hsl(var(--admin-bg))] border-2 border-dashed border-slate-700 flex items-center justify-center">
                                <Users className="w-3 h-3 text-slate-700" />
                              </div>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-600">{group.member_count || 0} de {group.max_passengers}</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

        </div>
      </div>
    </>
  )
}
