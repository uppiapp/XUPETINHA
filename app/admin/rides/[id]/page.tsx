'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Car, MapPin, User, Clock, DollarSign, Navigation,
  CheckCircle, XCircle, Search, RefreshCw, Star, FileText,
  CreditCard, Phone, Mail,
} from 'lucide-react'

interface RideDetail {
  id: string
  passenger_id: string
  driver_id: string | null
  pickup_address: string
  dropoff_address: string
  pickup_lat: number | null
  pickup_lng: number | null
  dropoff_lat: number | null
  dropoff_lng: number | null
  distance_km: number | null
  estimated_duration_minutes: number | null
  final_price: number | null
  passenger_price_offer: number | null
  status: string
  payment_method: string
  created_at: string
  started_at: string | null
  completed_at: string | null
  cancelled_at: string | null
  cancellation_reason: string | null
  passenger?: { full_name: string; email: string; phone: string; avatar_url: string | null }
  driver?: {
    full_name: string; email: string; phone: string
    driver_profile?: { vehicle_brand: string; vehicle_model: string; vehicle_plate: string; vehicle_color: string; rating: number }
  } | null
  payment?: { amount: number; platform_fee: number; driver_earnings: number; status: string } | null
  review?: { rating: number; comment: string } | null
}

const statusConfig: Record<string, { label: string; color: string }> = {
  searching:  { label: 'Buscando',   color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  accepted:   { label: 'Aceita',     color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  started:    { label: 'Em Curso',   color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
  completed:  { label: 'Concluida', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
  cancelled:  { label: 'Cancelada', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
}

function formatCurrency(v: number | null) {
  if (!v) return 'R$ 0,00'
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}
function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(iso))
}
function duration(start: string | null, end: string | null) {
  if (!start || !end) return '—'
  const m = Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000)
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)}h ${m % 60}min`
}

export default function RideDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const [ride, setRide] = useState<RideDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [sendingReport, setSendingReport] = useState(false)
  const [reportSent, setReportSent] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('rides')
      .select(`
        *, 
        passenger:profiles!passenger_id(full_name, email, phone, avatar_url),
        driver:profiles!driver_id(
          full_name, email, phone,
          driver_profile:driver_profiles!id(vehicle_brand, vehicle_model, vehicle_plate, vehicle_color, rating)
        ),
        payment:payments(amount, platform_fee, driver_earnings, status),
        review:reviews(rating, comment)
      `)
      .eq('id', params.id)
      .single()
    if (data) setRide(data as unknown as RideDetail)
    setLoading(false)
  }, [params.id])

  useEffect(() => { load() }, [load])

  const sendReport = async () => {
    setSendingReport(true)
    try {
      const res = await fetch(`/api/v1/rides/${params.id}/report`, { method: 'POST' })
      if (res.ok) setReportSent(true)
    } finally {
      setSendingReport(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-40 bg-slate-800/50 rounded-xl animate-pulse border border-slate-700" />)}
      </div>
    )
  }

  if (!ride) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <p className="text-slate-400">Corrida nao encontrada</p>
      </div>
    )
  }

  const cfg = statusConfig[ride.status] || statusConfig['searching']
  const dp = ride.driver?.driver_profile as any

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-xl font-bold text-slate-100">Corrida #{params.id.slice(0, 8)}</h1>
            <Badge className={`${cfg.color} border`}>{cfg.label}</Badge>
          </div>
          <p className="text-slate-400 text-sm">Criada em {formatDate(ride.created_at)}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load} className="border-slate-700 text-slate-300 hover:bg-slate-800">
            <RefreshCw className="w-4 h-4 mr-2" /> Atualizar
          </Button>
          {ride.passenger?.email && (
            <Button size="sm" onClick={sendReport} disabled={sendingReport || reportSent}
              className="bg-orange-500 hover:bg-orange-600 text-white">
              <Mail className="w-4 h-4 mr-2" />
              {reportSent ? 'Enviado!' : sendingReport ? 'Enviando...' : 'Enviar Relatorio por Email'}
            </Button>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Passageiro */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader className="pb-3 border-b border-slate-700">
            <CardTitle className="text-slate-200 text-sm flex items-center gap-2">
              <User className="w-4 h-4 text-blue-400" /> Passageiro
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            <p className="text-slate-100 font-semibold text-base">{ride.passenger?.full_name || '—'}</p>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <Mail className="w-3.5 h-3.5" /> {ride.passenger?.email || '—'}
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <Phone className="w-3.5 h-3.5" /> {ride.passenger?.phone || '—'}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Motorista */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader className="pb-3 border-b border-slate-700">
            <CardTitle className="text-slate-200 text-sm flex items-center gap-2">
              <Car className="w-4 h-4 text-orange-400" /> Motorista
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            {ride.driver ? (
              <>
                <p className="text-slate-100 font-semibold text-base">{ride.driver.full_name}</p>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <Mail className="w-3.5 h-3.5" /> {ride.driver.email}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <Phone className="w-3.5 h-3.5" /> {ride.driver.phone || '—'}
                  </div>
                </div>
                {dp && (
                  <div className="bg-slate-900/50 rounded-lg p-3 space-y-1 border border-slate-700/50">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 text-xs">Veiculo</span>
                      <span className="text-slate-200 text-sm font-medium">{dp.vehicle_brand} {dp.vehicle_model}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 text-xs">Cor</span>
                      <span className="text-slate-300 text-sm">{dp.vehicle_color}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 text-xs">Placa</span>
                      <span className="font-mono font-bold text-slate-100 tracking-widest text-sm border border-slate-600 px-2 py-0.5 rounded">{dp.vehicle_plate}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 text-xs">Avaliacao</span>
                      <span className="text-yellow-400 text-sm flex items-center gap-1"><Star className="w-3 h-3 fill-yellow-400" />{dp.rating?.toFixed(1) || '—'}</span>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <p className="text-slate-500 text-sm">Nenhum motorista atribuido</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Percurso */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader className="pb-3 border-b border-slate-700">
          <CardTitle className="text-slate-200 text-sm flex items-center gap-2">
            <Navigation className="w-4 h-4 text-green-400" /> Percurso
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="flex items-start gap-3">
              <div className="w-3 h-3 rounded-full bg-green-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-slate-500 text-xs mb-1">ORIGEM</p>
                <p className="text-slate-200 text-sm font-medium">{ride.pickup_address}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-3 h-3 rounded-full bg-red-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-slate-500 text-xs mb-1">DESTINO</p>
                <p className="text-slate-200 text-sm font-medium">{ride.dropoff_address}</p>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2">
            {[
              { label: 'Distancia', value: ride.distance_km ? `${ride.distance_km.toFixed(1)} km` : '—', icon: MapPin },
              { label: 'Duracao Real', value: duration(ride.started_at, ride.completed_at), icon: Clock },
              { label: 'Inicio', value: formatDate(ride.started_at), icon: Clock },
              { label: 'Termino', value: formatDate(ride.completed_at), icon: CheckCircle },
            ].map(item => (
              <div key={item.label} className="bg-slate-900/50 rounded-lg p-3 border border-slate-700/50">
                <p className="text-slate-500 text-xs mb-1">{item.label}</p>
                <p className="text-slate-200 text-sm font-medium">{item.value}</p>
              </div>
            ))}
          </div>
          {ride.cancellation_reason && (
            <div className="bg-red-900/20 border border-red-800/30 rounded-lg p-3">
              <p className="text-red-400 text-xs font-semibold mb-1">MOTIVO DO CANCELAMENTO</p>
              <p className="text-slate-300 text-sm">{ride.cancellation_reason}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Pagamento */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader className="pb-3 border-b border-slate-700">
            <CardTitle className="text-slate-200 text-sm flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-green-400" /> Pagamento
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-2.5">
            {[
              { label: 'Oferta do Passageiro', value: formatCurrency(ride.passenger_price_offer) },
              { label: 'Valor Final', value: formatCurrency(ride.final_price), highlight: true },
              { label: 'Metodo', value: ride.payment_method || '—' },
              ...(ride.payment ? [
                { label: 'Taxa Plataforma', value: formatCurrency((ride.payment as any).platform_fee) },
                { label: 'Repasse Motorista', value: formatCurrency((ride.payment as any).driver_earnings) },
                { label: 'Status Pagamento', value: (ride.payment as any).status || '—' },
              ] : []),
            ].map(item => (
              <div key={item.label} className="flex justify-between items-center text-sm py-1 border-b border-slate-700/30 last:border-0">
                <span className="text-slate-400">{item.label}</span>
                <span className={item.highlight ? 'text-green-400 font-bold text-base' : 'text-slate-200 font-medium'}>{item.value}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Avaliacao */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader className="pb-3 border-b border-slate-700">
            <CardTitle className="text-slate-200 text-sm flex items-center gap-2">
              <Star className="w-4 h-4 text-yellow-400" /> Avaliacao
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            {ride.review ? (
              <div className="space-y-3">
                <div className="flex items-center gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className={`w-6 h-6 ${i < (ride.review as any).rating ? 'fill-yellow-400 text-yellow-400' : 'text-slate-600'}`} />
                  ))}
                  <span className="text-slate-200 font-bold ml-2">{(ride.review as any).rating}/5</span>
                </div>
                {(ride.review as any).comment && (
                  <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-700/50">
                    <p className="text-slate-300 text-sm italic">"{(ride.review as any).comment}"</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-24 text-center">
                <Star className="w-8 h-8 text-slate-600 mb-2" />
                <p className="text-slate-500 text-sm">Sem avaliacao para esta corrida</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
