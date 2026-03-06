import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * Verifica se a requisição tem uma sessão Supabase válida.
 * Retorna o user se autenticado, ou uma NextResponse 401 para retornar imediatamente.
 */
export async function requireAuth(): Promise<
  { user: { id: string }; errorResponse: null } | { user: null; errorResponse: NextResponse }
> {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    return {
      user: null,
      errorResponse: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    }
  }

  return { user, errorResponse: null }
}
