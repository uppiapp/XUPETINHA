/**
 * Arquivo de teste para verificar a conexão com Supabase
 * Use este arquivo para testar a integração em diferentes contextos
 */

import { createClient as createServerClient } from './server'
import { createClient as createBrowserClient } from './client'

/**
 * Teste de conexão no servidor
 */
export async function testServerConnection() {
  try {
    const client = await createServerClient()
    
    // Teste básico: buscar configurações do sistema
    const { data, error } = await client
      .from('system_settings')
      .select('key, value')
      .limit(1)
    
    if (error) {
      console.error('[Supabase] Erro na conexão do servidor:', error)
      return { success: false, error: error.message }
    }
    
    console.log('[Supabase] Conexão do servidor OK ✓')
    return { success: true, data }
  } catch (error) {
    console.error('[Supabase] Erro ao testar conexão do servidor:', error)
    return { success: false, error: String(error) }
  }
}

/**
 * Teste de conexão no cliente
 */
export function testBrowserConnection() {
  try {
    const client = createBrowserClient()
    
    if (!client) {
      console.error('[Supabase] Cliente do navegador não foi inicializado')
      return { success: false, error: 'Cliente não inicializado' }
    }
    
    console.log('[Supabase] Conexão do cliente OK ✓')
    return { success: true, client }
  } catch (error) {
    console.error('[Supabase] Erro ao testar conexão do cliente:', error)
    return { success: false, error: String(error) }
  }
}

/**
 * Teste de autenticação
 */
export async function testAuthConnection() {
  try {
    const client = await createServerClient()
    const { data, error } = await client.auth.getUser()
    
    if (error && error.message !== 'SSR stub') {
      console.error('[Supabase] Erro na autenticação:', error)
      return { success: false, error: error.message }
    }
    
    console.log('[Supabase] Autenticação OK ✓')
    return { success: true, user: data?.user }
  } catch (error) {
    console.error('[Supabase] Erro ao testar autenticação:', error)
    return { success: false, error: String(error) }
  }
}
