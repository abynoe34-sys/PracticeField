import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Server-side, cookie-based Supabase client for Server Components, layouts,
// and route handlers — reads whatever session the browser client
// (lib/supabase.ts, createBrowserClient) wrote to cookies.
//
// This is the real security boundary for coach/player route gating: it lets
// a Server Component (e.g. app/[coachId]/layout.tsx) verify "who is this,
// and are they allowed here" BEFORE any data fetch happens, unlike a
// client-side-only check which can't stop data that's already been fetched
// server-side with the admin client and embedded in the SSR payload.
//
// Must be called fresh per request (cookies() is request-scoped) — do not
// cache/memoize the returned client across requests.
export async function getServerSupabase() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Called from a Server Component render, where cookies() is
            // read-only — safe to ignore. middleware.ts refreshes the
            // session and writes the cookie back on the response instead.
          }
        },
      },
    }
  )
}

// Convenience: verified user for the current request, or null. Uses
// auth.getUser() (validates against Supabase, not just decodes the cookie)
// rather than auth.getSession() — required for anything gating access.
export async function getServerUser() {
  const supabase = await getServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}
