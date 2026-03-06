# 🔗 Guia Rápido - Supabase no Projeto

## ✅ Status da Integração

**Supabase está 100% conectado e funcional!**

- ✓ Variáveis de ambiente configuradas
- ✓ Schema do banco de dados criado (74 tabelas)
- ✓ RLS (Row Level Security) ativo em todas as tabelas
- ✓ Middleware de autenticação configurado
- ✓ Realtime ativo em 8 tabelas principais

---

## 📍 Clientes Supabase Disponíveis

### 1. **Client do Servidor** (`lib/supabase/server.ts`)
Use em Server Components e Route Handlers:

```typescript
import { createClient } from '@/lib/supabase/server'

export async function getData() {
  const client = await createClient()
  const { data, error } = await client
    .from('rides')
    .select('*')
  return data
}
```

### 2. **Client do Navegador** (`lib/supabase/client.ts`)
Use em componentes cliente:

```typescript
'use client'
import { createClient } from '@/lib/supabase/client'

export function MyComponent() {
  const client = createClient()
  // Usar client aqui
}
```

### 3. **Client Admin** (`lib/supabase/admin.ts`)
Use para operações que precisam bypassar RLS:

```typescript
import { createAdminClient } from '@/lib/supabase/admin'

async function adminOperation() {
  const admin = createAdminClient()
  // Operações sem RLS
}
```

---

## 📊 Principais Tabelas

| Tabela | Descrição | Realtime |
|--------|-----------|----------|
| `profiles` | Perfis de usuários | ❌ |
| `rides` | Corridas | ✅ |
| `messages` | Mensagens | ✅ |
| `notifications` | Notificações | ✅ |
| `price_offers` | Ofertas de preço | ✅ |
| `driver_locations` | Localização dos motoristas | ✅ |
| `support_messages` | Mensagens de suporte | ✅ |

---

## 🔐 Autenticação

### Login com Email/Senha
```typescript
const { data, error } = await client.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password123'
})
```

### Signup
```typescript
const { data, error } = await client.auth.signUp({
  email: 'newuser@example.com',
  password: 'password123'
})
```

### Logout
```typescript
await client.auth.signOut()
```

---

## 🔄 Realtime Subscriptions

```typescript
const channel = client
  .channel('rides')
  .on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'rides' },
    (payload) => console.log('Mudança:', payload)
  )
  .subscribe()
```

---

## 📁 Estrutura de Arquivos Supabase

```
lib/supabase/
├── client.ts          # Cliente do navegador
├── server.ts          # Cliente do servidor
├── admin.ts           # Cliente admin (service role)
├── config.ts          # Configurações
├── middleware.ts      # Middleware de autenticação
├── database.ts        # Tipos do banco (gerado)
└── test-connection.ts # Testes de conexão
```

---

## 🚀 Variáveis de Ambiente

Todas as variáveis já estão configuradas:

```
NEXT_PUBLIC_SUPABASE_URL          # URL do Supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY     # Chave anônima
SUPABASE_SERVICE_ROLE_KEY         # Chave admin
POSTGRES_URL                      # URL do banco (se usar direto)
```

---

## ✅ Testar a Conexão

```typescript
import { testServerConnection } from '@/lib/supabase/test-connection'

const result = await testServerConnection()
console.log(result) // { success: true, data: [...] }
```

---

## 📚 Documentação Completa

Veja `docs/SUPABASE-CONEXAO.md` para detalhes sobre:
- Migrations aplicadas
- RPCs (Stored Procedures)
- Schema completo
- Configuração de RLS

---

**Última atualização:** 06/03/2026
**Status:** ✅ Operacional
