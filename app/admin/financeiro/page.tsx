'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { AdminHeader } from '@/components/admin/admin-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Pie, PieChart, Cell } from 'recharts'
import { DollarSign, TrendingUp, CreditCard, Wallet, ArrowUpRight, ArrowDownRight, Banknote, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Payment {
  id: string
  ride_id: string
  amount: number
  platform_fee: number
  driver_earnings: number
  status: string
  payment_method: string
  created_at: string
}

const methodLabels: Record<string, string> = {
  pix: 'PIX', cash: 'Dinheiro', credit_card: 'Credito', debit_card: 'Debito', other: 'Outro',
}
const methodColors: Record<string, string> = {
  pix: '#10b981', cash: '#f59e0b', credit_card: '#3b82f6', debit_card: '#8b5cf6', other: '#6b7280',
}

export default function FinanceiroPage() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [dailyRevenue, setDailyRevenue] = useState<{ day: string; revenue: number; count: number }[]>([])
  const [loading, setLoading] = useState(true)
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null)

  const fetchData = useCallback(async () => {
    const supabase = createClient()

    // Uma unica query com todos os pagamentos dos ultimos 14 dias
    const fourteenDaysAgo = new Date()
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 13)
    fourteenDaysAgo.setHours(0, 0, 0, 0)

    const [{ data: recent }, { data: allCompleted }] = await Promise.all([
      supabase
        .from('payments')
        .select('id, ride_id, amount, platform_fee, driver_earnings, status, payment_method, created_at')
        .order('created_at', { ascending: false })
        .limit(50),
      supabase
        .from('payments')
        .select('amount, payment_method, created_at, status, platform_fee, driver_earnings')
        .eq('status', 'completed')
        .gte('created_at', fourteenDaysAgo.toISOString()),
    ])

    setPayments(recent || [])

    // Agrupamento em memoria — zero queries extras
    const dayMap: Record<string, { revenue: number; count: number }> = {}
    for (let i = 13; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const key = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
      dayMap[key] = { revenue: 0, count: 0 }
    }
    for (const p of allCompleted || []) {
      const key = new Date(p.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
      if (dayMap[key]) {
        dayMap[key].revenue += Number(p.amount || 0)
        dayMap[key].count++
      }
    }
    setDailyRevenue(Object.entries(dayMap).map(([day, vals]) => ({ day, ...vals })))
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchData()
    const supabase = createClient()
    channelRef.current = supabase
      .channel('admin-financeiro')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'payments' }, fetchData)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'payments' }, fetchData)
      .subscribe()
    return () => { if (channelRef.current) supabase.removeChannel(channelRef.current) }
  }, [fetchData])

  // Calculos em memoria — sem queries adicionais
  const completed = payments.filter(p => p.status === 'completed')
  const totalRevenue = completed.reduce((s, p) => s + Number(p.amount || 0), 0)
  const totalFees = completed.reduce((s, p) => s + Number(p.platform_fee || 0), 0)
  const totalDriverEarnings = completed.reduce((s, p) => s + Number(p.driver_earnings || 0), 0)

  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
  const todayPayments = completed.filter(p => new Date(p.created_at) >= todayStart)
  const todayRevenue = todayPayments.reduce((s, p) => s + Number(p.amount || 0), 0)

  const yesterdayStart = new Date(todayStart); yesterdayStart.setDate(yesterdayStart.getDate() - 1)
  const yesterdayPayments = completed.filter(p => {
    const d = new Date(p.created_at)
    return d >= yesterdayStart && d < todayStart
  })
  const yesterdayRevenue = yesterdayPayments.reduce((s, p) => s + Number(p.amount || 0), 0)
  const revenueChange = yesterdayRevenue > 0 ? ((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100 : 0
  const avgTicket = completed.length > 0 ? totalRevenue / completed.length : 0

  // Pizza de metodos
  const methodMap: Record<string, number> = {}
  for (const p of completed) {
    const m = p.payment_method || 'other'
    methodMap[m] = (methodMap[m] || 0) + Number(p.amount || 0)
  }
  const pieData = Object.entries(methodMap).map(([key, value]) => ({
    name: methodLabels[key] || key,
    value,
    color: methodColors[key] || '#6b7280',
  }))

  if (loading) {
    return (
      <>
        <AdminHeader title="Financeiro" subtitle="Carregando..." />
        <div className="flex-1 flex items-center justify-center bg-[hsl(var(--admin-bg))]">
          <div className="w-6 h-6 border-2 border-[hsl(var(--admin-green))] border-t-transparent rounded-full animate-spin" />
        </div>
      </>
    )
  }

  return (
    <>
      <AdminHeader title="Financeiro" subtitle="Receitas e pagamentos em tempo real" />
      <div className="flex-1 overflow-y-auto bg-[hsl(var(--admin-bg))] p-5 space-y-5">

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-[hsl(var(--admin-surface))] rounded-xl border border-[hsl(var(--admin-border))] p-4">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center mb-3">
              <DollarSign className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="text-[22px] font-bold text-slate-100 tabular-nums">R$ {totalRevenue.toFixed(2)}</p>
            <p className="text-[11px] text-slate-500 mt-1">Receita Total</p>
          </div>

          <div className="bg-[hsl(var(--admin-surface))] rounded-xl border border-[hsl(var(--admin-border))] p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-blue-400" />
              </div>
              {revenueChange !== 0 && (
                <div className={cn('flex items-center gap-0.5 text-[11px] font-bold', revenueChange > 0 ? 'text-emerald-400' : 'text-red-400')}>
                  {revenueChange > 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                  {Math.abs(revenueChange).toFixed(0)}%
                </div>
              )}
            </div>
            <p className="text-[22px] font-bold text-slate-100 tabular-nums">R$ {todayRevenue.toFixed(2)}</p>
            <p className="text-[11px] text-slate-500 mt-1">Receita Hoje</p>
          </div>

          <div className="bg-[hsl(var(--admin-surface))] rounded-xl border border-[hsl(var(--admin-border))] p-4">
            <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center mb-3">
              <Wallet className="w-4 h-4 text-violet-400" />
            </div>
            <p className="text-[22px] font-bold text-slate-100 tabular-nums">R$ {avgTicket.toFixed(2)}</p>
            <p className="text-[11px] text-slate-500 mt-1">Ticket Medio</p>
          </div>

          <div className="bg-[hsl(var(--admin-surface))] rounded-xl border border-[hsl(var(--admin-border))] p-4">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center mb-3">
              <CreditCard className="w-4 h-4 text-cyan-400" />
            </div>
            <p className="text-[22px] font-bold text-slate-100 tabular-nums">{completed.length}</p>
            <p className="text-[11px] text-slate-500 mt-1">Pagamentos</p>
          </div>
        </div>

        {/* Taxas e motoristas */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="bg-[hsl(var(--admin-surface))] rounded-xl border border-[hsl(var(--admin-border))] p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
              <DollarSign className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <p className="text-[20px] font-bold text-slate-100 tabular-nums">R$ {totalFees.toFixed(2)}</p>
              <p className="text-[11px] text-slate-500">Taxa da Plataforma (total)</p>
            </div>
          </div>
          <div className="bg-[hsl(var(--admin-surface))] rounded-xl border border-[hsl(var(--admin-border))] p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
              <Banknote className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-[20px] font-bold text-slate-100 tabular-nums">R$ {totalDriverEarnings.toFixed(2)}</p>
              <p className="text-[11px] text-slate-500">Repasse aos Motoristas (total)</p>
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="bg-[hsl(var(--admin-surface))] rounded-xl border border-[hsl(var(--admin-border))] p-4 lg:col-span-2">
            <h3 className="text-[13px] font-bold text-slate-200 mb-4">Receita — Ultimos 14 dias</h3>
            <ChartContainer config={{ revenue: { label: 'Receita', color: 'hsl(var(--admin-green))' } }} className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailyRevenue} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--admin-green))" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="hsl(var(--admin-green))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--admin-border))" />
                  <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Area type="monotone" dataKey="revenue" stroke="hsl(var(--admin-green))" fill="url(#revFill)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </ChartContainer>
          </div>

          <div className="bg-[hsl(var(--admin-surface))] rounded-xl border border-[hsl(var(--admin-border))] p-4">
            <h3 className="text-[13px] font-bold text-slate-200 mb-4">Metodos de Pagamento</h3>
            {pieData.length > 0 ? (
              <>
                <div className="h-[140px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={3} dataKey="value">
                        {pieData.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-1.5 mt-2">
                  {pieData.map((p) => (
                    <div key={p.name} className="flex items-center gap-2 text-[11px]">
                      <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: p.color }} />
                      <span className="text-slate-300 font-medium flex-1">{p.name}</span>
                      <span className="text-slate-500 tabular-nums">R$ {p.value.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-slate-600 text-[12px]">Sem dados</div>
            )}
          </div>
        </div>

        {/* Tabela de pagamentos */}
        <div className="bg-[hsl(var(--admin-surface))] rounded-xl border border-[hsl(var(--admin-border))]">
          <div className="px-5 py-3.5 border-b border-[hsl(var(--admin-border))]">
            <h3 className="text-[13px] font-bold text-slate-200">Pagamentos Recentes</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="border-b border-[hsl(var(--admin-border))]">
                  {['ID Corrida', 'Metodo', 'Taxa', 'Status', 'Valor', 'Data'].map(h => (
                    <th key={h} className="text-left px-4 py-2.5 text-slate-500 font-semibold whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {payments.slice(0, 25).map((p) => (
                  <tr key={p.id} className="border-b border-[hsl(var(--admin-border))]/50 hover:bg-[hsl(var(--sidebar-accent))]/40 transition-colors">
                    <td className="px-4 py-3 text-slate-500 font-mono text-[10px]">{p.ride_id?.slice(0, 8) || '---'}…</td>
                    <td className="px-4 py-3 text-slate-300">{methodLabels[p.payment_method] || p.payment_method || '---'}</td>
                    <td className="px-4 py-3 text-slate-400 tabular-nums">R$ {Number(p.platform_fee || 0).toFixed(2)}</td>
                    <td className="px-4 py-3">
                      <Badge className={cn('text-[10px] font-bold border-0',
                        p.status === 'completed' ? 'bg-emerald-500/15 text-emerald-400' :
                        p.status === 'pending' ? 'bg-amber-500/15 text-amber-400' :
                        'bg-red-500/15 text-red-400'
                      )}>
                        {p.status === 'completed' ? 'Pago' : p.status === 'pending' ? 'Pendente' : p.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right text-slate-200 font-semibold tabular-nums">R$ {Number(p.amount || 0).toFixed(2)}</td>
                    <td className="px-4 py-3 text-right text-slate-500 tabular-nums whitespace-nowrap">
                      {new Date(p.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                ))}
                {payments.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-600">Nenhum pagamento encontrado</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  )
}
