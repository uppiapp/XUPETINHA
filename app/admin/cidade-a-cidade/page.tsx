'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { AdminHeader } from '@/components/admin/admin-header'
import {
  MapPin, Search, RefreshCw, Clock, CheckCircle, XCircle,
  Car, Filter, User, Navigation, DollarSign, ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface IntercityRide {
  id: string
  passenger_id: string
  driver_id: string | null
  pickup_address: string
  dropoff_address: string
  pickup_city: string | null
  dropoff_city: string | null
  status: string
  final_price: number | null
  passenger_price_offer: number | null
  distance_km: number | null
  created_at: string
  completed_at: string | null
  profile?: { full_name: string; phone: string } | null
  driver_profile?: { full_name: string; phone: string } | null
}

const STATUS_CFG: Record<string, { label: string; color: string; icon: any }> = {
  pending: { label: 'Aguardando', color: 'bg-amber-500/15 text-amber-400', icon: Clock },
  searching: { label: 'Buscando', color: 'bg-blue-500/15 text-blue-400', icon: Search },
  accepted: { label: 'Aceito', color: 'bg-violet-500/15 text-violet-400', icon: Car },
  in_progress: { label: 'Em Viagem', color: 'bg-orange-500/15 text-orange-400', icon: Navigation },
  completed: { label: 'Concluida', color: 'bg-emerald-500/15 text-emerald-400', icon: CheckCircle },
  cancelled: { label: 'Cancelada', color: 'bg-red-500/15 text-red-400', icon: XCircle },
}

function getRelativeTime(d: string) {
  const diff = Date.now() - new Date(d).getTime()
  const m = Math.floor(diff / 60000)
  const h = Math.floor(m / 60)
  const day = Math.floor(h / 24)
  if (m < 1) return 'agora'
  if (m < 60) return `${m}m`
  if (h < 24) return `${h}h`
  return `${day}d`
}

export default function AdminCidadeACidadePage() {
  const [rides, setRides] = useState<IntercityRide[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selected, setSelected] = useState<IntercityRide | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const channelRef = useRef<any>(null)

  const fetchRides = useCallback(async () => {
    const supabase = createClient()
    let query = supabase
      .from('rides')
      .select(`
        id, passenger_id, driver_id, pickup_address, dropoff_address,
        pickup_city, dropoff_city, status, final_price, passenger_price_offer,
        distance_km, created_at, completed_at,
        profile:profiles!rides_passenger_id_fkey(full_name, phone),
        driver_profile:profiles!rides_driver_id_fkey(full_name, phone)
      `, { count: 'exact' })
      .eq('ride_type', 'intercity')
      .order('created_at', { ascending: false })
      .limit(100)

    if (statusFilter !== 'all') query = query.eq('status', statusFilter)
    if (search.trim()) {
      query = query.or(`pickup_address.ilike.%${search}%,dropoff_address.ilike.%${search}%`)
    }

    const { data, count } = await query
    setRides((data as any) || [])
    setTotal(count || 0)
    setLastUpdated(new Date())
    setLoading(false)
  }, [search, statusFilter])

  useEffect(() => {
    fetchRides()
    const supabase = createClient()
    channelRef.current = supabase
      .channel('admin-cac-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rides', filter: 'ride_type=eq.intercity' }, fetchRides)
      .subscribe()
    return () => { if (channelRef.current) supabase.removeChannel(channelRef.current) }
  }, [fetchRides])

  const stats = {
    total,
    active: rides.filter(r => ['searching', 'accepted', 'in_progress'].includes(r.status)).length,
    completed: rides.filter(r => r.status === 'completed').length,
    revenue: rides.filter(r => r.status === 'completed').reduce((s, r) => s + (r.final_price || 0), 0),
    avgDistance: (() => {
      const withDist = rides.filter(r => r.distance_km)
      return withDist.length ? withDist.reduce((s, r) => s + (r.distance_km || 0), 0) / withDist.length : 0
    })(),
  }

  const headerActions = (
    <button
      type="button"
      onClick={fetchRides}
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
      <AdminHeader title="Cidade a Cidade" subtitle="Corridas intermunicipais em tempo real" actions={headerActions} />
      <div className="flex-1 overflow-y-auto bg-[hsl(var(--admin-bg))]">
        <div className="p-5 space-y-5">

          {/* KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {[
              { label: 'Total', value: stats.total, color: 'text-blue-400' },
              { label: 'Ativas', value: stats.active, color: 'text-orange-400' },
              { label: 'Concluidas', value: stats.completed, color: 'text-emerald-400' },
              { label: 'Receita', value: `R$${stats.revenue.toFixed(0)}`, color: 'text-violet-400' },
              { label: 'Dist. Media', value: `${stats.avgDistance.toFixed(0)}km`, color: 'text-cyan-400' },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-[hsl(var(--admin-surface))] rounded-xl p-4 border border-[hsl(var(--admin-border))]">
                <p className={cn('text-[22px] font-bold tabular-nums', color)}>{value}</p>
                <p className="text-[11px] text-slate-500 font-medium mt-1">{label}</p>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
              <input
                type="text"
                placeholder="Buscar por cidade ou endereco..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full h-8 pl-8 pr-3 rounded-lg bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] text-[12px] text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-[hsl(var(--admin-green))]/50"
              />
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <Filter className="w-3.5 h-3.5 text-slate-500" />
              {['all', 'pending', 'searching', 'in_progress', 'completed', 'cancelled'].map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatusFilter(s)}
                  className={cn(
                    'px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors',
                    statusFilter === s
                      ? 'bg-[hsl(var(--admin-green))]/15 text-[hsl(var(--admin-green))]'
                      : 'text-slate-500 hover:text-slate-300'
                  )}
                >
                  {s === 'all' ? 'Todos' : STATUS_CFG[s]?.label || s}
                </button>
              ))}
            </div>
          </div>

          <div className={cn('flex gap-5', selected ? 'flex-col lg:flex-row' : '')}>
            {/* Table */}
            <div className={cn('bg-[hsl(var(--admin-surface))] rounded-xl border border-[hsl(var(--admin-border))]', selected ? 'flex-1' : 'w-full')}>
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-[hsl(var(--admin-border))]">
                <h3 className="text-[13px] font-bold text-slate-200">Viagens ({rides.length})</h3>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="w-6 h-6 border-2 border-[hsl(var(--admin-green))] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : rides.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <Navigation className="w-10 h-10 text-slate-700" />
                  <p className="text-[13px] text-slate-500">Nenhuma viagem intermunicipal encontrada</p>
                </div>
              ) : (
                <div className="divide-y divide-[hsl(var(--admin-border))]">
                  {rides.map(ride => {
                    const statusCfg = STATUS_CFG[ride.status] || STATUS_CFG.pending
                    const StatusIcon = statusCfg.icon
                    const passenger = ride.profile as any
                    const driver = ride.driver_profile as any

                    return (
                      <div
                        key={ride.id}
                        onClick={() => setSelected(selected?.id === ride.id ? null : ride)}
                        className={cn(
                          'flex items-start gap-4 px-5 py-4 cursor-pointer transition-colors',
                          selected?.id === ride.id
                            ? 'bg-[hsl(var(--admin-green))]/5 border-l-2 border-[hsl(var(--admin-green))]'
                            : 'hover:bg-[hsl(var(--sidebar-accent))]/30'
                        )}
                      >
                        <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
                          <Navigation className="w-5 h-5 text-blue-400" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                            <span className="text-[13px] font-bold text-slate-200 truncate">
                              {ride.pickup_city || 'Origem'} → {ride.dropoff_city || 'Destino'}
                            </span>
                            <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold', statusCfg.color)}>
                              <StatusIcon className="w-2.5 h-2.5" />
                              {statusCfg.label}
                            </span>
                            {ride.distance_km && (
                              <span className="text-[10px] font-semibold text-slate-500 bg-slate-500/10 px-2 py-0.5 rounded ml-auto">
                                {ride.distance_km.toFixed(0)} km
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5 mb-0.5">
                            <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                            <p className="text-[12px] text-slate-400 truncate">{ride.pickup_address || 'Origem nao informada'}</p>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-orange-500 shrink-0" />
                            <p className="text-[12px] text-slate-500 truncate">{ride.dropoff_address || 'Destino nao informado'}</p>
                          </div>

                          <div className="flex items-center gap-4 mt-1.5">
                            <span className="text-[11px] text-slate-600">{passenger?.full_name || 'N/A'}</span>
                            {driver && <span className="text-[11px] text-slate-600">Motorista: {driver.full_name}</span>}
                            <span className="text-[11px] text-slate-600 ml-auto">{getRelativeTime(ride.created_at)}</span>
                            {ride.final_price && (
                              <span className="text-[12px] font-bold text-emerald-400">R$ {ride.final_price.toFixed(2)}</span>
                            )}
                          </div>
                        </div>

                        <ChevronRight className={cn('w-4 h-4 text-slate-600 shrink-0 transition-transform', selected?.id === ride.id && 'rotate-90')} />
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
                  <h3 className="text-[13px] font-bold text-slate-200">Detalhes da Viagem</h3>
                  <button type="button" onClick={() => setSelected(null)} className="text-slate-500 hover:text-slate-300 text-[11px] font-medium">Fechar</button>
                </div>
                <div className="p-5 space-y-4">
                  <div>
                    <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-2">Rota</p>
                    <div className="flex items-center gap-2 p-3 bg-[hsl(var(--admin-bg))] rounded-lg">
                      <div className="flex flex-col items-center gap-1">
                        <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                        <div className="w-0.5 h-6 bg-slate-700" />
                        <div className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                      </div>
                      <div className="flex-1 min-w-0 space-y-2">
                        <p className="text-[12px] text-slate-200 font-semibold">{selected.pickup_city || selected.pickup_address}</p>
                        <p className="text-[12px] text-slate-400">{selected.dropoff_city || selected.dropoff_address}</p>
                      </div>
                    </div>
                    {selected.distance_km && (
                      <p className="text-[11px] text-slate-500 mt-2 text-center">{selected.distance_km.toFixed(0)} km de distancia</p>
                    )}
                  </div>

                  <div>
                    <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-2">Passageiro</p>
                    {(() => {
                      const p = selected.profile as any
                      return p ? (
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 font-bold text-[13px]">
                            {p.full_name?.charAt(0) || '?'}
                          </div>
                          <div>
                            <p className="text-[12px] text-slate-200 font-semibold">{p.full_name}</p>
                            <p className="text-[11px] text-slate-500">{p.phone}</p>
                          </div>
                        </div>
                      ) : <p className="text-[12px] text-slate-500">Nao encontrado</p>
                    })()}
                  </div>

                  {(() => {
                    const d = selected.driver_profile as any
                    return d ? (
                      <div>
                        <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-2">Motorista</p>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center text-orange-400 font-bold text-[13px]">
                            {d.full_name?.charAt(0) || '?'}
                          </div>
                          <div>
                            <p className="text-[12px] text-slate-200 font-semibold">{d.full_name}</p>
                            <p className="text-[11px] text-slate-500">{d.phone}</p>
                          </div>
                        </div>
                      </div>
                    ) : null
                  })()}

                  <div>
                    <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-2">Financeiro</p>
                    <div className="space-y-1.5 p-3 bg-[hsl(var(--admin-bg))] rounded-lg">
                      {selected.passenger_price_offer && (
                        <div className="flex justify-between">
                          <span className="text-[12px] text-slate-500">Oferta passageiro</span>
                          <span className="text-[12px] text-slate-300">R$ {selected.passenger_price_offer.toFixed(2)}</span>
                        </div>
                      )}
                      {selected.final_price ? (
                        <div className="flex justify-between">
                          <span className="text-[12px] text-slate-500">Valor final</span>
                          <span className="text-[12px] font-bold text-emerald-400">R$ {selected.final_price.toFixed(2)}</span>
                        </div>
                      ) : (
                        <p className="text-[12px] text-slate-500">Aguardando finalizacao</p>
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
