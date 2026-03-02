'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { BottomNavigation } from '@/components/bottom-navigation'
import DriverSkeleton from '@/components/driver-skeleton'
import type { Ride } from '@/lib/types/database'
import { cn } from '@/lib/utils'
import { trackingService } from '@/lib/services/tracking-service'

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
  const supabase = createClient()
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

  useEffect(() => {
    initDriver()
  }, [])

  // Subscribe realtime quando online
  useEffect(() => {
    if (!isOnline || !driverVehicleType || !userId) return

    const channel = supabase
      .channel(`driver-rides-${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'rides' },
        async (payload) => {
          const newRide = payload.new as RideWithPassenger
          if (
            (newRide.vehicle_type === driverVehicleType || !newRide.vehicle_type) &&
            ['pending', 'negotiating'].includes(newRide.status)
          ) {
            const { data: passenger } = await supabase
              .from('profiles')
              .select('full_name, avatar_url')
              .eq('id', newRide.passenger_id)
              .single()

            setRides(prev => [{ ...newRide, passenger: passenger || undefined }, ...prev])

            try {
              const audio = new Audio('/notification.mp3')
              audio.volume = 0.5
              audio.play().catch(() => {})
            } catch { /* silent */ }
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'rides' },
        (payload) => {
          const updated = payload.new as RideWithPassenger
          if (['accepted', 'cancelled', 'failed'].includes(updated.status)) {
            setRides(prev => prev.filter(r => r.id !== updated.id))
          }
        }
      )
      .subscribe()

    // Enviar localização GPS enquanto online
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        fetch('/api/v1/driver/location', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            is_available: true,
          }),
        })
      })
    }

    return () => { supabase.removeChannel(channel) }
  }, [isOnline, driverVehicleType, userId])

  const initDriver = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/onboarding/splash'); return }
      setUserId(user.id)

      const [{ data: driverProfile }, { data: profile }] = await Promise.all([
        supabase.from('driver_profiles').select('vehicle_type, is_available, acceptance_rate, completion_rate').eq('id', user.id).single(),
        supabase.from('profiles').select('full_name').eq('id', user.id).single(),
      ])

      if (profile) setDriverName(profile.full_name || '')
      const vType = driverProfile?.vehicle_type || null
      if (vType) setDriverVehicleType(vType)
      if (driverProfile?.is_available) setIsOnline(true)

      await Promise.all([
        loadAvailableRides(vType),
        loadDailyStats(user.id),
      ])
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
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      // Corridas de hoje (concluídas = ganhos)
      const { data: completed } = await supabase
        .from('rides')
        .select('final_price')
        .eq('driver_id', uid)
        .eq('status', 'completed')
        .gte('completed_at', today.toISOString())

      // Total de offers feitas hoje para calcular taxa real
      const { data: allOffers } = await supabase
        .from('ride_offers')
        .select('status')
        .eq('driver_id', uid)
        .gte('created_at', today.toISOString())

      const earnings = completed?.reduce((sum, r) => sum + (r.final_price || 0), 0) || 0
      const totalOffers = allOffers?.length || 0
      const acceptedOffers = allOffers?.filter(o => o.status === 'accepted').length || 0
      const acceptanceRate = totalOffers > 0 ? Math.round((acceptedOffers / totalOffers) * 100) : 100

      setDailyStats({
        totalEarnings: earnings,
        completedRides: completed?.length || 0,
        acceptanceRate,
      })
    } catch { /* silent */ }
  }

  // Toggle online/offline via API — atualiza driver_locations e driver_profiles
  const handleToggleOnline = async () => {
    if (togglingOnline) return
    setTogglingOnline(true)
    const newOnline = !isOnline
    try {
      if (newOnline && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(async (pos) => {
          await fetch('/api/v1/driver/location', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
              is_available: true,
            }),
          })
        })
      } else {
        // Marcar offline
        if (userId) {
          await supabase.from('driver_locations').update({ is_available: false }).eq('driver_id', userId)
          await supabase.from('driver_profiles').update({ is_online: false, is_available: false }).eq('id', userId)
        }
      }
      setIsOnline(newOnline)
      if (newOnline) loadAvailableRides()
    } finally {
      setTogglingOnline(false)
    }
  }

  // Aceitar corrida pelo preço oferecido pelo passageiro
  const handleAcceptRide = async (ride: RideWithPassenger) => {
    setAccepting(ride.id)
    try {
      const res = await fetch('/api/v1/offers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ride_id: ride.id,
          offered_price: ride.passenger_price_offer,
          estimated_arrival_minutes: 5,
          message: 'Aceito pelo preço oferecido',
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        alert(err.error || 'Erro ao aceitar corrida')
        return
      }

      const { offer } = await res.json()

      // Aceitar a própria oferta imediatamente (passageiro aceitou via negotiating → driver aceita)
      await fetch(`/api/v1/offers/${offer.id}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      if (userId) {
        trackingService.startDriverTracking(ride.id, userId)
      }

      setRides(prev => prev.filter(r => r.id !== ride.id))
      loadDailyStats(userId!)
      router.push(`/uppi/driver/ride/${ride.id}/active`)
    } catch {
      alert('Erro ao aceitar corrida. Tente novamente.')
    } finally {
      setAccepting(null)
    }
  }

  // Enviar contra-oferta via API
  const handleMakeOffer = async (rideId: string) => {
    const price = parseFloat(offerPrice[rideId] || '0')
    if (!price || price <= 0) return
    try {
      const res = await fetch('/api/v1/offers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ride_id: rideId,
          offered_price: price,
          estimated_arrival_minutes: 5,
          message: 'Contra-oferta do motorista',
        }),
      })
      if (res.ok) {
        setOfferPrice(prev => ({ ...prev, [rideId]: '' }))
        setExpandedRide(null)
      }
    } catch { /* silent */ }
  }

  const getVehicleLabel = (type: string) => {
    const labels: Record<string, string> = { moto: 'Moto', economy: 'Carro', electric: 'Elétrico', premium: 'Premium', suv: 'SUV' }
    return labels[type] || 'Carro'
  }

  if (loading) return <DriverSkeleton />

  return (
    <div className="h-dvh overflow-y-auto bg-[color:var(--background)] pb-24 ios-scroll">
      {refreshing && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 animate-ios-bounce-in">
          <div className="bg-[color:var(--card)] ios-blur-heavy px-5 py-3 rounded-[20px] shadow-lg flex items-center gap-2.5">
            <div className="w-5 h-5 border-2 border-[color:var(--primary)] border-t-transparent rounded-full animate-spin" />
            <span className="text-[14px] font-semibold text-[color:var(--foreground)]">Atualizando...</span>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-[color:var(--card)]/80 ios-blur border-b border-[color:var(--border)] sticky top-0 z-30 animate-ios-fade-up">
        <div className="px-5 pt-safe-offset-4 pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => router.back()}
                className="w-9 h-9 flex items-center justify-center rounded-full bg-[color:var(--muted)] hover:opacity-80 ios-press transition-opacity"
              >
                <svg className="w-5 h-5 text-[color:var(--foreground)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div>
                <h1 className="text-[22px] font-bold text-[color:var(--foreground)] tracking-tight leading-none">
                  {driverName ? `Olá, ${driverName.split(' ')[0]}` : 'Motorista'}
                </h1>
                <p className="text-[13px] text-[color:var(--muted-foreground)] mt-0.5">
                  {driverVehicleType ? getVehicleLabel(driverVehicleType) : 'Corridas disponíveis'}
                </p>
              </div>
            </div>

            {/* Toggle Online/Offline */}
            <button
              type="button"
              onClick={handleToggleOnline}
              disabled={togglingOnline}
              className={cn(
                'relative w-14 h-8 rounded-full transition-all ios-press disabled:opacity-60',
                isOnline ? 'bg-emerald-500' : 'bg-neutral-300'
              )}
              aria-label={isOnline ? 'Ficar offline' : 'Ficar online'}
            >
              {togglingOnline ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <div className={cn(
                  'absolute top-1 w-6 h-6 bg-white rounded-full shadow-md transition-all',
                  isOnline ? 'right-1' : 'left-1'
                )} />
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="px-5 py-5 max-w-2xl mx-auto">
        {/* Status Banner */}
        <div className={cn(
          'mb-5 rounded-[20px] p-4 flex items-center justify-between animate-ios-fade-up border transition-all',
          isOnline
            ? 'bg-emerald-50 border-emerald-200/50'
            : 'bg-[color:var(--muted)] border-[color:var(--border)]'
        )}>
          <div className="flex items-center gap-3">
            <div className={cn('w-3 h-3 rounded-full', isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-neutral-400')} />
            <div>
              <p className="text-[16px] font-bold text-[color:var(--foreground)]">
                {isOnline ? 'Online — Recebendo corridas' : 'Offline'}
              </p>
              <p className="text-[13px] text-[color:var(--muted-foreground)]">
                {isOnline ? 'Você está visível para passageiros' : 'Ative para receber corridas'}
              </p>
            </div>
          </div>
        </div>

        {/* Link para Dashboard de Ganhos */}
        <button
          type="button"
          onClick={() => router.push('/uppi/driver/earnings')}
          className="w-full bg-emerald-500 rounded-[20px] p-4 mb-4 flex items-center gap-4 ios-press shadow-lg shadow-emerald-500/20 animate-ios-fade-up"
        >
          <div className="w-12 h-12 bg-white/20 rounded-[16px] flex items-center justify-center shrink-0">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <div className="flex-1 text-left">
            <p className="text-[16px] font-bold text-white">Dashboard de Ganhos</p>
            <p className="text-[13px] text-white/75">Gráficos, demanda e zonas quentes</p>
          </div>
          <svg className="w-5 h-5 text-white/60 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>

        {/* Quick Access Grid */}
        <div className="grid grid-cols-4 gap-2.5 mb-5 animate-ios-fade-up">
          {[
            { label: 'Histórico', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2', href: '/uppi/driver/history' },
            { label: 'Avaliações', icon: 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z', href: '/uppi/driver/ratings' },
            { label: 'Carteira', icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z', href: '/uppi/driver/wallet' },
            { label: 'Zonas Quentes', icon: 'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z', href: '/uppi/driver/hot-zones' },
            { label: 'Agendamentos', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z', href: '/uppi/driver/schedule' },
            { label: 'Perfil', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z', href: '/uppi/driver/profile' },
            { label: 'Documentos', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', href: '/uppi/driver/documents' },
            { label: 'Config', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z', href: '/uppi/driver/settings' },
          ].map((item) => (
            <button
              key={item.href}
              type="button"
              onClick={() => router.push(item.href)}
              className="bg-[color:var(--card)] border border-[color:var(--border)] rounded-[16px] p-3 flex flex-col items-center gap-1.5 ios-press hover:border-emerald-500/40 transition-colors"
            >
              <div className="w-9 h-9 bg-emerald-500/10 rounded-[10px] flex items-center justify-center">
                <svg className="w-4.5 h-4.5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                </svg>
              </div>
              <span className="text-[10px] font-semibold text-[color:var(--muted-foreground)] text-center leading-tight">{item.label}</span>
            </button>
          ))}
        </div>

        {/* Stats Hoje */}
        <div className="grid grid-cols-3 gap-2.5 mb-5 stagger-children">
          {[
            { label: 'Ganhos Hoje', value: `R$ ${dailyStats.totalEarnings.toFixed(0)}`, color: 'text-emerald-600' },
            { label: 'Viagens', value: String(dailyStats.completedRides), color: 'text-blue-600' },
            { label: 'Taxa', value: `${dailyStats.acceptanceRate}%`, color: 'text-amber-600' },
          ].map((stat) => (
            <div key={stat.label} className="bg-[color:var(--card)] rounded-[20px] p-4 text-center shadow-sm border border-[color:var(--border)]">
              <div className={cn('text-[22px] font-bold tracking-tight leading-none mb-1.5', stat.color)}>
                {stat.value}
              </div>
              <div className="text-[11px] font-semibold text-[color:var(--muted-foreground)] uppercase tracking-wide">
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        {/* Header da lista */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-[13px] font-semibold text-[color:var(--muted-foreground)] uppercase tracking-wide">
            Solicitações ({rides.length})
          </p>
          <button
            type="button"
            onClick={() => loadAvailableRides()}
            disabled={refreshing}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-emerald-500/10 hover:bg-emerald-500/20 ios-press transition-colors disabled:opacity-50"
          >
            <svg className={cn('w-4 h-4 text-emerald-600', refreshing && 'animate-spin')} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>

        {/* Lista de corridas */}
        <div className="space-y-3">
          {!isOnline ? (
            <div className="bg-[color:var(--card)] rounded-[24px] p-16 text-center shadow-sm border border-[color:var(--border)]">
              <div className="w-20 h-20 bg-[color:var(--muted)] rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10 text-[color:var(--muted-foreground)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12A9 9 0 015.636 5.636m12.728 12L5.636 5.636" />
                </svg>
              </div>
              <p className="text-[18px] font-bold text-[color:var(--foreground)] mb-1.5">Você está offline</p>
              <p className="text-[15px] text-[color:var(--muted-foreground)] leading-relaxed">Ative o modo online para receber corridas</p>
            </div>
          ) : rides.length === 0 ? (
            <div className="bg-[color:var(--card)] rounded-[24px] p-16 text-center shadow-sm border border-[color:var(--border)]">
              <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-[18px] font-bold text-[color:var(--foreground)] mb-1.5">Nenhuma corrida disponível</p>
              <p className="text-[15px] text-[color:var(--muted-foreground)] leading-relaxed">Aguardando novas solicitações...</p>
            </div>
          ) : (
            rides.map((ride, index) => {
              const isExpanded = expandedRide === ride.id
              return (
                <div
                  key={ride.id}
                  className="bg-[color:var(--card)] rounded-[24px] p-5 shadow-sm border border-[color:var(--border)] overflow-hidden relative animate-ios-fade-up"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-bl-[100px]" />

                  {/* Info passageiro */}
                  <div className="flex items-center justify-between mb-4 relative">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center shadow-sm">
                        <span className="text-[18px] font-bold text-emerald-700">
                          {ride.passenger?.full_name?.[0] || 'P'}
                        </span>
                      </div>
                      <div>
                        <p className="text-[16px] font-bold text-[color:var(--foreground)]">{ride.passenger?.full_name || 'Passageiro'}</p>
                        <span className="text-[12px] font-semibold text-[color:var(--muted-foreground)] uppercase tracking-wide">
                          {getVehicleLabel(ride.vehicle_type || 'economy')}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] font-semibold text-[color:var(--muted-foreground)] uppercase tracking-wide mb-0.5">Oferta</p>
                      <p className="text-[20px] font-bold text-emerald-600">
                        R$ {ride.passenger_price_offer?.toFixed(2) || '0.00'}
                      </p>
                    </div>
                  </div>

                  {/* Rota */}
                  <div className="space-y-2.5 mb-4">
                    <div className="flex gap-3 items-start">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-[11px] font-semibold text-[color:var(--muted-foreground)] uppercase tracking-wide mb-0.5">Origem</p>
                        <p className="text-[14px] text-[color:var(--foreground)] font-medium leading-snug">{ride.pickup_address}</p>
                      </div>
                    </div>
                    <div className="w-px h-3 bg-[color:var(--border)] ml-[3px]" />
                    <div className="flex gap-3 items-start">
                      <div className="w-2 h-2 bg-orange-500 rounded-full mt-2 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-[11px] font-semibold text-[color:var(--muted-foreground)] uppercase tracking-wide mb-0.5">Destino</p>
                        <p className="text-[14px] text-[color:var(--foreground)] font-medium leading-snug">{ride.dropoff_address}</p>
                      </div>
                    </div>
                  </div>

                  {ride.distance_km && (
                    <p className="text-[13px] text-[color:var(--muted-foreground)] mb-4">
                      {ride.distance_km} km · ~{ride.estimated_duration_minutes || '?'} min
                    </p>
                  )}

                  {/* Botões */}
                  {!isExpanded ? (
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setExpandedRide(ride.id)}
                        className="h-12 rounded-[16px] bg-blue-500 text-white text-[14px] font-bold ios-press shadow-sm flex items-center justify-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                        </svg>
                        Contra-oferta
                      </button>
                      <button
                        type="button"
                        disabled={accepting === ride.id}
                        onClick={() => handleAcceptRide(ride)}
                        className="h-12 rounded-[16px] bg-emerald-500 text-white text-[14px] font-bold ios-press shadow-sm disabled:opacity-70 flex items-center justify-center"
                      >
                        {accepting === ride.id ? (
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : 'Aceitar'}
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3 animate-ios-fade-up">
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[14px] font-bold text-[color:var(--muted-foreground)]">R$</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="Digite sua oferta"
                          value={offerPrice[ride.id] || ''}
                          onChange={(e) => setOfferPrice(prev => ({ ...prev, [ride.id]: e.target.value }))}
                          className="w-full h-12 pl-10 pr-4 bg-[color:var(--background)] border-2 border-[color:var(--border)] rounded-[16px] text-[16px] font-semibold text-[color:var(--foreground)] focus:border-emerald-500 focus:outline-none transition-colors"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => { setExpandedRide(null); setOfferPrice(prev => ({ ...prev, [ride.id]: '' })) }}
                          className="h-11 rounded-[14px] bg-[color:var(--muted)] text-[color:var(--foreground)] text-[14px] font-bold ios-press"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMakeOffer(ride.id)}
                          className="h-11 rounded-[14px] bg-emerald-500 text-white text-[14px] font-bold ios-press shadow-sm"
                        >
                          Enviar Oferta
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      </main>

      <BottomNavigation />
    </div>
  )
}
