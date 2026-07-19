import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/supabase'
import { requireCoachSession } from '@/lib/require-coach'

type RouteContext = { params: Promise<{ playerId: string }> }

// GET /api/players/[playerId] — fetch a single player
//
// Ownership added 2026-07-19 (security audit) — this route previously had
// no ownership check at all, leaking a player's name, DOB, and consent/
// parent-email fields to anyone who knew or guessed a playerId. Same fix as
// every other route in this lineage: coachId derived from the session, a
// real 403 (not a masking 404) for a player that exists but belongs to a
// different coach.
export async function GET(_req: NextRequest, { params }: RouteContext) {
  try {
    const auth = await requireCoachSession()
    if ('error' in auth) return auth.error
    const { coachId } = auth

    const { playerId } = await params
    const db = getAdminClient()
    const { data, error } = await db
      .from('players')
      .select('*')
      .eq('id', playerId)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 })
    }
    if (data.coach_id !== coachId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json({ player: data })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/players/[playerId] — update player info
//
// Normal update: { name?, position?, experience_level? }
// Parental consent is handled exclusively via the /consent/[token] flow.
// Use POST /api/players/[playerId]/resend-consent to resend the consent email.
//
// Ownership added 2026-07-18 (unified accounts) — this route previously had
// no ownership check at all (a known, already-documented gap; see CLAUDE.md
// Gotcha #11's outstanding-audit note). coachId is derived from the
// session via requireCoachSession(), matching the DELETE route below.
export async function PATCH(req: NextRequest, { params }: RouteContext) {
  try {
    const auth = await requireCoachSession()
    if ('error' in auth) return auth.error
    const { coachId } = auth

    const { playerId } = await params
    const body = await req.json()
    const db = getAdminClient()

    const { data: existing, error: fetchError } = await db
      .from('players')
      .select('coach_id')
      .eq('id', playerId)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 })
    }
    if (existing.coach_id !== coachId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data, error } = await db
      .from('players')
      .update({
        name: body.name,
        position: body.position,
        experience_level: body.experience_level,
      })
      .eq('id', playerId)
      .eq('coach_id', coachId)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ player: data })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

const STORAGE_BUCKET = 'session-videos'

// DELETE /api/players/[playerId] — hard-delete a coach-managed player: all
// their video files in Storage, all session_videos rows, all sessions
// rows, and the player row itself.
//
// Storage-first (required order): every video file this player has is
// removed from Storage before any DB row is touched. If storage deletion
// fails, nothing is deleted. If a DB delete fails after storage succeeded,
// the failure is logged clearly rather than silently swallowed.
//
// Ownership (strengthened 2026-07-18, unified accounts): coachId is now
// derived from the caller's verified session (requireCoachSession()), not
// a client-supplied ?coachId= query param — a coachId can no longer be
// spoofed by simply passing a different value. Every subsequent query is
// also scoped by coach_id, not just player_id — defense in depth so a
// cascade can never reach across an ownership boundary even in a
// hypothetical data-integrity edge case.
//
// This route only ever operates on the `players` table, which holds
// coach-managed players exclusively — self-signup players live entirely in
// the separate `player_accounts` table and are structurally unreachable
// here (a player_accounts id simply won't match a players.id lookup).
//
// consent_records are intentionally NOT deleted. migration-v11 changed
// consent_records_player_id_fkey to ON DELETE SET NULL (it was CASCADE,
// which would have silently destroyed them), so deleting the player row
// below automatically nulls the link and retains the record — required
// for compliance regardless of which code path deletes the player.
export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  try {
    const auth = await requireCoachSession()
    if ('error' in auth) return auth.error
    const { coachId } = auth

    const { playerId } = await params

    const db = getAdminClient()

    // ── Ownership check — fresh read, never trust the client ────────────────
    const { data: player, error: playerError } = await db
      .from('players')
      .select('id, coach_id')
      .eq('id', playerId)
      .single()

    if (playerError || !player) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 })
    }
    if (player.coach_id !== coachId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // ── Gather storage paths for every video this player has ───────────────
    const { data: videos, error: videosError } = await db
      .from('session_videos')
      .select('id, storage_path')
      .eq('player_id', playerId)
      .eq('coach_id', coachId)

    if (videosError) {
      return NextResponse.json({ error: videosError.message }, { status: 500 })
    }

    // Reference photos (Feature B, BUILD_SPEC_photo_upload.md) — a separate
    // table from session_videos (see migration-v14), so a separate gather
    // step. reference_photos' FKs are ON DELETE CASCADE, which would clean
    // up the DB rows automatically, but NOT the Storage objects — Postgres
    // FK cascade only touches rows, never Storage. Explicit storage-first
    // cleanup here is required for the same reason it's required for videos.
    const { data: refPhotos, error: refPhotosError } = await db
      .from('reference_photos')
      .select('id, storage_path')
      .eq('player_id', playerId)
      .eq('coach_id', coachId)

    if (refPhotosError) {
      return NextResponse.json({ error: refPhotosError.message }, { status: 500 })
    }

    const storagePaths = [
      ...(videos ?? []).map(v => v.storage_path),
      ...(refPhotos ?? []).map(p => p.storage_path),
    ].filter((p): p is string => !!p)

    // ── Storage-first delete ─────────────────────────────────────────────────
    if (storagePaths.length > 0) {
      const { error: storageError } = await db.storage
        .from(STORAGE_BUCKET)
        .remove(storagePaths)

      if (storageError) {
        console.error(
          `[DELETE /api/players/${playerId}] storage delete failed, aborting — no DB rows touched`,
          storageError
        )
        return NextResponse.json(
          { error: `Failed to delete storage files: ${storageError.message}` },
          { status: 500 }
        )
      }
    }

    // ── DB rows: session_videos, reference_photos, sessions, then the player row ─
    const { error: videosDeleteError } = await db
      .from('session_videos')
      .delete()
      .eq('player_id', playerId)
      .eq('coach_id', coachId)

    if (videosDeleteError) {
      console.error(
        `[DELETE /api/players/${playerId}] storage files deleted but session_videos DB delete failed — needs manual reconciliation`,
        videosDeleteError
      )
      return NextResponse.json(
        { error: `Storage files deleted but database cleanup failed: ${videosDeleteError.message}. This needs manual reconciliation.` },
        { status: 500 }
      )
    }

    const { error: refPhotosDeleteError } = await db
      .from('reference_photos')
      .delete()
      .eq('player_id', playerId)
      .eq('coach_id', coachId)

    if (refPhotosDeleteError) {
      console.error(
        `[DELETE /api/players/${playerId}] storage files deleted but reference_photos DB delete failed — needs manual reconciliation`,
        refPhotosDeleteError
      )
      return NextResponse.json(
        { error: `Storage files deleted but database cleanup failed: ${refPhotosDeleteError.message}. This needs manual reconciliation.` },
        { status: 500 }
      )
    }

    const { error: sessionsDeleteError } = await db
      .from('sessions')
      .delete()
      .eq('player_id', playerId)
      .eq('coach_id', coachId)

    if (sessionsDeleteError) {
      console.error(
        `[DELETE /api/players/${playerId}] video rows deleted but sessions delete failed — needs manual reconciliation`,
        sessionsDeleteError
      )
      return NextResponse.json(
        { error: `Video records deleted but session cleanup failed: ${sessionsDeleteError.message}. This needs manual reconciliation.` },
        { status: 500 }
      )
    }

    const { error: playerDeleteError } = await db
      .from('players')
      .delete()
      .eq('id', playerId)
      .eq('coach_id', coachId)

    if (playerDeleteError) {
      console.error(
        `[DELETE /api/players/${playerId}] sessions/videos deleted but player row delete failed — needs manual reconciliation`,
        playerDeleteError
      )
      return NextResponse.json(
        { error: `Sessions deleted but player cleanup failed: ${playerDeleteError.message}. This needs manual reconciliation.` },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, deletedFiles: storagePaths.length })
  } catch (err) {
    console.error('DELETE /api/players/[playerId] failed', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
