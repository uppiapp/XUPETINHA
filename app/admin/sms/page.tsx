'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { AdminHeader } from '@/components/admin/admin-header'
import { MessageSquare, CheckCircle, XCircle, Clock, DollarSign, RefreshCw, BarChart3 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SmsDelivery {
  id: string
  user_id: string
  phone_number: string
  message: string
  segments: number
  status: 'pending' | 'sent' | 'failed' | 'cancelled'
  provider_message_id: string | null
  sent_at: string | null
  failed_at: string | null
  error_message: string | null
  retry_count: number
  cost_cents: number
  created_at: string
  profiles?: { full_name: string; email: string }
}

const statusConfig = {
  sent: { label: 'Enviado', color: 'bg-emerald-500/15 text-emerald-400', icon: CheckCircle },
  failed: { label: 'Falhou', color: 'bg-red-500/15 text-red-400', icon: XCircle },
  pending: { label: 'Pendente', color: 'bg-amber-500/15 text-amber-400', icon: Clock },
  cancelled: { label: 'Cancelado', color: 'bg-zinc-700 text-zinc-400', icon: XCircle },
}

export default function AdminSmsPage() {
  const supabase = createClient()
  const [deliveries, setDeliveries] = useState<SmsDelivery[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'sent' | 'failed' | 'pending'>('all')

  const kpis = {
    total: deliveries.length,
    sent: deliveries.filter(d => d.status === 'sent').length,
    failed: deliveries.filter(d => d.status === 'failed').length,
    totalCost: deliveries.filter(d => d.status === 'sent').reduce((a, d) => a + (d.cost_cents || 0), 0),
    avgCost: deliveries.filter(d => d.status === 'sent').length
      ? deliveries.filter(d => d.status === 'sent').reduce((a, d) => a + (d.cost_cents || 0), 0) /
        deliveries.filter(d => d.status === 'sent').length
      : 0,
    successRate: deliveries.length
      ? Math.round((deliveries.filter(d => d.status === 'sent').length / deliveries.length) * 100)
      : 0,
  }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await supabase
        .from('sms_deliveries')
        .select('*, profiles(full_name, email)')
        .order('created_at', { ascending: false })
        .limit(200)
      setDeliveries((data as any[]) || [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // Realtime
  useEffect(() => {
    const channel = supabase
      .channel('admin-sms-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sms_deliveries' }, () => load())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [load])

  const filtered = filter === 'all' ? deliveries : deliveries.filter(d => d.status === filter)

  return (
    <div className="flex flex-col h-screen bg-[#0A0A0A] text-white overflow-hidden">
      <AdminHeader />
      <div className="flex-1 overflow-y-auto p-6 space-y-6">

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Monitoramento de SMS</h1>
            <p className="text-sm text-zinc-400 mt-1">Historico de envios de SMS — atualiza em tempo real</p>
          </div>
          <button onClick={load} className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm transition-colors">
            <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
            Atualizar
          </button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[
            { icon: MessageSquare, label: 'Total Envios', value: kpis.total, color: 'text-blue-400' },
            { icon: CheckCircle, label: 'Enviados', value: kpis.sent, color: 'text-emerald-400' },
            { icon: XCircle, label: 'Falhas', value: kpis.failed, color: 'text-red-400' },
            { icon: BarChart3, label: 'Taxa de Sucesso', value: `${kpis.successRate}%`, color: 'text-violet-400' },
            { icon: DollarSign, label: 'Custo Total', value: `R$ ${(kpis.totalCost / 100).toFixed(2)}`, color: 'text-amber-400' },
            { icon: DollarSign, label: 'Custo Medio', value: `R$ ${(kpis.avgCost / 100).toFixed(3)}`, color: 'text-zinc-400' },
          ].map((k, i) => (
            <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <k.icon className={cn('w-5 h-5 mb-2', k.color)} />
              <p className="text-xs text-zinc-500 mb-1">{k.label}</p>
              <p className="text-xl font-bold text-white">{loading ? '—' : k.value}</p>
            </div>
          ))}
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2">
          {(['all', 'sent', 'failed', 'pending'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                filter === f ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-zinc-300'
              )}
            >
              {f === 'all' ? `Todos (${deliveries.length})` :
               f === 'sent' ? `Enviados (${kpis.sent})` :
               f === 'failed' ? `Falhas (${kpis.failed})` :
               `Pendentes (${deliveries.filter(d => d.status === 'pending').length})`}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase">Usuario</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase">Telefone</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase">Mensagem</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-zinc-500 uppercase">Status</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-zinc-500 uppercase">Segmentos</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-zinc-500 uppercase">Custo</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-zinc-500 uppercase">Data</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="text-center py-8 text-zinc-600">Carregando...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-8 text-zinc-600">Nenhum registro encontrado</td></tr>
              ) : filtered.map(d => {
                const dAs = d as any
                const cfg = statusConfig[d.status] || statusConfig.pending
                const StatusIcon = cfg.icon
                return (
                  <tr key={d.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                    <td className="px-4 py-3">
                      <p className="font-medium text-white">{dAs.profiles?.full_name || '—'}</p>
                      <p className="text-xs text-zinc-500">{dAs.profiles?.email || '—'}</p>
                    </td>
                    <td className="px-4 py-3 text-zinc-300 font-mono text-xs">{d.phone_number}</td>
                    <td className="px-4 py-3 text-zinc-400 max-w-xs truncate">{d.message}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium', cfg.color)}>
                        <StatusIcon className="w-3 h-3" />
                        {cfg.label}
                      </span>
                      {d.error_message && (
                        <p className="text-xs text-red-400 mt-0.5 max-w-[120px] truncate">{d.error_message}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center text-zinc-400">{d.segments}</td>
                    <td className="px-4 py-3 text-right text-zinc-300">
                      {d.cost_cents ? `R$ ${(d.cost_cents / 100).toFixed(3)}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-zinc-500">
                      {new Date(d.created_at).toLocaleString('pt-BR')}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
