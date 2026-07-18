'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
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
    <main className="min-h-screen flex flex-col items-center justify-center px-4 bg-field-dark">
      <div className="w-full max-w-sm space-y-5">
        <div className="text-center">
          <Link href="/" className="text-sm text-brand-400 hover:text-brand-300">
            ← Back to Practice Field
          </Link>
          <h1 className="text-3xl font-bold text-white mt-4">Log in</h1>
          <p className="text-sm text-gray-500 mt-1">Works for both coach and player accounts.</p>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
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
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              placeholder="Your password"
              className="w-full bg-field-card border border-field-border rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-brand-600"
            />
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-400 text-center">{error}</p>
        )}

        <button
          onClick={handleLogin}
          disabled={loading || !email.trim() || !password}
          className="w-full bg-brand-600 hover:bg-brand-500 disabled:opacity-60 text-white font-bold py-4 px-6 rounded-xl text-lg transition-colors"
        >
          {loading ? 'Logging in…' : 'Log in'}
        </button>

        <p className="text-center text-xs text-gray-600">
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="text-brand-400 hover:text-brand-300">
            Sign up
          </Link>
        </p>
      </div>
    </main>
  )
}
