'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Image from 'next/image'
import { IOSConfirmDialog } from '@/components/ios-confirm-dialog'
import { iosToast } from '@/lib/utils/ios-toast'
import TrackingSkeleton from '@/components/tracking-skeleton'

interface RideData {
  id: string
  status: string
  pickup_address: string
  dropoff_address: string
  passenger_price_offer: number
  final_price: number | null
  payment_method: string
  vehicle_type: string
  driver_id: string | null
  driver?: {
    id: string
    full_name: string
    avatar_url: string | null
    rating: number
    total_rides: number
  }
}

interface OfferData {
  id: string
  offered_price: number
  message: string | null
  driver_id: string
  driver?: {
    full_name: string
    avatar_url: string | null
    rating: number
    total_rides: number
    driver_profile: {
      vehicle_type: string
      vehicle_brand: string
      vehicle_model: string
      vehicle_color: string
      vehicle_plate: string
    }[]
  }
}

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <svg key={s} className={`w-3.5 h-3.5 ${s <= Math.round(rating) ? 'text-amber-400 fill-amber-400' : 'text-neutral-200 fill-neutral-200'}`} viewBox="0 0 20 20">
          <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
        </svg>
      ))}
    </div>
  )
}

function TrackingContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const supabase = createClient()

  const rideId = searchParams.get('rideId')
  const [ride, setRide] = useState<RideData | null>(null)
  const [offers, setOffers] = useState<OfferData[]>([])
  const [loading, setLoading] = useState(true)
  const [acceptingId, setAcceptingId] = useState<string | null>(null)
  const [showSafetyMenu, setShowSafetyMenu] = useState(false)
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)

  useEffect(() => {
    if (!rideId) return
    loadRideData()

    const channel = supabase
      .channel(`ride-track-${rideId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rides', filter: `id=eq.${rideId}` }, (payload) => {
        setRide(prev => prev ? { ...prev, ...payload.new } : prev)
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'price_offers', filter: `ride_id=eq.${rideId}` }, () => {
        loadOffers()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [rideId])

  const loadRideData = async () => {
    if (!rideId) return
    const { data: rideData } = await supabase
      .from('rides')
      .select('*, driver:profiles!driver_id(id, full_name, avatar_url, rating, total_rides)')
      .eq('id', rideId)
      .single()
    setRide(rideData)
    await loadOffers()
    setLoading(false)
  }

  const loadOffers = async () => {
    if (!rideId) return
    const { data } = await supabase
      .from('price_offers')
      .select('*, driver:profiles!driver_id(full_name, avatar_url, rating, total_rides, driver_profile:driver_profiles(vehicle_type, vehicle_brand, vehicle_model, vehicle_color, vehicle_plate))')
      .eq('ride_id', rideId)
      .eq('status', 'pending')
      .order('offered_price', { ascending: true })
    setOffers(data || [])
  }

  const handleAcceptOffer = async (offer: OfferData) => {
    if (!rideId) return
    setAcceptingId(offer.id)
    try {
      await supabase.from('price_offers').update({ status: 'accepted' }).eq('id', offer.id)
      await supabase.from('rides').update({ driver_id: offer.driver_id, final_price: offer.offered_price, status: 'accepted' }).eq('id', rideId)
      await supabase.from('price_offers').update({ status: 'rejected' }).eq('ride_id', rideId).neq('id', offer.id)
      router.push(`/uppi/ride/${rideId}/tracking`)
    } catch (e) {
      console.error('[v0] Error accepting offer:', e)
    } finally {
      setAcceptingId(null)
    }
  }

  const handleCancelRide = async () => {
    if (!rideId) return
    setShowCancelConfirm(false)
    try {
      const { error } = await supabase.from('rides').update({ 
        status: 'cancelled', 
        cancelled_at: new Date().toISOString(), 
        cancellation_reason: 'Cancelado pelo passageiro' 
      }).eq('id', rideId)
      if (error) throw error
      iosToast.success('Corrida cancelada')
      router.push('/uppi/home')
    } catch {
      iosToast.error('Erro ao cancelar corrida')
    }
  }

  if (loading) {
    return <TrackingSkeleton />
  }

  if (!ride) {
    return (
      <div className="h-dvh overflow-hidden bg-[#f2f2f7] flex flex-col items-center justify-center gap-4 px-6">
        <div className="w-16 h-16 bg-neutral-200 rounded-full flex items-center justify-center">
          <svg className="w-8 h-8 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>
        </div>
        <p className="text-[17px] font-semibold text-neutral-900">Corrida nao encontrada</p>
        <button type="button" onClick={() => router.push('/uppi/home')} className="px-6 py-3 bg-blue-500 text-white text-[15px] font-semibold rounded-xl">Voltar ao inicio</button>
      </div>
    )
  }

  const statusConfig: Record<string, { label: string; sub: string; color: string; bgColor: string }> = {
    pending: { label: 'Aguardando ofertas', sub: 'Motoristas estao vendo sua solicitacao', color: 'text-amber-600', bgColor: 'bg-amber-50' },
    negotiating: { label: 'Negociando', sub: 'Voce tem ofertas disponiveis', color: 'text-blue-600', bgColor: 'bg-blue-50' },
    accepted: { label: 'Corrida aceita', sub: 'Motorista a caminho', color: 'text-emerald-600', bgColor: 'bg-emerald-50' },
    in_progress: { label: 'Em andamento', sub: 'Voce esta em viagem', color: 'text-blue-600', bgColor: 'bg-blue-50' },
    completed: { label: 'Finalizada', sub: 'Obrigado por usar nosso servico', color: 'text-neutral-600', bgColor: 'bg-neutral-50' },
    cancelled: { label: 'Cancelada', sub: 'Esta corrida foi cancelada', color: 'text-red-600', bgColor: 'bg-red-50' },
  }

  const currentStatus = statusConfig[ride.status] || statusConfig.pending
  const isMoto = ride.vehicle_type === 'moto'

  return (
    <div className="h-dvh overflow-y-auto bg-[#f2f2f7]">
      {/* Header */}
      <div className="bg-white/[0.92] ios-blur sticky top-0 z-10 px-4 pt-safe-offset-4 pb-3 border-b border-neutral-200/50">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => router.push('/uppi/home')} className="w-10 h-10 flex items-center justify-center rounded-full ios-press">
            <svg className="w-[22px] h-[22px] text-neutral-800" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          </button>
          <h1 className="text-[20px] font-bold text-neutral-900 tracking-tight">Acompanhar corrida</h1>
        </div>
      </div>

      <div className="px-4 py-4 flex flex-col gap-3">
        {/* Status Card */}
        <div className={`rounded-[20px] p-5 ${currentStatus.bgColor}`}>
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${
              ride.status === 'pending' ? 'bg-amber-500 animate-pulse' :
              ride.status === 'accepted' ? 'bg-emerald-500' :
              ride.status === 'in_progress' ? 'bg-blue-500 animate-pulse' :
              'bg-neutral-400'
            }`} />
            <div>
              <h2 className={`text-[18px] font-bold ${currentStatus.color}`}>{currentStatus.label}</h2>
              <p className="text-[14px] text-neutral-500 mt-0.5">{currentStatus.sub}</p>
            </div>
          </div>
        </div>

        {/* Route Card */}
        <div className="bg-white rounded-[20px] p-5 shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
          <div className="flex gap-4">
            <div className="flex flex-col items-center gap-1 pt-1">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              <div className="w-[2px] flex-1 bg-blue-200" />
              <div className="w-3 h-3 rounded-full bg-red-500" />
            </div>
            <div className="flex-1 min-w-0 flex flex-col gap-4">
              <div>
                <p className="text-[12px] font-semibold text-blue-500 uppercase tracking-wide">Origem</p>
                <p className="text-[15px] font-medium text-neutral-900 truncate mt-0.5">{ride.pickup_address}</p>
              </div>
              <div>
                <p className="text-[12px] font-semibold text-red-500 uppercase tracking-wide">Destino</p>
                <p className="text-[15px] font-medium text-neutral-900 truncate mt-0.5">{ride.dropoff_address}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Driver Card (when accepted) */}
        {ride.driver && (ride.status === 'accepted' || ride.status === 'in_progress') && (
          <div className="bg-white rounded-[20px] p-5 shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
            <p className="text-[13px] font-semibold text-neutral-400 uppercase tracking-wide mb-3">{isMoto ? 'Motoboy' : 'Motorista'}</p>
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full overflow-hidden bg-neutral-100 border-2 border-white shadow-md">
                {ride.driver.avatar_url ? (
                  <Image src={ride.driver.avatar_url || "/placeholder.svg"} alt={ride.driver.full_name} width={56} height={56} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-blue-100 to-blue-50 flex items-center justify-center">
                    <span className="text-[20px] font-bold text-blue-600">{ride.driver.full_name?.[0] || 'M'}</span>
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-[17px] font-bold text-neutral-900 truncate">{ride.driver.full_name}</h3>
                <div className="flex items-center gap-2 mt-0.5">
                  <Stars rating={ride.driver.rating || 5} />
                  <span className="text-[13px] font-semibold text-neutral-500">{(ride.driver.rating || 5).toFixed(1)}</span>
                </div>
                <p className="text-[12px] text-neutral-400 mt-0.5">{ride.driver.total_rides || 0} corridas realizadas</p>
              </div>
            </div>
          </div>
        )}

        {/* Offers (when pending) */}
        {(ride.status === 'pending' || ride.status === 'negotiating') && offers.length > 0 && (
          <div className="bg-white rounded-[20px] p-5 shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
            <h2 className="text-[17px] font-bold text-neutral-900 mb-1">Ofertas recebidas ({offers.length})</h2>
            <p className="text-[13px] text-neutral-500 mb-4">Escolha o melhor motorista para voce</p>
            <div className="space-y-3">
              {offers.map((offer) => {
                const dp = offer.driver?.driver_profile?.[0]
                const isAccepting = acceptingId === offer.id
                return (
                  <div key={offer.id} className="bg-neutral-50 rounded-2xl p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-12 h-12 rounded-full overflow-hidden bg-neutral-100 border-2 border-white shadow-sm">
                        {offer.driver?.avatar_url ? (
                          <Image src={offer.driver.avatar_url || "/placeholder.svg"} alt={offer.driver.full_name} width={48} height={48} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-blue-100 to-blue-50 flex items-center justify-center">
                            <span className="text-[18px] font-bold text-blue-600">{offer.driver?.full_name?.[0] || 'M'}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-[16px] font-bold text-neutral-900 truncate">{offer.driver?.full_name || 'Motorista'}</h3>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Stars rating={offer.driver?.rating || 5} />
                          <span className="text-[12px] text-neutral-500">{offer.driver?.total_rides || 0} corridas</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[20px] font-bold text-neutral-900 leading-none">R$ {offer.offered_price?.toFixed(2)}</p>
                      </div>
                    </div>
                    {dp && (
                      <div className="flex items-center gap-2 mb-3 text-[13px] text-neutral-500">
                        <span className="font-medium">{dp.vehicle_brand} {dp.vehicle_model}</span>
                        <span className="text-neutral-300">|</span>
                        <span className="capitalize">{dp.vehicle_color}</span>
                        <span className="text-neutral-300">|</span>
                        <span className="font-mono uppercase tracking-wider">{dp.vehicle_plate}</span>
                      </div>
                    )}
                    {offer.message && (
                      <p className="text-[13px] text-blue-700 italic bg-blue-50 rounded-xl px-3 py-2 mb-3">{`"${offer.message}"`}</p>
                    )}
                    <button
                      type="button"
                      disabled={isAccepting}
                      onClick={() => handleAcceptOffer(offer)}
                      className="w-full h-[44px] rounded-xl bg-emerald-500 text-white text-[15px] font-bold flex items-center justify-center gap-2 ios-press disabled:opacity-60"
                    >
                      {isAccepting ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                          Aceitar oferta
                        </>
                      )}
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Payment Card */}
        <div className="bg-white rounded-[20px] p-5 shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
          <h2 className="text-[15px] font-bold text-neutral-900 mb-3">Detalhes do pagamento</h2>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-[14px] text-neutral-500">Sua oferta</span>
              <span className="text-[14px] font-semibold text-neutral-900">R$ {ride.passenger_price_offer?.toFixed(2)}</span>
            </div>
            {ride.final_price && (
              <div className="flex justify-between pt-2 border-t border-neutral-100">
                <span className="text-[15px] font-bold text-neutral-900">Preco final</span>
                <span className="text-[18px] font-bold text-emerald-600">R$ {ride.final_price?.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-[14px] text-neutral-500">Pagamento</span>
              <span className="text-[14px] font-medium text-neutral-900">
                {ride.payment_method === 'cash' ? 'Dinheiro' : ride.payment_method === 'pix' ? 'PIX' : 'Cartao'}
              </span>
            </div>
          </div>
        </div>

        {/* Action Button */}
        {(ride.status === 'pending' || ride.status === 'negotiating') && (
          <>
            <button
              type="button"
              onClick={() => setShowCancelConfirm(true)}
              className="w-full h-[50px] rounded-[16px] bg-red-50 text-red-500 text-[16px] font-bold ios-press"
            >
              Cancelar corrida
            </button>
            
            <IOSConfirmDialog
              isOpen={showCancelConfirm}
              onClose={() => setShowCancelConfirm(false)}
              onConfirm={handleCancelRide}
              title="Cancelar corrida?"
              description="Motoristas ja podem estar vendo sua solicitacao. Cancelamentos frequentes podem afetar sua avaliacao."
              confirmText="Sim, cancelar"
              cancelText="Manter corrida"
              variant="destructive"
            />
          </>
        )}

        {ride.status === 'completed' && (
          <button
            type="button"
            onClick={() => router.push(`/uppi/ride/${rideId}/review`)}
            className="w-full h-[50px] rounded-[16px] bg-blue-500 text-white text-[16px] font-bold ios-press"
          >
            Avaliar corrida
          </button>
        )}

        <div className="h-4" />
      </div>

      {/* Floating Safety Button */}
      {(ride.status === 'accepted' || ride.status === 'in_progress') && (
        <>
          {showSafetyMenu && (
            <div className="fixed inset-0 z-40">
              <button
                type="button"
                onClick={() => setShowSafetyMenu(false)}
                className="absolute inset-0 bg-black/40"
                aria-label="Fechar menu"
              />
              <div className="absolute bottom-28 right-5 flex flex-col gap-2.5 animate-ios-fade-up z-50">
                <button
                  type="button"
                  onClick={async () => {
                    setShowSafetyMenu(false)
                    try {
                      const pos = await new Promise<GeolocationPosition>((res, rej) => navigator.geolocation.getCurrentPosition(res, rej))
                      const link = `https://maps.google.com/?q=${pos.coords.latitude},${pos.coords.longitude}`
                      if (navigator.share) {
                        await navigator.share({ title: 'Minha localizacao - Uppi', url: link })
                      } else {
                        await navigator.clipboard.writeText(link)
                        iosToast.success('Link copiado')
                      }
                    } catch {}
                  }}
                  className="flex items-center gap-3 bg-white rounded-2xl px-4 py-3 shadow-xl"
                >
                  <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div className="text-left">
                    <p className="text-[15px] font-bold text-neutral-900">Compartilhar local</p>
                    <p className="text-[12px] text-neutral-500">Envie para amigos/familia</p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => { setShowSafetyMenu(false); router.push('/uppi/emergency') }}
                  className="flex items-center gap-3 bg-red-500 rounded-2xl px-4 py-3 shadow-xl"
                >
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div className="text-left">
                    <p className="text-[15px] font-bold text-white">SOS Emergencia</p>
                    <p className="text-[12px] text-white/75">Alertar contatos e policia</p>
                  </div>
                </button>
              </div>
            </div>
          )}
          <button
            type="button"
            onClick={() => setShowSafetyMenu(!showSafetyMenu)}
            className={`fixed bottom-6 right-5 z-50 w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all duration-200 ${
              showSafetyMenu ? 'bg-neutral-900 text-white rotate-45' : 'bg-red-500 text-white'
            }`}
            aria-label="Menu de seguranca"
          >
            {showSafetyMenu ? (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
            )}
          </button>
        </>
      )}
    </div>
  )
}

export default function TrackingPage() {
  return (
    <Suspense fallback={
      <div className="h-dvh overflow-hidden bg-[#f2f2f7] flex flex-col items-center justify-center gap-3">
        <div className="w-10 h-10 border-[3px] border-blue-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-[15px] text-neutral-400 font-medium">Carregando...</span>
      </div>
    }>
      <TrackingContent />
    </Suspense>
  )
}
