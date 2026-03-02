'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { AdminHeader } from '@/components/admin/admin-header'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import {
  Area, AreaChart, Bar, BarChart, Line, LineChart,
  ResponsiveContainer, XAxis, YAxis, CartesianGrid, Pie, PieChart, Cell,
} from 'recharts'
import { TrendingUp, Users, Car, DollarSign, Star, BarChart3, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AnalyticsData {
  weeklyGrowth: { day: string; usuarios: number; motoristas: number; corridas: number }[]
  revenueByMethod: { name: string; value: number; color: string }[]
  ridesByStatus: { name: string; value: number; color: string }[]
  topDrivers: { full_name: string; total_rides: number; rating: number; total_earnings: number }[]
  conversionRate: number
  avgRating: number
  totalUsers: number
  totalDrivers: number
  totalRevenue: number
  totalRides: number
  retentionUsers: { day: string; ativos: number }[]
}

const PIE_COLORS = ['hsl(var(--admin-green))', '#3b82f6', '#a78bfa', '#f59e0b', '#64748b']

function MetricCard({ label, value, icon: Icon, color, sub }: { label: string; value: string | number; icon: any; color: string; sub?: string }) {
  return (
    <div className="bg-[hsl(var(--admin-surface))] rounded-xl p-4 border border-[hsl(var(--admin-border))]">
      <div className="flex items-center gap-2 mb-3">
        <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center', color)}>
          <Icon className="w-3.5 h-3.5 text-white" />
        </div>
        <span className="text-[11px] text-slate-500 font-medium">{label}</span>
      </div>
      <p className="text-[24px] font-bold text-slate-100 tracking-tight tabular-nums leading-none">{value}</p>
      {sub && <p className="text-[11px] text-slate-500 mt-1">{sub}</p>}
    </div>
  )
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<7 | 14 | 30>(7)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()
    const since = new Date()
    since.setDate(since.getDate() - (period - 1))
    since.setHours(0, 0, 0, 0)
    const sinceISO = since.toISOString()

    const [
      { data: allProfiles },
      { data: allRides },
      { data: allPayments },
      { data: driverProfiles },
    ] = await Promise.all([
      supabase.from('profiles').select('user_type, created_at'),
      supabase.from('rides').select('status, created_at, driver_id, passenger_id').gte('created_at', sinceISO),
      supabase.from('payments').select('amount, payment_method, created_at').eq('status', 'completed').gte('created_at', sinceISO),
      supabase.from('driver_profiles').select('id, total_rides, rating, total_earnings'),
    ])

    // Growth por dia
    const dayMap: Record<string, { usuarios: number; motoristas: number; corridas: number }> = {}
    for (let i = period - 1; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const key = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
      dayMap[key] = { usuarios: 0, motoristas: 0, corridas: 0 }
    }
    for (const p of allProfiles || []) {
      const key = new Date(p.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
      if (dayMap[key]) {
        if (p.user_type === 'passenger') dayMap[key].usuarios++
        if (p.user_type === 'driver') dayMap[key].motoristas++
      }
    }
    for (const r of allRides || []) {
      const key = new Date(r.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
      if (dayMap[key]) dayMap[key].corridas++
    }
    const weeklyGrowth = Object.entries(dayMap).map(([day, v]) => ({ day, ...v }))

    // Revenue by method
    const methodMap: Record<string, number> = {}
    for (const p of allPayments || []) {
      const m = p.payment_method || 'other'
      methodMap[m] = (methodMap[m] || 0) + Number(p.amount || 0)
    }
    const methodLabels: Record<string, string> = { pix: 'PIX', cash: 'Dinheiro', credit_card: 'Credito', debit_card: 'Debito', other: 'Outro' }
    const revenueByMethod = Object.entries(methodMap).map(([key, value], i) => ({
      name: methodLabels[key] || key,
      value,
      color: PIE_COLORS[i % PIE_COLORS.length],
    }))

    // Rides by status
    const statusMap: Record<string, number> = {}
    for (const r of allRides || []) statusMap[r.status] = (statusMap[r.status] || 0) + 1
    const statusLabels: Record<string, string> = { completed: 'Finalizadas', cancelled: 'Canceladas', in_progress: 'Em Andamento', searching: 'Buscando', accepted: 'Aceitas' }
    const ridesByStatus = Object.entries(statusMap).map(([key, value], i) => ({
      name: statusLabels[key] || key,
      value,
      color: PIE_COLORS[i % PIE_COLORS.length],
    }))

    // Retention (usuarios ativos por dia)
    const activeMap: Record<string, Set<string>> = {}
    for (const r of allRides || []) {
      const key = new Date(r.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
      if (!activeMap[key]) activeMap[key] = new Set()
      if (r.passenger_id) activeMap[key].add(r.passenger_id)
      if (r.driver_id) activeMap[key].add(r.driver_id)
    }
    const retentionUsers = Object.entries(dayMap).map(([day]) => ({
      day,
      ativos: activeMap[day]?.size || 0,
    }))

    // Top drivers
    const { data: topDriverProfiles } = await supabase
      .from('profiles')
      .select('id, full_name, rating, total_rides')
      .eq('user_type', 'driver')
      .order('total_rides', { ascending: false })
      .limit(5)

    const driverEarningsMap: Record<string, number> = {}
    for (const d of driverProfiles || []) driverEarningsMap[d.id] = d.total_earnings || 0

    const topDrivers = (topDriverProfiles || []).map(d => ({
      full_name: d.full_name || 'Sem nome',
      total_rides: d.total_rides || 0,
      rating: d.rating || 5,
      total_earnings: driverEarningsMap[d.id] || 0,
    }))

    const totalRevenue = (allPayments || []).reduce((s, p) => s + Number(p.amount || 0), 0)
    const completedRides = (allRides || []).filter(r => r.status === 'completed').length
    const conversionRate = (allRides || []).length > 0 ? (completedRides / (allRides || []).length) * 100 : 0
    const ratings = (allProfiles || []).filter(p => p.user_type === 'driver')
    const avgRating = driverProfiles && driverProfiles.length > 0
      ? driverProfiles.reduce((s, d) => s + (d.rating || 5), 0) / driverProfiles.length
      : 5

    setData({
      weeklyGrowth,
      revenueByMethod,
      ridesByStatus,
      topDrivers,
      conversionRate,
      avgRating,
      totalUsers: (allProfiles || []).filter(p => p.user_type === 'passenger').length,
      totalDrivers: (allProfiles || []).filter(p => p.user_type === 'driver').length,
      totalRevenue,
      totalRides: (allRides || []).length,
      retentionUsers,
    })
    setLoading(false)
  }, [period])

  useEffect(() => { fetchData() }, [fetchData])

  const headerActions = (
    <div className="flex items-center gap-2">
      {([7, 14, 30] as const).map(p => (
        <button
          key={p}
          type="button"
          onClick={() => setPeriod(p)}
          className={cn(
            'px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors',
            period === p ? 'bg-[hsl(var(--admin-green))]/20 text-[hsl(var(--admin-green))]' : 'bg-[hsl(var(--admin-surface))] text-slate-400 hover:text-slate-200 border border-[hsl(var(--admin-border))]'
          )}
        >
          {p}d
        </button>
      ))}
      <button type="button" onClick={fetchData} className="w-7 h-7 rounded-lg bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] flex items-center justify-center text-slate-400 hover:text-slate-200 transition-colors">
        <RefreshCw className="w-3 h-3" />
      </button>
    </div>
  )

  if (loading || !data) {
    return (
      <>
        <AdminHeader title="Analytics" subtitle="Carregando..." actions={headerActions} />
        <div className="flex-1 flex items-center justify-center bg-[hsl(var(--admin-bg))]">
          <div className="w-6 h-6 border-2 border-[hsl(var(--admin-green))] border-t-transparent rounded-full animate-spin" />
        </div>
      </>
    )
  }

  return (
    <>
      <AdminHeader title="Analytics" subtitle={`Ultimos ${period} dias`} actions={headerActions} />
      <div className="flex-1 overflow-y-auto bg-[hsl(var(--admin-bg))] p-5 space-y-5">

        {/* Metricas principais */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <MetricCard label="Usuarios" value={data.totalUsers} icon={Users} color="bg-blue-500" />
          <MetricCard label="Motoristas" value={data.totalDrivers} icon={Car} color="bg-emerald-500" />
          <MetricCard label="Corridas" value={data.totalRides} icon={BarChart3} color="bg-violet-500" />
          <MetricCard label="Receita" value={`R$ ${data.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} icon={DollarSign} color="bg-amber-500" />
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-2 gap-3">
          <MetricCard label="Taxa de Conclusao" value={`${data.conversionRate.toFixed(1)}%`} icon={TrendingUp} color="bg-cyan-500" sub="corridas finalizadas / total" />
          <MetricCard label="Avaliacao Media" value={data.avgRating.toFixed(2)} icon={Star} color="bg-amber-500" sub="media dos motoristas" />
        </div>

        {/* Crescimento */}
        <div className="bg-[hsl(var(--admin-surface))] rounded-xl border border-[hsl(var(--admin-border))] p-4">
          <h3 className="text-[13px] font-bold text-slate-200 mb-4">Crescimento — Usuarios, Motoristas, Corridas</h3>
          <ChartContainer
            config={{
              usuarios: { label: 'Usuarios', color: '#3b82f6' },
              motoristas: { label: 'Motoristas', color: 'hsl(var(--admin-green))' },
              corridas: { label: 'Corridas', color: '#a78bfa' },
            }}
            className="h-[240px]"
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.weeklyGrowth} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--admin-border))" />
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line type="monotone" dataKey="usuarios" stroke="#3b82f6" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="motoristas" stroke="hsl(var(--admin-green))" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="corridas" stroke="#a78bfa" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        </div>

        {/* Charts secundarios */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Retention */}
          <div className="lg:col-span-2 bg-[hsl(var(--admin-surface))] rounded-xl border border-[hsl(var(--admin-border))] p-4">
            <h3 className="text-[13px] font-bold text-slate-200 mb-4">Usuarios Ativos por Dia</h3>
            <ChartContainer config={{ ativos: { label: 'Usuarios Ativos', color: 'hsl(var(--admin-green))' } }} className="h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.retentionUsers} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="retGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--admin-green))" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="hsl(var(--admin-green))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--admin-border))" />
                  <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Area type="monotone" dataKey="ativos" stroke="hsl(var(--admin-green))" fill="url(#retGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </ChartContainer>
          </div>

          {/* Status das corridas */}
          <div className="bg-[hsl(var(--admin-surface))] rounded-xl border border-[hsl(var(--admin-border))] p-4">
            <h3 className="text-[13px] font-bold text-slate-200 mb-4">Status das Corridas</h3>
            {data.ridesByStatus.length > 0 ? (
              <>
                <div className="h-[130px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={data.ridesByStatus} cx="50%" cy="50%" innerRadius={35} outerRadius={55} paddingAngle={3} dataKey="value">
                        {data.ridesByStatus.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-1.5 mt-2">
                  {data.ridesByStatus.map((item) => (
                    <div key={item.name} className="flex items-center gap-2 text-[11px]">
                      <div className="w-2 h-2 rounded-sm shrink-0" style={{ backgroundColor: item.color }} />
                      <span className="text-slate-300 flex-1">{item.name}</span>
                      <span className="text-slate-500 tabular-nums">{item.value}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="h-[180px] flex items-center justify-center text-slate-600 text-[12px]">Sem dados</div>
            )}
          </div>
        </div>

        {/* Top Motoristas */}
        <div className="bg-[hsl(var(--admin-surface))] rounded-xl border border-[hsl(var(--admin-border))]">
          <div className="px-5 py-3.5 border-b border-[hsl(var(--admin-border))]">
            <h3 className="text-[13px] font-bold text-slate-200">Top Motoristas</h3>
          </div>
          <table className="w-full text-[12px]">
            <thead>
              <tr className="border-b border-[hsl(var(--admin-border))]">
                {['#', 'Motorista', 'Corridas', 'Avaliacao', 'Ganhos'].map(h => (
                  <th key={h} className="text-left px-4 py-2.5 text-slate-500 font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.topDrivers.map((d, i) => (
                <tr key={d.full_name} className="border-b border-[hsl(var(--admin-border))]/50">
                  <td className="px-4 py-3 text-slate-500 font-mono">{i + 1}</td>
                  <td className="px-4 py-3 text-slate-200 font-semibold">{d.full_name}</td>
                  <td className="px-4 py-3 text-slate-400 tabular-nums">{d.total_rides}</td>
                  <td className="px-4 py-3 text-amber-400 tabular-nums">
                    <span className="flex items-center gap-1"><Star className="w-3 h-3 fill-amber-400" />{d.rating.toFixed(1)}</span>
                  </td>
                  <td className="px-4 py-3 text-emerald-400 tabular-nums font-semibold">R$ {d.total_earnings.toFixed(2)}</td>
                </tr>
              ))}
              {data.topDrivers.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-600">Sem dados de motoristas</td></tr>
              )}
            </tbody>
          </table>
        </div>

      </div>
    </>
  )
}
