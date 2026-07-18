import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

// Standard Supabase SSR session-refresh middleware. Cookie-based sessions
// (see lib/supabase.ts, lib/supabase-server.ts) need their access token
// refreshed periodically; without this, a Server Component reading the
// session via lib/supabase-server.ts can see a stale/expired cookie even
// though the client-side session is still valid. This middleware does not
// gate or redirect anything itself — route protection lives in
// app/[coachId]/layout.tsx, co-located with the routes it protects.
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Touching auth.getUser() is what actually triggers the refresh-if-needed
  // and cookie rewrite above — the return value isn't used here.
  await supabase.auth.getUser()

  return response
}

export const config = {
  matcher: [
    // Everything except static assets and API routes (API routes verify
    // their own Bearer-token auth, not cookies — see existing pattern in
    // app/api/player-accounts/me/route.ts).
    '/((?!_next/static|_next/image|favicon\\.ico|api/).*)',
  ],
}
