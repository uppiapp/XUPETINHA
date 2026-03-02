'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import type { Ride, Profile } from '@/lib/types/database'

interface RideWithPassenger extends Ride {
  passenger?: Pick<Profile, 'full_name' | 'avatar_url'>
}

export default function DriverHistoryPage() {
  const router = useRouter()
  const supabase = createClient()

  const [rides, setRides] = useState<RideWithPassenger[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'completed' | 'cancelled'>('all')
  const [totalEarnings, setTotalEarnings] = useState(0)
  const [userId, setUserId] = useState<string | null>(null)

  const loadHistory = useCallback(async (uid?: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const id = uid || user?.id
      if (!id) { router.push('/onboarding/splash'); return }
      if (!userId) setUserId(id)

      const { data } = await supabase
        .from('rides')
        .select('*, passenger:profiles!passenger_id(full_name, avatar_url)')
        .eq('driver_id', id)
        .order('created_at', { ascending: false })
        .limit(100)

      setRides(data || [])
      const earnings = (data || [])
        .filter(r => r.status === 'completed')
        .reduce((s, r) => s + (r.final_price || 0) * 0.85, 0)
      setTotalEarnings(earnings)
    } finally {
      setLoading(false)
    }
  }, [supabase, router, userId])

  useEffect(() => {
    let uid: string | null = null

    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/onboarding/splash'); return }
      uid = user.id
      setUserId(user.id)
      await loadHistory(user.id)

      // Real-time subscription — listen for any ride updates for this driver
      const channel = supabase
        .channel(`driver-history-${user.id}`)
        .on('postgres_changes', {
          event: 'UPDATE', schema: 'public', table: 'rides',
          filter: `driver_id=eq.${user.id}`,
        }, () => loadHistory(user.id))
        .subscribe()

      return () => { supabase.removeChannel(channel) }
    }

    init()
  }, [])



  const filtered = filter === 'all' ? rides
    : rides.filter(r => r.status === filter)

  const statusCfg: Record<string, { label: string; color: string; bg: string }> = {
    completed:   { label: 'Concluída',    color: 'text-emerald-600', bg: 'bg-emerald-50' },
    cancelled:   { label: 'Cancelada',    color: 'text-red-500',     bg: 'bg-red-50' },
    in_progress: { label: 'Em andamento', color: 'text-blue-600',    bg: 'bg-blue-50' },
    accepted:    { label: 'Aceita',       color: 'text-amber-600',   bg: 'bg-amber-50' },
    pending:     { label: 'Pendente',     color: 'text-neutral-500', bg: 'bg-neutral-100' },
    negotiating: { label: 'Negociando',   color: 'text-purple-600',  bg: 'bg-purple-50' },
  }

  const formatDate = (d: string) => {
    const date = new Date(d)
    const now = new Date()
    const diff = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
    if (diff === 0) return `Hoje · ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
    if (diff === 1) return `Ontem · ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
  }

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
          <h1 className="text-[20px] font-bold text-[color:var(--foreground)] tracking-tight">Histórico de Corridas</h1>
        </div>
      </header>

      <main className="px-5 py-5 max-w-lg mx-auto">
        {/* Earnings summary */}
        <div className="bg-emerald-500 rounded-[24px] p-5 mb-5 shadow-lg shadow-emerald-500/20 animate-ios-fade-up">
          <p className="text-[12px] font-bold text-white/70 uppercase tracking-wider">Total ganho (líquido)</p>
          <p className="text-[34px] font-black text-white tracking-tight leading-none mt-1">
            R$ {totalEarnings.toFixed(2)}
          </p>
          <p className="text-[13px] text-white/70 mt-1">
            {rides.filter(r => r.status === 'completed').length} corridas concluídas
          </p>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-5">
          {(['all', 'completed', 'cancelled'] as const).map(f => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={cn(
                'flex-1 h-9 rounded-[12px] text-[13px] font-semibold ios-press transition-colors',
                filter === f
                  ? 'bg-emerald-500 text-white'
                  : 'bg-[color:var(--muted)] text-[color:var(--muted-foreground)]'
              )}
            >
              {f === 'all' ? 'Todas' : f === 'completed' ? 'Concluídas' : 'Canceladas'}
            </button>
          ))}
        </div>

        {/* List */}
        {filtered.length === 0 ? (
          <div className="bg-[color:var(--card)] rounded-[24px] p-16 text-center border border-[color:var(--border)]">
            <div className="w-16 h-16 bg-[color:var(--muted)] rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-[color:var(--muted-foreground)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <p className="text-[17px] font-bold text-[color:var(--foreground)]">Nenhuma corrida</p>
            <p className="text-[14px] text-[color:var(--muted-foreground)] mt-1">Suas corridas aparecerão aqui</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((ride, i) => {
              const st = statusCfg[ride.status] || statusCfg.pending
              return (
                <div
                  key={ride.id}
                  className="bg-[color:var(--card)] rounded-[20px] p-4 border border-[color:var(--border)] animate-ios-fade-up"
                  style={{ animationDelay: `${i * 40}ms` }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center shrink-0">
                        <span className="text-[15px] font-bold text-emerald-700">
                          {ride.passenger?.full_name?.[0] || 'P'}
                        </span>
                      </div>
                      <div>
                        <p className="text-[15px] font-bold text-[color:var(--foreground)]">
                          {ride.passenger?.full_name || 'Passageiro'}
                        </p>
                        <p className="text-[12px] text-[color:var(--muted-foreground)]">{formatDate(ride.completed_at || ride.created_at)}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      {ride.final_price ? (
                        <p className="text-[17px] font-black text-emerald-600">
                          R$ {((ride.final_price || 0) * 0.85).toFixed(2)}
                        </p>
                      ) : null}
                      <span className={cn('text-[11px] font-bold px-2 py-0.5 rounded-full', st.bg, st.color)}>
                        {st.label}
                      </span>
                    </div>
                  </div>

                  {/* Rota resumida */}
                  <div className="flex gap-2.5 pl-1">
                    <div className="flex flex-col items-center gap-0.5 pt-1">
                      <div className="w-2 h-2 bg-blue-500 rounded-full" />
                      <div className="w-px flex-1 bg-[color:var(--border)] min-h-[16px]" />
                      <div className="w-2 h-2 bg-orange-500 rounded-full" />
                    </div>
                    <div className="flex-1 space-y-1.5 min-w-0">
                      <p className="text-[12px] text-[color:var(--muted-foreground)] truncate">{ride.pickup_address}</p>
                      <p className="text-[12px] text-[color:var(--muted-foreground)] truncate">{ride.dropoff_address}</p>
                    </div>
                  </div>

                  {ride.distance_km && (
                    <p className="text-[11px] text-[color:var(--muted-foreground)] mt-2 pl-1">
                      {ride.distance_km} km
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
