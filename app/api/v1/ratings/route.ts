import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { ride_id, rating, comment, reviewed_id, tags, category_ratings, is_anonymous } = body

    if (!ride_id || !rating || !reviewed_id) {
      return NextResponse.json({ error: 'ride_id, rating e reviewed_id são obrigatórios' }, { status: 400 })
    }

    if (rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Avaliação deve ser entre 1 e 5' }, { status: 400 })
    }

    // Verificar se a corrida existe e pertence ao usuário
    const { data: ride } = await supabase
      .from('rides')
      .select('id, passenger_id, driver_id, status')
      .eq('id', ride_id)
      .single()

    if (!ride) {
      return NextResponse.json({ error: 'Corrida não encontrada' }, { status: 404 })
    }

    if (ride.passenger_id !== user.id && ride.driver_id !== user.id) {
      return NextResponse.json({ error: 'Você não participou desta corrida' }, { status: 403 })
    }

    // Verificar se já avaliou
    const { data: existing } = await supabase
      .from('ratings')
      .select('id')
      .eq('ride_id', ride_id)
      .eq('rater_id', user.id)
      .single()

    if (existing) {
      return NextResponse.json({ error: 'Você já avaliou esta corrida' }, { status: 409 })
    }

    // Criar avaliação
    const { data: newRating, error } = await supabase
      .from('ratings')
      .insert({
        ride_id,
        score: rating,
        rating,
        comment: comment || null,
        rater_id: user.id,
        rated_id: reviewed_id,
        reviewer_id: user.id,
        reviewed_id,
        tags: tags || [],
        category_ratings: category_ratings || null,
        is_anonymous: is_anonymous || false,
      })
      .select()
      .single()

    if (error) throw error

    // Atualizar rating médio do avaliado via função SQL
    await supabase.rpc('update_user_rating', { p_user_id: reviewed_id })

    // Atualizar rating do driver_profile se necessário
    if (ride.driver_id === reviewed_id) {
      const { data: ratings } = await supabase
        .from('ratings')
        .select('score')
        .eq('rated_id', reviewed_id)

      if (ratings && ratings.length > 0) {
        const avg = ratings.reduce((sum: number, r: any) => sum + r.score, 0) / ratings.length
        await supabase
          .from('driver_profiles')
          .update({ rating: Number(avg.toFixed(2)) })
          .eq('id', reviewed_id)
      }
    }

    return NextResponse.json({ success: true, rating: newRating })
  } catch (error) {
    console.error('[v0] Error creating rating:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('user_id')

    if (!userId) {
      return NextResponse.json({ error: 'user_id é obrigatório' }, { status: 400 })
    }

    const { data: ratings, error } = await supabase
      .from('ratings')
      .select(`
        *,
        reviewer:profiles!reviewer_id(id, full_name, avatar_url),
        ride:rides!ride_id(id, pickup_address, dropoff_address, created_at)
      `)
      .eq('reviewed_id', userId)
      .order('created_at', { ascending: false })

    if (error) throw error

    // Calcular média
    const avg = ratings && ratings.length > 0
      ? ratings.reduce((sum: number, r: any) => sum + (r.score || r.rating || 0), 0) / ratings.length
      : null

    return NextResponse.json({
      success: true,
      ratings: ratings || [],
      average: avg ? Number(avg.toFixed(2)) : null,
      count: ratings?.length || 0,
    })
  } catch (error) {
    console.error('[v0] Error fetching ratings:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
