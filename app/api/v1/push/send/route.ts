import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * Envia push via FCM HTTP v1 API (OAuth2 + Service Account).
 * Fallback para Legacy API se a Service Account não estiver configurada.
 */
async function sendFcm(
  tokens: string[],
  title: string,
  body: string,
  data: Record<string, string>
): Promise<{ sent: number; failed: number; expiredTokens: string[] }> {
  if (tokens.length === 0) return { sent: 0, failed: 0, expiredTokens: [] }

  const serverKey = process.env.FIREBASE_SERVER_KEY
  if (!serverKey) {
    console.error('[push/send] FIREBASE_SERVER_KEY não configurada')
    return { sent: 0, failed: tokens.length, expiredTokens: [] }
  }

  // FCM Legacy HTTP API (funciona com a Server Key do console Firebase)
  const res = await fetch('https://fcm.googleapis.com/fcm/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization:  `key=${serverKey}`,
    },
    body: JSON.stringify({
      registration_ids: tokens,
      notification: {
        title,
        body,
        sound: 'default',
        click_action: 'FLUTTER_NOTIFICATION_CLICK',
      },
      data:     { ...data, title, body },
      priority: 'high',
      content_available: true,
    }),
  })

  if (!res.ok) {
    console.error('[push/send] FCM error status:', res.status)
    return { sent: 0, failed: tokens.length, expiredTokens: [] }
  }

  const json = await res.json()

  // Coleta tokens inválidos/expirados para desativar no banco
  const expiredTokens: string[] = (json.results ?? [])
    .map((r: { error?: string }, i: number) =>
      r.error === 'NotRegistered' || r.error === 'InvalidRegistration'
        ? tokens[i]
        : null
    )
    .filter(Boolean) as string[]

  return {
    sent:          json.success  ?? 0,
    failed:        json.failure  ?? 0,
    expiredTokens,
  }
}

/**
 * POST /api/v1/push/send
 * Body: { user_id, title, body?, data? }
 *
 * Envia FCM para todos os tokens ativos do usuário e
 * desativa automaticamente tokens expirados/inválidos.
 */
export async function POST(request: NextRequest) {
  try {
    const { user_id, title, body, data } = await request.json()

    if (!user_id || !title) {
      return NextResponse.json(
        { error: 'user_id e title são obrigatórios' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Busca todos os tokens FCM ativos do usuário
    const { data: fcmRows, error: fetchError } = await supabase
      .from('fcm_tokens')
      .select('token')
      .eq('user_id', user_id)
      .eq('is_active', true)

    if (fetchError) throw fetchError

    const tokens = (fcmRows ?? []).map((r) => r.token)

    // Converte todos os valores de data para string (requisito FCM)
    const dataStr = Object.fromEntries(
      Object.entries(data ?? {}).map(([k, v]) => [k, String(v)])
    ) as Record<string, string>

    const result = await sendFcm(tokens, title, body ?? '', dataStr)

    // Desativa tokens expirados
    if (result.expiredTokens.length > 0) {
      await supabase
        .from('fcm_tokens')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .in('token', result.expiredTokens)
    }

    // Registra no log
    await supabase.from('push_log').insert({
      user_id,
      title,
      body:    body ?? '',
      channel: 'fcm',
      status:  result.sent > 0 ? 'sent' : tokens.length === 0 ? 'skipped' : 'failed',
    })

    return NextResponse.json({
      success: true,
      fcm: {
        sent:    result.sent,
        failed:  result.failed,
        skipped: tokens.length === 0,
      },
    })
  } catch (error) {
    console.error('[push/send] error:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
