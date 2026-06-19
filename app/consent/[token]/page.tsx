'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'

type Status = 'loading' | 'invalid' | 'ready' | 'confirmed' | 'declined'

export default function ConsentPage() {
  const { token } = useParams<{ token: string }>()

  const [status,       setStatus]       = useState<Status>('loading')
  const [displayName,  setDisplayName]  = useState('')
  const [coreConsent,  setCoreConsent]  = useState(false)
  const [trainingOptIn, setTrainingOptIn] = useState(false)
  const [submitting,   setSubmitting]   = useState(false)
  const [submitError,  setSubmitError]  = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/consent/${token}`)
      .then(async res => {
        if (!res.ok) { setStatus('invalid'); return }
        const data = await res.json()
        setDisplayName(data.display_name)
        setStatus('ready')
      })
      .catch(() => setStatus('invalid'))
  }, [token])

  const submit = async (decision: 'confirmed' | 'declined') => {
    setSubmitError(null)
    setSubmitting(true)
    try {
      const res = await fetch(`/api/consent/${token}`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          decision,
          training_opt_in: decision === 'confirmed' ? trainingOptIn : false,
        }),
      })
      if (!res.ok) {
        setSubmitError('This link is no longer valid. It may have already been used.')
        return
      }
      setStatus(decision)
    } catch {
      setSubmitError('Network error. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Loading ────────────────────────────────────────────────────────────────

  if (status === 'loading') {
    return (
      <main className="min-h-screen flex items-center justify-center bg-field-dark">
        <p className="text-sm text-gray-500">Loading…</p>
      </main>
    )
  }

  // ── Invalid / expired / already used — same message for all cases ──────────

  if (status === 'invalid') {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-4 bg-field-dark">
        <div className="w-full max-w-sm text-center space-y-4">
          <div className="text-5xl">🔗</div>
          <h1 className="text-2xl font-bold text-white">Link no longer valid</h1>
          <p className="text-sm text-gray-400 leading-relaxed">
            This consent link is no longer valid. It may have expired or already been used.
            If you need help, contact the coach who set up the player&apos;s account.
          </p>
        </div>
      </main>
    )
  }

  // ── Confirmed ──────────────────────────────────────────────────────────────

  if (status === 'confirmed') {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-4 bg-field-dark">
        <div className="w-full max-w-sm text-center space-y-4">
          <div className="text-5xl">✅</div>
          <h1 className="text-2xl font-bold text-white">Consent confirmed</h1>
          <p className="text-sm text-gray-400 leading-relaxed">
            Thank you. <span className="text-white">{displayName}</span>&apos;s account is now
            active and they can log in, upload videos, and use Practice Field.
          </p>
        </div>
      </main>
    )
  }

  // ── Declined ───────────────────────────────────────────────────────────────

  if (status === 'declined') {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-4 bg-field-dark">
        <div className="w-full max-w-sm text-center space-y-4">
          <div className="text-5xl">🚫</div>
          <h1 className="text-2xl font-bold text-white">Consent declined</h1>
          <p className="text-sm text-gray-400 leading-relaxed">
            You have declined consent.{' '}
            <span className="text-white">{displayName}</span>&apos;s account has been restricted
            and they will not be able to upload videos or access training features.
          </p>
          <p className="text-sm text-gray-500 leading-relaxed">
            If you change your mind, contact the coach who set up{' '}
            {displayName}&apos;s account to request a new consent link.
          </p>
        </div>
      </main>
    )
  }

  // ── Consent form (status === 'ready') ──────────────────────────────────────

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 bg-field-dark">
      <div className="w-full max-w-sm space-y-6">

        <div className="text-center">
          <div className="text-4xl mb-4">🏈</div>
          <h1 className="text-2xl font-bold text-white">Parental consent request</h1>
          <p className="text-sm text-gray-400 mt-2 leading-relaxed">
            <span className="text-white font-medium">{displayName}</span> has signed up for
            Practice Field and listed you as their parent or guardian. Please review and
            respond below.
          </p>
        </div>

        <div className="bg-field-card border border-field-border rounded-xl p-4 space-y-2 text-sm text-gray-400 leading-relaxed">
          <p>
            <span className="text-white font-medium">What is Practice Field?</span>{' '}
            A football coaching and performance tracking app. Coaches and players can upload
            practice videos, and the app provides AI-powered technique analysis and training
            plan recommendations.
          </p>
          <p>
            If you approve, {displayName} will be able to upload practice videos and receive
            coaching feedback. No personal data beyond their display name and email is shared
            outside the platform.
          </p>
        </div>

        <div className="space-y-3">
          {/* Checkbox 1 — core consent, required to confirm */}
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={coreConsent}
              onChange={e => setCoreConsent(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-field-border bg-field-card accent-brand-600 cursor-pointer"
            />
            <span className="text-xs text-gray-400 leading-relaxed">
              I consent to <span className="text-white">{displayName}</span> participating in
              Practice Field, which may include uploading and analysing videos of their athletic
              performance.{' '}
              <span className="text-gray-500">Required to approve.</span>
            </span>
          </label>

          {/* Checkbox 2 — training opt-in, optional and independent */}
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={trainingOptIn}
              onChange={e => setTrainingOptIn(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-field-border bg-field-card accent-brand-600 cursor-pointer"
            />
            <span className="text-xs text-gray-400 leading-relaxed">
              I also consent to AI-powered video analysis of{' '}
              {displayName}&apos;s uploaded clips to identify technique issues and generate
              training recommendations.{' '}
              <span className="text-gray-500">Optional.</span>
            </span>
          </label>
        </div>

        {submitError && (
          <p className="text-sm text-red-400 text-center">{submitError}</p>
        )}

        <div className="space-y-2">
          <button
            onClick={() => submit('confirmed')}
            disabled={submitting || !coreConsent}
            className="w-full bg-brand-600 hover:bg-brand-500 disabled:opacity-60 text-white font-bold py-4 px-6 rounded-xl text-base transition-colors"
          >
            {submitting ? 'Saving…' : `Approve ${displayName}'s account`}
          </button>

          <button
            onClick={() => submit('declined')}
            disabled={submitting}
            className="w-full bg-field-card border border-field-border hover:border-red-700 text-gray-400 hover:text-red-400 font-medium py-3 px-6 rounded-xl text-sm transition-colors"
          >
            Decline
          </button>
        </div>

        <p className="text-xs text-gray-600 text-center leading-relaxed">
          This link is for one-time use only. Once you submit, this link will no longer work.
          To change your decision later, contact the coach who set up {displayName}&apos;s account.
        </p>

      </div>
    </main>
  )
}
