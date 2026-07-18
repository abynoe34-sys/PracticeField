import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/supabase'
import { requireCoachSession } from '@/lib/require-coach'
import { Resend } from 'resend'
import { TERMS_VERSION } from '@/lib/constants'
import crypto from 'crypto'
import type { CreatePlayerRequest } from '@/types'

const resend = new Resend(process.env.RESEND_API_KEY)
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://practice-field.vercel.app'
const FROM = 'Practice Field <onboarding@resend.dev>'

// GET /api/players — list all players for the authenticated coach.
// coachId is derived from the session (requireCoachSession), not a query
// param — see lib/require-coach.ts.
export async function GET(req: NextRequest) {
  try {
    const auth = await requireCoachSession()
    if ('error' in auth) return auth.error
    const { coachId } = auth

    const db = getAdminClient()
    const { data, error } = await db
      .from('players')
      .select('*')
      .eq('coach_id', coachId)
      .order('name')

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ players: data ?? [] })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/players — create a new player
//
// For minor players: parental_consent_status is set to 'pending' and a
// consent email is dispatched to parent_email. The /consent/[token] flow
// (same as player_accounts) handles confirmation and flips the status to
// 'obtained' or 'refused'. The coach no longer attests parental consent via
// checkbox — the parent confirms directly by email.
export async function POST(req: NextRequest) {
  try {
    const auth = await requireCoachSession()
    if ('error' in auth) return auth.error
    const { coachId } = auth

    const body: CreatePlayerRequest = await req.json()

    if (!body.name) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 })
    }

    if (!body.player_consent) {
      return NextResponse.json(
        { error: 'Player consent must be confirmed before adding a player.' },
        { status: 400 }
      )
    }

    const db = getAdminClient()

    // Compute is_minor to decide consent path.
    // The DB trigger also computes and stores is_minor — this is for route logic.
    let isMinor = false
    if (body.date_of_birth) {
      const dob = new Date(body.date_of_birth)
      const cutoff = new Date()
      cutoff.setFullYear(cutoff.getFullYear() - 18)
      isMinor = dob > cutoff
    }

    if (isMinor && !body.parental_email) {
      return NextResponse.json(
        { error: 'parental_email is required for players under 18.' },
        { status: 400 }
      )
    }

    const now = new Date().toISOString()
    let parentConsentToken: string | null = null

    if (isMinor) {
      parentConsentToken = crypto.randomBytes(32).toString('hex')
    }

    const { data, error } = await db
      .from('players')
      .insert({
        coach_id:                coachId,
        name:                    body.name.trim(),
        position:                body.position ?? null,
        experience_level:        body.experience_level ?? 'beginner',
        date_of_birth:           body.date_of_birth ?? null,
        consent_status:          'obtained',
        // Minors: pending until parent confirms via email.
        // Adults: training_opt_in comes from the coach form checkbox.
        parental_consent_status: isMinor ? 'pending' : 'not_required',
        training_opt_in:         isMinor ? false : (body.training_opt_in ?? false),
        ...(isMinor && {
          parent_email:                    body.parental_email,
          parent_consent_token:            parentConsentToken,
          parent_consent_token_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          parent_consent_requested_at:     now,
        }),
      })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'A player with that name already exists for this coach.' },
          { status: 409 }
        )
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Write player_consent record (always — records the player's own agreement).
    // parental_consent record is written later by the consent route when the parent acts.
    type ConsentRow = {
      coach_id:          string
      player_id:         string
      consent_type:      string
      document_version:  string
      accepted:          boolean
      accepted_by_email: string | null
      ip_address:        string | null
      user_agent:        string | null
    }
    const consentRows: ConsentRow[] = [
      {
        coach_id:          coachId,
        player_id:         data.id,
        consent_type:      'player_consent',
        document_version:  TERMS_VERSION,
        accepted:          true,
        accepted_by_email: null,
        ip_address:        null,
        user_agent:        null,
      },
    ]

    // Adults who opt in get a training_opt_in record now.
    // For minors, training_opt_in is deferred to the parent consent page.
    if (!isMinor && body.training_opt_in) {
      consentRows.push({
        coach_id:          coachId,
        player_id:         data.id,
        consent_type:      'training_opt_in',
        document_version:  TERMS_VERSION,
        accepted:          true,
        accepted_by_email: null,
        ip_address:        null,
        user_agent:        null,
      })
    }

    await db.from('consent_records').insert(consentRows)

    // Send parental consent email for minor players.
    if (isMinor && parentConsentToken && body.parental_email) {
      const consentUrl = `${APP_URL}/consent/${parentConsentToken}`
      await resend.emails.send({
        from:    FROM,
        to:      body.parental_email,
        subject: `Parental consent required — ${data.name}'s Practice Field account`,
        html: `
          <p>Hi,</p>
          <p>${data.name} has been added to Practice Field by their coach. Practice Field is a football coaching and video analysis app.</p>
          <p>Because ${data.name} is under 18, we need your consent before any videos can be uploaded or analysed for them.</p>
          <p><a href="${consentUrl}">Review and respond to the consent request</a></p>
          <p>This link expires in 30 days. If you did not expect this email, you can safely ignore it — no videos will be uploaded without your approval.</p>
        `,
      })
    }

    return NextResponse.json(
      { player: data, parental_consent_pending: isMinor },
      { status: 201 }
    )
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
