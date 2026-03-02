import { createClient } from '@/lib/supabase/client'

export interface DriverLocation {
  driver_id: string
  lat: number
  lng: number
  heading: number
  speed: number
  accuracy: number
  timestamp: string
}

export interface TrackingUpdate {
  ride_id: string
  status: 'pending' | 'accepted' | 'driver_arriving' | 'arrived' | 'in_progress' | 'completed' | 'cancelled'
  driver_location?: DriverLocation
  eta_minutes?: number
  distance_to_pickup?: number
}

class TrackingService {
  private supabase = createClient()
  private watchId: number | null = null
  private updateInterval: NodeJS.Timeout | null = null

  // Start tracking driver location (for driver app)
  startDriverTracking(rideId: string, driverId: string) {
    console.log('[v0] Starting driver GPS tracking for ride:', rideId)

    if (!navigator.geolocation) {
      console.error('[v0] Geolocation not supported')
      return
    }

    // Watch position with high accuracy
    this.watchId = navigator.geolocation.watchPosition(
      async (position) => {
        const location: DriverLocation = {
          driver_id: driverId,
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          heading: position.coords.heading || 0,
          speed: position.coords.speed || 0,
          accuracy: position.coords.accuracy,
          timestamp: new Date().toISOString(),
        }

        console.log('[v0] Driver location update:', location)

        // Update location in database
        await this.updateDriverLocation(rideId, location)
      },
      (error) => {
        console.error('[v0] Geolocation error:', error)
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 10000,
      }
    )

    // Also update every 5 seconds even if position hasn't changed
    this.updateInterval = setInterval(() => {
      navigator.geolocation.getCurrentPosition(async (position) => {
        const location: DriverLocation = {
          driver_id: driverId,
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          heading: position.coords.heading || 0,
          speed: position.coords.speed || 0,
          accuracy: position.coords.accuracy,
          timestamp: new Date().toISOString(),
        }
        await this.updateDriverLocation(rideId, location)
      })
    }, 5000)
  }

  // Stop tracking
  stopTracking() {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId)
      this.watchId = null
    }
    if (this.updateInterval) {
      clearInterval(this.updateInterval)
      this.updateInterval = null
    }
    console.log('[v0] Tracking stopped')
  }

  // Update driver location in database
  private async updateDriverLocation(rideId: string, location: DriverLocation) {
    try {
      const { error } = await this.supabase
        .from('driver_locations')
        .upsert({
          driver_id: location.driver_id,
          ride_id: rideId,
          lat: location.lat,
          lng: location.lng,
          heading: location.heading,
          speed: location.speed,
          accuracy: location.accuracy,
          updated_at: location.timestamp,
        })

      if (error) {
        console.error('[v0] Error updating driver location:', error)
      }
    } catch (error) {
      console.error('[v0] Exception updating location:', error)
    }
  }

  // Subscribe to ride updates (for passenger app)
  subscribeToRideUpdates(
    rideId: string,
    onUpdate: (update: TrackingUpdate) => void
  ) {
    console.log('[v0] Subscribing to ride updates:', rideId)

    // Subscribe to ride status changes
    const rideChannel = this.supabase
      .channel(`ride:${rideId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'rides',
          filter: `id=eq.${rideId}`,
        },
        (payload) => {
          console.log('[v0] Ride status update:', payload.new)
          onUpdate({
            ride_id: rideId,
            status: payload.new.status,
            eta_minutes: payload.new.eta_minutes,
          })
        }
      )
      .subscribe()

    // Subscribe to driver location updates
    const locationChannel = this.supabase
      .channel(`driver_location:${rideId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'driver_locations',
          filter: `ride_id=eq.${rideId}`,
        },
        (payload) => {
          console.log('[v0] Driver location update:', payload.new)
          if (payload.new) {
            onUpdate({
              ride_id: rideId,
              status: 'in_progress',
              driver_location: {
                driver_id: payload.new.driver_id,
                lat: payload.new.lat,
                lng: payload.new.lng,
                heading: payload.new.heading,
                speed: payload.new.speed,
                accuracy: payload.new.accuracy,
                timestamp: payload.new.updated_at,
              },
            })
          }
        }
      )
      .subscribe()

    // Return cleanup function
    return () => {
      console.log('[v0] Unsubscribing from ride updates')
      this.supabase.removeChannel(rideChannel)
      this.supabase.removeChannel(locationChannel)
    }
  }

  // Calculate ETA based on current location and destination
  async calculateETA(
    currentLat: number,
    currentLng: number,
    destLat: number,
    destLng: number
  ): Promise<number> {
    if (!window.google) return 0

    return new Promise((resolve) => {
      const directionsService = new window.google.maps.DirectionsService()
      
      directionsService.route(
        {
          origin: { lat: currentLat, lng: currentLng },
          destination: { lat: destLat, lng: destLng },
          travelMode: window.google.maps.TravelMode.DRIVING,
        },
        (response, status) => {
          if (status === 'OK' && response) {
            const durationMinutes = Math.ceil(response.routes[0].legs[0].duration.value / 60)
            resolve(durationMinutes)
          } else {
            resolve(0)
          }
        }
      )
    })
  }

  // Update ride status — chama a API route para garantir disparo de email ao completar
  async updateRideStatus(
    rideId: string,
    status: TrackingUpdate['status'],
    etaMinutes?: number
  ) {
    try {
      const body: any = { status }
      if (etaMinutes) body.eta_minutes = etaMinutes

      const res = await fetch(`/api/v1/rides/${rideId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
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
