import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

type BroadcastTarget = 'all_passengers' | 'all_drivers' | 'everyone'

const BATCH = 500  // FCM aceita até 500 tokens por request

/**
 * Envia FCM para um lote de tokens usando a Legacy HTTP API.
 */
async function sendFcmBatch(
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

  if (!res.ok) return { sent: 0, failed: tokens.length, expiredTokens: [] }

  const json = await res.json()

  const expiredTokens: string[] = (json.results ?? [])
    .map((r: { error?: string }, i: number) =>
      r.error === 'NotRegistered' || r.error === 'InvalidRegistration' ? tokens[i] : null
    )
    .filter(Boolean) as string[]

  return { sent: json.success ?? 0, failed: json.failure ?? 0, expiredTokens }
}

/**
 * POST /api/v1/push/broadcast
 * Envia FCM para um grupo inteiro de usuários. Apenas admins.
 * Body: { target: 'all_passengers' | 'all_drivers' | 'everyone', title, body, data? }
 */
export async function POST(request: NextRequest) {
  try {
    if (!process.env.FIREBASE_SERVER_KEY) {
      return NextResponse.json({ error: 'FIREBASE_SERVER_KEY nao configurada' }, { status: 500 })
    }

    const supabase = await createClient()

    // Verifica autenticacao e perfil admin
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })

    const { data: profile } = await supabase
      .from('profiles')
      .select('user_type')
      .eq('id', user.id)
      .single()

    if (profile?.user_type !== 'admin') {
      return NextResponse.json({ error: 'Apenas admins podem fazer broadcast' }, { status: 403 })
    }

    const { target, title, body, data } = await request.json() as {
      target: BroadcastTarget
      title: string
      body: string
      data?: Record<string, unknown>
    }

    if (!target || !title || !body) {
      return NextResponse.json({ error: 'target, title e body sao obrigatorios' }, { status: 400 })
    }

    // Busca user_ids do grupo alvo
    let userQuery = supabase.from('profiles').select('id').eq('status', 'active')
    if (target === 'all_passengers') userQuery = userQuery.eq('user_type', 'passenger')
    if (target === 'all_drivers')    userQuery = userQuery.eq('user_type', 'driver')

    const { data: targetUsers } = await userQuery
    if (!targetUsers || targetUsers.length === 0) {
      return NextResponse.json({ success: true, sent: 0, total: 0 })
    }

    const userIds = targetUsers.map((u) => u.id)

    // Busca todos os tokens FCM ativos do grupo
    const { data: tokenRows } = await supabase
      .from('fcm_tokens')
      .select('user_id, token')
      .in('user_id', userIds)
      .eq('is_active', true)

    if (!tokenRows || tokenRows.length === 0) {
      return NextResponse.json({ success: true, sent: 0, total: 0 })
    }

    const allTokens  = tokenRows.map((r) => r.token)
    const dataStr    = Object.fromEntries(
      Object.entries(data ?? {}).map(([k, v]) => [k, String(v)])
    ) as Record<string, string>

    let totalSent   = 0
    let totalFailed = 0
    const allExpired: string[] = []

    // Envia em lotes de 500 (limite FCM)
    for (let i = 0; i < allTokens.length; i += BATCH) {
      const batch  = allTokens.slice(i, i + BATCH)
      const result = await sendFcmBatch(batch, title, body, dataStr)
      totalSent   += result.sent
      totalFailed += result.failed
      allExpired.push(...result.expiredTokens)
    }

    // Desativa tokens expirados
    if (allExpired.length > 0) {
      await supabase
        .from('fcm_tokens')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .in('token', allExpired)
    }

    // Registra no log (resumo)
    await supabase.from('push_log').insert({
      title,
      body,
      channel: 'fcm',
      status:  totalSent > 0 ? 'sent' : 'failed',
    })

    return NextResponse.json({
      success: true,
      sent:   totalSent,
      failed: totalFailed,
      total:  allTokens.length,
    })
  } catch (error) {
    console.error('[push/broadcast] error:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
