import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient, getSupabaseClient } from '@/lib/supabase'

// GET /api/player-accounts/me/sessions
//
// Lists the authenticated self-signup player's own analysis sessions (the
// solo mirror of the coach's per-player session history). Ownership is the
// caller's JWT identity — never a client-supplied id — same discipline as
// every other /me route. Each session is summarized with its side-view row's
// analysis_status + feedback_status so the dashboard can show progress/links
// without a second round-trip.
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

  const db = getAdminClient()

  const { data: account } = await db
    .from('player_accounts')
    .select('id, account_status')
    .eq('auth_user_id', user.id)
    .single()

  if (!account) {
    return NextResponse.json({ error: 'Account not found.' }, { status: 404 })
  }
  if (account.account_status !== 'active') {
    return NextResponse.json({ sessions: [] })
  }

  const { data: sessions, error } = await db
    .from('sessions')
    .select('id, session_date, position, created_at')
    .eq('player_account_id', account.id)
    .order('session_date', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const sessionIds = (sessions ?? []).map(s => s.id)

  // One extra query for the side-view rows, then fold their status onto each
  // session — avoids an N+1 while keeping the per-session summary the UI needs.
  const statusBySession = new Map<string, { analysis_status: string; feedback_status: string; has_feedback: boolean }>()
  if (sessionIds.length > 0) {
    const { data: sideRows } = await db
      .from('session_videos')
      .select('session_id, analysis_status, feedback_status, feedback')
      .in('session_id', sessionIds)
      .eq('view_angle', 'side')
    for (const r of sideRows ?? []) {
      if (!r.session_id) continue
      statusBySession.set(r.session_id, {
        analysis_status: r.analysis_status,
        feedback_status: r.feedback_status,
        has_feedback:    !!r.feedback,
      })
    }
  }

  const result = (sessions ?? []).map(s => ({
    id:           s.id,
    session_date: s.session_date,
    position:     s.position,
    created_at:   s.created_at,
    ...(statusBySession.get(s.id) ?? { analysis_status: 'pending', feedback_status: 'pending', has_feedback: false }),
  }))

  return NextResponse.json({ sessions: result })
}
