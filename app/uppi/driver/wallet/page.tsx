'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import type { WalletTransaction } from '@/lib/types/database'
import { DriverBottomNavigation } from '@/components/driver-bottom-navigation'

export default function DriverWalletPage() {
  const router = useRouter()
  const supabase = createClient()

  const [balance, setBalance] = useState(0)
  const [pendingBalance, setPendingBalance] = useState(0)
  const [transactions, setTransactions] = useState<WalletTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [withdrawing, setWithdrawing] = useState(false)
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [showWithdraw, setShowWithdraw] = useState(false)

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null

    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/onboarding/splash'); return }

      await loadWallet()

      // Real-time: listen for wallet transaction changes
      channel = supabase
        .channel(`driver-wallet-${user.id}`)
        .on('postgres_changes', {
          event: '*', schema: 'public', table: 'wallet_transactions',
          filter: `user_id=eq.${user.id}`,
        }, () => loadWallet())
        .on('postgres_changes', {
          event: 'UPDATE', schema: 'public', table: 'user_wallets',
          filter: `user_id=eq.${user.id}`,
        }, () => loadWallet())
        .subscribe()
    }

    init()
    return () => { channel && supabase.removeChannel(channel) }
  }, [])

  const loadWallet = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/onboarding/splash'); return }

      const [{ data: wallet }, { data: txs }] = await Promise.all([
        supabase.from('user_wallets').select('balance').eq('user_id', user.id).single(),
        supabase.from('wallet_transactions')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(30),
      ])

      setBalance(wallet?.balance || 0)
      setTransactions(txs || [])

      // Saldo pendente: corridas completadas ainda não liquidadas
      const pending = (txs || [])
        .filter(t => t.status === 'pending' && t.type === 'credit')
        .reduce((s, t) => s + t.amount, 0)
      setPendingBalance(pending)
    } finally {
      setLoading(false)
    }
  }

  const handleWithdraw = async () => {
    const amount = parseFloat(withdrawAmount)
    if (!amount || amount <= 0 || amount > balance) return

    setWithdrawing(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      await supabase.from('wallet_transactions').insert({
        user_id: user.id,
        type: 'withdrawal',
        amount: -amount,
        description: 'Saque para conta bancária',
        status: 'pending',
      })

      await supabase.from('user_wallets').update({ balance: balance - amount }).eq('user_id', user.id)
      setShowWithdraw(false)
      setWithdrawAmount('')
      await loadWallet()
    } finally {
      setWithdrawing(false)
    }
  }

  const txIcon = (type: string) => {
    if (type === 'credit') return { bg: 'bg-emerald-50', color: 'text-emerald-500', sign: '+' }
    if (type === 'withdrawal') return { bg: 'bg-blue-50', color: 'text-blue-500', sign: '-' }
    if (type === 'debit') return { bg: 'bg-red-50', color: 'text-red-500', sign: '-' }
    if (type === 'bonus') return { bg: 'bg-amber-50', color: 'text-amber-500', sign: '+' }
    return { bg: 'bg-[color:var(--muted)]', color: 'text-[color:var(--muted-foreground)]', sign: '' }
  }

  const formatDate = (d: string) => new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })

  if (loading) {
    return (
      <div className="h-dvh bg-[color:var(--background)] flex items-center justify-center">
        <div className="w-8 h-8 border-[2.5px] border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <>
      <div className="h-dvh overflow-y-auto bg-[color:var(--background)] pb-8 ios-scroll">
        {/* Header */}
        <header className="bg-[color:var(--card)]/80 ios-blur border-b border-[color:var(--border)] sticky top-0 z-30">
          <div className="px-5 pt-safe-offset-4 pb-3 flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="w-9 h-9 flex items-center justify-center rounded-full bg-[color:var(--muted)] ios-press"
            >
              <svg className="w-5 h-5 text-[color:var(--foreground)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-[20px] font-bold text-[color:var(--foreground)] tracking-tight">Carteira do Motorista</h1>
          </div>
        </header>

        <main className="px-5 py-5 max-w-lg mx-auto">
          {/* Balance card */}
          <div className="bg-emerald-500 rounded-[28px] p-6 mb-5 shadow-xl shadow-emerald-500/25 animate-ios-fade-up">
            <p className="text-[13px] font-semibold text-white/70 uppercase tracking-wider mb-1">Saldo disponível</p>
            <p className="text-[42px] font-black text-white tracking-tight leading-none">
              R$ {balance.toFixed(2)}
            </p>
            {pendingBalance > 0 && (
              <p className="text-[13px] text-white/70 mt-2">
                + R$ {pendingBalance.toFixed(2)} pendente de liberação
              </p>
            )}

            <div className="flex gap-3 mt-5">
              <button
                type="button"
                onClick={() => setShowWithdraw(true)}
                className="flex-1 h-11 bg-white/20 hover:bg-white/30 text-white font-bold text-[15px] rounded-[14px] ios-press transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                Sacar
              </button>
              <button
                type="button"
                onClick={() => router.push('/uppi/driver/earnings')}
                className="flex-1 h-11 bg-white/20 hover:bg-white/30 text-white font-bold text-[15px] rounded-[14px] ios-press transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Ganhos
              </button>
            </div>
          </div>

          {/* Transactions */}
          <div className="animate-ios-fade-up" style={{ animationDelay: '80ms' }}>
            <p className="text-[12px] font-bold text-[color:var(--muted-foreground)] uppercase tracking-wider mb-3 px-1">
              Extrato ({transactions.length})
            </p>

            {transactions.length === 0 ? (
              <div className="bg-[color:var(--card)] rounded-[24px] p-12 text-center border border-[color:var(--border)]">
                <p className="text-[16px] font-bold text-[color:var(--foreground)]">Nenhuma transação</p>
                <p className="text-[13px] text-[color:var(--muted-foreground)] mt-1">Complete corridas para ver seus ganhos aqui</p>
              </div>
            ) : (
              <div className="bg-[color:var(--card)] rounded-[24px] border border-[color:var(--border)] overflow-hidden">
                {transactions.map((tx, i) => {
                  const t = txIcon(tx.type)
                  return (
                    <div
                      key={tx.id}
                      className={cn('flex items-center gap-4 px-5 py-4', i > 0 && 'border-t border-[color:var(--border)]')}
                    >
                      <div className={cn('w-10 h-10 rounded-full flex items-center justify-center shrink-0', t.bg)}>
                        <svg className={cn('w-5 h-5', t.color)} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          {tx.type === 'credit' || tx.type === 'bonus'
                            ? <path strokeLinecap="round" strokeLinejoin="round" d="M7 11l5-5m0 0l5 5m-5-5v12" />
                            : <path strokeLinecap="round" strokeLinejoin="round" d="M17 13l-5 5m0 0l-5-5m5 5V6" />
                          }
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] font-semibold text-[color:var(--foreground)] truncate">
                          {tx.description || tx.type}
                        </p>
                        <p className="text-[12px] text-[color:var(--muted-foreground)]">{formatDate(tx.created_at)}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className={cn('text-[16px] font-bold', t.color)}>
                          {t.sign}R$ {Math.abs(tx.amount).toFixed(2)}
                        </p>
                        {tx.status === 'pending' && (
                          <p className="text-[11px] text-amber-500 font-semibold">pendente</p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </main>
      </div>

      <DriverBottomNavigation />

      {/* Withdraw modal */}
      {showWithdraw && (
        <div className="fixed inset-0 z-50 flex items-end">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            onClick={() => setShowWithdraw(false)}
            aria-label="Fechar"
          />
          <div className="relative w-full bg-[color:var(--card)] rounded-t-[28px] p-6 pb-safe-offset-6 animate-ios-slide-up max-w-lg mx-auto">
            <div className="w-9 h-[5px] bg-[color:var(--muted-foreground)]/30 rounded-full mx-auto mb-5" />
            <h2 className="text-[20px] font-bold text-[color:var(--foreground)] mb-1">Solicitar saque</h2>
            <p className="text-[13px] text-[color:var(--muted-foreground)] mb-5">
              Saldo disponível: <strong className="text-emerald-600">R$ {balance.toFixed(2)}</strong>
            </p>
            <input
              type="number"
              value={withdrawAmount}
              onChange={e => setWithdrawAmount(e.target.value)}
              placeholder="0,00"
              max={balance}
              className="w-full h-14 px-4 bg-[color:var(--muted)] rounded-[16px] text-[24px] font-bold text-[color:var(--foreground)] outline-none focus:ring-2 focus:ring-emerald-500 mb-4 text-center"
            />
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowWithdraw(false)}
                className="flex-1 h-12 bg-[color:var(--muted)] text-[color:var(--foreground)] font-semibold rounded-[14px] ios-press"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleWithdraw}
                disabled={withdrawing || !withdrawAmount || parseFloat(withdrawAmount) > balance}
                className="flex-1 h-12 bg-emerald-500 text-white font-bold rounded-[14px] ios-press disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {withdrawing ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Sacar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
