// components/CoachSignupForm.tsx
//
// New for unified accounts (2026-07-18) — coaches previously had no signup
// form at all (the old "Start Coaching" button on app/page.tsx created a
// coach with no email or password via POST /api/coach). Calls the new
// POST /api/coaches/signup.

'use client'

import { useState } from 'react'
import Link from 'next/link'
import { isPasswordValid, PASSWORD_REQUIREMENT } from '@/lib/password'

export default function CoachSignupForm() {
  const [name,         setName]         = useState('')
  const [teamName,     setTeamName]     = useState('')
  const [email,        setEmail]        = useState('')
  const [password,     setPassword]     = useState('')
  const [termsAgreed,  setTermsAgreed]  = useState(false)
  const [loading,      setLoading]      = useState(false)
  const [error,        setError]        = useState<string | null>(null)
  const [done,         setDone]         = useState(false)

  const canSubmit = email.trim() && isPasswordValid(password) && termsAgreed

  const handleSubmit = async () => {
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/coaches/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          name: name.trim() || undefined,
          team_name: teamName.trim() || undefined,
          terms_agreed: termsAgreed,
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? 'Signup failed. Please try again.')
        return
      }
      setDone(true)
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <div className="w-full max-w-sm text-center space-y-4">
        <div className="text-5xl">✅</div>
        <h1 className="text-2xl font-bold text-white">Check your email</h1>
        <p className="text-sm text-white/70 leading-relaxed">
          We sent a verification link to{' '}
          <span className="text-white font-medium">{email}</span>.
          Click it to activate your account, then log in.
        </p>
        <Link href="/login" className="block text-sm text-brand-400 hover:text-brand-300 pt-2">
          Go to login →
        </Link>
      </div>
    )
  }

  return (
    <div className="w-full max-w-sm space-y-5">
      <div className="space-y-3">
        <div>
          <label className="block text-xs text-white/70 mb-1">Your name</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Coach name (optional)"
            className="w-full bg-field-card border border-field-border rounded-md px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-brand-600"
          />
        </div>

        <div>
          <label className="block text-xs text-white/70 mb-1">Team name</label>
          <input
            type="text"
            value={teamName}
            onChange={e => setTeamName(e.target.value)}
            placeholder="Team name (optional)"
            className="w-full bg-field-card border border-field-border rounded-md px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-brand-600"
          />
        </div>

        <div>
          <label className="block text-xs text-white/70 mb-1">Email</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full bg-field-card border border-field-border rounded-md px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-brand-600"
          />
        </div>

        <div>
          <label className="block text-xs text-white/70 mb-1">Password</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder={PASSWORD_REQUIREMENT}
            className="w-full bg-field-card border border-field-border rounded-md px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-brand-600"
          />
        </div>

        <label className="flex items-start gap-3 cursor-pointer pt-1">
          <input
            type="checkbox"
            checked={termsAgreed}
            onChange={e => setTermsAgreed(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-field-border bg-field-card accent-brand-600 cursor-pointer"
          />
          <span className="text-xs text-white/70 leading-relaxed">
            I agree to the{' '}
            <a href="/terms" target="_blank" rel="noopener noreferrer"
               className="text-white underline hover:text-white/80">
              Terms of Service
            </a>{' '}
            and{' '}
            <a href="/privacy" target="_blank" rel="noopener noreferrer"
               className="text-white underline hover:text-white/80">
              Privacy Policy
            </a>
            .{' '}<span className="text-white/50">Required.</span>
          </span>
        </label>
      </div>

      {error && (
        <p className="text-sm text-brand-300 text-center">{error}</p>
      )}

      <button
        onClick={handleSubmit}
        disabled={loading || !canSubmit}
        className="w-full bg-brand-600 hover:bg-brand-500 disabled:opacity-60 text-white font-bold py-4 px-6 rounded-md text-lg transition-colors"
      >
        {loading ? 'Creating your account…' : 'Create coach account'}
      </button>
    </div>
  )
}
