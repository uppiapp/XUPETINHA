'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import type { Ride, Profile, DriverProfile } from '@/lib/types/database'

export default function RideReceiptPage() {
  const params = useParams()
  const router = useRouter()
  const supabase = createClient()
  const rideId = params.id as string
  const receiptRef = useRef<HTMLDivElement>(null)

  const [ride, setRide] = useState<Ride | null>(null)
  const [driver, setDriver] = useState<Profile | null>(null)
  const [driverProfile, setDriverProfile] = useState<DriverProfile | null>(null)
  const [passenger, setPassenger] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [sharing, setSharing] = useState(false)

  useEffect(() => {
    loadReceipt()

    // Real-time: listen for payment status update on the ride (e.g. admin refund)
    const channel = supabase
      .channel(`ride-receipt-${rideId}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'rides',
        filter: `id=eq.${rideId}`,
      }, () => loadReceipt())
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [rideId])

  const loadReceipt = async () => {
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

      const fetches = [
        supabase.from('profiles').select('*').eq('id', user.id).single(),
      ]

      const [{ data: passData }, driverRes, drvProfRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        rideData.driver_id
          ? supabase.from('profiles').select('*').eq('id', rideData.driver_id).single()
          : Promise.resolve({ data: null }),
        rideData.driver_id
          ? supabase.from('driver_profiles').select('*').eq('id', rideData.driver_id).single()
          : Promise.resolve({ data: null }),
      ])

      setPassenger(passData)
      setDriver(driverRes.data)
      setDriverProfile(drvProfRes.data)
    } finally {
      setLoading(false)
    }
  }

  const paymentLabel = (method?: string) => {
    const m: Record<string, string> = {
      cash: 'Dinheiro', pix: 'PIX', credit_card: 'Cartão de Crédito',
      debit_card: 'Cartão de Débito', wallet: 'Carteira Uppi',
    }
    return m[method || ''] || method || '—'
  }

  const formatDateTime = (d: string) =>
    new Date(d).toLocaleString('pt-BR', {
      day: '2-digit', month: 'long', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })

  const handleShare = async () => {
    if (!ride) return
    setSharing(true)
    try {
      const text = [
        `Recibo de corrida - Uppi`,
        `Data: ${formatDateTime(ride.completed_at || ride.created_at)}`,
        `De: ${ride.pickup_address}`,
        `Para: ${ride.dropoff_address}`,
        ride.distance_km ? `Distância: ${ride.distance_km} km` : null,
        `Valor: R$ ${(ride.final_price || 0).toFixed(2)}`,
        `Pagamento: ${paymentLabel(ride.payment_method)}`,
        driver ? `Motorista: ${driver.full_name}` : null,
      ].filter(Boolean).join('\n')

      if (navigator.share) {
        await navigator.share({ title: 'Recibo Uppi', text })
      } else {
        await navigator.clipboard.writeText(text)
      }
    } catch { /* cancelado */ }
    finally { setSharing(false) }
  }

  if (loading) {
    return (
      <div className="h-dvh bg-[color:var(--background)] flex items-center justify-center">
        <div className="w-8 h-8 border-[2.5px] border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!ride) return null

  const serviceFee = (ride.final_price || 0) * 0.05
  const subtotal = (ride.final_price || 0) - serviceFee

  return (
    <div className="h-dvh overflow-y-auto bg-[color:var(--background)] pb-8 ios-scroll">
      {/* Header */}
      <header className="bg-[color:var(--card)]/80 ios-blur border-b border-[color:var(--border)] sticky top-0 z-30">
        <div className="px-5 pt-safe-offset-4 pb-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="w-9 h-9 flex items-center justify-center rounded-full bg-[color:var(--muted)] ios-press"
            >
              <svg className="w-5 h-5 text-[color:var(--foreground)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-[20px] font-bold text-[color:var(--foreground)] tracking-tight">Recibo</h1>
          </div>
          <button
            type="button"
            onClick={handleShare}
            disabled={sharing}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-blue-500/10 ios-press"
          >
            <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
          </button>
        </div>
      </header>

      <main className="px-5 py-5 max-w-lg mx-auto space-y-4">
        {/* Recibo visual */}
        <div ref={receiptRef} className="bg-[color:var(--card)] rounded-[28px] border border-[color:var(--border)] overflow-hidden shadow-sm animate-ios-fade-up">
          {/* Topo colorido */}
          <div className="bg-blue-500 p-5 text-center">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-2">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <p className="text-[13px] font-semibold text-white/70 uppercase tracking-wider">Recibo de corrida</p>
            <p className="text-[11px] text-white/60 mt-0.5">#{rideId.slice(0, 8).toUpperCase()}</p>
          </div>

          {/* Valor total */}
          <div className="px-6 py-5 text-center border-b border-[color:var(--border)]">
            <p className="text-[42px] font-black text-[color:var(--foreground)] tracking-tight leading-none">
              R$ {(ride.final_price || 0).toFixed(2)}
            </p>
            <p className="text-[14px] text-[color:var(--muted-foreground)] mt-1">
              {formatDateTime(ride.completed_at || ride.created_at)}
            </p>
          </div>

          {/* Rota */}
          <div className="px-6 py-4 border-b border-[color:var(--border)]">
            <div className="flex gap-3">
              <div className="flex flex-col items-center gap-1 pt-1">
                <div className="w-2.5 h-2.5 bg-blue-500 rounded-full" />
                <div className="w-px flex-1 bg-[color:var(--border)] min-h-[24px]" />
                <div className="w-2.5 h-2.5 bg-orange-500 rounded-full" />
              </div>
              <div className="flex-1 space-y-3 min-w-0">
                <div>
                  <p className="text-[10px] font-bold text-[color:var(--muted-foreground)] uppercase tracking-widest">Origem</p>
                  <p className="text-[13px] font-medium text-[color:var(--foreground)]">{ride.pickup_address}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-[color:var(--muted-foreground)] uppercase tracking-widest">Destino</p>
                  <p className="text-[13px] font-medium text-[color:var(--foreground)]">{ride.dropoff_address}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Detalhes */}
          <div className="px-6 py-4 space-y-3 border-b border-[color:var(--border)]">
            {[
              { label: 'Subtotal', value: `R$ ${subtotal.toFixed(2)}` },
              { label: 'Taxa de serviço (5%)', value: `R$ ${serviceFee.toFixed(2)}` },
              ride.distance_km ? { label: 'Distância', value: `${ride.distance_km} km` } : null,
              ride.estimated_duration_minutes
                ? { label: 'Duração estimada', value: `${ride.estimated_duration_minutes} min` }
                : null,
              { label: 'Pagamento', value: paymentLabel(ride.payment_method) },
            ].filter(Boolean).map(item => (
              <div key={item!.label} className="flex items-center justify-between">
                <span className="text-[13px] text-[color:var(--muted-foreground)]">{item!.label}</span>
                <span className="text-[13px] font-semibold text-[color:var(--foreground)]">{item!.value}</span>
              </div>
            ))}
          </div>

          {/* Total */}
          <div className="px-6 py-4 flex items-center justify-between border-b border-[color:var(--border)]">
            <span className="text-[16px] font-black text-[color:var(--foreground)]">Total</span>
            <span className="text-[20px] font-black text-blue-600">R$ {(ride.final_price || 0).toFixed(2)}</span>
          </div>

          {/* Motorista */}
          {driver && (
            <div className="px-6 py-4 flex items-center gap-4">
              <div className="w-12 h-12 bg-[color:var(--muted)] rounded-full flex items-center justify-center shrink-0">
                {driver.avatar_url
                  ? <img src={driver.avatar_url} alt={driver.full_name} className="w-full h-full rounded-full object-cover" />
                  : <span className="text-[18px] font-bold text-[color:var(--foreground)]">{driver.full_name?.[0]}</span>
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-bold text-[color:var(--foreground)] truncate">{driver.full_name}</p>
                {driverProfile && (
                  <p className="text-[12px] text-[color:var(--muted-foreground)] truncate">
                    {driverProfile.vehicle_brand} {driverProfile.vehicle_model}
                    {driverProfile.vehicle_plate ? ` · ${driverProfile.vehicle_plate.toUpperCase()}` : ''}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Ações */}
        <div className="space-y-3 animate-ios-fade-up" style={{ animationDelay: '100ms' }}>
          <button
            type="button"
            onClick={handleShare}
            disabled={sharing}
            className="w-full h-12 bg-blue-500 text-white font-bold text-[15px] rounded-[18px] ios-press shadow-md shadow-blue-500/20 flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
            Compartilhar recibo
          </button>
          {ride.status === 'completed' && (
            <button
              type="button"
              onClick={() => router.push(`/uppi/ride/${rideId}/review`)}
              className="w-full h-12 bg-amber-50 text-amber-700 font-bold text-[15px] rounded-[18px] ios-press border border-amber-200 flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5 text-amber-500 fill-current" viewBox="0 0 20 20">
                <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
              </svg>
              Avaliar motorista
            </button>
          )}
          <button
            type="button"
            onClick={() => router.push('/uppi/home')}
            className="w-full h-12 bg-[color:var(--muted)] text-[color:var(--muted-foreground)] font-semibold text-[15px] rounded-[18px] ios-press"
          >
            Voltar ao início
          </button>
        </div>
      </main>
    </div>
  )
}
