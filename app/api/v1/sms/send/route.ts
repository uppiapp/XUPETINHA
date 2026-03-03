import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { apiLimiter, rateLimitResponse } from '@/lib/utils/rate-limit'

// SMS sender — provider not configured
export async function POST(request: Request) {
  try {
    const rlResult = apiLimiter.check(request, 10)
    if (!rlResult.success) return rateLimitResponse(rlResult)

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { phone_number, message, notification_id } = body

    if (!phone_number || !message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const { data: preferences } = await supabase
      .from('user_sms_preferences')
      .select('*')
      .eq('user_id', user.id)
      .eq('enabled', true)
      .eq('phone_verified', true)
      .single()

    if (!preferences) {
      return NextResponse.json({ error: 'SMS not enabled or phone not verified' }, { status: 403 })
    }

    const segments = Math.ceil(message.length / 160)

    const { data: delivery, error: insertError } = await supabase
      .from('sms_deliveries')
      .insert({
        user_id: user.id,
        phone_number,
        message,
        notification_id,
        segments,
        status: 'pending',
      })
      .select()
      .single()

    if (insertError) {
      return NextResponse.json({ error: 'Failed to create SMS delivery' }, { status: 500 })
    }

    // SMS provider not configured — mark as failed
    await supabase
      .from('sms_deliveries')
      .update({
        status: 'failed',
        error_message: 'SMS provider not configured',
        failed_at: new Date().toISOString(),
      })
      .eq('id', delivery.id)

    return NextResponse.json(
      { error: 'SMS provider not configured' },
      { status: 503 }
    )
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Process pending SMS (called by cron)
export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    return NextResponse.json({ processed: 0, failed: 0, total: 0, message: 'SMS provider not configured' })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
