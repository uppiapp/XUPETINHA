'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useTheme } from 'next-themes'
import { cn } from '@/lib/utils'

const DARK_MAP_STYLES = [
  { elementType: 'geometry', stylers: [{ color: '#1d1d1f' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#1d1d1f' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8e8e93' }] },
  { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#aeaeb2' }] },
  { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#2c2c2e' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#1c3a1c' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#38383a' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#2c2c2e' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#48484a' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0a1929' }] },
]

const LIGHT_MAP_STYLES = [
  { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
]

declare global {
  interface Window {
    initGoogleMap?: () => void
    google: typeof google
  }
}

interface RoutePreview3DProps {
  origin: { lat: number; lng: number }
  destination: { lat: number; lng: number }
  originLabel?: string
  destinationLabel?: string
  distance?: string
  duration?: string
  estimatedPrice?: string
  onClose?: () => void
  compact?: boolean
  autoFlyover?: boolean
  className?: string
}

function loadGoogleMapsScript(apiKey: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.google?.maps) {
      resolve()
      return
    }

    const existingScript = document.getElementById('google-maps-script')
    if (existingScript) {
      if (window.google?.maps) {
        resolve()
        return
      }
      existingScript.addEventListener('load', () => resolve())
      return
    }

    window.initGoogleMap = () => {
      resolve()
    }

    const script = document.createElement('script')
    script.id = 'google-maps-script'
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=initGoogleMap&libraries=places,geometry`
    script.async = true
    script.defer = true
    script.onerror = () => reject(new Error('Failed to load Google Maps'))
    document.head.appendChild(script)
  })
}

export function RoutePreview3D({ 
  origin, 
  destination, 
  originLabel, 
  destinationLabel,
  distance,
  duration,
  estimatedPrice,
  onClose,
  compact = false,
  autoFlyover = false,
  className 
}: RoutePreview3DProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const routePathRef = useRef<any[]>([])
  const flyoverAnimRef = useRef<number | null>(null)
  const [mapLoaded, setMapLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'satellite' | 'roadmap'>('satellite')
  const [tiltAngle, setTiltAngle] = useState(45)
  const [isAnimating, setIsAnimating] = useState(false)
  const [flyoverProgress, setFlyoverProgress] = useState(0)
  const [isFlyover, setIsFlyover] = useState(false)
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  const initMap = useCallback(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return

    const midLat = (origin.lat + destination.lat) / 2
    const midLng = (origin.lng + destination.lng) / 2

    const map = new window.google.maps.Map(mapContainerRef.current, {
      center: { lat: midLat, lng: midLng },
      zoom: 15,
      mapTypeId: viewMode === 'satellite' ? 'hybrid' : 'roadmap',
      tilt: tiltAngle,
      heading: 0,
      disableDefaultUI: true,
      zoomControl: false,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      rotateControl: false,
      gestureHandling: 'greedy',
      styles: viewMode === 'roadmap' ? (isDark ? DARK_MAP_STYLES : LIGHT_MAP_STYLES) : undefined,
    })

    mapInstanceRef.current = map

    const directionsService = new window.google.maps.DirectionsService()
    directionsService.route(
      {
        origin: new window.google.maps.LatLng(origin.lat, origin.lng),
        destination: new window.google.maps.LatLng(destination.lat, destination.lng),
        travelMode: window.google.maps.TravelMode.DRIVING,
      },
      (result: any, status: any) => {
        if (status === window.google.maps.DirectionsStatus.OK && result) {
          // Draw animated route with gradient effect
          const path = result.routes[0].overview_path
          routePathRef.current = path

          // Shadow polyline
          new window.google.maps.Polyline({
            path,
            geodesic: true,
            strokeColor: '#000000',
            strokeOpacity: 0.15,
            strokeWeight: 10,
            map,
            zIndex: 1,
          })

          // Main route polyline
          new window.google.maps.Polyline({
            path,
            geodesic: true,
            strokeColor: '#00D4FF',
            strokeOpacity: 1,
            strokeWeight: 5,
            map,
            zIndex: 2,
          })

          // Glow polyline
          new window.google.maps.Polyline({
            path,
            geodesic: true,
            strokeColor: '#00D4FF',
            strokeOpacity: 0.3,
            strokeWeight: 12,
            map,
            zIndex: 1,
          })

          // Animated marker along route
          const animatedDot = new window.google.maps.Marker({
            position: path[0],
            map,
            icon: {
              path: window.google.maps.SymbolPath.CIRCLE,
              scale: 6,
              fillColor: '#ffffff',
              fillOpacity: 1,
              strokeColor: '#00D4FF',
              strokeWeight: 3,
            },
            zIndex: 10,
          })

          // Animate dot along the route
          let dotIdx = 0
          const animateDot = () => {
            dotIdx = (dotIdx + 1) % path.length
            animatedDot.setPosition(path[dotIdx])
            requestAnimationFrame(animateDot)
          }
          requestAnimationFrame(animateDot)

          // Origin marker
          new window.google.maps.Marker({
            position: { lat: origin.lat, lng: origin.lng },
            map,
            icon: {
              url: 'data:image/svg+xml,' + encodeURIComponent(`
                <svg width="44" height="44" viewBox="0 0 44 44" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="22" cy="22" r="20" fill="#00D4FF" opacity="0.2"/>
                  <circle cx="22" cy="22" r="14" fill="#00D4FF" stroke="white" strokeWidth="3"/>
                  <circle cx="22" cy="22" r="5" fill="white"/>
                </svg>
              `),
              scaledSize: new window.google.maps.Size(44, 44),
              anchor: new window.google.maps.Point(22, 22),
            },
            animation: window.google.maps.Animation.DROP,
          })

          // Destination marker
          new window.google.maps.Marker({
            position: { lat: destination.lat, lng: destination.lng },
            map,
            icon: {
              url: 'data:image/svg+xml,' + encodeURIComponent(`
                <svg width="52" height="52" viewBox="0 0 52 52" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="26" cy="22" r="20" fill="#10b981" opacity="0.2"/>
                  <path d="M26 6c-6 0-11 5-11 11 0 8 11 21 11 21s11-13 11-21c0-6-5-11-11-11zm0 15c-2 0-4-2-4-4s2-4 4-4 4 2 4 4-2 4-4 4z" fill="#10b981" stroke="white" strokeWidth="2.5"/>
                </svg>
              `),
              scaledSize: new window.google.maps.Size(52, 52),
              anchor: new window.google.maps.Point(26, 40),
            },
            animation: window.google.maps.Animation.DROP,
          })

          // Fit bounds
          const bounds = new window.google.maps.LatLngBounds()
          bounds.extend({ lat: origin.lat, lng: origin.lng })
          bounds.extend({ lat: destination.lat, lng: destination.lng })
          map.fitBounds(bounds, { top: compact ? 60 : 120, bottom: compact ? 100 : 180, left: 60, right: 60 })

          setMapLoaded(true)

          // Auto flyover if enabled
          if (autoFlyover) {
            setTimeout(() => startFlyover(path, map), 1500)
          }
        } else {
          setError('Nao foi possivel carregar a rota')
        }
      }
    )
  }, [origin, destination, viewMode, tiltAngle, isDark, compact, autoFlyover])

  const startFlyover = useCallback((path?: any[], mapInst?: any) => {
    const routePath = path || routePathRef.current
    const map = mapInst || mapInstanceRef.current
    if (!map || routePath.length === 0 || isFlyover) return

    setIsFlyover(true)
    setIsAnimating(true)

    const totalSteps = routePath.length
    let step = 0
    const startTilt = 67.5
    const startZoom = 17

    map.setTilt(startTilt)
    map.setZoom(startZoom)

    const animate = () => {
      if (step >= totalSteps) {
        setIsFlyover(false)
        setIsAnimating(false)
        setFlyoverProgress(0)
        // Zoom back out
        const bounds = new window.google.maps.LatLngBounds()
        bounds.extend({ lat: origin.lat, lng: origin.lng })
        bounds.extend({ lat: destination.lat, lng: destination.lng })
        map.fitBounds(bounds, { top: compact ? 60 : 120, bottom: compact ? 100 : 180, left: 60, right: 60 })
        map.setTilt(tiltAngle)
        return
      }

      const current = routePath[step]
      const next = routePath[Math.min(step + 1, totalSteps - 1)]
      
      // Calculate heading from current to next point
      const heading = window.google.maps.geometry?.spherical?.computeHeading(current, next) || 0

      map.panTo(current)
      map.setHeading(heading)

      const progress = (step / totalSteps) * 100
      setFlyoverProgress(progress)

      step += Math.max(1, Math.floor(totalSteps / 200))
      flyoverAnimRef.current = requestAnimationFrame(animate)
    }

    flyoverAnimRef.current = requestAnimationFrame(animate)
  }, [origin, destination, isFlyover, compact, tiltAngle])

  const stopFlyover = useCallback(() => {
    if (flyoverAnimRef.current) {
      cancelAnimationFrame(flyoverAnimRef.current)
      flyoverAnimRef.current = null
    }
    setIsFlyover(false)
    setIsAnimating(false)
    setFlyoverProgress(0)

    if (mapInstanceRef.current) {
      const bounds = new window.google.maps.LatLngBounds()
      bounds.extend({ lat: origin.lat, lng: origin.lng })
      bounds.extend({ lat: destination.lat, lng: destination.lng })
      mapInstanceRef.current.fitBounds(bounds, { top: compact ? 60 : 120, bottom: compact ? 100 : 180, left: 60, right: 60 })
      mapInstanceRef.current.setTilt(tiltAngle)
      mapInstanceRef.current.setHeading(0)
    }
  }, [origin, destination, compact, tiltAngle])

  useEffect(() => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setMapTypeId(viewMode === 'satellite' ? 'hybrid' : 'roadmap')
      mapInstanceRef.current.setTilt(tiltAngle)
      if (viewMode === 'roadmap') {
        mapInstanceRef.current.setOptions({
          styles: isDark ? DARK_MAP_STYLES : LIGHT_MAP_STYLES,
        })
      } else {
        mapInstanceRef.current.setOptions({ styles: undefined })
      }
    }
  }, [viewMode, tiltAngle, isDark])

  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
    if (!apiKey) {
      setError('Chave do Google Maps nao configurada')
      return
    }

    let cancelled = false

    async function init() {
      try {
        await loadGoogleMapsScript(apiKey as string)
        if (cancelled) return
        initMap()
      } catch {
        if (!cancelled) {
          setError('Falha ao carregar o mapa')
        }
      }
    }

    init()

    return () => {
      cancelled = true
      if (flyoverAnimRef.current) {
        cancelAnimationFrame(flyoverAnimRef.current)
      }
    }
  }, [initMap])

  const animateRotate = useCallback(() => {
    if (!mapInstanceRef.current || isAnimating) return

    setIsAnimating(true)
    let heading = 0

    const interval = setInterval(() => {
      heading += 3
      if (heading >= 360) {
        heading = 0
        clearInterval(interval)
        setIsAnimating(false)
      }
      mapInstanceRef.current?.setHeading(heading)
    }, 50)
  }, [isAnimating])

  // Fallback map for when Google Maps isn't available
  if (error) {
    return (
      <div className={cn('flex flex-col items-center justify-center bg-card rounded-[20px]', className)}>
        {/* Fallback route visualization */}
        <div className="w-full h-full relative bg-secondary/50 flex flex-col items-center justify-center gap-4 p-6">
          <div className="relative w-full max-w-[200px]">
            {/* Origin */}
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <div className="w-4 h-4 rounded-full bg-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] text-muted-foreground">Origem</p>
                <p className="text-[13px] font-semibold text-foreground truncate">{originLabel || 'Ponto A'}</p>
              </div>
            </div>
            {/* Line */}
            <div className="absolute left-5 top-10 bottom-10 w-0.5 bg-primary/20">
              <div className="absolute inset-x-0 top-0 h-1/2 bg-primary/60 rounded-full animate-pulse" />
            </div>
            {/* Destination */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <div className="w-4 h-4 rounded-full bg-emerald-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] text-muted-foreground">Destino</p>
                <p className="text-[13px] font-semibold text-foreground truncate">{destinationLabel || 'Ponto B'}</p>
              </div>
            </div>
          </div>
          {(distance || duration) && (
            <div className="flex items-center gap-4 mt-2">
              {distance && <span className="text-[13px] font-semibold text-muted-foreground">{distance}</span>}
              {duration && <span className="text-[13px] font-semibold text-muted-foreground">{duration}</span>}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className={cn('relative', className)}>
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Loading overlay */}
      {!mapLoaded && (
        <div className="absolute inset-0 bg-black flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            {/* Animated route loading icon */}
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 border-[3px] border-cyan-400/20 rounded-full" />
              <div className="absolute inset-0 border-[3px] border-transparent border-t-cyan-400 rounded-full animate-spin" />
              <div className="absolute inset-0 border-[3px] border-transparent border-b-emerald-400 rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
              <div className="absolute inset-0 flex items-center justify-center">
                <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
              </div>
            </div>
            <span className="text-[13px] text-white/80 font-semibold">Carregando preview 3D...</span>
          </div>
        </div>
      )}

      {/* Flyover progress bar */}
      {isFlyover && (
        <div className="absolute top-0 left-0 right-0 z-20 h-1 bg-white/10">
          <div
            className="h-full bg-cyan-400 transition-all duration-100"
            style={{ width: `${flyoverProgress}%` }}
          />
        </div>
      )}

      {/* Controls overlay */}
      {mapLoaded && (
        <>
          {/* Top info card */}
          {!compact && (
            <div className="absolute top-6 left-4 right-4 z-10 animate-ios-fade-up">
              <div className="bg-black/75 ios-blur-heavy rounded-[20px] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                      <p className="text-[12px] font-bold text-white/70 uppercase tracking-wider">Preview 3D</p>
                    </div>
                    
                    <div className="space-y-2 text-white">
                      <div className="flex items-start gap-2">
                        <div className="w-4 h-4 rounded-full bg-cyan-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-white" />
                        </div>
                        <p className="text-[13px] leading-snug truncate">{originLabel || 'Origem'}</p>
                      </div>
                      <div className="flex items-start gap-2">
                        <div className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <svg className="w-2.5 h-2.5" fill="white" viewBox="0 0 24 24">
                            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                          </svg>
                        </div>
                        <p className="text-[13px] leading-snug truncate">{destinationLabel || 'Destino'}</p>
                      </div>
                    </div>

                    {(distance || duration || estimatedPrice) && (
                      <div className="flex items-center gap-3 mt-3 pt-3 border-t border-white/15">
                        {distance && (
                          <div className="flex items-center gap-1.5">
                            <svg className="w-3.5 h-3.5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                            </svg>
                            <span className="text-[12px] font-semibold text-white">{distance}</span>
                          </div>
                        )}
                        {duration && (
                          <div className="flex items-center gap-1.5">
                            <svg className="w-3.5 h-3.5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="text-[12px] font-semibold text-white">{duration}</span>
                          </div>
                        )}
                        {estimatedPrice && (
                          <div className="flex items-center gap-1.5">
                            <span className="text-[12px] font-bold text-emerald-400">{estimatedPrice}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {onClose && (
                    <button
                      type="button"
                      onClick={onClose}
                      className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center ios-press transition-colors flex-shrink-0"
                    >
                      <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Compact close button */}
          {compact && onClose && (
            <div className="absolute top-3 right-3 z-10">
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-black/60 ios-blur flex items-center justify-center ios-press"
              >
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}

          {/* Control buttons */}
          <div className={cn(
            "absolute left-4 right-4 z-10 flex items-center gap-2 animate-ios-fade-up",
            compact ? "bottom-3" : "bottom-6"
          )} style={{ animationDelay: '100ms' }}>
            {/* View mode toggle */}
            <div className="flex items-center gap-1.5 bg-black/75 ios-blur-heavy rounded-[14px] p-1.5">
              <button
                type="button"
                onClick={() => setViewMode('satellite')}
                className={cn(
                  'px-3 h-9 rounded-[10px] font-semibold text-[12px] transition-all ios-press',
                  viewMode === 'satellite'
                    ? 'bg-cyan-400 text-black'
                    : 'bg-transparent text-white/60 hover:text-white'
                )}
              >
                Satelite
              </button>
              <button
                type="button"
                onClick={() => setViewMode('roadmap')}
                className={cn(
                  'px-3 h-9 rounded-[10px] font-semibold text-[12px] transition-all ios-press',
                  viewMode === 'roadmap'
                    ? 'bg-cyan-400 text-black'
                    : 'bg-transparent text-white/60 hover:text-white'
                )}
              >
                Mapa
              </button>
            </div>

            <div className="flex-1" />

            {/* Tilt control */}
            <button
              type="button"
              onClick={() => setTiltAngle(tiltAngle === 45 ? 0 : 45)}
              className="w-10 h-10 rounded-[14px] bg-black/75 ios-blur-heavy flex items-center justify-center ios-press"
              title={tiltAngle === 45 ? 'Vista 2D' : 'Vista 3D'}
            >
              <svg className="w-4.5 h-4.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-2.25-1.313M21 7.5v2.25m0-2.25l-2.25 1.313M3 7.5l2.25-1.313M3 7.5l2.25 1.313M3 7.5v2.25m9 3l2.25-1.313M12 12.75l-2.25-1.313M12 12.75V15m0 6.75l2.25-1.313M12 21.75V15m0 0l-2.25-1.313" />
              </svg>
            </button>

            {/* Flyover button */}
            <button
              type="button"
              onClick={() => isFlyover ? stopFlyover() : startFlyover()}
              className={cn(
                "w-10 h-10 rounded-[14px] ios-blur-heavy flex items-center justify-center ios-press transition-colors",
                isFlyover ? "bg-cyan-400" : "bg-black/75"
              )}
              title={isFlyover ? 'Parar flyover' : 'Sobrevoar rota'}
            >
              {isFlyover ? (
                <svg className="w-4 h-4 text-black" fill="currentColor" viewBox="0 0 24 24">
                  <rect x="6" y="5" width="4" height="14" rx="1" />
                  <rect x="14" y="5" width="4" height="14" rx="1" />
                </svg>
              ) : (
                <svg className="w-4.5 h-4.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                </svg>
              )}
            </button>

            {/* Rotate animation */}
            <button
              type="button"
              onClick={animateRotate}
              disabled={isAnimating}
              className="w-10 h-10 rounded-[14px] bg-black/75 ios-blur-heavy flex items-center justify-center ios-press disabled:opacity-50"
              title="Rotacionar 360"
            >
              <svg className={cn("w-4.5 h-4.5 text-white", isAnimating && !isFlyover && "animate-spin")} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </>
      )}
    </div>
  )
}
