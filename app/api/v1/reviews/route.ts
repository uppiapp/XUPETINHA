import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { apiLimiter, rateLimitResponse } from '@/lib/utils/rate-limit'

// POST - Criar ou atualizar review
export async function POST(request: Request) {
  try {
    const rlResult = apiLimiter.check(request, 10)
    if (!rlResult.success) return rateLimitResponse(rlResult)

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { ride_id, rating, comment, tags, review_type } = body

    // Buscar a corrida para validar
    const { data: ride } = await supabase
      .from('rides')
      .select('*, driver_id, passenger_id')
      .eq('id', ride_id)
      .single()

    if (!ride) {
      return NextResponse.json({ error: 'Ride not found' }, { status: 404 })
    }

    if (ride.status !== 'completed') {
      return NextResponse.json({ error: 'Can only review completed rides' }, { status: 400 })
    }

    const isPassenger = ride.passenger_id === user.id
    const isDriver = ride.driver_id === user.id

    if (!isPassenger && !isDriver) {
      return NextResponse.json({ error: 'Not authorized to review this ride' }, { status: 403 })
    }

    // Verificar se já existe review para esta corrida
    const { data: existingReview } = await supabase
      .from('driver_reviews')
      .select('*')
      .eq('ride_id', ride_id)
      .single()

    if (existingReview) {
      // Atualizar review existente
      const updateData: any = {}
      
      if (isPassenger && review_type === 'passenger_to_driver') {
        updateData.passenger_rating = rating
        updateData.passenger_comment = comment
        updateData.passenger_tags = tags || []
        updateData.passenger_reviewed_at = new Date().toISOString()
      } else if (isDriver && review_type === 'driver_to_passenger') {
        updateData.driver_rating = rating
        updateData.driver_comment = comment
        updateData.driver_tags = tags || []
        updateData.driver_reviewed_at = new Date().toISOString()
      }

      const { data, error } = await supabase
        .from('driver_reviews')
        .update(updateData)
        .eq('id', existingReview.id)
        .select()
        .single()

      if (error) throw error
      return NextResponse.json({ success: true, review: data })
    } else {
      // Criar novo review
      const newReview: any = {
        ride_id,
        driver_id: ride.driver_id,
        passenger_id: ride.passenger_id,
      }

      if (isPassenger && review_type === 'passenger_to_driver') {
        newReview.passenger_rating = rating
        newReview.passenger_comment = comment
        newReview.passenger_tags = tags || []
        newReview.passenger_reviewed_at = new Date().toISOString()
      } else if (isDriver && review_type === 'driver_to_passenger') {
        newReview.driver_rating = rating
        newReview.driver_comment = comment
        newReview.driver_tags = tags || []
        newReview.driver_reviewed_at = new Date().toISOString()
      }

      const { data, error } = await supabase
        .from('driver_reviews')
        .insert(newReview)
        .select()
        .single()

      if (error) throw error
      return NextResponse.json({ success: true, review: data })
    }
  } catch {
    return NextResponse.json({ error: 'Failed to create review' }, { status: 500 })
  }
}

// GET - Buscar reviews pendentes
export async function GET(request: Request) {
  try {
    const rlResult = apiLimiter.check(request, 20)
    if (!rlResult.success) return rateLimitResponse(rlResult)

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data, error } = await supabase.rpc('get_pending_reviews', {
      user_id_param: user.id
    })

    if (error) throw error

    return NextResponse.json({ pending_reviews: data || [] })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch reviews' }, { status: 500 })
  }
}
