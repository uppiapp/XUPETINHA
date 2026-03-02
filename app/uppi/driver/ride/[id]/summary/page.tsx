'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import type { Ride, Profile } from '@/lib/types/database'

interface RideWithPassenger extends Ride {
  passenger?: Pick<Profile, 'full_name' | 'avatar_url'>
}

export default function DriverRideSummaryPage() {
  const params = useParams()
  const router = useRouter()
  const supabase = createClient()
  const rideId = params.id as string

  const [ride, setRide] = useState<RideWithPassenger | null>(null)
  const [loading, setLoading] = useState(true)
  const [driverEarnings, setDriverEarnings] = useState(0)

  useEffect(() => {
    loadRide()

    // Real-time: listen for ride updates (e.g. payment confirmation)
    const channel = supabase
      .channel(`driver-summary-${rideId}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'rides',
        filter: `id=eq.${rideId}`,
      }, () => loadRide())
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [rideId])

  const loadRide = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/onboarding/splash'); return }

      const { data } = await supabase
        .from('rides')
        .select('*, passenger:profiles!passenger_id(full_name, avatar_url)')
        .eq('id', rideId)
        .single()

      if (!data) { router.back(); return }
      setRide(data)

      // Simula comissão 85% motorista
      const net = (data.final_price || 0) * 0.85
      setDriverEarnings(net)
    } finally {
      setLoading(false)
    }
  }

  const paymentLabel = (method?: string) => {
    const m: Record<string, string> = {
      cash: 'Dinheiro', pix: 'PIX', credit_card: 'Cartão de Crédito',
      debit_card: 'Cartão de Débito', wallet: 'Carteira',
    }
    return m[method || ''] || method || '—'
  }

  if (loading) {
    return (
      <div className="h-dvh bg-[color:var(--background)] flex items-center justify-center">
        <div className="w-8 h-8 border-[2.5px] border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!ride) return null

  const duration = ride.started_at && ride.completed_at
    ? Math.round((new Date(ride.completed_at).getTime() - new Date(ride.started_at).getTime()) / 60000)
    : null

  return (
    <div className="h-dvh overflow-y-auto bg-[color:var(--background)] pb-8 ios-scroll">
      {/* Success banner */}
      <div className="bg-emerald-500 px-5 pt-safe-offset-6 pb-10 text-center">
        <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
          <svg className="w-9 h-9 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-[26px] font-black text-white tracking-tight">Corrida finalizada!</h1>
        <p className="text-[14px] text-white/75 mt-1">Parabéns pela viagem concluída</p>
      </div>

      <main className="px-5 -mt-6 space-y-4 max-w-lg mx-auto">
        {/* Ganhos card */}
        <div className="bg-[color:var(--card)] rounded-[24px] p-5 shadow-lg border border-[color:var(--border)] animate-ios-fade-up">
          <p className="text-[12px] font-bold text-[color:var(--muted-foreground)] uppercase tracking-wider mb-1">Seus ganhos</p>
          <div className="flex items-end justify-between">
            <div>
              <p className="text-[38px] font-black text-emerald-500 tracking-tight leading-none">
                R$ {driverEarnings.toFixed(2)}
              </p>
              <p className="text-[13px] text-[color:var(--muted-foreground)] mt-1">
                Bruto: R$ {(ride.final_price || 0).toFixed(2)} · Taxa plataforma: 15%
              </p>
            </div>
            <div className="w-14 h-14 bg-emerald-50 rounded-[16px] flex items-center justify-center">
              <svg className="w-7 h-7 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>

          {/* Stats row */}
          <div className="flex gap-3 mt-4 pt-4 border-t border-[color:var(--border)]">
            {[
              { label: 'Distância', value: ride.distance_km ? `${ride.distance_km} km` : '—' },
              { label: 'Duração', value: duration !== null ? `${duration} min` : '—' },
              { label: 'Pagamento', value: paymentLabel(ride.payment_method) },
            ].map(s => (
              <div key={s.label} className="flex-1 text-center">
                <p className="text-[15px] font-bold text-[color:var(--foreground)]">{s.value}</p>
                <p className="text-[11px] text-[color:var(--muted-foreground)] mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Passageiro */}
        {ride.passenger && (
          <div className="bg-[color:var(--card)] rounded-[24px] p-5 border border-[color:var(--border)] animate-ios-fade-up" style={{ animationDelay: '80ms' }}>
            <p className="text-[12px] font-bold text-[color:var(--muted-foreground)] uppercase tracking-wider mb-3">Passageiro</p>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center shrink-0">
                <span className="text-[20px] font-bold text-emerald-700">
                  {ride.passenger.full_name?.[0] || 'P'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[16px] font-bold text-[color:var(--foreground)] truncate">{ride.passenger.full_name}</p>
                <p className="text-[13px] text-[color:var(--muted-foreground)]">Passageiro</p>
              </div>
            </div>
          </div>
        )}

        {/* Rota */}
        <div className="bg-[color:var(--card)] rounded-[24px] p-5 border border-[color:var(--border)] animate-ios-fade-up" style={{ animationDelay: '120ms' }}>
          <p className="text-[12px] font-bold text-[color:var(--muted-foreground)] uppercase tracking-wider mb-3">Rota percorrida</p>
          <div className="flex gap-3">
            <div className="flex flex-col items-center gap-1 pt-1">
              <div className="w-2.5 h-2.5 bg-blue-500 rounded-full" />
              <div className="w-px flex-1 bg-[color:var(--border)] min-h-[24px]" />
              <div className="w-2.5 h-2.5 bg-orange-500 rounded-full" />
            </div>
            <div className="flex-1 space-y-3">
              <div>
                <p className="text-[11px] font-semibold text-[color:var(--muted-foreground)] uppercase tracking-wide">Origem</p>
                <p className="text-[14px] font-medium text-[color:var(--foreground)]">{ride.pickup_address}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold text-[color:var(--muted-foreground)] uppercase tracking-wide">Destino</p>
                <p className="text-[14px] font-medium text-[color:var(--foreground)]">{ride.dropoff_address}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Ações */}
        <div className="space-y-3 animate-ios-fade-up" style={{ animationDelay: '160ms' }}>
          <button
            type="button"
            onClick={() => router.push(`/uppi/driver`)}
            className="w-full h-[52px] bg-emerald-500 text-white font-bold text-[16px] rounded-[18px] ios-press shadow-lg shadow-emerald-500/20"
          >
            Buscar próxima corrida
          </button>
          <button
            type="button"
            onClick={() => router.push('/uppi/driver/history')}
            className="w-full h-[44px] bg-[color:var(--muted)] text-[color:var(--foreground)] font-semibold text-[14px] rounded-[16px] ios-press"
          >
            Ver histórico de corridas
          </button>
        </div>
      </main>
    </div>
  )
}
