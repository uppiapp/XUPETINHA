// Configuração do Supabase
// As variáveis de ambiente são injetadas em build time pelo Next.js

export const supabaseConfig = {
  get url() {
    return process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  },
  get anonKey() {
    return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  },
} as const
