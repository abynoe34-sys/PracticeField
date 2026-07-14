import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient, getSupabaseClient } from '@/lib/supabase'
import { generateId } from '@/lib/utils'

// POST /api/videos/presign
//
// Runs the full consent gate and validation from the old upload route, then
// issues a Supabase signed upload URL. The browser uploads the file bytes
// directly to that URL (bypassing this server entirely), then calls
// /api/videos/confirm to write the DB row.
//
// Ownership paths and all validation are identical to /api/videos/upload —
// only the file bytes are absent from this request.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const {
      player_id:         playerId,
      coach_id:          coachId,
      player_account_id: playerAccountId,
      session_id:        sessionId,
      view_angle:        viewAngle,
      label,
      drill_type:        drillType,
      notes,
      is_baseline:       isBaseline,
      recorded_at:       recordedAt,
      file_name:         fileName,
      file_type:         fileType,
      file_size:         fileSize,
    } = body

    // ── view_angle validation ─────────────────────────────────────────────────
    if (viewAngle && !['side', 'front'].includes(viewAngle)) {
      return NextResponse.json(
        { error: 'view_angle must be "side" or "front".' },
        { status: 400 }
      )
    }

    // ── File type and size (cheap checks before hitting the DB) ───────────────
    const allowed = ['video/mp4', 'video/quicktime', 'video/webm', 'video/x-msvideo']
    if (!fileType || !allowed.includes(fileType)) {
      return NextResponse.json(
        { error: 'Unsupported file type. Use MP4, MOV, WebM, or AVI.' },
        { status: 400 }
      )
    }
    if (!fileSize || fileSize > 524_288_000) {
      return NextResponse.json({ error: 'File too large. Max 500MB.' }, { status: 400 })
    }

    // ── Mutual exclusivity check ──────────────────────────────────────────────
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
        .select('account_status')
        .eq('id', playerAccountId)
        .eq('auth_user_id', user.id)
        .single()

      if (accountError || !account) {
        return NextResponse.json({ error: 'Account not found.' }, { status: 404 })
      }

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

    // ── Build storage path (same pattern as the old upload route) ─────────────
    const fileExt    = (fileName as string | undefined)?.split('.').pop() ?? 'mp4'
    const storagePath = playerAccountId
      ? `player-accounts/${playerAccountId}/${generateId()}.${fileExt}`
      : `${coachId}/${playerId}/${generateId()}.${fileExt}`

    // ── Issue signed upload URL ───────────────────────────────────────────────
    const { data: signed, error: signError } = await db.storage
      .from('session-videos')
      .createSignedUploadUrl(storagePath)

    if (signError || !signed) {
      return NextResponse.json(
        { error: `Could not generate upload URL: ${signError?.message ?? 'unknown error'}` },
        { status: 500 }
      )
    }

    // Echo metadata so the confirm call doesn't require the browser to store it
    return NextResponse.json({
      signedUrl:   signed.signedUrl,
      token:       signed.token,
      storagePath,
      meta: {
        player_id:         playerId         ?? null,
        coach_id:          coachId          ?? null,
        player_account_id: playerAccountId  ?? null,
        session_id:        sessionId        ?? null,
        view_angle:        viewAngle        ?? null,
        label:             label            ?? null,
        drill_type:        drillType        ?? 'general',
        notes:             notes            ?? null,
        is_baseline:       isBaseline       ?? false,
        recorded_at:       recordedAt       ?? new Date().toISOString().split('T')[0],
        file_name:         fileName         ?? null,
        file_size:         fileSize         ?? null,
      },
    })
  } catch (err) {
    console.error('Presign error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
