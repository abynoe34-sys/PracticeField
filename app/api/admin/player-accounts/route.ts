import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/supabase'

// GET /api/admin/player-accounts
//
// Returns all player_accounts rows where needs_admin_review = true, plus a
// top-level flagged_count so callers can poll the count without parsing the list.
//
// Auth: requires x-admin-secret header matching the ADMIN_SECRET env var.
// This is the only protection since the project has no auth middleware yet.
export async function GET(req: NextRequest) {
  const secret = req.headers.get('x-admin-secret')
  if (!secret || secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db = getAdminClient()
  const { data: accounts, error } = await db
    .from('player_accounts')
    .select(
      'id, email, display_name, date_of_birth, is_minor, account_status, parent_consent_status, created_at'
    )
    .eq('needs_admin_review', true)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    flagged_count: accounts.length,
    accounts,
  })
}
