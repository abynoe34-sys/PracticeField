import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient, getSupabaseClient } from '@/lib/supabase'
import { requireCoachSession } from '@/lib/require-coach'

// POST /api/reference-photos/confirm
//
// Writes the reference_photos row after the browser has uploaded directly to
// Storage via the signed URL from /presign. No Inngest, no analysis_status —
// this is intentionally the entire lifecycle for a reference photo (see
// migration-v14's comment and CLAUDE.md Gotcha #8's lineage).
//
// Ownership re-verified independently here, same discipline as
// /api/videos/confirm — this is a separate request from /presign, so nothing
// stops a client calling it directly with a forged body.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const {
      storage_path:      storagePath,
      player_id:         playerId,
      player_account_id: playerAccountId,
      session_id:        sessionId,
      caption,
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

    if (playerId) {
      const auth = await requireCoachSession()
      if ('error' in auth) return auth.error
      coachId = auth.coachId

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

    const { data: photo, error: dbError } = await db
      .from('reference_photos')
      .insert({
        ...(playerAccountId
          ? { player_account_id: playerAccountId }
          : { player_id: playerId, coach_id: coachId }),
        session_id:   sessionId || null,
        storage_path: storagePath,
        caption:      caption   || null,
      })
      .select()
      .single()

    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 500 })
    }

    return NextResponse.json({ photo }, { status: 201 })
  } catch (err) {
    console.error('Reference photo confirm error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
