import { writeFileSync } from 'fs'
import { join } from 'path'

const content = `'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { iosToast } from '@/lib/utils/ios-toast'
import { triggerHaptic } from '@/lib/utils/haptics'
import { trackingService, type DriverLocation } from '@/lib/services/tracking-service'
import { GoogleMap, type GoogleMapHandle } from '@/components/google-map'
import { cn } from '@/lib/utils'

interface RideData {
  id: string
  status: string
  passenger_id: string
  driver_id: string | null
  pickup_address: string
  dropoff_address: string
  pickup_lat: number | null
  pickup_lng: number | null
  dropoff_lat: number | null
  dropoff_lng: number | null
  final_price: number | null
  distance_km: number | null
  payment_method: string | null
}

interface DriverInfo {
  id: string
  full_name: string
  avatar_url: string | null
  rating: number | null
  total_rides: number | null
  vehicle_brand: string
  vehicle_model: string
  vehicle_color: string
  vehicle_plate: string
  vehicle_type: string
}

interface PassengerInfo {
  id: string
  full_name: string
  avatar_url: string | null
  phone: string | null
}

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  accepted: { label: 'Motorista a caminho', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-700' },
  driver_arrived: { label: 'Motorista chegou', color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700' },
  in_progress: { label: 'Em viagem', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-700' },
  completed: { label: 'Corrida finalizada', color: 'text-[color:var(--foreground)]', bg: 'bg-[color:var(--secondary)] border-[color:var(--border)]' },
  cancelled: { label: 'Corrida cancelada', color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700' },
}

const PAYMENT_LABELS: Record<string, string> = {
  cash: 'Dinheiro',
  pix: 'PIX',
  credit_card: 'Credito',
  debit_card: 'Debito',
}

export default function RideTrackingPage() {
  const params = useParams()
  const router = useRouter()
  const rideId = params.id as string
  const supabase = createClient()
  const mapRef = useRef<GoogleMapHandle>(null)
  const driverMarkerRef = useRef<any>(null)

  const [ride, setRide] = useState<RideData | null>(null)
  const [driverInfo, setDriverInfo] = useState<DriverInfo | null>(null)
  const [passengerInfo, setPassengerInfo] = useState<PassengerInfo | null>(null)
  const [isDriver, setIsDriver] = useState(false)
  const [loading, setLoading] = useState(true)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [driverLocation, setDriverLocation] = useState<DriverLocation | null>(null)
  const [eta, setEta] = useState<number | null>(null)
  const [showSafetyMenu, setShowSafetyMenu] = useState(false)
  const [sharingLocation, setSharingLocation] = useState(false)

  const updateDriverMarker = useCallback((location: DriverLocation) => {
    const map = mapRef.current?.getMapInstance()
    if (!map || typeof window === 'undefined' || !window.google) return
    const position = { lat: location.latitude, lng: location.longitude }
    if (!driverMarkerRef.current) {
      driverMarkerRef.current = new window.google.maps.Marker({
        position, map,
        icon: {
          path: window.google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
          scale: 6, fillColor: '#2563EB', fillOpacity: 1,
          strokeColor: '#FFFFFF', strokeWeight: 2, rotation: location.heading ?? 0,
        },
        title: 'Motorista',
      })
    } else {
      driverMarkerRef.current.setPosition(position)
      const icon = driverMarkerRef.current.getIcon()
      if (icon && typeof icon === 'object') { icon.rotation = location.heading ?? 0; driverMarkerRef.current.setIcon(icon) }
    }
    map.panTo(position)
  }, [])

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/onboarding/splash'); return }

      const { data: rideData } = await supabase.from('rides').select('*').eq('id', rideId).single()
      if (!rideData) { router.push('/uppi/home'); return }
      setRide(rideData as RideData)

      const userIsDriver = rideData.driver_id === user.id
      setIsDriver(userIsDriver)

      if (rideData.driver_id) {
        const [{ data: dp }, { data: prof }] = await Promise.all([
          supabase.from('driver_profiles').select('vehicle_brand,vehicle_model,vehicle_color,vehicle_plate,vehicle_type,rating,total_rides').eq('id', rideData.driver_id).single(),
          supabase.from('profiles').select('id,full_name,avatar_url').eq('id', rideData.driver_id).single(),
        ])
        if (prof) {
          setDriverInfo({
            id: prof.id, full_name: prof.full_name || 'Motorista', avatar_url: prof.avatar_url,
            rating: (dp as any)?.rating ?? null, total_rides: (dp as any)?.total_rides ?? null,
            vehicle_brand: (dp as any)?.vehicle_brand || '', vehicle_model: (dp as any)?.vehicle_model || '',
            vehicle_color: (dp as any)?.vehicle_color || '', vehicle_plate: (dp as any)?.vehicle_plate || '',
            vehicle_type: (dp as any)?.vehicle_type || 'economy',
          })
        }
        const { data: loc } = await supabase.from('driver_locations').select('latitude,longitude,heading,speed,accuracy,last_updated').eq('driver_id', rideData.driver_id).single()
        if (loc) {
          const dl: DriverLocation = { driver_id: rideData.driver_id, latitude: loc.latitude, longitude: loc.longitude, heading: loc.heading ?? 0, speed: loc.speed ?? 0, accuracy: loc.accuracy ?? 0, timestamp: loc.last_updated }
          setDriverLocation(dl)
          updateDriverMarker(dl)
        }
      }

      const { data: pData } = await supabase.from('profiles').select('id,full_name,avatar_url,phone').eq('id', rideData.passenger_id).single()
      if (pData) setPassengerInfo(pData as PassengerInfo)

      setLoading(false)
      if (userIsDriver) trackingService.startDriverTracking(rideId, user.id)
    }

    init()

    const unsubscribe = trackingService.subscribeToRideUpdates(rideId, (update) => {
      if (update.status) {
        setRide(prev => prev ? { ...prev, status: update.status } : null)
        if (update.status === 'driver_arrived') { iosToast.success('Motorista chegou!'); triggerHaptic('heavy') }
        else if (update.status === 'in_progress') { iosToast.info('Corrida iniciada'); triggerHaptic('medium') }
        else if (update.status === 'completed') { iosToast.success('Corrida finalizada!'); triggerHaptic('heavy'); setTimeout(() => router.push(\`/uppi/ride/\${rideId}/review\`), 1500) }
        else if (update.status === 'cancelled') { iosToast.error('Corrida cancelada'); setTimeout(() => router.push('/uppi/home'), 2000) }
      }
      if (update.driver_location) { setDriverLocation(update.driver_location); updateDriverMarker(update.driver_location) }
      if (update.eta_minutes !== undefined) setEta(update.eta_minutes)
    })

    return () => { unsubscribe(); trackingService.stopTracking() }
  }, [rideId])

  const handleUpdateStatus = async (newStatus: string) => {
    if (updatingStatus) return
    setUpdatingStatus(true)
    try {
      const result = await trackingService.updateRideStatus(rideId, newStatus as any)
      if (result.success) {
        setRide(prev => prev ? { ...prev, status: newStatus } : null)
        if (newStatus === 'driver_arrived') iosToast.success('Passageiro notificado')
        if (newStatus === 'in_progress') iosToast.success('Corrida iniciada!')
        if (newStatus === 'completed') { iosToast.success('Corrida finalizada!'); trackingService.stopTracking(); setTimeout(() => router.push(\`/uppi/ride/\${rideId}/review\`), 1500) }
      } else { iosToast.error(result.error || 'Erro ao atualizar status') }
    } finally { setUpdatingStatus(false) }
  }

  const handleCancel = async () => {
    if (!confirm('Cancelar esta corrida?')) return
    setUpdatingStatus(true)
    try { await trackingService.updateRideStatus(rideId, 'cancelled', 'Cancelado pelo usuario'); router.push('/uppi/home') }
    finally { setUpdatingStatus(false) }
  }

  const handleShareLocation = async () => {
    setSharingLocation(true)
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true }))
      const link = \`https://maps.google.com/?q=\${pos.coords.latitude},\${pos.coords.longitude}\`
      if (navigator.share) { await navigator.share({ title: 'Minha localizacao — Uppi', text: \`Corrida: \${ride?.pickup_address} → \${ride?.dropoff_address}\`, url: link }) }
      else { await navigator.clipboard.writeText(link); iosToast.success('Link copiado') }
    } catch (_) {} finally { setSharingLocation(false) }
  }

  if (loading) {
    return (
      <div className="h-dvh bg-[color:var(--background)] flex items-center justify-center">
        <div className="w-8 h-8 border-[2.5px] border-[color:var(--primary)] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const statusInfo = ride ? (STATUS_MAP[ride.status] || { label: 'Aguardando', color: 'text-[color:var(--foreground)]', bg: 'bg-[color:var(--secondary)] border-[color:var(--border)]' }) : null
  const mapCenter = driverLocation
    ? { lat: driverLocation.latitude, lng: driverLocation.longitude }
    : ride?.pickup_lat && ride?.pickup_lng
    ? { lat: ride.pickup_lat, lng: ride.pickup_lng }
    : undefined

  return (
    <div className="h-dvh overflow-hidden bg-[color:var(--background)] flex flex-col">
      <div className="absolute inset-0 z-0">
        <GoogleMap ref={mapRef} center={mapCenter} zoom={15} />
      </div>

      {/* Header flutuante */}
      <header className="relative z-20 px-4 pt-safe-offset-4 pb-2 flex items-center gap-3">
        <button type="button" onClick={() => router.back()} className="w-10 h-10 bg-[color:var(--card)]/90 ios-blur rounded-full flex items-center justify-center shadow-md ios-press">
          <svg className="w-5 h-5 text-[color:var(--foreground)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
        </button>
        {statusInfo && (
          <div className={cn('flex-1 flex items-center gap-2 px-4 py-2.5 rounded-2xl border ios-blur', statusInfo.bg)}>
            <div className={cn('w-2.5 h-2.5 rounded-full shrink-0',
              ride?.status === 'in_progress' ? 'bg-emerald-500 animate-pulse' :
              ride?.status === 'accepted' ? 'bg-amber-500 animate-pulse' :
              ride?.status === 'driver_arrived' ? 'bg-blue-500 animate-pulse' : 'bg-neutral-400'
            )} />
            <span className={cn('text-[14px] font-bold', statusInfo.color)}>{statusInfo.label}</span>
            {eta !== null && <span className="ml-auto text-[13px] font-bold text-[color:var(--foreground)]">{eta} min</span>}
          </div>
        )}
      </header>

      {/* Bottom Sheet */}
      <div className="absolute bottom-0 left-0 right-0 z-20 bg-[color:var(--card)]/[0.98] ios-blur rounded-t-[28px] shadow-[0_-8px_40px_rgba(0,0,0,0.15)] pb-safe-offset-4">
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-9 h-[5px] bg-[color:var(--muted-foreground)]/25 rounded-full" />
        </div>
        <div className="px-5 pb-3 max-h-[55dvh] overflow-y-auto ios-scroll">

          {/* Motorista (para passageiro) */}
          {!isDriver && driverInfo && (
            <div className="mb-4">
              <div className="flex items-center gap-4 mb-3">
                <div className="w-14 h-14 rounded-full bg-[color:var(--muted)] flex items-center justify-center shadow-md overflow-hidden shrink-0">
                  {driverInfo.avatar_url
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={driverInfo.avatar_url} alt={driverInfo.full_name} className="w-full h-full object-cover" />
                    : <span className="text-[22px] font-bold text-[color:var(--foreground)]">{driverInfo.full_name[0]}</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[18px] font-bold text-[color:var(--foreground)] truncate">{driverInfo.full_name}</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <svg className="w-4 h-4 text-amber-400 fill-amber-400" viewBox="0 0 20 20"><path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" /></svg>
                    <span className="text-[14px] font-semibold text-[color:var(--foreground)]">{driverInfo.rating?.toFixed(1) ?? '5.0'}</span>
                    <span className="text-[13px] text-[color:var(--muted-foreground)]">• {driverInfo.total_rides ?? 0} corridas</span>
                  </div>
                </div>
                <a href={\`tel:\`} className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center shadow-md ios-press shrink-0" aria-label="Ligar">
                  <svg className="w-5 h-5 text-white fill-current" viewBox="0 0 20 20"><path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" /></svg>
                </a>
              </div>
              <div className="bg-[color:var(--secondary)] rounded-2xl px-4 py-3 flex items-center gap-3">
                <svg className="w-6 h-6 text-[color:var(--muted-foreground)] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M8 17h8M8 17a2 2 0 11-4 0 2 2 0 014 0zM16 17a2 2 0 104 0 2 2 0 00-4 0zM4 11l2-5h12l2 5M4 11h16M4 11v6h16v-6" /></svg>
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-bold text-[color:var(--foreground)]">{driverInfo.vehicle_brand} {driverInfo.vehicle_model}</p>
                  <p className="text-[13px] text-[color:var(--muted-foreground)] capitalize">{driverInfo.vehicle_color}</p>
                </div>
                <span className="text-[14px] font-bold font-mono tracking-wider text-[color:var(--foreground)] bg-[color:var(--card)] px-3 py-1.5 rounded-xl border border-[color:var(--border)] uppercase">{driverInfo.vehicle_plate}</span>
              </div>
            </div>
          )}

          {/* Passageiro (para motorista) */}
          {isDriver && passengerInfo && (
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 rounded-full bg-[color:var(--muted)] flex items-center justify-center shadow-md overflow-hidden shrink-0">
                {passengerInfo.avatar_url
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={passengerInfo.avatar_url} alt={passengerInfo.full_name} className="w-full h-full object-cover" />
                  : <span className="text-[22px] font-bold text-[color:var(--foreground)]">{passengerInfo.full_name[0]}</span>}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] text-[color:var(--muted-foreground)] font-medium">Passageiro</p>
                <p className="text-[18px] font-bold text-[color:var(--foreground)] truncate">{passengerInfo.full_name}</p>
              </div>
              {passengerInfo.phone && (
                <a href={\`tel:\${passengerInfo.phone}\`} className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center shadow-md ios-press shrink-0" aria-label="Ligar">
                  <svg className="w-5 h-5 text-white fill-current" viewBox="0 0 20 20"><path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" /></svg>
                </a>
              )}
            </div>
          )}

          {/* Rota */}
          <div className="bg-[color:var(--secondary)] rounded-2xl px-4 py-3.5 mb-4">
            <div className="flex gap-3.5 items-start">
              <div className="flex flex-col items-center pt-0.5 shrink-0">
                <div className="w-3 h-3 rounded-full bg-blue-500 border-2 border-[color:var(--card)]" />
                <div className="w-0.5 h-7 bg-[color:var(--border)] my-1" />
                <div className="w-3 h-3 rounded-full bg-red-500 border-2 border-[color:var(--card)]" />
              </div>
              <div className="flex-1 min-w-0 space-y-5">
                <div>
                  <p className="text-[11px] font-semibold text-[color:var(--muted-foreground)] uppercase tracking-wide">Origem</p>
                  <p className="text-[14px] font-semibold text-[color:var(--foreground)] leading-tight">{ride?.pickup_address}</p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-[color:var(--muted-foreground)] uppercase tracking-wide">Destino</p>
                  <p className="text-[14px] font-semibold text-[color:var(--foreground)] leading-tight">{ride?.dropoff_address}</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 mt-3.5 pt-3 border-t border-[color:var(--border)]">
              {ride?.distance_km && <div className="flex-1"><p className="text-[11px] text-[color:var(--muted-foreground)]">Distancia</p><p className="text-[15px] font-bold text-[color:var(--foreground)]">{Number(ride.distance_km).toFixed(1)} km</p></div>}
              {ride?.final_price && <div className="flex-1"><p className="text-[11px] text-[color:var(--muted-foreground)]">Valor</p><p className="text-[15px] font-bold text-emerald-600">R$ {Number(ride.final_price).toFixed(2)}</p></div>}
              {ride?.payment_method && <div className="flex-1"><p className="text-[11px] text-[color:var(--muted-foreground)]">Pagamento</p><p className="text-[15px] font-bold text-[color:var(--foreground)]">{PAYMENT_LABELS[ride.payment_method] ?? ride.payment_method}</p></div>}
            </div>
          </div>

          {/* Botoes do MOTORISTA */}
          {isDriver && (
            <div className="space-y-2.5">
              {ride?.status === 'accepted' && (
                <button type="button" onClick={() => handleUpdateStatus('driver_arrived')} disabled={updatingStatus}
                  className="w-full h-[52px] bg-blue-500 text-white font-bold text-[16px] rounded-2xl ios-press shadow-lg shadow-blue-500/20 disabled:opacity-60 flex items-center justify-center gap-2">
                  {updatingStatus ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>Cheguei no passageiro</>}
                </button>
              )}
              {ride?.status === 'driver_arrived' && (
                <button type="button" onClick={() => handleUpdateStatus('in_progress')} disabled={updatingStatus}
                  className="w-full h-[52px] bg-emerald-500 text-white font-bold text-[16px] rounded-2xl ios-press shadow-lg shadow-emerald-500/20 disabled:opacity-60 flex items-center justify-center gap-2">
                  {updatingStatus ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>Iniciar corrida</>}
                </button>
              )}
              {ride?.status === 'in_progress' && (
                <button type="button" onClick={() => handleUpdateStatus('completed')} disabled={updatingStatus}
                  className="w-full h-[52px] bg-[color:var(--primary)] text-[color:var(--primary-foreground)] font-bold text-[16px] rounded-2xl ios-press shadow-lg disabled:opacity-60 flex items-center justify-center gap-2">
                  {updatingStatus ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>Finalizar corrida</>}
                </button>
              )}
              {['accepted', 'driver_arrived'].includes(ride?.status ?? '') && (
                <button type="button" onClick={handleCancel} disabled={updatingStatus} className="w-full h-[44px] bg-[color:var(--secondary)] text-red-500 font-semibold text-[15px] rounded-2xl ios-press disabled:opacity-60">
                  Cancelar corrida
                </button>
              )}
            </div>
          )}

          {/* Botoes do PASSAGEIRO */}
          {!isDriver && ['accepted', 'driver_arrived'].includes(ride?.status ?? '') && (
            <button type="button" onClick={handleCancel} disabled={updatingStatus} className="w-full h-[44px] bg-[color:var(--secondary)] text-red-500 font-semibold text-[15px] rounded-2xl ios-press disabled:opacity-60">
              Cancelar corrida
            </button>
          )}
        </div>
      </div>

      {/* FAB de seguranca */}
      {['accepted', 'driver_arrived', 'in_progress'].includes(ride?.status ?? '') && (
        <>
          {showSafetyMenu && (
            <div className="fixed inset-0 z-40">
              <button type="button" onClick={() => setShowSafetyMenu(false)} className="absolute inset-0 bg-black/40 ios-blur" aria-label="Fechar menu" />
              <div className="absolute bottom-28 right-5 flex flex-col gap-2.5 animate-ios-fade-up z-50">
                <button type="button" onClick={() => { setShowSafetyMenu(false); handleShareLocation() }} disabled={sharingLocation}
                  className="flex items-center gap-3 bg-[color:var(--card)] rounded-2xl px-4 py-3 shadow-xl ios-press">
                  <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/30 rounded-xl flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  </div>
                  <div className="text-left"><p className="text-[15px] font-bold text-[color:var(--foreground)]">Compartilhar local</p><p className="text-[12px] text-[color:var(--muted-foreground)]">Enviar para amigos/familia</p></div>
                </button>
                <button type="button" onClick={() => { setShowSafetyMenu(false); router.push('/uppi/emergency') }}
                  className="flex items-center gap-3 bg-red-500 rounded-2xl px-4 py-3 shadow-xl ios-press">
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                  </div>
                  <div className="text-left"><p className="text-[15px] font-bold text-white">SOS Emergencia</p><p className="text-[12px] text-white/75">Alertar contatos e policia</p></div>
                </button>
              </div>
            </div>
          )}
          <button type="button" onClick={() => setShowSafetyMenu(!showSafetyMenu)}
            className={cn('fixed bottom-6 right-5 z-50 w-14 h-14 rounded-full flex items-center justify-center shadow-lg ios-press transition-all duration-200',
              showSafetyMenu ? 'bg-[color:var(--foreground)] text-[color:var(--background)] rotate-45' : 'bg-red-500 text-white'
            )}
            aria-label="Menu de seguranca">
            {showSafetyMenu
              ? <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
              : <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" /></svg>}
          </button>
        </>
      )}
    </div>
  )
}
`

writeFileSync('/vercel/share/v0-project/app/uppi/ride/[id]/tracking/page.tsx', content, 'utf-8')
console.log('Tracking page rewritten successfully')
