import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { sendRideReportEmail } from '@/lib/email'

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const { status } = await request.json()

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })
    }

    // Validate status
    const validStatuses = ['pending', 'accepted', 'started', 'completed', 'cancelled']
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Status invalido' }, { status: 400 })
    }

    // Timestamps adicionais por status
    const extra: Record<string, string | null> = {}
    if (status === 'started')   extra.started_at   = new Date().toISOString()
    if (status === 'completed') extra.completed_at  = new Date().toISOString()
    if (status === 'cancelled') extra.cancelled_at  = new Date().toISOString()

    // Update ride status
    const { data: ride, error } = await supabase
      .from('rides')
      .update({ status, updated_at: new Date().toISOString(), ...extra })
      .eq('id', params.id)
      .select()
      .single()

    if (error) throw error

    // Notificar o outro usuario
    const notifyUserId = ['started', 'completed'].includes(status)
      ? ride.passenger_id
      : ride.driver_id

    if (notifyUserId) {
      await supabase.from('notifications').insert({
        user_id: notifyUserId,
        type: 'ride',
        title: getStatusTitle(status),
        message: getStatusMessage(status),
        ride_id: params.id,
        read: false
      })
    }

    // Ao concluir a corrida: enviar relatorio completo por email ao passageiro
    if (status === 'completed') {
      try {
        const { data: fullRide } = await supabase
          .from('rides')
          .select(`
            id, pickup_address, dropoff_address, distance_km,
            estimated_duration_minutes, final_price, payment_method,
            started_at, completed_at,
            passenger:profiles!passenger_id(full_name, email),
            driver:profiles!driver_id(
              full_name,
              driver_profile:driver_profiles!id(vehicle_brand, vehicle_model, vehicle_plate, vehicle_color)
            )
          `)
          .eq('id', params.id)
          .single()

        if (fullRide) {
          const passenger = fullRide.passenger as any
          const driver = fullRide.driver as any
          const dp = driver?.driver_profile as any

          if (passenger?.email) {
            const durationMinutes = fullRide.started_at && fullRide.completed_at
              ? Math.round((new Date(fullRide.completed_at).getTime() - new Date(fullRide.started_at).getTime()) / 60000)
              : fullRide.estimated_duration_minutes || 0

            await sendRideReportEmail({
              rideId: fullRide.id,
              passengerName: passenger.full_name || 'Passageiro',
              passengerEmail: passenger.email,
              driverName: driver?.full_name || 'Motorista',
              vehicleBrand: dp?.vehicle_brand || 'Veiculo',
              vehicleModel: dp?.vehicle_model || '',
              vehiclePlate: dp?.vehicle_plate || '—',
              vehicleColor: dp?.vehicle_color || '',
              pickupAddress: fullRide.pickup_address,
              dropoffAddress: fullRide.dropoff_address,
              distanceKm: fullRide.distance_km || 0,
              durationMinutes,
              finalPrice: fullRide.final_price || 0,
              paymentMethod: fullRide.payment_method || 'pix',
              startedAt: fullRide.started_at || fullRide.completed_at || new Date().toISOString(),
              completedAt: fullRide.completed_at || new Date().toISOString(),
            })
          }
        }
      } catch (emailErr) {
        // Email nao bloqueia a atualizacao de status
        console.error('[v0] Erro ao enviar relatorio de corrida:', emailErr)
      }
    }

    return NextResponse.json(ride)

  } catch (error) {
    console.error('[v0] Error updating ride status:', error)
    return NextResponse.json(
      { error: 'Erro ao atualizar status da corrida' },
      { status: 500 }
    )
  }
}

function getStatusTitle(status: string): string {
  const titles: Record<string, string> = {
    accepted: 'Corrida aceita',
    started: 'Corrida iniciada',
    completed: 'Corrida finalizada',
    cancelled: 'Corrida cancelada'
  }
  return titles[status] || 'Atualizacao de corrida'
}

function getStatusMessage(status: string): string {
  const messages: Record<string, string> = {
    accepted: 'Sua corrida foi aceita! O motorista esta a caminho.',
    started: 'O motorista iniciou a corrida.',
    completed: 'Sua corrida foi finalizada. Avalie sua experiencia!',
    cancelled: 'A corrida foi cancelada.'
  }
  return messages[status] || 'O status da sua corrida foi atualizado'
}

