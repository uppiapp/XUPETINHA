import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { apiLimiter, rateLimitResponse } from '@/lib/utils/rate-limit'

/**
 * GET /api/v1/drivers/hot-zones
 * Retorna zonas quentes do banco de dados (reais), filtrando pelo raio do motorista.
 */
export async function GET(request: Request) {
  try {
    const rlResult = apiLimiter.check(request, 15)
    if (!rlResult.success) return rateLimitResponse(rlResult)

    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const lat = parseFloat(searchParams.get('lat') || '0')
    const lng = parseFloat(searchParams.get('lng') || '0')
    const radiusKm = parseFloat(searchParams.get('radius') || '30')

    // Buscar todas as zonas quentes ativas do banco
    const { data: zones, error } = await supabase
      .from('hot_zones')
      .select('*')
      .eq('is_active', true)
      .order('danger_level', { ascending: false })

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch hot zones' }, { status: 500 })
    }

    // Se lat/lng fornecidos, filtrar pelo raio
    let filtered = zones || []
    if (lat && lng && filtered.length > 0) {
      const R = 6371
      filtered = filtered
        .map((zone: any) => {
          const dLat = ((zone.latitude - lat) * Math.PI) / 180
          const dLng = ((zone.longitude - lng) * Math.PI) / 180
          const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos((lat * Math.PI) / 180) *
              Math.cos((zone.latitude * Math.PI) / 180) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2)
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
          return { ...zone, distance_km: R * c }
        })
        .filter((z: any) => z.distance_km <= radiusKm)
    }

    return NextResponse.json({ success: true, hotZones: filtered, count: filtered.length })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
