'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Crown, Users, Star, TrendingUp, Search, RefreshCw,
  CheckCircle, XCircle, Zap, Gift, Calendar,
} from 'lucide-react'

interface Subscription {
  id: string
  user_id: string
  plan: string
  status: string
  price: number
  started_at: string
  expires_at: string | null
  cancelled_at: string | null
  user?: { full_name: string; email: string; avatar_url: string | null }
}

const planConfig: Record<string, { label: string; color: string; icon: React.ReactNode; price: number }> = {
  basic:    { label: 'Basic',    color: 'bg-slate-500/20 text-slate-300 border-slate-500/30',  icon: <Star className="w-3 h-3" />,   price: 19.90 },
  premium:  { label: 'Premium',  color: 'bg-orange-500/20 text-orange-400 border-orange-500/30', icon: <Crown className="w-3 h-3" />, price: 39.90 },
  vip:      { label: 'VIP',      color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', icon: <Zap className="w-3 h-3" />,  price: 79.90 },
}

const statusConfig: Record<string, { label: string; color: string }> = {
  active:    { label: 'Ativa',     color: 'bg-green-500/20 text-green-400 border-green-500/30' },
  cancelled: { label: 'Cancelada', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
  expired:   { label: 'Expirada',  color: 'bg-slate-500/20 text-slate-400 border-slate-500/30' },
  trial:     { label: 'Trial',     color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
}

export default function SubscriptionsPage() {
  const supabase = createClient()
  const [subs, setSubs] = useState<Subscription[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [planFilter, setPlanFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [stats, setStats] = useState({ total: 0, active: 0, mrr: 0, churned: 0 })

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('subscriptions')
      .select(`id, user_id, plan, status, price, started_at, expires_at, cancelled_at, user:profiles!user_id(full_name, email, avatar_url)`)
      .order('started_at', { ascending: false })
      .limit(300)

    if (data) {
      setSubs(data as unknown as Subscription[])
      const active = data.filter(s => s.status === 'active')
      setStats({
        total: data.length,
        active: active.length,
        mrr: active.reduce((acc, s) => acc + (s.price || 0), 0),
        churned: data.filter(s => s.status === 'cancelled').length,
      })
    }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  // Realtime
  useEffect(() => {
    const channel = supabase.channel('admin-subscriptions')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'subscriptions' }, () => load())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [load])

  const cancelSub = async (id: string) => {
    await supabase.from('subscriptions').update({ status: 'cancelled', cancelled_at: new Date().toISOString() }).eq('id', id)
    load()
  }

  const filtered = subs.filter(s => {
    const matchPlan = planFilter === 'all' || s.plan === planFilter
    const matchStatus = statusFilter === 'all' || s.status === statusFilter
    const matchSearch = !search || [s.user?.full_name, s.user?.email].some(v => v?.toLowerCase().includes(search.toLowerCase()))
    return matchPlan && matchStatus && matchSearch
  })

  const formatCurrency = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
  const formatDate = (iso: string) => new Date(iso).toLocaleDateString('pt-BR')

  const kpis = [
    { label: 'Total Assinantes', value: stats.total, icon: Users, color: 'text-blue-400' },
    { label: 'Assinaturas Ativas', value: stats.active, icon: CheckCircle, color: 'text-green-400' },
    { label: 'MRR', value: formatCurrency(stats.mrr), icon: TrendingUp, color: 'text-orange-400', isText: true },
    { label: 'Cancelamentos', value: stats.churned, icon: XCircle, color: 'text-red-400' },
  ]

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Assinaturas Club Uppi</h1>
          <p className="text-slate-400 text-sm mt-1">Planos Basic, Premium e VIP — atualiza em tempo real</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} className="border-slate-700 text-slate-300 hover:bg-slate-800">
          <RefreshCw className="w-4 h-4 mr-2" /> Atualizar
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpis.map(k => (
          <Card key={k.label} className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4 flex items-center gap-3">
              <k.icon className={`w-8 h-8 ${k.color}`} />
              <div>
                <p className={`font-bold text-slate-100 ${k.isText ? 'text-lg' : 'text-2xl'}`}>{loading ? '...' : k.value}</p>
                <p className="text-xs text-slate-400">{k.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Plano breakdown */}
      <div className="grid grid-cols-3 gap-4">
        {Object.entries(planConfig).map(([key, cfg]) => {
          const count = subs.filter(s => s.plan === key && s.status === 'active').length
          return (
            <Card key={key} className="bg-slate-800/50 border-slate-700">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge className={`${cfg.color} border`}>{cfg.icon} {cfg.label}</Badge>
                  <span className="text-xs text-slate-400">{formatCurrency(cfg.price)}/mes</span>
                </div>
                <span className="text-xl font-bold text-slate-100">{loading ? '...' : count}</span>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input placeholder="Buscar por nome ou email..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 bg-slate-800 border-slate-700 text-slate-200 placeholder:text-slate-500" />
        </div>
        <div className="flex gap-2 flex-wrap">
          {['all', 'basic', 'premium', 'vip'].map(p => (
            <Button key={p} size="sm" variant={planFilter === p ? 'default' : 'outline'} onClick={() => setPlanFilter(p)}
              className={planFilter === p ? 'bg-orange-500 text-white' : 'border-slate-700 text-slate-400 hover:bg-slate-800'}>
              {p === 'all' ? 'Todos Planos' : planConfig[p]?.label}
            </Button>
          ))}
        </div>
        <div className="flex gap-2 flex-wrap">
          {['all', 'active', 'cancelled', 'expired', 'trial'].map(s => (
            <Button key={s} size="sm" variant={statusFilter === s ? 'default' : 'outline'} onClick={() => setStatusFilter(s)}
              className={statusFilter === s ? 'bg-slate-600 text-white' : 'border-slate-700 text-slate-400 hover:bg-slate-800'}>
              {s === 'all' ? 'Todos Status' : statusConfig[s]?.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Table */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader className="pb-3 border-b border-slate-700">
          <CardTitle className="text-slate-200 text-sm font-semibold">
            {filtered.length} assinatura{filtered.length !== 1 ? 's' : ''}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-slate-400 text-sm">Carregando...</div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center">
              <Crown className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400">Nenhuma assinatura encontrada</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-700/50">
              {filtered.map(sub => {
                const plan = planConfig[sub.plan] || planConfig['basic']
                const status = statusConfig[sub.status] || statusConfig['active']
                return (
                  <div key={sub.id} className="flex items-center justify-between px-5 py-4 hover:bg-slate-700/20 transition-colors">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-300 shrink-0">
                        {sub.user?.full_name?.[0] || 'U'}
                      </div>
                      <div className="min-w-0">
                        <p className="text-slate-200 font-medium text-sm truncate">{sub.user?.full_name || 'Usuario'}</p>
                        <p className="text-slate-500 text-xs truncate">{sub.user?.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <Badge className={`${plan.color} border text-xs flex items-center gap-1`}>{plan.icon}{plan.label}</Badge>
                      <Badge className={`${status.color} border text-xs`}>{status.label}</Badge>
                      <div className="text-right hidden md:block">
                        <p className="text-slate-300 text-sm font-semibold">{formatCurrency(sub.price || 0)}/mes</p>
                        <p className="text-slate-500 text-xs flex items-center gap-1">
                          <Calendar className="w-3 h-3" /> {formatDate(sub.started_at)}
                        </p>
                      </div>
                      {sub.status === 'active' && (
                        <Button size="sm" variant="outline" onClick={() => cancelSub(sub.id)} className="border-red-800 text-red-400 hover:bg-red-900/30 text-xs h-7">
                          <XCircle className="w-3 h-3 mr-1" /> Cancelar
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
