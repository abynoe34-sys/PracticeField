import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/supabase'
import { requireCoachSession } from '@/lib/require-coach'

// GET /api/videos?playerId=Y&sessionId=Z
//
// Ownership added 2026-07-19 (security audit) — this was the explicitly
// known-open gap from CLAUDE.md Gotcha #16: coachId was trusted from a
// query param with zero verification, listing every video (including
// freshly-signed playback URLs) for any coach whose id you knew. coachId
// is now derived from the session; playerId/sessionId remain pure filters
// on top of that, never the authorization boundary themselves.
export async function GET(req: NextRequest) {
  try {
    const auth = await requireCoachSession()
    if ('error' in auth) return auth.error
    const { coachId } = auth

    const playerId  = req.nextUrl.searchParams.get('playerId')
    const sessionId = req.nextUrl.searchParams.get('sessionId')

    const db = getAdminClient()
    let query = db
      .from('session_videos')
      .select('*')
      .eq('coach_id', coachId)
      .order('created_at', { ascending: false })

    if (playerId)  query = query.eq('player_id', playerId)
    if (sessionId) query = query.eq('session_id', sessionId)

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Generate fresh signed URLs for each video (1 hour expiry)
    const db2 = getAdminClient()
    const videos = await Promise.all(
      (data ?? []).map(async (v) => {
        if (!v.storage_path) return v
        const { data: signed } = await db2.storage
          .from('session-videos')
          .createSignedUrl(v.storage_path, 3600)
        return { ...v, public_url: signed?.signedUrl ?? v.public_url }
      })
    )

    return NextResponse.json({ videos })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
