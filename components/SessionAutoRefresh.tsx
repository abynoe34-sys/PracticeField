// components/SessionAutoRefresh.tsx
//
// Polls the session results page by calling router.refresh() while
// analysis/feedback is still in progress, so a coach watching the page
// sees it update on its own instead of having to navigate away and back.
// force-dynamic on the page (Gotcha #4) means each refresh actually
// re-fetches from the DB rather than serving a cached render.
//
// Polls while EITHER half of the pipeline is still in flight:
//   - analysis: status === 'processing'
//   - feedback: feedbackInFlight (a completed side row whose feedback_status
//               is still pending/processing)
// and stops once both reach a terminal state. Unlike the previous version,
// feedback now has a real terminal signal (feedback_status), so there's no
// "treat complete as terminal + one grace poll" guessing: a failed/skipped
// feedback stops the poll and is shown by FeedbackPanel (with a retry),
// rather than being polled for forever or silently abandoned.
//
// Renders nothing — it's a background poller, not a visible indicator.
// Per-video processing/failed states are shown by VideoAnalysisCard/FeedbackPanel.

'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

const POLL_INTERVAL_MS = 6000
const MAX_POLLS = 40 // ~4 min safety cap in case a session gets stuck mid-processing

interface SessionAutoRefreshProps {
  status: 'processing' | 'complete' | 'failed'
  feedbackInFlight: boolean // a completed side row whose feedback is still pending/processing
}

export default function SessionAutoRefresh({ status, feedbackInFlight }: SessionAutoRefreshProps) {
  const router = useRouter()
  const pollCount = useRef(0)

  useEffect(() => {
    // Terminal: analysis is done (or failed) AND feedback is no longer in
    // flight. Nothing left to watch for.
    const stillWorking = status === 'processing' || feedbackInFlight
    if (!stillWorking) return
    if (pollCount.current >= MAX_POLLS) return

    const timer = setTimeout(() => {
      pollCount.current += 1
      router.refresh()
    }, POLL_INTERVAL_MS)

    return () => clearTimeout(timer)
  }, [status, feedbackInFlight, router])

  return null
}
