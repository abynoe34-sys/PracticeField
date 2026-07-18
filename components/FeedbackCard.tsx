// components/FeedbackCard.tsx
//
// Renders the `feedback` column output (from the Python /feedback route).
// Deliberately separate from VideoAnalysisCard/isStructuredAnalysis() — this
// reads a different DB column entirely, so there's no shape-collision risk.
//
// Shows nothing if `feedback` is null (most sessions won't have this yet,
// since /feedback is still admin-triggered only, not automatic).
//
// Includes a visible caveat banner: a real, open issue was found where this
// pipeline confidently stated position-specific claims from NULL data. Until
// that's fixed, coaches seeing this should know it's not yet verified.

import type { StanceFeedback } from '@/types'

interface FeedbackCardProps {
  feedback: StanceFeedback | null
}

// Same critical/high/medium/low vocabulary and dark-theme treatment as
// SEVERITY_STYLES in VideoAnalysisCard.tsx — kept in sync with it.
//
// Brand rollout (2026-07-18): "critical" deliberately does NOT reuse
// brand-600 (#EC3D50, the single accent used for every CTA on this same
// page). Two reds side by side — one meaning "click here", one meaning
// "this is broken" — read as visual noise, not urgency. brand-700/
// brand-red-deep (#C9384D) is a distinct, deeper red reserved for this
// severity tier only. Per BRAND_SPEC §5, severity is also always paired
// with the uppercase text label, never conveyed by color alone.
const SEVERITY_STYLES: Record<string, string> = {
  critical: 'bg-brand-950 text-brand-300 border-brand-700',
  high:     'bg-orange-950 text-orange-400 border-orange-800',
  medium:   'bg-yellow-950 text-yellow-400 border-yellow-800',
  low:      'bg-gray-800 text-gray-400 border-gray-700',
}

export default function FeedbackCard({ feedback }: FeedbackCardProps) {
  if (!feedback) return null

  return (
    <div className="bg-field-card border border-field-border rounded-md overflow-hidden">
      {/* Caveat banner — remove once prompt hallucination issue (CLAUDE.md
          Priority 1) is resolved and this has been validated against more
          than one test session. */}
      <div className="px-4 py-2.5 bg-blue-950/40 border-b border-blue-900 text-xs text-blue-300">
        AI-generated feedback — not yet verified against ground truth. Treat
        specific claims (especially about position or fault type) as a
        starting point for discussion, not a confirmed diagnosis.
      </div>

      {/* Header */}
      <div className="px-4 py-3 border-b border-field-border">
        <p className="text-sm font-semibold text-white">AI Feedback</p>
      </div>

      <div className="px-4 py-4 space-y-4">
        <p className="text-sm text-gray-300">{feedback.summary}</p>

        {feedback.issues.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Issues</p>
            {feedback.issues.map((issue, i) => {
              const sev = SEVERITY_STYLES[issue.severity] ?? SEVERITY_STYLES.low
              return (
                <div key={i} className={`rounded-md border px-3 py-2 ${sev}`}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium">{issue.issue}</span>
                    <span className="text-[10px] font-bold uppercase tracking-wide opacity-75 shrink-0">
                      {issue.severity}
                    </span>
                  </div>
                  {issue.root_cause && (
                    <p className="text-xs mt-1 opacity-90">{issue.root_cause}</p>
                  )}
                  {issue.coaching_cue && (
                    <p className="text-xs mt-1">
                      <span className="font-semibold">Cue:</span> &ldquo;{issue.coaching_cue}&rdquo;
                    </p>
                  )}
                  {issue.drill_fix && (
                    <p className="text-xs mt-1">
                      <span className="font-semibold">Drill:</span> {issue.drill_fix}
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {feedback.strengths.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-semibold text-brand-400 uppercase tracking-wide">✓ Strengths</p>
            {feedback.strengths.map((s, i) => (
              <div key={i} className="text-xs text-gray-400">
                <span className="text-brand-500">• </span>
                <span className="text-white">{s.strength}</span>
                {s.evidence && <span className="text-gray-600"> — {s.evidence}</span>}
              </div>
            ))}
          </div>
        )}

        {feedback.position_context && (
          <p className="text-xs text-gray-500 italic border-t border-field-border pt-3">
            {feedback.position_context}
          </p>
        )}
      </div>
    </div>
  )
}
