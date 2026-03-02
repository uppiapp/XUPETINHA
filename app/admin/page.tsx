'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { AdminHeader } from '@/components/admin/admin-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { Area, AreaChart, Bar, BarChart, ResponsiveContainer, XAxis, YAxis, CartesianGrid } from 'recharts'
import {
  Users, Car, DollarSign, TrendingUp, Activity, UserCheck, Clock, AlertTriangle,
} from 'lucide-react'

interface Stats {
  totalUsers: number
  totalDrivers: number
  totalRides: number
  activeRides: number
  totalRevenue: number
  todayRides: number
  todayRevenue: number
  onlineDrivers: number
}

interface RecentRide {
  id: string
  status: string
  pickup_address: string
  dropoff_address: string
  final_price: number
  created_at: string
}

const statusColor: Record<string, string> = {
  completed: 'bg-emerald-500/15 text-emerald-500',
  in_progress: 'bg-blue-500/15 text-blue-500',
  accepted: 'bg-cyan-500/15 text-cyan-500',
  searching: 'bg-amber-500/15 text-amber-500',
  cancelled: 'bg-red-500/15 text-red-500',
  pending: 'bg-neutral-500/15 text-neutral-400',
}
const statusLabel: Record<string, string> = {
  completed: 'Finalizada', in_progress: 'Em Andamento', accepted: 'Aceita',
  searching: 'Buscando', cancelled: 'Cancelada', pending: 'Pendente',
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0, totalDrivers: 0, totalRides: 0, activeRides: 0,
    totalRevenue: 0, todayRides: 0, todayRevenue: 0, onlineDrivers: 0,
  })
  const [recentRides, setRecentRides] = useState<RecentRide[]>([])
  const [weeklyData, setWeeklyData] = useState<{ day: string; rides: number; revenue: number }[]>([])
  const [hourlyData, setHourlyData] = useState<{ hour: string; rides: number }[]>([])
  const [loading, setLoading] = useState(true)
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null)

  const fetchStats = useCallback(async () => {
    const supabase = createClient()
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const todayISO = todayStart.toISOString()

    // Batch 1: contagens e listas paralelas
    const [
      { count: totalUsers },
      { count: totalDrivers },
      { count: totalRides },
      { count: activeRides },
      { count: onlineDrivers },
      { count: todayRides },
      { data: recent },
    ] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('user_type', 'passenger'),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('user_type', 'driver'),
      supabase.from('rides').select('*', { count: 'exact', head: true }),
      supabase.from('rides').select('*', { count: 'exact', head: true }).in('status', ['accepted', 'in_progress', 'searching']),
      supabase.from('driver_profiles').select('*', { count: 'exact', head: true }).eq('is_available', true),
      supabase.from('rides').select('*', { count: 'exact', head: true }).gte('created_at', todayISO),
      supabase.from('rides').select('id, status, pickup_address, dropoff_address, final_price, created_at').order('created_at', { ascending: false }).limit(8),
    ])

    // Batch 2: receitas — uma unica query com todos os pagamentos completados
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6)
    sevenDaysAgo.setHours(0, 0, 0, 0)

    const { data: allPayments } = await supabase
      .from('payments')
      .select('amount, created_at, status')
      .eq('status', 'completed')
      .gte('created_at', sevenDaysAgo.toISOString())

    const payments = allPayments || []

    // Calcula receita total e hoje a partir dos dados ja carregados
    const { data: totalPaymentsData } = await supabase
      .from('payments')
      .select('amount')
      .eq('status', 'completed')

    const totalRevenue = (totalPaymentsData || []).reduce((s, p) => s + Number(p.amount || 0), 0)
    const todayRevenue = payments
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
    })
    setRecentRides(recent || [])

    // Monta grafico semanal agrupando em memória (sem queries por dia)
    const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab']
    const weekMap: Record<string, { rides: number; revenue: number }> = {}
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const key = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
      weekMap[key] = { rides: 0, revenue: 0 }
    }

    // Conta corridas por dia com uma unica query
    const { data: weekRides } = await supabase
      .from('rides')
      .select('created_at')
      .gte('created_at', sevenDaysAgo.toISOString())

    for (const r of weekRides || []) {
      const key = new Date(r.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
      if (weekMap[key]) weekMap[key].rides++
    }

    for (const p of payments) {
      const key = new Date(p.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
      if (weekMap[key]) weekMap[key].revenue += Number(p.amount || 0)
    }

    const weeklyArr = Object.entries(weekMap).map(([day, vals]) => ({ day, ...vals }))
    setWeeklyData(weeklyArr)

    // Monta grafico horario com uma unica query
    const { data: todayRidesData } = await supabase
      .from('rides')
      .select('created_at')
      .gte('created_at', todayISO)

    const hourMap: Record<number, number> = {}
    for (const r of todayRidesData || []) {
      const h = new Date(r.created_at).getHours()
      hourMap[h] = (hourMap[h] || 0) + 1
    }
    const currentHour = new Date().getHours()
    const hourlyArr = Array.from({ length: currentHour + 1 }, (_, h) => ({
      hour: `${String(h).padStart(2, '0')}h`,
      rides: hourMap[h] || 0,
    }))
    setHourlyData(hourlyArr)

    setLoading(false)
  }, [])

  useEffect(() => {
    fetchStats()

    const supabase = createClient()
    channelRef.current = supabase
      .channel('admin-dashboard-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rides' }, fetchStats)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, fetchStats)
      .subscribe()

    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current)
    }
  }, [fetchStats])

  const kpis = [
    { label: 'Usuarios', value: stats.totalUsers, icon: Users, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { label: 'Motoristas', value: stats.totalDrivers, icon: Car, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { label: 'Total Corridas', value: stats.totalRides, icon: Activity, color: 'text-violet-500', bg: 'bg-violet-500/10' },
    { label: 'Corridas Ativas', value: stats.activeRides, icon: Clock, color: 'text-amber-500', bg: 'bg-amber-500/10', pulse: true },
    { label: 'Corridas Hoje', value: stats.todayRides, icon: TrendingUp, color: 'text-cyan-500', bg: 'bg-cyan-500/10' },
    { label: 'Motoristas Online', value: stats.onlineDrivers, icon: UserCheck, color: 'text-green-500', bg: 'bg-green-500/10', pulse: true },
    { label: 'Receita Total', value: `R$ ${stats.totalRevenue.toFixed(2)}`, icon: DollarSign, color: 'text-emerald-500', bg: 'bg-emerald-500/10', isMoney: true },
    { label: 'Receita Hoje', value: `R$ ${stats.todayRevenue.toFixed(2)}`, icon: DollarSign, color: 'text-blue-500', bg: 'bg-blue-500/10', isMoney: true },
  ]

  if (loading) {
    return (
      <>
        <AdminHeader title="Dashboard" subtitle="Carregando dados..." />
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-[3px] border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </>
    )
  }

  return (
    <>
      <AdminHeader title="Dashboard" subtitle="Visao geral em tempo real" />
      <div className="flex-1 overflow-y-auto p-6 space-y-6">

        {/* KPIs Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {kpis.map((k) => (
            <Card key={k.label} className="border-border/50 bg-card">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className={`w-10 h-10 rounded-xl ${k.bg} flex items-center justify-center`}>
                    <k.icon className={`w-5 h-5 ${k.color}`} />
                  </div>
                  {k.pulse && (
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
                    </span>
                  )}
                </div>
                <p className={`font-bold text-foreground tracking-tight tabular-nums ${k.isMoney ? 'text-[16px]' : 'text-[22px]'}`}>
                  {typeof k.value === 'number' ? k.value.toLocaleString('pt-BR') : k.value}
                </p>
                <p className="text-[12px] text-muted-foreground font-medium mt-0.5">{k.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-[15px] font-bold">Corridas — Ultimos 7 dias</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={{ rides: { label: 'Corridas', color: '#3b82f6' } }}
                className="h-[220px]"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={weeklyData} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
                    <defs>
                      <linearGradient id="ridesFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Area type="monotone" dataKey="rides" stroke="#3b82f6" fill="url(#ridesFill)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-[15px] font-bold">Corridas — Hoje por hora</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={{ rides: { label: 'Corridas', color: '#8b5cf6' } }}
                className="h-[220px]"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={hourlyData} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="hour" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="rides" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>

        {/* Recent Rides */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-[15px] font-bold">Corridas Recentes</CardTitle>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
              </span>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left px-4 py-2.5 text-muted-foreground font-semibold">Origem</th>
                    <th className="text-left px-4 py-2.5 text-muted-foreground font-semibold">Destino</th>
                    <th className="text-left px-4 py-2.5 text-muted-foreground font-semibold">Status</th>
                    <th className="text-right px-4 py-2.5 text-muted-foreground font-semibold">Valor</th>
                    <th className="text-right px-4 py-2.5 text-muted-foreground font-semibold">Data</th>
                  </tr>
                </thead>
                <tbody>
                  {recentRides.map((r) => (
                    <tr key={r.id} className="border-b border-border/50 hover:bg-secondary/50 transition-colors">
                      <td className="px-4 py-3 text-foreground max-w-[180px] truncate">{r.pickup_address || '---'}</td>
                      <td className="px-4 py-3 text-foreground max-w-[180px] truncate">{r.dropoff_address || '---'}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-md text-[11px] font-bold ${statusColor[r.status] || statusColor.pending}`}>
                          {statusLabel[r.status] || r.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-foreground font-semibold tabular-nums">
                        {r.final_price ? `R$ ${Number(r.final_price).toFixed(2)}` : '---'}
                      </td>
                      <td className="px-4 py-3 text-right text-muted-foreground tabular-nums">
                        {new Date(r.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </td>
                    </tr>
                  ))}
                  {recentRides.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                        Nenhuma corrida encontrada
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

      </div>
    </>
  )
}
