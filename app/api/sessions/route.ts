import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient, getSupabaseClient } from '@/lib/supabase'
import { requireCoachSession } from '@/lib/require-coach'
import type { CreateSessionRequest } from '@/types'

// GET /api/sessions?playerId=Y — list sessions for the authenticated coach
//
// Ownership added 2026-07-19 (security audit) — coachId was trusted from a
// query param with zero verification, listing every session (notes,
// strengths, improvements, root_causes) for any coach whose id you knew.
// coachId is now derived from the session; playerId remains a pure filter.
export async function GET(req: NextRequest) {
  try {
    const auth = await requireCoachSession()
    if ('error' in auth) return auth.error
    const { coachId } = auth

    const playerId = req.nextUrl.searchParams.get('playerId')

    const db = getAdminClient()
    let query = db
      .from('sessions')
      .select('*')
      .eq('coach_id', coachId)
      .order('session_date', { ascending: false })

    if (playerId) {
      query = query.eq('player_id', playerId)
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ sessions: data ?? [] })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/sessions — log a new session
//
// Ownership added 2026-07-19 (security audit) — the coach-managed path
// previously trusted coach_id from the request body outright. The existing
// player_id+coach_id check only verified the pair was internally
// consistent (a real player belonging to that coach_id), never that the
// CALLER actually was that coach — the same "self-consistent pair" gap
// already found and fixed on /api/videos/presign, /confirm, and
// /api/players. coachId is now derived from the session; player_id is
// re-checked against it below exactly as before.
export async function POST(req: NextRequest) {
  try {
    const body: CreateSessionRequest = await req.json()

    const { player_id, player_account_id, session_date } = body

    if (!session_date) {
      return NextResponse.json({ error: 'session_date is required' }, { status: 400 })
    }

    // Per-session analysis stance-position (Position capture build). Optional —
    // null means "not captured", which the pipeline treats as honest-unknown
    // (feedback hedges). If present it must be the exact OL-stance vocabulary
    // the sessions.position CHECK and feedback.py POSITION_CUES understand.
    const position: 'guard_tackle' | 'center' | null = body.position ?? null
    if (position !== null && position !== 'guard_tackle' && position !== 'center') {
      return NextResponse.json(
        { error: "position must be 'guard_tackle', 'center', or omitted." },
        { status: 400 }
      )
    }

    // ── Mutual exclusivity check ──────────────────────────────────────────────
    if (player_account_id && player_id) {
      return NextResponse.json(
        { error: 'player_account_id cannot be combined with player_id.' },
        { status: 400 }
      )
    }
    if (!player_account_id && !player_id) {
      return NextResponse.json(
        { error: 'Either player_id (coach-managed) or player_account_id (self-signup) is required.' },
        { status: 400 }
      )
    }

    const db = getAdminClient()
    let coach_id: string | null = null

    // ── Path A: coach-managed player — coachId is session-derived, then
    //    confirmed to actually own player_id via a fresh DB read ─────────────
    if (player_id) {
      const auth = await requireCoachSession()
      if ('error' in auth) return auth.error
      coach_id = auth.coachId

      const { data: player, error: playerError } = await db
        .from('players')
        .select('consent_status, parental_consent_status, is_minor')
        .eq('id', player_id)
        .eq('coach_id', coach_id)
        .single()

      if (playerError || !player) {
        return NextResponse.json({ error: 'Player not found.' }, { status: 404 })
      }
      if (player.consent_status !== 'obtained') {
        return NextResponse.json(
          { error: 'Cannot create session: player consent has not been obtained.' },
          { status: 403 }
        )
      }
      if (player.is_minor && player.parental_consent_status !== 'obtained') {
        return NextResponse.json(
          { error: 'Cannot create session: parental consent is required for players under 18.' },
          { status: 403 }
        )
      }
    }

    // ── Path B: self-signup player account ────────────────────────────────────
    if (player_account_id) {
      const jwt = req.headers.get('authorization')?.replace('Bearer ', '')
      if (!jwt) {
        return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
      }
      const { data: { user }, error: authError } =
        await getSupabaseClient().auth.getUser(jwt)
      if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
      }

      const { data: account, error: accountError } = await db
        .from('player_accounts')
        .select('account_status')
        .eq('id', player_account_id)
        .eq('auth_user_id', user.id)
        .single()

      if (accountError || !account) {
        return NextResponse.json({ error: 'Account not found.' }, { status: 404 })
      }

      if (account.account_status === 'pending_minor_consent') {
        return NextResponse.json(
          { error: 'Account pending parental consent. Session creation is not permitted until a parent or guardian approves your account.' },
          { status: 403 }
        )
      }
      if (account.account_status === 'restricted') {
        return NextResponse.json(
          { error: 'Account restricted. Parental consent was declined. Contact your coach for assistance.' },
          { status: 403 }
        )
      }
      if (account.account_status !== 'active') {
        return NextResponse.json({ error: 'Account is not active.' }, { status: 403 })
      }
    }

    // ── Insert ────────────────────────────────────────────────────────────────
    const { data, error } = await db
      .from('sessions')
      .insert({
        ...(player_account_id
          ? { player_account_id }
          : { player_id, coach_id }),
        session_date,
        position,
        strengths:    body.strengths    ?? [],
        improvements: body.improvements ?? [],
        root_causes:  body.root_causes  ?? {},
        notes:        body.notes        ?? null,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ session: data }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
