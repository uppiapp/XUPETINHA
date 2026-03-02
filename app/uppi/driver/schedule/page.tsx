'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import type { ScheduledRide } from '@/lib/types/database'

interface ScheduledRideWithPassenger extends ScheduledRide {
  passenger?: { full_name: string; avatar_url?: string }
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: 'Pendente', color: 'text-amber-600', bg: 'bg-amber-50' },
  confirmed: { label: 'Confirmado', color: 'text-emerald-600', bg: 'bg-emerald-50' },
  cancelled: { label: 'Cancelado', color: 'text-red-600', bg: 'bg-red-50' },
  completed: { label: 'Concluído', color: 'text-blue-600', bg: 'bg-blue-50' },
}

export default function DriverSchedulePage() {
  const router = useRouter()
  const supabase = createClient()

  const [rides, setRides] = useState<ScheduledRideWithPassenger[]>([])
  const [loading, setLoading] = useState(true)
  const [confirming, setConfirming] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming')

  const loadScheduledRides = useCallback(async (uid: string) => {
    try {
      const now = new Date().toISOString()
      let query = supabase
        .from('scheduled_rides')
        .select('*, passenger:profiles!scheduled_rides_passenger_id_fkey(full_name, avatar_url)')
        .order('scheduled_at', { ascending: tab === 'upcoming' })

      if (tab === 'upcoming') {
        query = query.gte('scheduled_at', now).in('status', ['pending', 'confirmed'])
      } else {
        query = query.lt('scheduled_at', now)
      }

      const { data } = await query
      setRides((data as ScheduledRideWithPassenger[]) || [])
    } finally {
      setLoading(false)
    }
  }, [tab])

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/onboarding/splash'); return }
      setUserId(user.id)
      await loadScheduledRides(user.id)
    }
    init()
  }, [tab])

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('driver-scheduled-rides')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'scheduled_rides' }, () => {
        if (userId) loadScheduledRides(userId)
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [userId, tab])

  const handleConfirm = async (rideId: string) => {
    setConfirming(rideId)
    try {
      await supabase
        .from('scheduled_rides')
        .update({ status: 'confirmed' })
        .eq('id', rideId)
      setRides(prev => prev.map(r => r.id === rideId ? { ...r, status: 'confirmed' } : r))
    } finally {
      setConfirming(null)
    }
  }

  const formatDate = (iso: string) => {
    const d = new Date(iso)
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(today.getDate() + 1)

    if (d.toDateString() === today.toDateString()) return 'Hoje'
    if (d.toDateString() === tomorrow.toDateString()) return 'Amanhã'
    return d.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' })
  }

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

  if (loading) {
    return (
      <div className="h-dvh bg-[color:var(--background)] flex items-center justify-center">
        <div className="w-8 h-8 border-[2.5px] border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="h-dvh overflow-y-auto bg-[color:var(--background)] pb-8 ios-scroll">
      {/* Header */}
      <header className="bg-[color:var(--card)]/80 ios-blur border-b border-[color:var(--border)] sticky top-0 z-30">
        <div className="px-5 pt-safe-offset-4 pb-3 flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-[color:var(--muted)] ios-press"
          >
            <svg className="w-5 h-5 text-[color:var(--foreground)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex-1">
            <h1 className="text-[20px] font-bold text-[color:var(--foreground)] tracking-tight">Agendamentos</h1>
            <p className="text-[13px] text-[color:var(--muted-foreground)]">Corridas programadas</p>
          </div>
          <div className="text-right">
            <span className="text-[13px] font-bold text-emerald-600">
              {rides.filter(r => r.status === 'pending').length} pendentes
            </span>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-5 pb-3 flex gap-2">
          {(['upcoming', 'past'] as const).map(t => (
            <button
              key={t}
              type="button"
              onClick={() => { setTab(t); setLoading(true) }}
              className={cn(
                'flex-1 py-2 rounded-[12px] text-[13px] font-bold transition-colors ios-press',
                tab === t
                  ? 'bg-emerald-500 text-white'
                  : 'bg-[color:var(--muted)] text-[color:var(--muted-foreground)]'
              )}
            >
              {t === 'upcoming' ? 'Próximos' : 'Histórico'}
            </button>
          ))}
        </div>
      </header>

      <main className="px-5 py-5 max-w-lg mx-auto space-y-3">
        {rides.length === 0 ? (
          <div className="bg-[color:var(--card)] rounded-[24px] p-16 text-center border border-[color:var(--border)]">
            <div className="w-20 h-20 bg-[color:var(--muted)] rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-[color:var(--muted-foreground)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-[18px] font-bold text-[color:var(--foreground)] mb-1.5">
              {tab === 'upcoming' ? 'Sem agendamentos' : 'Sem histórico'}
            </p>
            <p className="text-[14px] text-[color:var(--muted-foreground)]">
              {tab === 'upcoming'
                ? 'Quando passageiros agendarem corridas, aparecerão aqui'
                : 'Suas corridas agendadas passadas aparecerão aqui'
              }
            </p>
          </div>
        ) : (
          rides.map((ride, i) => {
            const sc = STATUS_CONFIG[ride.status] || STATUS_CONFIG.pending
            const isConfirmable = ride.status === 'pending'
            const timeUntil = new Date(ride.scheduled_at).getTime() - Date.now()
            const hoursUntil = Math.floor(timeUntil / 3600000)
            const minutesUntil = Math.floor((timeUntil % 3600000) / 60000)
            const isUrgent = timeUntil > 0 && timeUntil < 3600000 // less than 1h

            return (
              <div
                key={ride.id}
                className={cn(
                  'bg-[color:var(--card)] rounded-[24px] p-5 border animate-ios-fade-up relative overflow-hidden',
                  isUrgent ? 'border-amber-300' : 'border-[color:var(--border)]'
                )}
                style={{ animationDelay: `${i * 50}ms` }}
              >
                {isUrgent && (
                  <div className="absolute top-0 left-0 right-0 h-1 bg-amber-400 rounded-t-[24px]" />
                )}

                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center shrink-0">
                      <span className="text-[18px] font-black text-emerald-700">
                        {ride.passenger?.full_name?.[0] || 'P'}
                      </span>
                    </div>
                    <div>
                      <p className="text-[16px] font-bold text-[color:var(--foreground)]">
                        {ride.passenger?.full_name || 'Passageiro'}
                      </p>
                      {isUrgent ? (
                        <p className="text-[12px] font-bold text-amber-600 animate-pulse">
                          Menos de {hoursUntil > 0 ? `${hoursUntil}h` : `${minutesUntil}min`}!
                        </p>
                      ) : (
                        <p className="text-[12px] text-[color:var(--muted-foreground)]">
                          {timeUntil > 0
                            ? `Em ${hoursUntil > 0 ? `${hoursUntil}h ${minutesUntil}min` : `${minutesUntil}min`}`
                            : 'Passado'
                          }
                        </p>
                      )}
                    </div>
                  </div>
                  <span className={cn('text-[11px] font-bold px-2.5 py-1 rounded-full', sc.bg, sc.color)}>
                    {sc.label}
                  </span>
                </div>

                {/* Data e hora */}
                <div className="flex items-center gap-3 mb-4 p-3 bg-[color:var(--muted)] rounded-[14px]">
                  <svg className="w-5 h-5 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <div>
                    <p className="text-[15px] font-black text-[color:var(--foreground)]">
                      {formatDate(ride.scheduled_at)} às {formatTime(ride.scheduled_at)}
                    </p>
                  </div>
                </div>

                {/* Rota */}
                <div className="flex gap-3 mb-4">
                  <div className="flex flex-col items-center gap-1 pt-1">
                    <div className="w-2 h-2 bg-blue-500 rounded-full shrink-0" />
                    <div className="w-px flex-1 bg-[color:var(--border)] min-h-[20px]" />
                    <div className="w-2 h-2 bg-orange-500 rounded-full shrink-0" />
                  </div>
                  <div className="flex-1 space-y-2 min-w-0">
                    <p className="text-[13px] font-medium text-[color:var(--foreground)] truncate">{ride.origin_address}</p>
                    <p className="text-[13px] font-medium text-[color:var(--foreground)] truncate">{ride.dest_address}</p>
                  </div>
                </div>

                {/* Preço */}
                {ride.estimated_price && (
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[13px] text-[color:var(--muted-foreground)]">Valor estimado</span>
                    <span className="text-[18px] font-black text-emerald-600">R$ {ride.estimated_price.toFixed(2)}</span>
                  </div>
                )}

                {/* Ações */}
                {isConfirmable && (
                  <button
                    type="button"
                    onClick={() => handleConfirm(ride.id)}
                    disabled={confirming === ride.id}
                    className="w-full h-[48px] bg-emerald-500 text-white font-bold text-[15px] rounded-[16px] ios-press shadow-md shadow-emerald-500/20 flex items-center justify-center"
                  >
                    {confirming === ride.id
                      ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      : 'Confirmar disponibilidade'
                    }
                  </button>
                )}
                {ride.status === 'confirmed' && timeUntil > 0 && timeUntil < 7200000 && (
                  <button
                    type="button"
                    onClick={() => router.push(`/uppi/ride/${ride.ride_id}/tracking`)}
                    className="w-full h-[48px] bg-blue-500 text-white font-bold text-[15px] rounded-[16px] ios-press shadow-md shadow-blue-500/20"
                  >
                    Iniciar corrida agendada
                  </button>
                )}
              </div>
            )
          })
        )}
      </main>
    </div>
  )
}
