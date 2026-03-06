import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api/require-auth'

export async function POST(request: Request) {
  const { user, errorResponse } = await requireAuth()
  if (errorResponse) return errorResponse

  try {
    const body = await request.json()
    const { originLat, originLng, destLat, destLng } = body

    if (!originLat || !originLng || !destLat || !destLng) {
      return NextResponse.json({ error: 'Missing coordinates' }, { status: 400 })
    }

    const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

    if (apiKey) {
      // Use Google Distance Matrix API
      const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${originLat},${originLng}&destinations=${destLat},${destLng}&mode=driving&language=pt-BR&key=${apiKey}`
      const res = await fetch(url)
      const data = await res.json()

      if (data.rows?.[0]?.elements?.[0]?.status === 'OK') {
        const element = data.rows[0].elements[0]
        return NextResponse.json({
          distance: element.distance,
          duration: element.duration,
        })
      }
    }

    // Fallback: Haversine formula
    const R = 6371
    const dLat = ((destLat - originLat) * Math.PI) / 180
    const dLng = ((destLng - originLng) * Math.PI) / 180
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((originLat * Math.PI) / 180) *
        Math.cos((destLat * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    const distKm = R * c
    const durationMin = Math.round((distKm / 30) * 60)

    return NextResponse.json({
      distance: { value: Math.round(distKm * 1000), text: `${distKm.toFixed(1)} km` },
      duration: { value: durationMin * 60, text: `${durationMin} min` },
    })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
