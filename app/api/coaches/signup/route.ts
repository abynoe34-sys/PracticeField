import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/supabase'
import { generateCoachId } from '@/lib/utils'
import { TERMS_VERSION } from '@/lib/constants'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://practice-field.vercel.app'
const FROM = 'Practice Field <onboarding@resend.dev>'

// POST /api/coaches/signup — unified-accounts coach sign-up (2026-07-18).
//
// Mirrors app/api/player-accounts/route.ts's shape (real Supabase Auth
// user created server-side via the admin API, email_confirm: false, a
// verification link sent ourselves via Resend) rather than inventing a
// different pattern. No minor/parental-consent branching here — that's
// player-specific.
//
// Replaces the old anonymous flow (POST /api/coach, no password, no email
// requirement at all) as the way real coach accounts get created. That
// route still exists for now but is unused by the UI as of this change.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      email,
      password,
      name,
      team_name,
      terms_agreed,
    } = body

    if (!email || !password) {
      return NextResponse.json(
        { error: 'email and password are required.' },
        { status: 400 }
      )
    }
    if (!terms_agreed) {
      return NextResponse.json(
        { error: 'You must accept the Terms of Service and Privacy Policy.' },
        { status: 400 }
      )
    }
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters.' },
        { status: 400 }
      )
    }

    const db = getAdminClient()
    const now = new Date().toISOString()
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
             ?? req.headers.get('x-real-ip')
             ?? null
    const ua = req.headers.get('user-agent') ?? null

    // ── Step 1: Create the Supabase Auth user ──────────────────────────────
    const { data: authData, error: authError } = await db.auth.admin.createUser({
      email,
      password,
      email_confirm: false,
    })
    if (authError) {
      const duplicate = authError.message.toLowerCase().includes('already')
      return NextResponse.json(
        { error: duplicate ? 'An account with this email already exists.' : authError.message },
        { status: duplicate ? 409 : 500 }
      )
    }
    const authUserId = authData.user.id

    // ── Step 2: Generate the email verification link ──────────────────────
    const { data: linkData } = await db.auth.admin.generateLink({
      type: 'signup',
      email,
      password,
      options: { redirectTo: `${APP_URL}/login` },
    })
    const verificationLink = linkData?.properties?.action_link ?? `${APP_URL}/login`

    // ── Step 3: Insert the coaches row, linked to the auth user ────────────
    const coachId = generateCoachId()

    const { data: coach, error: insertError } = await db
      .from('coaches')
      .insert({
        coach_id: coachId,
        auth_user_id: authUserId,
        name: name || null,
        email,
        team_name: team_name || null,
        sport: 'american_football',
        terms_version: TERMS_VERSION,
        terms_accepted_at: now,
      })
      .select()
      .single()

    if (insertError) {
      // Roll back the auth user so the email address isn't stranded.
      await db.auth.admin.deleteUser(authUserId)
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    // ── Step 4: Consent records ─────────────────────────────────────────────
    await db.from('consent_records').insert([
      {
        coach_id: coachId,
        player_id: null,
        consent_type: 'terms_of_service',
        document_version: TERMS_VERSION,
        accepted: true,
        accepted_by_email: email,
        ip_address: ip,
        user_agent: ua,
      },
      {
        coach_id: coachId,
        player_id: null,
        consent_type: 'privacy_policy',
        document_version: TERMS_VERSION,
        accepted: true,
        accepted_by_email: email,
        ip_address: ip,
        user_agent: ua,
      },
    ])

    // ── Step 5: Send verification email via Resend ──────────────────────────
    await resend.emails.send({
      from: FROM,
      to: email,
      subject: 'Verify your Practice Field coach account',
      html: `
        <p>Hi${name ? ` ${name}` : ''},</p>
        <p>Thanks for signing up for Practice Field. Click the link below to verify your email address and activate your account:</p>
        <p><a href="${verificationLink}">Verify my email</a></p>
        <p>This link expires in 24 hours. If you didn't create this account, you can safely ignore this email.</p>
      `,
    })

    return NextResponse.json(
      { coach, email_verification_sent: true },
      { status: 201 }
    )
  } catch (err) {
    console.error('Coach signup error:', err)
    return NextResponse.json({ error: 'Signup failed. Please try again.' }, { status: 500 })
  }
}
