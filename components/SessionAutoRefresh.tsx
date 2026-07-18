// components/SessionAutoRefresh.tsx
//
// Polls the session results page by calling router.refresh() while
// analysis/feedback is still in progress, so a coach watching the page
// sees it update on its own instead of having to navigate away and back.
// force-dynamic on the page (Gotcha #4) means each refresh actually
// re-fetches from the DB rather than serving a cached render.
//
// Stops polling on 'failed'. Treats 'complete' as the terminal state even
// if feedback is still null — feedback generation is best-effort inside
// /analyse and can simply fail, so waiting on it forever would mean
// polling that never stops. One grace refresh after first observing
// 'complete' covers the common case where feedback (generated inline,
// right after the analysis write lands) shows up a couple seconds later.
//
// Renders nothing — it's a background poller, not a visible indicator.
// Per-video processing/failed states are already shown by VideoAnalysisCard.

'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

const POLL_INTERVAL_MS = 6000
const MAX_POLLS = 40 // ~4 min safety cap in case a session gets stuck mid-processing
const GRACE_POLLS_AFTER_COMPLETE = 1

interface SessionAutoRefreshProps {
  status: 'processing' | 'complete' | 'failed'
  feedbackPending: boolean // true if a completed video is still missing feedback
}

export default function SessionAutoRefresh({ status, feedbackPending }: SessionAutoRefreshProps) {
  const router = useRouter()
  const pollCount = useRef(0)
  const completeStreak = useRef(0)

  useEffect(() => {
    if (status === 'failed') return

    if (status === 'complete') {
      completeStreak.current += 1
      if (!feedbackPending || completeStreak.current > GRACE_POLLS_AFTER_COMPLETE) return
    } else {
      completeStreak.current = 0
    }

    if (pollCount.current >= MAX_POLLS) return

    const timer = setTimeout(() => {
      pollCount.current += 1
      router.refresh()
    }, POLL_INTERVAL_MS)

    return () => clearTimeout(timer)
  }, [status, feedbackPending, router])

  return null
}
