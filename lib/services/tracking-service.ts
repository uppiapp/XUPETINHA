import { createClient } from '@/lib/supabase/client'

export interface DriverLocation {
  driver_id: string
  latitude: number
  longitude: number
  heading: number
  speed: number
  accuracy: number
  timestamp: string
}

export interface TrackingUpdate {
  ride_id: string
  status: 'pending' | 'negotiating' | 'accepted' | 'driver_arrived' | 'in_progress' | 'completed' | 'cancelled' | 'failed'
  driver_location?: DriverLocation
  eta_minutes?: number
  distance_to_pickup?: number
}

class TrackingService {
  private supabase = createClient()
  private watchId: number | null = null
  private updateInterval: NodeJS.Timeout | null = null

  // Inicia rastreamento GPS do motorista para uma corrida
  startDriverTracking(rideId: string, driverId: string) {
    if (!navigator.geolocation) return

    this.watchId = navigator.geolocation.watchPosition(
      async (position) => {
        const location: DriverLocation = {
          driver_id: driverId,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          heading: position.coords.heading || 0,
          speed: position.coords.speed || 0,
          accuracy: position.coords.accuracy,
          timestamp: new Date().toISOString(),
        }
        await this.updateDriverLocation(rideId, location)
      },
      (_err) => {},
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    )

    // Fallback a cada 5 segundos
    this.updateInterval = setInterval(() => {
      navigator.geolocation.getCurrentPosition(async (position) => {
        const location: DriverLocation = {
          driver_id: driverId,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          heading: position.coords.heading || 0,
          speed: position.coords.speed || 0,
          accuracy: position.coords.accuracy,
          timestamp: new Date().toISOString(),
        }
        await this.updateDriverLocation(rideId, location)
      })
    }, 5000)
  }

  stopTracking() {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId)
      this.watchId = null
    }
    if (this.updateInterval) {
      clearInterval(this.updateInterval)
      this.updateInterval = null
    }
  }

  // Grava localização via API (evita problema de RLS no client-side)
  private async updateDriverLocation(rideId: string, location: DriverLocation) {
    try {
      // 1. Upsert em driver_locations com colunas corretas (latitude, longitude)
      await this.supabase
        .from('driver_locations')
        .upsert(
          {
            driver_id: location.driver_id,
            latitude: location.latitude,
            longitude: location.longitude,
            heading: location.heading,
            speed: location.speed,
            accuracy: location.accuracy,
            last_updated: location.timestamp,
            updated_at: location.timestamp,
            is_available: true,
          },
          { onConflict: 'driver_id' }
        )

      // 2. Inserir ponto no histórico de ride_tracking
      if (rideId) {
        await this.supabase.from('ride_tracking').insert({
          ride_id: rideId,
          driver_id: location.driver_id,
          latitude: location.latitude,
          longitude: location.longitude,
          heading: location.heading,
          speed: location.speed,
          accuracy: location.accuracy,
          timestamp: location.timestamp,
        })
      }
    } catch (_) {}
  }

  // Assina atualizações de corrida para o passageiro
  subscribeToRideUpdates(
    rideId: string,
    onUpdate: (update: TrackingUpdate) => void
  ) {
    // Assina mudanças de status da corrida
    const rideChannel = this.supabase
      .channel(`ride-status:${rideId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'rides', filter: `id=eq.${rideId}` },
        (payload) => {
          onUpdate({ ride_id: rideId, status: payload.new.status })
        }
      )
      .subscribe()

    // Assina atualizações de localização do motorista via driver_id
    const locationChannel = this.supabase
      .channel(`driver-loc:${rideId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'driver_locations' },
        (payload) => {
          if (payload.new) {
            onUpdate({
              ride_id: rideId,
              status: 'in_progress',
              driver_location: {
                driver_id: payload.new.driver_id,
                latitude: payload.new.latitude,
                longitude: payload.new.longitude,
                heading: payload.new.heading ?? 0,
                speed: payload.new.speed ?? 0,
                accuracy: payload.new.accuracy ?? 0,
                timestamp: payload.new.last_updated,
              },
            })
          }
        }
      )
      .subscribe()

    return () => {
      this.supabase.removeChannel(rideChannel)
      this.supabase.removeChannel(locationChannel)
    }
  }

  // Assina atualizações de ofertas de preço (para o passageiro ver negociação)
  subscribeToPriceOffers(
    rideId: string,
    onOffer: (offer: any) => void
  ) {
    const channel = this.supabase
      .channel(`price-offers:${rideId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'price_offers', filter: `ride_id=eq.${rideId}` },
        (payload) => onOffer(payload.new)
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'price_offers', filter: `ride_id=eq.${rideId}` },
        (payload) => onOffer(payload.new)
      )
      .subscribe()

    return () => this.supabase.removeChannel(channel)
  }

  // Calcula ETA via Google Maps Directions API
  async calculateETA(
    currentLat: number,
    currentLng: number,
    destLat: number,
    destLng: number
  ): Promise<number> {
    if (typeof window === 'undefined' || !window.google) return 0

    return new Promise((resolve) => {
      const directionsService = new window.google.maps.DirectionsService()
      directionsService.route(
        {
          origin: { lat: currentLat, lng: currentLng },
          destination: { lat: destLat, lng: destLng },
          travelMode: window.google.maps.TravelMode.DRIVING,
        },
        (response: any, status: any) => {
          if (status === 'OK' && response) {
            resolve(Math.ceil(response.routes[0].legs[0].duration.value / 60))
          } else {
            resolve(0)
          }
        }
      )
    })
  }

  // Atualiza status da corrida via API route
  async updateRideStatus(
    rideId: string,
    status: TrackingUpdate['status'],
    cancellation_reason?: string
  ) {
    try {
      const res = await fetch(`/api/v1/rides/${rideId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, cancellation_reason }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        return { success: false, error: err?.error || 'Erro ao atualizar status' }
      }
      return { success: true }
    } catch (error: any) {
      return { success: false, error: error?.message || 'Erro de rede' }
    }
  }
}

export const trackingService = new TrackingService()
