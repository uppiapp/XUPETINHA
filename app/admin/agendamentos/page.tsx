'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Calendar,
  Clock,
  MapPin,
  User,
  Car,
  Search,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertCircle,
  CalendarDays,
} from 'lucide-react'

interface ScheduledRide {
  id: string
  passenger_id: string
  driver_id: string | null
  pickup_address: string
  dropoff_address: string
  scheduled_at: string
  status: string
  final_price: number | null
  payment_method: string
  created_at: string
  passenger?: { full_name: string; email: string; phone: string }
  driver?: { full_name: string } | null
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  scheduled: { label: 'Agendada', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', icon: <Calendar className="w-3 h-3" /> },
  confirmed: { label: 'Confirmada', color: 'bg-green-500/20 text-green-400 border-green-500/30', icon: <CheckCircle className="w-3 h-3" /> },
  cancelled: { label: 'Cancelada', color: 'bg-red-500/20 text-red-400 border-red-500/30', icon: <XCircle className="w-3 h-3" /> },
  completed: { label: 'Concluida', color: 'bg-slate-500/20 text-slate-400 border-slate-500/30', icon: <CheckCircle className="w-3 h-3" /> },
  pending: { label: 'Pendente', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', icon: <AlertCircle className="w-3 h-3" /> },
}

function formatScheduledAt(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  const diff = d.getTime() - now.getTime()
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  if (diff < 0) return { date: d.toLocaleDateString('pt-BR'), time: d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }), label: 'Passada', labelColor: 'text-red-400' }
  if (hours < 1) return { date: 'Hoje', time: d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }), label: '< 1h', labelColor: 'text-orange-400' }
  if (days === 0) return { date: 'Hoje', time: d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }), label: `em ${hours}h`, labelColor: 'text-yellow-400' }
  if (days === 1) return { date: 'Amanha', time: d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }), label: 'Amanha', labelColor: 'text-blue-400' }
  return { date: d.toLocaleDateString('pt-BR'), time: d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }), label: `em ${days}d`, labelColor: 'text-slate-400' }
}

export default function AgendamentosPage() {
  const supabase = createClient()
  const [rides, setRides] = useState<ScheduledRide[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<string>('all')
  const [stats, setStats] = useState({ total: 0, today: 0, tomorrow: 0, cancelled: 0 })

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('rides')
      .select(`
        id, passenger_id, driver_id, pickup_address, dropoff_address,
        scheduled_at, status, final_price, payment_method, created_at,
        passenger:profiles!passenger_id(full_name, email, phone),
        driver:profiles!driver_id(full_name)
      `)
      .not('scheduled_at', 'is', null)
      .order('scheduled_at', { ascending: true })
      .limit(200)

    if (data) {
      setRides(data as unknown as ScheduledRide[])
      const now = new Date()
      const todayStr = now.toDateString()
      const tomorrow = new Date(now); tomorrow.setDate(tomorrow.getDate() + 1)
      const tomorrowStr = tomorrow.toDateString()
      setStats({
        total: data.length,
        today: data.filter(r => r.scheduled_at && new Date(r.scheduled_at).toDateString() === todayStr).length,
        tomorrow: data.filter(r => r.scheduled_at && new Date(r.scheduled_at).toDateString() === tomorrowStr).length,
        cancelled: data.filter(r => r.status === 'cancelled').length,
      })
    }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  // Realtime
  useEffect(() => {
    const channel = supabase.channel('admin-agendamentos')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rides', filter: 'scheduled_at=not.is.null' }, () => load())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [load])

  const cancelRide = async (id: string) => {
    await supabase.from('rides').update({ status: 'cancelled', cancelled_at: new Date().toISOString() }).eq('id', id)
    load()
  }

  const confirmRide = async (id: string) => {
    await supabase.from('rides').update({ status: 'confirmed' }).eq('id', id)
    load()
  }

  const filtered = rides.filter(r => {
    const matchFilter = filter === 'all' || r.status === filter
    const matchSearch = !search || [r.passenger?.full_name, r.pickup_address, r.dropoff_address].some(v => v?.toLowerCase().includes(search.toLowerCase()))
    return matchFilter && matchSearch
  })

  const kpis = [
    { label: 'Total Agendadas', value: stats.total, icon: CalendarDays, color: 'text-blue-400' },
    { label: 'Hoje', value: stats.today, icon: Clock, color: 'text-orange-400' },
    { label: 'Amanha', value: stats.tomorrow, icon: Calendar, color: 'text-green-400' },
    { label: 'Canceladas', value: stats.cancelled, icon: XCircle, color: 'text-red-400' },
  ]

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Agendamentos</h1>
          <p className="text-slate-400 text-sm mt-1">Corridas agendadas pelos passageiros — atualiza em tempo real</p>
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
                <p className="text-2xl font-bold text-slate-100">{loading ? '...' : k.value}</p>
                <p className="text-xs text-slate-400">{k.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input placeholder="Buscar por passageiro, origem ou destino..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 bg-slate-800 border-slate-700 text-slate-200 placeholder:text-slate-500" />
        </div>
        <div className="flex gap-2 flex-wrap">
          {['all', 'scheduled', 'confirmed', 'cancelled', 'completed'].map(s => (
            <Button key={s} size="sm" variant={filter === s ? 'default' : 'outline'} onClick={() => setFilter(s)}
              className={filter === s ? 'bg-orange-500 text-white' : 'border-slate-700 text-slate-400 hover:bg-slate-800'}>
              {s === 'all' ? 'Todos' : statusConfig[s]?.label}
            </Button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="space-y-3">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-28 bg-slate-800/50 rounded-xl animate-pulse border border-slate-700" />
          ))
        ) : filtered.length === 0 ? (
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-12 text-center">
              <Calendar className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400">Nenhum agendamento encontrado</p>
            </CardContent>
          </Card>
        ) : filtered.map(ride => {
          const sched = ride.scheduled_at ? formatScheduledAt(ride.scheduled_at) : null
          const cfg = statusConfig[ride.status] || statusConfig['scheduled']
          return (
            <Card key={ride.id} className="bg-slate-800/50 border-slate-700 hover:border-slate-600 transition-colors">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0 space-y-3">
                    {/* Top row */}
                    <div className="flex items-center gap-3 flex-wrap">
                      <Badge className={`${cfg.color} border text-xs flex items-center gap-1`}>
                        {cfg.icon}{cfg.label}
                      </Badge>
                      {sched && (
                        <span className={`text-sm font-semibold ${sched.labelColor}`}>
                          {sched.label}
                        </span>
                      )}
                      {sched && (
                        <span className="text-slate-400 text-sm">{sched.date} as {sched.time}</span>
                      )}
                    </div>

                    {/* Route */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm">
                        <div className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
                        <span className="text-slate-300 truncate">{ride.pickup_address}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <div className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                        <span className="text-slate-300 truncate">{ride.dropoff_address}</span>
                      </div>
                    </div>

                    {/* Passenger + Driver */}
                    <div className="flex items-center gap-4 flex-wrap">
                      <div className="flex items-center gap-1.5 text-xs text-slate-400">
                        <User className="w-3.5 h-3.5" />
                        <span>{ride.passenger?.full_name || 'Passageiro'}</span>
                        {ride.passenger?.phone && <span className="text-slate-500">· {ride.passenger.phone}</span>}
                      </div>
                      {ride.driver ? (
                        <div className="flex items-center gap-1.5 text-xs text-slate-400">
                          <Car className="w-3.5 h-3.5" />
                          <span>{ride.driver.full_name}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-yellow-500/70">Sem motorista atribuido</span>
                      )}
                    </div>
                  </div>

                  {/* Right side */}
                  <div className="flex flex-col items-end gap-3 shrink-0">
                    {ride.final_price && (
                      <p className="text-green-400 font-bold text-lg">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(ride.final_price)}
                      </p>
                    )}
                    {ride.status === 'scheduled' && (
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => confirmRide(ride.id)} className="bg-green-600 hover:bg-green-700 text-white text-xs h-7">
                          <CheckCircle className="w-3 h-3 mr-1" /> Confirmar
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => cancelRide(ride.id)} className="border-red-800 text-red-400 hover:bg-red-900/30 text-xs h-7">
                          <XCircle className="w-3 h-3 mr-1" /> Cancelar
                        </Button>
                      </div>
                    )}
                    {ride.status === 'confirmed' && (
                      <Button size="sm" variant="outline" onClick={() => cancelRide(ride.id)} className="border-red-800 text-red-400 hover:bg-red-900/30 text-xs h-7">
                        <XCircle className="w-3 h-3 mr-1" /> Cancelar
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
