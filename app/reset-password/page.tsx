'use client'

// app/reset-password/page.tsx
//
// Step 2 of password recovery: the `redirectTo` target the emailed link lands
// on. Sets a new password against the recovery session Supabase establishes.
//
// Why this handles three token shapes: Supabase delivers the recovery
// credential differently depending on how the link was created.
//   • `?code=...`        — PKCE. What resetPasswordForEmail() produces when
//                          called from the browser client (@supabase/ssr's
//                          createBrowserClient uses the PKCE flow), because a
//                          code verifier was stashed locally when it was
//                          requested. Needs exchangeCodeForSession().
//   • `?token_hash=...`  — the verify-endpoint shape. Needs verifyOtp().
//   • `#access_token=…`  — implicit flow. What an admin-generated recovery
//                          link (auth.admin.generateLink, no local verifier)
//                          redirects with. supabase-js's detectSessionInUrl
//                          consumes this automatically on client init, so
//                          here we just wait for the session to appear.
// Handling only one of these would work in dev and break in production (or
// vice-versa), so all three are covered explicitly.
//
// Guarding: a visit with NO recovery credential at all shows the friendly
// "invalid or expired" state — deliberately including the case where the
// visitor happens to already be logged in, so this page can't be used as a
// no-token password-change backdoor. The URL is scrubbed via replaceState once
// the credential is consumed, so the token isn't left sitting in the address
// bar / history / any subsequent Referer header.

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import type { AuthChangeEvent, Session } from '@supabase/supabase-js'
import { getSupabaseClient } from '@/lib/supabase'
import { validatePassword, PASSWORD_REQUIREMENT } from '@/lib/password'

type Phase = 'checking' | 'ready' | 'invalid' | 'done'

export default function ResetPasswordPage() {
  const [phase,    setPhase]    = useState<Phase>('checking')
  const [password, setPassword] = useState('')
  const [confirm,  setConfirm]  = useState('')
  const [error,    setError]    = useState<string | null>(null)
  const [saving,   setSaving]   = useState(false)

  useEffect(() => {
    // Read the URL synchronously, before touching the Supabase client —
    // detectSessionInUrl strips the hash as soon as the client initializes.
    const href = window.location.href
    const url = new URL(href)
    const hashParams = new URLSearchParams(url.hash.replace(/^#/, ''))

    const code        = url.searchParams.get('code')
    const tokenHash   = url.searchParams.get('token_hash')
    const type        = url.searchParams.get('type') ?? hashParams.get('type')
    const hashToken   = hashParams.get('access_token')
    const errorParam  = url.searchParams.get('error') ?? hashParams.get('error')

    const supabase = getSupabaseClient()
    let settled = false
    let timers: ReturnType<typeof setTimeout>[] = []

    const scrubUrl = () => {
      // Drop the credential from the address bar without a navigation.
      window.history.replaceState({}, '', '/reset-password')
    }

    const settle = (ok: boolean) => {
      if (settled) return
      settled = true
      timers.forEach(clearTimeout)
      scrubUrl()
      setPhase(ok ? 'ready' : 'invalid')
    }

    // The implicit-flow session may land via the client's own URL detection
    // rather than an explicit call below.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
      if (session && (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN' || event === 'INITIAL_SESSION')) {
        settle(true)
      }
    })

    ;(async () => {
      // Supabase bounced us here with an explicit failure (expired/used link).
      if (errorParam) { settle(false); return }

      if (code) {
        const { error: exErr } = await supabase.auth.exchangeCodeForSession(code)
        settle(!exErr)
        return
      }

      if (tokenHash && type === 'recovery') {
        const { error: otpErr } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: 'recovery',
        })
        settle(!otpErr)
        return
      }

      if (hashToken) {
        // detectSessionInUrl is consuming it; poll briefly for the session.
        for (const delay of [0, 300, 800, 1500]) {
          timers.push(setTimeout(async () => {
            if (settled) return
            const { data } = await supabase.auth.getSession()
            if (data.session) settle(true)
            else if (delay === 1500) settle(false)
          }, delay))
        }
        return
      }

      // No recovery credential in the URL at all — direct visit.
      settle(false)
    })()

    return () => {
      subscription.unsubscribe()
      timers.forEach(clearTimeout)
    }
  }, [])

  const handleSave = async () => {
    setError(null)

    const ruleError = validatePassword(password)
    if (ruleError) { setError(ruleError); return }
    if (password !== confirm) { setError('Passwords do not match.'); return }

    setSaving(true)
    try {
      const supabase = getSupabaseClient()
      const { error: updateError } = await supabase.auth.updateUser({ password })
      if (updateError) {
        setError(updateError.message)
        return
      }
      // Don't leave a half-authenticated recovery session behind — end it and
      // make them sign in fresh with the new password.
      await supabase.auth.signOut()
      setPhase('done')
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setSaving(false)
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
          <h1 className="text-3xl font-bold text-white mt-4">
            {phase === 'done' ? 'Password updated' : 'Set a new password'}
          </h1>
          {phase === 'ready' && (
            <p className="text-sm text-white/60 mt-1">
              Choose a new password for your account.
            </p>
          )}
        </div>

        {phase === 'checking' && (
          <p className="text-sm text-white/60 text-center py-4">Verifying your link…</p>
        )}

        {phase === 'invalid' && (
          <div className="space-y-4">
            <div className="bg-field-card border border-brand-700 rounded-md p-5 text-center space-y-2">
              <p className="text-sm font-semibold text-brand-300">This link is invalid or has expired</p>
              <p className="text-xs text-white/60 leading-relaxed">
                Password reset links can only be used once, and expire after a short time.
                Request a new one to continue.
              </p>
            </div>
            <Link
              href="/forgot-password"
              className="block w-full bg-brand-600 hover:bg-brand-500 text-white font-bold py-4 px-6 rounded-md text-lg text-center transition-colors"
            >
              Request a new link
            </Link>
            <p className="text-center text-xs text-white/50">
              <Link href="/login" className="text-white hover:underline">
                Return to log in
              </Link>
            </p>
          </div>
        )}

        {phase === 'ready' && (
          <>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-white/70 mb-1">New password</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder={PASSWORD_REQUIREMENT}
                  className="w-full bg-field-card border border-field-border rounded-md px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-brand-600"
                />
              </div>
              <div>
                <label className="block text-xs text-white/70 mb-1">Confirm new password</label>
                <input
                  type="password"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !saving && handleSave()}
                  placeholder="Re-enter your new password"
                  className="w-full bg-field-card border border-field-border rounded-md px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-brand-600"
                />
              </div>
            </div>

            {error && (
              <p className="text-sm text-brand-300 text-center">{error}</p>
            )}

            <button
              onClick={handleSave}
              disabled={saving || !password || !confirm}
              className="w-full bg-brand-600 hover:bg-brand-500 disabled:opacity-60 text-white font-bold py-4 px-6 rounded-md text-lg transition-colors"
            >
              {saving ? 'Updating…' : 'Update password'}
            </button>
          </>
        )}

        {phase === 'done' && (
          <div className="space-y-4">
            <div className="text-center text-5xl">✅</div>
            <p className="text-sm text-white/70 leading-relaxed text-center">
              Your password has been updated. Log in with your new password to continue.
            </p>
            <Link
              href="/login"
              className="block w-full bg-brand-600 hover:bg-brand-500 text-white font-bold py-4 px-6 rounded-md text-lg text-center transition-colors"
            >
              Go to log in
            </Link>
          </div>
        )}
      </div>
    </main>
  )
}
