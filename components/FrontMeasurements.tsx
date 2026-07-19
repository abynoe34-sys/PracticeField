// components/FrontMeasurements.tsx
//
// Item 6: renders the front-view row's RAW mechanical measurements (stance
// width, shoulder/hip tilt, knee alignment, lateral balance, down hand).
// This is measurement data only — explicitly NOT coaching judgment (the
// good-vs-bad ruleset is deferred). Rendered as a plain labeled table, clearly
// distinct from the AI FeedbackCard, so it can't be read as a diagnosis.
//
// The front analysis is the raw measurement shape (has a `view: 'front'` marker
// and no `summary` field) — deliberately never the structured GPT-4o shape, so
// isStructuredAnalysis() stays false (Gotcha #8). Typed loosely here since it's
// a raw JSON blob distinct from VideoAnalysis.

type FrontAnalysis = {
  view?: string
  stance_width_ratio_mean?: number | null
  knee_ankle_width_ratio_mean?: number | null
  shoulder_tilt_deg_mean?: number | null
  hip_tilt_deg_mean?: number | null
  shoulder_hip_tilt_diff_deg_mean?: number | null
  lateral_offset_ratio_mean?: number | null
  wrist_height_diff_mean?: number | null
  down_hand_majority?: string | null
  detection_rate?: number | null
  reliable?: boolean | null
}

interface FrontMeasurementsProps {
  analysis: unknown
}

function fmt(v: number | null | undefined, digits = 2): string {
  return typeof v === 'number' ? v.toFixed(digits) : '—'
}

export default function FrontMeasurements({ analysis }: FrontMeasurementsProps) {
  const a = analysis as FrontAnalysis | null
  // Only render the front raw-measurement shape — never the structured feedback
  // shape or a null/absent analysis.
  if (!a || a.view !== 'front') return null

  const rows: Array<[string, string]> = [
    ['Stance width (× shoulder width)', fmt(a.stance_width_ratio_mean)],
    ['Knee vs ankle width', fmt(a.knee_ankle_width_ratio_mean)],
    ['Shoulder tilt', `${fmt(a.shoulder_tilt_deg_mean, 1)}°`],
    ['Hip tilt', `${fmt(a.hip_tilt_deg_mean, 1)}°`],
    ['Shoulder–hip tilt difference', `${fmt(a.shoulder_hip_tilt_diff_deg_mean, 1)}°`],
    ['Lateral offset (× shoulder width)', fmt(a.lateral_offset_ratio_mean)],
    ['Down hand', a.down_hand_majority ?? '—'],
  ]

  return (
    <div className="bg-field-card border border-field-border rounded-md overflow-hidden">
      <div className="px-4 py-2.5 border-b border-field-border">
        <p className="text-sm font-semibold text-white">Front-view measurements</p>
        <p className="text-xs text-field-muted mt-0.5">
          Mechanical measurements only — not coaching judgment.
          {a.reliable === false && (
            <span className="text-amber-400">
              {' '}Low confidence{typeof a.detection_rate === 'number' ? ` (detection ${Math.round(a.detection_rate * 100)}%)` : ''}
              {' '}— treat as indicative.
            </span>
          )}
        </p>
      </div>
      <dl className="divide-y divide-field-border">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between px-4 py-2">
            <dt className="text-xs text-field-muted">{label}</dt>
            <dd className="text-sm text-white font-mono">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
