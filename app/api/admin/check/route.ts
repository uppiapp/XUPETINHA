import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// POST /api/admin/check
// Recebe { user_id } e verifica is_admin usando service_role (ignora RLS)
export async function POST(req: NextRequest) {
  try {
    const { user_id } = await req.json()
    console.log('[v0] admin/check user_id recebido:', user_id)

    if (!user_id) {
      return NextResponse.json({ is_admin: false }, { status: 400 })
    }

    const adminClient = createAdminClient()
    const { data: profile, error } = await adminClient
      .from('profiles')
      .select('is_admin, full_name')
      .eq('id', user_id)
      .single()

    console.log('[v0] profile:', profile, 'error:', error)

    if (error || !profile) {
      return NextResponse.json({ is_admin: false }, { status: 403 })
    }

    return NextResponse.json({ is_admin: profile.is_admin, full_name: profile.full_name })
  } catch (e) {
    console.log('[v0] admin/check exception:', e)
    return NextResponse.json({ is_admin: false }, { status: 500 })
  }
}
