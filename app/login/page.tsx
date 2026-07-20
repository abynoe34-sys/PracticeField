'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { getSupabaseClient } from '@/lib/supabase'

// Unified sign-in entry point (2026-07-18). One form for both roles — after
// a successful sign-in, GET /api/whoami resolves whether this session
// belongs to a coach or a player and routes accordingly. Coaches previously
// had no sign-in at all (just a coach_id typed into the landing page);
// players had their own separate /player/login with identical form logic.
export default function LoginPage() {
  const router = useRouter()
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState<string | null>(null)

  const handleLogin = async () => {
    setError(null)
    setLoading(true)
    try {
      const { data, error: signInError } = await getSupabaseClient().auth.signInWithPassword({
        email,
        password,
      })
      if (signInError) {
        setError(signInError.message)
        return
      }

      const jwt = data.session?.access_token
      if (!jwt) {
        setError('Sign-in succeeded but no session was returned. Please try again.')
        return
      }

      const res = await fetch('/api/whoami', {
        headers: { Authorization: `Bearer ${jwt}` },
      })
      const who = await res.json()

      if (!res.ok) {
        setError(who.error ?? 'Could not determine your account. Please contact support.')
        return
      }

      if (who.role === 'coach') {
        router.push(`/${who.coachId}`)
      } else if (who.role === 'player') {
        router.push('/player/dashboard')
      } else {
        setError('Unrecognized account type.')
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
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
          <Link href="/" className="text-sm text-white/70 hover:text-white mt-4 inline-block">
            ← Back to Practice Field
          </Link>
          <h1 className="text-3xl font-bold text-white mt-2">Log in</h1>
          <p className="text-sm text-white/60 mt-1">Works for both coach and player accounts.</p>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs text-white/70 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              placeholder="you@example.com"
              className="w-full bg-field-card border border-field-border rounded-md px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-brand-600"
            />
          </div>
          <div>
            <div className="flex items-baseline justify-between mb-1">
              <label className="block text-xs text-white/70">Password</label>
              {/* One reset entry point for both roles — coaches and players are
                  both Supabase auth.users, so recovery is identical. */}
              <Link
                href="/forgot-password"
                className="text-xs text-white/60 hover:text-white transition-colors"
              >
                Forgot password?
              </Link>
            </div>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              placeholder="Your password"
              className="w-full bg-field-card border border-field-border rounded-md px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-brand-600"
            />
          </div>
        </div>

        {error && (
          <p className="text-sm text-brand-300 text-center">{error}</p>
        )}

        <button
          onClick={handleLogin}
          disabled={loading || !email.trim() || !password}
          className="w-full bg-brand-600 hover:bg-brand-500 disabled:opacity-60 text-white font-bold py-4 px-6 rounded-md text-lg transition-colors"
        >
          {loading ? 'Logging in…' : 'Log in'}
        </button>

        <p className="text-center text-xs text-white/50">
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="text-white hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </main>
  )
}
