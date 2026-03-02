import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET - Retorna perfil do usuário autenticado
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    // Buscar perfil na tabela profiles (id = auth.uid())
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profileError) throw profileError

    // Buscar perfil de motorista se existir
    const { data: driverProfile } = await supabase
      .from('driver_profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    // Buscar saldo da carteira
    const { data: walletBalance } = await supabase
      .rpc('calculate_wallet_balance', { p_user_id: user.id })

    return NextResponse.json({
      success: true,
      ...profile,
      driver_profile: driverProfile || null,
      wallet_balance: walletBalance ?? 0,
    })
  } catch (error) {
    console.error('[v0] Error fetching profile:', error)
    return NextResponse.json({ error: 'Erro ao buscar perfil' }, { status: 500 })
  }
}

// PATCH - Atualiza perfil do usuário
export async function PATCH(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { full_name, phone, avatar_url, preferences, ...rest } = body

    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    }

    if (full_name !== undefined) updateData.full_name = full_name
    if (phone !== undefined)     updateData.phone = phone
    if (avatar_url !== undefined) updateData.avatar_url = avatar_url
    if (preferences !== undefined) updateData.preferences = preferences

    const { data: profile, error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', user.id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, profile })
  } catch (error) {
    console.error('[v0] Error updating profile:', error)
    return NextResponse.json({ error: 'Erro ao atualizar perfil' }, { status: 500 })
  }
}
