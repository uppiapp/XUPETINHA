import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { type, ride_id, location_lat, location_lng, location_address, description, audio_url } = body

    // Create emergency alert
    const { data: alert, error } = await supabase
      .from('emergency_alerts')
      .insert({
        user_id: user.id,
        ride_id: ride_id || null,
        type: type || 'sos',
        location_lat,
        location_lng,
        location_address,
        description,
        audio_url,
      })
      .select()
      .single()

    if (error) throw error

    // Get emergency contacts
    const { data: contacts } = await supabase
      .from('emergency_contacts')
      .select('*')
      .eq('user_id', user.id)

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, phone')
      .eq('id', user.id)
      .single()

    // In production, send SMS to emergency contacts here
    // For now, we'll just log and create notifications
    if (contacts && contacts.length > 0) {
      const notificationPromises = contacts.map((contact) => 
        supabase.from('notifications').insert({
          user_id: user.id,
          title: '🚨 Alerta de Emergencia',
          message: `${profile?.full_name} ativou o botao SOS. Localizacao: ${location_address || 'Desconhecida'}`,
          type: 'emergency',
          data: {
            alert_id: alert.id,
            contact_name: contact.name,
            contact_phone: contact.phone,
          },
        })
      )
      
      await Promise.all(notificationPromises)

      // Mark contacts as notified
      await supabase
        .from('emergency_alerts')
        .update({ contacts_notified: true })
        .eq('id', alert.id)
    }

    // Send notification to admin
    await supabase.from('notifications').insert({
      user_id: user.id,
      title: '🚨 Alerta SOS Ativado',
      message: `Usuario ${profile?.full_name} ativou alerta de emergencia`,
      type: 'admin_alert',
      data: {
        alert_id: alert.id,
        user_id: user.id,
      },
    })

    return NextResponse.json({
      success: true,
      alert,
      contacts_notified: contacts?.length || 0,
    })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's emergency alerts
    const { data: alerts, error } = await supabase
      .from('emergency_alerts')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) throw error

    return NextResponse.json({ alerts: alerts || [] })
  } catch (error) {
    console.error('[API] Error fetching alerts:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { alert_id, status } = body

    if (!alert_id || !status) {
      return NextResponse.json({ error: 'Alert ID and status required' }, { status: 400 })
    }

    // Update alert status
    const { data, error } = await supabase
      .from('emergency_alerts')
      .update({
        status,
        resolved_at: status === 'resolved' ? new Date().toISOString() : null,
      })
      .eq('id', alert_id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, alert: data })
  } catch (error) {
    console.error('[API] Error updating alert:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
