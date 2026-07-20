// lib/password.ts
//
// Single source of truth for the password rule, so signup and password-reset
// can never drift apart. Before this, the "at least 8 characters" rule was
// duplicated inline in CoachSignupForm, PlayerSignupForm, and both signup API
// routes; the reset flow needs the identical rule, so it lives here now.
//
// Deliberately mirrors the rule the server already enforces
// (app/api/coaches/signup, app/api/player-accounts: `password.length < 8` →
// 400) — this is the client-side half of the same contract, not a new or
// stricter policy. If the rule ever changes, change it here AND in those two
// routes (the server must stay authoritative; a client-only rule is not a
// security control).

export const MIN_PASSWORD_LENGTH = 8

/** Human-readable requirement, shown as placeholder/help text. */
export const PASSWORD_REQUIREMENT = `At least ${MIN_PASSWORD_LENGTH} characters`

/**
 * Returns an error message if the password is unacceptable, or null if it's
 * fine. Null means valid — callers can use `validatePassword(pw) === null`.
 */
export function validatePassword(password: string): string | null {
  if (!password || password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`
  }
  return null
}

/** Convenience boolean for enabling/disabling submit buttons. */
export function isPasswordValid(password: string): boolean {
  return validatePassword(password) === null
}
