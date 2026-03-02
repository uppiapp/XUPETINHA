'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { AdminHeader } from '@/components/admin/admin-header'
import {
  Radio, Car, Users, Activity, Clock, Navigation,
  CheckCircle, XCircle, MapPin, Zap, TrendingUp, RefreshCw,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'

interface LiveRide {
  id: string
  status: string
  pickup_address: string
  dropoff_address: string
  pickup_lat?: number
  pickup_lng?: number
  dropoff_lat?: number
  dropoff_lng?: number
  final_price?: number
  passenger_price_offer?: number
  distance_km?: number
  created_at: string
  started_at?: string | null
  passenger?: { full_name: string; phone: string } | null
  driver?: { full_name: string; phone: string } | null
}

interface LiveDriver {
  id: string
  full_name: string
  phone?: string
  avatar_url?: string | null
  driver_profile?: {
    vehicle_brand: string
    vehicle_model: string
    vehicle_plate: string
    is_available: boolean
    current_lat?: number
    current_lng?: number
    last_seen_at?: string | null
  } | null
  active_ride?: string | null
}

interface ActivityItem {
  id: string
  type: 'ride_created' | 'ride_accepted' | 'ride_started' | 'ride_completed' | 'ride_cancelled'
  message: string
  time: string
  rideId: string
}

const STATUS_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  searching: { label: 'Buscando', color: 'bg-amber-500/15 text-amber-400', dot: 'bg-amber-400' },
  accepted: { label: 'Aceita', color: 'bg-cyan-500/15 text-cyan-400', dot: 'bg-cyan-400' },
  in_progress: { label: 'Em Andamento', color: 'bg-blue-500/15 text-blue-400', dot: 'bg-blue-400' },
  completed: { label: 'Finalizada', color: 'bg-emerald-500/15 text-emerald-400', dot: 'bg-emerald-400' },
  cancelled: { label: 'Cancelada', color: 'bg-red-500/15 text-red-400', dot: 'bg-red-400' },
  pending: { label: 'Pendente', color: 'bg-slate-500/15 text-slate-400', dot: 'bg-slate-400' },
}

function PulsingDot({ active }: { active: boolean }) {
  if (!active) return <span className="w-2 h-2 rounded-full bg-slate-600 shrink-0" />
  return (
    <span className="relative flex h-2 w-2 shrink-0">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
    </span>
  )
}

function ActivityIcon({ type }: { type: ActivityItem['type'] }) {
  const base = 'w-4 h-4 shrink-0'
  switch (type) {
    case 'ride_created': return <Radio className={cn(base, 'text-amber-400')} />
    case 'ride_accepted': return <CheckCircle className={cn(base, 'text-cyan-400')} />
    case 'ride_started': return <Navigation className={cn(base, 'text-blue-400')} />
    case 'ride_completed': return <CheckCircle className={cn(base, 'text-emerald-400')} />
    case 'ride_cancelled': return <XCircle className={cn(base, 'text-red-400')} />
  }
}

export default function AdminMonitorPage() {
  const [activeRides, setActiveRides] = useState<LiveRide[]>([])
  const [onlineDrivers, setOnlineDrivers] = useState<LiveDriver[]>([])
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([])
  const [stats, setStats] = useState({ active: 0, searching: 0, inProgress: 0, onlineDrivers: 0, todayCompleted: 0, todayRevenue: 0 })
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [selectedRide, setSelectedRide] = useState<LiveRide | null>(null)
  const prevRidesRef = useRef<Record<string, string>>({})

  const buildActivity = useCallback((rides: LiveRide[]) => {
    const prev = prevRidesRef.current
    const newItems: ActivityItem[] = []
    for (const r of rides) {
      const prevStatus = prev[r.id]
      if (prevStatus && prevStatus !== r.status) {
        const typeMap: Record<string, ActivityItem['type']> = {
          accepted: 'ride_accepted',
          in_progress: 'ride_started',
          completed: 'ride_completed',
          cancelled: 'ride_cancelled',
        }
        const t = typeMap[r.status]
        if (t) {
          const msgMap: Record<ActivityItem['type'], string> = {
            ride_created: `Nova corrida de ${r.passenger?.full_name || 'passageiro'} — ${r.pickup_address?.split(',')[0] || ''}`,
            ride_accepted: `Corrida aceita por ${r.driver?.full_name || 'motorista'}`,
            ride_started: `Corrida em andamento — ${r.passenger?.full_name || ''}`,
            ride_completed: `Corrida finalizada — R$ ${Number(r.final_price || 0).toFixed(2)}`,
            ride_cancelled: `Corrida cancelada por ${r.passenger?.full_name || 'passageiro'}`,
          }
          newItems.push({ id: `${r.id}-${r.status}`, type: t, message: msgMap[t], time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }), rideId: r.id })
        }
      }
    }
    if (newItems.length > 0) {
      setRecentActivity(prev2 => [...newItems, ...prev2].slice(0, 50))
    }
    const newPrev: Record<string, string> = {}
    for (const r of rides) newPrev[r.id] = r.status
    prevRidesRef.current = newPrev
  }, [])

  const fetchData = useCallback(async () => {
    const supabase = createClient()
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    const [
      { data: activeData },
      { data: driversData },
      { data: todayCompletedData },
      { data: revenueData },
    ] = await Promise.all([
      supabase
        .from('rides')
        .select('*, passenger:profiles!rides_passenger_id_fkey(full_name, phone), driver:profiles!rides_driver_id_fkey(full_name, phone)')
        .in('status', ['searching', 'accepted', 'in_progress'])
        .order('created_at', { ascending: false })
        .limit(50),
      supabase
        .from('profiles')
        .select('id, full_name, phone, avatar_url, driver_profiles!inner(vehicle_brand, vehicle_model, vehicle_plate, is_available, current_lat, current_lng, last_seen_at)')
        .eq('user_type', 'driver')
        .eq('driver_profiles.is_available', true)
        .limit(100),
      supabase
        .from('rides')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'completed')
        .gte('created_at', todayStart.toISOString()),
      supabase
        .from('rides')
        .select('final_price')
        .eq('status', 'completed')
        .gte('completed_at', todayStart.toISOString()),
    ])

    const rides = (activeData || []) as LiveRide[]
    buildActivity(rides)
    setActiveRides(rides)

    const drivers = (driversData || []).map((d: any) => ({
      id: d.id,
      full_name: d.full_name,
      phone: d.phone,
      avatar_url: d.avatar_url,
      driver_profile: Array.isArray(d.driver_profiles) ? d.driver_profiles[0] : d.driver_profiles,
    })) as LiveDriver[]
    setOnlineDrivers(drivers)

    const todayRevenue = (revenueData || []).reduce((s: number, r: any) => s + Number(r.final_price || 0), 0)
    setStats({
      active: rides.length,
      searching: rides.filter(r => r.status === 'searching').length,
      inProgress: rides.filter(r => r.status === 'in_progress').length,
      onlineDrivers: drivers.length,
      todayCompleted: 0,
      todayRevenue,
    })

    setLastUpdated(new Date())
    setLoading(false)
  }, [buildActivity])

  useEffect(() => {
    fetchData()
    const supabase = createClient()
    const channel = supabase
      .channel('admin-monitor-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rides' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'driver_profiles' }, fetchData)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [fetchData])

  const headerActions = (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
        <PulsingDot active />
        <span className="text-[12px] font-bold text-emerald-400">Ao Vivo</span>
      </div>
      <button
        type="button"
        onClick={fetchData}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] text-[12px] font-medium text-slate-400 hover:text-slate-200 transition-colors"
      >
        <RefreshCw className="w-3.5 h-3.5" />
        {lastUpdated && (
          <span className="hidden sm:inline tabular-nums">
            {lastUpdated.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
        )}
      </button>
    </div>
  )

  if (loading) {
    return (
      <>
        <AdminHeader title="Monitor ao Vivo" subtitle="Conectando..." />
        <div className="flex-1 flex items-center justify-center bg-[hsl(var(--admin-bg))]">
          <div className="text-center space-y-3">
            <div className="w-6 h-6 border-2 border-[hsl(var(--admin-green))] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-[13px] text-slate-500">Carregando dados em tempo real...</p>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <AdminHeader title="Monitor ao Vivo" subtitle="Corridas e motoristas em tempo real" actions={headerActions} />
      <div className="flex-1 overflow-hidden flex flex-col bg-[hsl(var(--admin-bg))]">

        {/* KPI Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-4 pb-0">
          {[
            { label: 'Corridas Ativas', value: stats.active, icon: Activity, color: 'text-blue-400', bg: 'bg-blue-500/10', pulse: stats.active > 0 },
            { label: 'Buscando', value: stats.searching, icon: Radio, color: 'text-amber-400', bg: 'bg-amber-500/10', pulse: stats.searching > 0 },
            { label: 'Em Andamento', value: stats.inProgress, icon: Navigation, color: 'text-cyan-400', bg: 'bg-cyan-500/10', pulse: stats.inProgress > 0 },
            { label: 'Motoristas Online', value: stats.onlineDrivers, icon: Car, color: 'text-emerald-400', bg: 'bg-emerald-500/10', pulse: true },
          ].map((kpi) => (
            <div key={kpi.label} className="bg-[hsl(var(--admin-surface))] rounded-xl p-3 border border-[hsl(var(--admin-border))] flex items-center gap-3">
              <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center shrink-0', kpi.bg)}>
                <kpi.icon className={cn('w-4.5 h-4.5', kpi.color)} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-[20px] font-bold text-slate-100 tabular-nums leading-none">{kpi.value}</p>
                  {kpi.pulse && kpi.value > 0 && <PulsingDot active />}
                </div>
                <p className="text-[10px] text-slate-500 font-medium mt-0.5 truncate">{kpi.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Main content — 3 columns */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-3 gap-0 mt-3">

          {/* Column 1: Active Rides */}
          <div className="flex flex-col overflow-hidden border-r border-[hsl(var(--admin-border))]">
            <div className="px-4 py-2.5 border-b border-[hsl(var(--admin-border))] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Car className="w-4 h-4 text-slate-400" />
                <h2 className="text-[13px] font-bold text-slate-200">Corridas Ativas</h2>
                <span className="text-[11px] font-bold bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded-md">{activeRides.length}</span>
              </div>
              <Link href="/admin/rides" className="text-[11px] text-slate-500 hover:text-slate-300 transition-colors">Ver todas</Link>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {activeRides.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-600">
                  <Car className="w-8 h-8 mb-2 opacity-30" />
                  <p className="text-[13px]">Nenhuma corrida ativa</p>
                </div>
              ) : activeRides.map((ride) => {
                const sc = STATUS_CONFIG[ride.status] || STATUS_CONFIG.pending
                const isSelected = selectedRide?.id === ride.id
                const elapsedMin = ride.started_at
                  ? Math.floor((Date.now() - new Date(ride.started_at).getTime()) / 60000)
                  : Math.floor((Date.now() - new Date(ride.created_at).getTime()) / 60000)

                return (
                  <button
                    key={ride.id}
                    type="button"
                    onClick={() => setSelectedRide(isSelected ? null : ride)}
                    className={cn(
                      'w-full text-left rounded-xl border p-3 transition-all duration-150',
                      isSelected
                        ? 'bg-blue-500/10 border-blue-500/40'
                        : 'bg-[hsl(var(--admin-surface))] border-[hsl(var(--admin-border))] hover:border-slate-600'
                    )}
                  >
                    {/* Status + time */}
                    <div className="flex items-center justify-between mb-2">
                      <span className={cn('inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold', sc.color)}>
                        <span className={cn('w-1.5 h-1.5 rounded-full', sc.dot, (ride.status === 'searching' || ride.status === 'in_progress') && 'animate-pulse')} />
                        {sc.label}
                      </span>
                      <span className="text-[11px] text-slate-500 tabular-nums flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {elapsedMin}m
                      </span>
                    </div>

                    {/* Route */}
                    <div className="flex gap-2.5 mb-2">
                      <div className="flex flex-col items-center gap-0.5 pt-1 shrink-0">
                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                        <div className="w-px flex-1 bg-slate-700 min-h-[12px]" />
                        <div className="w-1.5 h-1.5 bg-red-500 rounded-full" />
                      </div>
                      <div className="flex-1 min-w-0 space-y-1.5">
                        <p className="text-[12px] text-slate-300 truncate">{ride.pickup_address?.split(',')[0] || 'N/A'}</p>
                        <p className="text-[12px] text-slate-400 truncate">{ride.dropoff_address?.split(',')[0] || 'N/A'}</p>
                      </div>
                    </div>

                    {/* Passenger + Driver */}
                    <div className="flex items-center gap-3 text-[11px]">
                      {ride.passenger && (
                        <span className="flex items-center gap-1 text-slate-500">
                          <Users className="w-3 h-3" />
                          {(ride.passenger as any).full_name}
                        </span>
                      )}
                      {ride.driver && (
                        <span className="flex items-center gap-1 text-slate-500">
                          <Car className="w-3 h-3" />
                          {(ride.driver as any).full_name}
                        </span>
                      )}
                    </div>

                    {/* Expanded details */}
                    {isSelected && (
                      <div className="mt-3 pt-3 border-t border-[hsl(var(--admin-border))] space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            { label: 'Distância', value: ride.distance_km ? `${Number(ride.distance_km).toFixed(1)} km` : 'N/A' },
                            { label: 'Oferta', value: ride.passenger_price_offer ? `R$ ${Number(ride.passenger_price_offer).toFixed(2)}` : 'N/A' },
                          ].map(d => (
                            <div key={d.label} className="bg-[hsl(var(--admin-bg))]/60 rounded-lg p-2">
                              <p className="text-[10px] text-slate-600">{d.label}</p>
                              <p className="text-[13px] font-bold text-slate-200">{d.value}</p>
                            </div>
                          ))}
                        </div>
                        <p className="text-[10px] text-slate-700 font-mono">#{ride.id.slice(0, 8)}</p>
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Column 2: Online Drivers */}
          <div className="flex flex-col overflow-hidden border-r border-[hsl(var(--admin-border))]">
            <div className="px-4 py-2.5 border-b border-[hsl(var(--admin-border))] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Car className="w-4 h-4 text-slate-400" />
                <h2 className="text-[13px] font-bold text-slate-200">Motoristas Online</h2>
                <span className="text-[11px] font-bold bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded-md">{onlineDrivers.length}</span>
              </div>
              <Link href="/admin/drivers" className="text-[11px] text-slate-500 hover:text-slate-300 transition-colors">Ver todos</Link>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {onlineDrivers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-600">
                  <Car className="w-8 h-8 mb-2 opacity-30" />
                  <p className="text-[13px]">Nenhum motorista online</p>
                </div>
              ) : onlineDrivers.map((driver) => {
                const dp = driver.driver_profile
                const hasActiveRide = activeRides.some(r => r.driver && (r.driver as any).full_name === driver.full_name && r.status === 'in_progress')
                const lastSeen = dp?.last_seen_at ? Math.floor((Date.now() - new Date(dp.last_seen_at).getTime()) / 60000) : null

                return (
                  <div key={driver.id} className="bg-[hsl(var(--admin-surface))] rounded-xl border border-[hsl(var(--admin-border))] p-3">
                    <div className="flex items-center gap-3">
                      <div className="relative shrink-0">
                        <div className="w-9 h-9 bg-[hsl(var(--admin-bg))] rounded-full border border-[hsl(var(--admin-border))] flex items-center justify-center">
                          {driver.avatar_url
                            ? <img src={driver.avatar_url} alt={driver.full_name} className="w-full h-full rounded-full object-cover" />
                            : <span className="text-[14px] font-bold text-slate-300">{driver.full_name?.[0]}</span>
                          }
                        </div>
                        <span className="absolute -bottom-0.5 -right-0.5">
                          <PulsingDot active={!hasActiveRide} />
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-bold text-slate-200 truncate">{driver.full_name}</p>
                        {dp && (
                          <p className="text-[11px] text-slate-500 truncate">
                            {dp.vehicle_brand} {dp.vehicle_model} · <span className="font-mono uppercase">{dp.vehicle_plate}</span>
                          </p>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <span className={cn(
                          'inline-flex px-2 py-0.5 rounded-md text-[10px] font-bold',
                          hasActiveRide ? 'bg-blue-500/15 text-blue-400' : 'bg-emerald-500/15 text-emerald-400'
                        )}>
                          {hasActiveRide ? 'Em corrida' : 'Disponível'}
                        </span>
                        {lastSeen !== null && (
                          <p className="text-[10px] text-slate-600 mt-1">{lastSeen}m atrás</p>
                        )}
                      </div>
                    </div>

                    {dp?.current_lat && dp.current_lng && (
                      <div className="mt-2 pt-2 border-t border-[hsl(var(--admin-border))] flex items-center gap-1.5 text-[10px] text-slate-600">
                        <MapPin className="w-3 h-3" />
                        <span className="font-mono">{Number(dp.current_lat).toFixed(4)}, {Number(dp.current_lng).toFixed(4)}</span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Column 3: Activity Feed */}
          <div className="flex flex-col overflow-hidden">
            <div className="px-4 py-2.5 border-b border-[hsl(var(--admin-border))] flex items-center gap-2 shrink-0">
              <Zap className="w-4 h-4 text-slate-400" />
              <h2 className="text-[13px] font-bold text-slate-200">Atividade em Tempo Real</h2>
            </div>

            {/* Revenue Banner */}
            <div className="mx-3 mt-3 bg-gradient-to-r from-emerald-500/10 to-blue-500/10 rounded-xl border border-emerald-500/20 p-3 flex items-center gap-3 shrink-0">
              <TrendingUp className="w-5 h-5 text-emerald-400 shrink-0" />
              <div>
                <p className="text-[11px] text-slate-400">Receita hoje (corridas finalizadas)</p>
                <p className="text-[16px] font-black text-emerald-400 tabular-nums">
                  R$ {stats.todayRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-1.5 mt-2">
              {recentActivity.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-600">
                  <Zap className="w-8 h-8 mb-2 opacity-30" />
                  <p className="text-[13px]">Aguardando eventos...</p>
                  <p className="text-[12px] mt-1">Atualizações chegam automaticamente</p>
                </div>
              ) : recentActivity.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start gap-2.5 p-2.5 rounded-xl bg-[hsl(var(--admin-surface))]/60 border border-[hsl(var(--admin-border))]/50"
                >
                  <ActivityIcon type={item.type} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] text-slate-300 leading-relaxed">{item.message}</p>
                    <p className="text-[10px] text-slate-600 mt-0.5 tabular-nums">{item.time}</p>
                  </div>
                </div>
              ))}

              {/* Placeholder items when no activity yet — shows as timeline */}
              {recentActivity.length === 0 && activeRides.slice(0, 5).map((ride) => {
                const sc = STATUS_CONFIG[ride.status] || STATUS_CONFIG.pending
                return (
                  <div key={ride.id} className="flex items-start gap-2.5 p-2.5 rounded-xl bg-[hsl(var(--admin-surface))]/60 border border-[hsl(var(--admin-border))]/50">
                    <span className={cn('inline-flex w-2 h-2 rounded-full mt-1 shrink-0', sc.dot)} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] text-slate-300">Corrida {sc.label.toLowerCase()} — {ride.pickup_address?.split(',')[0]}</p>
                      <p className="text-[10px] text-slate-600 mt-0.5 tabular-nums">
                        {new Date(ride.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
