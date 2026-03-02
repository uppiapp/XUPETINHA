'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { AdminHeader } from '@/components/admin/admin-header'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Search, Users, Car, Shield, Ban, Star, Phone, ChevronRight,
  UserCheck, X, Eye, CheckCircle, XCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Profile {
  id: string
  full_name: string
  phone: string
  avatar_url: string | null
  user_type: string
  rating: number
  total_rides: number
  is_admin: boolean
  is_banned: boolean
  ban_reason: string | null
  created_at: string
}

interface DriverProfile {
  id: string
  vehicle_brand: string
  vehicle_model: string
  vehicle_plate: string
  vehicle_color: string
  vehicle_type: string
  is_verified: boolean
  is_available: boolean
}

type Tab = 'all' | 'passenger' | 'driver'

export default function UsersPage() {
  const [users, setUsers] = useState<Profile[]>([])
  const [drivers, setDrivers] = useState<Record<string, DriverProfile>>({})
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState<Tab>('all')
  const [selected, setSelected] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchUsers = useCallback(async () => {
    const supabase = createClient()
    const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false })
    if (data) setUsers(data)

    const { data: dp } = await supabase.from('driver_profiles').select('*')
    if (dp) {
      const map: Record<string, DriverProfile> = {}
      for (const d of dp) map[d.id] = d
      setDrivers(map)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchUsers()

    // Real-time: listen for user profile changes (bans, role changes, new users)
    const supabase = createClient()
    const channel = supabase
      .channel('admin-users-realtime')
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'profiles',
      }, () => fetchUsers())
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'driver_profiles',
      }, () => fetchUsers())
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [fetchUsers])

  const filtered = users.filter((u) => {
    if (tab !== 'all' && u.user_type !== tab) return false
    if (search && !u.full_name?.toLowerCase().includes(search.toLowerCase()) && !u.phone?.includes(search)) return false
    return true
  })

  const toggleBan = async (user: Profile) => {
    const supabase = createClient()
    const newBanned = !user.is_banned
    await supabase.from('profiles').update({
      is_banned: newBanned,
      banned_at: newBanned ? new Date().toISOString() : null,
      ban_reason: newBanned ? 'Banido pelo admin' : null,
    }).eq('id', user.id)
    fetchUsers()
    if (selected?.id === user.id) setSelected({ ...user, is_banned: newBanned })
  }

  const toggleAdmin = async (user: Profile) => {
    const supabase = createClient()
    await supabase.from('profiles').update({ is_admin: !user.is_admin }).eq('id', user.id)
    fetchUsers()
  }

  const toggleVerify = async (driverId: string) => {
    const supabase = createClient()
    const current = drivers[driverId]
    if (!current) return
    await supabase.from('driver_profiles').update({ is_verified: !current.is_verified }).eq('id', driverId)
    fetchUsers()
  }

  const tabs: { key: Tab; label: string; icon: typeof Users }[] = [
    { key: 'all', label: 'Todos', icon: Users },
    { key: 'passenger', label: 'Passageiros', icon: Users },
    { key: 'driver', label: 'Motoristas', icon: Car },
  ]

  const counts = {
    all: users.length,
    passenger: users.filter(u => u.user_type === 'passenger').length,
    driver: users.filter(u => u.user_type === 'driver').length,
  }

  if (loading) {
    return (
      <>
        <AdminHeader title="Usuarios" subtitle="Carregando..." />
        <div className="flex-1 flex items-center justify-center bg-[hsl(var(--admin-bg))]">
          <div className="w-6 h-6 border-2 border-[hsl(var(--admin-green))] border-t-transparent rounded-full animate-spin" />
        </div>
      </>
    )
  }

  return (
    <>
      <AdminHeader title="Usuarios" subtitle={`${users.length} usuarios cadastrados`} />
      <div className="flex-1 overflow-hidden flex bg-[hsl(var(--admin-bg))]">
        {/* Left: List */}
        <div className="flex-1 flex flex-col overflow-hidden border-r border-[hsl(var(--admin-border))]">
          {/* Search + Tabs */}
          <div className="p-4 pb-0 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <Input
                placeholder="Buscar por nome ou telefone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-10 rounded-xl bg-[hsl(var(--admin-surface))] border-[hsl(var(--admin-border))] text-slate-200 placeholder:text-slate-600 text-[13px]"
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
                  <t.icon className="w-3.5 h-3.5" />
                  {t.label}
                  <span className={cn(
                    'ml-1 text-[10px] px-1.5 py-0.5 rounded font-bold',
                    tab === t.key ? 'bg-[hsl(var(--admin-green))]/20' : 'bg-[hsl(var(--admin-border))]'
                  )}>{counts[t.key]}</span>
                </button>
              ))}
            </div>
          </div>

          {/* User List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-1.5">
            {filtered.map((u) => (
              <button
                key={u.id}
                type="button"
                onClick={() => setSelected(u)}
                className={cn(
                  'w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all duration-150',
                  selected?.id === u.id ? 'bg-blue-600/10 ring-1 ring-blue-500/30' : 'hover:bg-secondary/70'
                )}
              >
                <Avatar className="w-10 h-10 shrink-0">
                  <AvatarImage src={u.avatar_url || undefined} />
                  <AvatarFallback className={cn('text-xs font-bold', u.user_type === 'driver' ? 'bg-emerald-500/15 text-emerald-500' : 'bg-blue-500/15 text-blue-500')}>
                    {u.full_name?.charAt(0) || '?'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[14px] font-semibold text-foreground truncate">{u.full_name || 'Sem nome'}</span>
                    {u.is_admin && <Shield className="w-3 h-3 text-amber-500 shrink-0" />}
                    {u.is_banned && <Ban className="w-3 h-3 text-red-500 shrink-0" />}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[11px] text-muted-foreground">{u.user_type === 'driver' ? 'Motorista' : 'Passageiro'}</span>
                    <span className="text-muted-foreground/30">|</span>
                    <span className="text-[11px] text-muted-foreground flex items-center gap-0.5">
                      <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                      {(u.rating || 5).toFixed(1)}
                    </span>
                    <span className="text-muted-foreground/30">|</span>
                    <span className="text-[11px] text-muted-foreground">{u.total_rides || 0} corridas</span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground/40 shrink-0" />
              </button>
            ))}
            {filtered.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <Users className="w-10 h-10 mb-2 opacity-30" />
                <p className="text-[14px] font-medium">Nenhum usuario encontrado</p>
              </div>
            )}
          </div>
        </div>

        {/* Right: Details Panel */}
        <div className="hidden lg:flex w-[360px] flex-col overflow-y-auto bg-[hsl(var(--admin-bg))]">
          {selected ? (
            <div className="p-6 space-y-5">
              {/* Profile Header */}
              <div className="text-center">
                <Avatar className="w-20 h-20 mx-auto mb-3 ring-4 ring-border">
                  <AvatarImage src={selected.avatar_url || undefined} />
                  <AvatarFallback className="bg-blue-600 text-white text-2xl font-bold">
                    {selected.full_name?.charAt(0) || '?'}
                  </AvatarFallback>
                </Avatar>
                <h2 className="text-[20px] font-bold text-foreground">{selected.full_name}</h2>
                <div className="flex items-center justify-center gap-2 mt-1">
                  <Badge variant={selected.user_type === 'driver' ? 'default' : 'secondary'} className="text-[11px]">
                    {selected.user_type === 'driver' ? 'Motorista' : 'Passageiro'}
                  </Badge>
                  {selected.is_admin && <Badge className="bg-amber-500/15 text-amber-500 text-[11px]">Admin</Badge>}
                  {selected.is_banned && <Badge variant="destructive" className="text-[11px]">Banido</Badge>}
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-card rounded-xl p-3 text-center border border-border/50">
                  <p className="text-[20px] font-bold text-foreground">{(selected.rating || 5).toFixed(1)}</p>
                  <p className="text-[11px] text-muted-foreground">Rating</p>
                </div>
                <div className="bg-card rounded-xl p-3 text-center border border-border/50">
                  <p className="text-[20px] font-bold text-foreground">{selected.total_rides || 0}</p>
                  <p className="text-[11px] text-muted-foreground">Corridas</p>
                </div>
                <div className="bg-card rounded-xl p-3 text-center border border-border/50">
                  <p className="text-[20px] font-bold text-foreground">
                    {new Date(selected.created_at).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })}
                  </p>
                  <p className="text-[11px] text-muted-foreground">Desde</p>
                </div>
              </div>

              {/* Info */}
              <Card className="border-border/50">
                <CardContent className="p-0 divide-y divide-border/50">
                  <div className="flex items-center gap-3 px-4 py-3">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <span className="text-[13px] text-foreground font-medium">{selected.phone || 'N/A'}</span>
                  </div>
                  <div className="flex items-center gap-3 px-4 py-3">
                    <span className="text-[13px] text-muted-foreground">ID:</span>
                    <span className="text-[11px] text-muted-foreground font-mono truncate">{selected.id}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Driver Info */}
              {selected.user_type === 'driver' && drivers[selected.id] && (
                <Card className="border-border/50">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-[14px] font-bold text-foreground">Veiculo</h3>
                      <Badge
                        className={cn('text-[10px]', drivers[selected.id].is_verified ? 'bg-emerald-500/15 text-emerald-500' : 'bg-amber-500/15 text-amber-500')}
                      >
                        {drivers[selected.id].is_verified ? 'Verificado' : 'Pendente'}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[12px]">
                      <div>
                        <p className="text-muted-foreground">Marca/Modelo</p>
                        <p className="text-foreground font-semibold">{drivers[selected.id].vehicle_brand} {drivers[selected.id].vehicle_model}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Placa</p>
                        <p className="text-foreground font-semibold font-mono uppercase">{drivers[selected.id].vehicle_plate}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Cor</p>
                        <p className="text-foreground font-semibold capitalize">{drivers[selected.id].vehicle_color}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Status</p>
                        <p className={cn('font-semibold', drivers[selected.id].is_available ? 'text-green-500' : 'text-muted-foreground')}>
                          {drivers[selected.id].is_available ? 'Online' : 'Offline'}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleVerify(selected.id)}
                      className={cn(
                        'w-full flex items-center justify-center gap-2 h-9 rounded-xl text-[13px] font-semibold transition-colors',
                        drivers[selected.id].is_verified
                          ? 'bg-amber-500/10 text-amber-500 hover:bg-amber-500/20'
                          : 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20'
                      )}
                    >
                      {drivers[selected.id].is_verified ? (
                        <><XCircle className="w-4 h-4" /> Revogar Verificacao</>
                      ) : (
                        <><CheckCircle className="w-4 h-4" /> Verificar Motorista</>
                      )}
                    </button>
                  </CardContent>
                </Card>
              )}

              {/* Actions */}
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => toggleBan(selected)}
                  className={cn(
                    'w-full flex items-center justify-center gap-2 h-10 rounded-xl text-[14px] font-bold transition-colors',
                    selected.is_banned
                      ? 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20'
                      : 'bg-red-500/10 text-red-500 hover:bg-red-500/20'
                  )}
                >
                  {selected.is_banned ? <><UserCheck className="w-4 h-4" /> Desbanir Usuario</> : <><Ban className="w-4 h-4" /> Banir Usuario</>}
                </button>
                <button
                  type="button"
                  onClick={() => toggleAdmin(selected)}
                  className={cn(
                    'w-full flex items-center justify-center gap-2 h-10 rounded-xl text-[14px] font-bold transition-colors',
                    selected.is_admin
                      ? 'bg-amber-500/10 text-amber-500 hover:bg-amber-500/20'
                      : 'bg-blue-500/10 text-blue-500 hover:bg-blue-500/20'
                  )}
                >
                  <Shield className="w-4 h-4" />
                  {selected.is_admin ? 'Remover Admin' : 'Tornar Admin'}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
              <Eye className="w-10 h-10 mb-3 opacity-30" />
              <p className="text-[14px] font-medium">Selecione um usuario</p>
              <p className="text-[12px]">para ver os detalhes</p>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
