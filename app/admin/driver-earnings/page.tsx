'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { AdminHeader } from '@/components/admin/admin-header'
import {
  DollarSign, RefreshCw, TrendingUp, Car, Star, Search,
  Clock, Target, MapPin, User, ChevronRight, BarChart3,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface DriverEarning {
  driver_id: string
  full_name: string
  phone: string
  avatar_url: string | null
  vehicle_model: string | null
  vehicle_plate: string | null
  is_verified: boolean
  is_available: boolean
  total_rides: number
  rating: number
  total_earnings: number
  week_earnings: number
  week_rides: number
  avg_per_ride: number
  last_ride_at: string | null
}

type SortBy = 'week_earnings' | 'total_earnings' | 'total_rides' | 'rating'

export default function AdminDriverEarningsPage() {
  const [drivers, setDrivers] = useState<DriverEarning[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<SortBy>('week_earnings')
  const [selected, setSelected] = useState<DriverEarning | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const channelRef = useRef<any>(null)

  const fetchDrivers = useCallback(async () => {
    const supabase = createClient()

    // Get driver profiles with earnings
    const { data: driverProfiles } = await supabase
      .from('driver_profiles')
      .select(`
        user_id, vehicle_model, vehicle_plate, is_verified, is_available,
        total_earnings, rating, total_rides,
        profile:profiles!driver_profiles_user_id_fkey(full_name, phone, avatar_url)
      `)
      .eq('is_verified', true)
      .order('total_earnings', { ascending: false })
      .limit(100)

    if (!driverProfiles) { setLoading(false); return }

    // Get rides from this week for each driver
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const driverIds = driverProfiles.map(d => d.user_id)

    const { data: weekRides } = await supabase
      .from('rides')
      .select('driver_id, final_price, completed_at')
      .in('driver_id', driverIds)
      .eq('status', 'completed')
      .gte('completed_at', weekAgo)

    // Get last ride per driver
    const { data: lastRides } = await supabase
      .from('rides')
      .select('driver_id, completed_at')
      .in('driver_id', driverIds)
      .eq('status', 'completed')
      .order('completed_at', { ascending: false })

    // Build earnings map
    const weekMap: Record<string, { amount: number; count: number }> = {}
    for (const ride of weekRides || []) {
      if (!ride.driver_id) continue
      if (!weekMap[ride.driver_id]) weekMap[ride.driver_id] = { amount: 0, count: 0 }
      weekMap[ride.driver_id].amount += ride.final_price || 0
      weekMap[ride.driver_id].count += 1
    }

    const lastRideMap: Record<string, string> = {}
    for (const ride of lastRides || []) {
      if (ride.driver_id && !lastRideMap[ride.driver_id]) {
        lastRideMap[ride.driver_id] = ride.completed_at
      }
    }

    const result: DriverEarning[] = driverProfiles.map(d => {
      const profile = d.profile as any
      const weekData = weekMap[d.user_id] || { amount: 0, count: 0 }
      const totalRides = d.total_rides || 0
      const totalEarnings = d.total_earnings || 0
      return {
        driver_id: d.user_id,
        full_name: profile?.full_name || 'Desconhecido',
        phone: profile?.phone || '',
        avatar_url: profile?.avatar_url || null,
        vehicle_model: d.vehicle_model,
        vehicle_plate: d.vehicle_plate,
        is_verified: d.is_verified,
        is_available: d.is_available,
        total_rides: totalRides,
        rating: d.rating || 5,
        total_earnings: totalEarnings,
        week_earnings: weekData.amount,
        week_rides: weekData.count,
        avg_per_ride: totalRides > 0 ? totalEarnings / totalRides : 0,
        last_ride_at: lastRideMap[d.user_id] || null,
      }
    })

    setDrivers(result)
    setLastUpdated(new Date())
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchDrivers()
    const supabase = createClient()
    channelRef.current = supabase
      .channel('admin-driver-earnings-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rides', filter: 'status=eq.completed' }, fetchDrivers)
      .subscribe()
    return () => { if (channelRef.current) supabase.removeChannel(channelRef.current) }
  }, [fetchDrivers])

  const filtered = drivers
    .filter(d => !search || d.full_name.toLowerCase().includes(search.toLowerCase()) || d.vehicle_plate?.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => b[sortBy] - a[sortBy])

  const stats = {
    totalDrivers: drivers.length,
    activeNow: drivers.filter(d => d.is_available).length,
    totalWeekEarnings: drivers.reduce((s, d) => s + d.week_earnings, 0),
    avgWeekEarning: drivers.length ? drivers.reduce((s, d) => s + d.week_earnings, 0) / drivers.length : 0,
    topEarner: [...drivers].sort((a, b) => b.week_earnings - a.week_earnings)[0],
  }

  const headerActions = (
    <button
      type="button"
      onClick={fetchDrivers}
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
      <AdminHeader title="Ganhos dos Motoristas" subtitle="Performance financeira e metricas da semana" actions={headerActions} />
      <div className="flex-1 overflow-y-auto bg-[hsl(var(--admin-bg))]">
        <div className="p-5 space-y-5">

          {/* KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Motoristas Verificados', value: stats.totalDrivers, color: 'text-blue-400', icon: User },
              { label: 'Online Agora', value: stats.activeNow, color: 'text-emerald-400', icon: Car },
              { label: 'Ganhos Semana', value: `R$${stats.totalWeekEarnings.toFixed(0)}`, color: 'text-violet-400', icon: DollarSign },
              { label: 'Media por Motorista', value: `R$${stats.avgWeekEarning.toFixed(0)}`, color: 'text-amber-400', icon: TrendingUp },
            ].map(({ label, value, color, icon: Icon }) => (
              <div key={label} className="bg-[hsl(var(--admin-surface))] rounded-xl p-4 border border-[hsl(var(--admin-border))]">
                <div className="flex items-center gap-2 mb-2">
                  <Icon className={cn('w-4 h-4', color)} />
                </div>
                <p className={cn('text-[20px] font-bold tabular-nums', color)}>{value}</p>
                <p className="text-[11px] text-slate-500 font-medium mt-1">{label}</p>
              </div>
            ))}
          </div>

          {/* Top Earner Card */}
          {stats.topEarner && stats.topEarner.week_earnings > 0 && (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-300 font-bold text-[16px] shrink-0">
                {stats.topEarner.full_name?.charAt(0) || '?'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] text-emerald-400/70 font-semibold uppercase tracking-wider">Maior Ganho da Semana</p>
                <p className="text-[15px] font-bold text-emerald-300">{stats.topEarner.full_name}</p>
                <p className="text-[12px] text-emerald-400/60">{stats.topEarner.week_rides} corridas</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-[24px] font-black text-emerald-400 tabular-nums">R${stats.topEarner.week_earnings.toFixed(0)}</p>
                <p className="text-[11px] text-emerald-400/50">esta semana</p>
              </div>
            </div>
          )}

          {/* Filter + Sort */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
              <input
                type="text"
                placeholder="Buscar motorista ou placa..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full h-8 pl-8 pr-3 rounded-lg bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] text-[12px] text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-[hsl(var(--admin-green))]/50"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <BarChart3 className="w-3.5 h-3.5 text-slate-500" />
              {([
                { key: 'week_earnings', label: 'Semana' },
                { key: 'total_earnings', label: 'Total' },
                { key: 'total_rides', label: 'Corridas' },
                { key: 'rating', label: 'Nota' },
              ] as const).map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSortBy(key)}
                  className={cn(
                    'px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors',
                    sortBy === key
                      ? 'bg-[hsl(var(--admin-green))]/15 text-[hsl(var(--admin-green))]'
                      : 'text-slate-500 hover:text-slate-300'
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className={cn('flex gap-5', selected ? 'flex-col lg:flex-row' : '')}>
            {/* Table */}
            <div className={cn('bg-[hsl(var(--admin-surface))] rounded-xl border border-[hsl(var(--admin-border))]', selected ? 'flex-1' : 'w-full')}>
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-[hsl(var(--admin-border))]">
                <h3 className="text-[13px] font-bold text-slate-200">Motoristas ({filtered.length})</h3>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
              </div>

              {/* Column Headers */}
              <div className="grid grid-cols-6 px-5 py-2.5 border-b border-[hsl(var(--admin-border))]/50 text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                <span className="col-span-2">Motorista</span>
                <span className="text-right">Semana</span>
                <span className="text-right">Corridas</span>
                <span className="text-right">Media/Corrida</span>
                <span className="text-right">Nota</span>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="w-6 h-6 border-2 border-[hsl(var(--admin-green))] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <User className="w-10 h-10 text-slate-700" />
                  <p className="text-[13px] text-slate-500">Nenhum motorista encontrado</p>
                </div>
              ) : (
                <div className="divide-y divide-[hsl(var(--admin-border))]">
                  {filtered.map((driver, index) => (
                    <div
                      key={driver.driver_id}
                      onClick={() => setSelected(selected?.driver_id === driver.driver_id ? null : driver)}
                      className={cn(
                        'grid grid-cols-6 items-center px-5 py-3 cursor-pointer transition-colors',
                        selected?.driver_id === driver.driver_id
                          ? 'bg-[hsl(var(--admin-green))]/5 border-l-2 border-[hsl(var(--admin-green))]'
                          : 'hover:bg-[hsl(var(--sidebar-accent))]/30'
                      )}
                    >
                      {/* Driver Info */}
                      <div className="col-span-2 flex items-center gap-3 min-w-0">
                        <div className="relative shrink-0">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-500/20 to-blue-500/20 flex items-center justify-center text-[13px] font-bold text-slate-200">
                            {driver.full_name?.charAt(0) || '?'}
                          </div>
                          {driver.is_available && (
                            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-[hsl(var(--admin-surface))]" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-[12px] font-semibold text-slate-200 truncate">{driver.full_name}</p>
                          <p className="text-[11px] text-slate-600 truncate">
                            {driver.vehicle_plate ? `${driver.vehicle_plate}` : driver.phone || '—'}
                          </p>
                        </div>
                      </div>

                      {/* Week Earnings */}
                      <div className="text-right">
                        <p className={cn(
                          'text-[13px] font-bold tabular-nums',
                          driver.week_earnings > 0 ? 'text-emerald-400' : 'text-slate-600'
                        )}>
                          R${driver.week_earnings.toFixed(0)}
                        </p>
                        <p className="text-[10px] text-slate-600">{driver.week_rides} corridas</p>
                      </div>

                      {/* Total Rides */}
                      <div className="text-right">
                        <p className="text-[13px] font-bold text-blue-400 tabular-nums">{driver.total_rides}</p>
                      </div>

                      {/* Avg Per Ride */}
                      <div className="text-right">
                        <p className="text-[13px] font-semibold text-violet-400 tabular-nums">
                          R${driver.avg_per_ride.toFixed(0)}
                        </p>
                      </div>

                      {/* Rating */}
                      <div className="flex items-center justify-end gap-1">
                        <Star className="w-3 h-3 text-amber-500 fill-amber-500/50 shrink-0" />
                        <span className="text-[12px] font-semibold text-slate-300 tabular-nums">
                          {driver.rating.toFixed(1)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Detail Panel */}
            {selected && (
              <div className="w-full lg:w-[300px] bg-[hsl(var(--admin-surface))] rounded-xl border border-[hsl(var(--admin-border))] h-fit shrink-0">
                <div className="flex items-center justify-between px-5 py-3.5 border-b border-[hsl(var(--admin-border))]">
                  <h3 className="text-[13px] font-bold text-slate-200">Perfil do Motorista</h3>
                  <button type="button" onClick={() => setSelected(null)} className="text-slate-500 hover:text-slate-300 text-[11px] font-medium">Fechar</button>
                </div>
                <div className="p-5 space-y-4">
                  {/* Avatar + Name */}
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-14 h-14 rounded-full bg-gradient-to-br from-emerald-500/30 to-blue-500/30 flex items-center justify-center text-[20px] font-black text-slate-200">
                        {selected.full_name?.charAt(0) || '?'}
                      </div>
                      {selected.is_available && (
                        <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-emerald-500 border-2 border-[hsl(var(--admin-surface))]" />
                      )}
                    </div>
                    <div>
                      <p className="text-[15px] font-bold text-slate-200">{selected.full_name}</p>
                      <p className="text-[12px] text-slate-500">{selected.phone}</p>
                      <p className="text-[11px] text-emerald-400 font-semibold mt-0.5">
                        {selected.is_available ? 'Online' : 'Offline'}
                      </p>
                    </div>
                  </div>

                  {/* Veiculo */}
                  {selected.vehicle_model && (
                    <div>
                      <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-2">Veiculo</p>
                      <div className="flex items-center gap-2 p-3 bg-[hsl(var(--admin-bg))] rounded-xl">
                        <Car className="w-4 h-4 text-slate-500 shrink-0" />
                        <div>
                          <p className="text-[12px] font-semibold text-slate-200">{selected.vehicle_model}</p>
                          {selected.vehicle_plate && <p className="text-[11px] text-slate-500">{selected.vehicle_plate}</p>}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Ganhos */}
                  <div>
                    <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-2">Ganhos</p>
                    <div className="space-y-2 p-3 bg-[hsl(var(--admin-bg))] rounded-xl">
                      <div className="flex justify-between">
                        <span className="text-[12px] text-slate-500">Esta semana</span>
                        <span className="text-[13px] font-bold text-emerald-400">R$ {selected.week_earnings.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[12px] text-slate-500">Total acumulado</span>
                        <span className="text-[12px] font-semibold text-slate-300">R$ {selected.total_earnings.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[12px] text-slate-500">Media por corrida</span>
                        <span className="text-[12px] font-semibold text-violet-400">R$ {selected.avg_per_ride.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-3 bg-[hsl(var(--admin-bg))] rounded-xl text-center">
                      <p className="text-[20px] font-bold text-blue-400 tabular-nums">{selected.total_rides}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">Corridas</p>
                    </div>
                    <div className="p-3 bg-[hsl(var(--admin-bg))] rounded-xl text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Star className="w-4 h-4 text-amber-500 fill-amber-500/50" />
                        <p className="text-[20px] font-bold text-amber-400 tabular-nums">{selected.rating.toFixed(1)}</p>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">Nota Media</p>
                    </div>
                  </div>

                  {/* Ultima corrida */}
                  {selected.last_ride_at && (
                    <div>
                      <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">Ultima corrida</p>
                      <p className="text-[12px] text-slate-400">
                        {new Date(selected.last_ride_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </>
  )
}
