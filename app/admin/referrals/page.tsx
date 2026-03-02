'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { AdminHeader } from '@/components/admin/admin-header'
import { Input } from '@/components/ui/input'
import { Search, Users, Gift, TrendingUp, Award, User, CheckCircle, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Referral {
  id: string
  referrer_id: string
  referred_id: string
  referral_code: string
  status: string
  reward_amount: number
  reward_paid: boolean
  created_at: string
  converted_at: string | null
  referrer?: { full_name: string; phone: string } | null
  referred?: { full_name: string; phone: string } | null
}

interface Profile {
  id: string
  full_name: string
  referral_code: string | null
  referral_count: number
  total_referral_earnings: number
}

type Tab = 'referrals' | 'top'

export default function AdminReferralsPage() {
  const [referrals, setReferrals] = useState<Referral[]>([])
  const [topReferrers, setTopReferrers] = useState<Profile[]>([])
  const [tab, setTab] = useState<Tab>('referrals')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    const supabase = createClient()

    const [refRes, topRes] = await Promise.all([
      supabase
        .from('referrals')
        .select('*, referrer:profiles!referrals_referrer_id_fkey(full_name, phone), referred:profiles!referrals_referred_id_fkey(full_name, phone)')
        .order('created_at', { ascending: false })
        .limit(200),
      supabase
        .from('profiles')
        .select('id, full_name, referral_code, referral_count, total_referral_earnings')
        .order('referral_count', { ascending: false })
        .gt('referral_count', 0)
        .limit(50),
    ])

    if (refRes.data) setReferrals(refRes.data)
    if (topRes.data) setTopReferrers(topRes.data)
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const totalReferrals = referrals.length
  const convertedCount = referrals.filter(r => r.status === 'converted').length
  const conversionRate = totalReferrals ? ((convertedCount / totalReferrals) * 100).toFixed(0) : '0'
  const totalRewards = referrals.filter(r => r.reward_paid).reduce((s, r) => s + Number(r.reward_amount), 0)

  const filtered = (tab === 'referrals' ? referrals : []).filter((r) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      r.referrer?.full_name?.toLowerCase().includes(q) ||
      r.referred?.full_name?.toLowerCase().includes(q) ||
      r.referral_code?.toLowerCase().includes(q)
    )
  })

  const filteredTop = topReferrers.filter((p) => {
    if (!search) return true
    const q = search.toLowerCase()
    return p.full_name?.toLowerCase().includes(q) || p.referral_code?.toLowerCase().includes(q)
  })

  if (loading) {
    return (
      <>
        <AdminHeader title="Indicacoes" subtitle="Carregando..." />
        <div className="flex-1 flex items-center justify-center bg-[hsl(var(--admin-bg))]">
          <div className="w-6 h-6 border-2 border-[hsl(var(--admin-green))] border-t-transparent rounded-full animate-spin" />
        </div>
      </>
    )
  }

  return (
    <>
      <AdminHeader
        title="Indicacoes"
        subtitle={`${totalReferrals} indicacoes · ${convertedCount} convertidas · ${conversionRate}% taxa`}
      />
      <div className="flex-1 overflow-hidden flex flex-col bg-[hsl(var(--admin-bg))]">
        {/* KPIs */}
        <div className="p-4 pb-0 grid grid-cols-2 md:grid-cols-4 gap-3 shrink-0">
          {[
            { label: 'Total Indicacoes', value: String(totalReferrals), icon: Users, color: 'text-blue-400', bg: 'bg-blue-500/10' },
            { label: 'Convertidas', value: String(convertedCount), icon: CheckCircle, color: 'text-[hsl(var(--admin-green))]', bg: 'bg-[hsl(var(--admin-green))]/10' },
            { label: 'Taxa Conversao', value: `${conversionRate}%`, icon: TrendingUp, color: 'text-purple-400', bg: 'bg-purple-500/10' },
            { label: 'Recompensas Pagas', value: `R$ ${totalRewards.toFixed(2)}`, icon: Gift, color: 'text-amber-400', bg: 'bg-amber-500/10' },
          ].map((kpi) => (
            <div key={kpi.label} className="bg-[hsl(var(--admin-surface))] rounded-xl p-4 border border-[hsl(var(--admin-border))] flex items-center gap-3">
              <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0', kpi.bg)}>
                <kpi.icon className={cn('w-4 h-4', kpi.color)} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] text-slate-500 font-medium">{kpi.label}</p>
                <p className={cn('text-[16px] font-bold tabular-nums', kpi.color)}>{kpi.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Tabs + Search */}
        <div className="p-4 pb-0 flex items-center gap-3 shrink-0">
          <div className="flex gap-1 bg-[hsl(var(--admin-surface))] p-1 rounded-xl border border-[hsl(var(--admin-border))]">
            {(['referrals', 'top'] as Tab[]).map((t) => (
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
                {t === 'referrals' ? `Historico (${referrals.length})` : `Top Indicadores (${topReferrers.length})`}
              </button>
            ))}
          </div>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
            <Input
              placeholder="Buscar por nome ou codigo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-9 rounded-xl bg-[hsl(var(--admin-surface))] border-[hsl(var(--admin-border))] text-slate-200 placeholder:text-slate-600 text-[12px]"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {tab === 'referrals' && (
            <>
              {filtered.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-slate-600">
                  <Users className="w-10 h-10 mb-2 opacity-30" />
                  <p className="text-[14px]">Nenhuma indicacao encontrada</p>
                </div>
              )}
              {filtered.map((ref) => (
                <div key={ref.id} className="bg-[hsl(var(--admin-surface))] rounded-xl border border-[hsl(var(--admin-border))] p-4">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
                      ref.status === 'converted' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400'
                    )}>
                      {ref.status === 'converted'
                        ? <CheckCircle className="w-5 h-5" />
                        : <Clock className="w-5 h-5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-[12px] font-semibold text-slate-200">
                          {ref.referrer?.full_name || 'Indicador'} indicou {ref.referred?.full_name || 'Indicado'}
                        </span>
                        <span className="text-[11px] text-slate-500 ml-auto tabular-nums">
                          {new Date(ref.created_at).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-slate-500 flex-wrap">
                        <span className="font-mono bg-[hsl(var(--admin-bg))] px-2 py-0.5 rounded border border-[hsl(var(--admin-border))]">
                          {ref.referral_code}
                        </span>
                        <span className={cn(
                          'font-semibold',
                          ref.status === 'converted' ? 'text-emerald-400' : 'text-amber-400'
                        )}>
                          {ref.status === 'converted' ? 'Convertido' : 'Pendente'}
                        </span>
                        {ref.reward_amount > 0 && (
                          <span className={cn('font-semibold', ref.reward_paid ? 'text-[hsl(var(--admin-green))]' : 'text-slate-400')}>
                            R$ {Number(ref.reward_amount).toFixed(2)} {ref.reward_paid ? 'pago' : 'pendente'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}

          {tab === 'top' && (
            <>
              {filteredTop.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-slate-600">
                  <Award className="w-10 h-10 mb-2 opacity-30" />
                  <p className="text-[14px]">Nenhum indicador encontrado</p>
                </div>
              )}
              {filteredTop.map((profile, idx) => (
                <div key={profile.id} className="bg-[hsl(var(--admin-surface))] rounded-xl border border-[hsl(var(--admin-border))] p-4">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      'w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-[15px] font-black',
                      idx === 0 ? 'bg-yellow-500/20 text-yellow-400' :
                      idx === 1 ? 'bg-slate-400/20 text-slate-300' :
                      idx === 2 ? 'bg-amber-600/20 text-amber-500' :
                      'bg-[hsl(var(--admin-bg))] text-slate-500'
                    )}>
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-semibold text-slate-200 truncate">{profile.full_name}</p>
                      <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-0.5 flex-wrap">
                        {profile.referral_code && (
                          <span className="font-mono bg-[hsl(var(--admin-bg))] px-2 py-0.5 rounded border border-[hsl(var(--admin-border))]">
                            {profile.referral_code}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[15px] font-bold text-[hsl(var(--admin-green))] tabular-nums">{profile.referral_count}</p>
                      <p className="text-[10px] text-slate-500">indicacoes</p>
                      {profile.total_referral_earnings > 0 && (
                        <p className="text-[12px] font-semibold text-amber-400 tabular-nums mt-0.5">
                          R$ {Number(profile.total_referral_earnings).toFixed(2)}
                        </p>
                      )}
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
