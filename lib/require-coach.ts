import { NextResponse } from 'next/server'
import { getServerUser } from '@/lib/supabase-server'
import { resolveRole } from '@/lib/auth-role'

// Server-side ownership check for API routes, derived from the caller's
// verified session cookie (not a client-supplied coachId param). Same-origin
// fetch() calls send cookies automatically, so calling code doesn't need to
// change to use this — see lib/supabase-server.ts for how the session is read.
//
// This is the "strengthens, never weakens" piece: previously (and still, on
// routes not yet retrofitted to use this) ownership was checked by comparing
// a resource's coach_id column to a coachId the CLIENT supplied — trustworthy
// only because nothing forged it, not because anything verified it. Routes
// using this helper instead derive the authoritative coachId from a session
// that was actually authenticated, so a coachId can no longer be spoofed by
// simply passing a different value.
//
// Returns { coachId } on success, or { error: NextResponse } to return
// directly from the route on failure — check `'error' in result` first.
export async function requireCoachSession(): Promise<
  { coachId: string } | { error: NextResponse }
> {
  const user = await getServerUser()
  if (!user) {
    return { error: NextResponse.json({ error: 'Unauthorized.' }, { status: 401 }) }
  }

  const resolved = await resolveRole(user.id)
  if (!resolved || resolved.role !== 'coach') {
    return { error: NextResponse.json({ error: 'Forbidden.' }, { status: 403 }) }
  }

  return { coachId: resolved.coachId }
}
