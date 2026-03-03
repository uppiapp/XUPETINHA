import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * POST /api/v1/sms/status
 * Webhook de status de SMS (provider nao configurado)
 */
export async function POST() {
  return NextResponse.json({ message: 'SMS provider not configured' }, { status: 503 })
}

/**
 * GET /api/v1/sms/status
 * Consulta manual de status de SMS
 */
export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const message_sid = searchParams.get('message_sid')
    const ride_id = searchParams.get('ride_id')

    if (!message_sid && !ride_id) {
      return NextResponse.json(
        { error: 'message_sid ou ride_id e obrigatorio' },
        { status: 400 }
      )
    }

    let query = supabase
      .from('sms_logs')
      .select('*')
      .order('created_at', { ascending: false })

    if (message_sid) {
      query = query.eq('provider_message_id', message_sid)
    } else if (ride_id) {
      query = query.eq('metadata->>ride_id', ride_id)
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ sms_logs: data || [] })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
