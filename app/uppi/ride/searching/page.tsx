'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { RouteMap } from '@/components/route-map'
import { createClient } from '@/lib/supabase/client'
import { PixModal } from '@/components/pix-modal'
import { paymentService } from '@/lib/services/payment-service'

interface RouteData {
  pickup: string
  pickupCoords: { lat: number; lng: number } | null
  destination: string
  destinationCoords: { lat: number; lng: number } | null
}

interface SelectedRide {
  price: number
  distanceKm: number
  durationText: string
  vehicleType: 'moto' | 'economy' | 'electric' | 'premium'
  paymentMethod: string
}

interface DriverProfileInfo {
  vehicle_type: string
  vehicle_brand: string
  vehicle_model: string
  vehicle_color: string
  vehicle_plate: string
  current_location?: { type: string; coordinates: [number, number] }
}

interface OfferWithDriver {
  id: string
  driver_id: string
  offered_price: number
  message: string | null
  status: string
  created_at: string
  driver?: {
    full_name: string
    avatar_url: string | null
    rating: number
    total_rides: number
    driver_profile: DriverProfileInfo[]
  }
  estimatedMinutes?: number
}

function estimateArrival(
  dLat?: number, dLng?: number, pLat?: number, pLng?: number
): number | null {
  if (!dLat || !dLng || !pLat || !pLng) return null
  const R = 6371
  const dx = ((pLat - dLat) * Math.PI) / 180
  const dy = ((pLng - dLng) * Math.PI) / 180
  const a = Math.sin(dx / 2) ** 2 + Math.cos((dLat * Math.PI) / 180) * Math.cos((pLat * Math.PI) / 180) * Math.sin(dy / 2) ** 2
  return Math.max(1, Math.round((R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) / 30) * 60))
}

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <svg key={s} className={`w-3 h-3 ${s <= Math.round(rating) ? 'text-amber-400 fill-amber-400' : 'text-neutral-200 fill-neutral-200'}`} viewBox="0 0 20 20">
          <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
        </svg>
      ))}
    </div>
  )
}

function VIcon({ type, className = 'w-5 h-5' }: { type: string; className?: string }) {
  if (type === 'moto') return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><circle cx="5" cy="17" r="3" /><circle cx="19" cy="17" r="3" /><path d="M5 14l4-7h6l4 7" /><path d="M9 7l1-3h4l1 3" /></svg>
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M8 17h8M8 17a2 2 0 11-4 0 2 2 0 014 0zM16 17a2 2 0 104 0 2 2 0 00-4 0zM4 11l2-5h12l2 5M4 11h16M4 11v6h16v-6" /></svg>
}

function colorDot(color: string) {
  const m: Record<string, string> = { preto: 'bg-neutral-900', preta: 'bg-neutral-900', branco: 'bg-white border border-neutral-300', branca: 'bg-white border border-neutral-300', prata: 'bg-neutral-400', cinza: 'bg-neutral-500', vermelho: 'bg-red-500', vermelha: 'bg-red-500', azul: 'bg-blue-500', verde: 'bg-green-500', amarelo: 'bg-yellow-400', amarela: 'bg-yellow-400' }
  const l = color?.toLowerCase() || ''
  for (const [k, v] of Object.entries(m)) { if (l.includes(k)) return v }
  return 'bg-neutral-400'
}

export default function SearchingDriverPage() {
  const router = useRouter()
  const supabase = createClient()
  const [route, setRoute] = useState<RouteData>({ pickup: '', pickupCoords: null, destination: '', destinationCoords: null })
  const [rideId, setRideId] = useState<string | null>(null)
  const [offers, setOffers] = useState<OfferWithDriver[]>([])
  const [searchTime, setSearchTime] = useState(0)
  const [status, setStatus] = useState<'creating' | 'searching' | 'offers' | 'error'>('creating')
  const [selectedRide, setSelectedRide] = useState<SelectedRide | null>(null)
  const [acceptingId, setAcceptingId] = useState<string | null>(null)
  const [sheetUp, setSheetUp] = useState(false)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const [pixModal, setPixModal] = useState<{
    externalId: string
    qrCodeText: string
    qrCodeImage: string | null
    amountLabel: string
    rideId: string
  } | null>(null)

  useEffect(() => {
    const s = sessionStorage.getItem('rideRoute')
    if (s) setRoute(JSON.parse(s))
    const r = sessionStorage.getItem('selectedRide')
    if (r) setSelectedRide(JSON.parse(r))
  }, [])

  useEffect(() => { if (route.pickupCoords && selectedRide) createRide() }, [route.pickupCoords, selectedRide])
  useEffect(() => { timerRef.current = setInterval(() => setSearchTime(p => p + 1), 1000); return () => { if (timerRef.current) clearInterval(timerRef.current) } }, [])

  const createRide = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || !route.pickupCoords || !route.destinationCoords || !selectedRide) { await fallbackAPI(); return }
      const vt = selectedRide.vehicleType
      const pm: Record<string, string> = { Pix: 'pix', Dinheiro: 'cash', Cartao: 'credit_card', cash: 'cash' }
      const { data, error } = await supabase.from('rides').insert({
        passenger_id: user.id, pickup_address: route.pickup, dropoff_address: route.destination,
        pickup_lat: route.pickupCoords.lat, pickup_lng: route.pickupCoords.lng,
        dropoff_lat: route.destinationCoords.lat, dropoff_lng: route.destinationCoords.lng,
        passenger_price_offer: selectedRide.price, distance_km: selectedRide.distanceKm,
        estimated_duration_minutes: parseInt(selectedRide.durationText) || 15,
        payment_method: pm[selectedRide.paymentMethod] || 'cash', vehicle_type: vt, status: 'pending',
      }).select().single()
      if (error) throw error
      setRideId(data.id); setStatus('searching'); sub(data.id)
    } catch { await fallbackAPI() }
  }

  const fallbackAPI = async () => {
    try {
      if (!route.pickupCoords || !route.destinationCoords || !selectedRide) return
      const res = await fetch('/api/v1/rides', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
        pickup_address: route.pickup, dropoff_address: route.destination,
        pickup_lat: route.pickupCoords.lat, pickup_lng: route.pickupCoords.lng,
        dropoff_lat: route.destinationCoords.lat, dropoff_lng: route.destinationCoords.lng,
        passenger_price_offer: selectedRide.price, distance_km: selectedRide.distanceKm,
        estimated_duration_minutes: parseInt(selectedRide.durationText) || 15,
        payment_method: selectedRide.paymentMethod || 'cash', vehicle_type: selectedRide.vehicleType,
      }) })
      const d = await res.json()
      if (d.ride?.id) { setRideId(d.ride.id); setStatus('searching'); sub(d.ride.id) } else setStatus('searching')
    } catch { setStatus('searching') }
  }

  const sub = (id: string) => {
    supabase.channel(`ride-offers-${id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'price_offers', filter: `ride_id=eq.${id}` }, async (pl) => {
        const o = pl.new
        const { data: drv } = await supabase.from('profiles').select('full_name, avatar_url, rating, total_rides, driver_profile:driver_profiles(vehicle_type, vehicle_brand, vehicle_model, vehicle_color, vehicle_plate, current_location)').eq('id', o.driver_id).single()
        const dp = drv?.driver_profile?.[0] as DriverProfileInfo | undefined
        const loc = dp?.current_location?.coordinates
        const est = estimateArrival(loc?.[1], loc?.[0], route.pickupCoords?.lat, route.pickupCoords?.lng)
        setOffers(prev => [...prev, { ...o as OfferWithDriver, driver: drv || undefined, estimatedMinutes: est ?? Math.floor(Math.random() * 10) + 2 }])
        setStatus('offers'); setSheetUp(true)
        try { new Audio('/notification.mp3').play().catch(() => {}) } catch {}
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rides', filter: `id=eq.${id}` }, (pl) => {
        if (pl.new.status === 'accepted' && pl.new.driver_id) router.push(`/uppi/ride/${id}/tracking`)
      })
      .subscribe()
  }

  const accept = async (offer: OfferWithDriver) => {
    if (!rideId) return
    setAcceptingId(offer.id)
    try {
      // Aceita via API route para garantir notificações, rejeição das outras ofertas e email
      const res = await fetch(`/api/v1/offers/${offer.id}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        alert(err.error || 'Erro ao aceitar oferta')
        return
      }

      const isPix =
        selectedRide?.paymentMethod?.toLowerCase() === 'pix' ||
        selectedRide?.paymentMethod === 'Pix'

      if (isPix) {
        // Gerar PIX antes de navegar para tracking
        const result = await paymentService.createPixPayment({
          amount: Math.round(offer.offered_price * 100),
          description: `Corrida Uppi - ${route.pickup} ate ${route.destination}`,
          payer_name: '',
          payer_cpf: '',
          ride_id: rideId,
        })

        if (result.success && result.qr_code_text) {
          setPixModal({
            externalId: result.payment_id!,
            qrCodeText: result.qr_code_text,
            qrCodeImage: result.qr_code || null,
            amountLabel: `R$ ${offer.offered_price.toFixed(2)}`,
            rideId,
          })
        } else {
          // Fallback: ir para tracking mesmo sem PIX gerado
          router.push(`/uppi/ride/${rideId}/tracking`)
        }
      } else {
        router.push(`/uppi/ride/${rideId}/tracking`)
      }
    } catch { alert('Erro ao aceitar oferta. Tente novamente.') }
    finally { setAcceptingId(null) }
  }

  const reject = async (offer: OfferWithDriver) => {
    await supabase.from('price_offers').update({ status: 'rejected' }).eq('id', offer.id)
    setOffers(prev => prev.filter(o => o.id !== offer.id))
    if (offers.length <= 1) { setStatus('searching'); setSheetUp(false) }
  }

  const cancel = async () => {
    if (rideId) await supabase.from('rides').update({ status: 'cancelled', cancelled_at: new Date().toISOString(), cancellation_reason: 'Cancelado pelo passageiro' }).eq('id', rideId)
    router.push('/uppi/home')
  }

  const fmt = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`
  const isMoto = selectedRide?.vehicleType === 'moto'
  const sorted = [...offers].sort((a, b) => (a.estimatedMinutes ?? 99) - (b.estimatedMinutes ?? 99))

  return (
    <div className="h-dvh overflow-hidden bg-background flex flex-col relative">
      <div className="absolute inset-0" style={{ height: status === 'offers' && sheetUp ? '40dvh' : '55dvh' }}>
        {route.pickupCoords && route.destinationCoords ? (
          <RouteMap origin={route.pickupCoords} destination={route.destinationCoords} originLabel={route.pickup} destinationLabel={route.destination} showInfoWindows className="w-full h-full" />
        ) : <div className="w-full h-full flex items-center justify-center bg-secondary"><div className="w-8 h-8 border-[2.5px] border-blue-500 border-t-transparent rounded-full animate-spin" /></div>}
      </div>

      <div className="absolute top-0 left-0 z-20 pt-safe-offset-4 pl-4">
        <button type="button" onClick={() => router.back()} className="w-10 h-10 bg-card/90 ios-blur rounded-full flex items-center justify-center shadow-md dark:shadow-lg ios-press">
          <svg className="w-5 h-5 text-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
        </button>
      </div>

      <div className={`absolute bottom-0 left-0 right-0 z-20 bg-card/[0.98] ios-blur rounded-t-[28px] shadow-[0_-8px_40px_rgba(0,0,0,0.12)] dark:shadow-[0_-8px_40px_rgba(0,0,0,0.5)] ios-smooth flex flex-col ${status === 'offers' && sheetUp ? 'max-h-[65dvh]' : 'max-h-[45dvh]'}`}>
        <button type="button" className="w-full flex justify-center pt-3 pb-2" onClick={() => setSheetUp(!sheetUp)}>
          <div className="w-9 h-[5px] bg-muted-foreground/30 rounded-full" />
        </button>

        {(status === 'creating' || status === 'searching') && (
          <div className="px-6 pb-safe-offset-4 flex flex-col items-center animate-ios-fade-up">
            <div className="w-16 h-16 bg-blue-500/10 rounded-[22px] flex items-center justify-center mb-4">
              <VIcon type={isMoto ? 'moto' : 'economy'} className="w-8 h-8 text-blue-500" />
            </div>
            <h2 className="text-[22px] font-bold text-foreground tracking-tight mb-1 text-balance text-center">
              {status === 'creating' ? 'Criando viagem...' : `Procurando ${isMoto ? 'motoboys' : 'motoristas'}...`}
            </h2>
            <div className="flex items-center gap-3 mt-1 mb-1">
              <span className="text-[15px] text-muted-foreground">{isMoto ? 'Moto' : 'Carro'}</span>
              <span className="text-muted-foreground/30">|</span>
              <span className="text-[15px] font-bold text-emerald-500">R$ {selectedRide?.price?.toFixed(2) || '0.00'}</span>
            </div>
            <p className="text-[13px] text-muted-foreground mb-5">{fmt(searchTime)}</p>
            <div className="flex items-center gap-1.5 mb-6">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <button type="button" onClick={cancel} className="w-full h-[50px] rounded-[16px] bg-secondary text-red-500 font-semibold text-[17px] ios-press">Cancelar viagem</button>
          </div>
        )}

        {status === 'offers' && sorted.length > 0 && (
          <div className="flex-1 flex flex-col min-h-0 animate-ios-fade-up">
            <div className="px-6 pb-3">
              <h2 className="text-[20px] font-bold text-foreground tracking-tight">{sorted.length === 1 ? '1 motorista encontrado' : `${sorted.length} motoristas encontrados`}</h2>
              <p className="text-[13px] text-muted-foreground">{isMoto ? 'Motoboys' : 'Motoristas'} perto de voce</p>
            </div>
            <div className="flex-1 overflow-y-auto ios-scroll px-5 pb-safe-offset-4">
              <div className="space-y-3 stagger-children">
                {sorted.map((offer) => {
                  const d = offer.driver, dp = d?.driver_profile?.[0], isA = acceptingId === offer.id
                  const diff = (offer.offered_price || 0) - (selectedRide?.price || 0)
                  return (
                    <div key={offer.id} className="ios-card-elevated p-0 overflow-hidden">
                      {offer.estimatedMinutes != null && (
                        <div className={`px-4 py-2 flex items-center justify-between ${offer.estimatedMinutes <= 3 ? 'bg-gradient-to-r from-emerald-500 to-green-500' : 'bg-gradient-to-r from-blue-500 to-blue-600'}`}>
                          <div className="flex items-center gap-2">
                            <svg className="w-3.5 h-3.5 text-white/80" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            <span className="text-[13px] font-bold text-white">{offer.estimatedMinutes <= 1 ? 'Menos de 1 min' : `A ${offer.estimatedMinutes} min de voce`}</span>
                          </div>
                          {offer.estimatedMinutes <= 3 && <span className="text-[11px] font-bold text-white/90 bg-white/20 px-2 py-0.5 rounded-full">Perto</span>}
                          {offer.estimatedMinutes >= 10 && <span className="text-[11px] font-bold text-white/90 bg-white/20 px-2 py-0.5 rounded-full">Longe</span>}
                        </div>
                      )}
                      <div className="p-4">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="relative">
                            <div className="w-14 h-14 rounded-full overflow-hidden bg-secondary border-2 border-card shadow-md">
                              {d?.avatar_url ? <Image src={d.avatar_url || "/placeholder.svg"} alt={d.full_name} width={56} height={56} className="w-full h-full object-cover" /> : (
                                <div className="w-full h-full bg-gradient-to-br from-blue-500/20 to-blue-500/10 flex items-center justify-center"><span className="text-[20px] font-bold text-blue-500">{d?.full_name?.[0] || 'M'}</span></div>
                              )}
                            </div>
                            <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-emerald-500 rounded-full border-2 border-card" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-[17px] font-bold text-foreground truncate">{d?.full_name || 'Motorista'}</h3>
                            <div className="flex items-center gap-2 mt-0.5"><Stars rating={d?.rating || 5} /><span className="text-[13px] font-semibold text-muted-foreground">{(d?.rating || 5).toFixed(1)}</span></div>
                            <p className="text-[12px] text-muted-foreground mt-0.5">{d?.total_rides || 0} corridas realizadas</p>
                          </div>
                          <div className="text-right">
                            <p className="text-[22px] font-bold text-foreground tracking-tight leading-none">R$ {offer.offered_price.toFixed(2)}</p>
                            {diff !== 0 && <p className={`text-[12px] font-semibold mt-1 ${diff > 0 ? 'text-red-500' : 'text-emerald-500'}`}>{diff > 0 ? `+R$ ${diff.toFixed(2)}` : `-R$ ${Math.abs(diff).toFixed(2)}`}</p>}
                          </div>
                        </div>
                        <div className="bg-secondary rounded-2xl p-3 mb-3 flex items-center gap-3">
                          <div className="w-10 h-10 bg-card rounded-xl flex items-center justify-center shadow-sm border border-border"><VIcon type={dp?.vehicle_type || 'economy'} className="w-5 h-5 text-foreground" /></div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[15px] font-bold text-foreground">{dp?.vehicle_brand || 'Veiculo'} {dp?.vehicle_model || ''}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <div className={`w-3 h-3 rounded-full ${colorDot(dp?.vehicle_color || '')}`} />
                              <span className="text-[13px] text-muted-foreground capitalize">{dp?.vehicle_color || 'N/A'}</span>
                              <span className="text-muted-foreground/30">|</span>
                              <span className="text-[13px] text-muted-foreground font-mono tracking-wider uppercase">{dp?.vehicle_plate || 'N/A'}</span>
                            </div>
                          </div>
                        </div>
                        {offer.message && (
                          <div className="bg-blue-500/10 rounded-xl px-3.5 py-2.5 mb-3 flex items-start gap-2">
                            <svg className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                            <p className="text-[13px] text-blue-400 italic leading-relaxed">{`"${offer.message}"`}</p>
                          </div>
                        )}
                        <div className="grid grid-cols-5 gap-2">
                          <button type="button" onClick={() => reject(offer)} className="col-span-2 h-[46px] rounded-[14px] bg-secondary text-muted-foreground text-[15px] font-bold ios-press">Recusar</button>
                          <button type="button" disabled={isA} onClick={() => accept(offer)} className="col-span-3 h-[46px] rounded-[14px] bg-gradient-to-r from-emerald-500 to-green-600 text-white text-[15px] font-bold ios-press shadow-lg shadow-emerald-500/25 disabled:opacity-60 flex items-center justify-center gap-2">
                            {isA ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>Aceitar</>}
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
              <div className="mt-4 mb-2"><button type="button" onClick={cancel} className="w-full h-[48px] rounded-[14px] bg-secondary text-red-500 text-[16px] font-bold ios-press">Cancelar viagem</button></div>
            </div>
          </div>
        )}
      </div>

      {pixModal && (
        <PixModal
          externalId={pixModal.externalId}
          qrCodeText={pixModal.qrCodeText}
          qrCodeImage={pixModal.qrCodeImage}
          amountLabel={pixModal.amountLabel}
          onClose={() => {
            // Fechar modal sem pagar ainda: ir para tracking de qualquer forma
            setPixModal(null)
            router.push(`/uppi/ride/${pixModal.rideId}/tracking`)
          }}
          onPaid={() => {
            setPixModal(null)
            router.push(`/uppi/ride/${pixModal.rideId}/tracking`)
          }}
        />
      )}
    </div>
  )
}
