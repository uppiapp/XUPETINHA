import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * POST /api/v1/push/fcm-register
 * Registra ou atualiza um FCM token para o usuario autenticado.
 * Chamado pelo hook useFcmPushNotifications apos obter o token do Capacitor.
 *
 * Body: { token: string, platform: 'android' | 'ios' | 'web', device_id?: string, app_version?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { token, platform = 'android', device_id, app_version } = body

    if (!token) {
      return NextResponse.json({ error: 'token e obrigatorio' }, { status: 400 })
    }

    // Upsert pelo token — se o mesmo token existir (mesmo dispositivo), atualiza
    const { error } = await supabase
      .from('fcm_tokens')
      .upsert(
        {
          user_id:     user.id,
          token,
          platform,
          device_id:   device_id ?? null,
          app_version: app_version ?? null,
          is_active:   true,
          updated_at:  new Date().toISOString(),
        },
        { onConflict: 'token' }
      )

    if (error) throw error

    // Atualiza o fcm_token no perfil (campo legado, util para queries simples)
    await supabase
      .from('profiles')
      .update({ fcm_token: token })
      .eq('id', user.id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[fcm-register] error:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

/**
 * DELETE /api/v1/push/fcm-register
 * Desativa um FCM token (logout ou revogacao de permissao).
 * Body: { token: string }
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { token } = body

    if (!token) {
      return NextResponse.json({ error: 'token e obrigatorio' }, { status: 400 })
    }

    const { error } = await supabase
      .from('fcm_tokens')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .eq('token', token)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[fcm-register] DELETE error:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
