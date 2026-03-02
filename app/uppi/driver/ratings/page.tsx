'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

interface ReviewItem {
  id: string
  rating: number
  comment?: string
  tags?: string[]
  created_at: string
  reviewer?: { full_name: string; avatar_url?: string }
}

export default function DriverRatingsPage() {
  const router = useRouter()
  const supabase = createClient()

  const [reviews, setReviews] = useState<ReviewItem[]>([])
  const [loading, setLoading] = useState(true)
  const [avgRating, setAvgRating] = useState(0)
  const [distribution, setDistribution] = useState([0, 0, 0, 0, 0])

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null

    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/onboarding/splash'); return }

      await loadRatings()

      // Real-time: listen for new reviews
      channel = supabase
        .channel(`driver-reviews-${user.id}`)
        .on('postgres_changes', {
          event: 'INSERT', schema: 'public', table: 'driver_reviews',
          filter: `driver_id=eq.${user.id}`,
        }, () => loadRatings())
        .subscribe()
    }

    init()
    return () => { channel && supabase.removeChannel(channel) }
  }, [])

  const loadRatings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/onboarding/splash'); return }

      const { data } = await supabase
        .from('driver_reviews')
        .select('*, reviewer:profiles!reviewer_id(full_name, avatar_url)')
        .eq('driver_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50)

      const list = data || []
      setReviews(list)

      if (list.length > 0) {
        const avg = list.reduce((s, r) => s + r.rating, 0) / list.length
        setAvgRating(avg)

        const dist = [0, 0, 0, 0, 0]
        list.forEach(r => { if (r.rating >= 1 && r.rating <= 5) dist[r.rating - 1]++ })
        setDistribution(dist)
      }
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (d: string) => {
    const date = new Date(d)
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  const starColor = (r: number) => {
    if (r >= 4.5) return 'text-emerald-500'
    if (r >= 3.5) return 'text-amber-500'
    return 'text-red-500'
  }

  if (loading) {
    return (
      <div className="h-dvh bg-[color:var(--background)] flex items-center justify-center">
        <div className="w-8 h-8 border-[2.5px] border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const maxDist = Math.max(...distribution, 1)

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
          <h1 className="text-[20px] font-bold text-[color:var(--foreground)] tracking-tight">Minhas Avaliações</h1>
        </div>
      </header>

      <main className="px-5 py-5 max-w-lg mx-auto">
        {/* Resumo */}
        <div className="bg-[color:var(--card)] rounded-[24px] p-5 mb-5 border border-[color:var(--border)] shadow-sm animate-ios-fade-up">
          <div className="flex items-center gap-5">
            <div className="text-center">
              <p className={cn('text-[46px] font-black tracking-tight leading-none', starColor(avgRating))}>
                {avgRating > 0 ? avgRating.toFixed(1) : '—'}
              </p>
              <div className="flex items-center justify-center gap-0.5 mt-1">
                {[1, 2, 3, 4, 5].map(s => (
                  <svg key={s} className={cn('w-4 h-4', s <= Math.round(avgRating) ? 'text-amber-400 fill-current' : 'text-[color:var(--border)] fill-current')} viewBox="0 0 20 20">
                    <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                  </svg>
                ))}
              </div>
              <p className="text-[12px] text-[color:var(--muted-foreground)] mt-1">{reviews.length} avaliações</p>
            </div>

            {/* Distribuição */}
            <div className="flex-1 space-y-1.5">
              {[5, 4, 3, 2, 1].map(star => {
                const count = distribution[star - 1]
                const pct = maxDist > 0 ? (count / maxDist) * 100 : 0
                return (
                  <div key={star} className="flex items-center gap-2">
                    <span className="text-[12px] font-semibold text-[color:var(--muted-foreground)] w-3 text-right">{star}</span>
                    <div className="flex-1 h-2 bg-[color:var(--muted)] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-400 rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-[11px] text-[color:var(--muted-foreground)] w-4 text-right">{count}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Lista */}
        {reviews.length === 0 ? (
          <div className="bg-[color:var(--card)] rounded-[24px] p-16 text-center border border-[color:var(--border)]">
            <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
              </svg>
            </div>
            <p className="text-[17px] font-bold text-[color:var(--foreground)]">Sem avaliações ainda</p>
            <p className="text-[14px] text-[color:var(--muted-foreground)] mt-1">Complete corridas para receber avaliações</p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-[12px] font-bold text-[color:var(--muted-foreground)] uppercase tracking-wider px-1">
              Avaliações recentes
            </p>
            {reviews.map((review, i) => (
              <div
                key={review.id}
                className="bg-[color:var(--card)] rounded-[20px] p-4 border border-[color:var(--border)] animate-ios-fade-up"
                style={{ animationDelay: `${i * 40}ms` }}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[color:var(--muted)] rounded-full flex items-center justify-center shrink-0">
                      <span className="text-[15px] font-bold text-[color:var(--foreground)]">
                        {review.reviewer?.full_name?.[0] || 'P'}
                      </span>
                    </div>
                    <div>
                      <p className="text-[14px] font-bold text-[color:var(--foreground)]">
                        {review.reviewer?.full_name || 'Passageiro'}
                      </p>
                      <p className="text-[12px] text-[color:var(--muted-foreground)]">{formatDate(review.created_at)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <svg className="w-4 h-4 text-amber-400 fill-current" viewBox="0 0 20 20">
                      <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                    </svg>
                    <span className="text-[15px] font-bold text-[color:var(--foreground)]">{review.rating}</span>
                  </div>
                </div>

                {review.comment && (
                  <p className="text-[13px] text-[color:var(--foreground)] leading-relaxed mb-2">
                    {review.comment}
                  </p>
                )}

                {review.tags && review.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {review.tags.map(tag => (
                      <span
                        key={tag}
                        className="px-2.5 py-1 bg-[color:var(--muted)] text-[color:var(--muted-foreground)] text-[11px] font-semibold rounded-full"
                      >
                        {tag.replace(/_/g, ' ')}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
