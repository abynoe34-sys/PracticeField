import { Resend } from 'resend'

// ─────────────────────────────────────────────────────────────────────────────
// Player-facing consent notification emails (minor self-signup flow).
//
// These are the two notifications a *minor player* receives around the parental
// consent flow — separate from the parent's consent email and from the player's
// signup verification email (both of which live in their own route files and are
// unchanged). Coach-managed minors (players table) have no player email address,
// so these apply only to the self-signup path (player_accounts).
//
// WHY THIS IS A DEDICATED MODULE: the minor-consent flow is under legal review.
// The owner wants the CONTENT and the TRIGGER of these emails — especially the
// signup-time one to an as-yet-unconsented minor — to be trivially editable or
// disable-able after legal guidance, without a deep rebuild. So the templates
// and the on/off switch all live here, in one obvious place. Edit the copy in
// the template functions below; flip the flag below to disable.
// ─────────────────────────────────────────────────────────────────────────────

const resend = new Resend(process.env.RESEND_API_KEY)

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://practice-field.vercel.app'

// Shared sender — matches the address used by every other transactional email in
// the app (parent consent, signup verification, coach signup). Update in ONE
// place here + the sibling routes once a custom Resend domain is verified — see
// the email-workstream launch checklist in CLAUDE.md.
const FROM = 'Practice Field <onboarding@resend.dev>'

// ── On/off switch: signup-time notification to an UNCONSENTED minor ───────────
// This is the legally sensitive email — it contacts a minor whose parental
// consent is still PENDING, which is exactly the piece legal guidance may
// constrain. To disable it entirely WITHOUT a code change, set the environment
// variable MINOR_SIGNUP_PLAYER_EMAIL=off (then redeploy). Or flip the default
// literal below to `false`. Disabling it does NOT affect the parent consent
// email or the post-approval player email — those keep working.
export const MINOR_SIGNUP_PLAYER_EMAIL_ENABLED =
  process.env.MINOR_SIGNUP_PLAYER_EMAIL !== 'off'

// ── Template: signup-time minor notification (parental consent still PENDING) ─
// Keep this minimal and neutral: acknowledge the signup and that a parent/
// guardian approval is pending. Do NOT collect anything or imply the account is
// active. This is the copy most likely to change per legal advice — edit here.
function minorSignupPendingTemplate(displayName: string) {
  return {
    subject: 'Your Practice Field signup — parent/guardian approval pending',
    html: `
      <p>Hi ${displayName},</p>
      <p>Thanks for signing up for Practice Field. Because you're under 18, a parent
      or guardian needs to approve your account before you can start using it.</p>
      <p>We've emailed your parent or guardian to ask for their approval. We'll send
      you another email once they've approved, and then you'll be able to log in.</p>
      <p>Nothing else is needed from you right now. If you didn't sign up for Practice
      Field, you can safely ignore this email.</p>
    `,
  }
}

// ── Template: post-approval "consent established" notification ────────────────
// Reports an already-established, legitimate fact (approval happened) — low legal
// risk. No consent decision, no data collection. Edit copy here.
function consentEstablishedTemplate(displayName: string, loginUrl: string) {
  return {
    subject: "You're approved — your Practice Field account is active",
    html: `
      <p>Hi ${displayName},</p>
      <p>Good news — your parent or guardian has approved your Practice Field account.
      You can now log in and get started.</p>
      <p><a href="${loginUrl}">Log in to Practice Field</a></p>
    `,
  }
}

// ── Send: signup-time minor notification ──────────────────────────────────────
// Best-effort. Gated by the on/off flag above. Never throws — a failed
// notification must not break signup. Returns whether a send was attempted.
export async function sendMinorSignupPlayerNotification(params: {
  playerEmail: string
  displayName: string
}): Promise<boolean> {
  if (!MINOR_SIGNUP_PLAYER_EMAIL_ENABLED) return false
  try {
    const { subject, html } = minorSignupPendingTemplate(params.displayName)
    await resend.emails.send({ from: FROM, to: params.playerEmail, subject, html })
    return true
  } catch (err) {
    console.error('Minor signup player notification failed (non-fatal):', err)
    return false
  }
}

// ── Send: post-approval "consent established" notification ────────────────────
// Best-effort. Never throws — a failed notification must not break the consent
// approval flow. Returns whether a send was attempted.
export async function sendConsentEstablishedPlayerNotification(params: {
  playerEmail: string
  displayName: string
}): Promise<boolean> {
  try {
    const loginUrl = `${APP_URL}/login`
    const { subject, html } = consentEstablishedTemplate(params.displayName, loginUrl)
    await resend.emails.send({ from: FROM, to: params.playerEmail, subject, html })
    return true
  } catch (err) {
    console.error('Consent-established player notification failed (non-fatal):', err)
    return false
  }
}
