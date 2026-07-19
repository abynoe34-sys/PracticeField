'use client'

import { useState } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import type { SessionVideo, VideoAnalysis } from '@/types'
import { formatDate } from '@/lib/utils'
import { isStructuredAnalysis } from './VideoAnalysisCard'

interface VideoComparisonProps {
  videos: SessionVideo[]
}

const GRADE_ORDER: Record<string, number> = { A: 4, B: 3, C: 2, D: 1 }
const GRADE_LABEL: Record<number, string> = { 4: 'A', 3: 'B', 2: 'C', 1: 'D' }

function gradeColor(grade: string): string {
  return grade === 'A' ? 'text-brand-400'
       : grade === 'B' ? 'text-blue-400'
       : grade === 'C' ? 'text-yellow-400'
       : 'text-red-400'
}

function trendArrow(a: string, b: string): { icon: string; color: string; label: string } {
  const diff = (GRADE_ORDER[b] ?? 0) - (GRADE_ORDER[a] ?? 0)
  if (diff > 0)  return { icon: '↑', color: 'text-brand-400',  label: 'Improving' }
  if (diff < 0)  return { icon: '↓', color: 'text-red-400',    label: 'Declining' }
  return           { icon: '→', color: 'text-yellow-400', label: 'Plateau'   }
}

function videoDate(v: SessionVideo): string {
  return v.recorded_at ?? v.created_at
}

export default function VideoComparison({ videos }: VideoComparisonProps) {
  // Only use fully analysed videos with the STRUCTURED GPT-4o shape — sort
  // oldest → newest by filmed date. isStructuredAnalysis() guard added
  // 2026-07-19 (security/correctness audit, Gotcha #8's third occurrence):
  // this used to accept any truthy `analysis`, including the two-clip
  // pipeline's raw MediaPipe measurement shape ({slope_deg_mean, ...}, no
  // overall_grade/issues/technique_scores). Every completed two-clip
  // session produces that raw shape, so this crashed (la.issues.map on
  // undefined) for essentially any coach who reached the Progress Compare
  // tab with 2+ analyzed videos — same failure mode already hit twice
  // elsewhere (VideoAnalysisCard, the plan page).
  const complete = [...videos.filter(v => v.analysis_status === 'complete' && isStructuredAnalysis(v.analysis))]
    .sort((a, b) => videoDate(a).localeCompare(videoDate(b)))

  const [leftIdx,  setLeftIdx]  = useState(0)
  const [rightIdx, setRightIdx] = useState(Math.max(complete.length - 1, 0))

  if (complete.length < 2) {
    return (
      <div className="bg-field-card border border-dashed border-field-border rounded-xl p-6 text-center">
        <p className="text-gray-500 text-sm">Upload and analyze at least 2 videos to compare progress.</p>
      </div>
    )
  }

  const left  = complete[leftIdx]
  const right = complete[rightIdx]
  const la: VideoAnalysis = left.analysis!
  const ra: VideoAnalysis = right.analysis!

  const { icon: tIcon, color: tColor, label: tLabel } = trendArrow(la.overall_grade, ra.overall_grade)

  const allIssues = [...new Set([
    ...la.issues.map(i => i.issue),
    ...ra.issues.map(i => i.issue),
  ])]

  const scoreKeys = Object.keys(la.technique_scores)

  // Build timeline data for the grade chart (all completed videos)
  const timelineData = complete.map(v => ({
    date:  formatDate(videoDate(v)),
    grade: GRADE_ORDER[v.analysis?.overall_grade ?? 'C'] ?? 2,
    label: v.label ?? v.file_name ?? 'Video',
    raw:   v.analysis?.overall_grade ?? 'C',
  }))

  return (
    <div className="space-y-4">

      {/* ── Grade Timeline ─────────────────────────────────────────────── */}
      {complete.length >= 2 && (
        <div className="bg-field-card border border-field-border rounded-xl p-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
            📈 Grade Progress Over Time
          </p>
          <ResponsiveContainer width="100%" height={120}>
            <LineChart data={timelineData} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
              <XAxis
                dataKey="date"
                tick={{ fill: '#6b7280', fontSize: 10 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                domain={[1, 4]}
                ticks={[1, 2, 3, 4]}
                tickFormatter={v => GRADE_LABEL[v] ?? ''}
                tick={{ fill: '#6b7280', fontSize: 10 }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={{ background: '#0f1117', border: '1px solid #1f2937', borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: '#9ca3af' }}
                formatter={(v: number) => [GRADE_LABEL[v] ?? v, 'Grade']}
              />
              <ReferenceLine y={2} stroke="#374151" strokeDasharray="3 3" />
              <Line
                type="monotone"
                dataKey="grade"
                stroke="#22c55e"
                strokeWidth={2}
                dot={{ fill: '#22c55e', r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ── Video Selectors ────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3">
        {(['Earlier', 'Later'] as const).map((lbl, idx) => {
          const current = idx === 0 ? leftIdx  : rightIdx
          const setter  = idx === 0 ? setLeftIdx : setRightIdx
          return (
            <div key={lbl}>
              <label className="block text-xs text-gray-500 mb-1">{lbl} Video</label>
              <select
                value={current}
                onChange={e => setter(Number(e.target.value))}
                className="w-full bg-field-dark border border-field-border rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-600"
              >
                {complete.map((v, i) => (
                  <option key={v.id} value={i}>
                    {formatDate(videoDate(v))} — {v.label ?? 'Video'} ({v.analysis?.overall_grade})
                  </option>
                ))}
              </select>
            </div>
          )
        })}
      </div>

      {/* ── Grade Headline ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between bg-field-card border border-field-border rounded-xl px-5 py-4">
        <div className="text-center">
          <p className="text-xs text-gray-500 mb-1">{formatDate(videoDate(left))}</p>
          <p className={`text-4xl font-black ${gradeColor(la.overall_grade)}`}>{la.overall_grade}</p>
          <p className="text-xs text-gray-500 mt-1 max-w-[120px] truncate">{left.label}</p>
        </div>
        <div className="text-center">
          <p className={`text-3xl font-bold ${tColor}`}>{tIcon}</p>
          <p className={`text-xs font-semibold mt-1 ${tColor}`}>{tLabel}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-500 mb-1">{formatDate(videoDate(right))}</p>
          <p className={`text-4xl font-black ${gradeColor(ra.overall_grade)}`}>{ra.overall_grade}</p>
          <p className="text-xs text-gray-500 mt-1 max-w-[120px] truncate">{right.label}</p>
        </div>
      </div>

      {/* ── Technique Score Comparison ─────────────────────────────────── */}
      <div className="bg-field-card border border-field-border rounded-xl p-4 space-y-3">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Technique Scores</p>
        {scoreKeys.map(key => {
          const lScore = la.technique_scores[key] ?? 0
          const rScore = ra.technique_scores[key] ?? 0
          const diff   = rScore - lScore
          const diffColor = diff > 0 ? 'text-brand-400' : diff < 0 ? 'text-red-400' : 'text-gray-500'
          return (
            <div key={key} className="flex items-center gap-3">
              <span className="text-xs text-gray-500 w-24 shrink-0 capitalize">{key.replace(/_/g, ' ')}</span>
              <div className="flex-1 flex items-center gap-1">
                <span className="text-xs text-white w-5 text-right">{lScore}</span>
                <div className="flex-1 relative h-1.5 bg-field-border rounded-full overflow-hidden mx-1">
                  <div className="absolute left-0 top-0 h-full bg-gray-600 rounded-full" style={{ width: `${lScore * 10}%` }} />
                  <div className="absolute left-0 top-0 h-full bg-brand-500 rounded-full opacity-60" style={{ width: `${rScore * 10}%` }} />
                </div>
                <span className="text-xs text-white w-5">{rScore}</span>
              </div>
              <span className={`text-xs font-bold w-8 text-right ${diffColor}`}>
                {diff > 0 ? `+${diff}` : diff === 0 ? '—' : diff}
              </span>
            </div>
          )
        })}
        <p className="text-xs text-gray-600 pt-1">Gray = {formatDate(videoDate(left))} · Green = {formatDate(videoDate(right))}</p>
      </div>

      {/* ── Issue Tracking ─────────────────────────────────────────────── */}
      <div className="bg-field-card border border-field-border rounded-xl p-4 space-y-2">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Issue Tracking</p>
        {allIssues.length === 0 && (
          <p className="text-sm text-gray-500">No issues tracked across these videos.</p>
        )}
        {allIssues.map((issue, i) => {
          const inLeft  = la.issues.find(x => x.issue === issue)
          const inRight = ra.issues.find(x => x.issue === issue)
          const status  = !inLeft && inRight  ? 'new'
                        : inLeft  && !inRight ? 'resolved'
                        : inLeft  && inRight  ? 'persisting'
                        : 'unknown'
          return (
            <div key={i} className="flex items-start gap-2.5">
              <span className={`shrink-0 text-xs font-semibold px-1.5 py-0.5 rounded mt-0.5 ${
                status === 'resolved'   ? 'bg-brand-950 text-brand-400' :
                status === 'new'        ? 'bg-red-950 text-red-400' :
                status === 'persisting' ? 'bg-yellow-950 text-yellow-500' :
                'bg-gray-800 text-gray-500'
              }`}>
                {status === 'resolved'   ? '✓ Fixed' :
                 status === 'new'        ? '⚠ New' :
                 status === 'persisting' ? '→ Still present' : '?'}
              </span>
              <p className="text-xs text-gray-300">{issue}</p>
            </div>
          )
        })}
      </div>

      {/* ── Side-by-side Playback ──────────────────────────────────────── */}
      {(left.public_url || right.public_url) && (
        <div className="bg-field-card border border-field-border rounded-xl overflow-hidden">
          <p className="text-xs text-gray-500 px-4 pt-3 pb-2">Side-by-side playback</p>
          <div className="grid grid-cols-2 gap-px bg-field-border">
            <div className="bg-black">
              {left.public_url
                ? <video src={left.public_url} controls muted className="w-full max-h-48 object-contain" preload="metadata" />
                : <div className="h-48 flex items-center justify-center text-gray-700 text-xs">No video</div>
              }
              <p className="text-center text-xs text-gray-600 py-1">{formatDate(videoDate(left))}</p>
            </div>
            <div className="bg-black">
              {right.public_url
                ? <video src={right.public_url} controls muted className="w-full max-h-48 object-contain" preload="metadata" />
                : <div className="h-48 flex items-center justify-center text-gray-700 text-xs">No video</div>
              }
              <p className="text-center text-xs text-gray-600 py-1">{formatDate(videoDate(right))}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
