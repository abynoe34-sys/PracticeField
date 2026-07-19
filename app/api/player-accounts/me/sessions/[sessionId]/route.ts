import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient, getSupabaseClient } from '@/lib/supabase'
import type { SessionVideo } from '@/types'

type RouteContext = { params: Promise<{ sessionId: string }> }

// GET /api/player-accounts/me/sessions/[sessionId]
//
// Returns one of the authenticated self-signup player's own analysis sessions
// with its side + front session_videos rows (analysis, feedback,
// feedback_status, view_angle, media_type) and fresh signed playback URLs —
// everything the solo results view needs to render VideoAnalysisCard /
// FeedbackPanel / FrontMeasurements, mirroring the coach session page.
//
// Ownership: the session must belong to the caller's own player_account
// (resolved from the JWT, never a client-supplied id). A session owned by
// someone else — or a coach-managed session — returns 404, matching the
// "not yours = 404" convention the other /me routes use.
export async function GET(req: NextRequest, { params }: RouteContext) {
  const jwt = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!jwt) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  const { data: { user }, error: authError } =
    await getSupabaseClient().auth.getUser(jwt)
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  const { sessionId } = await params
  const db = getAdminClient()

  const { data: account } = await db
    .from('player_accounts')
    .select('id')
    .eq('auth_user_id', user.id)
    .single()

  if (!account) {
    return NextResponse.json({ error: 'Account not found.' }, { status: 404 })
  }

  const { data: session, error: sessionError } = await db
    .from('sessions')
    .select('id, session_date, position, player_account_id')
    .eq('id', sessionId)
    .single()

  // Not found OR not owned by this account → 404 (don't distinguish, per the
  // /me convention — a cross-owner probe learns nothing).
  if (sessionError || !session || session.player_account_id !== account.id) {
    return NextResponse.json({ error: 'Session not found.' }, { status: 404 })
  }

  const { data: rawVideos, error: videosError } = await db
    .from('session_videos')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true })

  if (videosError) {
    return NextResponse.json({ error: videosError.message }, { status: 500 })
  }

  const videos: SessionVideo[] = await Promise.all(
    (rawVideos ?? []).map(async (v) => {
      if (!v.storage_path) return v as SessionVideo
      const { data: signed } = await db.storage
        .from('session-videos')
        .createSignedUrl(v.storage_path, 3600)
      return { ...v, public_url: signed?.signedUrl ?? null } as SessionVideo
    })
  )

  return NextResponse.json({
    session: { id: session.id, session_date: session.session_date, position: session.position },
    videos,
  })
}
