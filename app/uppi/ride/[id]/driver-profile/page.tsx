'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import type { Profile, DriverProfile, Ride } from '@/lib/types/database'

interface ReviewItem {
  id: string
  rating: number
  comment?: string
  tags?: string[]
  created_at: string
}

const VEHICLE_LABELS: Record<string, string> = {
  economy: 'Carro Econômico', electric: 'Elétrico',
  premium: 'Premium', suv: 'SUV', moto: 'Moto',
}

export default function DriverProfilePage() {
  const params = useParams()
  const router = useRouter()
  const supabase = createClient()
  const rideId = params.id as string

  const [ride, setRide] = useState<Ride | null>(null)
  const [driver, setDriver] = useState<Profile | null>(null)
  const [driverProfile, setDriverProfile] = useState<DriverProfile | null>(null)
  const [reviews, setReviews] = useState<ReviewItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()

    // Real-time: listen for ride updates (driver assignment, status changes)
    const channel = supabase
      .channel(`ride-driver-profile-${rideId}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'rides',
        filter: `id=eq.${rideId}`,
      }, () => loadData())
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [rideId])

  const loadData = async () => {
    try {
      const { data: rideData } = await supabase
        .from('rides')
        .select('*')
        .eq('id', rideId)
        .single()

      if (!rideData || !rideData.driver_id) { router.back(); return }
      setRide(rideData)

      const driverId = rideData.driver_id

      const [{ data: prof }, { data: drvProf }, { data: revs }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', driverId).single(),
        supabase.from('driver_profiles').select('*').eq('id', driverId).single(),
        supabase.from('driver_reviews')
          .select('id, rating, comment, tags, created_at')
          .eq('driver_id', driverId)
          .eq('is_public', true)
          .order('created_at', { ascending: false })
          .limit(5),
      ])

      setDriver(prof)
      setDriverProfile(drvProf)
      setReviews(revs || [])
    } finally {
      setLoading(false)
    }
  }

  const avgRating = reviews.length > 0
    ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
    : driverProfile?.rating || 5

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })

  if (loading) {
    return (
      <div className="h-dvh bg-[color:var(--background)] flex items-center justify-center">
        <div className="w-8 h-8 border-[2.5px] border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!driver) return null

  return (
    <div className="h-dvh overflow-y-auto bg-[color:var(--background)] pb-8 ios-scroll">
      {/* Hero com foto e gradiente */}
      <div className="relative bg-emerald-500 px-5 pb-8 pt-safe-offset-4">
        <button
          type="button"
          onClick={() => router.back()}
          className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center mb-5 ios-press"
        >
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <div className="flex items-end gap-4">
          <div className="w-20 h-20 bg-white/20 rounded-full border-4 border-white/40 flex items-center justify-center shadow-xl shrink-0">
            {driver.avatar_url ? (
              <img src={driver.avatar_url} alt={driver.full_name} className="w-full h-full rounded-full object-cover" />
            ) : (
              <span className="text-[30px] font-black text-white">{driver.full_name?.[0]}</span>
            )}
          </div>
          <div className="flex-1 pb-1 min-w-0">
            <h1 className="text-[22px] font-black text-white tracking-tight leading-tight truncate">{driver.full_name}</h1>
            <div className="flex items-center gap-1.5 mt-1">
              <svg className="w-4 h-4 text-white fill-current" viewBox="0 0 20 20">
                <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
              </svg>
              <span className="text-[16px] font-bold text-white">{avgRating.toFixed(1)}</span>
              <span className="text-[13px] text-white/70">· {driverProfile?.total_rides || 0} corridas</span>
            </div>
          </div>
        </div>
      </div>

      <main className="px-5 -mt-4 space-y-4 max-w-lg mx-auto">
        {/* Veículo */}
        {driverProfile && (
          <div className="bg-[color:var(--card)] rounded-[24px] p-5 border border-[color:var(--border)] shadow-sm animate-ios-fade-up">
            <p className="text-[12px] font-bold text-[color:var(--muted-foreground)] uppercase tracking-wider mb-3">Veículo</p>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-[color:var(--muted)] rounded-[14px] flex items-center justify-center shrink-0">
                <svg className="w-6 h-6 text-[color:var(--muted-foreground)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[16px] font-bold text-[color:var(--foreground)]">
                  {driverProfile.vehicle_brand} {driverProfile.vehicle_model}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  {driverProfile.vehicle_color && (
                    <span className="text-[13px] text-[color:var(--muted-foreground)] capitalize">{driverProfile.vehicle_color}</span>
                  )}
                  {driverProfile.vehicle_plate && (
                    <>
                      <span className="text-[color:var(--muted-foreground)]/30">·</span>
                      <span className="text-[13px] font-mono font-bold text-[color:var(--muted-foreground)] tracking-widest uppercase bg-[color:var(--muted)] px-2 py-0.5 rounded-md">
                        {driverProfile.vehicle_plate}
                      </span>
                    </>
                  )}
                </div>
                {driverProfile.vehicle_type && (
                  <span className="inline-block mt-1.5 text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                    {VEHICLE_LABELS[driverProfile.vehicle_type] || driverProfile.vehicle_type}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Stats do motorista */}
        <div className="grid grid-cols-3 gap-3 animate-ios-fade-up" style={{ animationDelay: '60ms' }}>
          {[
            { label: 'Avaliação', value: avgRating.toFixed(1), sub: 'média' },
            { label: 'Corridas', value: String(driverProfile?.total_rides || 0), sub: 'total' },
            { label: 'Aceitação', value: '95%', sub: 'taxa' },
          ].map(s => (
            <div key={s.label} className="bg-[color:var(--card)] rounded-[20px] p-4 text-center border border-[color:var(--border)]">
              <p className="text-[22px] font-black text-[color:var(--foreground)] tracking-tight leading-none">{s.value}</p>
              <p className="text-[11px] text-[color:var(--muted-foreground)] mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Ações */}
        {ride && (
          <div className="flex gap-3 animate-ios-fade-up" style={{ animationDelay: '80ms' }}>
            <a
              href={`tel:${driver.phone}`}
              className="flex-1 h-12 bg-emerald-500 text-white font-bold text-[15px] rounded-[16px] ios-press shadow-md shadow-emerald-500/20 flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
              </svg>
              Ligar
            </a>
            <button
              type="button"
              onClick={() => router.push(`/uppi/ride/${rideId}/chat`)}
              className="flex-1 h-12 bg-[color:var(--muted)] text-[color:var(--foreground)] font-bold text-[15px] rounded-[16px] ios-press flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              Mensagem
            </button>
            <button
              type="button"
              onClick={() => router.push(`/uppi/ride/${rideId}/cancel`)}
              className="w-12 h-12 bg-red-50 text-red-500 rounded-[16px] ios-press flex items-center justify-center"
              aria-label="Cancelar corrida"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Avaliações recentes */}
        {reviews.length > 0 && (
          <div className="animate-ios-fade-up" style={{ animationDelay: '120ms' }}>
            <p className="text-[12px] font-bold text-[color:var(--muted-foreground)] uppercase tracking-wider mb-3 px-1">
              Avaliações recentes
            </p>
            <div className="space-y-3">
              {reviews.map((review, i) => (
                <div
                  key={review.id}
                  className="bg-[color:var(--card)] rounded-[20px] p-4 border border-[color:var(--border)] animate-ios-fade-up"
                  style={{ animationDelay: `${(i + 3) * 40}ms` }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map(s => (
                        <svg key={s} className={cn('w-3.5 h-3.5', s <= review.rating ? 'text-amber-400 fill-current' : 'text-[color:var(--border)] fill-current')} viewBox="0 0 20 20">
                          <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                        </svg>
                      ))}
                    </div>
                    <span className="text-[12px] text-[color:var(--muted-foreground)]">{formatDate(review.created_at)}</span>
                  </div>
                  {review.comment && (
                    <p className="text-[13px] text-[color:var(--foreground)] leading-relaxed">{review.comment}</p>
                  )}
                  {review.tags && review.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {review.tags.map(tag => (
                        <span key={tag} className="text-[11px] font-semibold text-[color:var(--muted-foreground)] bg-[color:var(--muted)] px-2 py-0.5 rounded-full">
                          {tag.replace(/_/g, ' ')}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
