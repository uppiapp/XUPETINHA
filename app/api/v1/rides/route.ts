import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { rideRequestSchema } from '@/lib/validations/schemas'
import { successResponse, errorResponse, requireAuth, handleApiError } from '@/lib/api-utils'

export async function POST(request: Request) {
  try {
    const user = await requireAuth()
    const body = await request.json()

    const validation = rideRequestSchema.safeParse(body)
    if (!validation.success) {
      return errorResponse('Dados inválidos: ' + validation.error.errors[0].message)
    }

    const data = validation.data
    const supabase = await createClient()

    const { data: ride, error } = await supabase
      .from('rides')
      .insert({
        passenger_id: user.id,
        pickup_address: data.pickup_address,
        pickup_lat: data.pickup_lat,
        pickup_lng: data.pickup_lng,
        dropoff_address: data.dropoff_address,
        dropoff_lat: data.dropoff_lat,
        dropoff_lng: data.dropoff_lng,
        status: 'searching',
        payment_method: data.payment_method || 'pix',
        passenger_price_offer: data.passenger_price_offer,
        notes: data.notes || null,
        vehicle_type: data.vehicle_type || 'standard',
      })
      .select(`
        *,
        passenger:profiles!passenger_id(id, full_name, avatar_url, phone)
      `)
      .single()

    if (error) {
      console.error('[v0] Error creating ride:', error)
      return errorResponse('Erro ao criar corrida: ' + error.message, 500)
    }

    // Notificar motoristas próximos
    try {
      await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/v1/notifications/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'ride',
          title: 'Nova corrida disponível',
          body: `De ${data.pickup_address} para ${data.dropoff_address}`,
          ride_id: ride.id,
        }),
      })
    } catch (notifError) {
      console.error('[v0] Error sending notifications:', notifError)
    }

    return successResponse(ride, 'Corrida criada com sucesso')
  } catch (error) {
    return handleApiError(error)
  }
}

export async function GET(request: Request) {
  try {
    const user = await requireAuth()
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '10')

    const supabase = await createClient()

    let query = supabase
      .from('rides')
      .select(`
        *,
        passenger:profiles!passenger_id(id, full_name, avatar_url, phone),
        driver:profiles!driver_id(id, full_name, avatar_url, phone),
        driver_profile:driver_profiles!driver_id(rating, total_rides, vehicle_brand, vehicle_model, vehicle_color, vehicle_plate, vehicle_type)
      `)
      .eq('passenger_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    const { data: rides, error } = await query

    if (error) {
      console.error('[v0] Error fetching rides:', error)
      return errorResponse('Erro ao buscar corridas: ' + error.message, 500)
    }

    return successResponse(rides)
  } catch (error) {
    return handleApiError(error)
  }
}
