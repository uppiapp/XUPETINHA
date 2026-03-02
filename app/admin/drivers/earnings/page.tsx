'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { AdminHeader } from '@/components/admin/admin-header'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { Bar, BarChart, XAxis, YAxis, CartesianGrid } from 'recharts'
import { DollarSign, Car, TrendingUp, Star, Users, RefreshCw, ArrowUpRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DriverEarning {
  id: string
  full_name: string
  avatar_url: string | null
  rating: number | null
  total_rides: number
  total_earnings: number
  earnings_today: number
  earnings_week: number
  avg_per_ride: number
  online: boolean
}

export default function AdminDriverEarningsPage() {
  const [drivers, setDrivers] = useState<DriverEarning[]>([])
  const [weeklyChart, setWeeklyChart] = useState<{ day: string; receita: number; corridas: number }[]>([])
  const [loading, setLoading] = useState(true)
  const [sortBy, setSortBy] = useState<'total' | 'week' | 'today' | 'rides'>('total')
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const channelRef = useRef<any>(null)

  const fetchData = useCallback(async () => {
    const supabase = createClient()
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

    const [
      { data: profiles },
      { data: allPayments },
      { data: todayPayments },
      { data: weekPayments },
    ] = await Promise.all([
      supabase
        .from('profiles')
        .select('id, full_name, avatar_url, rating, total_rides')
        .eq('user_type', 'driver')
        .order('total_rides', { ascending: false })
        .limit(50),
      supabase
        .from('payments')
        .select('driver_id, amount')
        .eq('status', 'completed')
        .not('driver_id', 'is', null),
      supabase
        .from('payments')
        .select('driver_id, amount')
        .eq('status', 'completed')
        .not('driver_id', 'is', null)
        .gte('created_at', todayStart.toISOString()),
      supabase
        .from('payments')
        .select('driver_id, amount, created_at')
        .eq('status', 'completed')
        .not('driver_id', 'is', null)
        .gte('created_at', weekAgo.toISOString()),
    ])

    // Buscar status online dos motoristas
    const driverIds = (profiles || []).map(p => p.id)
    const { data: driverProfiles } = await supabase
      .from('driver_profiles')
      .select('user_id, is_available')
      .in('user_id', driverIds)

    const onlineMap: Record<string, boolean> = {}
    for (const dp of driverProfiles || []) onlineMap[dp.user_id] = dp.is_available

    // Mapas de earnings
    const totalMap: Record<string, number> = {}
    const todayMap: Record<string, number> = {}
    const weekMap: Record<string, number> = {}

    for (const p of allPayments || []) {
      if (p.driver_id) totalMap[p.driver_id] = (totalMap[p.driver_id] || 0) + Number(p.amount)
    }
    for (const p of todayPayments || []) {
      if (p.driver_id) todayMap[p.driver_id] = (todayMap[p.driver_id] || 0) + Number(p.amount)
    }
    for (const p of weekPayments || []) {
      if (p.driver_id) weekMap[p.driver_id] = (weekMap[p.driver_id] || 0) + Number(p.amount)
    }

    const driversList: DriverEarning[] = (profiles || []).map(p => ({
      id: p.id,
      full_name: p.full_name || 'Sem nome',
      avatar_url: p.avatar_url,
      rating: p.rating,
      total_rides: p.total_rides || 0,
      total_earnings: totalMap[p.id] || 0,
      earnings_today: todayMap[p.id] || 0,
      earnings_week: weekMap[p.id] || 0,
      avg_per_ride: (p.total_rides || 0) > 0 ? (totalMap[p.id] || 0) / (p.total_rides || 1) : 0,
      online: onlineMap[p.id] || false,
    }))

    setDrivers(driversList)

    // Gráfico semanal acumulado
    const chartMap: Record<string, { receita: number; corridas: number }> = {}
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const key = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
      chartMap[key] = { receita: 0, corridas: 0 }
    }
    for (const p of weekPayments || []) {
      const key = new Date(p.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
      if (chartMap[key]) {
        chartMap[key].receita += Number(p.amount)
        chartMap[key].corridas++
      }
    }
    setWeeklyChart(Object.entries(chartMap).map(([day, v]) => ({ day, ...v })))

    setLastUpdated(new Date())
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchData()
    const supabase = createClient()
    channelRef.current = supabase
      .channel('admin-driver-earnings-rt')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'payments' }, fetchData)
      .subscribe()
    return () => { if (channelRef.current) supabase.removeChannel(channelRef.current) }
  }, [fetchData])

  const sorted = [...drivers].sort((a, b) => {
    if (sortBy === 'total') return b.total_earnings - a.total_earnings
    if (sortBy === 'week') return b.earnings_week - a.earnings_week
    if (sortBy === 'today') return b.earnings_today - a.earnings_today
    return b.total_rides - a.total_rides
  })

  const totals = {
    totalEarnings: drivers.reduce((s, d) => s + d.total_earnings, 0),
    todayEarnings: drivers.reduce((s, d) => s + d.earnings_today, 0),
    weekEarnings: drivers.reduce((s, d) => s + d.earnings_week, 0),
    online: drivers.filter(d => d.online).length,
  }

  const topDriver = sorted[0]

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
      <AdminHeader title="Ganhos dos Motoristas" subtitle="Receita por motorista em tempo real" actions={headerActions} />
      <div className="flex-1 overflow-y-auto bg-[hsl(var(--admin-bg))]">
        <div className="p-5 space-y-5">

          {/* KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              {
                label: 'Receita Total (Motoristas)',
                value: `R$ ${totals.totalEarnings.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
                icon: DollarSign, color: 'text-emerald-400', bg: 'bg-emerald-500/10',
              },
              {
                label: 'Receita Hoje',
                value: `R$ ${totals.todayEarnings.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
                icon: TrendingUp, color: 'text-blue-400', bg: 'bg-blue-500/10',
              },
              {
                label: 'Receita Esta Semana',
                value: `R$ ${totals.weekEarnings.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
                icon: Car, color: 'text-violet-400', bg: 'bg-violet-500/10',
              },
              {
                label: 'Motoristas Online',
                value: totals.online,
                icon: Users, color: 'text-amber-400', bg: 'bg-amber-500/10', pulse: true,
              },
            ].map(({ label, value, icon: Icon, color, bg, pulse }: any) => (
              <div key={label} className="bg-[hsl(var(--admin-surface))] rounded-xl p-4 border border-[hsl(var(--admin-border))] flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', bg)}>
                    <Icon className={cn('w-4 h-4', color)} />
                  </div>
                  {pulse && totals.online > 0 && (
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                    </span>
                  )}
                </div>
                <div>
                  <p className={cn('text-[20px] font-bold tracking-tight tabular-nums leading-none', color)}>
                    {typeof value === 'number' ? value.toLocaleString('pt-BR') : value}
                  </p>
                  <p className="text-[11px] text-slate-500 font-medium mt-1">{label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Charts + Top Driver side by side */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Grafico semanal */}
            <div className="lg:col-span-2 bg-[hsl(var(--admin-surface))] rounded-xl border border-[hsl(var(--admin-border))] p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[13px] font-bold text-slate-200">Receita dos Motoristas — 7 dias</h3>
                <span className="text-[11px] text-slate-500">valor pago aos motoristas</span>
              </div>
              <ChartContainer
                config={{ receita: { label: 'Receita', color: 'hsl(var(--admin-green))' } }}
                className="h-[200px]"
              >
                <BarChart data={weeklyChart} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--admin-border))" />
                  <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="receita" fill="hsl(var(--admin-green))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            </div>

            {/* Top Driver Card */}
            {topDriver && (
              <div className="bg-[hsl(var(--admin-surface))] rounded-xl border border-[hsl(var(--admin-border))] p-4 flex flex-col">
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-3">Top Motorista</p>
                <div className="flex-1 flex flex-col items-center justify-center gap-3">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white font-black text-[24px] shadow-lg shadow-amber-500/20">
                    {topDriver.full_name.charAt(0).toUpperCase()}
                  </div>
                  <div className="text-center">
                    <p className="text-[15px] font-bold text-slate-200">{topDriver.full_name}</p>
                    <div className="flex items-center justify-center gap-1 mt-0.5">
                      <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                      <span className="text-[12px] text-slate-400">{topDriver.rating?.toFixed(1) || '5.0'}</span>
                    </div>
                  </div>
                  <div className="w-full space-y-2">
                    <div className="flex justify-between text-[12px]">
                      <span className="text-slate-500">Total ganho</span>
                      <span className="text-emerald-400 font-bold">R$ {topDriver.total_earnings.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-[12px]">
                      <span className="text-slate-500">Esta semana</span>
                      <span className="text-blue-400 font-bold">R$ {topDriver.earnings_week.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-[12px]">
                      <span className="text-slate-500">Corridas</span>
                      <span className="text-slate-300 font-bold">{topDriver.total_rides}</span>
                    </div>
                    <div className="flex justify-between text-[12px]">
                      <span className="text-slate-500">Media/corrida</span>
                      <span className="text-slate-300 font-bold">R$ {topDriver.avg_per_ride.toFixed(2)}</span>
                    </div>
                  </div>
                  <div className={cn(
                    'w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-bold',
                    topDriver.online
                      ? 'bg-emerald-500/15 text-emerald-400'
                      : 'bg-slate-500/15 text-slate-500'
                  )}>
                    <span className={cn(
                      'w-1.5 h-1.5 rounded-full',
                      topDriver.online ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'
                    )} />
                    {topDriver.online ? 'Online agora' : 'Offline'}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Tabela de motoristas */}
          <div className="bg-[hsl(var(--admin-surface))] rounded-xl border border-[hsl(var(--admin-border))]">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-[hsl(var(--admin-border))]">
              <h3 className="text-[13px] font-bold text-slate-200">Ranking de Ganhos ({drivers.length})</h3>
              <div className="flex items-center gap-1 bg-[hsl(var(--admin-bg))] border border-[hsl(var(--admin-border))] rounded-lg p-0.5">
                {([
                  ['total', 'Total'],
                  ['week', 'Semana'],
                  ['today', 'Hoje'],
                  ['rides', 'Corridas'],
                ] as const).map(([val, label]) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setSortBy(val)}
                    className={cn(
                      'px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all',
                      sortBy === val
                        ? 'bg-[hsl(var(--admin-green))]/15 text-[hsl(var(--admin-green))]'
                        : 'text-slate-600 hover:text-slate-300'
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
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
                      {['#', 'Motorista', 'Status', 'Avaliacao', 'Corridas', 'Hoje', 'Semana', 'Total', 'Media/Corrida'].map(h => (
                        <th key={h} className="text-left px-4 py-2.5 text-slate-500 font-semibold whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sorted.map((driver, idx) => (
                      <tr
                        key={driver.id}
                        className="border-b border-[hsl(var(--admin-border))]/50 hover:bg-[hsl(var(--sidebar-accent))]/50 transition-colors"
                      >
                        <td className="px-4 py-3 text-slate-500 font-semibold tabular-nums">{idx + 1}°</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-500/30 to-teal-500/30 flex items-center justify-center text-slate-300 font-bold text-[11px] shrink-0">
                              {driver.full_name.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-slate-300 font-medium truncate max-w-[130px]">{driver.full_name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={cn(
                            'px-2 py-0.5 rounded-md text-[10px] font-bold flex items-center gap-1 w-fit',
                            driver.online
                              ? 'bg-emerald-500/15 text-emerald-400'
                              : 'bg-slate-500/10 text-slate-600'
                          )}>
                            <span className={cn('w-1.5 h-1.5 rounded-full', driver.online ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600')} />
                            {driver.online ? 'Online' : 'Offline'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {driver.rating ? (
                            <span className="flex items-center gap-1 text-slate-400">
                              <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                              {driver.rating.toFixed(1)}
                            </span>
                          ) : '—'}
                        </td>
                        <td className="px-4 py-3 text-slate-300 font-semibold tabular-nums">{driver.total_rides}</td>
                        <td className="px-4 py-3 text-slate-400 tabular-nums">
                          {driver.earnings_today > 0
                            ? <span className="text-emerald-400 font-semibold">R$ {driver.earnings_today.toFixed(2)}</span>
                            : <span className="text-slate-700">—</span>
                          }
                        </td>
                        <td className="px-4 py-3 text-slate-400 tabular-nums">
                          {driver.earnings_week > 0
                            ? <span className="flex items-center gap-1 text-blue-400">
                                <ArrowUpRight className="w-3 h-3" />
                                R$ {driver.earnings_week.toFixed(2)}
                              </span>
                            : <span className="text-slate-700">—</span>
                          }
                        </td>
                        <td className="px-4 py-3 text-emerald-400 font-bold tabular-nums whitespace-nowrap">
                          R$ {driver.total_earnings.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-slate-500 tabular-nums">
                          R$ {driver.avg_per_ride.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                    {sorted.length === 0 && (
                      <tr>
                        <td colSpan={9} className="px-4 py-10 text-center text-slate-500">Nenhum motorista encontrado</td>
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
