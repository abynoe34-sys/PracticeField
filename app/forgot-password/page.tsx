'use client'

// app/forgot-password/page.tsx
//
// Step 1 of password recovery: the user asks for a reset link.
//
// One entry point serves EVERY login-capable account. Coaches and players are
// both plain Supabase `auth.users` rows (coaches gained auth_user_id in
// migration-v12; player_accounts always had one) — they differ only in which
// profile table references them, which recovery doesn't care about. So a
// single resetPasswordForEmail call covers both roles.
//
// NOTE (deferred dependency): Resend currently only delivers to pre-approved
// addresses, so a real user will not receive this email yet. The flow is built
// and verified end-to-end via Supabase's admin link generation; it goes live
// for real users when the email-delivery workstream lands. See CLAUDE.md.
//
// Anti-enumeration: the confirmation below is shown UNCONDITIONALLY — same
// text, same timing-insensitive path, whether or not the address has an
// account, and even if Supabase returns an error. Surfacing "no such user" (or
// even a different error state) here would turn this form into an account
// existence oracle.

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { getSupabaseClient } from '@/lib/supabase'

export default function ForgotPasswordPage() {
  const [email,   setEmail]   = useState('')
  const [loading, setLoading] = useState(false)
  const [sent,    setSent]    = useState(false)

  const handleSubmit = async () => {
    if (!email.trim()) return
    setLoading(true)
    try {
      await getSupabaseClient().auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      })
    } catch {
      // Swallowed deliberately — see the anti-enumeration note above. A
      // network/config failure must not render differently from success, or
      // the difference itself leaks information.
    } finally {
      // Always land on the same confirmation, regardless of outcome.
      setSent(true)
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 bg-brand-gradient">
      <div className="w-full max-w-sm space-y-5">
        <div className="text-center">
          <Image
            src="/practice-field-mark.png"
            alt="Practice Field"
            width={72}
            height={72}
            className="mx-auto rounded-md"
            priority
          />
          <Link href="/login" className="text-sm text-white/70 hover:text-white mt-4 inline-block">
            ← Back to log in
          </Link>
          <h1 className="text-3xl font-bold text-white mt-2">
            {sent ? 'Check your email' : 'Reset your password'}
          </h1>
          <p className="text-sm text-white/60 mt-1">
            {sent
              ? 'If an account exists for that email, a reset link has been sent.'
              : 'Enter your email and we’ll send you a link to set a new password.'}
          </p>
        </div>

        {sent ? (
          <div className="space-y-4">
            <p className="text-sm text-white/70 leading-relaxed text-center">
              The link expires shortly and can only be used once. If it doesn’t arrive,
              check your spam folder, or request another one.
            </p>
            <button
              onClick={() => { setSent(false); setEmail('') }}
              className="w-full bg-field-card border border-field-border hover:border-brand-600 text-white font-medium py-3 rounded-md text-sm transition-colors"
            >
              Request another link
            </button>
            <p className="text-center text-xs text-white/50">
              <Link href="/login" className="text-white hover:underline">
                Return to log in
              </Link>
            </p>
          </div>
        ) : (
          <>
            <div>
              <label className="block text-xs text-white/70 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !loading && handleSubmit()}
                placeholder="you@example.com"
                className="w-full bg-field-card border border-field-border rounded-md px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-brand-600"
              />
            </div>

            <button
              onClick={handleSubmit}
              disabled={loading || !email.trim()}
              className="w-full bg-brand-600 hover:bg-brand-500 disabled:opacity-60 text-white font-bold py-4 px-6 rounded-md text-lg transition-colors"
            >
              {loading ? 'Sending…' : 'Send reset link'}
            </button>

            <p className="text-center text-xs text-white/50">
              Remembered it?{' '}
              <Link href="/login" className="text-white hover:underline">
                Log in
              </Link>
            </p>
          </>
        )}
      </div>
    </main>
  )
}
