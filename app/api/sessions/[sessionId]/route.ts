import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/supabase'

type RouteContext = { params: Promise<{ sessionId: string }> }

// GET /api/sessions/[sessionId]
export async function GET(_req: NextRequest, { params }: RouteContext) {
  try {
    const { sessionId } = await params
    const db = getAdminClient()
    const { data, error } = await db
      .from('sessions')
      .select('*')
      .eq('id', sessionId)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    return NextResponse.json({ session: data })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/sessions/[sessionId] — update session notes/areas
export async function PATCH(req: NextRequest, { params }: RouteContext) {
  try {
    const { sessionId } = await params
    const body = await req.json()
    const db = getAdminClient()

    const { data, error } = await db
      .from('sessions')
      .update({
        strengths: body.strengths,
        improvements: body.improvements,
        root_causes: body.root_causes,
        notes: body.notes,
      })
      .eq('id', sessionId)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ session: data })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

const STORAGE_BUCKET = 'session-videos'

// DELETE /api/sessions/[sessionId]?coachId=X — hard-delete a session: its
// video files in Storage, both session_videos rows (side + front), and the
// parent sessions row.
//
// Storage-first (required order): video files are removed from Storage
// before any DB row is touched. If storage deletion fails, nothing is
// deleted — no DB rows are touched, so nothing is left referencing files
// that no longer exist. If a DB delete fails after storage succeeded, the
// failure is logged clearly (files are already gone; those rows now need
// manual reconciliation) rather than silently swallowed.
//
// Ownership: verified against a fresh DB read of the session's own
// coach_id, never trusted from the client. Coach-managed sessions only —
// a session with no coach_id (self-signup, owned via player_account_id
// instead) is refused, matching this app's ownership model
// (chk_sv_has_owner on session_videos).
export async function DELETE(req: NextRequest, { params }: RouteContext) {
  try {
    const { sessionId } = await params
    const coachId = req.nextUrl.searchParams.get('coachId')

    if (!coachId) {
      return NextResponse.json({ error: 'coachId is required' }, { status: 400 })
    }

    const db = getAdminClient()

    // ── Ownership check — fresh read, never trust the client ────────────────
    const { data: session, error: sessionError } = await db
      .from('sessions')
      .select('id, coach_id')
      .eq('id', sessionId)
      .single()

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }
    if (!session.coach_id || session.coach_id !== coachId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // ── Gather storage paths for every video tied to this session ──────────
    // Scoped by coach_id too, not just session_id — defense in depth so a
    // delete can never touch a row outside the verified owner's data even
    // in a hypothetical data-integrity edge case.
    const { data: videos, error: videosError } = await db
      .from('session_videos')
      .select('id, storage_path')
      .eq('session_id', sessionId)
      .eq('coach_id', coachId)

    if (videosError) {
      return NextResponse.json({ error: videosError.message }, { status: 500 })
    }

    const storagePaths = (videos ?? [])
      .map(v => v.storage_path)
      .filter((p): p is string => !!p)

    // ── Storage-first delete ─────────────────────────────────────────────────
    if (storagePaths.length > 0) {
      const { error: storageError } = await db.storage
        .from(STORAGE_BUCKET)
        .remove(storagePaths)

      if (storageError) {
        console.error(
          `[DELETE /api/sessions/${sessionId}] storage delete failed, aborting — no DB rows touched`,
          storageError
        )
        return NextResponse.json(
          { error: `Failed to delete storage files: ${storageError.message}` },
          { status: 500 }
        )
      }
    }

    // ── DB rows: session_videos, then the sessions row ──────────────────────
    const { error: videosDeleteError } = await db
      .from('session_videos')
      .delete()
      .eq('session_id', sessionId)
      .eq('coach_id', coachId)

    if (videosDeleteError) {
      console.error(
        `[DELETE /api/sessions/${sessionId}] storage files deleted but session_videos DB delete failed — needs manual reconciliation`,
        videosDeleteError
      )
      return NextResponse.json(
        { error: `Storage files deleted but database cleanup failed: ${videosDeleteError.message}. This needs manual reconciliation.` },
        { status: 500 }
      )
    }

    const { error: sessionDeleteError } = await db
      .from('sessions')
      .delete()
      .eq('id', sessionId)
      .eq('coach_id', coachId)

    if (sessionDeleteError) {
      console.error(
        `[DELETE /api/sessions/${sessionId}] video rows deleted but sessions row delete failed — needs manual reconciliation`,
        sessionDeleteError
      )
      return NextResponse.json(
        { error: `Video records deleted but session cleanup failed: ${sessionDeleteError.message}. This needs manual reconciliation.` },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, deletedVideoFiles: storagePaths.length })
  } catch (err) {
    console.error('DELETE /api/sessions/[sessionId] failed', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
