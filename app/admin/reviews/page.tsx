'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { AdminHeader } from '@/components/admin/admin-header'
import { Input } from '@/components/ui/input'
import { Star, Search, Trash2, Flag, User, Car, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Review {
  id: string
  ride_id: string
  reviewer_id: string
  reviewee_id: string
  rating: number
  comment: string | null
  tags: string[] | null
  review_type: string
  created_at: string
  reviewer?: { full_name: string; user_type: string } | null
  reviewee?: { full_name: string; user_type: string } | null
}

type RatingFilter = 'all' | '1' | '2' | '3' | '4' | '5'

const ratingColors: Record<number, string> = {
  1: 'text-red-400',
  2: 'text-orange-400',
  3: 'text-amber-400',
  4: 'text-yellow-400',
  5: 'text-emerald-400',
}

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([])
  const [search, setSearch] = useState('')
  const [ratingFilter, setRatingFilter] = useState<RatingFilter>('all')
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)

  const fetchReviews = useCallback(async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('reviews')
      .select('*, reviewer:profiles!reviews_reviewer_id_fkey(full_name, user_type), reviewee:profiles!reviews_reviewee_id_fkey(full_name, user_type)')
      .order('created_at', { ascending: false })
      .limit(300)
    if (data) setReviews(data)
    setLoading(false)
  }, [])

  useEffect(() => { fetchReviews() }, [fetchReviews])

  const deleteReview = async (id: string) => {
    setDeleting(id)
    const supabase = createClient()
    await supabase.from('reviews').delete().eq('id', id)
    await fetchReviews()
    setDeleting(null)
  }

  // KPIs
  const avgRating = reviews.length
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : '0.0'
  const lowRatingCount = reviews.filter(r => r.rating <= 2).length
  const withCommentCount = reviews.filter(r => r.comment && r.comment.trim()).length

  const ratingCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  for (const r of reviews) ratingCounts[r.rating] = (ratingCounts[r.rating] || 0) + 1

  const filtered = reviews.filter((r) => {
    if (ratingFilter !== 'all' && r.rating !== Number(ratingFilter)) return false
    if (search) {
      const q = search.toLowerCase()
      return (
        r.reviewer?.full_name?.toLowerCase().includes(q) ||
        r.reviewee?.full_name?.toLowerCase().includes(q) ||
        r.comment?.toLowerCase().includes(q) ||
        r.id.includes(q)
      )
    }
    return true
  })

  if (loading) {
    return (
      <>
        <AdminHeader title="Avaliacoes" subtitle="Carregando..." />
        <div className="flex-1 flex items-center justify-center bg-[hsl(var(--admin-bg))]">
          <div className="w-6 h-6 border-2 border-[hsl(var(--admin-green))] border-t-transparent rounded-full animate-spin" />
        </div>
      </>
    )
  }

  return (
    <>
      <AdminHeader
        title="Avaliacoes"
        subtitle={`${reviews.length} avaliacoes · media ${avgRating} estrelas`}
      />
      <div className="flex-1 overflow-hidden flex flex-col bg-[hsl(var(--admin-bg))]">
        {/* KPI row */}
        <div className="p-4 pb-0 grid grid-cols-2 md:grid-cols-4 gap-3 shrink-0">
          {[
            { label: 'Total', value: String(reviews.length), icon: Star, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
            { label: 'Media Geral', value: `${avgRating} / 5`, icon: TrendingUp, color: 'text-[hsl(var(--admin-green))]', bg: 'bg-[hsl(var(--admin-green))]/10' },
            { label: 'Notas Baixas (1-2)', value: String(lowRatingCount), icon: Flag, color: 'text-red-400', bg: 'bg-red-500/10' },
            { label: 'Com Comentario', value: String(withCommentCount), icon: User, color: 'text-blue-400', bg: 'bg-blue-500/10' },
          ].map((kpi) => (
            <div key={kpi.label} className="bg-[hsl(var(--admin-surface))] rounded-xl p-4 border border-[hsl(var(--admin-border))] flex items-center gap-3">
              <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0', kpi.bg)}>
                <kpi.icon className={cn('w-4 h-4', kpi.color)} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] text-slate-500 font-medium">{kpi.label}</p>
                <p className={cn('text-[16px] font-bold tabular-nums', kpi.color)}>{kpi.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Rating distribution bar */}
        <div className="mx-4 mt-3 bg-[hsl(var(--admin-surface))] rounded-xl border border-[hsl(var(--admin-border))] p-3 flex items-center gap-3 shrink-0">
          {[5, 4, 3, 2, 1].map((star) => (
            <div key={star} className="flex-1 flex items-center gap-1.5">
              <span className="text-[11px] text-slate-500 tabular-nums w-3">{star}</span>
              <Star className="w-3 h-3 text-yellow-400 fill-yellow-400 shrink-0" />
              <div className="flex-1 h-2 bg-[hsl(var(--admin-bg))] rounded-full overflow-hidden">
                <div
                  className="h-full bg-yellow-400/60 rounded-full transition-all"
                  style={{ width: reviews.length ? `${(ratingCounts[star] / reviews.length) * 100}%` : '0%' }}
                />
              </div>
              <span className="text-[10px] text-slate-600 tabular-nums w-6 text-right">{ratingCounts[star]}</span>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="p-4 pb-0 flex items-center gap-3 shrink-0">
          <div className="flex gap-1">
            {(['all', '5', '4', '3', '2', '1'] as RatingFilter[]).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setRatingFilter(f)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-colors flex items-center gap-1',
                  ratingFilter === f
                    ? 'bg-[hsl(var(--admin-green))]/15 text-[hsl(var(--admin-green))]'
                    : 'bg-[hsl(var(--admin-surface))] text-slate-400 hover:text-slate-200 border border-[hsl(var(--admin-border))]'
                )}
              >
                {f === 'all' ? 'Todas' : <><Star className="w-3 h-3 fill-current" /> {f}</>}
              </button>
            ))}
          </div>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
            <Input
              placeholder="Buscar por nome ou comentario..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-9 rounded-xl bg-[hsl(var(--admin-surface))] border-[hsl(var(--admin-border))] text-slate-200 placeholder:text-slate-600 text-[12px]"
            />
          </div>
        </div>

        {/* Reviews list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-slate-600">
              <Star className="w-10 h-10 mb-2 opacity-30" />
              <p className="text-[14px]">Nenhuma avaliacao encontrada</p>
            </div>
          )}
          {filtered.map((review) => (
            <div key={review.id} className="bg-[hsl(var(--admin-surface))] rounded-xl border border-[hsl(var(--admin-border))] p-4">
              <div className="flex items-start gap-3">
                {/* Stars */}
                <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-[15px] font-bold bg-yellow-500/10', ratingColors[review.rating])}>
                  {review.rating}
                </div>
                <div className="flex-1 min-w-0">
                  {/* Stars row */}
                  <div className="flex items-center gap-0.5 mb-2">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={cn('w-4 h-4', s <= review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-slate-700')}
                      />
                    ))}
                    <span className="ml-2 text-[11px] text-slate-500 tabular-nums">
                      {new Date(review.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  {/* Participants */}
                  <div className="flex items-center gap-2 text-[12px] text-slate-400 mb-2 flex-wrap">
                    <span className="flex items-center gap-1">
                      {review.reviewer?.user_type === 'driver' ? <Car className="w-3 h-3 text-emerald-400" /> : <User className="w-3 h-3 text-blue-400" />}
                      <span className="text-slate-300 font-medium">{review.reviewer?.full_name || 'Avaliador'}</span>
                    </span>
                    <span className="text-slate-600">avaliou</span>
                    <span className="flex items-center gap-1">
                      {review.reviewee?.user_type === 'driver' ? <Car className="w-3 h-3 text-emerald-400" /> : <User className="w-3 h-3 text-blue-400" />}
                      <span className="text-slate-300 font-medium">{review.reviewee?.full_name || 'Avaliado'}</span>
                    </span>
                  </div>
                  {/* Comment */}
                  {review.comment && (
                    <p className="text-[13px] text-slate-300 bg-[hsl(var(--admin-bg))]/60 rounded-lg px-3 py-2 mb-2 leading-relaxed italic">
                      "{review.comment}"
                    </p>
                  )}
                  {/* Tags */}
                  {review.tags && review.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {review.tags.map((tag) => (
                        <span key={tag} className="px-2 py-0.5 rounded-full bg-[hsl(var(--admin-bg))] border border-[hsl(var(--admin-border))] text-[10px] text-slate-400">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  <p className="text-[10px] text-slate-700 font-mono">ID: {review.id.slice(0, 12)}...</p>
                </div>
                {/* Actions */}
                <button
                  type="button"
                  onClick={() => deleteReview(review.id)}
                  disabled={deleting === review.id}
                  className="w-8 h-8 rounded-lg bg-red-500/10 hover:bg-red-500/20 flex items-center justify-center shrink-0 transition-colors"
                  title="Remover avaliacao"
                >
                  {deleting === review.id
                    ? <div className="w-3.5 h-3.5 border border-red-400 border-t-transparent rounded-full animate-spin" />
                    : <Trash2 className="w-3.5 h-3.5 text-red-400" />}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
