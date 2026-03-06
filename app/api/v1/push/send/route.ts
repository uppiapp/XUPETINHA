import { NextRequest, NextResponse } from 'next/server'
import webpush from 'web-push'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * Envia notificacao FCM para um array de tokens nativos (Android/iOS).
 */
async function sendFcm(
  tokens: string[],
  title: string,
  body: string,
  data: Record<string, string>
): Promise<{ sent: number; failed: number; expiredTokens: string[] }> {
  const serverKey = process.env.FIREBASE_SERVER_KEY
  if (!serverKey || tokens.length === 0) return { sent: 0, failed: 0, expiredTokens: [] }

  const res = await fetch('https://fcm.googleapis.com/fcm/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization:  `key=${serverKey}`,
    },
    body: JSON.stringify({
      registration_ids: tokens,
      notification: { title, body, sound: 'default', click_action: 'FLUTTER_NOTIFICATION_CLICK' },
      data:         { ...data, title, body },
      priority:     'high',
      content_available: true,
    }),
  })

  const json = await res.json()

  // Coleta tokens invalidos para desativar
  const expiredTokens: string[] = (json.results ?? [])
    .map((r: { error?: string }, i: number) => (r.error === 'NotRegistered' ? tokens[i] : null))
    .filter(Boolean)

  return {
    sent:  json.success ?? 0,
    failed: json.failure ?? 0,
    expiredTokens,
  }
}

/**
 * POST /api/v1/push/send
 * Envia push para todos os dispositivos ativos do usuario:
 *   - VAPID (Web Push — browser/PWA) via web-push
 *   - FCM (Android/iOS nativo via Capacitor) via FCM HTTP v1
 * Chamado internamente pelo notification-service — nao exposto publicamente.
 */
export async function POST(request: NextRequest) {
  try {
    const { user_id, title, body, data } = await request.json()

    if (!user_id || !title) {
      return NextResponse.json({ error: 'user_id e title sao obrigatorios' }, { status: 400 })
    }

    const supabase = await createClient()
    const dataStr  = Object.fromEntries(
      Object.entries(data ?? {}).map(([k, v]) => [k, String(v)])
    ) as Record<string, string>

    // ── FCM (nativo) ────────────────────────────────────────────
    const { data: fcmRows } = await supabase
      .from('fcm_tokens')
      .select('token')
      .eq('user_id', user_id)
      .eq('is_active', true)

    const fcmTokens = (fcmRows ?? []).map((r) => r.token)
    const fcmResult = await sendFcm(fcmTokens, title, body ?? '', dataStr)

    // Desativa tokens FCM expirados
    if (fcmResult.expiredTokens.length > 0) {
      await supabase
        .from('fcm_tokens')
        .update({ is_active: false })
        .in('token', fcmResult.expiredTokens)
    }

    // ── VAPID (Web Push) ────────────────────────────────────────
    let vapidSent = 0

    if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
      webpush.setVapidDetails(
        `mailto:${process.env.VAPID_EMAIL ?? 'noreply@uppi.app'}`,
        process.env.VAPID_PUBLIC_KEY,
        process.env.VAPID_PRIVATE_KEY,
      )

      const { data: subscriptions, error } = await supabase
        .from('push_subscriptions')
        .select('endpoint, p256dh, auth')
        .eq('user_id', user_id)
        .eq('is_active', true)

      if (!error && subscriptions && subscriptions.length > 0) {
        const payload = JSON.stringify({ title, body: body ?? '', data: data ?? {} })

        const results = await Promise.allSettled(
          subscriptions.map((sub) =>
            webpush.sendNotification(
              { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
              payload,
              { TTL: 60 * 60 * 24 }
            )
          )
        )

        // Desativa subscriptions VAPID expiradas (410)
        const expiredEndpoints: string[] = []
        results.forEach((result, i) => {
          if (result.status === 'rejected') {
            const err = result.reason as { statusCode?: number }
            if (err?.statusCode === 410) expiredEndpoints.push(subscriptions[i].endpoint)
          }
        })

        if (expiredEndpoints.length > 0) {
          await supabase
            .from('push_subscriptions')
            .update({ is_active: false })
            .eq('user_id', user_id)
            .in('endpoint', expiredEndpoints)
        }

        vapidSent = results.filter((r) => r.status === 'fulfilled').length
      }
    }

    // Registra no log de push
    await supabase.from('push_log').insert({
      user_id,
      title,
      body: body ?? '',
      channel: fcmTokens.length > 0 ? 'fcm' : 'vapid',
      status:  'sent',
    })

    return NextResponse.json({
      success: true,
      fcm:   { sent: fcmResult.sent,  failed: fcmResult.failed },
      vapid: { sent: vapidSent },
    })
  } catch (error) {
    console.error('[push/send] error:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
