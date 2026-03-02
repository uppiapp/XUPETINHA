'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { AdminHeader } from '@/components/admin/admin-header'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Search, DollarSign, CreditCard, CheckCircle, XCircle,
  Clock, TrendingUp, TrendingDown, Wallet, ArrowUpRight, ArrowDownLeft,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Payment {
  id: string
  ride_id: string
  passenger_id: string
  driver_id: string | null
  amount: number
  platform_fee: number
  driver_earnings: number
  status: string
  payment_method: string
  gateway_transaction_id: string | null
  created_at: string
  paid_at: string | null
  passenger?: { full_name: string } | null
  driver?: { full_name: string } | null
}

interface WalletTx {
  id: string
  user_id: string
  amount: number
  type: string
  description: string
  created_at: string
  user?: { full_name: string } | null
}

type Tab = 'payments' | 'wallet'

const statusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pendente', color: 'bg-amber-500/15 text-amber-400' },
  completed: { label: 'Pago', color: 'bg-emerald-500/15 text-emerald-400' },
  failed: { label: 'Falhou', color: 'bg-red-500/15 text-red-400' },
  refunded: { label: 'Reembolsado', color: 'bg-blue-500/15 text-blue-400' },
}

const methodLabel: Record<string, string> = {
  pix: 'PIX',
  credit_card: 'Cartao Credito',
  wallet: 'Carteira',
  cash: 'Dinheiro',
}

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [walletTxs, setWalletTxs] = useState<WalletTx[]>([])
  const [tab, setTab] = useState<Tab>('payments')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    const supabase = createClient()
    const [paymentsRes, walletRes] = await Promise.all([
      supabase
        .from('payments')
        .select('*, passenger:profiles!payments_passenger_id_fkey(full_name), driver:profiles!payments_driver_id_fkey(full_name)')
        .order('created_at', { ascending: false })
        .limit(200),
      supabase
        .from('wallet_transactions')
        .select('*, user:profiles!wallet_transactions_user_id_fkey(full_name)')
        .order('created_at', { ascending: false })
        .limit(200),
    ])
    if (paymentsRes.data) setPayments(paymentsRes.data)
    if (walletRes.data) setWalletTxs(walletRes.data)
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchData()
    const supabase = createClient()
    const channel = supabase
      .channel('admin-payments-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wallet_transactions' }, () => fetchData())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [fetchData])

  // KPIs
  const totalRevenue = payments.filter(p => p.status === 'completed').reduce((s, p) => s + Number(p.platform_fee), 0)
  const totalVolume = payments.filter(p => p.status === 'completed').reduce((s, p) => s + Number(p.amount), 0)
  const totalDriverEarnings = payments.filter(p => p.status === 'completed').reduce((s, p) => s + Number(p.driver_earnings), 0)
  const pendingCount = payments.filter(p => p.status === 'pending').length

  const filteredPayments = payments.filter((p) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      p.passenger?.full_name?.toLowerCase().includes(q) ||
      p.driver?.full_name?.toLowerCase().includes(q) ||
      p.id.includes(q) ||
      p.gateway_transaction_id?.toLowerCase().includes(q)
    )
  })

  const filteredWallet = walletTxs.filter((t) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      t.user?.full_name?.toLowerCase().includes(q) ||
      t.description?.toLowerCase().includes(q) ||
      t.id.includes(q)
    )
  })

  if (loading) {
    return (
      <>
        <AdminHeader title="Pagamentos" subtitle="Carregando..." />
        <div className="flex-1 flex items-center justify-center bg-[hsl(var(--admin-bg))]">
          <div className="w-6 h-6 border-2 border-[hsl(var(--admin-green))] border-t-transparent rounded-full animate-spin" />
        </div>
      </>
    )
  }

  return (
    <>
      <AdminHeader
        title="Pagamentos"
        subtitle={`${payments.length} transacoes · R$ ${totalVolume.toFixed(2)} volume total`}
      />
      <div className="flex-1 overflow-hidden flex flex-col bg-[hsl(var(--admin-bg))]">
        {/* KPI Cards */}
        <div className="p-4 pb-0 grid grid-cols-2 md:grid-cols-4 gap-3 shrink-0">
          {[
            { label: 'Receita Plataforma', value: `R$ ${totalRevenue.toFixed(2)}`, icon: TrendingUp, color: 'text-[hsl(var(--admin-green))]', bg: 'bg-[hsl(var(--admin-green))]/10' },
            { label: 'Volume Total', value: `R$ ${totalVolume.toFixed(2)}`, icon: DollarSign, color: 'text-blue-400', bg: 'bg-blue-500/10' },
            { label: 'Repasse Motoristas', value: `R$ ${totalDriverEarnings.toFixed(2)}`, icon: ArrowUpRight, color: 'text-purple-400', bg: 'bg-purple-500/10' },
            { label: 'Pendentes', value: String(pendingCount), icon: Clock, color: 'text-amber-400', bg: 'bg-amber-500/10' },
          ].map((kpi) => (
            <div key={kpi.label} className="bg-[hsl(var(--admin-surface))] rounded-xl p-4 border border-[hsl(var(--admin-border))] flex items-center gap-3">
              <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0', kpi.bg)}>
                <kpi.icon className={cn('w-4 h-4', kpi.color)} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] text-slate-500 font-medium truncate">{kpi.label}</p>
                <p className={cn('text-[16px] font-bold tabular-nums', kpi.color)}>{kpi.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Tabs + Search */}
        <div className="p-4 pb-0 flex items-center gap-3 shrink-0">
          <div className="flex gap-1 bg-[hsl(var(--admin-surface))] p-1 rounded-xl border border-[hsl(var(--admin-border))]">
            {(['payments', 'wallet'] as Tab[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => { setTab(t); setSearch('') }}
                className={cn(
                  'px-4 py-1.5 rounded-lg text-[12px] font-semibold transition-colors',
                  tab === t
                    ? 'bg-[hsl(var(--admin-green))]/15 text-[hsl(var(--admin-green))]'
                    : 'text-slate-500 hover:text-slate-300'
                )}
              >
                {t === 'payments' ? `Corridas (${payments.length})` : `Carteira (${walletTxs.length})`}
              </button>
            ))}
          </div>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
            <Input
              placeholder="Buscar por nome, ID, transacao..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-9 rounded-xl bg-[hsl(var(--admin-surface))] border-[hsl(var(--admin-border))] text-slate-200 placeholder:text-slate-600 text-[12px]"
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {tab === 'payments' && (
            <>
              {filteredPayments.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-slate-600">
                  <CreditCard className="w-10 h-10 mb-2 opacity-30" />
                  <p className="text-[14px]">Nenhum pagamento encontrado</p>
                </div>
              )}
              {filteredPayments.map((p) => {
                const sc = statusConfig[p.status] || statusConfig.pending
                return (
                  <div key={p.id} className="bg-[hsl(var(--admin-surface))] rounded-xl border border-[hsl(var(--admin-border))] p-4">
                    <div className="flex items-start gap-3">
                      <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', sc.color)}>
                        {p.status === 'completed' ? <CheckCircle className="w-5 h-5" /> :
                         p.status === 'failed' ? <XCircle className="w-5 h-5" /> :
                         <Clock className="w-5 h-5" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <Badge className={cn('text-[10px] border-0 font-bold px-2 py-0.5', sc.color)}>{sc.label}</Badge>
                          <span className="text-[11px] text-slate-400 font-medium">{methodLabel[p.payment_method] || p.payment_method}</span>
                          <span className="text-[11px] text-slate-500 ml-auto tabular-nums">
                            {new Date(p.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-[12px] flex-wrap">
                          <span className="text-slate-300">
                            {p.passenger?.full_name || 'Passageiro'} → {p.driver?.full_name || 'Motorista'}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-2 flex-wrap">
                          <span className="text-[13px] font-bold text-slate-100 tabular-nums">R$ {Number(p.amount).toFixed(2)}</span>
                          <span className="text-[11px] text-slate-500">Taxa: <span className="text-[hsl(var(--admin-green))]">R$ {Number(p.platform_fee).toFixed(2)}</span></span>
                          <span className="text-[11px] text-slate-500">Motorista: <span className="text-purple-400">R$ {Number(p.driver_earnings).toFixed(2)}</span></span>
                        </div>
                        {p.gateway_transaction_id && (
                          <p className="text-[10px] text-slate-700 font-mono mt-1 truncate">TXN: {p.gateway_transaction_id}</p>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </>
          )}

          {tab === 'wallet' && (
            <>
              {filteredWallet.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-slate-600">
                  <Wallet className="w-10 h-10 mb-2 opacity-30" />
                  <p className="text-[14px]">Nenhuma transacao de carteira</p>
                </div>
              )}
              {filteredWallet.map((tx) => (
                <div key={tx.id} className="bg-[hsl(var(--admin-surface))] rounded-xl border border-[hsl(var(--admin-border))] p-4">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
                      tx.type === 'credit' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'
                    )}>
                      {tx.type === 'credit' ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[13px] font-semibold text-slate-200 truncate">{tx.user?.full_name || 'Usuario'}</p>
                        <p className={cn(
                          'text-[15px] font-bold tabular-nums shrink-0',
                          tx.type === 'credit' ? 'text-emerald-400' : 'text-red-400'
                        )}>
                          {tx.type === 'credit' ? '+' : '-'}R$ {Math.abs(Number(tx.amount)).toFixed(2)}
                        </p>
                      </div>
                      <p className="text-[12px] text-slate-500 truncate">{tx.description || 'Transacao'}</p>
                      <p className="text-[11px] text-slate-600 tabular-nums mt-0.5">
                        {new Date(tx.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </>
  )
}
