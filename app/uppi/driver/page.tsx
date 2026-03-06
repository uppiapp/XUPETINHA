'use client'

import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { GoogleMap } from '@/components/google-map'
import type { GoogleMapHandle } from '@/components/google-map'
import { DriverBottomNavigation } from '@/components/driver-bottom-navigation'
import DriverSkeleton from '@/components/driver-skeleton'
import type { Ride } from '@/lib/types/database'
import { cn } from '@/lib/utils'
import { trackingService } from '@/lib/services/tracking-service'
import { triggerHaptic } from '@/hooks/use-haptic'

interface RideWithPassenger extends Ride {
  passenger?: {
    full_name: string
    avatar_url?: string
  }
}

interface DailyStats {
  totalEarnings: number
  completedRides: number
  acceptanceRate: number
}

export default function DriverPage() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const mapRef = useRef<GoogleMapHandle>(null)

  const [rides, setRides] = useState<RideWithPassenger[]>([])
  const [loading, setLoading] = useState(true)
  const [offerPrice, setOfferPrice] = useState<{ [key: string]: string }>({})
  const [isOnline, setIsOnline] = useState(false)
  const [togglingOnline, setTogglingOnline] = useState(false)
  const [dailyStats, setDailyStats] = useState<DailyStats>({ totalEarnings: 0, completedRides: 0, acceptanceRate: 0 })
  const [expandedRide, setExpandedRide] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [driverVehicleType, setDriverVehicleType] = useState<string | null>(null)
  const [driverName, setDriverName] = useState('')
  const [accepting, setAccepting] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [sheetExpanded, setSheetExpanded] = useState(false)
  const [greeting, setGreeting] = useState('')
  const [trustScore, setTrustScore] = useState<number | null>(null)
  const [auctionTimers, setAuctionTimers] = useState<{ [key: string]: number }>({})
  const [favoritePassengers, setFavoritePassengers] = useState<number>(0)

  useEffect(() => {
    const hour = new Date().getHours()
    if (hour < 12) setGreeting('Bom dia')
    else if (hour < 18) setGreeting('Boa tarde')
    else setGreeting('Boa noite')
    initDriver()
  }, [])

  useEffect(() => {
    if (!isOnline || !driverVehicleType || !userId) return

    const channel = supabase
      .channel(`driver-rides-${userId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'rides' }, async (payload) => {
        const newRide = payload.new as RideWithPassenger
        if ((newRide.vehicle_type === driverVehicleType || !newRide.vehicle_type) && ['pending', 'negotiating'].includes(newRide.status)) {
          const { data: passenger } = await supabase.from('profiles').select('full_name, avatar_url').eq('id', newRide.passenger_id).single()
          setRides(prev => [{ ...newRide, passenger: passenger || undefined }, ...prev])
          try { new Audio('/notification.mp3').play().catch(() => {}) } catch { /* silent */ }
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rides' }, (payload) => {
        const updated = payload.new as RideWithPassenger
        if (['accepted', 'cancelled', 'failed'].includes(updated.status)) {
          setRides(prev => prev.filter(r => r.id !== updated.id))
        }
      })
      .subscribe()

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        fetch('/api/v1/driver/location', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ latitude: pos.coords.latitude, longitude: pos.coords.longitude, is_available: true }),
        })
      })
    }

    return () => { supabase.removeChannel(channel) }
  }, [isOnline, driverVehicleType, userId, supabase])

  const initDriver = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/onboarding/splash'); return }
      setUserId(user.id)

      const [{ data: driverProfile }, { data: profile }, { data: favData }] = await Promise.all([
        supabase.from('driver_profiles').select('vehicle_type, is_available, acceptance_rate, trust_score').eq('id', user.id).single(),
        supabase.from('profiles').select('full_name').eq('id', user.id).single(),
        supabase.from('favorite_drivers').select('id', { count: 'exact' }).eq('driver_id', user.id),
      ])
      if (driverProfile?.trust_score) setTrustScore(driverProfile.trust_score)
      if (favData) setFavoritePassengers(favData.length)

      if (profile) setDriverName(profile.full_name || '')
      const vType = driverProfile?.vehicle_type || null
      if (vType) setDriverVehicleType(vType)
      if (driverProfile?.is_available) setIsOnline(true)

      await Promise.all([loadAvailableRides(vType), loadDailyStats(user.id)])
    } catch {
      setLoading(false)
    }
  }

  const loadAvailableRides = useCallback(async (vehicleTypeOverride?: string | null) => {
    setRefreshing(true)
    try {
      const vt = vehicleTypeOverride ?? driverVehicleType
      let query = supabase
        .from('rides')
        .select('*, passenger:profiles!passenger_id(full_name, avatar_url)')
        .in('status', ['pending', 'negotiating'])
        .order('created_at', { ascending: false })
        .limit(20)
      if (vt) query = query.eq('vehicle_type', vt)
      const { data, error } = await query
      if (error) throw error
      setRides(data || [])
    } catch { /* silent */ } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [driverVehicleType, supabase])

  const loadDailyStats = async (uid: string) => {
    try {
      const today = new Date(); today.setHours(0, 0, 0, 0)
      const { data: completed } = await supabase.from('rides').select('final_price').eq('driver_id', uid).eq('status', 'completed').gte('completed_at', today.toISOString())
      const { data: allOffers } = await supabase.from('price_offers').select('status').eq('driver_id', uid).gte('created_at', today.toISOString())
      const earnings = completed?.reduce((sum, r) => sum + (r.final_price || 0), 0) || 0
      const totalOffers = allOffers?.length || 0
      const acceptedOffers = allOffers?.filter(o => o.status === 'accepted').length || 0
      setDailyStats({ totalEarnings: earnings, completedRides: completed?.length || 0, acceptanceRate: totalOffers > 0 ? Math.round((acceptedOffers / totalOffers) * 100) : 100 })
    } catch { /* silent */ }
  }

  const handleToggleOnline = async () => {
    if (togglingOnline) return
    triggerHaptic('impact')
    setTogglingOnline(true)
    const newOnline = !isOnline
    try {
      if (newOnline && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(async (pos) => {
          await fetch('/api/v1/driver/location', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ latitude: pos.coords.latitude, longitude: pos.coords.longitude, is_available: true }) })
        })
      } else if (userId) {
        await supabase.from('driver_locations').update({ is_available: false }).eq('driver_id', userId)
        await supabase.from('driver_profiles').update({ is_available: false }).eq('id', userId)
      }
      setIsOnline(newOnline)
      if (newOnline) loadAvailableRides()
    } finally {
      setTogglingOnline(false)
    }
  }

  const handleAcceptRide = async (ride: RideWithPassenger) => {
    setAccepting(ride.id)
    try {
      const res = await fetch('/api/v1/offers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ride_id: ride.id, offered_price: ride.passenger_price_offer, estimated_arrival_minutes: 5, message: 'Aceito pelo preço oferecido' }) })
      if (!res.ok) { const err = await res.json(); alert(err.error || 'Erro ao aceitar corrida'); return }
      const { offer } = await res.json()
      await fetch(`/api/v1/offers/${offer.id}/accept`, { method: 'POST', headers: { 'Content-Type': 'application/json' } })
      if (userId) trackingService.startDriverTracking(ride.id, userId)
      setRides(prev => prev.filter(r => r.id !== ride.id))
      loadDailyStats(userId!)
      router.push(`/uppi/driver/ride/${ride.id}/active`)
    } catch { alert('Erro ao aceitar corrida. Tente novamente.') } finally { setAccepting(null) }
  }

  const handleMakeOffer = async (rideId: string) => {
    const price = parseFloat(offerPrice[rideId] || '0')
    if (!price || price <= 0) return
    try {
      const res = await fetch('/api/v1/offers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ride_id: rideId, offered_price: price, estimated_arrival_minutes: 5, message: 'Contra-oferta do motorista' }) })
      if (res.ok) { setOfferPrice(prev => ({ ...prev, [rideId]: '' })); setExpandedRide(null) }
    } catch { /* silent */ }
  }

  const handleLocationFound = useCallback((lat: number, lng: number) => {
    setUserLocation({ lat, lng })
  }, [])

  if (loading) return <DriverSkeleton />

  const firstName = driverName?.split(' ')[0] || 'Motorista'

  return (
    <main className="h-dvh flex flex-col relative overflow-hidden bg-background">
      {/* Map — full screen igual passageiro */}
      <div className="absolute inset-0">
        <GoogleMap
          ref={mapRef}
          onLocationFound={handleLocationFound}
          className="w-full h-full"
        />

        {/* Top Bar — espelho do passageiro */}
        <div className="absolute top-0 left-0 right-0 z-10">
          <div
            className="px-4 pt-[calc(env(safe-area-inset-top)+0.5rem)] pb-3"
            style={{
              background: 'linear-gradient(to bottom, rgba(242, 242, 247, 0.95) 0%, rgba(242, 242, 247, 0.8) 85%, transparent 100%)',
              backdropFilter: 'saturate(180%) blur(20px)',
              WebkitBackdropFilter: 'saturate(180%) blur(20px)',
            }}
          >
            {/* Greeting + toggle */}
            <div className="flex items-center justify-between mb-2.5">
              <div>
                <p className="text-[13px] text-[#8E8E93] font-medium">{greeting}</p>
                <h1 className="text-[20px] font-bold text-foreground tracking-tight leading-none">{firstName}</h1>
              </div>

              {/* Toggle Online/Offline */}
              <button
                type="button"
                onClick={handleToggleOnline}
                disabled={togglingOnline}
                className={cn(
                  'flex items-center gap-2.5 px-4 py-2 rounded-full font-semibold text-[14px] ios-press transition-all shadow-md disabled:opacity-60',
                  isOnline
                    ? 'bg-emerald-500 text-white shadow-emerald-500/30'
                    : 'bg-white/90 dark:bg-[#1C1C1E]/90 text-foreground shadow-black/10'
                )}
              >
                {togglingOnline ? (
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : (
                  <div className={cn('w-2 h-2 rounded-full', isOnline ? 'bg-white animate-pulse' : 'bg-[#8E8E93]')} />
                )}
                {isOnline ? 'Online' : 'Offline'}
              </button>
            </div>

            {/* Stats rápidos */}
            <div className="flex gap-2">
              {[
                { label: 'Ganhos', value: `R$ ${dailyStats.totalEarnings.toFixed(0)}`, color: 'text-emerald-600' },
                { label: 'Corridas', value: String(dailyStats.completedRides), color: 'text-[#007AFF]' },
                { label: 'Taxa', value: `${dailyStats.acceptanceRate}%`, color: 'text-amber-500' },
                ...(trustScore !== null ? [{ label: 'Score', value: String(trustScore), color: trustScore >= 80 ? 'text-purple-600' : trustScore >= 60 ? 'text-emerald-600' : 'text-amber-500' }] : []),
              ].map((s) => (
                <div
                  key={s.label}
                  className="flex-1 bg-white/80 dark:bg-[#1C1C1E]/80 ios-blur rounded-[12px] px-3 py-2 shadow-[0_0_0_0.5px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.04)] dark:shadow-[0_0_0_0.5px_rgba(255,255,255,0.04),0_1px_2px_rgba(0,0,0,0.3)]"
                >
                  <p className={cn('text-[16px] font-bold leading-none', s.color)}>{s.value}</p>
                  <p className="text-[11px] text-[#8E8E93] font-medium mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Sheet — lista de corridas */}
        <div
          className="absolute left-0 right-0 z-20 transition-all duration-500 ease-out"
          style={{ bottom: 'calc(env(safe-area-inset-bottom) + 4.5rem)' }}
        >
          {/* Handle */}
          <button
            type="button"
            className="w-full flex justify-center pb-2"
            onClick={() => { triggerHaptic('selection'); setSheetExpanded(v => !v) }}
            aria-label={sheetExpanded ? 'Recolher lista' : 'Expandir lista'}
          >
            <div className="w-10 h-1 bg-white/60 rounded-full shadow" />
          </button>

          <div
            className="mx-3 rounded-[24px] overflow-hidden shadow-[0_-4px_40px_rgba(0,0,0,0.18)] dark:shadow-[0_-4px_40px_rgba(0,0,0,0.5)]"
            style={{
              background: 'rgba(242,242,247,0.97)',
              backdropFilter: 'saturate(180%) blur(24px)',
              WebkitBackdropFilter: 'saturate(180%) blur(24px)',
              maxHeight: sheetExpanded ? '70vh' : '38vh',
              transition: 'max-height 0.4s cubic-bezier(0.32, 0.72, 0, 1)',
              overflowY: 'auto',
            }}
          >
            {/* Sheet header */}
            <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-3.5"
              style={{
                background: 'rgba(242,242,247,0.97)',
                borderBottom: '0.5px solid rgba(0,0,0,0.08)',
              }}
            >
              <div className="flex items-center gap-2">
                {isOnline ? (
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                ) : (
                  <div className="w-2 h-2 bg-[#8E8E93] rounded-full" />
                )}
                <p className="text-[15px] font-semibold text-foreground tracking-[-0.2px]">
                  {isOnline
                    ? rides.length > 0
                      ? `${rides.length} solicitaç${rides.length === 1 ? 'ão' : 'ões'}`
                      : 'Aguardando corridas...'
                    : 'Você está offline'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => { triggerHaptic('impact'); loadAvailableRides() }}
                  disabled={refreshing}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-emerald-500/10 ios-press disabled:opacity-50"
                  aria-label="Atualizar corridas"
                >
                  <svg className={cn('w-4 h-4 text-emerald-600', refreshing && 'animate-spin')} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => { triggerHaptic('selection'); router.push('/uppi/driver/earnings') }}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-[#007AFF]/10 ios-press"
                  aria-label="Ver ganhos"
                >
                  <svg className="w-4 h-4 text-[#007AFF]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Conteúdo do sheet */}
            <div className="px-4 pb-4 pt-2 space-y-3">
              {!isOnline ? (
                <div className="flex flex-col items-center justify-center py-10 gap-3">
                  <div className="w-14 h-14 bg-[#F2F2F7] dark:bg-[#2C2C2E] rounded-full flex items-center justify-center">
                    <svg className="w-7 h-7 text-[#8E8E93]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12A9 9 0 015.636 5.636m12.728 12L5.636 5.636" />
                    </svg>
                  </div>
                  <p className="text-[15px] font-semibold text-foreground">Você está offline</p>
                  <p className="text-[13px] text-[#8E8E93] text-center leading-relaxed">Ative o modo online para começar a receber corridas</p>
                  <button
                    type="button"
                    onClick={handleToggleOnline}
                    className="mt-1 px-6 py-2.5 bg-emerald-500 text-white rounded-full text-[15px] font-semibold ios-press shadow-md shadow-emerald-500/30"
                  >
                    Ficar Online
                  </button>
                </div>
              ) : rides.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 gap-3">
                  <div className="w-14 h-14 bg-emerald-50 rounded-full flex items-center justify-center">
                    <svg className="w-7 h-7 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p className="text-[15px] font-semibold text-foreground">Nenhuma corrida disponível</p>
                  <p className="text-[13px] text-[#8E8E93]">Aguardando novas solicitações...</p>
                </div>
              ) : (
                rides.map((ride, index) => {
                  const isExpanded = expandedRide === ride.id
                  return (
                    <div
                      key={ride.id}
                      className="bg-white dark:bg-[#1C1C1E] rounded-[20px] p-4 shadow-[0_0_0_0.5px_rgba(0,0,0,0.06),0_2px_8px_rgba(0,0,0,0.08)] dark:shadow-[0_0_0_0.5px_rgba(255,255,255,0.06)] overflow-hidden"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      {/* Badge leilão */}
                      {(ride as any).is_auction && (
                        <div className="flex items-center gap-1.5 mb-2 px-2.5 py-1 rounded-full w-fit"
                          style={{ background: 'linear-gradient(135deg, #f59e0b22, #f9731622)' }}>
                          <svg className="w-3 h-3 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                          </svg>
                          <span className="text-[11px] font-bold text-amber-600">LEILAO</span>
                          {auctionTimers[ride.id] !== undefined && (
                            <span className="text-[11px] font-bold text-amber-600 tabular-nums">
                              {Math.max(0, auctionTimers[ride.id])}s
                            </span>
                          )}
                        </div>
                      )}

                      {/* Passageiro + preço */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center">
                            <span className="text-[15px] font-bold text-emerald-700 dark:text-emerald-400">
                              {ride.passenger?.full_name?.[0] || 'P'}
                            </span>
                          </div>
                          <div>
                            <p className="text-[15px] font-semibold text-foreground leading-none">{ride.passenger?.full_name || 'Passageiro'}</p>
                            <p className="text-[12px] text-[#8E8E93] mt-0.5">{ride.vehicle_type || 'Carro'}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-[11px] text-[#8E8E93] font-medium uppercase tracking-wide">{(ride as any).is_auction ? 'Lance atual' : 'Oferta'}</p>
                          <p className="text-[20px] font-bold text-emerald-600 leading-none">R$ {ride.passenger_price_offer?.toFixed(2) || '0.00'}</p>
                        </div>
                      </div>

                      {/* Rota */}
                      <div className="space-y-1.5 mb-3 pl-1">
                        <div className="flex items-start gap-2.5">
                          <div className="w-2 h-2 bg-[#007AFF] rounded-full mt-1.5 flex-shrink-0" />
                          <p className="text-[13px] text-foreground leading-snug">{ride.pickup_address}</p>
                        </div>
                        <div className="w-px h-2.5 bg-[#C7C7CC] ml-[3px]" />
                        <div className="flex items-start gap-2.5">
                          <div className="w-2 h-2 bg-[#FF9500] rounded-full mt-1.5 flex-shrink-0" />
                          <p className="text-[13px] text-foreground leading-snug">{ride.dropoff_address}</p>
                        </div>
                      </div>

                      {ride.distance_km && (
                        <p className="text-[12px] text-[#8E8E93] mb-3">{ride.distance_km} km · ~{ride.estimated_duration_minutes || '?'} min</p>
                      )}

                      {/* Ações */}
                      {!isExpanded ? (
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => { triggerHaptic('selection'); setExpandedRide(ride.id) }}
                            className="flex-1 h-11 rounded-[14px] bg-[#007AFF]/10 text-[#007AFF] text-[14px] font-semibold ios-press"
                          >
                            Contra-oferta
                          </button>
                          <button
                            type="button"
                            disabled={accepting === ride.id}
                            onClick={() => { triggerHaptic('impact'); handleAcceptRide(ride) }}
                            className="flex-1 h-11 rounded-[14px] bg-emerald-500 text-white text-[14px] font-semibold ios-press shadow-sm shadow-emerald-500/30 disabled:opacity-70 flex items-center justify-center"
                          >
                            {accepting === ride.id ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Aceitar'}
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="relative">
                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[14px] font-semibold text-[#8E8E93]">R$</span>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="Sua oferta"
                              value={offerPrice[ride.id] || ''}
                              onChange={(e) => setOfferPrice(prev => ({ ...prev, [ride.id]: e.target.value }))}
                              className="w-full h-11 pl-10 pr-4 bg-[#F2F2F7] dark:bg-[#2C2C2E] rounded-[14px] text-[15px] font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/40 transition-all"
                            />
                          </div>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => { setExpandedRide(null); setOfferPrice(prev => ({ ...prev, [ride.id]: '' })) }}
                              className="flex-1 h-11 rounded-[14px] bg-[#F2F2F7] dark:bg-[#2C2C2E] text-foreground text-[14px] font-semibold ios-press"
                            >
                              Cancelar
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMakeOffer(ride.id)}
                              className="flex-1 h-11 rounded-[14px] bg-emerald-500 text-white text-[14px] font-semibold ios-press shadow-sm"
                            >
                              Enviar
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>
      </div>

      <DriverBottomNavigation />
    </main>
  )
}
