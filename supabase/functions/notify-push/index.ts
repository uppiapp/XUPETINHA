// @ts-nocheck
// Supabase Edge Function: notify-push
// Envia notificacoes push via Firebase FCM (100% FCM, sem VAPID).
// Pode ser chamada via pg_net, API interna ou diretamente.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL     = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const FCM_SERVER_KEY   = Deno.env.get('FIREBASE_SERVER_KEY')

// ---------------------------------------------------------------
// Envia FCM para um lote de tokens (maximo 500 por request)
// ---------------------------------------------------------------
async function sendFcmBatch(
  tokens: string[],
  title: string,
  body: string,
  data: Record<string, string>
): Promise<{ sent: number; failed: number; expiredTokens: string[] }> {
  if (!FCM_SERVER_KEY || tokens.length === 0) {
    return { sent: 0, failed: tokens.length, expiredTokens: [] }
  }

  const res = await fetch('https://fcm.googleapis.com/fcm/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization:  `key=${FCM_SERVER_KEY}`,
    },
    body: JSON.stringify({
      registration_ids: tokens,
      notification: {
        title,
        body,
        sound:        'default',
        click_action: 'FLUTTER_NOTIFICATION_CLICK',
      },
      data:              { ...data, title, body },
      priority:          'high',
      content_available: true,
    }),
  })

  if (!res.ok) {
    return { sent: 0, failed: tokens.length, expiredTokens: [] }
  }

  const json = await res.json()

  const expiredTokens: string[] = (json.results ?? [])
    .map((r: { error?: string }, i: number) =>
      r.error === 'NotRegistered' || r.error === 'InvalidRegistration' ? tokens[i] : null
    )
    .filter(Boolean)

  return {
    sent:   json.success ?? 0,
    failed: json.failure ?? 0,
    expiredTokens,
  }
}

// ---------------------------------------------------------------
// Handler principal
// ---------------------------------------------------------------
serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 })
  }

  let payload: {
    user_id?: string
    user_ids?: string[]
    title: string
    body?: string
    data?: Record<string, string>
  }

  try {
    payload = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'JSON invalido' }), { status: 400 })
  }

  const { title, body: msgBody = '', data = {} } = payload
  const userIds: string[] = payload.user_ids ?? (payload.user_id ? [payload.user_id] : [])

  if (!title || userIds.length === 0) {
    return new Response(
      JSON.stringify({ error: 'title e user_id sao obrigatorios' }),
      { status: 400 }
    )
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE)

  // Busca todos os tokens FCM ativos dos usuarios
  const { data: fcmRows } = await supabase
    .from('fcm_tokens')
    .select('token, user_id')
    .in('user_id', userIds)
    .eq('is_active', true)

  const allTokens = (fcmRows ?? []).map((r) => r.token)
  const dataStr   = Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)]))

  let totalSent    = 0
  let totalFailed  = 0
  const allExpired: string[] = []

  // Envia em lotes de 500 (limite FCM)
  const BATCH = 500
  for (let i = 0; i < allTokens.length; i += BATCH) {
    const batch  = allTokens.slice(i, i + BATCH)
    const result = await sendFcmBatch(batch, title, msgBody, dataStr)
    totalSent   += result.sent
    totalFailed += result.failed
    allExpired.push(...result.expiredTokens)
  }

  // Desativa tokens expirados/invalidos
  if (allExpired.length > 0) {
    await supabase
      .from('fcm_tokens')
      .update({ is_active: false })
      .in('token', allExpired)
  }

  // Registra no log para cada usuario
  for (const uid of userIds) {
    await supabase.from('push_log').insert({
      user_id: uid,
      channel: 'fcm',
      title,
      body:    msgBody,
      status:  totalSent > 0 ? 'sent' : allTokens.length === 0 ? 'skipped' : 'failed',
    })
  }

  return new Response(
    JSON.stringify({
      success: true,
      fcm: { sent: totalSent, failed: totalFailed },
      tokens: allTokens.length,
    }),
    { headers: { 'Content-Type': 'application/json' } }
  )
})
