import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient } from '@/lib/supabase'
import { resolveRole } from '@/lib/auth-role'

// GET /api/whoami
// Requires Authorization: Bearer <jwt>. Returns the caller's role and the
// id needed to route them: { role: 'coach', coachId } or
// { role: 'player', playerAccountId }. Used right after sign-in (unified
// /login) to decide where to send the user, and as the pattern other
// routes reuse (via resolveRole) to derive an authoritative coachId from a
// verified session instead of a client-supplied one.
export async function GET(req: NextRequest) {
  const jwt = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!jwt) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  const { data: { user }, error: authError } =
    await getSupabaseClient().auth.getUser(jwt)
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  const resolved = await resolveRole(user.id)
  if (!resolved) {
    return NextResponse.json({ error: 'No account found for this user.' }, { status: 404 })
  }

  return NextResponse.json(resolved)
}
