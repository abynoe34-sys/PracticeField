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
    .select('id, display_name, email, account_status, is_minor, training_opt_in, position')
    .eq('auth_user_id', user.id)
    .single()

  if (error || !account) {
    return NextResponse.json({ error: 'Account not found.' }, { status: 404 })
  }

  return NextResponse.json({ account })
}

// PATCH /api/player-accounts/me
// Updates the authenticated player's own editable profile fields (currently
// just `position` — the broad FootballPosition profile field, Position capture
// build). Ownership is the caller's JWT identity — the update is scoped by
// auth_user_id, so a player can only ever change their own row.
export async function PATCH(req: NextRequest) {
  const jwt = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!jwt) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  const { data: { user }, error: authError } =
    await getSupabaseClient().auth.getUser(jwt)
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  // position is free-text FootballPosition (mirrors players.position — no DB
  // CHECK); '' / null clears it. Only this field is updatable here.
  const position: string | null =
    typeof body.position === 'string' && body.position.trim() !== '' ? body.position.trim() : null

  const { data: account, error } = await getAdminClient()
    .from('player_accounts')
    .update({ position })
    .eq('auth_user_id', user.id)
    .select('id, display_name, email, account_status, is_minor, training_opt_in, position')
    .single()

  if (error || !account) {
    return NextResponse.json({ error: 'Account not found.' }, { status: 404 })
  }

  return NextResponse.json({ account })
}
