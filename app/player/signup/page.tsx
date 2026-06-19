'use client'

import { useState } from 'react'
import Link from 'next/link'

// Mirror of the API's isMinorToday — evaluated against new Date() at render time.
function isMinorFromDob(dob: string): boolean {
  if (!dob) return false
  const d = new Date(dob)
  const eighteenthBirthday = new Date(d.getFullYear() + 18, d.getMonth(), d.getDate())
  return new Date() < eighteenthBirthday
}

export default function PlayerSignupPage() {
  const [displayName,  setDisplayName]  = useState('')
  const [email,        setEmail]        = useState('')
  const [password,     setPassword]     = useState('')
  const [dateOfBirth,  setDateOfBirth]  = useState('')
  const [parentEmail,  setParentEmail]  = useState('')
  const [termsAgreed,  setTermsAgreed]  = useState(false)
  const [trainingOptIn, setTrainingOptIn] = useState(false)
  const [loading,      setLoading]      = useState(false)
  const [error,        setError]        = useState<string | null>(null)
  const [done,         setDone]         = useState<'adult' | 'minor' | null>(null)

  // Recomputed on every render from the current dateOfBirth value and new Date().
  const isMinor = isMinorFromDob(dateOfBirth)

  // A minor supplying their own email as the parent email defeats the consent requirement.
  const parentEmailSameAsPlayer =
    isMinor &&
    parentEmail.trim() !== '' &&
    parentEmail.trim().toLowerCase() === email.trim().toLowerCase()

  const canSubmit =
    displayName.trim() &&
    email.trim() &&
    password.length >= 8 &&
    dateOfBirth &&
    termsAgreed &&
    (!isMinor || parentEmail.trim()) &&
    !parentEmailSameAsPlayer

  const handleSubmit = async () => {
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/player-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          display_name:   displayName,
          date_of_birth:  dateOfBirth,
          terms_agreed:   termsAgreed,
          training_opt_in: trainingOptIn,
          parent_email:   isMinor ? parentEmail : undefined,
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? 'Signup failed. Please try again.')
        return
      }
      setDone(json.parental_consent_pending ? 'minor' : 'adult')
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // ── Success states ──────────────────────────────────────────────────────────

  if (done === 'adult') {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-4 bg-field-dark">
        <div className="w-full max-w-sm text-center space-y-4">
          <div className="text-5xl">✅</div>
          <h1 className="text-2xl font-bold text-white">Check your email</h1>
          <p className="text-sm text-gray-400 leading-relaxed">
            We sent a verification link to{' '}
            <span className="text-white font-medium">{email}</span>.
            Click it to activate your account and log in.
          </p>
          <Link href="/" className="block text-sm text-brand-400 hover:text-brand-300 pt-2">
            ← Back to Practice Field
          </Link>
        </div>
      </main>
    )
  }

  if (done === 'minor') {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-4 bg-field-dark">
        <div className="w-full max-w-sm text-center space-y-4">
          <div className="text-5xl">📧</div>
          <h1 className="text-2xl font-bold text-white">Two emails sent</h1>
          <p className="text-sm text-gray-400 leading-relaxed">
            A verification link is on its way to{' '}
            <span className="text-white font-medium">{email}</span>.
          </p>
          <p className="text-sm text-gray-400 leading-relaxed">
            A consent request has been sent to your parent or guardian at{' '}
            <span className="text-white font-medium">{parentEmail}</span>.
            Your account will be activated once they approve.
          </p>
          <Link href="/" className="block text-sm text-brand-400 hover:text-brand-300 pt-2">
            ← Back to Practice Field
          </Link>
        </div>
      </main>
    )
  }

  // ── Signup form ─────────────────────────────────────────────────────────────

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 bg-field-dark">
      <div className="w-full max-w-sm space-y-5">

        <div className="text-center">
          <Link href="/" className="text-sm text-brand-400 hover:text-brand-300">
            ← Back to Practice Field
          </Link>
          <h1 className="text-3xl font-bold text-white mt-4">Create your player account</h1>
          <p className="text-sm text-gray-500 mt-1">
            Track your progress and get AI coaching feedback.
          </p>
        </div>

        <div className="space-y-3">

          <div>
            <label className="block text-xs text-gray-400 mb-1">Display name</label>
            <input
              type="text"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              placeholder="Your name"
              className="w-full bg-field-card border border-field-border rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-brand-600"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full bg-field-card border border-field-border rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-brand-600"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              className="w-full bg-field-card border border-field-border rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-brand-600"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">Date of birth</label>
            <input
              type="date"
              value={dateOfBirth}
              onChange={e => setDateOfBirth(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
              className="w-full bg-field-card border border-field-border rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-brand-600"
            />
          </div>

          {/* Minor gate — only rendered when DOB is set and player is under 18 */}
          {dateOfBirth && isMinor && (
            <div className="bg-amber-950/40 border border-amber-700/50 rounded-xl p-4 space-y-3">
              <p className="text-xs text-amber-300 leading-relaxed">
                Because you&apos;re under 18, a parent or guardian must approve your account
                before it can be activated. We&apos;ll send them a consent request by email.
              </p>
              <div>
                <label className="block text-xs text-gray-400 mb-1">
                  Parent or guardian email
                </label>
                <input
                  type="email"
                  value={parentEmail}
                  onChange={e => setParentEmail(e.target.value)}
                  placeholder="parent@example.com"
                  className={`w-full bg-field-card rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none transition-colors ${
                    parentEmailSameAsPlayer
                      ? 'border border-red-500 focus:border-red-400'
                      : 'border border-amber-700/50 focus:border-amber-600'
                  }`}
                />
                {parentEmailSameAsPlayer && (
                  <p className="mt-1.5 text-xs text-red-400">
                    Parent/guardian email must be different from your own email.
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="space-y-3 pt-1">
            {/* Terms — required, shown for everyone */}
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={termsAgreed}
                onChange={e => setTermsAgreed(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-field-border bg-field-card accent-brand-600 cursor-pointer"
              />
              <span className="text-xs text-gray-400 leading-relaxed">
                I agree to the{' '}
                <a href="/terms" target="_blank" rel="noopener noreferrer"
                   className="text-brand-400 underline hover:text-brand-300">
                  Terms of Service
                </a>{' '}
                and{' '}
                <a href="/privacy" target="_blank" rel="noopener noreferrer"
                   className="text-brand-400 underline hover:text-brand-300">
                  Privacy Policy
                </a>
                .{' '}<span className="text-gray-500">Required.</span>
              </span>
            </label>

            {/* Training opt-in — adults only. Not rendered for minors at all.
                Parent decides training opt-in on the /consent/[token] page. */}
            {!isMinor && (
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={trainingOptIn}
                  onChange={e => setTrainingOptIn(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-field-border bg-field-card accent-brand-600 cursor-pointer"
                />
                <span className="text-xs text-gray-400 leading-relaxed">
                  I opt in to AI-powered video analysis — uploaded practice clips will be
                  processed to identify technique issues and generate training recommendations.{' '}
                  <span className="text-gray-500">Optional.</span>
                </span>
              </label>
            )}
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-400 text-center">{error}</p>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading || !canSubmit}
          className="w-full bg-brand-600 hover:bg-brand-500 disabled:opacity-60 text-white font-bold py-4 px-6 rounded-xl text-lg transition-colors"
        >
          {loading ? 'Creating your account…' : 'Create account'}
        </button>

        <p className="text-center text-xs text-gray-600">
          Already have an account?{' '}
          <Link href="/player/login" className="text-brand-400 hover:text-brand-300">
            Log in
          </Link>
        </p>

      </div>
    </main>
  )
}
