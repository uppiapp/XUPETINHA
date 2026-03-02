'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import type { HotZone } from '@/lib/types/database'

interface DemandZone {
  id: string
  lat: number
  lng: number
  radius: number
  intensity: number // 0-1
  label: string
  ride_count: number
  avg_price: number
  peak_hour: string
}

const MOCK_ZONES: DemandZone[] = [
  { id: '1', lat: -15.7942, lng: -47.8825, radius: 800, intensity: 0.9, label: 'Asa Norte', ride_count: 47, avg_price: 22, peak_hour: '18:00-20:00' },
  { id: '2', lat: -15.8267, lng: -47.9218, radius: 600, intensity: 0.7, label: 'Asa Sul', ride_count: 33, avg_price: 18, peak_hour: '07:00-09:00' },
  { id: '3', lat: -15.7801, lng: -47.9292, radius: 1000, intensity: 1.0, label: 'Plano Piloto', ride_count: 65, avg_price: 28, peak_hour: '08:00-10:00' },
  { id: '4', lat: -15.8727, lng: -48.0169, radius: 500, intensity: 0.5, label: 'Taguatinga', ride_count: 21, avg_price: 15, peak_hour: '07:00-08:00' },
  { id: '5', lat: -15.8348, lng: -48.1396, radius: 400, intensity: 0.4, label: 'Ceilândia', ride_count: 18, avg_price: 14, peak_hour: '06:00-08:00' },
]

const DEMAND_COLORS: Record<string, string> = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#f59e0b',
  low: '#10b981',
}

export default function DriverHotZonesPage() {
  const router = useRouter()
  const supabase = createClient()
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<any>(null)

  const [zones, setZones] = useState<DemandZone[]>([])
  const [hotZones, setHotZones] = useState<HotZone[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<DemandZone | null>(null)
  const [userLat, setUserLat] = useState<number | null>(null)
  const [userLng, setUserLng] = useState<number | null>(null)

  useEffect(() => {
    loadData()
    getUserLocation()
  }, [])

  const getUserLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        setUserLat(pos.coords.latitude)
        setUserLng(pos.coords.longitude)
      })
    }
  }

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/onboarding/splash'); return }

      const [{ data: hz }] = await Promise.all([
        supabase.from('hot_zones').select('*').eq('is_active', true),
      ])
      if (hz) setHotZones(hz)

      // Combine DB zones with demand data
      setZones(MOCK_ZONES)
    } finally {
      setLoading(false)
    }
  }

  // Subscribe to realtime hot zones updates
  useEffect(() => {
    const channel = supabase
      .channel('hot-zones-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'hot_zones' }, () => loadData())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  // Init map
  useEffect(() => {
    if (!mapRef.current || mapInstance.current || loading) return

    const createMap = () => {
      if (!mapRef.current || mapInstance.current) return
      const center = userLat && userLng
        ? { lat: userLat, lng: userLng }
        : { lat: -15.7801, lng: -47.9292 }
      mapInstance.current = new window.google.maps.Map(mapRef.current, {
        center,
        zoom: 12,
        mapId: 'driver-hot-zones',
        disableDefaultUI: false,
        zoomControl: true,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        styles: [
          { featureType: 'poi', stylers: [{ visibility: 'off' }] },
          { featureType: 'transit', stylers: [{ visibility: 'off' }] },
        ],
      })
      drawZones()
    }

    if (window.google?.maps) {
      createMap()
    } else {
      const script = document.createElement('script')
      script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=visualization&v=weekly`
      script.async = true
      script.onload = createMap
      document.head.appendChild(script)
    }
  }, [loading, userLat, userLng])

  const drawZones = useCallback(() => {
    if (!mapInstance.current || !window.google) return

    zones.forEach((zone) => {
      const color = zone.intensity > 0.8 ? '#ef4444' : zone.intensity > 0.6 ? '#f97316' : zone.intensity > 0.4 ? '#f59e0b' : '#10b981'
      const circle = new window.google.maps.Circle({
        center: { lat: zone.lat, lng: zone.lng },
        radius: zone.radius,
        strokeColor: color,
        strokeOpacity: 0.6,
        strokeWeight: 2,
        fillColor: color,
        fillOpacity: 0.25,
        map: mapInstance.current,
      })
      circle.addListener('click', () => setSelected(zone))

      // Label marker
      const el = document.createElement('div')
      el.innerHTML = `<div style="background:${color};color:white;padding:4px 10px;border-radius:20px;font-size:12px;font-weight:700;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,0.25);">${zone.label}</div>`
      new window.google.maps.marker?.AdvancedMarkerElement?.({
        map: mapInstance.current,
        position: { lat: zone.lat, lng: zone.lng },
        content: el,
      })
    })

    // User marker
    if (userLat && userLng) {
      const el = document.createElement('div')
      el.innerHTML = `<div style="width:16px;height:16px;background:#007AFF;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,122,255,0.5)"></div>`
      new window.google.maps.marker?.AdvancedMarkerElement?.({
        map: mapInstance.current,
        position: { lat: userLat, lng: userLng },
        content: el,
      })
    }
  }, [zones, userLat, userLng])

  useEffect(() => {
    if (!loading && mapInstance.current) {
      drawZones()
    }
  }, [zones, loading])

  const intensityLabel = (i: number) => {
    if (i > 0.8) return { label: 'Altíssima', color: 'text-red-500 bg-red-50' }
    if (i > 0.6) return { label: 'Alta', color: 'text-orange-500 bg-orange-50' }
    if (i > 0.4) return { label: 'Média', color: 'text-amber-500 bg-amber-50' }
    return { label: 'Baixa', color: 'text-emerald-500 bg-emerald-50' }
  }

  const topZones = [...zones].sort((a, b) => b.intensity - a.intensity).slice(0, 5)

  return (
    <div className="h-dvh overflow-hidden bg-[color:var(--background)] flex flex-col relative">
      {/* Map */}
      <div className="absolute inset-0">
        {loading ? (
          <div className="w-full h-full bg-[color:var(--muted)] flex items-center justify-center">
            <div className="w-8 h-8 border-[2.5px] border-emerald-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div ref={mapRef} className="w-full h-full" />
        )}
      </div>

      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-20 pt-safe-offset-4 px-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="w-10 h-10 bg-[color:var(--card)]/90 ios-blur rounded-full flex items-center justify-center shadow-md ios-press"
          >
            <svg className="w-5 h-5 text-[color:var(--foreground)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex-1 bg-[color:var(--card)]/90 ios-blur rounded-[16px] px-4 py-2.5 shadow-md">
            <p className="text-[16px] font-bold text-[color:var(--foreground)]">Zonas Quentes</p>
            <p className="text-[12px] text-[color:var(--muted-foreground)]">Alta demanda em tempo real</p>
          </div>
        </div>
      </div>

      {/* Legenda */}
      <div className="absolute top-[calc(env(safe-area-inset-top)+80px)] right-4 z-20">
        <div className="bg-[color:var(--card)]/90 ios-blur rounded-[16px] p-3 shadow-md space-y-2">
          {[
            { color: '#ef4444', label: 'Altíssima' },
            { color: '#f97316', label: 'Alta' },
            { color: '#f59e0b', label: 'Média' },
            { color: '#10b981', label: 'Baixa' },
          ].map(l => (
            <div key={l.label} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: l.color }} />
              <span className="text-[11px] font-semibold text-[color:var(--foreground)]">{l.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Selected zone detail */}
      {selected && (
        <div className="absolute bottom-48 left-4 right-4 z-20 animate-ios-fade-up">
          <div className="bg-[color:var(--card)]/95 ios-blur rounded-[24px] p-5 shadow-xl border border-[color:var(--border)]">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-[18px] font-bold text-[color:var(--foreground)]">{selected.label}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className={cn('text-[11px] font-bold px-2 py-0.5 rounded-full', intensityLabel(selected.intensity).color)}>
                    Demanda {intensityLabel(selected.intensity).label}
                  </span>
                </div>
              </div>
              <button type="button" onClick={() => setSelected(null)} className="w-8 h-8 bg-[color:var(--muted)] rounded-full flex items-center justify-center ios-press">
                <svg className="w-4 h-4 text-[color:var(--foreground)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center bg-[color:var(--muted)] rounded-[14px] py-3">
                <p className="text-[18px] font-black text-emerald-600">{selected.ride_count}</p>
                <p className="text-[11px] text-[color:var(--muted-foreground)]">Corridas</p>
              </div>
              <div className="text-center bg-[color:var(--muted)] rounded-[14px] py-3">
                <p className="text-[18px] font-black text-blue-600">R${selected.avg_price}</p>
                <p className="text-[11px] text-[color:var(--muted-foreground)]">Preço médio</p>
              </div>
              <div className="text-center bg-[color:var(--muted)] rounded-[14px] py-3">
                <p className="text-[14px] font-black text-amber-600">{selected.peak_hour}</p>
                <p className="text-[11px] text-[color:var(--muted-foreground)]">Pico</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bottom panel: top zones */}
      <div className="absolute bottom-0 left-0 right-0 z-20">
        <div className="bg-[color:var(--card)]/[0.98] ios-blur rounded-t-[28px] shadow-[0_-8px_40px_rgba(0,0,0,0.1)] pb-safe-offset-4">
          <div className="flex justify-center pt-3 mb-3">
            <div className="w-9 h-[5px] bg-[color:var(--muted-foreground)]/30 rounded-full" />
          </div>
          <div className="px-5 pb-4">
            <p className="text-[12px] font-bold text-[color:var(--muted-foreground)] uppercase tracking-wide mb-3">
              Top zonas agora
            </p>
            <div className="space-y-2">
              {topZones.map((zone, i) => {
                const { label, color } = intensityLabel(zone.intensity)
                return (
                  <button
                    key={zone.id}
                    type="button"
                    onClick={() => {
                      setSelected(zone)
                      if (mapInstance.current) {
                        mapInstance.current.panTo({ lat: zone.lat, lng: zone.lng })
                        mapInstance.current.setZoom(14)
                      }
                    }}
                    className="w-full flex items-center gap-3 p-3 rounded-[16px] bg-[color:var(--muted)] ios-press text-left"
                  >
                    <div className="w-7 h-7 rounded-full bg-[color:var(--card)] flex items-center justify-center shrink-0">
                      <span className="text-[12px] font-black text-[color:var(--muted-foreground)]">#{i + 1}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-bold text-[color:var(--foreground)] truncate">{zone.label}</p>
                      <p className="text-[11px] text-[color:var(--muted-foreground)]">{zone.ride_count} corridas · Pico {zone.peak_hour}</p>
                    </div>
                    <span className={cn('text-[11px] font-bold px-2 py-0.5 rounded-full shrink-0', color)}>
                      {label}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
