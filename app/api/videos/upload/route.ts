import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient, getSupabaseClient } from '@/lib/supabase'
import { generateId } from '@/lib/utils'
import { inngest } from '@/lib/inngest'

// Allow up to 60 seconds for large file uploads to Supabase Storage
export const maxDuration = 60

// POST /api/videos/upload
// Receives multipart form data: file + metadata fields.
//
// Two mutually exclusive ownership paths — a request must supply exactly one:
//
//   Coach-managed player:  player_id + coach_id  (no player_account_id)
//   Self-signup player:    player_account_id      (no player_id or coach_id)
//
// Supplying fields from both paths is rejected with 400 before any DB query.
//
// view_angle ('side' or 'front') is required on every request. Sessions
// support any number of clips per view. 'ready' is set when at least one
// clip of each view exists for the session — not exactly one of each.
//   - Both views represented → all view-tagged clips promoted to 'ready'
//   - Only one view present  → 'awaiting_side' or 'awaiting_front'
//   - No session_id          → 'awaiting_both' (cannot pair without a session)
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()

    const file            = formData.get('file') as File | null
    const playerId        = formData.get('player_id') as string | null
    const coachId         = formData.get('coach_id') as string | null
    const playerAccountId = formData.get('player_account_id') as string | null
    const sessionId       = formData.get('session_id') as string | null
    const viewAngle       = formData.get('view_angle') as string | null
    const label           = formData.get('label') as string | null
    const drillType       = formData.get('drill_type') as string | null
    const notes           = formData.get('notes') as string | null
    const isBaseline      = formData.get('is_baseline') === 'true'
    const recordedAt      = formData.get('recorded_at') as string | null

    if (!file) {
      return NextResponse.json({ error: 'file is required.' }, { status: 400 })
    }

    // ── view_angle validation ─────────────────────────────────────────────────
    // Checked here alongside other input-validation 400s, before the consent
    // gate. The consent gate below still runs before any DB or storage op.
    if (!viewAngle || !['side', 'front'].includes(viewAngle)) {
      return NextResponse.json(
        { error: 'view_angle is required and must be "side" or "front".' },
        { status: 400 }
      )
    }

    // ── Mutual exclusivity check ──────────────────────────────────────────────
    // Mirrors the chk_sv_has_owner constraint in session_videos: a video must
    // belong to exactly one owner type, never both.
    if (playerAccountId && (playerId || coachId)) {
      return NextResponse.json(
        { error: 'player_account_id cannot be combined with player_id or coach_id.' },
        { status: 400 }
      )
    }
    if (!playerAccountId && (!playerId || !coachId)) {
      return NextResponse.json(
        { error: 'Either player_id + coach_id, or player_account_id is required.' },
        { status: 400 }
      )
    }

    const db = getAdminClient()

    // ── Path A: coach-managed player ──────────────────────────────────────────
    // Fresh DB query every request — consent_status and parental_consent_status
    // come from the database row at this moment, never from the client.
    if (playerId && coachId) {
      const { data: player, error: playerError } = await db
        .from('players')
        .select('consent_status, parental_consent_status, is_minor')
        .eq('id', playerId)
        .eq('coach_id', coachId)
        .single()

      if (playerError || !player) {
        return NextResponse.json({ error: 'Player not found.' }, { status: 404 })
      }
      if (player.consent_status !== 'obtained') {
        return NextResponse.json(
          { error: 'Cannot upload video: player consent has not been obtained.' },
          { status: 403 }
        )
      }
      if (player.is_minor && player.parental_consent_status !== 'obtained') {
        return NextResponse.json(
          { error: 'Cannot upload video: parental consent is required for players under 18.' },
          { status: 403 }
        )
      }
    }

    // ── Path B: self-signup player account ────────────────────────────────────
    // Requires a valid Supabase Auth JWT in the Authorization header.
    // Identity is verified before the account status check runs — status error
    // messages are never visible to unauthenticated callers.
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

      // Fresh DB query — account_status read from the database at request time.
      // auth_user_id cross-check ensures only the verified owner of this account
      // can reach the status check below.
      const { data: account, error: accountError } = await db
        .from('player_accounts')
        .select('account_status')
        .eq('id', playerAccountId)
        .eq('auth_user_id', user.id)
        .single()

      if (accountError || !account) {
        return NextResponse.json({ error: 'Account not found.' }, { status: 404 })
      }

      // Both pending_minor_consent and restricted are explicitly rejected.
      // There is no partial-access state — only 'active' may upload.
      if (account.account_status === 'pending_minor_consent') {
        return NextResponse.json(
          { error: 'Account pending parental consent. Uploads are not permitted until a parent or guardian approves your account.' },
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

    // ── File validation ───────────────────────────────────────────────────────
    const allowed = ['video/mp4', 'video/quicktime', 'video/webm', 'video/x-msvideo']
    if (!allowed.includes(file.type)) {
      return NextResponse.json(
        { error: 'Unsupported file type. Use MP4, MOV, WebM, or AVI.' },
        { status: 400 }
      )
    }
    if (file.size > 524_288_000) {
      return NextResponse.json({ error: 'File too large. Max 500MB.' }, { status: 400 })
    }

    // ── Storage upload ────────────────────────────────────────────────────────
    const fileExt = file.name.split('.').pop() ?? 'mp4'
    const storagePath = playerAccountId
      ? `player-accounts/${playerAccountId}/${generateId()}.${fileExt}`
      : `${coachId}/${playerId}/${generateId()}.${fileExt}`

    const bytes = await file.arrayBuffer()
    const { error: uploadError } = await db.storage
      .from('session-videos')
      .upload(storagePath, bytes, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) {
      return NextResponse.json(
        { error: `Storage upload failed: ${uploadError.message}` },
        { status: 500 }
      )
    }

    // ── Determine initial analysis_status ─────────────────────────────────────
    // Without a session_id we cannot pair clips, so status stays 'awaiting_both'.
    // With a session_id, set 'awaiting_X' here, then check whether the opposite
    // view already has any clips. If so, all view-tagged clips in the session are
    // promoted to 'ready'. Check is server-side — client has no input into this.
    const pairedView = viewAngle === 'side' ? 'front' : 'side'
    const initialStatus = sessionId
      ? (viewAngle === 'side' ? 'awaiting_front' : 'awaiting_side')
      : 'awaiting_both'

    // ── session_videos row ────────────────────────────────────────────────────
    // Ownership fields are mutually exclusive — matches chk_sv_has_owner in the DB.
    const { data: videoRow, error: dbError } = await db
      .from('session_videos')
      .insert({
        ...(playerAccountId
          ? { player_account_id: playerAccountId }
          : { player_id: playerId, coach_id: coachId }),
        session_id:      sessionId || null,
        storage_path:    storagePath,
        file_name:       file.name,
        file_size_bytes: file.size,
        label:           label || file.name,
        drill_type:      drillType || 'general',
        notes:           notes || null,
        is_baseline:     isBaseline,
        recorded_at:     recordedAt || new Date().toISOString().split('T')[0],
        view_angle:      viewAngle,
        analysis_status: initialStatus,
        frame_paths:     [],
      })
      .select()
      .single()

    if (dbError) {
      await db.storage.from('session-videos').remove([storagePath])
      return NextResponse.json({ error: dbError.message }, { status: 500 })
    }

    // ── Paired-clip check ─────────────────────────────────────────────────────
    // Only possible when a session_id was supplied. Queries the DB directly —
    // the client has no input into this decision.
    if (sessionId) {
      const { data: pairedClip } = await db
        .from('session_videos')
        .select('id')
        .eq('session_id', sessionId)
        .eq('view_angle', pairedView)
        .limit(1)
        .maybeSingle()

      if (pairedClip) {
        // Both clips now exist for this session. Mark every clip in this session
        // that has a view_angle as ready (covers the case of re-uploads too).
        await db
          .from('session_videos')
          .update({ analysis_status: 'ready' })
          .eq('session_id', sessionId)
          .not('view_angle', 'is', null)

        // Fire the analysis job. Sent after both the insert and the status
        // promotion have succeeded — never before. Consent gate ran above.
        await inngest.send({
          name: 'analysis/session.ready',
          data: {
            session_id:        sessionId,
            ...(playerAccountId
              ? { player_account_id: playerAccountId }
              : { player_id: playerId }),
            drill_type:        drillType || 'general',
            triggered_at:      new Date().toISOString(),
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
    console.error('Video upload error:', err)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
