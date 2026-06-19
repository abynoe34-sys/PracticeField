import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient, getSupabaseClient } from '@/lib/supabase'

// GET /api/player-accounts/me
// Returns the authenticated player's account data.
// Requires Authorization: Bearer <jwt>
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

  const { data: account, error } = await getAdminClient()
    .from('player_accounts')
    .select('id, display_name, email, account_status, is_minor, training_opt_in')
    .eq('auth_user_id', user.id)
    .single()

  if (error || !account) {
    return NextResponse.json({ error: 'Account not found.' }, { status: 404 })
  }

  return NextResponse.json({ account })
}
