'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { iosToast } from '@/lib/utils/ios-toast'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import type { Ride, Profile, DriverProfile } from '@/lib/types/database'
import { trackingService, type DriverLocation } from '@/lib/services/tracking-service'
import { GoogleMap, type GoogleMapHandle } from '@/components/google-map'
import { triggerHaptic } from '@/lib/utils/haptics'
import { cn } from '@/lib/utils'

type RideStatus = Ride['status']

const STATUS_LABELS: Record<string, string> = {
  pending: 'Aguardando',
  negotiating: 'Negociando',
  accepted: 'Motorista a caminho',
  driver_arrived: 'Motorista chegou!',
  in_progress: 'Em viagem',
  completed: 'Corrida finalizada',
  cancelled: 'Cancelada',
  failed: 'Falhou',
}

const STATUS_COLOR: Record<string, string> = {
  accepted: 'bg-blue-500',
  driver_arrived: 'bg-amber-500',
  in_progress: 'bg-emerald-500',
  completed: 'bg-emerald-600',
  cancelled: 'bg-red-500',
}

export default function RideTrackingPage() {
  const params = useParams()
  const router = useRouter()
  const rideId = params.id as string
  const supabase = createClient()

  const [ride, setRide] = useState<Ride | null>(null)
  const [driver, setDriver] = useState<Profile | null>(null)
  const [driverProfile, setDriverProfile] = useState<DriverProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [role, setRole] = useState<'passenger' | 'driver' | null>(null)
  const [driverLocation, setDriverLocation] = useState<DriverLocation | null>(null)
  const [eta, setEta] = useState<number | null>(null)
  const [showSafetyMenu, setShowSafetyMenu] = useState(false)
  const [sharingLocation, setSharingLocation] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const mapRef = useRef<GoogleMapHandle>(null)
  const driverMarkerRef = useRef<google.maps.Marker | null>(null)
  const unsubRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    loadData()
    return () => { unsubRef.current?.() }
  }, [rideId])

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/onboarding/splash'); return }

      const { data: rideData } = await supabase
        .from('rides')
        .select('*')
        .eq('id', rideId)
        .single()

      if (!rideData) { router.back(); return }
      setRide(rideData)

      // Detectar role
      const userRole = rideData.driver_id === user.id ? 'driver' : 'passenger'
      setRole(userRole)

      if (rideData.driver_id) {
        const [{ data: driverData }, { data: vehicleData }] = await Promise.all([
          supabase.from('profiles').select('*').eq('id', rideData.driver_id).single(),
          supabase.from('driver_profiles').select('*').eq('id', rideData.driver_id).single(),
        ])
        setDriver(driverData)
        setDriverProfile(vehicleData)

        // Buscar última localização conhecida do motorista
        const { data: locData } = await supabase
          .from('driver_locations')
          .select('latitude, longitude, heading, speed')
          .eq('driver_id', rideData.driver_id)
          .single()

        if (locData) {
          setDriverLocation({
            driver_id: rideData.driver_id,
            latitude: locData.latitude,
            longitude: locData.longitude,
            heading: locData.heading ?? 0,
            speed: locData.speed ?? 0,
            accuracy: 0,
            timestamp: new Date().toISOString(),
          })
        }
      }

      // Se motorista, iniciar GPS tracking
      if (userRole === 'driver') {
        trackingService.startDriverTracking(rideId, user.id)
      }

      // Subscrever atualizações realtime
      unsubRef.current = trackingService.subscribeToRideUpdates(rideId, (update) => {
        if (update.status) {
          setRide(prev => prev ? { ...prev, status: update.status as RideStatus } : null)

          if (update.status === 'driver_arrived') {
            iosToast.success('Motorista chegou!')
            triggerHaptic('heavy')
          } else if (update.status === 'in_progress') {
            iosToast.info('Corrida iniciada!')
            triggerHaptic('medium')
          } else if (update.status === 'completed') {
            trackingService.stopTracking()
            iosToast.success('Corrida finalizada!')
            triggerHaptic('heavy')
            setTimeout(() => router.push(`/uppi/ride/${rideId}/review`), 1500)
          } else if (update.status === 'cancelled') {
            trackingService.stopTracking()
            iosToast.error('Corrida cancelada')
            setTimeout(() => router.push('/uppi/home'), 2000)
          }
        }

        if (update.driver_location) {
          const loc = update.driver_location
          setDriverLocation(loc)
          updateDriverMarker(loc)
        }
      })
    } finally {
      setLoading(false)
    }
  }

  const updateDriverMarker = useCallback((location: DriverLocation) => {
    const map = mapRef.current?.getMapInstance()
    if (!map || !window.google) return

    const position = { lat: location.latitude, lng: location.longitude }

    if (!driverMarkerRef.current) {
      driverMarkerRef.current = new window.google.maps.Marker({
        position,
        map,
        icon: {
          path: window.google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
          scale: 6,
          fillColor: '#10b981',
          fillOpacity: 1,
          strokeColor: '#FFFFFF',
          strokeWeight: 2,
          rotation: location.heading,
        },
        title: 'Motorista',
      })
    } else {
      driverMarkerRef.current.setPosition(position)
      const icon = driverMarkerRef.current.getIcon() as google.maps.Symbol
      if (icon) {
        icon.rotation = location.heading
        driverMarkerRef.current.setIcon(icon)
      }
    }
    map.panTo(position)
  }, [])

  // Ações do motorista
  const handleDriverAction = async (newStatus: RideStatus) => {
    setUpdatingStatus(true)
    try {
      const result = await trackingService.updateRideStatus(rideId, newStatus)
      if (!result.success) iosToast.error(result.error || 'Erro ao atualizar')
    } finally {
      setUpdatingStatus(false)
    }
  }

  // Ações do passageiro — cancelar corrida
  const handlePassengerCancel = async () => {
    if (!confirm('Deseja cancelar esta corrida?')) return
    setUpdatingStatus(true)
    try {
      const result = await trackingService.updateRideStatus(rideId, 'cancelled', 'Cancelado pelo passageiro')
      if (!result.success) iosToast.error(result.error || 'Erro ao cancelar')
    } finally {
      setUpdatingStatus(false)
    }
  }

  const handleShareLocation = async () => {
    setSharingLocation(true)
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true })
      )
      const link = `https://maps.google.com/?q=${position.coords.latitude},${position.coords.longitude}`
      if (navigator.share) {
        await navigator.share({
          title: 'Minha localização — Uppi',
          text: `Estou numa corrida: ${ride?.pickup_address} → ${ride?.dropoff_address}`,
          url: link,
        })
      } else {
        await navigator.clipboard.writeText(link)
        iosToast.success('Link copiado!')
      }
    } catch { /* user cancelled */ }
    finally { setSharingLocation(false) }
  }

  const paymentLabel = (method?: string) => {
    const m: Record<string, string> = { cash: 'Dinheiro', pix: 'PIX', credit_card: 'Cartão Crédito', debit_card: 'Cartão Débito', wallet: 'Carteira' }
    return m[method || ''] || method || '—'
  }

  if (loading) {
    return (
      <div className="h-dvh bg-[color:var(--background)] flex items-center justify-center">
        <div className="w-8 h-8 border-[2.5px] border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const status = ride?.status || 'pending'
  const statusLabel = STATUS_LABELS[status] || status
  const statusColor = STATUS_COLOR[status] || 'bg-neutral-400'
  const isActive = ['accepted', 'driver_arrived', 'in_progress'].includes(status)
  const mapCenter = driverLocation
    ? { lat: driverLocation.latitude, lng: driverLocation.longitude }
    : ride?.pickup_lat && ride?.pickup_lng
    ? { lat: ride.pickup_lat, lng: ride.pickup_lng }
    : undefined

  return (
    <div className="h-dvh overflow-hidden bg-[color:var(--background)] flex flex-col relative">
      {/* Mapa fullscreen */}
      <div className="absolute inset-0">
        <GoogleMap ref={mapRef} center={mapCenter} zoom={15} />
      </div>

      {/* Header flutuante */}
      <div className="absolute top-0 left-0 right-0 z-20 pt-safe-offset-4 px-4">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => router.back()}
            className="w-10 h-10 bg-[color:var(--card)]/90 ios-blur rounded-full flex items-center justify-center shadow-md ios-press"
          >
            <svg className="w-5 h-5 text-[color:var(--foreground)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <div className={cn('px-4 py-2 rounded-full flex items-center gap-2 shadow-md', statusColor)}>
            {isActive && <div className="w-2 h-2 bg-white rounded-full animate-pulse" />}
            <span className="text-[13px] font-bold text-white">{statusLabel}</span>
            {eta !== null && <span className="text-[13px] text-white/80">· {eta} min</span>}
          </div>

          <div className="w-10" />
        </div>
      </div>

      {/* Bottom Sheet */}
      <div className="absolute bottom-0 left-0 right-0 z-20 bg-[color:var(--card)]/[0.98] ios-blur rounded-t-[28px] shadow-[0_-8px_40px_rgba(0,0,0,0.12)] max-h-[60dvh] flex flex-col">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-9 h-[5px] bg-[color:var(--muted-foreground)]/30 rounded-full" />
        </div>

        <div className="overflow-y-auto ios-scroll px-5 pb-safe-offset-4">
          {/* Info do motorista */}
          {driver && (
            <div className="flex items-center gap-4 py-4 border-b border-[color:var(--border)]">
              <div className="relative">
                <Avatar className="w-16 h-16 border-2 border-[color:var(--border)]">
                  <AvatarImage src={driver.avatar_url || undefined} />
                  <AvatarFallback className="bg-emerald-100 text-emerald-700 text-xl font-bold">
                    {driver.full_name?.[0] || 'M'}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-emerald-500 rounded-full border-2 border-[color:var(--card)]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[17px] font-bold text-[color:var(--foreground)] truncate">{driver.full_name}</p>
                {driverProfile && (
                  <p className="text-[13px] text-[color:var(--muted-foreground)] truncate">
                    {driverProfile.vehicle_brand} {driverProfile.vehicle_model} · {driverProfile.vehicle_plate?.toUpperCase()}
                  </p>
                )}
                <div className="flex items-center gap-1 mt-0.5">
                  <svg className="w-3.5 h-3.5 text-amber-400 fill-current" viewBox="0 0 20 20">
                    <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                  </svg>
                  <span className="text-[13px] font-semibold text-[color:var(--muted-foreground)]">
                    {(driverProfile?.rating || 5).toFixed(1)}
                  </span>
                  <span className="text-[color:var(--muted-foreground)]/40">·</span>
                  <span className="text-[13px] text-[color:var(--muted-foreground)]">{driverProfile?.total_rides || 0} corridas</span>
                </div>
              </div>
              {/* Botão ligar */}
              <a
                href={`tel:${driver.phone}`}
                className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center shadow-md ios-press shrink-0"
                aria-label="Ligar para motorista"
              >
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                </svg>
              </a>
            </div>
          )}

          {/* Detalhes da rota */}
          <div className="py-4 border-b border-[color:var(--border)]">
            <div className="flex gap-3">
              <div className="flex flex-col items-center pt-1 gap-1">
                <div className="w-2.5 h-2.5 bg-blue-500 rounded-full shrink-0" />
                <div className="w-px flex-1 bg-[color:var(--border)] min-h-[24px]" />
                <div className="w-2.5 h-2.5 bg-orange-500 rounded-full shrink-0" />
              </div>
              <div className="flex-1 space-y-3">
                <div>
                  <p className="text-[11px] font-semibold text-[color:var(--muted-foreground)] uppercase tracking-wide">Origem</p>
                  <p className="text-[14px] text-[color:var(--foreground)] font-medium">{ride?.pickup_address}</p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-[color:var(--muted-foreground)] uppercase tracking-wide">Destino</p>
                  <p className="text-[14px] text-[color:var(--foreground)] font-medium">{ride?.dropoff_address}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Resumo financeiro */}
          <div className="py-3 flex items-center justify-between border-b border-[color:var(--border)]">
            <div className="text-center">
              <p className="text-[11px] text-[color:var(--muted-foreground)] uppercase tracking-wide">Distância</p>
              <p className="text-[16px] font-bold text-[color:var(--foreground)]">{ride?.distance_km || '—'} km</p>
            </div>
            <div className="text-center">
              <p className="text-[11px] text-[color:var(--muted-foreground)] uppercase tracking-wide">Valor</p>
              <p className="text-[16px] font-bold text-emerald-600">R$ {ride?.final_price?.toFixed(2) || '—'}</p>
            </div>
            <div className="text-center">
              <p className="text-[11px] text-[color:var(--muted-foreground)] uppercase tracking-wide">Pagamento</p>
              <p className="text-[14px] font-bold text-[color:var(--foreground)]">{paymentLabel(ride?.payment_method)}</p>
            </div>
          </div>

          {/* Botões de ação do MOTORISTA */}
          {role === 'driver' && (
            <div className="pt-4 space-y-2">
              {status === 'accepted' && (
                <button
                  type="button"
                  disabled={updatingStatus}
                  onClick={() => handleDriverAction('driver_arrived')}
                  className="w-full h-[52px] rounded-[18px] bg-amber-500 text-white text-[17px] font-bold ios-press shadow-md disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {updatingStatus ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Cheguei ao passageiro'}
                </button>
              )}
              {status === 'driver_arrived' && (
                <button
                  type="button"
                  disabled={updatingStatus}
                  onClick={() => handleDriverAction('in_progress')}
                  className="w-full h-[52px] rounded-[18px] bg-emerald-500 text-white text-[17px] font-bold ios-press shadow-md disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {updatingStatus ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Iniciar corrida'}
                </button>
              )}
              {status === 'in_progress' && (
                <button
                  type="button"
                  disabled={updatingStatus}
                  onClick={() => handleDriverAction('completed')}
                  className="w-full h-[52px] rounded-[18px] bg-blue-500 text-white text-[17px] font-bold ios-press shadow-md disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {updatingStatus ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Finalizar corrida'}
                </button>
              )}
              {['accepted', 'driver_arrived'].includes(status) && (
                <button
                  type="button"
                  disabled={updatingStatus}
                  onClick={() => handleDriverAction('cancelled')}
                  className="w-full h-[44px] rounded-[16px] bg-[color:var(--muted)] text-red-500 text-[15px] font-semibold ios-press"
                >
                  Cancelar corrida
                </button>
              )}
            </div>
          )}

          {/* Botões de ação do PASSAGEIRO */}
          {role === 'passenger' && ['accepted'].includes(status) && (
            <div className="pt-4">
              <button
                type="button"
                disabled={updatingStatus}
                onClick={handlePassengerCancel}
                className="w-full h-[44px] rounded-[16px] bg-[color:var(--muted)] text-red-500 text-[15px] font-semibold ios-press"
              >
                {updatingStatus ? 'Cancelando...' : 'Cancelar corrida'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* FAB segurança (ativo apenas durante a corrida) */}
      {isActive && (
        <>
          {showSafetyMenu && (
            <div className="fixed inset-0 z-40">
              <button
                type="button"
                onClick={() => setShowSafetyMenu(false)}
                className="absolute inset-0 bg-black/40"
                aria-label="Fechar menu"
              />
              <div className="absolute bottom-24 right-5 flex flex-col gap-2.5 z-50 animate-ios-fade-up">
                <button
                  type="button"
                  onClick={() => { setShowSafetyMenu(false); handleShareLocation() }}
                  disabled={sharingLocation}
                  className="flex items-center gap-3 bg-[color:var(--card)] rounded-2xl px-4 py-3 shadow-xl ios-press"
                >
                  <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                    <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div className="text-left">
                    <p className="text-[15px] font-bold text-[color:var(--foreground)]">Compartilhar local</p>
                    <p className="text-[12px] text-[color:var(--muted-foreground)]">Envie para amigos/família</p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => { setShowSafetyMenu(false); router.push('/uppi/emergency') }}
                  className="flex items-center gap-3 bg-red-500 rounded-2xl px-4 py-3 shadow-xl ios-press"
                >
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div className="text-left">
                    <p className="text-[15px] font-bold text-white">SOS Emergência</p>
                    <p className="text-[12px] text-white/75">Alertar contatos e polícia</p>
                  </div>
                </button>
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={() => setShowSafetyMenu(!showSafetyMenu)}
            className={cn(
              'fixed bottom-6 right-5 z-50 w-14 h-14 rounded-full flex items-center justify-center shadow-lg ios-press transition-all duration-200',
              showSafetyMenu ? 'bg-[color:var(--foreground)] rotate-45' : 'bg-red-500'
            )}
            aria-label="Menu de segurança"
          >
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              {showSafetyMenu
                ? <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                : <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              }
            </svg>
          </button>
        </>
      )}
    </div>
  )
}
