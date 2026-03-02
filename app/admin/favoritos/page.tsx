'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Heart, MapPin, Home, Briefcase, Star, Search, RefreshCw, TrendingUp, Users, BarChart2,
} from 'lucide-react'

interface FavoriteLocation {
  id: string
  user_id: string
  name: string
  address: string
  type: string
  lat: number
  lng: number
  use_count: number
  created_at: string
  user?: { full_name: string; email: string }
}

interface TopAddress {
  address: string
  count: number
  type: string
}

const typeConfig: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  home:   { label: 'Casa',     icon: <Home className="w-3 h-3" />,      color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  work:   { label: 'Trabalho', icon: <Briefcase className="w-3 h-3" />, color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
  other:  { label: 'Outro',    icon: <MapPin className="w-3 h-3" />,    color: 'bg-slate-500/20 text-slate-300 border-slate-500/30' },
  custom: { label: 'Custom',   icon: <Star className="w-3 h-3" />,      color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
}

export default function FavoritosPage() {
  const supabase = createClient()
  const [favorites, setFavorites] = useState<FavoriteLocation[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [stats, setStats] = useState({ total: 0, usersWithFav: 0, topType: '', mostUsed: '' })
  const [topAddresses, setTopAddresses] = useState<TopAddress[]>([])

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('favorite_locations')
      .select(`id, user_id, name, address, type, lat, lng, use_count, created_at, user:profiles!user_id(full_name, email)`)
      .order('use_count', { ascending: false })
      .limit(300)

    if (data) {
      setFavorites(data as unknown as FavoriteLocation[])
      const uniqueUsers = new Set(data.map(f => f.user_id)).size
      const typeCount = data.reduce((acc, f) => { acc[f.type] = (acc[f.type] || 0) + 1; return acc }, {} as Record<string, number>)
      const topType = Object.entries(typeCount).sort((a, b) => b[1] - a[1])[0]?.[0] || ''
      const addrCount = data.reduce((acc, f) => { acc[f.address] = (acc[f.address] || 0) + (f.use_count || 1); return acc }, {} as Record<string, number>)
      const top5 = Object.entries(addrCount).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([address, count]) => ({
        address,
        count,
        type: data.find(f => f.address === address)?.type || 'other',
      }))
      setTopAddresses(top5)
      setStats({ total: data.length, usersWithFav: uniqueUsers, topType, mostUsed: top5[0]?.address || '' })
    }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = favorites.filter(f => {
    const matchType = typeFilter === 'all' || f.type === typeFilter
    const matchSearch = !search || [f.name, f.address, f.user?.full_name, f.user?.email].some(v => v?.toLowerCase().includes(search.toLowerCase()))
    return matchType && matchSearch
  })

  const kpis = [
    { label: 'Total Favoritos', value: stats.total, icon: Heart, color: 'text-red-400' },
    { label: 'Usuarios com Favoritos', value: stats.usersWithFav, icon: Users, color: 'text-blue-400' },
    { label: 'Top Tipo', value: typeConfig[stats.topType]?.label || '—', icon: BarChart2, color: 'text-orange-400', isText: true },
    { label: 'Top Destino', value: topAddresses[0]?.count ? `${topAddresses[0].count}x` : '—', icon: TrendingUp, color: 'text-green-400', isText: true },
  ]

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Locais Favoritos</h1>
          <p className="text-slate-400 text-sm mt-1">Destinos salvos pelos passageiros — analytics de uso</p>
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
                <p className={`font-bold text-slate-100 ${k.isText ? 'text-base' : 'text-2xl'}`}>{loading ? '...' : k.value}</p>
                <p className="text-xs text-slate-400">{k.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Top enderecos */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader className="pb-3 border-b border-slate-700">
          <CardTitle className="text-slate-200 text-sm font-semibold flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-orange-400" /> Top 5 Destinos Mais Salvos
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-3">
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-8 bg-slate-700/50 rounded animate-pulse" />)
          ) : topAddresses.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-4">Nenhum dado disponivel</p>
          ) : topAddresses.map((addr, i) => {
            const cfg = typeConfig[addr.type] || typeConfig['other']
            const maxCount = topAddresses[0]?.count || 1
            return (
              <div key={i} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-slate-500 w-4 text-xs font-bold">{i + 1}</span>
                    <Badge className={`${cfg.color} border text-xs shrink-0`}>{cfg.icon}</Badge>
                    <span className="text-slate-300 truncate">{addr.address}</span>
                  </div>
                  <span className="text-orange-400 font-bold text-xs shrink-0 ml-2">{addr.count}x</span>
                </div>
                <div className="w-full bg-slate-700/50 rounded-full h-1.5 ml-6">
                  <div className="bg-orange-500 h-1.5 rounded-full transition-all" style={{ width: `${(addr.count / maxCount) * 100}%` }} />
                </div>
              </div>
            )
          })}
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input placeholder="Buscar por nome, endereco ou usuario..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 bg-slate-800 border-slate-700 text-slate-200 placeholder:text-slate-500" />
        </div>
        <div className="flex gap-2">
          {['all', 'home', 'work', 'other', 'custom'].map(t => (
            <Button key={t} size="sm" variant={typeFilter === t ? 'default' : 'outline'} onClick={() => setTypeFilter(t)}
              className={typeFilter === t ? 'bg-orange-500 text-white' : 'border-slate-700 text-slate-400 hover:bg-slate-800'}>
              {t === 'all' ? 'Todos' : typeConfig[t]?.label}
            </Button>
          ))}
        </div>
      </div>

      {/* List */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader className="pb-3 border-b border-slate-700">
          <CardTitle className="text-slate-200 text-sm font-semibold">{filtered.length} favorito{filtered.length !== 1 ? 's' : ''}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-slate-400 text-sm">Carregando...</div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center">
              <Heart className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400">Nenhum favorito encontrado</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-700/50">
              {filtered.map(fav => {
                const cfg = typeConfig[fav.type] || typeConfig['other']
                return (
                  <div key={fav.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-slate-700/20 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <Badge className={`${cfg.color} border text-xs flex items-center gap-1 shrink-0`}>{cfg.icon}{cfg.label}</Badge>
                      <div className="min-w-0">
                        <p className="text-slate-200 text-sm font-medium truncate">{fav.name || fav.address}</p>
                        {fav.name && <p className="text-slate-500 text-xs truncate">{fav.address}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-4 shrink-0">
                      <div className="text-right hidden md:block">
                        <p className="text-slate-400 text-xs">{fav.user?.full_name}</p>
                        <p className="text-slate-600 text-xs">{fav.user?.email}</p>
                      </div>
                      <Badge className="bg-orange-500/10 text-orange-400 border-orange-500/20 text-xs">
                        {fav.use_count || 0}x usado
                      </Badge>
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
