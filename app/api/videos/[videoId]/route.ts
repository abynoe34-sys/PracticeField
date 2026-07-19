import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient, getSupabaseClient } from '@/lib/supabase'
import { requireCoachSession } from '@/lib/require-coach'

type RouteContext = { params: Promise<{ videoId: string }> }
const STORAGE_BUCKET = 'session-videos'

// Shared ownership check for all three methods below. The video row itself
// carries the owner (coach_id XOR player_account_id, per chk_sv_has_owner),
// so — unlike routes that receive a coachId directly — ownership here is
// derived by reading the row first, then verifying the caller against
// whichever owner shape it has: a coach session for coach-managed rows, a
// bearer JWT self-check for self-signup rows. Mirrors the pattern already
// used by DELETE /api/reference-photos/[photoId].
async function checkOwnership(
  req: NextRequest,
  video: { coach_id: string | null; player_account_id: string | null }
): Promise<NextResponse | null> {
  if (video.coach_id) {
    const auth = await requireCoachSession()
    if ('error' in auth) return auth.error
    if (video.coach_id !== auth.coachId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    return null
  }

  if (video.player_account_id) {
    const jwt = req.headers.get('authorization')?.replace('Bearer ', '')
    if (!jwt) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
    }
    const { data: { user }, error: authError } =
      await getSupabaseClient().auth.getUser(jwt)
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
    }
    const { data: account, error: accountError } = await getAdminClient()
      .from('player_accounts')
      .select('id')
      .eq('id', video.player_account_id)
      .eq('auth_user_id', user.id)
      .single()
    if (accountError || !account) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    return null
  }

  // Neither owner field set — shouldn't happen given chk_sv_has_owner, but
  // fail closed rather than let an inconsistent row through unverified.
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}

// GET /api/videos/[videoId] — fetch single video with fresh signed URL
//
// Ownership added 2026-07-19 (security audit) — see CLAUDE.md Gotcha #16.
// This route (GET/PATCH/DELETE) had zero ownership checks: any caller who
// knew a videoId could read, edit, or delete any coach's video/photo row,
// including obtaining a fresh signed playback URL to the file itself.
export async function GET(req: NextRequest, { params }: RouteContext) {
  try {
    const { videoId } = await params
    const db = getAdminClient()

    const { data: video, error } = await db
      .from('session_videos')
      .select('*')
      .eq('id', videoId)
      .single()

    if (error || !video) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 })
    }

    const denied = await checkOwnership(req, video)
    if (denied) return denied

    // Fresh 2-hour signed URL
    const { data: signed } = await db.storage
      .from('session-videos')
      .createSignedUrl(video.storage_path, 7200)

    return NextResponse.json({
      video: { ...video, public_url: signed?.signedUrl ?? null },
    })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/videos/[videoId] — update label, notes, drill type, baseline flag
export async function PATCH(req: NextRequest, { params }: RouteContext) {
  try {
    const { videoId } = await params
    const db = getAdminClient()

    const { data: existing, error: fetchError } = await db
      .from('session_videos')
      .select('coach_id, player_account_id')
      .eq('id', videoId)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 })
    }

    const denied = await checkOwnership(req, existing)
    if (denied) return denied

    const body = await req.json()

    const { data, error } = await db
      .from('session_videos')
      .update({
        label:      body.label,
        notes:      body.notes,
        drill_type: body.drill_type,
        is_baseline: body.is_baseline,
      })
      .eq('id', videoId)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ video: data })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/videos/[videoId] — delete video and storage file
//
// Storage-first (same discipline as DELETE /api/players/[playerId] and
// DELETE /api/sessions/[sessionId]): abort before touching the DB row if
// the storage delete fails, rather than leaving a DB row pointing at a
// file that may or may not still exist.
export async function DELETE(req: NextRequest, { params }: RouteContext) {
  try {
    const { videoId } = await params
    const db = getAdminClient()

    const { data: video, error: fetchError } = await db
      .from('session_videos')
      .select('coach_id, player_account_id, storage_path')
      .eq('id', videoId)
      .single()

    if (fetchError || !video) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 })
    }

    const denied = await checkOwnership(req, video)
    if (denied) return denied

    if (video.storage_path) {
      const { error: storageError } = await db.storage
        .from(STORAGE_BUCKET)
        .remove([video.storage_path])
      if (storageError) {
        console.error(
          `[DELETE /api/videos/${videoId}] storage delete failed, aborting — no DB row touched`,
          storageError
        )
        return NextResponse.json(
          { error: `Failed to delete storage file: ${storageError.message}` },
          { status: 500 }
        )
      }
    }

    const { error: deleteError } = await db
      .from('session_videos')
      .delete()
      .eq('id', videoId)

    if (deleteError) {
      console.error(
        `[DELETE /api/videos/${videoId}] storage file deleted but DB delete failed — needs manual reconciliation`,
        deleteError
      )
      return NextResponse.json(
        { error: `Storage file deleted but database cleanup failed: ${deleteError.message}. This needs manual reconciliation.` },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
