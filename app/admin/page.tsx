'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { AdminHeader } from '@/components/admin/admin-header'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { Area, AreaChart, Bar, BarChart, XAxis, YAxis, CartesianGrid } from 'recharts'
import {
  Users, Car, TrendingUp, Activity, UserCheck, Clock,
  DollarSign, ArrowUpRight, ArrowDownRight, RefreshCw,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Stats {
  totalUsers: number
  totalDrivers: number
  totalRides: number
  activeRides: number
  totalRevenue: number
  todayRides: number
  todayRevenue: number
  onlineDrivers: number
  pendingDrivers: number
  cancelledToday: number
}

interface RecentRide {
  id: string
  status: string
  pickup_address: string
  dropoff_address: string
  final_price: number
  created_at: string
  passenger?: { full_name: string } | null
  driver?: { full_name: string } | null
}

const statusColor: Record<string, string> = {
  completed: 'bg-emerald-500/15 text-emerald-400',
  in_progress: 'bg-blue-500/15 text-blue-400',
  accepted: 'bg-cyan-500/15 text-cyan-400',
  searching: 'bg-amber-500/15 text-amber-400',
  cancelled: 'bg-red-500/15 text-red-400',
  pending: 'bg-slate-500/15 text-slate-400',
}
const statusLabel: Record<string, string> = {
  completed: 'Finalizada', in_progress: 'Em Andamento', accepted: 'Aceita',
  searching: 'Buscando', cancelled: 'Cancelada', pending: 'Pendente',
}

function StatCard({
  label, value, icon: Icon, color, bg, pulse, delta,
}: {
  label: string; value: string | number; icon: any; color: string; bg: string; pulse?: boolean; delta?: number
}) {
  return (
    <div className="bg-[hsl(var(--admin-surface))] rounded-xl p-4 border border-[hsl(var(--admin-border))] flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', bg)}>
          <Icon className={cn('w-4 h-4', color)} />
        </div>
        <div className="flex items-center gap-1.5">
          {pulse && (
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
          )}
          {delta !== undefined && delta !== 0 && (
            <span className={cn('text-[11px] font-bold flex items-center gap-0.5', delta > 0 ? 'text-emerald-400' : 'text-red-400')}>
              {delta > 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              {Math.abs(delta).toFixed(0)}%
            </span>
          )}
        </div>
      </div>
      <div>
        <p className="text-[22px] font-bold text-slate-100 tracking-tight tabular-nums leading-none">
          {typeof value === 'number' ? value.toLocaleString('pt-BR') : value}
        </p>
        <p className="text-[11px] text-slate-500 font-medium mt-1">{label}</p>
      </div>
    </div>
  )
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0, totalDrivers: 0, totalRides: 0, activeRides: 0,
    totalRevenue: 0, todayRides: 0, todayRevenue: 0, onlineDrivers: 0,
    pendingDrivers: 0, cancelledToday: 0,
  })
  const [recentRides, setRecentRides] = useState<RecentRide[]>([])
  const [weeklyData, setWeeklyData] = useState<{ day: string; corridas: number; receita: number }[]>([])
  const [hourlyData, setHourlyData] = useState<{ hora: string; corridas: number }[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null)

  const fetchStats = useCallback(async () => {
    const supabase = createClient()
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const todayISO = todayStart.toISOString()
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6)
    sevenDaysAgo.setHours(0, 0, 0, 0)

    // Todas as queries em paralelo — 1 round trip
    const [
      { count: totalUsers },
      { count: totalDrivers },
      { count: totalRides },
      { count: activeRides },
      { count: onlineDrivers },
      { count: todayRides },
      { count: cancelledToday },
      { count: pendingDrivers },
      { data: recent },
      { data: weekRides },
      { data: weekPayments },
      { data: todayRidesData },
      { data: allPayments },
    ] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('user_type', 'passenger'),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('user_type', 'driver'),
      supabase.from('rides').select('*', { count: 'exact', head: true }),
      supabase.from('rides').select('*', { count: 'exact', head: true }).in('status', ['accepted', 'in_progress', 'searching']),
      supabase.from('driver_profiles').select('*', { count: 'exact', head: true }).eq('is_available', true),
      supabase.from('rides').select('*', { count: 'exact', head: true }).gte('created_at', todayISO),
      supabase.from('rides').select('*', { count: 'exact', head: true }).eq('status', 'cancelled').gte('created_at', todayISO),
      supabase.from('driver_profiles').select('*', { count: 'exact', head: true }).eq('is_verified', false),
      supabase.from('rides').select('id, status, pickup_address, dropoff_address, final_price, created_at, passenger:profiles!rides_passenger_id_fkey(full_name), driver:profiles!rides_driver_id_fkey(full_name)').order('created_at', { ascending: false }).limit(10),
      supabase.from('rides').select('created_at').gte('created_at', sevenDaysAgo.toISOString()),
      supabase.from('payments').select('amount, created_at').eq('status', 'completed').gte('created_at', sevenDaysAgo.toISOString()),
      supabase.from('rides').select('created_at').gte('created_at', todayISO),
      supabase.from('payments').select('amount').eq('status', 'completed'),
    ])

    const totalRevenue = (allPayments || []).reduce((s, p) => s + Number(p.amount || 0), 0)
    const todayRevenue = (weekPayments || [])
      .filter(p => new Date(p.created_at) >= todayStart)
      .reduce((s, p) => s + Number(p.amount || 0), 0)

    setStats({
      totalUsers: totalUsers || 0,
      totalDrivers: totalDrivers || 0,
      totalRides: totalRides || 0,
      activeRides: activeRides || 0,
      totalRevenue,
      todayRides: todayRides || 0,
      todayRevenue,
      onlineDrivers: onlineDrivers || 0,
      pendingDrivers: pendingDrivers || 0,
      cancelledToday: cancelledToday || 0,
    })
    setRecentRides((recent as any) || [])

    // Gráfico semanal — agrupado em memória
    const weekMap: Record<string, { corridas: number; receita: number }> = {}
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const key = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
      weekMap[key] = { corridas: 0, receita: 0 }
    }
    for (const r of weekRides || []) {
      const key = new Date(r.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
      if (weekMap[key]) weekMap[key].corridas++
    }
    for (const p of weekPayments || []) {
      const key = new Date(p.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
      if (weekMap[key]) weekMap[key].receita += Number(p.amount || 0)
    }
    setWeeklyData(Object.entries(weekMap).map(([day, v]) => ({ day, ...v })))

    // Gráfico horário de hoje
    const hourMap: Record<number, number> = {}
    for (const r of todayRidesData || []) {
      const h = new Date(r.created_at).getHours()
      hourMap[h] = (hourMap[h] || 0) + 1
    }
    const currentHour = new Date().getHours()
    setHourlyData(Array.from({ length: currentHour + 1 }, (_, h) => ({
      hora: `${String(h).padStart(2, '0')}h`,
      corridas: hourMap[h] || 0,
    })))

    setLastUpdated(new Date())
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchStats()
    const supabase = createClient()
    channelRef.current = supabase
      .channel('admin-dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rides' }, fetchStats)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, fetchStats)
      .subscribe()
    return () => { if (channelRef.current) supabase.removeChannel(channelRef.current) }
  }, [fetchStats])

  if (loading) {
    return (
      <>
        <AdminHeader title="Dashboard" subtitle="Carregando dados..." />
        <div className="flex-1 flex items-center justify-center bg-[hsl(var(--admin-bg))]">
          <div className="w-6 h-6 border-2 border-[hsl(var(--admin-green))] border-t-transparent rounded-full animate-spin" />
        </div>
      </>
    )
  }

  const headerActions = (
    <button
      type="button"
      onClick={fetchStats}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] text-[12px] font-medium text-slate-400 hover:text-slate-200 transition-colors"
    >
      <RefreshCw className="w-3 h-3" />
      {lastUpdated && <span className="hidden sm:inline">
        {lastUpdated.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
      </span>}
    </button>
  )

  return (
    <>
      <AdminHeader title="Dashboard" subtitle="Visao geral em tempo real" actions={headerActions} />
      <div className="flex-1 overflow-y-auto bg-[hsl(var(--admin-bg))]">
        <div className="p-5 space-y-5">

          {/* KPIs — 5 cards principais */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <StatCard label="Usuarios" value={stats.totalUsers} icon={Users} color="text-blue-400" bg="bg-blue-500/10" />
            <StatCard label="Motoristas" value={stats.totalDrivers} icon={Car} color="text-emerald-400" bg="bg-emerald-500/10" />
            <StatCard label="Total Corridas" value={stats.totalRides} icon={Activity} color="text-violet-400" bg="bg-violet-500/10" />
            <StatCard label="Corridas Ativas" value={stats.activeRides} icon={Clock} color="text-amber-400" bg="bg-amber-500/10" pulse />
            <StatCard label="Motoristas Online" value={stats.onlineDrivers} icon={UserCheck} color="text-emerald-400" bg="bg-emerald-500/10" pulse />
          </div>

          {/* KPIs financeiros + hoje */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard
              label="Receita Total"
              value={`R$ ${stats.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
              icon={DollarSign}
              color="text-emerald-400"
              bg="bg-emerald-500/10"
            />
            <StatCard
              label="Receita Hoje"
              value={`R$ ${stats.todayRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
              icon={TrendingUp}
              color="text-blue-400"
              bg="bg-blue-500/10"
            />
            <StatCard
              label="Corridas Hoje"
              value={stats.todayRides}
              icon={Car}
              color="text-cyan-400"
              bg="bg-cyan-500/10"
            />
            <StatCard
              label="Canceladas Hoje"
              value={stats.cancelledToday}
              icon={Activity}
              color="text-red-400"
              bg="bg-red-500/10"
            />
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-[hsl(var(--admin-surface))] rounded-xl border border-[hsl(var(--admin-border))] p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[13px] font-bold text-slate-200">Corridas — 7 dias</h3>
                <span className="text-[11px] text-slate-500">por dia</span>
              </div>
              <ChartContainer config={{ corridas: { label: 'Corridas', color: 'hsl(var(--admin-green))' } }} className="h-[200px]">
                <AreaChart data={weeklyData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="grad1" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--admin-green))" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="hsl(var(--admin-green))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--admin-border))" />
                  <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Area type="monotone" dataKey="corridas" stroke="hsl(var(--admin-green))" fill="url(#grad1)" strokeWidth={2} />
                </AreaChart>
              </ChartContainer>
            </div>

            <div className="bg-[hsl(var(--admin-surface))] rounded-xl border border-[hsl(var(--admin-border))] p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[13px] font-bold text-slate-200">Corridas — Hoje</h3>
                <span className="text-[11px] text-slate-500">por hora</span>
              </div>
              <ChartContainer config={{ corridas: { label: 'Corridas', color: '#818cf8' } }} className="h-[200px]">
                <BarChart data={hourlyData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--admin-border))" />
                  <XAxis dataKey="hora" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="corridas" fill="#818cf8" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ChartContainer>
            </div>
          </div>

          {/* Recent Rides Table */}
          <div className="bg-[hsl(var(--admin-surface))] rounded-xl border border-[hsl(var(--admin-border))]">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-[hsl(var(--admin-border))]">
              <h3 className="text-[13px] font-bold text-slate-200">Corridas Recentes</h3>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="border-b border-[hsl(var(--admin-border))]">
                    {['Passageiro', 'Motorista', 'Origem', 'Destino', 'Status', 'Valor', 'Horario'].map(h => (
                      <th key={h} className="text-left px-4 py-2.5 text-slate-500 font-semibold whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recentRides.map((r) => (
                    <tr key={r.id} className="border-b border-[hsl(var(--admin-border))]/50 hover:bg-[hsl(var(--sidebar-accent))]/50 transition-colors">
                      <td className="px-4 py-3 text-slate-300 font-medium truncate max-w-[120px]">
                        {(r.passenger as any)?.full_name || '---'}
                      </td>
                      <td className="px-4 py-3 text-slate-400 truncate max-w-[120px]">
                        {(r.driver as any)?.full_name || '---'}
                      </td>
                      <td className="px-4 py-3 text-slate-400 truncate max-w-[150px]">{r.pickup_address || '---'}</td>
                      <td className="px-4 py-3 text-slate-400 truncate max-w-[150px]">{r.dropoff_address || '---'}</td>
                      <td className="px-4 py-3">
                        <span className={cn('inline-flex px-2 py-0.5 rounded-md text-[10px] font-bold whitespace-nowrap', statusColor[r.status] || statusColor.pending)}>
                          {statusLabel[r.status] || r.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-slate-300 font-semibold tabular-nums whitespace-nowrap">
                        {r.final_price ? `R$ ${Number(r.final_price).toFixed(2)}` : '---'}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-500 tabular-nums whitespace-nowrap">
                        {new Date(r.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </td>
                    </tr>
                  ))}
                  {recentRides.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-10 text-center text-slate-500">Nenhuma corrida encontrada</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>
    </>
  )
}
