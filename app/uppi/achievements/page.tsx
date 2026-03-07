'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { JSX } from 'react'
import { iosToast } from '@/lib/utils/ios-toast'
import { EmptyState } from '@/components/empty-state'

interface Achievement {
  id: string
  title: string
  description: string
  icon: string
  category: 'rides' | 'savings' | 'social' | 'loyalty'
  threshold: number
  unlocked: boolean
  progress: number
  unlockedAt?: string
}

interface UserStats {
  totalRides: number
  totalSaved: number
  totalSpent: number
  avgRating: number
  referrals: number
  streak: number // consecutive days with rides
  nightRides: number
  weekendRides: number
}

function getAchievements(stats: UserStats): Achievement[] {
  const defs: Omit<Achievement, 'unlocked' | 'progress'>[] = [
    // Rides milestones
    { id: 'first-ride', title: 'Primeira Corrida', description: 'Complete sua primeira corrida', icon: 'flag', category: 'rides', threshold: 1 },
    { id: 'rides-10', title: 'Explorador', description: 'Complete 10 corridas', icon: 'compass', category: 'rides', threshold: 10 },
    { id: 'rides-50', title: 'Viajante', description: 'Complete 50 corridas', icon: 'road', category: 'rides', threshold: 50 },
    { id: 'rides-100', title: 'Veterano', description: 'Complete 100 corridas', icon: 'trophy', category: 'rides', threshold: 100 },
    { id: 'rides-500', title: 'Lenda do Asfalto', description: 'Complete 500 corridas', icon: 'crown', category: 'rides', threshold: 500 },

    // Savings
    { id: 'save-50', title: 'Economista', description: 'Economize R$50 negociando', icon: 'piggy', category: 'savings', threshold: 50 },
    { id: 'save-200', title: 'Pao Duro', description: 'Economize R$200 negociando', icon: 'money', category: 'savings', threshold: 200 },
    { id: 'save-1000', title: 'Mestre da Negociacao', description: 'Economize R$1.000 negociando', icon: 'diamond', category: 'savings', threshold: 1000 },

    // Social
    { id: 'rating-high', title: 'Cinco Estrelas', description: 'Mantenha avaliacao acima de 4.8', icon: 'star', category: 'social', threshold: 1 },
    { id: 'night-owl', title: 'Coruja Noturna', description: 'Faca 10 corridas a noite', icon: 'moon', category: 'social', threshold: 10 },
    { id: 'weekend-warrior', title: 'Fim de Semana', description: 'Faca 20 corridas nos finais de semana', icon: 'party', category: 'social', threshold: 20 },

    // Loyalty
    { id: 'streak-7', title: 'Sequencia de 7', description: 'Use o Uppi 7 dias seguidos', icon: 'fire', category: 'loyalty', threshold: 7 },
    { id: 'streak-30', title: 'Fiel', description: 'Use o Uppi 30 dias seguidos', icon: 'medal', category: 'loyalty', threshold: 30 },
  ]

  return defs.map(def => {
    let currentValue = 0
    switch (def.id) {
      case 'first-ride': case 'rides-10': case 'rides-50': case 'rides-100': case 'rides-500':
        currentValue = stats.totalRides; break
      case 'save-50': case 'save-200': case 'save-1000':
        currentValue = stats.totalSaved; break
      case 'rating-high':
        currentValue = stats.avgRating >= 4.8 ? 1 : 0; break
      case 'night-owl':
        currentValue = stats.nightRides; break
      case 'weekend-warrior':
        currentValue = stats.weekendRides; break
      case 'streak-7': case 'streak-30':
        currentValue = stats.streak; break
    }

    return {
      ...def,
      unlocked: currentValue >= def.threshold,
      progress: Math.min(1, currentValue / def.threshold),
    }
  })
}

function AchievementIcon({ icon, unlocked, size = 'md' }: { icon: string; unlocked: boolean; size?: 'sm' | 'md' | 'lg' }) {
  const sizeClass = size === 'lg' ? 'w-7 h-7' : size === 'sm' ? 'w-4 h-4' : 'w-5 h-5'
  const colorClass = unlocked ? 'text-white' : 'text-neutral-400'

  const icons: Record<string, JSX.Element> = {
    flag: <svg className={sizeClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2z" /></svg>,
    compass: <svg className={sizeClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="10" /><path d="M16.24 7.76l-2.12 6.36-6.36 2.12 2.12-6.36 6.36-2.12z" /></svg>,
    road: <svg className={sizeClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>,
    trophy: <svg className={sizeClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 15V17M6 3H18M6 3V8C6 11.3137 8.68629 14 12 14C15.3137 14 18 11.3137 18 8V3M6 3H4C4 5 3 8 3 8M18 3H20C20 5 21 8 21 8M8 21H16M12 17V21" /></svg>,
    crown: <svg className={sizeClass} viewBox="0 0 24 24" fill="currentColor"><path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5z" /><path d="M5 19h14a1 1 0 001-1H4a1 1 0 001 1z" /></svg>,
    piggy: <svg className={sizeClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2z" /></svg>,
    money: <svg className={sizeClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2z" /></svg>,
    diamond: <svg className={sizeClass} viewBox="0 0 24 24" fill="currentColor"><path d="M6 2L2 8l10 13L22 8l-5-4.87 1.18 6.88L12 17.77l-6.18 3.25L6 2z" /><path d="M6 2h3l-2 4-3-4h2zm5 2.5L13 2h-2l2 4.5zM4.5 8l3-4L9 8H4.5zm10.5 0l1.5-4 3 4h-4.5zM12 19l-6-9h4l2 6 2-6h4l-6 9z" /></svg>,
    star: <svg className={sizeClass} viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>,
    moon: <svg className={sizeClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>,
    party: <svg className={sizeClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>,
    fire: <svg className={sizeClass} viewBox="0 0 24 24" fill="currentColor"><path d="M12 23c-3.866 0-7-3.134-7-7 0-3.037 1.888-5.647 4.5-6.72C9.5 7.62 10 5.5 12 2c2 3.5 2.5 5.62 2.5 7.28C17.112 10.353 19 12.963 19 16c0 3.866-3.134 7-7 7zm0-2c2.761 0 5-2.239 5-5 0-2.07-1.272-3.883-3.128-4.735C13.362 12.1 13 13.5 12 15c-1-1.5-1.362-2.9-1.872-3.735C8.272 12.117 7 13.93 7 16c0 2.761 2.239 5 5 5z" /></svg>,
    medal: <svg className={sizeClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" /></svg>,
  }

  return <span className={colorClass}>{icons[icon] || icons.star}</span>
}

const categoryLabels: Record<string, { name: string; color: string }> = {
  rides: { name: 'Corridas', color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-400' },
  savings: { name: 'Economia', color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400' },
  social: { name: 'Social', color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400' },
  loyalty: { name: 'Fidelidade', color: 'text-red-600 bg-red-50 dark:bg-red-900/30 dark:text-red-400' },
}

const categoryBgMap: Record<string, string> = {
  rides: 'bg-blue-500',
  savings: 'bg-emerald-500',
  social: 'bg-amber-500',
  loyalty: 'bg-red-500',
}

export default function AchievementsPage() {
  const router = useRouter()
  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [stats, setStats] = useState<UserStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    const supabase = createClient()
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      const { data: profile } = await supabase
        .from('profiles')
        .select('rating, total_rides')
        .eq('id', user.id)
        .single()

      const { data: rides } = await supabase
        .from('rides')
        .select('final_price, passenger_price_offer, created_at, status')
        .eq('passenger_id', user.id)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })

      const totalRides = profile?.total_rides || rides?.length || 0
      const totalSaved = (rides || []).reduce((sum, r) => {
        const saved = (r.passenger_price_offer || 0) - (r.final_price || 0)
        return sum + (saved > 0 ? saved : 0)
      }, 0)
      const totalSpent = (rides || []).reduce((sum, r) => sum + (r.final_price || 0), 0)

      // Calculate night rides (after 22h or before 6h)
      const nightRides = (rides || []).filter(r => {
        const h = new Date(r.created_at).getHours()
        return h >= 22 || h < 6
      }).length

      // Weekend rides
      const weekendRides = (rides || []).filter(r => {
        const d = new Date(r.created_at).getDay()
        return d === 0 || d === 6
      }).length

      // Calculate streak
      const dates = [...new Set((rides || []).map(r =>
        new Date(r.created_at).toISOString().split('T')[0]
      ))].sort().reverse()

      let streak = 0
      if (dates.length > 0) {
        const today = new Date().toISOString().split('T')[0]
        let checkDate = today
        for (const date of dates) {
          if (date === checkDate || date === getPrevDate(checkDate)) {
            streak++
            checkDate = date
          } else {
            break
          }
        }
      }

      const userStats: UserStats = {
        totalRides,
        totalSaved,
        totalSpent,
        avgRating: profile?.rating || 5,
        referrals: 0,
        streak,
        nightRides,
        weekendRides,
      }

      setStats(userStats)
      setAchievements(getAchievements(userStats))
    } catch (e) {
      console.error('Error loading achievements:', e)
    }
    setLoading(false)
  }

  function getPrevDate(dateStr: string): string {
    const d = new Date(dateStr)
    d.setDate(d.getDate() - 1)
    return d.toISOString().split('T')[0]
  }

  const unlockedCount = achievements.filter(a => a.unlocked).length
  const totalCount = achievements.length
  const overallProgress = totalCount > 0 ? unlockedCount / totalCount : 0

  const filtered = selectedCategory
    ? achievements.filter(a => a.category === selectedCategory)
    : achievements

  if (loading) {
    return (
      <div className="h-dvh bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 animate-ios-fade-up">
          <div className="w-10 h-10 border-[3px] border-amber-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-[15px] text-neutral-500 font-medium">Carregando conquistas...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-dvh overflow-y-auto bg-background pb-8 ios-scroll">
      {/* Header */}
      <header className="bg-card/95 ios-blur border-b border-border sticky top-0 z-30">
        <div className="px-5 pt-safe-offset-4 pb-3">
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => router.back()} className="w-9 h-9 flex items-center justify-center rounded-full ios-press">
              <svg className="w-5 h-5 text-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-[20px] font-bold text-foreground tracking-tight">Conquistas</h1>
          </div>
        </div>
      </header>

      <main className="px-5 py-5">
        {/* Progress overview card */}
        <div className="bg-card rounded-2xl p-5 shadow-sm mb-5 animate-ios-fade-up">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 bg-amber-500 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/25">
              <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15V17M6 3H18M6 3V8C6 11.3137 8.68629 14 12 14C15.3137 14 18 11.3137 18 8V3M6 3H4C4 5 3 8 3 8M18 3H20C20 5 21 8 21 8M8 21H16M12 17V21" />
              </svg>
            </div>
            <div className="flex-1">
              <h2 className="text-[22px] font-bold text-foreground tracking-tight">
                {unlockedCount}/{totalCount}
              </h2>
              <p className="text-[14px] text-muted-foreground">conquistas desbloqueadas</p>
            </div>
          </div>
          {/* Progress bar */}
          <div className="h-2.5 bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-amber-500 rounded-full transition-all duration-700"
              style={{ width: `${overallProgress * 100}%` }}
            />
          </div>

          {/* Quick stats */}
          {stats && (
            <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-border">
              <div className="text-center">
                <p className="text-[18px] font-bold text-foreground">{stats.totalRides}</p>
                <p className="text-[11px] text-muted-foreground font-medium">Corridas</p>
              </div>
              <div className="text-center">
                <p className="text-[18px] font-bold text-emerald-600">R${stats.totalSaved.toFixed(0)}</p>
                <p className="text-[11px] text-muted-foreground font-medium">Economizado</p>
              </div>
              <div className="text-center">
                <p className="text-[18px] font-bold text-foreground">{stats.streak}</p>
                <p className="text-[11px] text-muted-foreground font-medium">Sequencia</p>
              </div>
            </div>
          )}
        </div>

        {/* Category filter */}
        <div className="flex gap-2 mb-4 overflow-x-auto ios-scroll -mx-5 px-5 pb-1 animate-ios-fade-up" style={{ animationDelay: '100ms' }}>
          <button
            type="button"
            onClick={() => setSelectedCategory(null)}
            className={`px-3.5 py-1.5 rounded-full text-[13px] font-semibold shrink-0 ios-press transition-colors ${
              !selectedCategory ? 'bg-foreground text-background' : 'bg-secondary text-muted-foreground'
            }`}
          >
            Todas
          </button>
          {Object.entries(categoryLabels).map(([key, val]) => (
            <button
              key={key}
              type="button"
              onClick={() => setSelectedCategory(key === selectedCategory ? null : key)}
              className={`px-3.5 py-1.5 rounded-full text-[13px] font-semibold shrink-0 ios-press transition-colors ${
                selectedCategory === key ? 'bg-foreground text-background' : `${val.color}`
              }`}
            >
              {val.name}
            </button>
          ))}
        </div>

        {/* Achievements grid */}
        <div className="flex flex-col gap-2.5 stagger-children">
          {filtered.map((achievement) => (
            <div
              key={achievement.id}
              className={`bg-card rounded-2xl p-4 shadow-sm flex items-center gap-4 relative overflow-hidden ${
                achievement.unlocked ? '' : 'opacity-70'
              }`}
            >
              {/* Icon */}
              <div className={`w-12 h-12 rounded-[14px] flex items-center justify-center shrink-0 ${
                achievement.unlocked ? categoryBgMap[achievement.category] : 'bg-neutral-200 dark:bg-neutral-700'
              } ${achievement.unlocked ? 'shadow-md' : ''}`}>
                <AchievementIcon icon={achievement.icon} unlocked={achievement.unlocked} />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-[15px] font-bold text-foreground truncate">{achievement.title}</h3>
                  {achievement.unlocked && (
                    <svg className="w-4 h-4 text-emerald-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
                <p className="text-[13px] text-muted-foreground mt-0.5">{achievement.description}</p>
                {/* Progress bar */}
                {!achievement.unlocked && (
                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${categoryBgMap[achievement.category]}`}
                        style={{ width: `${achievement.progress * 100}%` }}
                      />
                    </div>
                    <span className="text-[11px] font-bold text-muted-foreground tabular-nums shrink-0">
                      {Math.round(achievement.progress * 100)}%
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
