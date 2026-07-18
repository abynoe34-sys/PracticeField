import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient, getSupabaseClient } from '@/lib/supabase'
import { generateId } from '@/lib/utils'
import { requireCoachSession } from '@/lib/require-coach'

// POST /api/reference-photos/presign
//
// Feature B (BUILD_SPEC_photo_upload.md) — plain reference images, no
// analysis. Same direct-to-storage pattern as /api/videos/presign (Vercel's
// body-size limit still applies to any route the file bytes would pass
// through), same ownership model, same consent gate — a reference image is
// still a photo of a possibly-minor player, so it gets the same protection
// analysis uploads do. Deliberately simpler than the video/photo route:
// no view_angle, no pairing, no drill_type.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const {
      player_id:         playerId,
      player_account_id: playerAccountId,
      session_id:        sessionId,
      caption,
      file_name:         fileName,
      file_type:         fileType,
      file_size:         fileSize,
    } = body

    const ALLOWED_PHOTO = ['image/jpeg', 'image/png']
    const MAX_PHOTO_BYTES = 20_971_520 // 20MB — matches the Feature A photo cap

    if (!fileType || !ALLOWED_PHOTO.includes(fileType)) {
      return NextResponse.json(
        { error: 'Unsupported file type. Use JPEG or PNG.' },
        { status: 400 }
      )
    }
    if (!fileSize || fileSize > MAX_PHOTO_BYTES) {
      return NextResponse.json({ error: 'File too large. Max 20MB.' }, { status: 400 })
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

    // ── Path A: coach-managed player — same session-derived ownership +
    //    consent gate as /api/videos/presign ──────────────────────────────────
    if (playerId) {
      const auth = await requireCoachSession()
      if ('error' in auth) return auth.error
      coachId = auth.coachId

      const { data: player, error: playerError } = await db
        .from('players')
        .select('coach_id, consent_status, parental_consent_status, is_minor')
        .eq('id', playerId)
        .single()

      if (playerError || !player) {
        return NextResponse.json({ error: 'Player not found.' }, { status: 404 })
      }
      if (player.coach_id !== coachId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      if (player.consent_status !== 'obtained') {
        return NextResponse.json(
          { error: 'Cannot upload photo: player consent has not been obtained.' },
          { status: 403 }
        )
      }
      if (player.is_minor && player.parental_consent_status !== 'obtained') {
        return NextResponse.json(
          { error: 'Cannot upload photo: parental consent is required for players under 18.' },
          { status: 403 }
        )
      }

      // A session-scoped reference photo must reference a session this coach
      // actually owns — same defense-in-depth as the video path.
      if (sessionId) {
        const { data: session, error: sessionError } = await db
          .from('sessions')
          .select('id, coach_id, player_id')
          .eq('id', sessionId)
          .single()
        if (sessionError || !session || session.coach_id !== coachId || session.player_id !== playerId) {
          return NextResponse.json({ error: 'Session not found.' }, { status: 404 })
        }
      }
    }

    // ── Path B: self-signup player account — same JWT self-verification as
    //    /api/videos/presign ────────────────────────────────────────────────
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

      if (sessionId) {
        const { data: session, error: sessionError } = await db
          .from('sessions')
          .select('id, player_account_id')
          .eq('id', sessionId)
          .single()
        if (sessionError || !session || session.player_account_id !== playerAccountId) {
          return NextResponse.json({ error: 'Session not found.' }, { status: 404 })
        }
      }
    }

    const fileExt = (fileName as string | undefined)?.split('.').pop() ?? 'jpg'
    const storagePath = playerAccountId
      ? `reference-photos/player-accounts/${playerAccountId}/${generateId()}.${fileExt}`
      : `reference-photos/${coachId}/${playerId}/${generateId()}.${fileExt}`

    const { data: signed, error: signError } = await db.storage
      .from('session-videos')
      .createSignedUploadUrl(storagePath)

    if (signError || !signed) {
      return NextResponse.json(
        { error: `Could not generate upload URL: ${signError?.message ?? 'unknown error'}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      signedUrl:   signed.signedUrl,
      token:       signed.token,
      storagePath,
      meta: {
        player_id:         playerId        ?? null,
        coach_id:          coachId         ?? null,
        player_account_id: playerAccountId ?? null,
        session_id:        sessionId       ?? null,
        caption:           caption         ?? null,
      },
    })
  } catch (err) {
    console.error('Reference photo presign error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
