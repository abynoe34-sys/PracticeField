'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LandingPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [coachIdInput, setCoachIdInput] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [termsAgreed, setTermsAgreed] = useState(false)
  const [trainingOptIn, setTrainingOptIn] = useState(false)

  const startCoaching = async () => {
    if (!termsAgreed) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ termsAgreed: true, trainingOptIn }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? 'Failed to create coach ID')
        return
      }
      router.push(`/${json.coach.coach_id}`)
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const resumeSession = () => {
    const id = coachIdInput.trim().toUpperCase()
    if (!id) return
    router.push(`/${id}`)
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 bg-field-dark">
      {/* Hero */}
      <div className="text-center mb-12 max-w-xl">
        <div className="text-6xl mb-4">🏟️</div>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-white mb-3 leading-tight">
          Practice Field
        </h1>
        <p className="text-lg text-gray-400">
          Track performance. Get virtual training coaching. Build better players.
        </p>
        <p className="text-sm text-gray-600 mt-2">
          Built for American football coaches & players. No account required.
        </p>
      </div>

      {/* Actions */}
      <div className="w-full max-w-sm space-y-4">
        <div className="space-y-3">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={termsAgreed}
              onChange={e => setTermsAgreed(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-field-border bg-field-card accent-brand-600 cursor-pointer"
            />
            <span className="text-xs text-gray-400 leading-relaxed">
              I agree to the{' '}
              <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-brand-400 underline hover:text-brand-300">
                Terms of Service
              </a>{' '}
              and{' '}
              <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-brand-400 underline hover:text-brand-300">
                Privacy Policy
              </a>
              . <span className="text-gray-500">Required.</span>
            </span>
          </label>

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={trainingOptIn}
              onChange={e => setTrainingOptIn(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-field-border bg-field-card accent-brand-600 cursor-pointer"
            />
            <span className="text-xs text-gray-400 leading-relaxed">
              I opt in to AI-powered video analysis — uploaded practice clips will be processed to identify technique issues and generate training recommendations.{' '}
              <span className="text-gray-500">Optional.</span>
            </span>
          </label>
        </div>

        <button
          onClick={startCoaching}
          disabled={loading || !termsAgreed}
          className="w-full bg-brand-600 hover:bg-brand-500 disabled:opacity-60 text-white font-bold py-4 px-6 rounded-xl text-lg transition-colors"
        >
          {loading ? 'Creating your workspace…' : '⚡ Start Coaching'}
        </button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-field-border" />
          </div>
          <div className="relative flex justify-center text-xs text-gray-500">
            <span className="px-2 bg-field-dark">or resume an existing session</span>
          </div>
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={coachIdInput}
            onChange={e => setCoachIdInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && resumeSession()}
            placeholder="Enter Coach ID (e.g. ABC123XYZ)"
            className="flex-1 bg-field-card border border-field-border rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-brand-600 uppercase tracking-wider"
            maxLength={9}
          />
          <button
            onClick={resumeSession}
            disabled={!coachIdInput.trim()}
            className="bg-field-card border border-field-border hover:border-brand-600 disabled:opacity-40 text-white px-4 py-3 rounded-xl text-sm font-medium transition-colors"
          >
            Go →
          </button>
        </div>

        {error && (
          <p className="text-sm text-red-400 text-center">{error}</p>
        )}
      </div>

      {/* Feature List */}
      <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl w-full">
        {[
          { icon: '📋', title: 'Session Reviews', desc: 'Log strengths, weaknesses, and root causes after every practice.' },
          { icon: '🤖', title: 'Virtual Training Coach', desc: 'Get expert exercise recommendations with sets, reps, and WHY it helps.' },
          { icon: '📈', title: 'Progress Tracking', desc: 'Visual charts show trends, plateau detection, and when to pivot.' },
        ].map(f => (
          <div key={f.title} className="bg-field-card border border-field-border rounded-xl p-4">
            <div className="text-2xl mb-2">{f.icon}</div>
            <h3 className="font-semibold text-white text-sm mb-1">{f.title}</h3>
            <p className="text-xs text-gray-500">{f.desc}</p>
          </div>
        ))}
      </div>

      <p className="mt-12 text-xs text-gray-700">
        Your Coach ID is your password — bookmark it after creating your workspace.
      </p>
    </main>
  )
}
