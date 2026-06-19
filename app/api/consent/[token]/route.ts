import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/supabase'
import { TERMS_VERSION } from '@/lib/constants'

type RouteContext = { params: Promise<{ token: string }> }

// GET /api/consent/[token]
// Returns only { display_name } — nothing else.
// Returns 404 (no body) for invalid, expired, or already-used tokens.
// All three states are intentionally indistinguishable to the caller.
export async function GET(_req: NextRequest, { params }: RouteContext) {
  const { token } = await params
  const db = getAdminClient()

  const { data } = await db
    .from('player_accounts')
    .select('display_name')
    .eq('parent_consent_token', token)
    .gt('parent_consent_token_expires_at', new Date().toISOString())
    .single()

  if (!data) {
    return new NextResponse(null, { status: 404 })
  }

  return NextResponse.json({ display_name: data.display_name })
}

// POST /api/consent/[token]
// Body: { decision: 'confirmed' | 'declined', training_opt_in?: boolean }
//
// Confirm path:
//   player_accounts → parent_consent_status = 'obtained', account_status = 'active',
//                     training_opt_in = body.training_opt_in, token nulled
//   consent_records → parental_consent (accepted=true)
//                   + training_opt_in (accepted=true) if opted in
//
// Decline path:
//   player_accounts → parent_consent_status = 'declined', account_status = 'restricted',
//                     token nulled
//   consent_records → parental_consent (accepted=false)
//
// Token is nulled on any submission — the link cannot be reused.
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

  // Same validity check as GET — 404 for all failure cases, no distinction.
  const { data: account } = await db
    .from('player_accounts')
    .select('id, parent_email')
    .eq('parent_consent_token', token)
    .gt('parent_consent_token_expires_at', now)
    .single()

  if (!account) {
    return new NextResponse(null, { status: 404 })
  }

  const isConfirm = decision === 'confirmed'

  // Null the token immediately — enforces single-use regardless of what follows.
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
    .eq('id', account.id)

  // Write consent records
  type ConsentRow = {
    player_account_id: string
    consent_type:      string
    document_version:  string
    accepted:          boolean
    accepted_by_email: string | null
    ip_address:        string | null
    user_agent:        string | null
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
           ?? req.headers.get('x-real-ip')
           ?? null
  const ua = req.headers.get('user-agent') ?? null

  const consentRows: ConsentRow[] = [
    {
      player_account_id: account.id,
      consent_type:      'parental_consent',
      document_version:  TERMS_VERSION,
      accepted:          isConfirm,
      accepted_by_email: account.parent_email,
      ip_address:        ip,
      user_agent:        ua,
    },
  ]

  if (isConfirm && training_opt_in) {
    consentRows.push({
      player_account_id: account.id,
      consent_type:      'training_opt_in',
      document_version:  TERMS_VERSION,
      accepted:          true,
      accepted_by_email: account.parent_email,
      ip_address:        ip,
      user_agent:        ua,
    })
  }

  await db.from('consent_records').insert(consentRows)

  return NextResponse.json({ decision })
}
