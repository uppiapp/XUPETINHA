import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { level = 'error', message, stack, context, user_id, metadata } = body

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'message é obrigatório' }, { status: 400 })
    }

    const supabase = createAdminClient()

    const { error } = await supabase.from('error_logs').insert({
      level,
      message: message.slice(0, 2000),
      stack: stack ? String(stack).slice(0, 5000) : null,
      context: context ? String(context).slice(0, 500) : null,
      user_id: user_id ?? null,
      metadata: metadata ?? {},
    })

    if (error) {
      console.error('[api/logs/error] supabase insert error:', error.message)
      return NextResponse.json({ error: 'Falha ao salvar log' }, { status: 500 })
    }

    return NextResponse.json({ ok: true }, { status: 201 })
  } catch (err) {
    console.error('[api/logs/error] unexpected error:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
