'use client'

import React from "react"

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  ChevronRight,
  User,
  CreditCard,
  Tag,
  SlidersHorizontal,
  Calendar,
  X,
  Clock,
  Briefcase,
  PawPrint,
  ChevronDown,
  Loader2,
  Car,
} from 'lucide-react'
import { RouteMap } from '@/components/route-map'
import { PixModal } from '@/components/pix-modal'

// Price per km for each vehicle type (R$)
const PRICE_PER_KM: Record<VehicleType, number> = {
  moto: 1.8,
  economy: 2.5,
  electric: 4.0,
}

// Base fare for each vehicle type (R$)
const BASE_FARE: Record<VehicleType, number> = {
  moto: 3.0,
  economy: 5.0,
  electric: 8.0,
}

type VehicleType = 'moto' | 'economy' | 'electric'

interface StopData {
  address: string
  coords: { lat: number; lng: number } | null
}

interface RouteData {
  pickup: string
  pickupCoords: { lat: number; lng: number } | null
  destination: string
  destinationCoords: { lat: number; lng: number } | null
  stops?: StopData[]
}

function calculatePrice(type: VehicleType, distanceKm: number): number {
  const base = BASE_FARE[type]
  const perKm = PRICE_PER_KM[type]
  return Math.round((base + perKm * distanceKm) * 100) / 100
}

export default function RideSelectPage() {
  const router = useRouter()
  const [selected, setSelected] = useState<VehicleType>('moto')
  const [showPayment, setShowPayment] = useState(false)
  const [showCoupon, setShowCoupon] = useState(false)
  const [showPreferences, setShowPreferences] = useState(false)
  const [couponCode, setCouponCode] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('')
  const [waitTime] = useState('Sem tempo de espera')
  const [hasLuggage, setHasLuggage] = useState(false)
  const [hasPet, setHasPet] = useState(false)
  const [route, setRoute] = useState<RouteData>({
    pickup: '',
    pickupCoords: null,
    destination: '',
    destinationCoords: null,
  })
  const [distanceKm, setDistanceKm] = useState<number | null>(null)
  const [durationText, setDurationText] = useState<string | null>(null)
  const [loadingDistance, setLoadingDistance] = useState(true)

  // PIX state
  const [showPixModal, setShowPixModal] = useState(false)
  const [pixLoading, setPixLoading] = useState(false)
  const [pixData, setPixData] = useState<{
    externalId: string
    qrCodeImage: string | null
    qrCodeText: string
    amountLabel: string
  } | null>(null)
  const [pixError, setPixError] = useState<string | null>(null)
  
  // Drag state
  const [sheetHeight, setSheetHeight] = useState(62) // percentage - mostra tudo
  const [isDragging, setIsDragging] = useState(false)
  const sheetRef = useRef<HTMLDivElement>(null)
  const startY = useRef(0)
  const startHeight = useRef(0)
  const recenterMapRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    const saved = sessionStorage.getItem('rideRoute')
    if (saved) {
      const parsed = JSON.parse(saved) as RouteData
      setRoute(parsed)

      // Calculate distance if we have both coordinates
      if (parsed.pickupCoords && parsed.destinationCoords) {
        fetchDistance(parsed.pickupCoords, parsed.destinationCoords)
      } else {
        setLoadingDistance(false)
        // Fallback: estimate 5km if no coords
        setDistanceKm(5)
      }
    } else {
      setLoadingDistance(false)
      setDistanceKm(5)
    }
  }, [])

  // Drag handlers
  const handleDragStart = (clientY: number) => {
    setIsDragging(true)
    startY.current = clientY
    startHeight.current = sheetHeight
  }

  const handleDragMove = (clientY: number) => {
    if (!isDragging) return
    
    const deltaY = clientY - startY.current
    const viewportHeight = window.innerHeight
    const deltaPercent = (deltaY / viewportHeight) * 100
    
    const newHeight = Math.max(30, Math.min(85, startHeight.current - deltaPercent))
    setSheetHeight(newHeight)
  }

  const handleDragEnd = () => {
    setIsDragging(false)
    
    // Snap to nearest position
    if (sheetHeight > 65) {
      setSheetHeight(80) // Expandido
    } else if (sheetHeight > 45) {
      setSheetHeight(55) // Padrao - cards + botoes visiveis
    } else {
      setSheetHeight(35) // Minimizado - so botao confirmar
    }
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    handleDragStart(e.touches[0].clientY)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    handleDragMove(e.touches[0].clientY)
  }

  const handleTouchEnd = () => {
    handleDragEnd()
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    handleDragStart(e.clientY)
  }

  useEffect(() => {
    if (!isDragging) return

    const handleMouseMove = (e: MouseEvent) => {
      handleDragMove(e.clientY)
    }

    const handleMouseUp = () => {
      handleDragEnd()
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, sheetHeight])

  const fetchDistance = async (
    origin: { lat: number; lng: number },
    dest: { lat: number; lng: number }
  ) => {
    try {
      const res = await fetch('/api/v1/distance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          originLat: origin.lat,
          originLng: origin.lng,
          destLat: dest.lat,
          destLng: dest.lng,
        }),
      })
      const data = await res.json()

      if (data.distance) {
        const km = data.distance.value / 1000
        setDistanceKm(km)
        setDurationText(data.duration?.text || null)
      } else {
        // Fallback: calculate using Haversine
        const km = haversineDistance(origin, dest)
        setDistanceKm(km)
      }
    } catch {
      const km = haversineDistance(origin, dest)
      setDistanceKm(km)
    } finally {
      setLoadingDistance(false)
    }
  }

  const haversineDistance = (
    a: { lat: number; lng: number },
    b: { lat: number; lng: number }
  ): number => {
    const R = 6371
    const dLat = ((b.lat - a.lat) * Math.PI) / 180
    const dLng = ((b.lng - a.lng) * Math.PI) / 180
    const sinLat = Math.sin(dLat / 2)
    const sinLng = Math.sin(dLng / 2)
    const h =
      sinLat * sinLat +
      Math.cos((a.lat * Math.PI) / 180) *
        Math.cos((b.lat * Math.PI) / 180) *
        sinLng *
        sinLng
    return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h))
  }

  const rideOptions = [
    {
      id: 'moto' as VehicleType,
      name: 'Moto',
      passengers: 1,
      description: 'Rapido e economico',
      vehicleType: 'moto' as const,
    },
    {
      id: 'economy' as VehicleType,
      name: 'Economico',
      passengers: 3,
      description: 'Opcao mais economica',
      vehicleType: 'car' as const,
    },
    {
      id: 'electric' as VehicleType,
      name: 'Eletrico',
      passengers: 4,
      description: 'Carro eletrico silencioso',
      vehicleType: 'car' as const,
    },
  ]

  const STOP_SURCHARGE = 2.5 // R$ per extra stop

  const getPrice = (type: VehicleType) => {
    if (distanceKm === null) return 0
    const base = calculatePrice(type, distanceKm)
    const stopExtra = (route.stops?.length || 0) * STOP_SURCHARGE
    return Math.round((base + stopExtra) * 100) / 100
  }

  const selectedRide = rideOptions.find((r) => r.id === selected)
  const selectedPrice = getPrice(selected)

  const buildRideData = () => ({
    ...selectedRide,
    price: selectedPrice,
    distanceKm,
    durationText,
    vehicleType: selected,
    paymentMethod: paymentMethod || 'cash',
    stops: route.stops || [],
  })

  const handleConfirmRide = async () => {
    const rideData = buildRideData()
    sessionStorage.setItem('selectedRide', JSON.stringify(rideData))

    if (paymentMethod === 'Pix') {
      setPixLoading(true)
      setPixError(null)
      try {
        const amountCents = Math.round(selectedPrice * 100)
        const res = await fetch('/api/pix/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: amountCents,
            description: `Corrida Xupetinha - ${route.pickup} → ${route.destination}`,
          }),
        })
        const data = await res.json()
        if (!res.ok || data.error) throw new Error(data.error || 'Erro ao gerar PIX')

        setPixData({
          externalId: data.external_id || data.transaction_id || String(amountCents),
          qrCodeImage: data.qr_code_base64 || null,
          qrCodeText: data.qr_code || data.qr_code_text || '',
          amountLabel: `R$ ${selectedPrice.toFixed(2)}`,
        })
        setShowPixModal(true)
      } catch (err) {
        setPixError(err instanceof Error ? err.message : 'Erro ao gerar PIX. Tente novamente.')
      } finally {
        setPixLoading(false)
      }
    } else {
      router.push('/uppi/ride/searching')
    }
  }

  const handlePixPaid = () => {
    setShowPixModal(false)
    // Mark payment as done in sessionStorage so searching page knows
    const rideData = buildRideData()
    sessionStorage.setItem('selectedRide', JSON.stringify({ ...rideData, pixPaid: true }))
    router.push('/uppi/ride/searching')
  }

  return (
    <div className="h-dvh bg-background flex flex-col overflow-hidden relative">
      {/* Mapa - altura reduzida */}
      <div className="absolute inset-0 bg-secondary" style={{ height: '45vh' }}>
        {route.pickupCoords && route.destinationCoords ? (
          <RouteMap
            origin={route.pickupCoords}
            destination={route.destinationCoords}
            originLabel={route.pickup}
            destinationLabel={route.destination}
            showInfoWindows
            onRecenterReady={(fn) => {
              recenterMapRef.current = fn
            }}
            bottomPadding={typeof window !== 'undefined' ? Math.round(window.innerHeight * (sheetHeight / 100)) + 20 : 400}
            className="w-full h-full"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-secondary">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          </div>
        )}

        {/* Barra de informacao da rota - topo */}
        <div className="absolute top-safe-offset-4 left-4 right-4 z-10 flex items-center gap-2">
          {/* Botao voltar */}
          <button
            type="button"
            onClick={() => router.back()}
            className="w-10 h-10 bg-card/95 backdrop-blur-xl rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.12)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.4)] flex items-center justify-center flex-shrink-0 active:scale-95 transition-transform"
          >
            <ArrowLeft className="w-5 h-5 text-foreground" strokeWidth={2.5} />
          </button>

          {/* Info da rota - distancia e destino */}
          <div className="flex-1 bg-card/95 backdrop-blur-xl rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.12)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.4)] px-4 py-2.5 flex items-center gap-3 min-w-0">
            <div className="flex flex-col min-w-0 flex-1">
              <div className="flex items-center gap-2">
                {distanceKm !== null && (
                  <span className="text-[13px] font-bold text-blue-500">
                    {distanceKm.toFixed(1)} km
                  </span>
                )}
                {durationText && (
                  <>
                    <span className="text-muted-foreground/30">{'|'}</span>
                    <span className="text-[13px] font-medium text-muted-foreground">
                      {durationText}
                    </span>
                  </>
                )}
              </div>
              <p className="text-[13px] text-muted-foreground truncate mt-0.5">
                {route.stops && route.stops.length > 0 ? (
                  <span className="flex items-center gap-1.5">
                    <span className="inline-flex items-center bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 text-[11px] font-bold px-1.5 py-0.5 rounded-md">
                      +{route.stops.length} {route.stops.length === 1 ? 'parada' : 'paradas'}
                    </span>
                    <span className="truncate">{route.destination || 'Destino'}</span>
                  </span>
                ) : (
                  route.destination || 'Destino'
                )}
              </p>
            </div>
            {/* Botao X para limpar e voltar */}
            <button
              type="button"
              onClick={() => {
                sessionStorage.removeItem('rideRoute')
                router.push('/uppi/ride/route-input')
              }}
              className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center flex-shrink-0 active:scale-95 transition-transform"
            >
              <X className="w-4 h-4 text-muted-foreground" strokeWidth={2.5} />
            </button>
          </div>

          {/* Botao recentralizar mapa */}
          <button
            type="button"
            onClick={() => recenterMapRef.current?.()}
            className="w-10 h-10 bg-card/95 backdrop-blur-xl rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.12)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.4)] flex items-center justify-center flex-shrink-0 active:scale-95 transition-transform"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-foreground"
            >
              <circle cx="12" cy="12" r="3" />
              <path d="M12 1v6m0 6v6m-9-9h6m6 0h6" />
            </svg>
          </button>
        </div>
      </div>

      {/* Bottom sheet draggable - estilo iOS profissional */}
      <div
        ref={sheetRef}
        className="absolute left-0 right-0 bg-card/98 dark:bg-card/95 backdrop-blur-2xl rounded-t-[32px] flex flex-col shadow-[0_-8px_32px_rgba(0,0,0,0.12)] dark:shadow-[0_-8px_32px_rgba(0,0,0,0.5)] overflow-hidden"
        style={{
          top: '43vh',
          bottom: 0,
          transition: isDragging ? 'none' : 'height 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        {/* Handle - área draggable */}
        <div
          className="flex justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onMouseDown={handleMouseDown}
        >
          <div className="w-9 h-1 bg-muted-foreground/30 rounded-full" />
        </div>

        {/* Opcoes de corrida - scrollavel */}
        <div className="flex-1 overflow-y-auto min-h-0 px-5">
          {loadingDistance ? (
            <div className="flex flex-col items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-blue-500 mb-2.5" />
              <p className="text-[15px] font-medium text-muted-foreground">Calculando valores...</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2 pb-2">
              {rideOptions.map((option) => {
                const price = getPrice(option.id)
                const isSelected = selected === option.id
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setSelected(option.id)}
                    className={`w-full flex items-center gap-4 px-4 py-3 rounded-[20px] transition-all duration-200 text-left ${
                      isSelected
                        ? 'bg-blue-500/10 border-2 border-blue-500 shadow-[0_2px_12px_rgba(59,130,246,0.15)]'
                        : 'bg-secondary/50 border-2 border-transparent active:scale-[0.98]'
                    }`}
                  >
                    <div className={`w-12 h-12 rounded-[16px] flex items-center justify-center flex-shrink-0 ${
                      isSelected ? 'bg-card shadow-sm' : 'bg-card/80'
                    }`}>
                      {option.vehicleType === 'moto' ? (
                        <svg className="w-6 h-6 text-violet-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="4" cy="17" r="2.5" />
                          <circle cx="20" cy="17" r="2.5" />
                          <path d="M13 6l3 4h4" />
                          <path d="M6.5 17l3.5-6h4l2.5 3.5" />
                          <path d="M13 6h2" />
                        </svg>
                      ) : (
                        <Car
                          strokeWidth={2.5}
                          className={`w-6 h-6 ${
                            option.id === 'economy'
                              ? 'text-blue-500'
                              : 'text-emerald-500'
                          }`}
                        />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-[16px] text-foreground tracking-tight">
                          {option.name}
                        </span>
                      </div>
                      <div className="text-[14px] text-muted-foreground mt-0.5">
                        {option.description}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-[18px] font-bold text-blue-600 tracking-tight">
                        R${price.toFixed(2)}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Secao inferior - SEMPRE visivel */}
        <div className="flex-shrink-0 px-5 pt-3 pb-safe-offset-4 border-t border-border">
          {/* Metodo de pagamento */}
          <button
            type="button"
            onClick={() => setShowPayment(true)}
            className="w-full flex items-center gap-3 px-4 py-3.5 border border-amber-200 dark:border-amber-800 rounded-[18px] bg-amber-50/40 dark:bg-amber-950/30 active:scale-[0.98] transition-transform"
          >
            <CreditCard className="w-5 h-5 text-amber-600" strokeWidth={2.5} />
            <span className="flex-1 text-left text-blue-600 font-semibold text-[15px]">
              {paymentMethod || 'Selecione o pagamento'}
            </span>
            <ChevronRight className="w-5 h-5 text-neutral-400" strokeWidth={2.5} />
          </button>

          {/* Preferencias e Cupom */}
          <div className="mt-3 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setShowPreferences(true)}
              className="flex items-center gap-2 active:opacity-60 transition-opacity"
            >
              <SlidersHorizontal className="w-[18px] h-[18px] text-blue-600" strokeWidth={2.5} />
              <span className="text-blue-600 font-semibold text-[15px]">
                Preferências
              </span>
            </button>
            <button
              type="button"
              onClick={() => setShowCoupon(true)}
              className="flex items-center gap-2 active:opacity-60 transition-opacity"
            >
              <Tag className="w-[18px] h-[18px] text-blue-600" strokeWidth={2.5} />
              <span className="text-blue-600 font-semibold text-[15px]">Cupom</span>
            </button>
          </div>

          {/* Agendar / Confirmar */}
          <div className="mt-3 flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                sessionStorage.setItem(
                  'selectedRide',
                  JSON.stringify(buildRideData())
                )
                router.push('/uppi/ride/schedule')
              }}
              className="w-[52px] h-[52px] rounded-[18px] border border-border flex items-center justify-center flex-shrink-0 bg-secondary/50 active:scale-95 transition-transform"
            >
              <Calendar className="w-5 h-5 text-neutral-500" strokeWidth={2.5} />
            </button>
            <button
              type="button"
              disabled={loadingDistance || pixLoading}
              onClick={handleConfirmRide}
              className="flex-1 h-[52px] rounded-[18px] bg-blue-600 text-white font-semibold text-[17px] tracking-tight transition-all disabled:opacity-50 active:scale-[0.98] flex items-center justify-center gap-2"
            >
              {pixLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Gerando PIX...
                </>
              ) : (
                `Confirmar viagem - R$ ${selectedPrice.toFixed(2)}`
              )}
            </button>
          </div>
          {pixError && (
            <p className="mt-2 text-center text-[13px] text-red-500 font-medium">{pixError}</p>
          )}
        </div>
      </div>

      {/* PIX MODAL - abre antes de buscar motorista */}
      {showPixModal && pixData && (
        <PixModal
          externalId={pixData.externalId}
          qrCodeImage={pixData.qrCodeImage}
          qrCodeText={pixData.qrCodeText}
          amountLabel={pixData.amountLabel}
          onClose={() => setShowPixModal(false)}
          onPaid={handlePixPaid}
        />
      )}

      {/* PAYMENT MODAL */}
      {showPayment && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center">
          <div className="bg-card w-full max-w-md rounded-t-3xl px-6 pt-6 pb-8 animate-in slide-in-from-bottom">
            <div className="flex items-center justify-between mb-6">
              <button type="button" onClick={() => setShowPayment(false)}>
                <X className="w-6 h-6 text-muted-foreground" />
              </button>
              <h2 className="text-xl font-bold text-foreground">Pagamento</h2>
              <div className="w-6" />
            </div>

            {/* Price breakdown */}
            <div className="border-2 border-dashed border-blue-400 dark:border-blue-600 rounded-2xl p-5 mb-6">
              <div className="flex justify-between mb-2">
                <span className="text-muted-foreground">Taxa base</span>
                <span className="font-medium text-foreground">
                  R$ {BASE_FARE[selected].toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between mb-2">
                <span className="text-muted-foreground">
                  Distância ({distanceKm?.toFixed(1)} km x R${' '}
                  {PRICE_PER_KM[selected].toFixed(2)})
                </span>
                <span className="font-medium text-foreground">
                  R${' '}
                  {distanceKm
                    ? (PRICE_PER_KM[selected] * distanceKm).toFixed(2)
                    : '0.00'}
                </span>
              </div>
              {route.stops && route.stops.length > 0 && (
                <div className="flex justify-between mb-2">
                  <span className="text-muted-foreground">
                    Paradas extras ({route.stops.length}x R$ {STOP_SURCHARGE.toFixed(2)})
                  </span>
                  <span className="font-medium text-amber-600">
                    + R$ {(route.stops.length * STOP_SURCHARGE).toFixed(2)}
                  </span>
                </div>
              )}
              <div className="flex justify-between mb-3">
                <span className="text-muted-foreground">Desconto de cupom</span>
                <span className="font-medium text-foreground">R$ 0.00</span>
              </div>
              <div className="bg-gradient-to-r from-blue-600 to-cyan-500 rounded-xl py-3 px-5 flex items-center justify-between">
                <span className="text-white font-semibold">Preço total</span>
                <span className="text-white font-bold text-2xl">
                  R$ {selectedPrice.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Payment methods */}
            <h3 className="font-semibold text-foreground mb-3">
              Selecione o método de pagamento:
            </h3>
            <div className="flex flex-col divide-y divide-border">
              {['Pix', 'Dinheiro', 'Cartão'].map((method) => (
                <button
                  key={method}
                  type="button"
                  onClick={() => {
                    setPaymentMethod(method)
                    setShowPayment(false)
                  }}
                  className="flex items-center gap-3 py-3"
                >
                  <div className="w-8 h-8 bg-blue-500/10 rounded flex items-center justify-center text-blue-500">
                    <CreditCard className="w-4 h-4" />
                  </div>
                  <span className="flex-1 text-left font-medium text-foreground">
                    {method}
                  </span>
                  <div
                    className={`w-5 h-5 rounded-full border-2 ${
                      paymentMethod === method
                        ? 'border-blue-600 bg-blue-600'
                        : 'border-muted-foreground/30'
                    }`}
                  />
                </button>
              ))}
            </div>

            <button
              type="button"
              disabled={!paymentMethod}
              onClick={() => setShowPayment(false)}
              className={`w-full mt-6 py-4 rounded-xl font-semibold text-base transition-colors ${
                paymentMethod
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-secondary text-muted-foreground'
              }`}
            >
              Confirmar
            </button>
          </div>
        </div>
      )}

      {/* COUPON MODAL */}
      {showCoupon && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center">
          <div className="bg-card w-full max-w-md rounded-t-3xl px-6 pt-8 pb-8 animate-in slide-in-from-bottom">
            <div className="flex flex-col items-center mb-6">
              <Tag className="w-8 h-8 text-blue-500 mb-3" />
              <h2 className="text-xl font-bold text-foreground">
                Insira o cupom
              </h2>
              <p className="text-muted-foreground text-sm text-center mt-2">
                Insira o código do seu cupom para ser aplicado nos preços
              </p>
            </div>

            <div className="flex items-center gap-3 border-2 border-border rounded-xl px-4 py-3 mb-6 bg-secondary">
              <Tag className="w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Digite o código do cupom"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value)}
                className="flex-1 bg-transparent outline-none text-foreground placeholder:text-muted-foreground"
              />
            </div>

            <button
              type="button"
              disabled={!couponCode.trim()}
              onClick={() => setShowCoupon(false)}
              className={`w-full py-4 rounded-xl font-semibold text-base transition-colors ${
                couponCode.trim()
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-secondary text-muted-foreground'
              }`}
            >
              Aplicar
            </button>

            <button
              type="button"
              onClick={() => {
                setCouponCode('')
                setShowCoupon(false)
              }}
              className="w-full mt-3 text-center text-blue-600 font-medium py-2"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* PREFERENCES MODAL */}
      {showPreferences && (
        <div className="fixed inset-0 bg-card z-50 flex flex-col">
          <div className="flex items-center px-4 pt-4 pb-2">
            <button
              type="button"
              onClick={() => setShowPreferences(false)}
              className="w-10 h-10 flex items-center justify-center"
            >
              <X className="w-6 h-6 text-muted-foreground" />
            </button>
          </div>

          <div className="flex-1 px-6 pt-4">
            <div className="flex flex-col items-center mb-8">
              <SlidersHorizontal className="w-8 h-8 text-blue-500 mb-3" />
              <h2 className="text-xl font-bold text-foreground">
                Preferências de passeio
              </h2>
            </div>

            <div className="border-t border-border" />

            {/* Wait time */}
            <div className="flex items-center gap-4 py-5">
              <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center">
                <Clock className="w-6 h-6 text-blue-500" />
              </div>
              <div className="flex-1">
                <div className="font-medium text-foreground">
                  Tempo de espera
                </div>
              </div>
              <div className="flex items-center gap-1 text-muted-foreground">
                <span className="text-sm">{waitTime}</span>
                <ChevronDown className="w-4 h-4" />
              </div>
            </div>

            <div className="border-t border-border" />

            {/* Luggage */}
            <div className="flex items-center gap-4 py-5">
              <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center">
                <Briefcase className="w-6 h-6 text-blue-500" />
              </div>
              <div className="flex-1">
                <div className="font-medium text-foreground">Bagagem</div>
              </div>
              <button
                type="button"
                onClick={() => setHasLuggage(!hasLuggage)}
                className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-colors ${
                  hasLuggage
                    ? 'bg-blue-600 border-blue-600'
                    : 'border-blue-400 bg-card'
                }`}
              >
                {hasLuggage && (
                  <svg
                    className="w-4 h-4 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="3"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                )}
              </button>
            </div>

            <div className="border-t border-border" />

            {/* Pet */}
            <div className="flex items-center gap-4 py-5">
              <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center">
                <PawPrint className="w-6 h-6 text-blue-500" />
              </div>
              <div className="flex-1">
                <div className="font-medium text-foreground">Pet</div>
              </div>
              <button
                type="button"
                onClick={() => setHasPet(!hasPet)}
                className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-colors ${
                  hasPet
                    ? 'bg-blue-600 border-blue-600'
                    : 'border-blue-400 bg-card'
                }`}
              >
                {hasPet && (
                  <svg
                    className="w-4 h-4 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="3"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Apply button */}
          <div className="px-6 pb-6">
            <button
              type="button"
              onClick={() => setShowPreferences(false)}
              className="w-full py-4 rounded-xl bg-blue-600 text-white font-semibold text-base hover:bg-blue-700 transition-colors"
            >
              Aplicar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
