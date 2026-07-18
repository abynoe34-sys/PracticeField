import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient, getSupabaseClient } from '@/lib/supabase'

const STORAGE_BUCKET = 'session-videos'

// GET /api/reference-photos?coachId=X&playerId=Y[&sessionId=Z]
//   — coach-facing list, same query-param convention as GET /api/videos
//     (already indirectly protected: only ever called from pages under
//     app/[coachId]/layout.tsx's session gate).
// GET /api/reference-photos?playerAccountId=Z  (+ Authorization: Bearer <jwt>)
//   — player self-view, same self-verification as
//     /api/player-accounts/me/videos.
export async function GET(req: NextRequest) {
  try {
    const coachId          = req.nextUrl.searchParams.get('coachId')
    const playerId         = req.nextUrl.searchParams.get('playerId')
    const playerAccountId  = req.nextUrl.searchParams.get('playerAccountId')
    const sessionId        = req.nextUrl.searchParams.get('sessionId')

    if (!coachId && !playerAccountId) {
      return NextResponse.json(
        { error: 'coachId (+ playerId) or playerAccountId is required.' },
        { status: 400 }
      )
    }

    const db = getAdminClient()

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

    let query = db.from('reference_photos').select('*').order('created_at', { ascending: false })
    if (playerAccountId) {
      query = query.eq('player_account_id', playerAccountId)
    } else {
      query = query.eq('coach_id', coachId!)
      if (playerId) query = query.eq('player_id', playerId)
    }
    if (sessionId) query = query.eq('session_id', sessionId)

    const { data, error } = await query
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const photos = await Promise.all(
      (data ?? []).map(async (p) => {
        const { data: signed } = await db.storage
          .from(STORAGE_BUCKET)
          .createSignedUrl(p.storage_path, 3600)
        return { ...p, public_url: signed?.signedUrl ?? null }
      })
    )

    return NextResponse.json({ photos })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
