// @ts-nocheck
// Supabase Edge Function: notify-push
// Ponte entre o banco de dados e o FCM/VAPID.
// Chamada diretamente via HTTP (pg_net, API interna ou webhook).

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL       = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE   = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const FCM_SERVER_KEY     = Deno.env.get('FIREBASE_SERVER_KEY')
const VAPID_PUBLIC_KEY   = Deno.env.get('VAPID_PUBLIC_KEY')
const VAPID_PRIVATE_KEY  = Deno.env.get('VAPID_PRIVATE_KEY')
const VAPID_EMAIL        = Deno.env.get('VAPID_EMAIL') ?? 'mailto:noreply@uppi.app'

// ---------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------

async function sendFcm(tokens: string[], title: string, body: string, data: Record<string, string>) {
  if (!FCM_SERVER_KEY || tokens.length === 0) return { sent: 0, failed: 0 }

  const payload = {
    registration_ids: tokens,
    notification: { title, body, sound: 'default', click_action: 'FLUTTER_NOTIFICATION_CLICK' },
    data: { ...data, title, body },
    priority: 'high',
    content_available: true,
  }

  const res = await fetch('https://fcm.googleapis.com/fcm/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization:  `key=${FCM_SERVER_KEY}`,
    },
    body: JSON.stringify(payload),
  })

  const json = await res.json()
  return {
    sent:   json.success   ?? 0,
    failed: json.failure   ?? 0,
    results: json.results  ?? [],
  }
}

async function sendVapid(endpoint: string, p256dh: string, auth: string, title: string, body: string, data: object) {
  // Web push via VAPID - usa a lib web-push compilada para Deno
  // Importacao dinamica para evitar falha se VAPID nao estiver configurado
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return false

  try {
    const { default: webpush } = await import('npm:web-push@3')
    webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)
    await webpush.sendNotification(
      { endpoint, keys: { p256dh, auth } },
      JSON.stringify({ title, body, data }),
      { TTL: 86400 }
    )
    return true
  } catch {
    return false
  }
}

// ---------------------------------------------------------------
// Handler principal
// ---------------------------------------------------------------

serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 })
  }

  let body: { user_id?: string; user_ids?: string[]; title: string; body?: string; data?: Record<string, string> }

  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'JSON invalido' }), { status: 400 })
  }

  const { title, body: msgBody = '', data = {} } = body
  const userIds: string[] = body.user_ids ?? (body.user_id ? [body.user_id] : [])

  if (!title || userIds.length === 0) {
    return new Response(JSON.stringify({ error: 'title e user_id sao obrigatorios' }), { status: 400 })
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE)

  // Busca FCM tokens
  const { data: fcmRows } = await supabase
    .from('fcm_tokens')
    .select('token, user_id')
    .in('user_id', userIds)
    .eq('is_active', true)

  // Busca VAPID subscriptions
  const { data: vapidRows } = await supabase
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth, user_id')
    .in('user_id', userIds)
    .eq('is_active', true)

  const fcmTokens = (fcmRows ?? []).map((r) => r.token)
  const dataStr   = Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)]))

  // Envia FCM
  const fcmResult = await sendFcm(fcmTokens, title, msgBody, dataStr)

  // Invalida tokens FCM expirados
  if (fcmResult.results && fcmRows) {
    const expiredTokens = fcmResult.results
      .map((r: { error?: string }, i: number) => (r.error === 'NotRegistered' ? fcmRows[i]?.token : null))
      .filter(Boolean)

    if (expiredTokens.length > 0) {
      await supabase.from('fcm_tokens').update({ is_active: false }).in('token', expiredTokens)
    }
  }

  // Envia VAPID em paralelo
  const vapidResults = await Promise.allSettled(
    (vapidRows ?? []).map((sub) =>
      sendVapid(sub.endpoint, sub.p256dh, sub.auth, title, msgBody, data)
    )
  )

  const vapidSent   = vapidResults.filter((r) => r.status === 'fulfilled' && r.value).length
  const vapidFailed = vapidResults.length - vapidSent

  // Invalida VAPID expiradas (status 410)
  const expiredEndpoints: string[] = []
  vapidResults.forEach((r, i) => {
    if (r.status === 'rejected') {
      const err = r.reason as { statusCode?: number }
      if (err?.statusCode === 410 && vapidRows?.[i]) {
        expiredEndpoints.push(vapidRows[i].endpoint)
      }
    }
  })
  if (expiredEndpoints.length > 0) {
    await supabase.from('push_subscriptions').update({ is_active: false }).in('endpoint', expiredEndpoints)
  }

  // Registra no log
  for (const uid of userIds) {
    await supabase.from('push_log').insert({
      user_id: uid,
      channel: fcmTokens.length > 0 ? 'fcm' : 'vapid',
      title,
      body: msgBody,
      status: 'sent',
    })
  }

  return new Response(
    JSON.stringify({
      success: true,
      fcm:  { sent: fcmResult.sent,  failed: fcmResult.failed },
      vapid: { sent: vapidSent, failed: vapidFailed },
    }),
    { headers: { 'Content-Type': 'application/json' } }
  )
})
