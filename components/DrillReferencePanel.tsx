'use client'

/**
 * DrillReferencePanel
 *
 * Shown inside VideoAnalysisCard when a technique issue is detected and the
 * player's position has a curated drill library. Currently supports RB.
 *
 * Given a list of issue strings from the video analysis, it matches them
 * against the position drill library and surfaces the most relevant drills
 * with their coaching cues and curated YouTube reference videos.
 */

import { useMemo, useState } from 'react'
import { findRBDrillsForPainPoint, RB_AREA_LABELS } from '@/lib/position-drills/rb'
import type { RBDrillEntry } from '@/lib/position-drills/rb'

interface DrillReferencePanelProps {
  /** Position string from the player profile (e.g. "RB", "QB") */
  position: string | null
  /**
   * Issue strings from VideoAnalysis.issues[].issue
   * The panel matches these against the drill library's `fixes` keywords.
   */
  issues: string[]
}

// ─── Single drill card ────────────────────────────────────────────────────────

function DrillCard({ drill }: { drill: RBDrillEntry }) {
  const [open, setOpen] = useState(false)
  const areaLabel = RB_AREA_LABELS[drill.technique_area] ?? drill.technique_area

  return (
    <div className="border border-field-border rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-start gap-3 px-4 py-3 bg-field-card hover:bg-field-border/20 text-left transition-colors"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-white">{drill.name}</p>
            <span className="text-xs text-gray-600 bg-field-dark border border-field-border px-1.5 py-0.5 rounded">
              {areaLabel}
            </span>
          </div>
          <p className="text-xs text-brand-400 italic mt-0.5">
            &ldquo;{drill.coaching_cue}&rdquo;
          </p>
        </div>
        <span className="text-gray-500 text-xs shrink-0 mt-1">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="px-4 py-4 bg-field-dark border-t border-field-border space-y-4">
          {/* Why this drill */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Why This Drill</p>
            <p className="text-sm text-gray-300">{drill.why}</p>
          </div>

          {/* Common mistake */}
          <div>
            <p className="text-xs font-semibold text-red-400 uppercase tracking-wide mb-1">Common Mistake</p>
            <p className="text-sm text-gray-300">{drill.common_mistake}</p>
          </div>

          {/* Sets / reps */}
          {(drill.sets || drill.duration) && (
            <div className="flex gap-4">
              {drill.sets && (
                <div>
                  <p className="text-xs text-gray-500">Sets</p>
                  <p className="text-sm font-semibold text-white">{drill.sets}</p>
                </div>
              )}
              {drill.reps && (
                <div>
                  <p className="text-xs text-gray-500">Reps</p>
                  <p className="text-sm font-semibold text-white">{drill.reps}</p>
                </div>
              )}
              {drill.duration && (
                <div>
                  <p className="text-xs text-gray-500">Duration</p>
                  <p className="text-sm font-semibold text-white">{drill.duration}</p>
                </div>
              )}
            </div>
          )}

          {/* Progressions */}
          {drill.progressions.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Progressions</p>
              <ol className="list-none space-y-0.5">
                {drill.progressions.map((step, i) => (
                  <li key={i} className="text-xs text-gray-400 flex gap-2">
                    <span className="text-brand-600 shrink-0">{i + 1}.</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Reference videos */}
          {drill.videos.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Reference Videos</p>
              <div className="space-y-2">
                {drill.videos.map((vid, i) => (
                  <a
                    key={i}
                    href={vid.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 group"
                  >
                    <span className="text-red-500 text-base leading-none shrink-0">▶</span>
                    <div className="min-w-0">
                      <p className="text-xs text-white group-hover:text-brand-400 transition-colors truncate">
                        {vid.title}
                      </p>
                      <p className="text-xs text-gray-600">{vid.duration}</p>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Panel ────────────────────────────────────────────────────────────────────

export default function DrillReferencePanel({ position, issues }: DrillReferencePanelProps) {
  const matchedDrills = useMemo<RBDrillEntry[]>(() => {
    if (position?.toUpperCase() !== 'RB' || issues.length === 0) return []

    // Score each drill by how many issues it fixes
    const scoreMap = new Map<string, { drill: RBDrillEntry; score: number }>()

    for (const issue of issues) {
      for (const drill of findRBDrillsForPainPoint(issue)) {
        const entry = scoreMap.get(drill.name)
        if (entry) {
          entry.score += 1
        } else {
          scoreMap.set(drill.name, { drill, score: 1 })
        }
      }
    }

    return [...scoreMap.values()]
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map(({ drill }) => drill)
  }, [position, issues])

  // Only show for positions with a drill library
  if (position?.toUpperCase() !== 'RB') return null
  if (matchedDrills.length === 0) return null

  return (
    <div className="mt-4 border border-brand-800/50 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-brand-950/40 border-b border-brand-800/50 flex items-center gap-2">
        <span className="text-brand-400 text-base">🏈</span>
        <div>
          <p className="text-xs font-semibold text-brand-400 uppercase tracking-wide">
            RB Drill Library — Matched to Issues
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            {matchedDrills.length} drill{matchedDrills.length !== 1 ? 's' : ''} matched · tap to expand
          </p>
        </div>
      </div>

      {/* Drill list */}
      <div className="divide-y divide-field-border bg-field-card/50">
        {matchedDrills.map(drill => (
          <DrillCard key={drill.name} drill={drill} />
        ))}
      </div>
    </div>
  )
}
