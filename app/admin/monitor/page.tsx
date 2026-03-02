'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { AdminHeader } from '@/components/admin/admin-header'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Car, Radio, Users, Navigation,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface OnlineDriver {
  id: string
  current_lat: number
  current_lng: number
  is_available: boolean
  vehicle_brand: string
  vehicle_model: string
  vehicle_plate: string
  vehicle_type: string
  profile?: { full_name: string; rating: number }
}

interface ActiveRide {
  id: string
  status: string
  pickup_lat: number
  pickup_lng: number
  dropoff_lat: number
  dropoff_lng: number
  pickup_address: string
  dropoff_address: string
  final_price: number
  created_at: string
  passenger?: { full_name: string }
  driver?: { full_name: string }
}

const darkMapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#0d1117' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0d1117' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#4a5568' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#1a202c' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#2d3748' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0a1628' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
]

export default function MonitorPage() {
  const [drivers, setDrivers] = useState<OnlineDriver[]>([])
  const [rides, setRides] = useState<ActiveRide[]>([])
  const [selectedDriver, setSelectedDriver] = useState<string | null>(null)
  const [selectedRide, setSelectedRide] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<any | null>(null)
  const markersRef = useRef<any[]>([])

  const fetchData = useCallback(async () => {
    const supabase = createClient()

    const [{ data: dp }, { data: activeRides }] = await Promise.all([
      supabase.from('driver_profiles').select('*, profile:profiles!driver_profiles_id_fkey(full_name, rating)').not('current_lat', 'is', null),
      supabase.from('rides').select('*, passenger:profiles!rides_passenger_id_fkey(full_name), driver:profiles!rides_driver_id_fkey(full_name)').in('status', ['searching', 'accepted', 'in_progress']).order('created_at', { ascending: false }),
    ])

    if (dp) setDrivers(dp)
    if (activeRides) setRides(activeRides)
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchData()
    const supabase = createClient()
    const channel = supabase
      .channel('admin-monitor')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'driver_profiles' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rides' }, () => fetchData())
      .subscribe()

    const interval = setInterval(fetchData, 10000) // Poll every 10s for driver locations
    return () => { supabase.removeChannel(channel); clearInterval(interval) }
  }, [fetchData])

  // Initialize Google Map
  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return

    const initMap = async () => {
      if (!window.google?.maps) {
        const script = document.createElement('script')
        script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=marker&v=weekly`
        script.async = true
        script.onload = () => createMap()
        document.head.appendChild(script)
      } else {
        createMap()
      }
    }

    const createMap = () => {
      if (!mapRef.current) return
      mapInstance.current = new window.google.maps.Map(mapRef.current, {
        center: { lat: -1.29, lng: -47.93 }, // Castanhal, PA
        zoom: 13,
        disableDefaultUI: true,
        zoomControl: true,
        styles: darkMapStyle,
        mapId: 'admin-monitor-map',
      })
    }

    initMap()
  }, [resolvedTheme])

  // Update markers
  useEffect(() => {
    if (!mapInstance.current) return

    // Clear existing markers
    for (const m of markersRef.current) m.map = null
    markersRef.current = []

    // Driver markers (green dots)
    for (const d of drivers) {
      if (!d.current_lat || !d.current_lng) continue
      const el = document.createElement('div')
      el.innerHTML = `<div style="width:32px;height:32px;background:${d.is_available ? '#10b981' : '#6b7280'};border-radius:50%;border:3px solid ${d.is_available ? '#059669' : '#4b5563'};display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.3);cursor:pointer">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="white" stroke="white" strokeWidth="0"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.8 3.8 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/></svg>
      </div>`
      const marker = new window.google.maps.marker.AdvancedMarkerElement({
        map: mapInstance.current,
        position: { lat: Number(d.current_lat), lng: Number(d.current_lng) },
        content: el,
      })
      marker.addListener('click', () => setSelectedDriver(d.id))
      markersRef.current.push(marker)
    }

    // Active ride markers (pickup = blue, dropoff = red)
    for (const r of rides) {
      if (r.pickup_lat && r.pickup_lng) {
        const pickupEl = document.createElement('div')
        pickupEl.innerHTML = `<div style="width:14px;height:14px;background:#3b82f6;border-radius:50%;border:3px solid rgba(59,130,246,0.3);box-shadow:0 0 12px rgba(59,130,246,0.5)"></div>`
        const pm = new window.google.maps.marker.AdvancedMarkerElement({
          map: mapInstance.current,
          position: { lat: Number(r.pickup_lat), lng: Number(r.pickup_lng) },
          content: pickupEl,
        })
        markersRef.current.push(pm)
      }
      if (r.dropoff_lat && r.dropoff_lng) {
        const dropEl = document.createElement('div')
        dropEl.innerHTML = `<div style="width:14px;height:14px;background:#ef4444;border-radius:50%;border:3px solid rgba(239,68,68,0.3);box-shadow:0 0 12px rgba(239,68,68,0.5)"></div>`
        const dm = new window.google.maps.marker.AdvancedMarkerElement({
          map: mapInstance.current,
          position: { lat: Number(r.dropoff_lat), lng: Number(r.dropoff_lng) },
          content: dropEl,
        })
        markersRef.current.push(dm)
      }
    }
  }, [drivers, rides])

  const onlineDrivers = drivers.filter(d => d.is_available)
  const selectedDrv = drivers.find(d => d.id === selectedDriver)
  const selectedRd = rides.find(r => r.id === selectedRide)

  const statusConfig: Record<string, { label: string; color: string }> = {
    searching: { label: 'Buscando', color: 'bg-amber-500/15 text-amber-500' },
    accepted: { label: 'Aceita', color: 'bg-cyan-500/15 text-cyan-500' },
    in_progress: { label: 'Em Andamento', color: 'bg-blue-500/15 text-blue-500' },
  }

  if (loading) {
    return (
      <>
        <AdminHeader title="Monitor Realtime" subtitle="Carregando..." />
        <div className="flex-1 flex items-center justify-center bg-[hsl(var(--admin-bg))]">
          <div className="w-6 h-6 border-2 border-[hsl(var(--admin-green))] border-t-transparent rounded-full animate-spin" />
        </div>
      </>
    )
  }

  return (
    <>
      <AdminHeader title="Monitor Realtime" subtitle="Motoristas e corridas ao vivo" />
      <div className="flex-1 overflow-hidden flex">
        {/* Map */}
        <div className="flex-1 relative">
          <div ref={mapRef} className="w-full h-full" />

          {/* Floating Stats */}
          <div className="absolute top-4 left-4 flex gap-2">
            <div className="bg-card/90 backdrop-blur-xl rounded-xl px-3 py-2 border border-border/50 flex items-center gap-2 shadow-lg">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
              </span>
              <span className="text-[12px] font-bold text-foreground">{onlineDrivers.length} Online</span>
            </div>
            <div className="bg-card/90 backdrop-blur-xl rounded-xl px-3 py-2 border border-border/50 flex items-center gap-2 shadow-lg">
              <Radio className="w-3.5 h-3.5 text-blue-500" />
              <span className="text-[12px] font-bold text-foreground">{rides.length} Ativas</span>
            </div>
            <div className="bg-card/90 backdrop-blur-xl rounded-xl px-3 py-2 border border-border/50 flex items-center gap-2 shadow-lg">
              <Car className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-[12px] font-bold text-foreground">{drivers.length} Total</span>
            </div>
          </div>

          {/* Selected Driver Info */}
          {selectedDrv && (
            <div className="absolute bottom-4 left-4 right-4 max-w-sm">
              <Card className="border-border/50 bg-card/95 backdrop-blur-xl shadow-2xl">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <Avatar className="w-10 h-10">
                      <AvatarFallback className="bg-emerald-500/15 text-emerald-500 text-sm font-bold">
                        {selectedDrv.profile?.full_name?.charAt(0) || 'M'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-[15px] font-bold text-foreground truncate">{selectedDrv.profile?.full_name || 'Motorista'}</p>
                      <p className="text-[12px] text-muted-foreground">{selectedDrv.vehicle_brand} {selectedDrv.vehicle_model} - {selectedDrv.vehicle_plate}</p>
                    </div>
                    <Badge className={cn('text-[10px]', selectedDrv.is_available ? 'bg-emerald-500/15 text-emerald-500' : 'bg-neutral-500/15 text-neutral-400')}>
                      {selectedDrv.is_available ? 'Disponivel' : 'Ocupado'}
                    </Badge>
                  </div>
                  <button type="button" onClick={() => setSelectedDriver(null)} className="w-full h-8 rounded-lg bg-secondary text-[12px] font-semibold text-muted-foreground hover:text-foreground transition-colors">
                    Fechar
                  </button>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* Right Panel: Active Rides */}
        <div className="hidden lg:flex w-[340px] flex-col border-l border-[hsl(var(--admin-border))] bg-[hsl(var(--admin-bg))] overflow-hidden">
          <div className="p-4 border-b border-[hsl(var(--admin-border))]">
            <h2 className="text-[14px] font-bold text-slate-200 flex items-center gap-2">
              <Radio className="w-4 h-4 text-blue-400" />
              Corridas Ativas
              <span className="inline-flex px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-500/15 text-blue-400 ml-auto">{rides.length}</span>
            </h2>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {rides.map((r) => {
              const sc = statusConfig[r.status] || statusConfig.searching
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => {
                    setSelectedRide(r.id === selectedRide ? null : r.id)
                    if (mapInstance.current && r.pickup_lat) {
                      mapInstance.current.panTo({ lat: Number(r.pickup_lat), lng: Number(r.pickup_lng) })
                      mapInstance.current.setZoom(15)
                    }
                  }}
                  className={cn(
                    'w-full text-left p-3 rounded-xl transition-all duration-150',
                    selectedRide === r.id
                      ? 'bg-blue-600/10 ring-1 ring-blue-500/30'
                      : 'hover:bg-[hsl(var(--admin-surface))]'
                  )}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className={cn('inline-flex px-2 py-0.5 rounded-md text-[10px] font-bold', sc.color)}>{sc.label}</span>
                    <span className="text-[10px] text-slate-500 ml-auto tabular-nums">
                      {new Date(r.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-[12px]">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                      <span className="text-slate-200 truncate">{r.pickup_address || 'N/A'}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[12px]">
                      <div className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                      <span className="text-slate-200 truncate">{r.dropoff_address || 'N/A'}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-2 text-[11px] text-slate-500">
                    {r.passenger && <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {(r.passenger as any).full_name}</span>}
                    {r.driver && <span className="flex items-center gap-1"><Car className="w-3 h-3" /> {(r.driver as any).full_name}</span>}
                    {r.final_price > 0 && <span className="ml-auto font-semibold text-slate-200">R$ {Number(r.final_price).toFixed(2)}</span>}
                  </div>
                </button>
              )
            })}
            {rides.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-slate-600">
                <Navigation className="w-10 h-10 mb-2 opacity-30" />
                <p className="text-[13px] font-medium">Sem corridas ativas</p>
                <p className="text-[11px]">As corridas aparecerao aqui em tempo real</p>
              </div>
            )}
          </div>

          {/* Online Drivers List */}
          <div className="border-t border-[hsl(var(--admin-border))]">
            <div className="p-3 border-b border-[hsl(var(--admin-border))]/50">
              <h3 className="text-[13px] font-bold text-slate-200 flex items-center gap-2">
                <Car className="w-3.5 h-3.5 text-emerald-400" />
                Motoristas Online
                <span className="text-[10px] text-slate-500 ml-auto">{onlineDrivers.length}</span>
              </h3>
            </div>
            <div className="max-h-[200px] overflow-y-auto p-2 space-y-1">
              {onlineDrivers.slice(0, 10).map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => {
                    setSelectedDriver(d.id)
                    if (mapInstance.current && d.current_lat) {
                      mapInstance.current.panTo({ lat: Number(d.current_lat), lng: Number(d.current_lng) })
                      mapInstance.current.setZoom(16)
                    }
                  }}
                  className="w-full flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-[hsl(var(--admin-surface))] transition-colors"
                >
                  <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                  <span className="text-[12px] text-slate-200 font-medium truncate flex-1 text-left">
                    {(d.profile as any)?.full_name || 'Motorista'}
                  </span>
                  <span className="text-[10px] text-slate-500">{d.vehicle_plate}</span>
                </button>
              ))}
              {onlineDrivers.length === 0 && (
                <p className="text-[12px] text-slate-600 text-center py-4">Nenhum motorista online</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
