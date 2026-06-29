import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/supabase'
import { TERMS_VERSION } from '@/lib/constants'

type RouteContext = { params: Promise<{ token: string }> }

// GET /api/consent/[token]
// Returns { display_name, managed_by_coach } — nothing else.
// Returns 404 (no body) for invalid, expired, or already-used tokens.
// All three failure states are intentionally indistinguishable to the caller.
//
// Checks player_accounts first, then players (coach-managed minors).
export async function GET(_req: NextRequest, { params }: RouteContext) {
  const { token } = await params
  const db  = getAdminClient()
  const now = new Date().toISOString()

  // Self-signup player account path
  const { data: pa } = await db
    .from('player_accounts')
    .select('display_name')
    .eq('parent_consent_token', token)
    .gt('parent_consent_token_expires_at', now)
    .single()

  if (pa) {
    return NextResponse.json({ display_name: pa.display_name, managed_by_coach: false })
  }

  // Coach-managed player path
  const { data: player } = await db
    .from('players')
    .select('name')
    .eq('parent_consent_token', token)
    .gt('parent_consent_token_expires_at', now)
    .single()

  if (player) {
    return NextResponse.json({ display_name: player.name, managed_by_coach: true })
  }

  return new NextResponse(null, { status: 404 })
}

// POST /api/consent/[token]
// Body: { decision: 'confirmed' | 'declined', training_opt_in?: boolean }
//
// Checks player_accounts first, then players.
//
// player_accounts confirm:  account_status = 'active', parent_consent_status = 'obtained'
// player_accounts decline:  account_status = 'restricted', parent_consent_status = 'declined'
// players confirm:          parental_consent_status = 'obtained', training_opt_in set
// players decline:          parental_consent_status = 'refused' (per CHECK constraint)
//
// Token is nulled on any submission — the link is single-use regardless of outcome.
export async function POST(req: NextRequest, { params }: RouteContext) {
  const { token } = await params
  const body = await req.json()
  const { decision, training_opt_in = false } = body

  if (decision !== 'confirmed' && decision !== 'declined') {
    return NextResponse.json(
      { error: 'decision must be confirmed or declined.' },
      { status: 400 }
    )
  }

  const db  = getAdminClient()
  const now = new Date().toISOString()

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
           ?? req.headers.get('x-real-ip')
           ?? null
  const ua = req.headers.get('user-agent') ?? null

  const isConfirm = decision === 'confirmed'

  // ── Path A: self-signup player account ────────────────────────────────────

  const { data: paAccount } = await db
    .from('player_accounts')
    .select('id, parent_email')
    .eq('parent_consent_token', token)
    .gt('parent_consent_token_expires_at', now)
    .single()

  if (paAccount) {
    // Null the token immediately — single-use enforcement.
    await db
      .from('player_accounts')
      .update({
        parent_consent_status:           isConfirm ? 'obtained'   : 'declined',
        account_status:                  isConfirm ? 'active'     : 'restricted',
        training_opt_in:                 isConfirm ? training_opt_in : false,
        parent_consent_token:            null,
        parent_consent_token_expires_at: null,
        parent_consent_confirmed_at:     now,
      })
      .eq('id', paAccount.id)

    type PaConsentRow = {
      player_account_id: string
      consent_type:      string
      document_version:  string
      accepted:          boolean
      accepted_by_email: string | null
      ip_address:        string | null
      user_agent:        string | null
    }
    const paRows: PaConsentRow[] = [
      {
        player_account_id: paAccount.id,
        consent_type:      'parental_consent',
        document_version:  TERMS_VERSION,
        accepted:          isConfirm,
        accepted_by_email: paAccount.parent_email,
        ip_address:        ip,
        user_agent:        ua,
      },
    ]
    if (isConfirm && training_opt_in) {
      paRows.push({
        player_account_id: paAccount.id,
        consent_type:      'training_opt_in',
        document_version:  TERMS_VERSION,
        accepted:          true,
        accepted_by_email: paAccount.parent_email,
        ip_address:        ip,
        user_agent:        ua,
      })
    }
    await db.from('consent_records').insert(paRows)

    return NextResponse.json({ decision })
  }

  // ── Path B: coach-managed player ──────────────────────────────────────────

  const { data: player } = await db
    .from('players')
    .select('id, name, coach_id, parent_email')
    .eq('parent_consent_token', token)
    .gt('parent_consent_token_expires_at', now)
    .single()

  if (!player) {
    return new NextResponse(null, { status: 404 })
  }

  // Null the token immediately — single-use enforcement.
  await db
    .from('players')
    .update({
      // 'refused' is the players table's CHECK-constraint value for a declined consent.
      parental_consent_status:         isConfirm ? 'obtained' : 'refused',
      training_opt_in:                 isConfirm ? training_opt_in : false,
      parent_consent_token:            null,
      parent_consent_token_expires_at: null,
      parent_consent_confirmed_at:     now,
    })
    .eq('id', player.id)

  type PlayerConsentRow = {
    coach_id:          string
    player_id:         string
    consent_type:      string
    document_version:  string
    accepted:          boolean
    accepted_by_email: string | null
    ip_address:        string | null
    user_agent:        string | null
  }
  const playerRows: PlayerConsentRow[] = [
    {
      coach_id:          player.coach_id,
      player_id:         player.id,
      consent_type:      'parental_consent',
      document_version:  TERMS_VERSION,
      accepted:          isConfirm,
      accepted_by_email: player.parent_email,
      ip_address:        ip,
      user_agent:        ua,
    },
  ]
  if (isConfirm && training_opt_in) {
    playerRows.push({
      coach_id:          player.coach_id,
      player_id:         player.id,
      consent_type:      'training_opt_in',
      document_version:  TERMS_VERSION,
      accepted:          true,
      accepted_by_email: player.parent_email,
      ip_address:        ip,
      user_agent:        ua,
    })
  }
  await db.from('consent_records').insert(playerRows)

  return NextResponse.json({ decision })
}
