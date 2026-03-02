'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { AdminHeader } from '@/components/admin/admin-header'
import { Input } from '@/components/ui/input'
import {
  Search, Car, MapPin, Clock, DollarSign, User, ChevronDown, ChevronUp,
  Navigation, XCircle, CheckCircle, Radio,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Ride {
  id: string
  passenger_id: string
  driver_id: string | null
  pickup_address: string
  dropoff_address: string
  pickup_lat: number
  pickup_lng: number
  dropoff_lat: number
  dropoff_lng: number
  distance_km: number
  estimated_duration_minutes: number
  passenger_price_offer: number
  final_price: number
  status: string
  payment_method: string
  created_at: string
  started_at: string | null
  completed_at: string | null
  cancelled_at: string | null
  cancellation_reason: string | null
  passenger?: { full_name: string; phone: string } | null
  driver?: { full_name: string; phone: string } | null
}

type StatusFilter = 'all' | 'searching' | 'accepted' | 'in_progress' | 'completed' | 'cancelled'

const statusConfig: Record<string, { label: string; color: string; icon: typeof Car }> = {
  searching: { label: 'Buscando', color: 'bg-amber-500/15 text-amber-500', icon: Radio },
  accepted: { label: 'Aceita', color: 'bg-cyan-500/15 text-cyan-500', icon: CheckCircle },
  in_progress: { label: 'Em Andamento', color: 'bg-blue-500/15 text-blue-500', icon: Navigation },
  completed: { label: 'Finalizada', color: 'bg-emerald-500/15 text-emerald-500', icon: CheckCircle },
  cancelled: { label: 'Cancelada', color: 'bg-red-500/15 text-red-500', icon: XCircle },
  pending: { label: 'Pendente', color: 'bg-neutral-500/15 text-neutral-400', icon: Clock },
}

export default function RidesPage() {
  const [rides, setRides] = useState<Ride[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchRides = useCallback(async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('rides')
      .select('*, passenger:profiles!passenger_id(full_name, phone), driver:profiles!driver_id(full_name, phone)')
      .order('created_at', { ascending: false })
      .limit(200)
    if (data) setRides(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchRides()
    const supabase = createClient()
    const channel = supabase
      .channel('admin-rides')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rides' }, () => fetchRides())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [fetchRides])

  const filtered = rides.filter((r) => {
    if (statusFilter !== 'all' && r.status !== statusFilter) return false
    if (search) {
      const q = search.toLowerCase()
      return (
        r.pickup_address?.toLowerCase().includes(q) ||
        r.dropoff_address?.toLowerCase().includes(q) ||
        r.passenger?.full_name?.toLowerCase().includes(q) ||
        r.driver?.full_name?.toLowerCase().includes(q) ||
        r.id.includes(q)
      )
    }
    return true
  })

  const statusCounts: Record<string, number> = {}
  for (const r of rides) statusCounts[r.status] = (statusCounts[r.status] || 0) + 1

  const cancelRide = async (rideId: string) => {
    const supabase = createClient()
    await supabase.from('rides').update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      cancellation_reason: 'Cancelado pelo admin',
    }).eq('id', rideId)
    fetchRides()
  }

  const filters: { key: StatusFilter; label: string }[] = [
    { key: 'all', label: `Todas (${rides.length})` },
    { key: 'searching', label: `Buscando (${statusCounts.searching || 0})` },
    { key: 'in_progress', label: `Ativas (${statusCounts.in_progress || 0})` },
    { key: 'completed', label: `Finalizadas (${statusCounts.completed || 0})` },
    { key: 'cancelled', label: `Canceladas (${statusCounts.cancelled || 0})` },
  ]

  if (loading) {
    return (
      <>
        <AdminHeader title="Corridas" subtitle="Carregando..." />
        <div className="flex-1 flex items-center justify-center bg-[hsl(var(--admin-bg))]">
          <div className="w-6 h-6 border-2 border-[hsl(var(--admin-green))] border-t-transparent rounded-full animate-spin" />
        </div>
      </>
    )
  }

  return (
    <>
      <AdminHeader title="Corridas" subtitle={`${rides.length} corridas no sistema`} />
      <div className="flex-1 overflow-hidden flex flex-col bg-[hsl(var(--admin-bg))]">
        {/* Filters */}
        <div className="p-4 pb-0 space-y-3 shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <Input
              placeholder="Buscar por endereco, passageiro, motorista..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-10 rounded-xl bg-[hsl(var(--admin-surface))] border-[hsl(var(--admin-border))] text-slate-200 placeholder:text-slate-600 text-[13px]"
            />
          </div>
          <div className="flex gap-1 overflow-x-auto pb-1">
            {filters.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setStatusFilter(f.key)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-[12px] font-semibold whitespace-nowrap transition-colors',
                  statusFilter === f.key
                    ? 'bg-[hsl(var(--admin-green))]/20 text-[hsl(var(--admin-green))]'
                    : 'bg-[hsl(var(--admin-surface))] text-slate-400 hover:text-slate-200 border border-[hsl(var(--admin-border))]'
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Rides List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {filtered.map((ride) => {
            const isOpen = expanded === ride.id
            const sc = statusConfig[ride.status] || statusConfig.pending
            const Icon = sc.icon

            return (
              <div key={ride.id} className="bg-[hsl(var(--admin-surface))] rounded-xl border border-[hsl(var(--admin-border))] overflow-hidden">
                <button
                  type="button"
                  onClick={() => setExpanded(isOpen ? null : ride.id)}
                  className="w-full text-left"
                >
                  <div className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', sc.color)}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={cn('inline-flex px-2 py-0.5 rounded-md text-[10px] font-bold', sc.color)}>{sc.label}</span>
                          {(ride.status === 'in_progress' || ride.status === 'searching') && (
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                            </span>
                          )}
                          <span className="text-[11px] text-slate-500 ml-auto tabular-nums">
                            {new Date(ride.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[12px]">
                          <MapPin className="w-3 h-3 text-emerald-500 shrink-0" />
                          <span className="text-slate-200 truncate">{ride.pickup_address || 'N/A'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-[12px] mt-0.5">
                          <MapPin className="w-3 h-3 text-red-500 shrink-0" />
                          <span className="text-slate-200 truncate">{ride.dropoff_address || 'N/A'}</span>
                        </div>
                        <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-500">
                          {ride.passenger && (
                            <span className="flex items-center gap-1"><User className="w-3 h-3" /> {(ride.passenger as any).full_name}</span>
                          )}
                          {ride.driver && (
                            <span className="flex items-center gap-1"><Car className="w-3 h-3" /> {(ride.driver as any).full_name}</span>
                          )}
                          {ride.final_price > 0 && (
                            <span className="flex items-center gap-1 font-semibold text-slate-200">
                              <DollarSign className="w-3 h-3" /> R$ {Number(ride.final_price).toFixed(2)}
                            </span>
                          )}
                        </div>
                      </div>
                      {isOpen ? <ChevronUp className="w-4 h-4 text-slate-500 shrink-0 mt-1" /> : <ChevronDown className="w-4 h-4 text-slate-500 shrink-0 mt-1" />}
                    </div>
                  </div>
                </button>

                {isOpen && (
                  <div className="border-t border-[hsl(var(--admin-border))] bg-[hsl(var(--admin-bg))]/60 p-4 space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {[
                        { label: 'Distancia', value: ride.distance_km ? `${Number(ride.distance_km).toFixed(1)} km` : 'N/A' },
                        { label: 'Duracao Est.', value: ride.estimated_duration_minutes ? `${ride.estimated_duration_minutes} min` : 'N/A' },
                        { label: 'Oferta Pass.', value: ride.passenger_price_offer ? `R$ ${Number(ride.passenger_price_offer).toFixed(2)}` : 'N/A' },
                        { label: 'Valor Final', value: ride.final_price ? `R$ ${Number(ride.final_price).toFixed(2)}` : 'N/A', green: true },
                      ].map(f => (
                        <div key={f.label} className="bg-[hsl(var(--admin-surface))] rounded-xl p-3 border border-[hsl(var(--admin-border))]">
                          <p className="text-[11px] text-slate-500 mb-0.5">{f.label}</p>
                          <p className={cn('text-[14px] font-bold', (f as any).green ? 'text-emerald-400' : 'text-slate-100')}>{f.value}</p>
                        </div>
                      ))}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="bg-[hsl(var(--admin-surface))] rounded-xl p-3 border border-[hsl(var(--admin-border))]">
                        <p className="text-[11px] text-slate-500 mb-1 flex items-center gap-1"><User className="w-3 h-3" /> Passageiro</p>
                        <p className="text-[13px] font-semibold text-slate-200">{(ride.passenger as any)?.full_name || 'N/A'}</p>
                        <p className="text-[11px] text-slate-500">{(ride.passenger as any)?.phone || ''}</p>
                      </div>
                      <div className="bg-[hsl(var(--admin-surface))] rounded-xl p-3 border border-[hsl(var(--admin-border))]">
                        <p className="text-[11px] text-slate-500 mb-1 flex items-center gap-1"><Car className="w-3 h-3" /> Motorista</p>
                        <p className="text-[13px] font-semibold text-slate-200">{(ride.driver as any)?.full_name || 'Sem motorista'}</p>
                        <p className="text-[11px] text-slate-500">{(ride.driver as any)?.phone || ''}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-3 text-[11px] text-slate-500">
                      <span>Criada: {new Date(ride.created_at).toLocaleString('pt-BR')}</span>
                      {ride.started_at && <span>Iniciada: {new Date(ride.started_at).toLocaleString('pt-BR')}</span>}
                      {ride.completed_at && <span>Finalizada: {new Date(ride.completed_at).toLocaleString('pt-BR')}</span>}
                      {ride.cancelled_at && <span className="text-red-400">Cancelada: {new Date(ride.cancelled_at).toLocaleString('pt-BR')}</span>}
                    </div>
                    {ride.cancellation_reason && (
                      <div className="bg-red-500/10 rounded-xl p-3 text-[12px] text-red-400 border border-red-500/20">
                        Motivo: {ride.cancellation_reason}
                      </div>
                    )}
                    {ride.status !== 'completed' && ride.status !== 'cancelled' && (
                      <button
                        type="button"
                        onClick={() => cancelRide(ride.id)}
                        className="w-full h-10 rounded-xl bg-red-500/10 text-red-400 text-[13px] font-bold hover:bg-red-500/20 transition-colors flex items-center justify-center gap-2 border border-red-500/20"
                      >
                        <XCircle className="w-4 h-4" /> Cancelar Corrida (Admin)
                      </button>
                    )}
                    <p className="text-[10px] text-slate-700 font-mono">ID: {ride.id}</p>
                  </div>
                )}
              </div>
            )
          })}
          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-slate-600">
              <Car className="w-10 h-10 mb-2 opacity-30" />
              <p className="text-[14px] font-medium">Nenhuma corrida encontrada</p>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
