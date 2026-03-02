'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { AdminHeader } from '@/components/admin/admin-header'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  UserCog, Search, CheckCircle, XCircle, Star, Car,
  Eye, Clock, FileText, ChevronRight, RefreshCw,
  ShieldCheck, ShieldX, ToggleLeft, ToggleRight, Ban, UserCheck,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface DriverProfile {
  id: string
  vehicle_brand: string | null
  vehicle_model: string | null
  vehicle_plate: string | null
  vehicle_color: string | null
  vehicle_type: string | null
  vehicle_year: number | null
  is_verified: boolean
  is_available: boolean
  total_earnings: number
  rating: number
  total_rides: number
  acceptance_rate: number
  completion_rate: number
  cnh_expiry: string | null
  cnh_number: string | null
  created_at: string
  profile?: {
    full_name: string
    phone: string
    avatar_url: string | null
    is_banned: boolean
  } | null
}

type Tab = 'all' | 'pending' | 'verified' | 'available'

const tabs: { key: Tab; label: string }[] = [
  { key: 'all', label: 'Todos' },
  { key: 'pending', label: 'Pendentes' },
  { key: 'verified', label: 'Verificados' },
  { key: 'available', label: 'Online Agora' },
]

export default function DriversPage() {
  const [drivers, setDrivers] = useState<DriverProfile[]>([])
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState<Tab>('all')
  const [selected, setSelected] = useState<DriverProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)

  const fetchDrivers = useCallback(async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('driver_profiles')
      .select('*, profile:profiles!driver_profiles_id_fkey(full_name, phone, avatar_url, is_banned)')
      .order('created_at', { ascending: false })
    setDrivers((data as DriverProfile[]) || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchDrivers()
    const supabase = createClient()
    const channel = supabase
      .channel('admin-drivers')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'driver_profiles' }, () => fetchDrivers())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [fetchDrivers])

  const filtered = drivers.filter((d) => {
    if (tab === 'pending' && d.is_verified) return false
    if (tab === 'verified' && !d.is_verified) return false
    if (tab === 'available' && !d.is_available) return false
    if (search) {
      const q = search.toLowerCase()
      return (
        d.profile?.full_name?.toLowerCase().includes(q) ||
        d.vehicle_plate?.toLowerCase().includes(q) ||
        d.profile?.phone?.includes(q)
      )
    }
    return true
  })

  const counts = {
    all: drivers.length,
    pending: drivers.filter(d => !d.is_verified).length,
    verified: drivers.filter(d => d.is_verified).length,
    available: drivers.filter(d => d.is_available).length,
  }

  const toggleVerify = async (driver: DriverProfile) => {
    setActionLoading(true)
    const supabase = createClient()
    await supabase
      .from('driver_profiles')
      .update({ is_verified: !driver.is_verified })
      .eq('id', driver.id)
    await fetchDrivers()
    if (selected?.id === driver.id) {
      setSelected(prev => prev ? { ...prev, is_verified: !prev.is_verified } : null)
    }
    setActionLoading(false)
  }

  const toggleBan = async (driver: DriverProfile) => {
    if (!driver.profile) return
    setActionLoading(true)
    const supabase = createClient()
    const newBanned = !driver.profile.is_banned
    await supabase
      .from('profiles')
      .update({
        is_banned: newBanned,
        ban_reason: newBanned ? 'Banido pelo admin' : null,
        banned_at: newBanned ? new Date().toISOString() : null,
      })
      .eq('id', driver.id)
    await fetchDrivers()
    if (selected?.id === driver.id) {
      setSelected(prev =>
        prev ? { ...prev, profile: prev.profile ? { ...prev.profile, is_banned: newBanned } : null } : null
      )
    }
    setActionLoading(false)
  }

  const headerActions = (
    <button
      type="button"
      onClick={fetchDrivers}
      className="w-8 h-8 rounded-lg bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] flex items-center justify-center text-slate-400 hover:text-slate-200 transition-colors"
    >
      <RefreshCw className="w-3.5 h-3.5" />
    </button>
  )

  if (loading) {
    return (
      <>
        <AdminHeader title="Motoristas" subtitle="Carregando..." actions={headerActions} />
        <div className="flex-1 flex items-center justify-center bg-[hsl(var(--admin-bg))]">
          <div className="w-6 h-6 border-2 border-[hsl(var(--admin-green))] border-t-transparent rounded-full animate-spin" />
        </div>
      </>
    )
  }

  return (
    <>
      <AdminHeader
        title="Motoristas"
        subtitle={`${drivers.length} motoristas cadastrados · ${counts.pending} pendentes`}
        actions={headerActions}
      />
      <div className="flex-1 overflow-hidden flex bg-[hsl(var(--admin-bg))]">

        {/* Lista esquerda */}
        <div className="flex-1 flex flex-col overflow-hidden border-r border-[hsl(var(--admin-border))]">
          <div className="p-4 pb-0 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <Input
                placeholder="Buscar por nome, placa ou telefone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-10 rounded-xl bg-[hsl(var(--admin-surface))] border-[hsl(var(--admin-border))] text-slate-200 placeholder:text-slate-600"
              />
            </div>
            <div className="flex gap-1">
              {tabs.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setTab(t.key)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-colors',
                    tab === t.key
                      ? 'bg-[hsl(var(--admin-green))]/20 text-[hsl(var(--admin-green))]'
                      : 'bg-[hsl(var(--admin-surface))] text-slate-400 hover:text-slate-200 border border-[hsl(var(--admin-border))]'
                  )}
                >
                  {t.label}
                  <span className={cn(
                    'text-[10px] px-1.5 py-0.5 rounded font-bold',
                    tab === t.key ? 'bg-[hsl(var(--admin-green))]/20' : 'bg-[hsl(var(--admin-border))]'
                  )}>
                    {counts[t.key]}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-1.5">
            {filtered.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => setSelected(d)}
                className={cn(
                  'w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all duration-150',
                  selected?.id === d.id
                    ? 'bg-[hsl(var(--admin-green))]/10 ring-1 ring-[hsl(var(--admin-green))]/30'
                    : 'hover:bg-[hsl(var(--admin-surface))]'
                )}
              >
                <Avatar className="w-10 h-10 shrink-0">
                  <AvatarImage src={d.profile?.avatar_url || undefined} />
                  <AvatarFallback className="bg-emerald-500/15 text-emerald-500 text-xs font-bold">
                    {d.profile?.full_name?.charAt(0) || 'M'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-[14px] font-semibold text-slate-100 truncate">
                      {d.profile?.full_name || 'Sem nome'}
                    </span>
                    {d.is_verified
                      ? <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      : <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    }
                    {d.profile?.is_banned && <Ban className="w-3.5 h-3.5 text-red-400 shrink-0" />}
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-slate-500">
                    {d.vehicle_plate && (
                      <span className="font-mono bg-[hsl(var(--admin-border))] px-1.5 py-0.5 rounded text-slate-300 text-[10px]">
                        {d.vehicle_plate}
                      </span>
                    )}
                    <span>{d.vehicle_brand} {d.vehicle_model}</span>
                    <span className="flex items-center gap-0.5">
                      <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                      {(d.rating || 5).toFixed(1)}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <Badge className={cn(
                    'text-[9px] font-bold border-0 px-1.5',
                    d.is_available ? 'bg-emerald-500/15 text-emerald-400' : 'bg-slate-500/15 text-slate-500'
                  )}>
                    {d.is_available ? 'Online' : 'Offline'}
                  </Badge>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
                </div>
              </button>
            ))}
            {filtered.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-slate-600">
                <UserCog className="w-10 h-10 mb-2 opacity-30" />
                <p className="text-[14px] font-medium">Nenhum motorista encontrado</p>
              </div>
            )}
          </div>
        </div>

        {/* Painel de detalhes direita */}
        <div className="hidden lg:flex w-[400px] flex-col overflow-y-auto bg-[hsl(var(--admin-bg))]">
          {selected ? (
            <div className="p-6 space-y-5">
              {/* Header do perfil */}
              <div className="text-center">
                <Avatar className="w-20 h-20 mx-auto mb-3 ring-4 ring-[hsl(var(--admin-border))]">
                  <AvatarImage src={selected.profile?.avatar_url || undefined} />
                  <AvatarFallback className="bg-emerald-500/20 text-emerald-400 text-2xl font-bold">
                    {selected.profile?.full_name?.charAt(0) || 'M'}
                  </AvatarFallback>
                </Avatar>
                <h2 className="text-[20px] font-bold text-slate-100">{selected.profile?.full_name || 'Motorista'}</h2>
                <p className="text-[13px] text-slate-500 mt-0.5">{selected.profile?.phone || '—'}</p>
                <div className="flex items-center justify-center gap-2 mt-2">
                  <Badge className={cn('text-[11px] border-0', selected.is_verified ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400')}>
                    {selected.is_verified ? 'Verificado' : 'Pendente de verificação'}
                  </Badge>
                  {selected.is_available && (
                    <Badge className="text-[11px] border-0 bg-blue-500/15 text-blue-400">Online</Badge>
                  )}
                  {selected.profile?.is_banned && (
                    <Badge className="text-[11px] border-0 bg-red-500/15 text-red-400">Banido</Badge>
                  )}
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-5 gap-2">
                {[
                  { label: 'Corridas', value: selected.total_rides || 0 },
                  { label: 'Avaliacao', value: (selected.rating || 5).toFixed(1) },
                  { label: 'Ganhos', value: `R$${(selected.total_earnings || 0).toFixed(0)}` },
                  { label: 'Aceitacao', value: `${(selected.acceptance_rate || 0).toFixed(0)}%` },
                  { label: 'Conclusao', value: `${(selected.completion_rate || 0).toFixed(0)}%` },
                ].map(s => (
                  <div key={s.label} className="bg-[hsl(var(--admin-surface))] rounded-xl p-3 text-center border border-[hsl(var(--admin-border))]">
                    <p className="text-[18px] font-bold text-slate-100 tabular-nums">{s.value}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Veículo */}
              <div className="bg-[hsl(var(--admin-surface))] rounded-xl border border-[hsl(var(--admin-border))] overflow-hidden">
                <div className="px-4 py-3 border-b border-[hsl(var(--admin-border))] flex items-center gap-2">
                  <Car className="w-4 h-4 text-slate-400" />
                  <h3 className="text-[13px] font-bold text-slate-200">Veículo</h3>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-3 p-4 text-[12px]">
                  {[
                    { label: 'Marca', value: selected.vehicle_brand },
                    { label: 'Modelo', value: selected.vehicle_model },
                    { label: 'Placa', value: selected.vehicle_plate, mono: true },
                    { label: 'Cor', value: selected.vehicle_color },
                    { label: 'Ano', value: selected.vehicle_year },
                    { label: 'Tipo', value: selected.vehicle_type },
                  ].map(f => (
                    <div key={f.label}>
                      <p className="text-slate-500 mb-0.5">{f.label}</p>
                      <p className={cn('font-semibold text-slate-200', f.mono && 'font-mono uppercase')}>
                        {f.value || '—'}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* CNH */}
              <div className="bg-[hsl(var(--admin-surface))] rounded-xl border border-[hsl(var(--admin-border))] overflow-hidden">
                <div className="px-4 py-3 border-b border-[hsl(var(--admin-border))] flex items-center gap-2">
                  <FileText className="w-4 h-4 text-slate-400" />
                  <h3 className="text-[13px] font-bold text-slate-200">Documentação</h3>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-3 p-4 text-[12px]">
                  <div>
                    <p className="text-slate-500 mb-0.5">CNH</p>
                    <p className="font-semibold text-slate-200 font-mono">{selected.cnh_number || '—'}</p>
                  </div>
                  <div>
                    <p className="text-slate-500 mb-0.5">Validade CNH</p>
                    <p className={cn('font-semibold',
                      selected.cnh_expiry && new Date(selected.cnh_expiry) < new Date()
                        ? 'text-red-400' : 'text-slate-200'
                    )}>
                      {selected.cnh_expiry ? new Date(selected.cnh_expiry).toLocaleDateString('pt-BR') : '—'}
                    </p>
                  </div>
                </div>
                {selected.document_url && (
                  <div className="px-4 pb-4">
                    <a
                      href={selected.document_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-3 py-2 bg-blue-500/10 text-blue-400 rounded-lg text-[12px] font-semibold hover:bg-blue-500/20 transition-colors w-full"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Ver documento enviado
                    </a>
                  </div>
                )}
              </div>

              {/* Ações */}
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => toggleVerify(selected)}
                  disabled={actionLoading}
                  className={cn(
                    'w-full flex items-center justify-center gap-2 h-11 rounded-xl text-[14px] font-bold transition-colors',
                    selected.is_verified
                      ? 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20'
                      : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                  )}
                >
                  {selected.is_verified
                    ? <><ShieldX className="w-4 h-4" /> Revogar Verificação</>
                    : <><ShieldCheck className="w-4 h-4" /> Aprovar Motorista</>
                  }
                </button>
                <button
                  type="button"
                  onClick={() => toggleBan(selected)}
                  disabled={actionLoading}
                  className={cn(
                    'w-full flex items-center justify-center gap-2 h-11 rounded-xl text-[14px] font-bold transition-colors',
                    selected.profile?.is_banned
                      ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                      : 'bg-red-500/10 text-red-400 hover:bg-red-500/20'
                  )}
                >
                  {selected.profile?.is_banned
                    ? <><UserCheck className="w-4 h-4" /> Desbanir Motorista</>
                    : <><Ban className="w-4 h-4" /> Banir Motorista</>
                  }
                </button>
              </div>

              <p className="text-[10px] text-slate-700 font-mono text-center">
                ID: {selected.id} · Cadastro: {new Date(selected.created_at).toLocaleDateString('pt-BR')}
              </p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-600">
              <UserCog className="w-10 h-10 mb-3 opacity-30" />
              <p className="text-[14px] font-medium">Selecione um motorista</p>
              <p className="text-[12px]">para ver detalhes e ações</p>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
