'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { AdminHeader } from '@/components/admin/admin-header'
import { Trophy, TrendingUp, Star, Award, RefreshCw, Car, Users } from 'lucide-react'
import { cn } from '@/lib/utils'

type Category = 'total_rides' | 'savings' | 'rating' | 'earnings'
type UserType = 'all' | 'passenger' | 'driver'

interface RankEntry {
  id: string
  full_name: string
  avatar_url: string | null
  user_type: string
  total_rides: number
  rating: number | null
  total_earnings: number
  total_spent: number
  rank: number
}

const CATEGORIES: { id: Category; label: string; icon: any; desc: string }[] = [
  { id: 'total_rides', label: 'Corridas', icon: Car, desc: 'por total de corridas' },
  { id: 'savings', label: 'Economia', icon: TrendingUp, desc: 'por economia negociada' },
  { id: 'rating', label: 'Avaliacao', icon: Star, desc: 'por nota media' },
  { id: 'earnings', label: 'Receita', icon: Award, desc: 'por gasto/receita total' },
]

const MEDAL_COLORS = [
  'from-yellow-400 to-amber-500',
  'from-slate-300 to-slate-400',
  'from-orange-400 to-orange-600',
]

const MEDAL_LABELS = ['1°', '2°', '3°']

export default function AdminLeaderboardPage() {
  const [category, setCategory] = useState<Category>('total_rides')
  const [userType, setUserType] = useState<UserType>('all')
  const [entries, setEntries] = useState<RankEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const channelRef = useRef<any>(null)

  const fetchLeaderboard = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()

    let query = supabase
      .from('profiles')
      .select('id, full_name, avatar_url, user_type, total_rides, rating')
      .order(
        category === 'total_rides' ? 'total_rides'
          : category === 'rating' ? 'rating'
          : 'total_rides',
        { ascending: false }
      )
      .limit(50)

    if (userType !== 'all') query = query.eq('user_type', userType)

    const { data: profiles } = await query

    // Buscar totais de pagamentos/gastos para cada perfil
    const ids = (profiles || []).map(p => p.id)
    let paymentsMap: Record<string, number> = {}
    let spendMap: Record<string, number> = {}

    if (ids.length > 0) {
      const { data: payments } = await supabase
        .from('payments')
        .select('user_id, driver_id, amount, status')
        .eq('status', 'completed')
        .or(`user_id.in.(${ids.join(',')}),driver_id.in.(${ids.join(',')})`)

      for (const p of payments || []) {
        if (p.driver_id) paymentsMap[p.driver_id] = (paymentsMap[p.driver_id] || 0) + Number(p.amount)
        if (p.user_id) spendMap[p.user_id] = (spendMap[p.user_id] || 0) + Number(p.amount)
      }
    }

    let ranked: RankEntry[] = (profiles || []).map(p => ({
      id: p.id,
      full_name: p.full_name || 'Sem nome',
      avatar_url: p.avatar_url,
      user_type: p.user_type,
      total_rides: p.total_rides || 0,
      rating: p.rating,
      total_earnings: paymentsMap[p.id] || 0,
      total_spent: spendMap[p.id] || 0,
      rank: 0,
    }))

    // Re-sort baseado na categoria selecionada
    ranked.sort((a, b) => {
      if (category === 'total_rides') return b.total_rides - a.total_rides
      if (category === 'rating') return (b.rating || 0) - (a.rating || 0)
      if (category === 'savings') return b.total_spent - a.total_spent
      if (category === 'earnings') return b.total_earnings - a.total_earnings
      return 0
    })

    ranked = ranked.map((e, i) => ({ ...e, rank: i + 1 }))

    setEntries(ranked)
    setLastUpdated(new Date())
    setLoading(false)
  }, [category, userType])

  useEffect(() => {
    fetchLeaderboard()
    const supabase = createClient()
    channelRef.current = supabase
      .channel('admin-leaderboard-rt')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles' }, fetchLeaderboard)
      .subscribe()
    return () => { if (channelRef.current) supabase.removeChannel(channelRef.current) }
  }, [fetchLeaderboard])

  const top3 = entries.slice(0, 3)
  const rest = entries.slice(3)

  const catValue = (e: RankEntry): string => {
    if (category === 'total_rides') return `${e.total_rides} corridas`
    if (category === 'rating') return `${(e.rating || 0).toFixed(1)} estrelas`
    if (category === 'savings') return `R$ ${e.total_spent.toFixed(2)}`
    return `R$ ${e.total_earnings.toFixed(2)}`
  }

  const currentCat = CATEGORIES.find(c => c.id === category)!

  const headerActions = (
    <button
      type="button"
      onClick={fetchLeaderboard}
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
      <AdminHeader title="Leaderboard" subtitle="Ranking global de usuarios" actions={headerActions} />
      <div className="flex-1 overflow-y-auto bg-[hsl(var(--admin-bg))]">
        <div className="p-5 space-y-5">

          {/* KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Total no Ranking', value: entries.length, color: 'text-blue-400' },
              { label: 'Passageiros', value: entries.filter(e => e.user_type === 'passenger').length, color: 'text-emerald-400' },
              { label: 'Motoristas', value: entries.filter(e => e.user_type === 'driver').length, color: 'text-violet-400' },
              { label: 'Media Corridas', value: entries.length > 0 ? Math.round(entries.reduce((s, e) => s + e.total_rides, 0) / entries.length) : 0, color: 'text-amber-400' },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-[hsl(var(--admin-surface))] rounded-xl p-4 border border-[hsl(var(--admin-border))]">
                <p className={cn('text-[22px] font-bold tabular-nums', color)}>{value.toLocaleString('pt-BR')}</p>
                <p className="text-[11px] text-slate-500 font-medium mt-1">{label}</p>
              </div>
            ))}
          </div>

          {/* Controles */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Categorias */}
            <div className="flex items-center gap-1 bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] rounded-lg p-1">
              {CATEGORIES.map(cat => {
                const Icon = cat.icon
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategory(cat.id)}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-semibold transition-all',
                      category === cat.id
                        ? 'bg-[hsl(var(--admin-green))]/15 text-[hsl(var(--admin-green))]'
                        : 'text-slate-500 hover:text-slate-300'
                    )}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {cat.label}
                  </button>
                )
              })}
            </div>

            {/* Tipo de usuario */}
            <div className="flex items-center gap-1 bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] rounded-lg p-1">
              {([['all', 'Todos'], ['passenger', 'Passageiros'], ['driver', 'Motoristas']] as const).map(([val, label]) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setUserType(val as UserType)}
                  className={cn(
                    'px-3 py-1.5 rounded-md text-[12px] font-semibold transition-all',
                    userType === val
                      ? 'bg-[hsl(var(--admin-green))]/15 text-[hsl(var(--admin-green))]'
                      : 'text-slate-500 hover:text-slate-300'
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Podio top 3 */}
          {!loading && top3.length >= 3 && (
            <div className="bg-[hsl(var(--admin-surface))] rounded-xl border border-[hsl(var(--admin-border))] p-5">
              <div className="flex items-center gap-2 mb-4">
                <Trophy className="w-4 h-4 text-amber-400" />
                <h3 className="text-[13px] font-bold text-slate-200">Podio — {currentCat.label}</h3>
                <span className="text-[11px] text-slate-500">{currentCat.desc}</span>
              </div>
              <div className="flex items-end justify-center gap-3">
                {/* 2nd */}
                <div className="flex flex-col items-center gap-2 flex-1">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-slate-300 to-slate-400 flex items-center justify-center text-slate-900 font-black text-[18px] shadow-lg">
                    {top3[1]?.full_name.charAt(0) || '?'}
                  </div>
                  <p className="text-[12px] font-bold text-slate-300 text-center truncate w-full">{top3[1]?.full_name}</p>
                  <p className="text-[11px] text-slate-500 text-center">{top3[1] && catValue(top3[1])}</p>
                  <div className="w-full h-16 bg-slate-500/20 rounded-t-lg flex items-center justify-center">
                    <span className="text-[22px] font-black text-slate-400">2°</span>
                  </div>
                </div>
                {/* 1st */}
                <div className="flex flex-col items-center gap-2 flex-1">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center text-white font-black text-[20px] shadow-lg shadow-amber-500/30 ring-2 ring-amber-400/50">
                    {top3[0]?.full_name.charAt(0) || '?'}
                  </div>
                  <p className="text-[13px] font-bold text-slate-200 text-center truncate w-full">{top3[0]?.full_name}</p>
                  <p className="text-[11px] text-slate-400 text-center">{top3[0] && catValue(top3[0])}</p>
                  <div className="w-full h-24 bg-amber-500/20 rounded-t-lg flex items-center justify-center">
                    <span className="text-[26px] font-black text-amber-400">1°</span>
                  </div>
                </div>
                {/* 3rd */}
                <div className="flex flex-col items-center gap-2 flex-1">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-black text-[18px] shadow-lg">
                    {top3[2]?.full_name.charAt(0) || '?'}
                  </div>
                  <p className="text-[12px] font-bold text-slate-300 text-center truncate w-full">{top3[2]?.full_name}</p>
                  <p className="text-[11px] text-slate-500 text-center">{top3[2] && catValue(top3[2])}</p>
                  <div className="w-full h-10 bg-orange-500/20 rounded-t-lg flex items-center justify-center">
                    <span className="text-[18px] font-black text-orange-400">3°</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tabela ranking */}
          <div className="bg-[hsl(var(--admin-surface))] rounded-xl border border-[hsl(var(--admin-border))]">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-[hsl(var(--admin-border))]">
              <h3 className="text-[13px] font-bold text-slate-200">Ranking Completo</h3>
              <span className="text-[11px] text-slate-500">{entries.length} usuarios</span>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-6 h-6 border-2 border-[hsl(var(--admin-green))] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-[12px]">
                  <thead>
                    <tr className="border-b border-[hsl(var(--admin-border))]">
                      {['#', 'Usuario', 'Tipo', 'Corridas', 'Avaliacao', 'Gasto/Ganho', category === 'total_rides' ? 'Corridas' : category === 'rating' ? 'Nota' : category === 'earnings' ? 'Ganhos' : 'Gasto'].map((h, i) => (
                        <th key={`${h}-${i}`} className="text-left px-4 py-2.5 text-slate-500 font-semibold whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((entry) => (
                      <tr
                        key={entry.id}
                        className={cn(
                          'border-b border-[hsl(var(--admin-border))]/50 hover:bg-[hsl(var(--sidebar-accent))]/50 transition-colors',
                          entry.rank <= 3 && 'bg-[hsl(var(--sidebar-accent))]/20'
                        )}
                      >
                        <td className="px-4 py-3 font-bold tabular-nums w-10">
                          {entry.rank <= 3 ? (
                            <span className={cn(
                              'inline-flex w-7 h-7 rounded-full items-center justify-center text-[11px] font-black bg-gradient-to-br',
                              MEDAL_COLORS[entry.rank - 1],
                              entry.rank === 1 ? 'text-white' : 'text-slate-900'
                            )}>
                              {MEDAL_LABELS[entry.rank - 1]}
                            </span>
                          ) : (
                            <span className="text-slate-500">{entry.rank}°</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500/30 to-violet-500/30 flex items-center justify-center text-slate-300 font-bold text-[11px] shrink-0">
                              {entry.full_name.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-slate-300 font-medium truncate max-w-[140px]">{entry.full_name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={cn(
                            'px-2 py-0.5 rounded-md text-[10px] font-bold',
                            entry.user_type === 'driver'
                              ? 'bg-emerald-500/15 text-emerald-400'
                              : 'bg-blue-500/15 text-blue-400'
                          )}>
                            {entry.user_type === 'driver' ? 'Motorista' : 'Passageiro'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-300 tabular-nums font-semibold">{entry.total_rides}</td>
                        <td className="px-4 py-3 text-slate-400 tabular-nums">
                          {entry.rating ? (
                            <span className="flex items-center gap-1">
                              <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                              {entry.rating.toFixed(1)}
                            </span>
                          ) : '—'}
                        </td>
                        <td className="px-4 py-3 text-slate-400 tabular-nums">
                          {entry.user_type === 'driver'
                            ? <span className="text-emerald-400">R$ {entry.total_earnings.toFixed(2)}</span>
                            : <span className="text-slate-400">R$ {entry.total_spent.toFixed(2)}</span>
                          }
                        </td>
                        <td className="px-4 py-3 text-slate-300 font-bold tabular-nums">
                          {catValue(entry)}
                        </td>
                      </tr>
                    ))}
                    {entries.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-4 py-10 text-center text-slate-500">
                          Nenhum usuario encontrado
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      </div>
    </>
  )
}
