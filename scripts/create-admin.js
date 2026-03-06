#!/usr/bin/env node

/**
 * Script para criar o primeiro usuário admin
 * Uso: node scripts/create-admin.js
 */

const { createClient } = require('@supabase/supabase-js')

async function createAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Erro: Variáveis de ambiente não configuradas')
    console.log('Configure NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  console.log('🔧 Criando usuário admin...')

  const adminEmail = process.env.ADMIN_EMAIL || 'admin@uppi.com'
  const adminPassword = process.env.ADMIN_PASSWORD

  if (!adminPassword) {
    console.error('Erro: defina ADMIN_PASSWORD como variável de ambiente antes de executar.')
    console.log('Exemplo: ADMIN_PASSWORD=suaSenhaForte node scripts/create-admin.js')
    process.exit(1)
  }

  // Criar usuário no Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: adminEmail,
    password: adminPassword,
    email_confirm: true,
    user_metadata: {
      full_name: 'Admin Uppi'
    }
  })

  if (authError) {
    console.error('❌ Erro ao criar usuário:', authError.message)
    process.exit(1)
  }

  console.log('✅ Usuário criado:', authData.user.email)

  // Criar perfil e marcar como admin
  const { error: profileError } = await supabase
    .from('profiles')
    .upsert({
      id: authData.user.id,
      phone: 'admin@uppi.com', // Usar email como phone temporariamente
      full_name: 'Admin Uppi',
      is_admin: true,
      user_type: 'passenger',
      created_at: new Date().toISOString()
    })

  if (profileError) {
    console.error('❌ Erro ao criar perfil:', profileError.message)
    process.exit(1)
  }

  console.log('✅ Perfil admin criado com sucesso!')
  console.log('\nEmail:', adminEmail)
  console.log('\nAcesse /admin/login para entrar no painel')
}

createAdmin().catch(console.error)
