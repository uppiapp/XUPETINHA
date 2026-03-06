import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://zfwyyaellwejirejchpb.supabase.co'
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SERVICE_ROLE_KEY) {
  console.error('SUPABASE_SERVICE_ROLE_KEY não definida.')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
})

const EMAIL = 'admin@uppi.com'
const PASSWORD = process.env.ADMIN_PASSWORD

if (!PASSWORD) {
  console.error('ADMIN_PASSWORD não definida.')
  process.exit(1)
}

const { data: authData, error: authError } = await supabase.auth.admin.createUser({
  email: EMAIL,
  password: PASSWORD,
  email_confirm: true,
  user_metadata: { full_name: 'Admin Uppi', user_type: 'admin' }
})

if (authError) {
  console.error('Erro ao criar usuário:', authError.message)
  process.exit(1)
}

const userId = authData.user.id

const { error: profileError } = await supabase
  .from('profiles')
  .upsert({ id: userId, email: EMAIL, full_name: 'Admin Uppi', user_type: 'admin' })

if (profileError) {
  console.error('Erro ao atualizar perfil:', profileError.message)
  process.exit(1)
}

console.log('Admin criado com sucesso!')
console.log('ID:', userId)
console.log('Email:', EMAIL)
