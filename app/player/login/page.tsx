'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getSupabaseClient } from '@/lib/supabase'

export default function PlayerLoginPage() {
  const router = useRouter()
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState<string | null>(null)

  const canSubmit = email.trim() && password.length > 0

  const handleLogin = async () => {
    setError(null)
    setLoading(true)
    try {
      const { error: authError } = await getSupabaseClient().auth.signInWithPassword({
        email,
        password,
      })
      if (authError) {
        const msg = authError.message.toLowerCase()
        if (msg.includes('email not confirmed')) {
          setError('Please verify your email first. Check your inbox for a verification link.')
        } else if (msg.includes('invalid login credentials') || msg.includes('invalid email or password')) {
          setError('Incorrect email or password.')
        } else {
          setError(authError.message)
        }
        return
      }
      router.push('/player/dashboard')
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 bg-field-dark">
      <div className="w-full max-w-sm space-y-6">

        <div className="text-center space-y-1">
          <Link href="/" className="text-xs text-brand-400 hover:text-brand-300 transition-colors">
            ← Practice Field
          </Link>
          <h1 className="text-3xl font-bold text-white pt-2">Player sign in</h1>
          <p className="text-sm text-gray-500">Sign in to your player account.</p>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Email</label>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && canSubmit && handleLogin()}
              placeholder="you@example.com"
              className="w-full bg-field-card border border-field-border rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-brand-600 transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Password</label>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && canSubmit && handleLogin()}
              placeholder="••••••••"
              className="w-full bg-field-card border border-field-border rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-brand-600 transition-colors"
            />
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-400 text-center leading-relaxed">{error}</p>
        )}

        <button
          onClick={handleLogin}
          disabled={loading || !canSubmit}
          className="w-full bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white font-bold py-4 px-6 rounded-xl text-base transition-colors"
        >
          {loading ? 'Signing in…' : 'Sign in'}
        </button>

        <p className="text-center text-xs text-gray-600">
          Don&apos;t have an account?{' '}
          <Link href="/player/signup" className="text-brand-400 hover:text-brand-300 transition-colors">
            Sign up
          </Link>
        </p>

      </div>
    </main>
  )
}
