import { createBrowserClient } from '@supabase/ssr'
import type { Database } from './database.types'

let client: ReturnType<typeof createBrowserClient<Database>> | null = null

// Create a mock client for when env vars aren't available
const createMockClient = () => {
  const mockAuth = {
    getUser: async () => ({ data: { user: null }, error: null }),
    getSession: async () => ({ data: { session: null }, error: null }),
    signUp: async () => ({ data: { user: null }, error: new Error('Supabase not configured') }),
    signInWithPassword: async () => ({ data: { user: null }, error: new Error('Supabase not configured') }),
    signOut: async () => ({ error: null }),
  }
  
  return {
    auth: mockAuth,
    from: (table: string) => ({
      select: () => Promise.resolve({ data: null, error: null }),
      insert: () => Promise.resolve({ data: null, error: null }),
      update: () => Promise.resolve({ data: null, error: null }),
      delete: () => Promise.resolve({ data: null, error: null }),
      on: () => ({ subscribe: () => ({ unsubscribe: () => {} }) }),
    }),
  } as any as ReturnType<typeof createBrowserClient<Database>>
}

export function createClient() {
  // Return cached client if exists
  if (client) return client
  
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  if (!url || !key) {
    // Return a mock client when env vars are missing (dev/preview without config)
    return createMockClient()
  }
  
  client = createBrowserClient<Database>(url, key)
  return client
}
