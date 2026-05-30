import { createClient } from '@supabase/supabase-js'

// Lazy-initialize both clients so missing env vars don't crash the build.
// Values are only required at request time, not at module load / build time.

let _client: ReturnType<typeof createClient> | null = null

export function getSupabaseClient() {
  if (!_client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!url || !key) throw new Error('Supabase env vars are not set')
    _client = createClient(url, key)
  }
  return _client
}

// Convenience alias — matches existing `supabase.*` usage across the codebase
export const supabase = new Proxy({} as ReturnType<typeof createClient>, {
  get(_target, prop) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (getSupabaseClient() as any)[prop]
  },
})

// Server-only admin client — bypasses RLS, never expose to browser
export function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceRoleKey) {
    throw new Error('Supabase env vars are not set')
  }
  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false },
  })
}
