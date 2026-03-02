'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { AdminHeader } from '@/components/admin/admin-header'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Ticket, Plus, Search, ToggleLeft, ToggleRight, Trash2,
  Calendar, Percent, DollarSign, Users, RefreshCw, X, Check,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Coupon {
  id: string
  code: string
  description: string | null
  discount_type: 'percentage' | 'fixed'
  discount_value: number
  min_ride_value: number
  max_discount: number | null
  max_uses: number
  used_count: number
  is_active: boolean
  expires_at: string | null
  created_at: string
}

function CouponModal({
  onClose,
  onSaved,
}: {
  onClose: () => void
  onSaved: () => void
}) {
  const [code, setCode] = useState('')
  const [description, setDescription] = useState('')
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage')
  const [discountValue, setDiscountValue] = useState('')
  const [minValue, setMinValue] = useState('0')
  const [maxDiscount, setMaxDiscount] = useState('')
  const [maxUses, setMaxUses] = useState('100')
  const [expiresAt, setExpiresAt] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSave = async () => {
    if (!code.trim() || !discountValue) { setError('Preencha o codigo e o valor do desconto'); return }
    setSaving(true)
    setError('')
    const supabase = createClient()
    const { error: err } = await supabase.from('coupons').insert({
      code: code.toUpperCase().trim(),
      description: description || null,
      discount_type: discountType,
      discount_value: Number(discountValue),
      min_ride_value: Number(minValue || 0),
      max_discount: maxDiscount ? Number(maxDiscount) : null,
      max_uses: Number(maxUses || 100),
      expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
    })
    if (err) { setError(err.message); setSaving(false); return }
    onSaved()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] rounded-xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[hsl(var(--admin-border))]">
          <h2 className="text-[14px] font-bold text-slate-100">Novo Cupom</h2>
          <button type="button" onClick={onClose} className="w-7 h-7 rounded-lg hover:bg-[hsl(var(--sidebar-accent))] flex items-center justify-center text-slate-400 hover:text-slate-200 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-[11px] text-slate-500 font-medium mb-1.5 block uppercase tracking-wide">Codigo *</label>
            <Input
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase())}
              placeholder="EX: UPPI10"
              className="bg-[hsl(var(--admin-bg))] border-[hsl(var(--admin-border))] text-slate-100 font-mono uppercase h-10 rounded-lg"
            />
          </div>
          <div>
            <label className="text-[11px] text-slate-500 font-medium mb-1.5 block uppercase tracking-wide">Descricao</label>
            <Input
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Descricao do cupom"
              className="bg-[hsl(var(--admin-bg))] border-[hsl(var(--admin-border))] text-slate-100 h-10 rounded-lg"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-slate-500 font-medium mb-1.5 block uppercase tracking-wide">Tipo</label>
              <div className="flex rounded-lg overflow-hidden border border-[hsl(var(--admin-border))]">
                {(['percentage', 'fixed'] as const).map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setDiscountType(t)}
                    className={cn(
                      'flex-1 py-2 text-[12px] font-semibold transition-colors',
                      discountType === t ? 'bg-[hsl(var(--admin-green))]/20 text-[hsl(var(--admin-green))]' : 'bg-[hsl(var(--admin-bg))] text-slate-400 hover:text-slate-200'
                    )}
                  >
                    {t === 'percentage' ? '% Porcentagem' : 'R$ Fixo'}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-[11px] text-slate-500 font-medium mb-1.5 block uppercase tracking-wide">Valor *</label>
              <Input
                type="number"
                value={discountValue}
                onChange={e => setDiscountValue(e.target.value)}
                placeholder={discountType === 'percentage' ? '10' : '5.00'}
                className="bg-[hsl(var(--admin-bg))] border-[hsl(var(--admin-border))] text-slate-100 h-10 rounded-lg"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-slate-500 font-medium mb-1.5 block uppercase tracking-wide">Valor minimo R$</label>
              <Input
                type="number"
                value={minValue}
                onChange={e => setMinValue(e.target.value)}
                className="bg-[hsl(var(--admin-bg))] border-[hsl(var(--admin-border))] text-slate-100 h-10 rounded-lg"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-500 font-medium mb-1.5 block uppercase tracking-wide">Max usos</label>
              <Input
                type="number"
                value={maxUses}
                onChange={e => setMaxUses(e.target.value)}
                className="bg-[hsl(var(--admin-bg))] border-[hsl(var(--admin-border))] text-slate-100 h-10 rounded-lg"
              />
            </div>
          </div>
          {discountType === 'percentage' && (
            <div>
              <label className="text-[11px] text-slate-500 font-medium mb-1.5 block uppercase tracking-wide">Desconto maximo R$ (opcional)</label>
              <Input
                type="number"
                value={maxDiscount}
                onChange={e => setMaxDiscount(e.target.value)}
                placeholder="Sem limite"
                className="bg-[hsl(var(--admin-bg))] border-[hsl(var(--admin-border))] text-slate-100 h-10 rounded-lg"
              />
            </div>
          )}
          <div>
            <label className="text-[11px] text-slate-500 font-medium mb-1.5 block uppercase tracking-wide">Expiracao (opcional)</label>
            <Input
              type="datetime-local"
              value={expiresAt}
              onChange={e => setExpiresAt(e.target.value)}
              className="bg-[hsl(var(--admin-bg))] border-[hsl(var(--admin-border))] text-slate-100 h-10 rounded-lg"
            />
          </div>
          {error && <p className="text-[12px] text-red-400 bg-red-500/10 px-3 py-2 rounded-lg">{error}</p>}
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 h-10 rounded-lg bg-[hsl(var(--admin-bg))] border border-[hsl(var(--admin-border))] text-slate-400 text-[13px] font-semibold hover:text-slate-200 transition-colors">
              Cancelar
            </button>
            <button type="button" onClick={handleSave} disabled={saving} className="flex-1 h-10 rounded-lg bg-[hsl(var(--admin-green))]/20 text-[hsl(var(--admin-green))] text-[13px] font-bold border border-[hsl(var(--admin-green))]/30 hover:bg-[hsl(var(--admin-green))]/30 transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
              {saving ? <div className="w-4 h-4 border-2 border-[hsl(var(--admin-green))] border-t-transparent rounded-full animate-spin" /> : <Check className="w-4 h-4" />}
              Criar Cupom
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function CuponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)

  const fetchCoupons = useCallback(async () => {
    const supabase = createClient()
    const { data } = await supabase.from('coupons').select('*').order('created_at', { ascending: false })
    setCoupons(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchCoupons() }, [fetchCoupons])

  const toggleActive = async (coupon: Coupon) => {
    const supabase = createClient()
    await supabase.from('coupons').update({ is_active: !coupon.is_active }).eq('id', coupon.id)
    fetchCoupons()
  }

  const deleteCoupon = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este cupom?')) return
    const supabase = createClient()
    await supabase.from('coupons').delete().eq('id', id)
    fetchCoupons()
  }

  const filtered = coupons.filter(c =>
    !search ||
    c.code.toLowerCase().includes(search.toLowerCase()) ||
    (c.description || '').toLowerCase().includes(search.toLowerCase())
  )

  const active = coupons.filter(c => c.is_active).length
  const expired = coupons.filter(c => c.expires_at && new Date(c.expires_at) < new Date()).length
  const totalUses = coupons.reduce((s, c) => s + (c.used_count || 0), 0)

  const headerActions = (
    <button
      type="button"
      onClick={() => setShowModal(true)}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[hsl(var(--admin-green))]/15 text-[hsl(var(--admin-green))] border border-[hsl(var(--admin-green))]/30 text-[12px] font-semibold hover:bg-[hsl(var(--admin-green))]/25 transition-colors"
    >
      <Plus className="w-3.5 h-3.5" />
      Novo Cupom
    </button>
  )

  return (
    <>
      {showModal && <CouponModal onClose={() => setShowModal(false)} onSaved={fetchCoupons} />}
      <AdminHeader title="Cupons" subtitle={`${coupons.length} cupons cadastrados`} actions={headerActions} />
      <div className="flex-1 overflow-y-auto bg-[hsl(var(--admin-bg))] p-5 space-y-5">

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Total', value: coupons.length, icon: Ticket, color: 'text-blue-400', bg: 'bg-blue-500/10' },
            { label: 'Ativos', value: active, icon: Check, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
            { label: 'Expirados', value: expired, icon: Calendar, color: 'text-amber-400', bg: 'bg-amber-500/10' },
            { label: 'Usos Totais', value: totalUses, icon: Users, color: 'text-violet-400', bg: 'bg-violet-500/10' },
          ].map(s => (
            <div key={s.label} className="bg-[hsl(var(--admin-surface))] rounded-xl p-4 border border-[hsl(var(--admin-border))] flex items-center gap-3">
              <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center shrink-0', s.bg)}>
                <s.icon className={cn('w-4.5 h-4.5', s.color)} />
              </div>
              <div>
                <p className="text-[20px] font-bold text-slate-100 tabular-nums">{s.value}</p>
                <p className="text-[11px] text-slate-500">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <Input
            placeholder="Buscar por codigo ou descricao..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 h-10 bg-[hsl(var(--admin-surface))] border-[hsl(var(--admin-border))] text-slate-200 rounded-xl placeholder:text-slate-600"
          />
        </div>

        {/* Table */}
        <div className="bg-[hsl(var(--admin-surface))] rounded-xl border border-[hsl(var(--admin-border))] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="border-b border-[hsl(var(--admin-border))]">
                  {['Codigo', 'Descricao', 'Desconto', 'Usos', 'Validade', 'Status', 'Acoes'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-slate-500 font-semibold whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} className="px-4 py-10 text-center"><div className="w-5 h-5 border-2 border-[hsl(var(--admin-green))] border-t-transparent rounded-full animate-spin mx-auto" /></td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-12 text-center text-slate-600">Nenhum cupom encontrado</td></tr>
                ) : filtered.map(coupon => {
                  const isExpired = coupon.expires_at && new Date(coupon.expires_at) < new Date()
                  const usagePercent = coupon.max_uses > 0 ? (coupon.used_count / coupon.max_uses) * 100 : 0
                  return (
                    <tr key={coupon.id} className="border-b border-[hsl(var(--admin-border))]/50 hover:bg-[hsl(var(--sidebar-accent))]/40 transition-colors">
                      <td className="px-4 py-3">
                        <span className="font-mono font-bold text-[hsl(var(--admin-green))] bg-[hsl(var(--admin-green))]/10 px-2 py-0.5 rounded-md text-[11px]">
                          {coupon.code}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-400 max-w-[200px] truncate">{coupon.description || '---'}</td>
                      <td className="px-4 py-3 text-slate-200 font-semibold whitespace-nowrap">
                        {coupon.discount_type === 'percentage'
                          ? <span className="flex items-center gap-1"><Percent className="w-3 h-3 text-blue-400" />{coupon.discount_value}%</span>
                          : <span className="flex items-center gap-1"><DollarSign className="w-3 h-3 text-emerald-400" />R$ {coupon.discount_value.toFixed(2)}</span>
                        }
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-1.5 bg-[hsl(var(--admin-border))] rounded-full overflow-hidden">
                            <div className="h-full bg-[hsl(var(--admin-green))] rounded-full transition-all" style={{ width: `${Math.min(usagePercent, 100)}%` }} />
                          </div>
                          <span className="text-slate-400 tabular-nums text-[11px]">{coupon.used_count}/{coupon.max_uses}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-400 whitespace-nowrap text-[11px]">
                        {coupon.expires_at
                          ? <span className={isExpired ? 'text-red-400' : 'text-slate-400'}>{new Date(coupon.expires_at).toLocaleDateString('pt-BR')}</span>
                          : <span className="text-slate-600">Sem validade</span>
                        }
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={cn('text-[10px] font-bold border-0',
                          !coupon.is_active ? 'bg-slate-500/15 text-slate-400' :
                          isExpired ? 'bg-amber-500/15 text-amber-400' :
                          'bg-emerald-500/15 text-emerald-400'
                        )}>
                          {!coupon.is_active ? 'Inativo' : isExpired ? 'Expirado' : 'Ativo'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => toggleActive(coupon)}
                            title={coupon.is_active ? 'Desativar' : 'Ativar'}
                            className={cn(
                              'w-7 h-7 rounded-lg flex items-center justify-center transition-colors',
                              coupon.is_active ? 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20' : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                            )}
                          >
                            {coupon.is_active ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteCoupon(coupon.id)}
                            title="Excluir"
                            className="w-7 h-7 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 flex items-center justify-center transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  )
}
