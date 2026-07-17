'use client'

import { useState } from 'react'
import type { SessionVideo, TechniqueIssue, VideoAnalysis } from '@/types'
import { formatDate } from '@/lib/utils'
import DrillReferencePanel from './DrillReferencePanel'

interface VideoAnalysisCardProps {
  video: SessionVideo
  position?: string | null   // player position for drill library matching
  onReanalyze?: () => void
  onDelete?: () => void
}

const GRADE_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  A: { bg: 'bg-brand-900',  text: 'text-brand-300',  label: 'Excellent' },
  B: { bg: 'bg-blue-900',   text: 'text-blue-300',   label: 'Good'      },
  C: { bg: 'bg-yellow-900', text: 'text-yellow-300', label: 'Needs Work' },
  D: { bg: 'bg-red-900',    text: 'text-red-400',    label: 'Poor'       },
}

const SEVERITY_STYLES: Record<string, string> = {
  critical: 'bg-red-950 text-red-400 border-red-800',
  high:     'bg-orange-950 text-orange-400 border-orange-800',
  medium:   'bg-yellow-950 text-yellow-400 border-yellow-800',
  low:      'bg-gray-800 text-gray-400 border-gray-700',
}

const TREND_STYLES: Record<string, { icon: string; text: string; color: string }> = {
  improving: { icon: '↑', text: 'Improving',  color: 'text-brand-400'  },
  declining: { icon: '↓', text: 'Declining',  color: 'text-red-400'   },
  plateau:   { icon: '→', text: 'Plateau',    color: 'text-yellow-400' },
  baseline:  { icon: '◆', text: 'Baseline',   color: 'text-blue-400'  },
}

function ScoreBar({ label, score }: { label: string; score: number }) {
  const pct = (score / 10) * 100
  const color = score >= 8 ? 'bg-brand-500' : score >= 6 ? 'bg-yellow-500' : 'bg-red-500'
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-gray-400 capitalize">{label.replace(/_/g, ' ')}</span>
        <span className="text-white font-semibold">{score}/10</span>
      </div>
      <div className="h-1.5 bg-field-border rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function IssueRow({ issue }: { issue: TechniqueIssue }) {
  const [open, setOpen] = useState(false)
  const sev = SEVERITY_STYLES[issue.severity] ?? SEVERITY_STYLES.low

  return (
    <div className="border border-field-border rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-start gap-3 px-4 py-3 bg-field-card hover:bg-field-border/20 text-left transition-colors"
      >
        <span className={`shrink-0 mt-0.5 text-xs font-bold px-1.5 py-0.5 rounded border uppercase ${sev}`}>
          {issue.severity}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white">{issue.issue}</p>
          <p className="text-xs text-gray-500 mt-0.5">{issue.timestamp_hint}</p>
        </div>
        <span className="text-gray-500 text-xs shrink-0">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="px-4 py-4 bg-field-dark border-t border-field-border space-y-3">
          <div>
            <p className="text-xs font-semibold text-red-400 uppercase tracking-wide mb-1">Root Cause</p>
            <p className="text-sm text-gray-300">{issue.root_cause}</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs font-semibold text-yellow-400 uppercase tracking-wide mb-1">Coaching Cue</p>
              <p className="text-sm text-gray-300 italic">&ldquo;{issue.coaching_cue}&rdquo;</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-brand-400 uppercase tracking-wide mb-1">Drill Fix</p>
              <p className="text-sm text-gray-300">{issue.drill_fix}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Discriminate between the GPT-4o structured result (has 'summary') and the
// raw Python pose-measurement payload (has 'slope_deg_mean' etc, no 'summary').
// Both land in the same analysis column; only the structured result can be
// rendered by the full card UI.
function isStructuredAnalysis(a: VideoAnalysis | null): a is VideoAnalysis {
  return !!a && typeof (a as unknown as Record<string, unknown>).summary === 'string'
}

export default function VideoAnalysisCard({ video, position, onReanalyze, onDelete }: VideoAnalysisCardProps) {
  const [videoOpen, setVideoOpen] = useState(false)
  const [tab, setTab] = useState<'issues' | 'scores' | 'plan'>('issues')

  const rawAnalysis = video.analysis
  const analysis: VideoAnalysis | null = isStructuredAnalysis(rawAnalysis) ? rawAnalysis : null
  const grade = analysis?.overall_grade ?? null
  const gradeStyle = grade ? (GRADE_STYLES[grade] ?? GRADE_STYLES.C) : null
  const trend = analysis?.comparison?.trend ?? 'baseline'
  const trendStyle = TREND_STYLES[trend] ?? TREND_STYLES.baseline

  return (
    <div className="bg-field-card border border-field-border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 flex items-start justify-between gap-3 border-b border-field-border">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-white truncate">{video.label ?? 'Video'}</p>
            {video.is_baseline && (
              <span className="text-xs bg-blue-950 text-blue-400 border border-blue-800 px-1.5 py-0.5 rounded">
                Baseline
              </span>
            )}
            <span className="text-xs text-gray-600 capitalize">{video.drill_type}</span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            {formatDate(video.recorded_at ?? video.created_at)}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Trend indicator */}
          {analysis && (
            <span className={`text-xs font-semibold ${trendStyle.color}`}>
              {trendStyle.icon} {trendStyle.text}
            </span>
          )}

          {/* Grade badge */}
          {grade && gradeStyle && (
            <div className={`w-10 h-10 rounded-xl flex flex-col items-center justify-center ${gradeStyle.bg}`}>
              <span className={`text-lg font-black leading-none ${gradeStyle.text}`}>{grade}</span>
              <span className={`text-[9px] leading-none ${gradeStyle.text} opacity-70`}>{gradeStyle.label}</span>
            </div>
          )}
        </div>
      </div>

      {/* Analysis Status */}
      {video.analysis_status === 'awaiting_both' && (
        <div className="px-4 py-3 text-sm text-gray-500">⏳ Waiting for both clips to be uploaded before analysis can start…</div>
      )}
      {video.analysis_status === 'awaiting_front' && (
        <div className="px-4 py-3 text-sm text-gray-500">⏳ Side clip uploaded — waiting for front-view clip to pair…</div>
      )}
      {video.analysis_status === 'awaiting_side' && (
        <div className="px-4 py-3 text-sm text-gray-500">⏳ Front clip uploaded — waiting for side-view clip to pair…</div>
      )}
      {video.analysis_status === 'ready' && (
        <div className="px-4 py-3 text-sm text-brand-400 animate-pulse">⏳ Both clips ready — queued for analysis…</div>
      )}
      {video.analysis_status === 'pending' && (
        <div className="px-4 py-3 text-sm text-gray-500">⏳ Awaiting analysis…</div>
      )}
      {video.analysis_status === 'processing' && (
        <div className="px-4 py-3 text-sm text-brand-400 animate-pulse">🧠 AI analyzing…</div>
      )}
      {video.analysis_status === 'failed' && (
        <div className="px-4 py-3 flex items-center justify-between">
          <span className="text-sm text-red-400">Analysis failed</span>
          {onReanalyze && (
            <button onClick={onReanalyze} className="text-xs text-brand-400 hover:underline">
              Retry →
            </button>
          )}
        </div>
      )}

      {/* Complete, but nothing to show yet — no structured analysis and /feedback hasn't run */}
      {video.analysis_status === 'complete' && !analysis && !video.feedback && (
        <div className="px-4 py-3 text-sm text-gray-500">✓ Analysis complete — feedback pending</div>
      )}

      {/* Full Analysis */}
      {video.analysis_status === 'complete' && analysis && (
        <div>
          {/* Summary */}
          <div className="px-4 py-3 border-b border-field-border">
            <p className="text-sm text-gray-300">{analysis.summary}</p>
            {analysis.position_context && (
              <p className="text-xs text-gray-500 mt-1.5 italic">{analysis.position_context}</p>
            )}
          </div>

          {/* Comparison callout (if not baseline) */}
          {trend !== 'baseline' && (
            <div className={`px-4 py-3 border-b border-field-border ${
              trend === 'improving' ? 'bg-brand-950/40' :
              trend === 'declining' ? 'bg-red-950/40' : 'bg-yellow-950/40'
            }`}>
              <p className={`text-xs font-semibold uppercase tracking-wide mb-1 ${trendStyle.color}`}>
                {trendStyle.icon} Progress vs Baseline
              </p>
              <p className="text-xs text-gray-400">{analysis.comparison.notes}</p>
              {trend === 'declining' && analysis.comparison.decline_areas.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {analysis.comparison.decline_areas.map((a, i) => (
                    <span key={i} className="text-xs bg-red-950 text-red-400 border border-red-900 px-1.5 py-0.5 rounded">
                      ↓ {a}
                    </span>
                  ))}
                </div>
              )}
              {trend === 'improving' && analysis.comparison.improvement_areas.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {analysis.comparison.improvement_areas.map((a, i) => (
                    <span key={i} className="text-xs bg-brand-950 text-brand-400 border border-brand-800 px-1.5 py-0.5 rounded">
                      ↑ {a}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab bar */}
          <div className="flex border-b border-field-border">
            {([
              { key: 'issues', label: `Issues (${analysis.issues.length})` },
              { key: 'scores', label: 'Technique Scores' },
              { key: 'plan',   label: `Modifications (${analysis.recommended_modifications.length})` },
            ] as const).map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex-1 py-2.5 text-xs font-medium transition-colors ${
                  tab === t.key
                    ? 'text-brand-400 border-b-2 border-brand-500 -mb-px'
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="px-4 py-4">
            {/* Issues tab */}
            {tab === 'issues' && (
              <div className="space-y-2">
                {analysis.strengths.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs font-semibold text-brand-400 uppercase tracking-wide mb-1.5">✓ Strengths</p>
                    {analysis.strengths.map((s, i) => (
                      <div key={i} className="text-xs text-gray-400 mb-1">
                        <span className="text-brand-500">• </span>
                        <span className="text-white">{s.strength}</span>
                        {s.evidence && <span className="text-gray-600"> — {s.evidence}</span>}
                      </div>
                    ))}
                  </div>
                )}
                {analysis.issues.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">No significant issues detected 🎯</p>
                ) : (
                  <>
                    {analysis.issues
                      .sort((a, b) => {
                        const order = { critical: 0, high: 1, medium: 2, low: 3 }
                        return (order[a.severity] ?? 4) - (order[b.severity] ?? 4)
                      })
                      .map((issue, i) => <IssueRow key={i} issue={issue} />)
                    }
                    <DrillReferencePanel
                      position={position ?? null}
                      issues={analysis.issues.map(i => i.issue)}
                    />
                  </>
                )}
              </div>
            )}

            {/* Scores tab */}
            {tab === 'scores' && (
              <div className="space-y-3">
                {Object.entries(analysis.technique_scores).map(([key, val]) => (
                  <ScoreBar key={key} label={key} score={val as number} />
                ))}
                <p className="text-xs text-gray-600 pt-2">
                  Scored by AI based on {analysis.frames_analyzed} frames extracted from the clip.
                </p>
              </div>
            )}

            {/* Plan modifications tab */}
            {tab === 'plan' && (
              <div className="space-y-3">
                {analysis.recommended_modifications.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">No plan changes recommended</p>
                ) : (
                  analysis.recommended_modifications
                    .sort((a, b) => {
                      const order = { urgent: 0, recommended: 1, optional: 2 }
                      return (order[a.priority] ?? 3) - (order[b.priority] ?? 3)
                    })
                    .map((mod, i) => (
                      <div key={i} className="border border-field-border rounded-lg p-3 space-y-1">
                        <div className="flex items-start gap-2">
                          <span className={`shrink-0 text-xs font-bold px-1.5 py-0.5 rounded border mt-0.5 ${
                            mod.priority === 'urgent' ? 'bg-red-950 text-red-400 border-red-800' :
                            mod.priority === 'recommended' ? 'bg-yellow-950 text-yellow-400 border-yellow-800' :
                            'bg-gray-800 text-gray-400 border-gray-700'
                          }`}>
                            {mod.priority.toUpperCase()}
                          </span>
                          <p className="text-sm text-white">{mod.action}</p>
                        </div>
                        <p className="text-xs text-gray-500 pl-16">{mod.reason}</p>
                      </div>
                    ))
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Video playback + actions footer */}
      <div className="px-4 py-3 border-t border-field-border flex items-center justify-between gap-3">
        <div className="flex gap-2">
          {video.public_url && (
            <button
              onClick={() => setVideoOpen(o => !o)}
              className="text-xs bg-field-dark border border-field-border hover:border-brand-600 text-white px-3 py-1.5 rounded-lg transition-colors"
            >
              {videoOpen ? '▼ Hide clip' : '▶ Watch clip'}
            </button>
          )}
        </div>
        <div className="flex gap-2">
          {onReanalyze && video.analysis_status === 'complete' && (
            <button
              onClick={onReanalyze}
              className="text-xs text-gray-500 hover:text-white transition-colors"
            >
              Re-analyze
            </button>
          )}
          {onDelete && (
            <button
              onClick={onDelete}
              className="text-xs text-red-600 hover:text-red-400 transition-colors"
            >
              Delete
            </button>
          )}
        </div>
      </div>

      {/* Inline video player */}
      {videoOpen && video.public_url && (
        <div className="border-t border-field-border bg-black">
          <video
            src={video.public_url}
            controls
            className="w-full max-h-72 object-contain"
            preload="metadata"
          />
        </div>
      )}
    </div>
  )
}
