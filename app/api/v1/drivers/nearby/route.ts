import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { apiLimiter, rateLimitResponse } from '@/lib/utils/rate-limit'

/**
 * GET /api/v1/drivers/nearby
 * Retorna motoristas disponíveis próximos ao ponto de pickup.
 * Usa cálculo de distância via Haversine diretamente no Postgres sem PostGIS.
 */
export async function GET(request: Request) {
  try {
    const rlResult = apiLimiter.check(request, 20)
    if (!rlResult.success) return rateLimitResponse(rlResult)

    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const lat = parseFloat(searchParams.get('lat') || '0')
    const lng = parseFloat(searchParams.get('lng') || '0')
    const radiusKm = parseFloat(searchParams.get('radius') || '5')
    const vehicleType = searchParams.get('vehicle_type') || null

    if (!lat || !lng) {
      return NextResponse.json({ error: 'Missing lat/lng parameters' }, { status: 400 })
    }

    // Buscar motoristas disponíveis com suas localizações
    let query = supabase
      .from('driver_locations')
      .select(`
        driver_id,
        latitude,
        longitude,
        heading,
        speed,
        last_updated,
        driver:profiles!driver_id(id, full_name, avatar_url, phone),
        driver_profile:driver_profiles!driver_id(
          vehicle_brand, vehicle_model, vehicle_plate, vehicle_color, vehicle_type,
          rating, total_rides, is_verified, is_available
        )
      `)
      .eq('is_available', true)

    const { data: locations, error } = await query

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch drivers' }, { status: 500 })
    }

    // Filtrar por raio e tipo de veículo (Haversine client-side já que não temos PostGIS)
    const R = 6371 // raio da terra em km
    const nearbyDrivers = (locations || [])
      .map((loc: any) => {
        const dLat = ((loc.latitude - lat) * Math.PI) / 180
        const dLng = ((loc.longitude - lng) * Math.PI) / 180
        const a =
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos((lat * Math.PI) / 180) *
            Math.cos((loc.latitude * Math.PI) / 180) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2)
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
        const distance_km = R * c
        return { ...loc, distance_km: Math.round(distance_km * 10) / 10 }
      })
      .filter((loc: any) => {
        if (loc.distance_km > radiusKm) return false
        if (vehicleType && loc.driver_profile?.vehicle_type !== vehicleType) return false
        if (!loc.driver_profile?.is_verified) return false
        return true
      })
      .sort((a: any, b: any) => a.distance_km - b.distance_km)
      .slice(0, 20)

    return NextResponse.json({
      success: true,
      drivers: nearbyDrivers,
      count: nearbyDrivers.length,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
