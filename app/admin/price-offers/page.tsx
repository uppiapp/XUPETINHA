'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { AdminHeader } from '@/components/admin/admin-header'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Search, DollarSign, Car, User, Clock, CheckCircle, XCircle, Radio, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PriceOffer {
  id: string
  ride_id: string
  driver_id: string
  offered_price: number
  status: string
  expires_at: string | null
  accepted_at: string | null
  rejected_at: string | null
  created_at: string
  driver?: { full_name: string; rating: number; total_rides: number } | null
  ride?: {
    pickup_address: string
    dropoff_address: string
    distance_km: number
    passenger_price_offer: number
    passenger?: { full_name: string } | null
  } | null
}

const statusConfig: Record<string, { label: string; color: string; bg: string; icon: typeof CheckCircle }> = {
  pending: { label: 'Pendente', color: 'text-amber-400', bg: 'bg-amber-500/15', icon: Clock },
  accepted: { label: 'Aceita', color: 'text-emerald-400', bg: 'bg-emerald-500/15', icon: CheckCircle },
  rejected: { label: 'Recusada', color: 'text-red-400', bg: 'bg-red-500/15', icon: XCircle },
  expired: { label: 'Expirada', color: 'text-slate-400', bg: 'bg-slate-500/15', icon: Clock },
}

export default function AdminPriceOffersPage() {
  const [offers, setOffers] = useState<PriceOffer[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState(new Date())

  const fetchOffers = useCallback(async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('price_offers')
      .select(`
        *,
        driver:profiles!price_offers_driver_id_fkey(full_name, rating, total_rides),
        ride:rides!price_offers_ride_id_fkey(
          pickup_address, dropoff_address, distance_km, passenger_price_offer,
          passenger:profiles!rides_passenger_id_fkey(full_name)
        )
      `)
      .order('created_at', { ascending: false })
      .limit(300)
    if (data) {
      setOffers(data)
      setLastUpdate(new Date())
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchOffers()
    const supabase = createClient()
    const channel = supabase
      .channel('admin-price-offers-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'price_offers' }, () => fetchOffers())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [fetchOffers])

  // KPIs
  const pendingCount = offers.filter(o => o.status === 'pending').length
  const acceptedCount = offers.filter(o => o.status === 'accepted').length
  const avgOffer = offers.length
    ? (offers.reduce((s, o) => s + Number(o.offered_price), 0) / offers.length).toFixed(2)
    : '0.00'
  const acceptRate = offers.length
    ? ((acceptedCount / offers.length) * 100).toFixed(0)
    : '0'

  const statusCounts: Record<string, number> = {}
  for (const o of offers) statusCounts[o.status] = (statusCounts[o.status] || 0) + 1

  const filtered = offers.filter((o) => {
    if (statusFilter !== 'all' && o.status !== statusFilter) return false
    if (search) {
      const q = search.toLowerCase()
      return (
        o.driver?.full_name?.toLowerCase().includes(q) ||
        o.ride?.pickup_address?.toLowerCase().includes(q) ||
        o.ride?.dropoff_address?.toLowerCase().includes(q) ||
        (o.ride?.ride as any)?.passenger?.full_name?.toLowerCase().includes(q) ||
        o.id.includes(q)
      )
    }
    return true
  })

  if (loading) {
    return (
      <>
        <AdminHeader title="Ofertas de Preco" subtitle="Carregando..." />
        <div className="flex-1 flex items-center justify-center bg-[hsl(var(--admin-bg))]">
          <div className="w-6 h-6 border-2 border-[hsl(var(--admin-green))] border-t-transparent rounded-full animate-spin" />
        </div>
      </>
    )
  }

  return (
    <>
      <AdminHeader
        title="Ofertas de Preco"
        subtitle={`${offers.length} ofertas · ${pendingCount} pendentes · atualizado ${lastUpdate.toLocaleTimeString('pt-BR')}`}
      />
      <div className="flex-1 overflow-hidden flex flex-col bg-[hsl(var(--admin-bg))]">
        {/* KPIs */}
        <div className="p-4 pb-0 grid grid-cols-2 md:grid-cols-4 gap-3 shrink-0">
          {[
            { label: 'Pendentes', value: String(pendingCount), icon: Radio, color: 'text-amber-400', bg: 'bg-amber-500/10' },
            { label: 'Aceitas', value: String(acceptedCount), icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
            { label: 'Oferta Media', value: `R$ ${avgOffer}`, icon: DollarSign, color: 'text-[hsl(var(--admin-green))]', bg: 'bg-[hsl(var(--admin-green))]/10' },
            { label: 'Taxa Aceite', value: `${acceptRate}%`, icon: TrendingUp, color: 'text-blue-400', bg: 'bg-blue-500/10' },
          ].map((kpi) => (
            <div key={kpi.label} className="bg-[hsl(var(--admin-surface))] rounded-xl p-4 border border-[hsl(var(--admin-border))] flex items-center gap-3">
              <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0', kpi.bg)}>
                <kpi.icon className={cn('w-4 h-4', kpi.color)} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] text-slate-500 font-medium">{kpi.label}</p>
                <p className={cn('text-[16px] font-bold tabular-nums', kpi.color)}>{kpi.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="p-4 pb-0 flex items-center gap-3 shrink-0 flex-wrap">
          <div className="flex gap-1 flex-wrap">
            {[
              { key: 'all', label: `Todas (${offers.length})` },
              { key: 'pending', label: `Pendentes (${statusCounts.pending || 0})` },
              { key: 'accepted', label: `Aceitas (${statusCounts.accepted || 0})` },
              { key: 'rejected', label: `Recusadas (${statusCounts.rejected || 0})` },
              { key: 'expired', label: `Expiradas (${statusCounts.expired || 0})` },
            ].map((f) => (
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
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
            <Input
              placeholder="Buscar por motorista, endereco..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-9 rounded-xl bg-[hsl(var(--admin-surface))] border-[hsl(var(--admin-border))] text-slate-200 placeholder:text-slate-600 text-[12px]"
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-slate-600">
              <DollarSign className="w-10 h-10 mb-2 opacity-30" />
              <p className="text-[14px]">Nenhuma oferta encontrada</p>
            </div>
          )}
          {filtered.map((offer) => {
            const sc = statusConfig[offer.status] || statusConfig.pending
            const Icon = sc.icon
            const diff = offer.ride?.passenger_price_offer
              ? Number(offer.offered_price) - Number(offer.ride.passenger_price_offer)
              : null
            return (
              <div key={offer.id} className="bg-[hsl(var(--admin-surface))] rounded-xl border border-[hsl(var(--admin-border))] p-4">
                <div className="flex items-start gap-3">
                  <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', sc.bg, sc.color)}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <Badge className={cn('text-[10px] border-0 font-bold px-2 py-0.5', sc.color, sc.bg)}>{sc.label}</Badge>
                      {offer.status === 'pending' && (
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
                        </span>
                      )}
                      <span className="text-[11px] text-slate-500 ml-auto tabular-nums">
                        {new Date(offer.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    {/* Price comparison */}
                    <div className="flex items-center gap-3 mb-2">
                      <div>
                        <p className="text-[10px] text-slate-500">Oferta Motorista</p>
                        <p className="text-[17px] font-bold text-slate-100 tabular-nums">R$ {Number(offer.offered_price).toFixed(2)}</p>
                      </div>
                      {offer.ride?.passenger_price_offer && (
                        <>
                          <span className="text-slate-600 text-lg">vs</span>
                          <div>
                            <p className="text-[10px] text-slate-500">Oferta Passageiro</p>
                            <p className="text-[17px] font-bold text-blue-400 tabular-nums">R$ {Number(offer.ride.passenger_price_offer).toFixed(2)}</p>
                          </div>
                          {diff !== null && (
                            <span className={cn(
                              'text-[12px] font-bold tabular-nums px-2 py-0.5 rounded',
                              diff > 0 ? 'bg-red-500/10 text-red-400' : 'bg-emerald-500/10 text-emerald-400'
                            )}>
                              {diff > 0 ? '+' : ''}{diff.toFixed(2)}
                            </span>
                          )}
                        </>
                      )}
                    </div>

                    {/* Ride addresses */}
                    {offer.ride && (
                      <div className="text-[12px] text-slate-400 space-y-0.5 mb-2">
                        <p className="truncate">
                          <span className="text-emerald-400 font-medium">De:</span> {offer.ride.pickup_address}
                        </p>
                        <p className="truncate">
                          <span className="text-red-400 font-medium">Para:</span> {offer.ride.dropoff_address}
                        </p>
                        {offer.ride.distance_km && (
                          <p className="text-slate-500">{Number(offer.ride.distance_km).toFixed(1)} km</p>
                        )}
                      </div>
                    )}

                    {/* Participants */}
                    <div className="flex items-center gap-3 text-[11px] text-slate-500 flex-wrap">
                      {offer.ride?.passenger && (
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3 text-blue-400" />
                          {(offer.ride.passenger as any).full_name}
                        </span>
                      )}
                      {offer.driver && (
                        <span className="flex items-center gap-1">
                          <Car className="w-3 h-3 text-emerald-400" />
                          {offer.driver.full_name}
                          <span className="text-yellow-400">★ {Number(offer.driver.rating).toFixed(1)}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}
