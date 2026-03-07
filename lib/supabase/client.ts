import { createBrowserClient } from '@supabase/ssr'
import type { Database } from './database.types'

let client: ReturnType<typeof createBrowserClient<Database>> | null = null

export function createClient() {
  // During build/prerender, env vars may not be available
  // Return cached client if exists, or create new one
  if (client) return client
  
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  if (!url || !key) {
    // Return a mock client during build that throws on actual use
    // This allows pages to prerender without env vars
    throw new Error(
      'Supabase environment variables not configured. ' +
      'Please ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set.'
    )
  }
  
  client = createBrowserClient<Database>(url, key)
  return client
}
