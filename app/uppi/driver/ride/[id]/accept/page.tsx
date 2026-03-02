'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { trackingService } from '@/lib/services/tracking-service'
import type { Ride } from '@/lib/types/database'

interface RideWithPassenger extends Ride {
  passenger?: {
    full_name: string
    avatar_url?: string
    total_rides_count?: number
  }
}

const TIMEOUT_SECONDS = 30

export default function DriverAcceptRidePage() {
  const params = useParams()
  const router = useRouter()
  const supabase = createClient()
  const rideId = params.id as string

  const [ride, setRide] = useState<RideWithPassenger | null>(null)
  const [loading, setLoading] = useState(true)
  const [accepting, setAccepting] = useState(false)
  const [declining, setDeclining] = useState(false)
  const [timeLeft, setTimeLeft] = useState(TIMEOUT_SECONDS)
  const [offerMode, setOfferMode] = useState(false)
  const [counterPrice, setCounterPrice] = useState('')
  const [sendingOffer, setSendingOffer] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    loadRide()
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [rideId])

  useEffect(() => {
    if (!loading && ride) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current!)
            router.replace('/uppi/driver')
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [loading, ride])

  // Subscribe to realtime - if ride gets accepted by another driver, redirect
  useEffect(() => {
    if (!rideId) return
    const channel = supabase
      .channel(`accept-ride-${rideId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rides', filter: `id=eq.${rideId}` }, (payload) => {
        const updated = payload.new as Ride
        if (['accepted', 'cancelled', 'failed'].includes(updated.status)) {
          router.replace('/uppi/driver')
        }
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [rideId])

  const loadRide = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/onboarding/splash'); return }
      setUserId(user.id)

      const { data } = await supabase
        .from('rides')
        .select('*, passenger:profiles!passenger_id(full_name, avatar_url)')
        .eq('id', rideId)
        .single()

      if (!data || !['pending', 'negotiating'].includes(data.status)) {
        router.replace('/uppi/driver')
        return
      }
      setRide(data)
      setCounterPrice(String(data.passenger_price_offer || ''))
    } finally {
      setLoading(false)
    }
  }

  const handleAccept = async () => {
    if (!ride || accepting) return
    setAccepting(true)
    if (timerRef.current) clearInterval(timerRef.current)
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
      await fetch(`/api/v1/offers/${offer.id}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      if (userId) trackingService.startDriverTracking(ride.id, userId)
      router.replace(`/uppi/ride/${ride.id}/tracking`)
    } catch {
      alert('Erro ao aceitar corrida. Tente novamente.')
    } finally {
      setAccepting(false)
    }
  }

  const handleDecline = async () => {
    if (timerRef.current) clearInterval(timerRef.current)
    setDeclining(true)
    router.replace('/uppi/driver')
  }

  const handleCounterOffer = async () => {
    if (!ride || !counterPrice || sendingOffer) return
    const price = parseFloat(counterPrice)
    if (!price || price <= 0) return
    setSendingOffer(true)
    if (timerRef.current) clearInterval(timerRef.current)
    try {
      const res = await fetch('/api/v1/offers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ride_id: ride.id,
          offered_price: price,
          estimated_arrival_minutes: 5,
          message: 'Contra-oferta do motorista',
        }),
      })
      if (res.ok) {
        router.replace('/uppi/driver')
      }
    } finally {
      setSendingOffer(false)
    }
  }

  const estimatedEarnings = ride ? (ride.passenger_price_offer || 0) * 0.85 : 0
  const timerPercent = (timeLeft / TIMEOUT_SECONDS) * 100
  const timerColor = timeLeft > 15 ? '#10b981' : timeLeft > 7 ? '#f59e0b' : '#ef4444'

  if (loading) {
    return (
      <div className="h-dvh bg-[color:var(--background)] flex items-center justify-center">
        <div className="w-8 h-8 border-[2.5px] border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!ride) return null

  return (
    <div className="h-dvh overflow-y-auto bg-[color:var(--background)] pb-8 ios-scroll">
      {/* Header com timer */}
      <header className="bg-[color:var(--card)]/80 ios-blur border-b border-[color:var(--border)] sticky top-0 z-30">
        <div className="px-5 pt-safe-offset-4 pb-3 flex items-center justify-between">
          <div>
            <h1 className="text-[20px] font-bold text-[color:var(--foreground)] tracking-tight">Nova Corrida</h1>
            <p className="text-[13px] text-[color:var(--muted-foreground)]">Aceite antes que expire</p>
          </div>

          {/* Countdown circular */}
          <div className="relative w-14 h-14">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 56 56">
              <circle cx="28" cy="28" r="22" fill="none" stroke="var(--border)" strokeWidth="4" />
              <circle
                cx="28" cy="28" r="22" fill="none"
                stroke={timerColor}
                strokeWidth="4"
                strokeDasharray={`${2 * Math.PI * 22}`}
                strokeDashoffset={`${2 * Math.PI * 22 * (1 - timerPercent / 100)}`}
                strokeLinecap="round"
                style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.5s' }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-[16px] font-black" style={{ color: timerColor }}>{timeLeft}</span>
            </div>
          </div>
        </div>
      </header>

      <main className="px-5 py-5 max-w-lg mx-auto space-y-4">
        {/* Passageiro */}
        <div className="bg-[color:var(--card)] rounded-[24px] p-5 border border-[color:var(--border)] animate-ios-fade-up">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center shrink-0">
              <span className="text-[22px] font-black text-emerald-700">
                {ride.passenger?.full_name?.[0] || 'P'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[18px] font-bold text-[color:var(--foreground)] truncate">
                {ride.passenger?.full_name || 'Passageiro'}
              </p>
              <p className="text-[13px] text-[color:var(--muted-foreground)]">Passageiro</p>
            </div>
          </div>
        </div>

        {/* Rota */}
        <div className="bg-[color:var(--card)] rounded-[24px] p-5 border border-[color:var(--border)] animate-ios-fade-up" style={{ animationDelay: '60ms' }}>
          <p className="text-[12px] font-bold text-[color:var(--muted-foreground)] uppercase tracking-wider mb-3">Rota</p>
          <div className="flex gap-3">
            <div className="flex flex-col items-center gap-1 pt-1">
              <div className="w-3 h-3 bg-blue-500 rounded-full shrink-0" />
              <div className="w-px flex-1 bg-[color:var(--border)] min-h-[28px]" />
              <div className="w-3 h-3 bg-orange-500 rounded-full shrink-0" />
            </div>
            <div className="flex-1 space-y-3 min-w-0">
              <div>
                <p className="text-[11px] font-semibold text-[color:var(--muted-foreground)] uppercase tracking-wide">Origem</p>
                <p className="text-[14px] font-semibold text-[color:var(--foreground)]">{ride.pickup_address}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold text-[color:var(--muted-foreground)] uppercase tracking-wide">Destino</p>
                <p className="text-[14px] font-semibold text-[color:var(--foreground)]">{ride.dropoff_address}</p>
              </div>
            </div>
          </div>

          {/* Stats da corrida */}
          <div className="flex gap-3 mt-4 pt-4 border-t border-[color:var(--border)]">
            {[
              { label: 'Distância', value: ride.distance_km ? `${ride.distance_km} km` : '—' },
              { label: 'Tempo est.', value: ride.estimated_duration_minutes ? `${ride.estimated_duration_minutes} min` : '—' },
              { label: 'Tipo', value: ride.vehicle_type || 'Carro' },
            ].map(s => (
              <div key={s.label} className="flex-1 text-center">
                <p className="text-[15px] font-bold text-[color:var(--foreground)] capitalize">{s.value}</p>
                <p className="text-[11px] text-[color:var(--muted-foreground)] mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Valor */}
        <div className="bg-emerald-500 rounded-[24px] p-5 animate-ios-fade-up" style={{ animationDelay: '120ms' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[13px] font-semibold text-white/75">Valor oferecido</p>
              <p className="text-[38px] font-black text-white tracking-tight leading-none mt-1">
                R$ {(ride.passenger_price_offer || 0).toFixed(2)}
              </p>
              <p className="text-[13px] text-white/75 mt-1">
                Seus ganhos: <strong className="text-white">R$ {estimatedEarnings.toFixed(2)}</strong> (85%)
              </p>
            </div>
            <div className="w-16 h-16 bg-white/20 rounded-[18px] flex items-center justify-center">
              <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Contra-oferta */}
        {offerMode ? (
          <div className="bg-[color:var(--card)] rounded-[24px] p-5 border border-[color:var(--border)] animate-ios-fade-up space-y-3">
            <p className="text-[14px] font-bold text-[color:var(--foreground)]">Sua contra-oferta</p>
            <div className="flex items-center gap-3">
              <span className="text-[18px] font-bold text-[color:var(--muted-foreground)]">R$</span>
              <input
                type="number"
                value={counterPrice}
                onChange={e => setCounterPrice(e.target.value)}
                placeholder="0,00"
                className="flex-1 h-14 px-4 bg-[color:var(--muted)] rounded-[14px] text-[22px] font-bold text-[color:var(--foreground)] outline-none focus:ring-2 focus:ring-emerald-400"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setOfferMode(false)}
                className="flex-1 h-12 bg-[color:var(--muted)] text-[color:var(--foreground)] font-semibold text-[15px] rounded-[14px] ios-press"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleCounterOffer}
                disabled={sendingOffer || !counterPrice}
                className="flex-1 h-12 bg-blue-500 text-white font-bold text-[15px] rounded-[14px] ios-press disabled:opacity-50 flex items-center justify-center"
              >
                {sendingOffer
                  ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : 'Enviar oferta'
                }
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setOfferMode(true)}
            className="w-full py-3.5 bg-[color:var(--card)] border border-[color:var(--border)] text-[color:var(--foreground)] font-semibold text-[14px] rounded-[18px] ios-press animate-ios-fade-up"
            style={{ animationDelay: '160ms' }}
          >
            Fazer contra-oferta
          </button>
        )}

        {/* Ações principais */}
        <div className="flex gap-3 animate-ios-fade-up" style={{ animationDelay: '200ms' }}>
          <button
            type="button"
            onClick={handleDecline}
            disabled={declining}
            className="flex-1 h-[56px] bg-red-50 text-red-500 font-bold text-[16px] rounded-[18px] ios-press border border-red-100"
          >
            Recusar
          </button>
          <button
            type="button"
            onClick={handleAccept}
            disabled={accepting}
            className="flex-[2] h-[56px] bg-emerald-500 text-white font-black text-[18px] rounded-[18px] ios-press shadow-lg shadow-emerald-500/30 flex items-center justify-center"
          >
            {accepting
              ? <div className="w-6 h-6 border-[2.5px] border-white border-t-transparent rounded-full animate-spin" />
              : 'Aceitar corrida'
            }
          </button>
        </div>
      </main>
    </div>
  )
}
