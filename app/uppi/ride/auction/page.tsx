'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface AuctionOffer {
  id: string
  driver_id: string
  offered_price: number
  eta_minutes: number
  created_at: string
  driver: {
    full_name: string
    avatar_url: string | null
    rating: number
    total_rides: number
    vehicle_brand: string
    vehicle_model: string
    vehicle_color: string
    vehicle_plate: string
    trust_score: number
  }
}

const AUCTION_DURATION = 60

export default function AuctionPage() {
  const router = useRouter()
  const params = useSearchParams()
  const rideId = params.get('ride_id')

  const [timeLeft, setTimeLeft] = useState(AUCTION_DURATION)
  const [offers, setOffers] = useState<AuctionOffer[]>([])
  const [accepting, setAccepting] = useState<string | null>(null)
  const [ridePrice, setRidePrice] = useState<number>(0)
  const [autoAccept, setAutoAccept] = useState(false)
  const [finished, setFinished] = useState(false)

  // Countdown
  useEffect(() => {
    if (finished) return
    if (timeLeft <= 0) {
      setFinished(true)
      if (autoAccept && offers.length > 0) {
        const best = [...offers].sort((a, b) => a.offered_price - b.offered_price)[0]
        handleAccept(best.id)
      }
      return
    }
    const t = setTimeout(() => setTimeLeft(p => p - 1), 1000)
    return () => clearTimeout(t)
  }, [timeLeft, finished, autoAccept, offers])

  // Carregar corrida
  useEffect(() => {
    if (!rideId) return
    const supabase = createClient()
    supabase.from('rides').select('passenger_price_offer').eq('id', rideId).single()
      .then(({ data }) => { if (data) setRidePrice(data.passenger_price_offer || 0) })
  }, [rideId])

  // Realtime: novas ofertas
  useEffect(() => {
    if (!rideId) return
    const supabase = createClient()

    supabase.from('price_offers')
      .select(`
        id, driver_id, offered_price, eta_minutes, created_at,
        driver:driver_profiles!driver_id(
          rating, total_rides, trust_score, vehicle_brand, vehicle_model, vehicle_color, vehicle_plate,
          profile:profiles!id(full_name, avatar_url)
        )
      `)
      .eq('ride_id', rideId)
      .eq('status', 'pending')
      .order('offered_price', { ascending: true })
      .then(({ data }) => {
        if (data) setOffers(data.map(mapOffer))
      })

    const channel = supabase
      .channel(`auction-${rideId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'price_offers',
        filter: `ride_id=eq.${rideId}`,
      }, async (payload) => {
        const { data } = await supabase
          .from('price_offers')
          .select(`
            id, driver_id, offered_price, eta_minutes, created_at,
            driver:driver_profiles!driver_id(
              rating, total_rides, trust_score, vehicle_brand, vehicle_model, vehicle_color, vehicle_plate,
              profile:profiles!id(full_name, avatar_url)
            )
          `)
          .eq('id', payload.new.id)
          .single()
        if (data) {
          setOffers(prev => {
            const without = prev.filter(o => o.driver_id !== payload.new.driver_id)
            return [...without, mapOffer(data)].sort((a, b) => a.offered_price - b.offered_price)
          })
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [rideId])

  function mapOffer(data: any): AuctionOffer {
    const dp = Array.isArray(data.driver) ? data.driver[0] : data.driver
    const profile = Array.isArray(dp?.profile) ? dp?.profile[0] : dp?.profile
    return {
      id: data.id,
      driver_id: data.driver_id,
      offered_price: data.offered_price,
      eta_minutes: data.eta_minutes,
      created_at: data.created_at,
      driver: {
        full_name: profile?.full_name || 'Motorista',
        avatar_url: profile?.avatar_url || null,
        rating: dp?.rating || 5,
        total_rides: dp?.total_rides || 0,
        vehicle_brand: dp?.vehicle_brand || '',
        vehicle_model: dp?.vehicle_model || '',
        vehicle_color: dp?.vehicle_color || '',
        vehicle_plate: dp?.vehicle_plate || '',
        trust_score: dp?.trust_score || 50,
      },
    }
  }

  const handleAccept = useCallback(async (offerId: string) => {
    setAccepting(offerId)
    try {
      const res = await fetch(`/api/v1/offers/${offerId}/accept`, { method: 'POST' })
      if (res.ok) {
        const { ride_id } = await res.json()
        router.push(`/uppi/ride/${ride_id || rideId}/tracking`)
      }
    } finally {
      setAccepting(null)
    }
  }, [rideId, router])

  const pct = (timeLeft / AUCTION_DURATION) * 100
  const circumference = 2 * Math.PI * 28
  const strokeDashoffset = circumference - (pct / 100) * circumference
  const timerColor = timeLeft > 30 ? '#22c55e' : timeLeft > 10 ? '#f59e0b' : '#ef4444'

  const diff = (price: number) => price - ridePrice
  const lowestOffer = offers.length > 0 ? offers[0].offered_price : null

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="px-5 pt-14 pb-4 flex items-center gap-4">
        <button onClick={() => router.back()} className="w-9 h-9 rounded-full bg-muted flex items-center justify-center ios-press">
          <svg className="w-4 h-4 text-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1">
          <h1 className="text-[17px] font-bold text-foreground">Leilao de Corrida</h1>
          <p className="text-[12px] text-muted-foreground">Motoristas estao fazendo ofertas</p>
        </div>

        {/* Timer circular */}
        <div className="relative w-16 h-16 flex items-center justify-center">
          <svg className="absolute inset-0 -rotate-90" width="64" height="64">
            <circle cx="32" cy="32" r="28" fill="none" stroke="currentColor" strokeWidth="4" className="text-muted" />
            <circle
              cx="32" cy="32" r="28" fill="none"
              stroke={timerColor}
              strokeWidth="4"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.5s ease' }}
            />
          </svg>
          <span className="text-[15px] font-bold tabular-nums" style={{ color: timerColor }}>{timeLeft}s</span>
        </div>
      </div>

      {/* Meu preço vs melhor oferta */}
      <div className="mx-5 mb-4 grid grid-cols-2 gap-3">
        <div className="bg-muted/50 rounded-2xl p-4 text-center">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Meu preco</p>
          <p className="text-[20px] font-bold text-foreground">R$ {ridePrice.toFixed(2)}</p>
        </div>
        <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-4 text-center">
          <p className="text-[11px] font-semibold text-green-600 uppercase tracking-wide mb-1">Menor oferta</p>
          <p className="text-[20px] font-bold text-green-600">
            {lowestOffer !== null ? `R$ ${lowestOffer.toFixed(2)}` : '—'}
          </p>
        </div>
      </div>

      {/* Auto-aceitar */}
      <div className="mx-5 mb-4">
        <button
          type="button"
          onClick={() => setAutoAccept(p => !p)}
          className="w-full flex items-center justify-between px-4 py-3 rounded-2xl border transition-all ios-press"
          style={{
            backgroundColor: autoAccept ? 'rgba(34,197,94,0.1)' : 'var(--muted)',
            borderColor: autoAccept ? '#22c55e' : 'var(--border)',
          }}
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: autoAccept ? '#22c55e' : 'var(--muted-foreground)20' }}>
              <svg className="w-4 h-4" style={{ color: autoAccept ? 'white' : 'var(--muted-foreground)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="text-left">
              <p className="text-[13px] font-bold text-foreground">Aceitar automaticamente</p>
              <p className="text-[11px] text-muted-foreground">Aceita a menor oferta ao final</p>
            </div>
          </div>
          <div
            className="w-11 h-6 rounded-full transition-all relative"
            style={{ backgroundColor: autoAccept ? '#22c55e' : 'var(--muted-foreground)40' }}
          >
            <div
              className="absolute top-[2px] w-5 h-5 bg-white rounded-full shadow transition-all"
              style={{ left: autoAccept ? '22px' : '2px' }}
            />
          </div>
        </button>
      </div>

      {/* Lista de ofertas */}
      <div className="flex-1 overflow-y-auto px-5 pb-8">
        {offers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center animate-pulse">
              <svg className="w-6 h-6 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
              </svg>
            </div>
            <p className="text-[14px] font-semibold text-muted-foreground">Aguardando motoristas...</p>
            <p className="text-[12px] text-muted-foreground">Motoristas proximo estao vendo sua corrida</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {offers.map((offer, index) => {
              const delta = diff(offer.offered_price)
              const isBest = index === 0
              return (
                <div
                  key={offer.id}
                  className="bg-card rounded-[20px] border overflow-hidden"
                  style={{ borderColor: isBest ? '#22c55e' : 'var(--border)' }}
                >
                  {isBest && (
                    <div className="bg-green-500 px-4 py-1 flex items-center gap-1.5">
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                      </svg>
                      <span className="text-white text-[11px] font-bold uppercase tracking-wide">Melhor oferta</span>
                    </div>
                  )}
                  <div className="p-4">
                    <div className="flex items-center gap-3 mb-3">
                      {offer.driver.avatar_url ? (
                        <img src={offer.driver.avatar_url} alt="" className="w-12 h-12 rounded-full object-cover" />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                          <span className="text-[18px] font-bold text-muted-foreground">
                            {offer.driver.full_name.charAt(0)}
                          </span>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-[15px] font-bold text-foreground truncate">{offer.driver.full_name}</p>
                          {offer.driver.trust_score >= 80 && (
                            <div className="flex items-center gap-0.5 bg-blue-500/10 px-1.5 py-0.5 rounded-full">
                              <svg className="w-3 h-3 text-blue-500" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                              </svg>
                              <span className="text-[10px] font-bold text-blue-500">Verificado</span>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-0.5">
                          <div className="flex items-center gap-1">
                            <svg className="w-3 h-3 text-yellow-500" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                            </svg>
                            <span className="text-[12px] font-semibold text-foreground">{offer.driver.rating?.toFixed(1)}</span>
                          </div>
                          <span className="text-[12px] text-muted-foreground">{offer.driver.total_rides} corridas</span>
                          <span className="text-[12px] text-muted-foreground">{offer.eta_minutes}min</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[22px] font-bold text-foreground">R$ {offer.offered_price.toFixed(2)}</p>
                        {delta !== 0 && (
                          <p className="text-[12px] font-semibold" style={{ color: delta < 0 ? '#22c55e' : '#ef4444' }}>
                            {delta < 0 ? `- R$ ${Math.abs(delta).toFixed(2)}` : `+ R$ ${delta.toFixed(2)}`}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 mb-3">
                      <svg className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
                      </svg>
                      <span className="text-[12px] text-muted-foreground">
                        {offer.driver.vehicle_brand} {offer.driver.vehicle_model} • {offer.driver.vehicle_color} • {offer.driver.vehicle_plate}
                      </span>
                    </div>

                    {/* Trust score bar */}
                    <div className="mb-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] font-semibold text-muted-foreground">Score de Confianca</span>
                        <span className="text-[11px] font-bold" style={{ color: offer.driver.trust_score >= 70 ? '#22c55e' : offer.driver.trust_score >= 40 ? '#f59e0b' : '#ef4444' }}>
                          {offer.driver.trust_score}/100
                        </span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${offer.driver.trust_score}%`,
                            backgroundColor: offer.driver.trust_score >= 70 ? '#22c55e' : offer.driver.trust_score >= 40 ? '#f59e0b' : '#ef4444',
                          }}
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={!!accepting}
                      onClick={() => handleAccept(offer.id)}
                      className="w-full py-3 rounded-[14px] font-bold text-[15px] transition-all ios-press disabled:opacity-50"
                      style={{ backgroundColor: isBest ? '#22c55e' : 'var(--primary)', color: 'white' }}
                    >
                      {accepting === offer.id ? 'Confirmando...' : `Aceitar por R$ ${offer.offered_price.toFixed(2)}`}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Rodapé se acabou o tempo */}
      {finished && offers.length === 0 && (
        <div className="mx-5 mb-8 p-5 bg-muted rounded-2xl text-center">
          <p className="text-[15px] font-bold text-foreground mb-1">Nenhuma oferta recebida</p>
          <p className="text-[13px] text-muted-foreground mb-4">Tente novamente ou altere o preco</p>
          <button onClick={() => router.back()} className="w-full py-3 rounded-full bg-foreground text-background font-bold text-[15px]">
            Voltar
          </button>
        </div>
      )}
    </div>
  )
}
