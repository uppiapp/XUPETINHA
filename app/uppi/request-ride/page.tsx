'use client'

import React from "react"

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { iosToast } from '@/lib/utils/ios-toast'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import type { PaymentMethod, VehicleType } from '@/lib/types/database'
import { rideService } from '@/lib/services/ride-service'
import { optimizeRoute } from '@/lib/google-maps/route-optimizer'

function RequestRideContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const supabase = createClient()
  
  const [pickupAddress, setPickupAddress] = useState(searchParams.get('pickup') || '')
  const [dropoffAddress, setDropoffAddress] = useState(searchParams.get('dropoff') || '')
  const [vehicleType, setVehicleType] = useState<VehicleType>('economy')
  const [priceOffer, setPriceOffer] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)

  const estimatedDistance = 5.2
  const estimatedDuration = 15
  const suggestedPrice = 18.50

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        iosToast.error('Faça login para solicitar corrida')
        router.push('/auth/welcome')
        return
      }

      // Get coordinates from sessionStorage or use geolocation
      const pickupCoordsData = sessionStorage.getItem('userLocation')
      let pickupCoords = pickupCoordsData ? JSON.parse(pickupCoordsData) : null
      
      // If no cached location, get current position
      if (!pickupCoords) {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          if (!navigator.geolocation) {
            reject(new Error('Geolocation not supported'))
            return
          }
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 5000,
          })
        }).catch(() => null)
        
        if (position) {
          pickupCoords = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          }
        } else {
          // Fallback to São Paulo center
          pickupCoords = { lat: -23.5505, lng: -46.6333 }
        }
      }
      
      // Geocode dropoff address via Places Details API (place_id vem do searchParams)
      const placeId = searchParams.get('dropoff_place_id')
      let dropoffCoords = { lat: -23.5600, lng: -46.6500 } // fallback São Paulo

      if (placeId) {
        try {
          const geoRes = await fetch(`/api/v1/places/details?place_id=${encodeURIComponent(placeId)}`)
          if (geoRes.ok) {
            const geoData = await geoRes.json()
            const loc = geoData?.result?.geometry?.location
            if (loc) dropoffCoords = { lat: loc.lat, lng: loc.lng }
          }
        } catch {
          // mantém fallback — não bloqueia a corrida
        }
      } else if (dropoffAddress) {
        // Fallback: tentar geocoding por texto via API de geocode reversa não é ideal,
        // mas usa o endereço como referência se não tiver place_id
        try {
          const geoRes = await fetch('/api/v1/places/autocomplete?input=' + encodeURIComponent(dropoffAddress))
          if (geoRes.ok) {
            const geoData = await geoRes.json()
            const firstPid = geoData?.predictions?.[0]?.place_id
            if (firstPid) {
              const detailRes = await fetch(`/api/v1/places/details?place_id=${encodeURIComponent(firstPid)}`)
              if (detailRes.ok) {
                const detail = await detailRes.json()
                const loc = detail?.result?.geometry?.location
                if (loc) dropoffCoords = { lat: loc.lat, lng: loc.lng }
              }
            }
          }
        } catch {
          // mantém fallback
        }
      }

      const routeResult = await optimizeRoute(pickupCoords, dropoffCoords)
      const optimizedRoute = routeResult.recommended

      // Create ride with negotiation enabled
      const result = await rideService.createRideRequest({
        pickup_address: pickupAddress,
        pickup_lat: pickupCoords.lat,
        pickup_lng: pickupCoords.lng,
        dropoff_address: dropoffAddress,
        dropoff_lat: dropoffCoords.lat,
        dropoff_lng: dropoffCoords.lng,
        distance_km: optimizedRoute.distance,
        estimated_duration_minutes: optimizedRoute.duration,
        passenger_price_offer: parseFloat(priceOffer),
        payment_method: paymentMethod,
        vehicle_type: vehicleType,
        notes: notes || undefined,
      })

      if (!result.success || !result.ride) {
        iosToast.error(result.error || 'Erro ao criar solicitação')
        setLoading(false)
        return
      }

      // Redirect to offers page to see driver bids
      router.push(`/uppi/ride/${result.ride.id}/offers`)
    } catch {
      iosToast.error('Erro inesperado')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="h-dvh overflow-y-auto bg-background ios-scroll">
      {/* Header - iOS style */}
      <header className="bg-card/80 ios-blur-heavy border-b border-border/40 sticky top-0 z-30">
        <div className="px-4 pt-[calc(env(safe-area-inset-top)+0.75rem)] pb-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label="Voltar"
              onClick={() => router.back()}
              className="w-9 h-9 flex items-center justify-center rounded-full ios-press -ml-1"
            >
              <svg aria-hidden="true" className="w-6 h-6 text-[#007AFF]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-[34px] font-bold text-foreground tracking-[-0.8px] leading-[1.15]">Solicitar Corrida</h1>
          </div>
        </div>
      </header>

      <main className="px-4 py-5 pb-24 max-w-2xl mx-auto animate-ios-fade-up">
        {/* Route Info - iOS card */}
        <div className="bg-card ios-blur rounded-[20px] p-5 mb-4 shadow-[0_0_0_0.5px_rgba(0,0,0,0.04),0_2px_8px_rgba(0,0,0,0.04)] dark:shadow-[0_0_0_0.5px_rgba(255,255,255,0.04),0_2px_12px_rgba(0,0,0,0.3)] border-[0.5px] border-border/50">
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="flex flex-col items-center gap-2">
                <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
                <div className="w-0.5 h-12 bg-blue-300"></div>
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              </div>
              <div className="flex-1 space-y-6">
                <div>
                  <p className="text-sm text-blue-600 font-medium mb-1">Origem</p>
                  <p className="text-blue-900 font-semibold">{pickupAddress}</p>
                </div>
                <div>
                  <p className="text-sm text-blue-600 font-medium mb-1">Destino</p>
                  <p className="text-blue-900 font-semibold">{dropoffAddress}</p>
                </div>
              </div>
            </div>
            <div className="flex gap-6 pt-4 border-t border-blue-100">
              <div>
                <p className="text-sm text-blue-600">Distância</p>
                <p className="text-lg font-bold text-blue-900">{estimatedDistance} km</p>
              </div>
              <div>
                <p className="text-sm text-blue-600">Tempo estimado</p>
                <p className="text-lg font-bold text-blue-900">{estimatedDuration} min</p>
              </div>
            </div>
          </div>
        </div>

        {/* Vehicle Type Selection */}
        <form onSubmit={handleSubmit}>
          <div className="bg-card/80 ios-blur-heavy rounded-[20px] p-5 mb-4 shadow-[0_0_0_0.5px_rgba(0,0,0,0.04),0_2px_8px_rgba(0,0,0,0.04)] dark:shadow-[0_0_0_0.5px_rgba(255,255,255,0.04),0_2px_12px_rgba(0,0,0,0.3)] border-[0.5px] border-border/50 animate-ios-fade-up" style={{ animationDelay: '100ms' }}>
            <h2 className="text-[22px] font-bold text-foreground mb-4 tracking-[-0.5px]">Tipo de veículo</h2>
            <RadioGroup value={vehicleType} onValueChange={(value) => setVehicleType(value as VehicleType)}>
              <div className="flex items-center space-x-3 bg-[#FF9500]/10 dark:bg-[#FF9500]/15 p-4 rounded-[14px] border border-[#FF9500]/20 dark:border-[#FF9500]/30 mb-3 ios-press transition-all">
                <RadioGroupItem value="moto" id="moto" className="border-[#FF9500] text-[#FF9500]" />
                <Label htmlFor="moto" className="flex-1 cursor-pointer">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#FF9500]/20 flex items-center justify-center">
                        <svg className="w-5 h-5 text-[#FF9500]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                      </div>
                      <div>
                        <div className="font-semibold text-[17px] text-foreground tracking-[-0.4px]">Moto</div>
                        <div className="text-[13px] text-[#8E8E93] mt-0.5">Mais rápido e econômico</div>
                      </div>
                    </div>
                  </div>
                </Label>
              </div>
              <div className="flex items-center space-x-3 bg-[#007AFF]/10 dark:bg-[#007AFF]/15 p-4 rounded-[14px] border border-[#007AFF]/20 dark:border-[#007AFF]/30 mb-3 ios-press transition-all">
                <RadioGroupItem value="economy" id="economy" className="border-[#007AFF] text-[#007AFF]" />
                <Label htmlFor="economy" className="flex-1 cursor-pointer">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#007AFF]/20 flex items-center justify-center">
                        <svg className="w-5 h-5 text-[#007AFF]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                        </svg>
                      </div>
                      <div>
                        <div className="font-semibold text-[17px] text-foreground tracking-[-0.4px]">Economy</div>
                        <div className="text-[13px] text-[#8E8E93] mt-0.5">Carro básico confortável</div>
                      </div>
                    </div>
                  </div>
                </Label>
              </div>
              <div className="flex items-center space-x-3 bg-[#34C759]/10 dark:bg-[#34C759]/15 p-4 rounded-[14px] border border-[#34C759]/20 dark:border-[#34C759]/30 mb-3 ios-press transition-all">
                <RadioGroupItem value="electric" id="electric" className="border-[#34C759] text-[#34C759]" />
                <Label htmlFor="electric" className="flex-1 cursor-pointer">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#34C759]/20 flex items-center justify-center">
                        <svg className="w-5 h-5 text-[#34C759]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                      </div>
                      <div>
                        <div className="font-semibold text-[17px] text-foreground tracking-[-0.4px]">Elétrico</div>
                        <div className="text-[13px] text-[#8E8E93] mt-0.5">Carro elétrico silencioso</div>
                      </div>
                    </div>
                  </div>
                </Label>
              </div>
              <div className="flex items-center space-x-3 bg-[#AF52DE]/10 dark:bg-[#AF52DE]/15 p-4 rounded-[14px] border border-[#AF52DE]/20 dark:border-[#AF52DE]/30 ios-press transition-all">
                <RadioGroupItem value="premium" id="premium" className="border-[#AF52DE] text-[#AF52DE]" />
                <Label htmlFor="premium" className="flex-1 cursor-pointer">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#AF52DE]/20 flex items-center justify-center">
                        <svg className="w-5 h-5 text-[#AF52DE]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                        </svg>
                      </div>
                      <div>
                        <div className="font-semibold text-[17px] text-foreground tracking-[-0.4px]">Premium</div>
                        <div className="text-[13px] text-[#8E8E93] mt-0.5">Carro de luxo</div>
                      </div>
                    </div>
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="bg-card ios-blur rounded-[20px] p-5 mb-4 shadow-[0_0_0_0.5px_rgba(0,0,0,0.04),0_2px_8px_rgba(0,0,0,0.04)] dark:shadow-[0_0_0_0.5px_rgba(255,255,255,0.04),0_2px_12px_rgba(0,0,0,0.3)] border-[0.5px] border-border/50">
            <h2 className="text-lg font-bold text-blue-900 mb-4">Quanto você quer pagar?</h2>
            <div className="mb-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-between">
                  <span className="text-blue-700">Preço sugerido</span>
                  <span className="text-2xl font-bold text-blue-600">R$ {suggestedPrice.toFixed(2)}</span>
                </div>
              </div>
              <Label htmlFor="price" className="text-blue-900 mb-2 block">Sua oferta</Label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-700 font-semibold text-xl">R$</span>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  placeholder="0,00"
                  value={priceOffer}
                  onChange={(e) => setPriceOffer(e.target.value)}
                  required
                  className="pl-12 text-2xl font-bold border-blue-200 focus:border-blue-600 focus:ring-blue-600"
                />
              </div>
              <p className="text-sm text-blue-600 mt-2">
                Motoristas verão sua oferta e poderão fazer contra-ofertas
              </p>
            </div>
          </div>

          {/* Payment Method */}
          <div className="bg-card ios-blur rounded-[20px] p-5 mb-4 shadow-[0_0_0_0.5px_rgba(0,0,0,0.04),0_2px_8px_rgba(0,0,0,0.04)] dark:shadow-[0_0_0_0.5px_rgba(255,255,255,0.04),0_2px_12px_rgba(0,0,0,0.3)] border-[0.5px] border-border/50">
            <h2 className="text-lg font-bold text-blue-900 mb-4">Forma de pagamento</h2>
            <RadioGroup value={paymentMethod} onValueChange={(value) => setPaymentMethod(value as PaymentMethod)}>
              <div className="flex items-center space-x-3 bg-blue-50 p-4 rounded-lg border border-blue-200 mb-2">
                <RadioGroupItem value="cash" id="cash" className="border-blue-600 text-blue-600" />
                <Label htmlFor="cash" className="flex-1 cursor-pointer text-blue-900">
                  <div className="flex items-center gap-3">
                    <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <span>Dinheiro</span>
                  </div>
                </Label>
              </div>
              <div className="flex items-center space-x-3 bg-blue-50 p-4 rounded-lg border border-blue-200 mb-2">
                <RadioGroupItem value="pix" id="pix" className="border-blue-600 text-blue-600" />
                <Label htmlFor="pix" className="flex-1 cursor-pointer text-blue-900">
                  <div className="flex items-center gap-3">
                    <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M4.94 8.3a5.73 5.73 0 0 0 0 8.1l2.45 2.44c.85.86 2.23.86 3.09 0l2.54-2.54 2.54 2.54c.85.86 2.23.86 3.08 0l2.45-2.45a5.73 5.73 0 0 0 0-8.1l-2.45-2.44a2.18 2.18 0 0 0-3.08 0l-2.54 2.54-2.54-2.54a2.18 2.18 0 0 0-3.09 0zm13.11 1.42-2.45-2.45 2.45 2.45a3.55 3.55 0 0 1 0 5.02l-2.45 2.45 2.45-2.45a3.55 3.55 0 0 0 0-5.02z"/>
                    </svg>
                    <span>PIX</span>
                  </div>
                </Label>
              </div>
              <div className="flex items-center space-x-3 bg-blue-50 p-4 rounded-lg border border-blue-200">
                <RadioGroupItem value="credit_card" id="credit" className="border-blue-600 text-blue-600" />
                <Label htmlFor="credit" className="flex-1 cursor-pointer text-blue-900">
                  <div className="flex items-center gap-3">
                    <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                    <span>Cartão de Crédito</span>
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Notes */}
          <div className="bg-card ios-blur rounded-[20px] p-5 mb-4 shadow-[0_0_0_0.5px_rgba(0,0,0,0.04),0_2px_8px_rgba(0,0,0,0.04)] dark:shadow-[0_0_0_0.5px_rgba(255,255,255,0.04),0_2px_12px_rgba(0,0,0,0.3)] border-[0.5px] border-border/50">
            <Label htmlFor="notes" className="text-blue-900 mb-2 block">Observações (opcional)</Label>
            <Input
              id="notes"
              placeholder="Ex: Tenho bagagem, preciso de ar-condicionado..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="border-blue-200 focus:border-blue-600 focus:ring-blue-600"
            />
          </div>

          <Button 
            type="submit"
            disabled={loading || !priceOffer}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-6 text-lg"
          >
            {loading ? 'Criando solicitação...' : 'Solicitar Corrida'}
          </Button>
        </form>
      </main>
    </div>
  )
}

export default function RequestRidePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center">
        <div className="text-blue-600 text-lg">Carregando...</div>
      </div>
    }>
      <RequestRideContent />
    </Suspense>
  )
}
