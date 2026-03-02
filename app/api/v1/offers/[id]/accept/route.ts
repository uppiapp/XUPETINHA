import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: offerId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Buscar a oferta com dados da corrida
    const { data: offer, error: offerError } = await supabase
      .from('price_offers')
      .select('*, ride:rides(id, passenger_id, driver_id, status)')
      .eq('id', offerId)
      .single()

    if (offerError || !offer) {
      return NextResponse.json({ error: 'Oferta não encontrada' }, { status: 404 })
    }

    const ride = offer.ride as any
    if (!ride) {
      return NextResponse.json({ error: 'Corrida não encontrada' }, { status: 404 })
    }

    // Verificar se a corrida ainda está disponível
    if (!['pending', 'negotiating'].includes(ride.status)) {
      return NextResponse.json({ error: 'Corrida não está mais disponível' }, { status: 409 })
    }

    // Quem pode aceitar:
    // 1. Passageiro — aceita a oferta de um motorista
    // 2. Motorista — aceita pelo preço sugerido pelo passageiro (self-accept)
    const isPassenger = ride.passenger_id === user.id
    const isDriver = offer.driver_id === user.id

    if (!isPassenger && !isDriver) {
      return NextResponse.json({ error: 'Sem permissão para aceitar esta oferta' }, { status: 403 })
    }

    // Atualizar esta oferta para aceita
    const { error: acceptError } = await supabase
      .from('price_offers')
      .update({ status: 'accepted', updated_at: new Date().toISOString() })
      .eq('id', offerId)

    if (acceptError) {
      return NextResponse.json({ error: acceptError.message }, { status: 500 })
    }

    // Rejeitar todas as outras ofertas da mesma corrida
    await supabase
      .from('price_offers')
      .update({ status: 'rejected', updated_at: new Date().toISOString() })
      .eq('ride_id', offer.ride_id)
      .neq('id', offerId)

    // Atualizar corrida: atribuir motorista, preço final e status aceito
    const { error: rideError } = await supabase
      .from('rides')
      .update({
        driver_id: offer.driver_id,
        final_price: offer.offered_price,
        status: 'accepted',
        updated_at: new Date().toISOString(),
      })
      .eq('id', offer.ride_id)

    if (rideError) {
      return NextResponse.json({ error: rideError.message }, { status: 500 })
    }

    // Notificar a outra parte
    try {
      const notifyUserId = isPassenger ? offer.driver_id : ride.passenger_id
      const title = isPassenger ? 'Oferta aceita!' : 'Corrida aceita!'
      const message = isPassenger
        ? `Sua oferta de R$ ${Number(offer.offered_price).toFixed(2)} foi aceita. Dirija-se ao passageiro.`
        : `O passageiro confirmou. Dirija-se ao local de embarque.`

      await supabase.from('notifications').insert({
        user_id: notifyUserId,
        type: 'offer',
        title,
        message,
        data: { ride_id: offer.ride_id, offer_id: offerId },
        read: false,
      })
    } catch (_) {}

    return NextResponse.json({ success: true, ride_id: offer.ride_id })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
