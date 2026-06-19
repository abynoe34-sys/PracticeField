import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient, getSupabaseClient } from '@/lib/supabase'

// GET /api/player-accounts/me/videos
// Returns the authenticated player's uploaded videos with fresh signed URLs.
// Requires Authorization: Bearer <jwt>
// Returns { videos: [] } for non-active accounts rather than an error,
// since the dashboard renders status states before reaching this call.
export async function GET(req: NextRequest) {
  const jwt = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!jwt) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  const { data: { user }, error: authError } =
    await getSupabaseClient().auth.getUser(jwt)
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  const db = getAdminClient()

  const { data: account } = await db
    .from('player_accounts')
    .select('id, account_status')
    .eq('auth_user_id', user.id)
    .single()

  if (!account) {
    return NextResponse.json({ error: 'Account not found.' }, { status: 404 })
  }

  // Non-active accounts have no uploadable videos; return empty rather than an error
  // so the dashboard can render its status state without a failed fetch.
  if (account.account_status !== 'active') {
    return NextResponse.json({ videos: [] })
  }

  const { data: rows, error } = await db
    .from('session_videos')
    .select('id, file_name, label, drill_type, recorded_at, analysis_status, storage_path')
    .eq('player_account_id', account.id)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Generate 1-hour signed URLs for each video
  const videos = await Promise.all(
    (rows ?? []).map(async (v) => {
      if (!v.storage_path) return { ...v, public_url: null }
      const { data: signed } = await db.storage
        .from('session-videos')
        .createSignedUrl(v.storage_path, 3600)
      return { ...v, public_url: signed?.signedUrl ?? null }
    })
  )

  return NextResponse.json({ videos })
}
