'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { AdminHeader } from '@/components/admin/admin-header'
import {
  Trophy, RefreshCw, TrendingUp, Star, Award, Users,
  Filter, Search, BarChart3, Crown, Flame, Medal,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface UserAchievementSummary {
  user_id: string
  full_name: string
  phone: string
  avatar_url: string | null
  total_rides: number
  rating: number
  total_saved: number
  created_at: string
  unlocked_count: number
  streak: number
}

interface LeaderboardEntry {
  user_id: string
  full_name: string
  points: number
  rank: number
  total_rides: number
  rating: number
  avatar_url: string | null
}

type ViewMode = 'leaderboard' | 'achievements'

export default function AdminAchievementsPage() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [userStats, setUserStats] = useState<UserAchievementSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<ViewMode>('leaderboard')
  const [search, setSearch] = useState('')
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const channelRef = useRef<any>(null)

  const fetchData = useCallback(async () => {
    const supabase = createClient()

    // Leaderboard
    const { data: lbData } = await supabase
      .from('leaderboard')
      .select('user_id, points, rank, profile:profiles!leaderboard_user_id_fkey(full_name, avatar_url, total_rides, rating)')
      .order('rank', { ascending: true })
      .limit(50)

    // User achievement stats
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('id, full_name, phone, avatar_url, total_rides, rating, created_at')
      .order('total_rides', { ascending: false })
      .limit(50)

    if (lbData) {
      setLeaderboard(lbData.map((entry: any) => ({
        user_id: entry.user_id,
        full_name: entry.profile?.full_name || 'Desconhecido',
        points: entry.points || 0,
        rank: entry.rank || 0,
        total_rides: entry.profile?.total_rides || 0,
        rating: entry.profile?.rating || 0,
        avatar_url: entry.profile?.avatar_url || null,
      })))
    }

    if (profilesData) {
      setUserStats(profilesData.map((p: any) => ({
        user_id: p.id,
        full_name: p.full_name || 'Desconhecido',
        phone: p.phone || '',
        avatar_url: p.avatar_url,
        total_rides: p.total_rides || 0,
        rating: p.rating || 5,
        total_saved: 0,
        created_at: p.created_at,
        unlocked_count: computeUnlocked(p.total_rides || 0, p.rating || 5),
        streak: 0,
      })))
    }

    setLastUpdated(new Date())
    setLoading(false)
  }, [])

  function computeUnlocked(totalRides: number, rating: number): number {
    let count = 0
    if (totalRides >= 1) count++
    if (totalRides >= 10) count++
    if (totalRides >= 50) count++
    if (totalRides >= 100) count++
    if (totalRides >= 500) count++
    if (rating >= 4.8) count++
    return count
  }

  useEffect(() => {
    fetchData()
    const supabase = createClient()
    channelRef.current = supabase
      .channel('admin-achievements-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leaderboard' }, fetchData)
      .subscribe()
    return () => { if (channelRef.current) supabase.removeChannel(channelRef.current) }
  }, [fetchData])

  const filteredLeaderboard = leaderboard.filter(e =>
    !search || e.full_name.toLowerCase().includes(search.toLowerCase())
  )
  const filteredUsers = userStats.filter(u =>
    !search || u.full_name.toLowerCase().includes(search.toLowerCase())
  )

  const stats = {
    totalUsers: userStats.length,
    avgRating: userStats.length ? (userStats.reduce((s, u) => s + u.rating, 0) / userStats.length).toFixed(2) : '0',
    topRider: userStats[0]?.full_name || '—',
    leaderboardSize: leaderboard.length,
  }

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="w-4 h-4 text-amber-400" />
    if (rank === 2) return <Medal className="w-4 h-4 text-slate-300" />
    if (rank === 3) return <Medal className="w-4 h-4 text-amber-600" />
    return <span className="text-[13px] font-bold text-slate-500 tabular-nums w-4 text-center">{rank}</span>
  }

  const getRankBg = (rank: number) => {
    if (rank === 1) return 'bg-amber-500/10 border-amber-500/20'
    if (rank === 2) return 'bg-slate-400/10 border-slate-400/20'
    if (rank === 3) return 'bg-amber-700/10 border-amber-700/20'
    return 'bg-[hsl(var(--admin-surface))] border-[hsl(var(--admin-border))]'
  }

  const headerActions = (
    <button
      type="button"
      onClick={fetchData}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] text-[12px] font-medium text-slate-400 hover:text-slate-200 transition-colors"
    >
      <RefreshCw className="w-3 h-3" />
      {lastUpdated && (
        <span className="hidden sm:inline">
          {lastUpdated.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </span>
      )}
    </button>
  )

  return (
    <>
      <AdminHeader title="Conquistas e Gamificacao" subtitle="Ranking, pontos e badges dos usuarios" actions={headerActions} />
      <div className="flex-1 overflow-y-auto bg-[hsl(var(--admin-bg))]">
        <div className="p-5 space-y-5">

          {/* KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Usuarios no Ranking', value: stats.leaderboardSize, color: 'text-amber-400', icon: Trophy },
              { label: 'Total Usuarios', value: stats.totalUsers, color: 'text-blue-400', icon: Users },
              { label: 'Avaliacao Media', value: stats.avgRating, color: 'text-violet-400', icon: Star },
              { label: 'Lider', value: stats.topRider, color: 'text-emerald-400', icon: Crown },
            ].map(({ label, value, color, icon: Icon }) => (
              <div key={label} className="bg-[hsl(var(--admin-surface))] rounded-xl p-4 border border-[hsl(var(--admin-border))]">
                <div className="flex items-center gap-2 mb-2">
                  <Icon className={cn('w-4 h-4', color)} />
                </div>
                <p className={cn('text-[18px] font-bold tabular-nums truncate', color)}>{value}</p>
                <p className="text-[11px] text-slate-500 font-medium mt-1">{label}</p>
              </div>
            ))}
          </div>

          {/* View Toggle + Search */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex gap-1 p-1 rounded-xl bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))]">
              <button
                type="button"
                onClick={() => setViewMode('leaderboard')}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-colors flex items-center gap-1.5',
                  viewMode === 'leaderboard'
                    ? 'bg-[hsl(var(--admin-green))]/15 text-[hsl(var(--admin-green))]'
                    : 'text-slate-500 hover:text-slate-300'
                )}
              >
                <Trophy className="w-3.5 h-3.5" />
                Leaderboard
              </button>
              <button
                type="button"
                onClick={() => setViewMode('achievements')}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-colors flex items-center gap-1.5',
                  viewMode === 'achievements'
                    ? 'bg-[hsl(var(--admin-green))]/15 text-[hsl(var(--admin-green))]'
                    : 'text-slate-500 hover:text-slate-300'
                )}
              >
                <Award className="w-3.5 h-3.5" />
                Conquistas
              </button>
            </div>

            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
              <input
                type="text"
                placeholder="Buscar usuario..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full h-8 pl-8 pr-3 rounded-lg bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] text-[12px] text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-[hsl(var(--admin-green))]/50"
              />
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : viewMode === 'leaderboard' ? (
            /* Leaderboard View */
            <div className="bg-[hsl(var(--admin-surface))] rounded-xl border border-[hsl(var(--admin-border))]">
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-[hsl(var(--admin-border))]">
                <h3 className="text-[13px] font-bold text-slate-200">Ranking Global ({filteredLeaderboard.length})</h3>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-60" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
                </span>
              </div>
              {filteredLeaderboard.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <Trophy className="w-10 h-10 text-slate-700" />
                  <p className="text-[13px] text-slate-500">Leaderboard vazio</p>
                </div>
              ) : (
                <div className="divide-y divide-[hsl(var(--admin-border))]">
                  {filteredLeaderboard.map(entry => (
                    <div
                      key={entry.user_id}
                      className={cn(
                        'flex items-center gap-4 px-5 py-3.5 transition-colors',
                        entry.rank <= 3 ? getRankBg(entry.rank) : 'hover:bg-[hsl(var(--sidebar-accent))]/30'
                      )}
                    >
                      {/* Rank */}
                      <div className="w-6 flex items-center justify-center shrink-0">
                        {getRankIcon(entry.rank)}
                      </div>

                      {/* Avatar */}
                      <div className={cn(
                        'w-9 h-9 rounded-full flex items-center justify-center text-[13px] font-bold shrink-0',
                        entry.rank === 1 ? 'bg-amber-500/30 text-amber-300' :
                        entry.rank === 2 ? 'bg-slate-400/30 text-slate-200' :
                        entry.rank === 3 ? 'bg-amber-700/30 text-amber-400' :
                        'bg-[hsl(var(--admin-bg))] text-slate-400'
                      )}>
                        {entry.full_name?.charAt(0) || '?'}
                      </div>

                      {/* Name + stats */}
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          'text-[13px] font-bold truncate',
                          entry.rank === 1 ? 'text-amber-300' :
                          entry.rank === 2 ? 'text-slate-200' :
                          entry.rank === 3 ? 'text-amber-500' : 'text-slate-300'
                        )}>
                          {entry.full_name}
                        </p>
                        <div className="flex items-center gap-3 mt-0.5">
                          <span className="text-[11px] text-slate-500">{entry.total_rides} corridas</span>
                          <span className="flex items-center gap-0.5 text-[11px] text-amber-500/80">
                            <Star className="w-3 h-3 fill-amber-500/50" />
                            {entry.rating.toFixed(1)}
                          </span>
                        </div>
                      </div>

                      {/* Points */}
                      <div className="text-right shrink-0">
                        <p className={cn(
                          'text-[16px] font-black tabular-nums',
                          entry.rank === 1 ? 'text-amber-400' :
                          entry.rank <= 3 ? 'text-slate-300' : 'text-slate-400'
                        )}>
                          {entry.points.toLocaleString('pt-BR')}
                        </p>
                        <p className="text-[10px] text-slate-600 font-medium">pts</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* Achievements View */
            <div className="bg-[hsl(var(--admin-surface))] rounded-xl border border-[hsl(var(--admin-border))]">
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-[hsl(var(--admin-border))]">
                <h3 className="text-[13px] font-bold text-slate-200">Usuarios por Conquistas ({filteredUsers.length})</h3>
              </div>
              {/* Header row */}
              <div className="grid grid-cols-5 px-5 py-2.5 border-b border-[hsl(var(--admin-border))]/50 text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                <span className="col-span-2">Usuario</span>
                <span className="text-center">Corridas</span>
                <span className="text-center">Nota</span>
                <span className="text-center">Badges</span>
              </div>
              {filteredUsers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <Award className="w-10 h-10 text-slate-700" />
                  <p className="text-[13px] text-slate-500">Nenhum usuario encontrado</p>
                </div>
              ) : (
                <div className="divide-y divide-[hsl(var(--admin-border))]">
                  {filteredUsers.map((user, i) => (
                    <div key={user.user_id} className="grid grid-cols-5 items-center px-5 py-3 hover:bg-[hsl(var(--sidebar-accent))]/30 transition-colors">
                      {/* User */}
                      <div className="col-span-2 flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500/30 to-violet-500/30 flex items-center justify-center text-[12px] font-bold text-slate-200 shrink-0">
                          {user.full_name?.charAt(0) || '?'}
                        </div>
                        <div className="min-w-0">
                          <p className="text-[12px] font-semibold text-slate-200 truncate">{user.full_name}</p>
                          <p className="text-[11px] text-slate-600 truncate">{user.phone || '—'}</p>
                        </div>
                      </div>

                      {/* Rides */}
                      <div className="text-center">
                        <span className="text-[13px] font-bold text-blue-400 tabular-nums">{user.total_rides}</span>
                      </div>

                      {/* Rating */}
                      <div className="flex items-center justify-center gap-1">
                        <Star className="w-3 h-3 text-amber-500 fill-amber-500/50 shrink-0" />
                        <span className="text-[12px] font-semibold text-slate-300 tabular-nums">{user.rating.toFixed(1)}</span>
                      </div>

                      {/* Badges */}
                      <div className="flex items-center justify-center gap-1.5">
                        <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20">
                          <Trophy className="w-3 h-3 text-amber-400" />
                          <span className="text-[11px] font-bold text-amber-400">{user.unlocked_count}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Achievement Catalog */}
          <div className="bg-[hsl(var(--admin-surface))] rounded-xl border border-[hsl(var(--admin-border))]">
            <div className="px-5 py-3.5 border-b border-[hsl(var(--admin-border))]">
              <h3 className="text-[13px] font-bold text-slate-200">Catalogo de Conquistas</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">Todas as conquistas disponiveis no sistema</p>
            </div>
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {[
                { id: 'first-ride', title: 'Primeira Corrida', desc: 'Complete a 1ª corrida', category: 'rides', threshold: 1, color: 'blue' },
                { id: 'rides-10', title: 'Explorador', desc: '10 corridas completas', category: 'rides', threshold: 10, color: 'blue' },
                { id: 'rides-50', title: 'Viajante', desc: '50 corridas completas', category: 'rides', threshold: 50, color: 'blue' },
                { id: 'rides-100', title: 'Veterano', desc: '100 corridas completas', category: 'rides', threshold: 100, color: 'blue' },
                { id: 'rides-500', title: 'Lenda do Asfalto', desc: '500 corridas completas', category: 'rides', threshold: 500, color: 'blue' },
                { id: 'save-50', title: 'Economista', desc: 'Economize R$50 negociando', category: 'savings', threshold: 50, color: 'emerald' },
                { id: 'save-200', title: 'Pao Duro', desc: 'Economize R$200 negociando', category: 'savings', threshold: 200, color: 'emerald' },
                { id: 'save-1000', title: 'Mestre da Negociacao', desc: 'Economize R$1.000', category: 'savings', threshold: 1000, color: 'emerald' },
                { id: 'rating-high', title: 'Cinco Estrelas', desc: 'Nota acima de 4.8', category: 'social', threshold: 4.8, color: 'amber' },
                { id: 'night-owl', title: 'Coruja Noturna', desc: '10 corridas noturnas', category: 'social', threshold: 10, color: 'amber' },
                { id: 'streak-7', title: 'Sequencia de 7', desc: '7 dias seguidos', category: 'loyalty', threshold: 7, color: 'red' },
                { id: 'streak-30', title: 'Fiel', desc: '30 dias seguidos', category: 'loyalty', threshold: 30, color: 'red' },
              ].map(achievement => {
                const usersUnlocked = userStats.filter(u => {
                  if (achievement.category === 'rides') return u.total_rides >= achievement.threshold
                  if (achievement.category === 'social' && achievement.id === 'rating-high') return u.rating >= achievement.threshold
                  return false
                }).length

                const colorMap: Record<string, string> = {
                  blue: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
                  emerald: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
                  amber: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
                  red: 'bg-red-500/10 border-red-500/20 text-red-400',
                }

                return (
                  <div key={achievement.id} className="flex items-start gap-3 p-3 rounded-xl bg-[hsl(var(--admin-bg))] border border-[hsl(var(--admin-border))]">
                    <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border', colorMap[achievement.color])}>
                      <Trophy className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-bold text-slate-200">{achievement.title}</p>
                      <p className="text-[11px] text-slate-500">{achievement.desc}</p>
                      <p className="text-[11px] text-slate-600 mt-1">
                        {usersUnlocked} usuario{usersUnlocked !== 1 ? 's' : ''} desbloqueou
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

        </div>
      </div>
    </>
  )
}
