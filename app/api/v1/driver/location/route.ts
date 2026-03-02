import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { apiLimiter } from '@/lib/utils/rate-limit'

/**
 * PATCH /api/v1/driver/location
 * Atualiza a localização GPS do motorista em tempo real.
 * Grava na tabela driver_locations — Supabase Realtime propaga ao passageiro.
 */
export async function PATCH(request: Request) {
  try {
    const identifier = request.headers.get('x-forwarded-for') || 'anonymous'
    const rlResult = apiLimiter.check(request, 60)
    if (!rlResult.success) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { latitude, longitude, heading, speed, accuracy, is_available } = body

    if (latitude === undefined || longitude === undefined) {
      return NextResponse.json({ error: 'latitude e longitude são obrigatórios' }, { status: 400 })
    }

    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return NextResponse.json({ error: 'Coordenadas inválidas' }, { status: 400 })
    }

    const now = new Date().toISOString()

    // Upsert na tabela driver_locations (usando colunas corretas: latitude, longitude)
    const { error } = await supabase
      .from('driver_locations')
      .upsert(
        {
          driver_id: user.id,
          latitude,
          longitude,
          heading: heading ?? 0,
          speed: speed ?? 0,
          accuracy: accuracy ?? 0,
          is_available: is_available !== undefined ? is_available : true,
          last_updated: now,
          updated_at: now,
        },
        { onConflict: 'driver_id' }
      )

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // Manter driver_profiles sincronizado
    await supabase
      .from('driver_profiles')
      .update({ current_lat: latitude, current_lng: longitude, updated_at: now })
      .eq('id', user.id)

    return NextResponse.json({ success: true, updated_at: now })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * GET /api/v1/driver/location
 * Retorna a localização atual do motorista.
 */
export async function GET(request: Request) {
  try {
    const rlResult = apiLimiter.check(request, 60)
    if (!rlResult.success) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const driver_id = searchParams.get('driver_id') || user.id

    const { data, error } = await supabase
      .from('driver_locations')
      .select('*')
      .eq('driver_id', driver_id)
      .single()

    if (error) {
      return NextResponse.json({ error: 'Localização não encontrada' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      driver_id: data.driver_id,
      location: { latitude: data.latitude, longitude: data.longitude },
      heading: data.heading,
      speed: data.speed,
      is_available: data.is_available,
      last_updated: data.last_updated,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
