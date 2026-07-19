import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/supabase'
import { requireCoachSession } from '@/lib/require-coach'
import { Resend } from 'resend'
import crypto from 'crypto'

type RouteContext = { params: Promise<{ playerId: string }> }

const resend  = new Resend(process.env.RESEND_API_KEY)
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://practice-field.vercel.app'
const FROM    = 'Practice Field <onboarding@resend.dev>'

// POST /api/players/[playerId]/resend-consent
// Regenerates the parental consent token and resends the consent email.
// Only valid for minor players whose parental_consent_status is 'pending'.
//
// Ownership added 2026-07-19 (security audit) — this route had NO auth at
// all: anyone who knew or guessed a playerId could trigger a resend to
// that player's parent, an abuse/spam vector with no rate limiting.
// coachId is now derived from the session, matching every other
// player-scoped mutation.
export async function POST(_req: NextRequest, { params }: RouteContext) {
  try {
    const auth = await requireCoachSession()
    if ('error' in auth) return auth.error
    const { coachId } = auth

    const { playerId } = await params
    const db = getAdminClient()

    const { data: player, error } = await db
      .from('players')
      .select('id, coach_id, name, is_minor, parental_consent_status, parent_email')
      .eq('id', playerId)
      .single()

    if (error || !player) {
      return NextResponse.json({ error: 'Player not found.' }, { status: 404 })
    }
    if (player.coach_id !== coachId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (!player.is_minor) {
      return NextResponse.json({ error: 'Player is not a minor.' }, { status: 400 })
    }

    if (player.parental_consent_status !== 'pending') {
      return NextResponse.json(
        { error: 'Cannot resend — consent is not in pending state.' },
        { status: 400 }
      )
    }

    if (!player.parent_email) {
      return NextResponse.json({ error: 'No parent email on record.' }, { status: 400 })
    }

    const token = crypto.randomBytes(32).toString('hex')
    const now   = new Date().toISOString()

    await db
      .from('players')
      .update({
        parent_consent_token:            token,
        parent_consent_token_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        parent_consent_requested_at:     now,
      })
      .eq('id', playerId)

    const consentUrl = `${APP_URL}/consent/${token}`
    await resend.emails.send({
      from:    FROM,
      to:      player.parent_email,
      subject: `Parental consent required — ${player.name}'s Practice Field account`,
      html: `
        <p>Hi,</p>
        <p>This is a reminder that ${player.name} has been added to Practice Field by their coach.</p>
        <p>We need your consent before any videos can be uploaded or analysed for them.</p>
        <p><a href="${consentUrl}">Review and respond to the consent request</a></p>
        <p>This link expires in 30 days.</p>
      `,
    })

    return NextResponse.json({ sent: true })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
