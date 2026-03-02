import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { sendRideReportEmail } from '@/lib/email'

export async function POST(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()

    // Verificar admin
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })

    const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
    if (!profile?.is_admin) return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })

    // Buscar dados completos da corrida
    const { data: ride, error: rideError } = await supabase
      .from('rides')
      .select(`
        id, pickup_address, dropoff_address, distance_km,
        estimated_duration_minutes, final_price, payment_method,
        started_at, completed_at, passenger_id, driver_id, status,
        passenger:profiles!passenger_id(full_name, email),
        driver:profiles!driver_id(
          full_name,
          driver_profile:driver_profiles!id(vehicle_brand, vehicle_model, vehicle_plate, vehicle_color)
        )
      `)
      .eq('id', params.id)
      .single()

    if (rideError || !ride) {
      return NextResponse.json({ error: 'Corrida nao encontrada' }, { status: 404 })
    }

    const passenger = ride.passenger as any
    const driver = ride.driver as any
    const dp = driver?.driver_profile as any

    if (!passenger?.email) {
      return NextResponse.json({ error: 'Passageiro sem email cadastrado' }, { status: 400 })
    }

    // Calcular duracao
    let durationMinutes = ride.estimated_duration_minutes || 0
    if (ride.started_at && ride.completed_at) {
      durationMinutes = Math.round(
        (new Date(ride.completed_at).getTime() - new Date(ride.started_at).getTime()) / 60000
      )
    }

    const sent = await sendRideReportEmail({
      rideId: ride.id,
      passengerName: passenger.full_name || 'Passageiro',
      passengerEmail: passenger.email,
      driverName: driver?.full_name || 'Motorista',
      vehicleBrand: dp?.vehicle_brand || 'Veiculo',
      vehicleModel: dp?.vehicle_model || '',
      vehiclePlate: dp?.vehicle_plate || '—',
      vehicleColor: dp?.vehicle_color || '',
      pickupAddress: ride.pickup_address,
      dropoffAddress: ride.dropoff_address,
      distanceKm: ride.distance_km || 0,
      durationMinutes,
      finalPrice: ride.final_price || 0,
      paymentMethod: ride.payment_method || 'pix',
      startedAt: ride.started_at || ride.completed_at || new Date().toISOString(),
      completedAt: ride.completed_at || new Date().toISOString(),
    })

    if (!sent) {
      return NextResponse.json({ error: 'Falha ao enviar email. Verifique a RESEND_API_KEY.' }, { status: 500 })
    }

    return NextResponse.json({ success: true, sentTo: passenger.email })

  } catch (error) {
    console.error('[v0] ride report error:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
