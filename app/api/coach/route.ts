import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/supabase'
import { requireCoachSession } from '@/lib/require-coach'

// POST /api/coach — REMOVED 2026-07-18 (unified accounts).
// This used to create a coach with no email, password, or auth user at
// all ("your Coach ID is your password"). Superseded entirely by
// POST /api/coaches/signup, which creates a real authenticated account.
// Kept out rather than left running alongside the new flow — the same
// call the owner made for getOrCreateCoach() (see CLAUDE.md Gotcha #13):
// an old insecure account-creation path left live beside a new
// authenticated one defeats the point of adding real auth.

// PATCH /api/coach — update the authenticated coach's own name/team_name.
//
// Ownership added 2026-07-18 (unified accounts) — this route previously
// took coachId from the request body with no verification at all (a known,
// already-documented gap; see CLAUDE.md Gotcha #11's outstanding-audit
// note). coachId is now derived from the session via requireCoachSession(),
// so a coach can only ever update their own row.
export async function PATCH(req: NextRequest) {
  try {
    const auth = await requireCoachSession()
    if ('error' in auth) return auth.error
    const { coachId } = auth

    const body: { name?: string; team_name?: string } = await req.json()

    const db = getAdminClient()
    const updates: Record<string, string> = {}
    if (body.name      !== undefined) updates.name      = body.name
    if (body.team_name !== undefined) updates.team_name = body.team_name

    const { data, error } = await db
      .from('coaches')
      .update(updates)
      .eq('coach_id', coachId)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ coach: data })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET /api/coach?coachId=ABC123 — fetch or auto-create coach
export async function GET(req: NextRequest) {
  try {
    const coachId = req.nextUrl.searchParams.get('coachId')
    if (!coachId) {
      return NextResponse.json({ error: 'coachId is required' }, { status: 400 })
    }

    const db = getAdminClient()
    const { data, error } = await db
      .from('coaches')
      .select('*')
      .eq('coach_id', coachId)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Coach not found' }, { status: 404 })
    }

    return NextResponse.json({ coach: data })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
