import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ is_admin: false }, { status: 401 })
    }

    // Usar admin client (service_role) para ignorar RLS
    const adminClient = createAdminClient()
    const { data: profile, error: profileError } = await adminClient
      .from('profiles')
      .select('is_admin, full_name')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ is_admin: false }, { status: 403 })
    }

    return NextResponse.json({ is_admin: profile.is_admin, full_name: profile.full_name })
  } catch {
    return NextResponse.json({ is_admin: false }, { status: 500 })
  }
}
