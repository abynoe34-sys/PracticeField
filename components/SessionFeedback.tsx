'use client'

// components/SessionFeedback.tsx
//
// The consolidated, SESSION-level stance assessment — one clean place that
// combines everything that exists today for a session's side+front pair:
//
//   • Side-view coaching feedback (the real GPT judgment) — reuses FeedbackPanel
//     verbatim, so the caveat banner, feedback_status handling (pending /
//     failed+retry / skipped / real feedback) from the hardening pass all come
//     along unchanged. Nothing about how feedback is generated changes here.
//   • Front-view measurements — raw MECHANICAL numbers only, reusing
//     FrontMeasurements. The front-view good/bad ruleset is deferred calibration
//     work, so this is deliberately labelled "not yet coaching judgment" and is
//     NOT presented as an assessment.
//
// This is the CONTAINER the future fully-combined (cross-angle judgment) version
// slots into — it does not fabricate any front-view judgment now.
//
// Used by both the coach view (videos page Feedback tab, one block per session)
// and the solo results view (Feedback tab), so the two never diverge.

import FeedbackPanel from './FeedbackPanel'
import FrontMeasurements from './FrontMeasurements'
import type { SessionVideo } from '@/types'

interface SessionFeedbackProps {
  // The session's side-view row(s) — one per drill; carries analysis + feedback.
  sideVideos: SessionVideo[]
  // The session's front-view row — carries the raw front measurements (or none).
  frontVideo?: SessionVideo
  sessionId: string
  // Self-signup player path: their JWT (for FeedbackPanel's retry call). Coaches
  // rely on the session cookie and pass nothing.
  authToken?: string
  // Client pages re-fetch their own state after a retry (router.refresh() is a
  // no-op for pure client state).
  onRetried?: () => void
}

// The front row's analysis is the raw-measurement shape only when it carries the
// `view: 'front'` marker — otherwise it's null/absent/failed and we show a
// neutral note instead of an empty gap.
function hasFrontMeasurements(frontVideo?: SessionVideo): boolean {
  const a = frontVideo?.analysis as { view?: string } | null | undefined
  return !!a && a.view === 'front'
}

export default function SessionFeedback({
  sideVideos,
  frontVideo,
  sessionId,
  authToken,
  onRetried,
}: SessionFeedbackProps) {
  const multiDrill = sideVideos.length > 1

  return (
    <div className="space-y-4">
      {/* ── Side-view coaching feedback (the real judgment) ─────────────────── */}
      {sideVideos.length === 0 ? (
        <p className="text-sm text-field-muted">No side-view clip for this session yet.</p>
      ) : (
        sideVideos.map((video) => (
          <div key={video.id} className="space-y-1">
            {multiDrill && (
              <p className="text-xs font-medium text-field-muted capitalize">
                {(video.drill_type ?? 'drill').replace(/_/g, ' ')}
              </p>
            )}

            {video.analysis_status === 'complete' ? (
              // FeedbackPanel owns every feedback state (real feedback with its
              // caveat banner, pending spinner, failed+retry, skipped note).
              <FeedbackPanel
                video={video}
                sessionId={sessionId}
                authToken={authToken}
                onRetried={onRetried}
              />
            ) : video.analysis_status === 'failed' ? (
              <div className="bg-field-card border border-brand-700 rounded-md p-4">
                <p className="text-sm font-semibold text-brand-300">Analysis couldn&apos;t be completed</p>
                <p className="text-xs text-field-muted mt-1">
                  The stance analysis for this clip failed, so no feedback could be generated.
                  Re-upload the clip to try again.
                </p>
              </div>
            ) : (
              <div className="bg-field-card border border-field-border rounded-md p-4 flex items-center gap-3">
                <div className="w-4 h-4 border-2 border-brand-500 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                <p className="text-sm text-field-muted">Analyzing stance…</p>
              </div>
            )}
          </div>
        ))
      )}

      {/* ── Front-view measurements (mechanical — NOT coaching judgment) ─────── */}
      <div>
        <h3 className="text-sm font-semibold text-white mb-1.5">
          Front-view measurements{' '}
          <span className="font-normal text-field-muted">— mechanical, not yet coaching judgment</span>
        </h3>
        {hasFrontMeasurements(frontVideo) ? (
          <FrontMeasurements analysis={frontVideo?.analysis} />
        ) : (
          <div className="bg-field-card border border-field-border rounded-md p-4">
            <p className="text-sm text-field-muted">
              Front-view measurements aren&apos;t available for this session
              {frontVideo?.analysis_status === 'failed' ? ' (front-view processing failed)' : ''}.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
