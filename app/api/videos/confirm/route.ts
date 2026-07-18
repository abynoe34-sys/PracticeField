import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient, getSupabaseClient } from '@/lib/supabase'
import { inngest } from '@/lib/inngest'
import { requireCoachSession } from '@/lib/require-coach'

// Derived server-side from the actual uploaded file's extension — never
// trusted from the client. storage_path is authoritative: the signed URL
// from /presign only accepts an upload landing at that exact path, so its
// extension reflects what was truly validated and stored, not a claim.
const PHOTO_EXTENSIONS = ['jpg', 'jpeg', 'png']

function deriveMediaType(storagePath: string): 'video' | 'photo' {
  const ext = storagePath.split('.').pop()?.toLowerCase() ?? ''
  return PHOTO_EXTENSIONS.includes(ext) ? 'photo' : 'video'
}

// POST /api/videos/confirm
//
// Called after the browser has uploaded a file directly to Supabase Storage
// via the signed URL from /api/videos/presign. Writes the session_videos row
// and fires the Inngest analysis event when both clips are present.
//
// This is the tail of the old /api/videos/upload route — the consent gate
// ran in /presign, so it is not repeated here. The signed URL enforces that
// the file lands at the correct storage_path; only that path is accepted.
//
// Ownership (strengthened 2026-07-19, photo upload build) — same fix as
// /presign: the coach-managed path previously trusted `coach_id` from the
// body outright. This route is a separate request from /presign (nothing
// stops a client from calling it directly with a forged body), so it
// re-derives and re-verifies ownership independently rather than trusting
// presign's echoed meta.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const {
      storage_path:      storagePath,
      player_id:         playerId,
      player_account_id: playerAccountId,
      session_id:        sessionId,
      view_angle:        viewAngle,
      label,
      drill_type:        drillType,
      notes,
      is_baseline:       isBaseline,
      recorded_at:       recordedAt,
      file_name:         fileName,
      file_size:         fileSize,
    } = body

    if (!storagePath) {
      return NextResponse.json({ error: 'storage_path is required.' }, { status: 400 })
    }
    if (playerAccountId && playerId) {
      return NextResponse.json(
        { error: 'player_account_id cannot be combined with player_id.' },
        { status: 400 }
      )
    }
    if (!playerAccountId && !playerId) {
      return NextResponse.json(
        { error: 'Either player_id (coach-managed) or player_account_id (self-signup) is required.' },
        { status: 400 }
      )
    }

    const db = getAdminClient()
    let coachId: string | null = null

    // ── Path A: coach-managed player — coachId is session-derived, then
    //    confirmed to actually own playerId via a fresh DB read ──────────────
    if (playerId) {
      const auth = await requireCoachSession()
      if ('error' in auth) return auth.error
      coachId = auth.coachId

      // Same 404-vs-403 distinction as /presign — fetched without a coach_id
      // filter so a cross-owner attempt returns 403, not a masking 404.
      const { data: player, error: playerError } = await db
        .from('players')
        .select('id, coach_id')
        .eq('id', playerId)
        .single()

      if (playerError || !player) {
        return NextResponse.json({ error: 'Player not found.' }, { status: 404 })
      }
      if (player.coach_id !== coachId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    // ── Path B: self-signup player account — same JWT self-verification as
    //    /presign ────────────────────────────────────────────────────────────
    if (playerAccountId) {
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
        .select('id')
        .eq('id', playerAccountId)
        .eq('auth_user_id', user.id)
        .single()

      if (accountError || !account) {
        return NextResponse.json({ error: 'Account not found.' }, { status: 404 })
      }
    }

    const mediaType = deriveMediaType(storagePath)

    // ── Determine initial analysis_status (same logic as the old upload route) ─
    const pairedView    = viewAngle === 'side' ? 'front' : 'side'
    const initialStatus = sessionId
      ? (viewAngle === 'side' ? 'awaiting_front' : 'awaiting_side')
      : 'awaiting_both'

    // ── Insert session_videos row ─────────────────────────────────────────────
    const { data: videoRow, error: dbError } = await db
      .from('session_videos')
      .insert({
        ...(playerAccountId
          ? { player_account_id: playerAccountId }
          : { player_id: playerId, coach_id: coachId }),
        session_id:      sessionId  || null,
        storage_path:    storagePath,
        file_name:       fileName   || null,
        file_size_bytes: fileSize   || null,
        label:           label      || fileName || null,
        drill_type:      drillType  || 'general',
        notes:           notes      || null,
        is_baseline:     isBaseline ?? false,
        recorded_at:     recordedAt || new Date().toISOString().split('T')[0],
        view_angle:      viewAngle  || null,
        analysis_status: initialStatus,
        media_type:      mediaType,
        frame_paths:     [],
      })
      .select()
      .single()

    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 500 })
    }

    // ── Paired-clip check ─────────────────────────────────────────────────────
    if (sessionId && viewAngle) {
      const { data: pairedClip } = await db
        .from('session_videos')
        .select('id')
        .eq('session_id', sessionId)
        .eq('view_angle', pairedView)
        .limit(1)
        .maybeSingle()

      if (pairedClip) {
        await db
          .from('session_videos')
          .update({ analysis_status: 'ready' })
          .eq('session_id', sessionId)
          .not('view_angle', 'is', null)

        await inngest.send({
          name: 'analysis/session.ready',
          data: {
            session_id:   sessionId,
            ...(playerAccountId
              ? { player_account_id: playerAccountId }
              : { player_id: playerId }),
            drill_type:   drillType    || 'general',
            triggered_at: new Date().toISOString(),
          },
        })

        return NextResponse.json(
          { video: { ...videoRow, analysis_status: 'ready' }, session_ready: true },
          { status: 201 }
        )
      }
    }

    return NextResponse.json({ video: videoRow }, { status: 201 })
  } catch (err) {
    console.error('Confirm error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
