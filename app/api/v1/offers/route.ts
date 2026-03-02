import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { offerLimiter, apiLimiter, rateLimitResponse } from '@/lib/utils/rate-limit'

export async function POST(request: Request) {
  try {
    const rlResult = offerLimiter.check(request, 5)
    if (!rlResult.success) return rateLimitResponse(rlResult)

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { ride_id, offered_price, estimated_arrival_minutes, message } = body

    // Verificar se o usuário é motorista ativo
    const { data: driver } = await supabase
      .from('driver_profiles')
      .select('id, is_verified, is_available, vehicle_type, vehicle_brand, vehicle_model, vehicle_plate')
      .eq('id', user.id)
      .single()

    if (!driver) {
      return NextResponse.json({ error: 'Motorista não encontrado' }, { status: 403 })
    }

    if (!driver.is_verified) {
      return NextResponse.json({ error: 'Apenas motoristas verificados podem fazer ofertas' }, { status: 403 })
    }

    // Expiração em 5 minutos
    const expiresAt = new Date()
    expiresAt.setMinutes(expiresAt.getMinutes() + 5)

    // Criar oferta em ride_offers
    const { data: offer, error } = await supabase
      .from('ride_offers')
      .insert({
        ride_id,
        driver_id: user.id,
        offered_price: offered_price || 0,
        eta_minutes: estimated_arrival_minutes || 5,
        message,
        status: 'pending',
      })
      .select(`
        *,
        driver:profiles!driver_id(id, full_name, avatar_url, phone),
        driver_profile:driver_profiles!driver_id(rating, total_rides, vehicle_brand, vehicle_model, vehicle_color, vehicle_plate, vehicle_type)
      `)
      .single()

    if (error) {
      console.error('[v0] Error creating offer:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Notificar passageiro
    try {
      const { data: ride } = await supabase
        .from('rides')
        .select('passenger_id')
        .eq('id', ride_id)
        .single()

      if (ride) {
        await supabase.from('notifications').insert({
          user_id: ride.passenger_id,
          type: 'offer',
          title: 'Nova oferta recebida',
          body: `Oferta de R$ ${Number(offered_price).toFixed(2)} de ${driver.vehicle_brand} ${driver.vehicle_model}`,
          data: { ride_id, offer_id: offer.id },
          is_read: false,
        })
      }
    } catch (notifError) {
      console.error('[v0] Error sending notification:', notifError)
    }

    return NextResponse.json({ success: true, offer })
  } catch (error) {
    console.error('[v0] API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: Request) {
  try {
    const rlResult = apiLimiter.check(request, 30)
    if (!rlResult.success) return rateLimitResponse(rlResult)

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const ride_id = searchParams.get('ride_id')

    if (!ride_id) {
      return NextResponse.json({ error: 'ride_id é obrigatório' }, { status: 400 })
    }

    const { data: offers, error } = await supabase
      .from('ride_offers')
      .select(`
        *,
        driver:profiles!driver_id(id, full_name, avatar_url, phone),
        driver_profile:driver_profiles!driver_id(rating, total_rides, vehicle_brand, vehicle_model, vehicle_color, vehicle_plate, vehicle_type, vehicle_year)
      `)
      .eq('ride_id', ride_id)
      .in('status', ['pending', 'accepted'])
      .order('offered_price', { ascending: true })

    if (error) {
      console.error('[v0] Error fetching offers:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      offers: offers || [],
      count: offers?.length || 0,
    })
  } catch (error) {
    console.error('[v0] API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
