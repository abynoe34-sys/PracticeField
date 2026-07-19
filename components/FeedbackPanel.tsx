'use client'

// components/FeedbackPanel.tsx
//
// Pipeline hardening (item 2): owns the entire feedback area for one side
// video on the session page, so the four feedback states are no longer
// conflated into a single silent "pending":
//
//   feedback present            → render FeedbackCard (unchanged)
//   feedback_status 'failed'    → "couldn't be generated" + Retry button
//   feedback_status 'skipped'   → informative note (no clear pose; not a bug)
//   feedback_status pending/    → "generating…" (the page's SessionAutoRefresh
//     processing                  poller is actively refreshing toward a
//                                 terminal state)
//
// Retry calls POST /api/sessions/[sessionId]/retry-feedback (ownership-checked
// server-side), which re-runs the exact same generation logic via the Python
// service, then refreshes the page to pick up the new state.

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import FeedbackCard from './FeedbackCard'
import type { SessionVideo } from '@/types'

interface FeedbackPanelProps {
  video:      SessionVideo
  sessionId:  string
  // Present for the self-signup player path (their JWT); coaches rely on the
  // session cookie and pass nothing.
  authToken?: string
  // Client pages (the solo results view) pass this to re-fetch their own
  // state after a retry — router.refresh() only re-runs server components, so
  // it's a no-op there. The coach session page is a server component and
  // relies on router.refresh() instead, passing nothing.
  onRetried?: () => void
}

export default function FeedbackPanel({ video, sessionId, authToken, onRetried }: FeedbackPanelProps) {
  const router = useRouter()
  const [retrying, setRetrying] = useState(false)
  const [retryError, setRetryError] = useState<string | null>(null)

  // Analysis itself not done yet — VideoAnalysisCard already shows that state.
  if (video.analysis_status !== 'complete') return null

  // The happy path: real feedback exists.
  if (video.feedback) return <FeedbackCard feedback={video.feedback} />

  const doRetry = async () => {
    setRetrying(true)
    setRetryError(null)
    try {
      const headers: HeadersInit = {}
      if (authToken) headers['Authorization'] = `Bearer ${authToken}`
      const res = await fetch(`/api/sessions/${sessionId}/retry-feedback`, { method: 'POST', headers })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        setRetryError(j.error ?? 'Retry failed. Please try again.')
      } else {
        router.refresh()
        onRetried?.()
      }
    } catch {
      setRetryError('Network error. Please try again.')
    } finally {
      setRetrying(false)
    }
  }

  if (video.feedback_status === 'failed') {
    return (
      <div className="bg-field-card border border-brand-700 rounded-md p-4 space-y-3">
        <div>
          <p className="text-sm font-semibold text-brand-300">⚠ Feedback couldn&apos;t be generated</p>
          <p className="text-xs text-field-muted mt-1">
            The analysis measurements are saved, but the AI feedback step failed. You can try again.
          </p>
        </div>
        <button
          onClick={doRetry}
          disabled={retrying}
          className="bg-brand-600 hover:bg-brand-500 disabled:opacity-60 text-white text-sm font-medium px-4 py-2 rounded-md transition-colors"
        >
          {retrying ? 'Generating…' : 'Try again'}
        </button>
        {retryError && <p className="text-xs text-brand-300">{retryError}</p>}
      </div>
    )
  }

  if (video.feedback_status === 'skipped') {
    return (
      <div className="bg-field-card border border-field-border rounded-md p-4">
        <p className="text-sm text-field-muted">
          Feedback wasn&apos;t generated — the clip didn&apos;t have a clear enough pose to analyze. Re-film
          with the player fully in frame, side-on and unobstructed, for AI feedback.
        </p>
      </div>
    )
  }

  // pending / processing — the poller is refreshing toward a terminal state.
  return (
    <div className="bg-field-card border border-field-border rounded-md p-4 flex items-center gap-3">
      <div className="w-4 h-4 border-2 border-brand-500 border-t-transparent rounded-full animate-spin flex-shrink-0" />
      <p className="text-sm text-field-muted">Generating AI feedback…</p>
    </div>
  )
}
