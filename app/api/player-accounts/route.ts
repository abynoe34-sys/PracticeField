import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/supabase'
import { Resend } from 'resend'
import { TERMS_VERSION } from '@/lib/constants'
import crypto from 'crypto'

const resend = new Resend(process.env.RESEND_API_KEY)
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://practice-field.vercel.app'

// Sender address: update once a custom domain is verified in Resend.
const FROM = 'Practice Field <onboarding@resend.dev>'

// Returns true if the player has not yet reached their 18th birthday as of
// today's actual date. Called at request time — no fixed reference date.
function isMinorToday(dateOfBirth: string): boolean {
  const dob = new Date(dateOfBirth)
  const eighteenthBirthday = new Date(
    dob.getFullYear() + 18,
    dob.getMonth(),
    dob.getDate()
  )
  return new Date() < eighteenthBirthday
}

// POST /api/player-accounts
//
// Creates a self-signup player account. Two distinct paths:
//
//   Adult (18+)
//     → Supabase Auth user created (unconfirmed)
//     → player_accounts row inserted (account_status = 'active' via trigger)
//     → consent records written: terms_of_service + privacy_policy + training_opt_in (if opted in)
//     → email verification link sent to the player via Resend
//     → returns { player_account, parental_consent_pending: false, email_verification_sent: true }
//
//   Minor (<18)
//     → requires parent_email in body; returns 400 if absent
//     → Supabase Auth user created (unconfirmed)
//     → player_accounts row inserted (account_status = 'pending_minor_consent' via trigger)
//       with parent_consent_token (64-char hex), expiry (30 days), and parent_email
//     → consent records written: terms_of_service + privacy_policy only
//       (training_opt_in is NOT recorded yet — parent decides on the consent page)
//     → email verification link sent to the player via Resend
//     → parental consent email sent to parent_email with /consent/[token] link
//     → returns { player_account, parental_consent_pending: true, email_verification_sent: true }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      email,
      password,
      display_name,
      date_of_birth,
      terms_agreed,
      training_opt_in = false,
      parent_email,
    } = body

    // ── Validation ────────────────────────────────────────────────────────────
    if (!email || !password || !display_name || !date_of_birth) {
      return NextResponse.json(
        { error: 'email, password, display_name, and date_of_birth are required.' },
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

    const isMinor = isMinorToday(date_of_birth)

    if (isMinor && !parent_email) {
      return NextResponse.json(
        { error: 'A parent or guardian email is required for players under 18.' },
        { status: 400 }
      )
    }
    if (isMinor && parent_email.trim().toLowerCase() === email.trim().toLowerCase()) {
      return NextResponse.json(
        { error: 'Parent/guardian email must be different from your own email.' },
        { status: 400 }
      )
    }

    const db = getAdminClient()
    const now = new Date().toISOString()
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
             ?? req.headers.get('x-real-ip')
             ?? null
    const ua = req.headers.get('user-agent') ?? null

    // ── Step 1: Create Supabase Auth user ─────────────────────────────────────
    // email_confirm: false → account exists but login is blocked until
    // the player clicks the verification link we send via Resend below.
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

    // ── Step 2: Generate email verification link ──────────────────────────────
    // We build and send the email ourselves (via Resend) so we control the
    // template. Supabase generates the signed token; we embed it in the email.
    const { data: linkData } = await db.auth.admin.generateLink({
      type: 'signup',
      email,
      password,
      options: { redirectTo: `${APP_URL}/player/dashboard` },
    })
    const verificationLink = linkData?.properties?.action_link ?? `${APP_URL}/player/login`

    // ── Step 3: Insert player_accounts row ────────────────────────────────────
    // The BEFORE INSERT trigger (trg_initialize_player_account) rewrites:
    //   is_minor, training_opt_in_requires_parent, account_status, parent_consent_status
    // The values we pass for those fields are overwritten before the row is stored.
    let parentConsentToken: string | null = null

    const insertPayload: Record<string, unknown> = {
      auth_user_id:                    authUserId,
      email,
      display_name,
      date_of_birth,
      // Trigger-computed placeholders — overwritten by trg_initialize_player_account
      is_minor:                        false,
      training_opt_in_requires_parent: false,
      account_status:                  'active',
      parent_consent_status:           'not_required',
      // Adults: honour the opt-in now.
      // Minors: stays false; parent sets it on the /consent/[token] page.
      training_opt_in: isMinor ? false : training_opt_in,
      terms_version:   TERMS_VERSION,
      terms_accepted_at: now,
    }

    if (isMinor) {
      parentConsentToken = crypto.randomBytes(32).toString('hex')
      Object.assign(insertPayload, {
        parent_email,
        parent_consent_token:            parentConsentToken,
        parent_consent_token_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        parent_consent_requested_at:     now,
      })
    }

    const { data: playerAccount, error: insertError } = await db
      .from('player_accounts')
      .insert(insertPayload)
      .select()
      .single()

    if (insertError) {
      // Roll back the auth user so the email address isn't stranded.
      await db.auth.admin.deleteUser(authUserId)
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    // ── Step 4: Write consent records ─────────────────────────────────────────
    type ConsentRow = {
      player_account_id: string
      consent_type:      string
      document_version:  string
      accepted:          boolean
      accepted_by_email: string | null
      ip_address:        string | null
      user_agent:        string | null
    }

    const consentRows: ConsentRow[] = [
      {
        player_account_id: playerAccount.id,
        consent_type:      'terms_of_service',
        document_version:  TERMS_VERSION,
        accepted:          true,
        accepted_by_email: email,
        ip_address:        ip,
        user_agent:        ua,
      },
      {
        player_account_id: playerAccount.id,
        consent_type:      'privacy_policy',
        document_version:  TERMS_VERSION,
        accepted:          true,
        accepted_by_email: email,
        ip_address:        ip,
        user_agent:        ua,
      },
    ]

    // Adults who opted in get a training_opt_in consent record now.
    // For minors, training_opt_in is deferred: the parent decides on the consent page,
    // and a training_opt_in record is written there if they approve.
    if (!isMinor && training_opt_in) {
      consentRows.push({
        player_account_id: playerAccount.id,
        consent_type:      'training_opt_in',
        document_version:  TERMS_VERSION,
        accepted:          true,
        accepted_by_email: email,
        ip_address:        ip,
        user_agent:        ua,
      })
    }

    await db.from('consent_records').insert(consentRows)

    // ── Step 5: Send emails via Resend ─────────────────────────────────────────

    // 5a. Email verification — sent to the player in both adult and minor cases.
    await resend.emails.send({
      from:    FROM,
      to:      email,
      subject: 'Verify your Practice Field account',
      html: `
        <p>Hi ${display_name},</p>
        <p>Thanks for signing up for Practice Field. Click the link below to verify your email address and activate your account:</p>
        <p><a href="${verificationLink}">Verify my email</a></p>
        <p>This link expires in 24 hours. If you didn't create this account, you can safely ignore this email.</p>
      `,
    })

    // 5b. Parental consent email — sent to parent_email for minor signups only.
    if (isMinor && parentConsentToken) {
      const consentUrl = `${APP_URL}/consent/${parentConsentToken}`
      await resend.emails.send({
        from:    FROM,
        to:      parent_email,
        subject: `Parental consent required — ${display_name}'s Practice Field account`,
        html: `
          <p>Hi,</p>
          <p>${display_name} has signed up for Practice Field, a football coaching and video analysis app, and listed you as their parent or guardian.</p>
          <p>Because ${display_name} is under 18, we need your consent before their account can be activated and before any videos can be uploaded or analysed.</p>
          <p><a href="${consentUrl}">Review and respond to the consent request</a></p>
          <p>This link expires in 30 days. If you did not expect this email, you can safely ignore it — the account will not be activated without your approval.</p>
        `,
      })
    }

    return NextResponse.json(
      {
        player_account:           playerAccount,
        parental_consent_pending: isMinor,
        email_verification_sent:  true,
      },
      { status: 201 }
    )
  } catch (err) {
    console.error('Player account signup error:', err)
    return NextResponse.json({ error: 'Signup failed. Please try again.' }, { status: 500 })
  }
}
