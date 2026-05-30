'use client'

/**
 * DrillReferencePanel
 *
 * Shown inside VideoAnalysisCard when a technique issue is detected and the
 * player's position has a curated drill library. Supports RB, WR, QB, OL, TE.
 *
 * Given a list of issue strings from the video analysis, it matches them
 * against the position drill library and surfaces the most relevant drills
 * with their coaching cues and curated YouTube reference videos.
 */

import { useMemo, useState } from 'react'
import {
  findRBDrillsForPainPoint,
  getRBTeachingStep,
  RB_AREA_LABELS,
} from '@/lib/position-drills/rb'
import type { RBDrillEntry, RBTeachingStep } from '@/lib/position-drills/rb'
import {
  findWRDrillsForPainPoint,
  getWRTeachingStep,
  WR_AREA_LABELS,
} from '@/lib/position-drills/wr'
import type { WRDrillEntry, WRTeachingStep } from '@/lib/position-drills/wr'
import {
  findQBDrillsForPainPoint,
  getQBTeachingStep,
  QB_AREA_LABELS,
} from '@/lib/position-drills/qb'
import type { QBDrillEntry, QBTeachingStep } from '@/lib/position-drills/qb'
import {
  findOLDrillsForPainPoint,
  getOLTeachingStep,
  OL_AREA_LABELS,
} from '@/lib/position-drills/ol'
import type { OLDrillEntry, OLTeachingStep } from '@/lib/position-drills/ol'
import {
  findTEDrillsForPainPoint,
  getTETeachingStep,
  TE_AREA_LABELS,
} from '@/lib/position-drills/te'
import type { TEDrillEntry, TETeachingStep } from '@/lib/position-drills/te'
import {
  findDLDrillsForPainPoint,
  getDLTeachingStep,
  DL_AREA_LABELS,
} from '@/lib/position-drills/dl'
import type { DLDrillEntry, DLTeachingStep } from '@/lib/position-drills/dl'
import {
  findLBDrillsForPainPoint,
  getLBTeachingStep,
  LB_AREA_LABELS,
} from '@/lib/position-drills/lb'
import type { LBDrillEntry, LBTeachingStep } from '@/lib/position-drills/lb'
import {
  findDBDrillsForPainPoint,
  getDBTeachingStep,
  DB_AREA_LABELS,
} from '@/lib/position-drills/db'
import type { DBDrillEntry, DBTeachingStep } from '@/lib/position-drills/db'
import {
  findOLBDrillsForPainPoint,
  getOLBTeachingStep,
  OLB_AREA_LABELS,
} from '@/lib/position-drills/olb'
import type { OLBDrillEntry, OLBTeachingStep } from '@/lib/position-drills/olb'

// Union types so all positions share the same card components
type AnyDrill = RBDrillEntry | WRDrillEntry | QBDrillEntry | OLDrillEntry | TEDrillEntry | DLDrillEntry | LBDrillEntry | DBDrillEntry | OLBDrillEntry
type AnyTeachingStep = RBTeachingStep | WRTeachingStep | QBTeachingStep | OLTeachingStep | TETeachingStep | DLTeachingStep | LBTeachingStep | DBTeachingStep | OLBTeachingStep

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

function DrillCard({ drill, areaLabels }: { drill: AnyDrill; areaLabels: Record<string, string> }) {
  const [open, setOpen] = useState(false)
  const areaLabel = areaLabels[drill.technique_area] ?? drill.technique_area

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

// ─── Teaching step card ───────────────────────────────────────────────────────

function TeachingStepCard({ step }: { step: AnyTeachingStep }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="border border-field-border rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-2.5 bg-field-card hover:bg-field-border/20 text-left transition-colors"
      >
        <span className="text-[10px] font-bold text-brand-600 bg-brand-950/60 border border-brand-800/60 rounded px-1.5 py-0.5 shrink-0">
          STEP {step.order}
        </span>
        <p className="flex-1 text-sm font-semibold text-white">{step.topic}</p>
        <span className="text-gray-500 text-xs shrink-0">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="px-4 py-4 bg-field-dark border-t border-field-border space-y-4">
          {/* Key coaching points */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Key Points</p>
            <ul className="space-y-1">
              {step.keyPoints.map((pt, i) => (
                <li key={i} className="flex gap-2 text-sm text-gray-300">
                  <span className="text-brand-500 shrink-0 mt-0.5">•</span>
                  <span>{pt}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Sub-techniques (e.g. Contact — Blast, Rip, Stiff Arm…) */}
          {step.techniques && step.techniques.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Techniques</p>
              <div className="space-y-3">
                {step.techniques.map(tech => (
                  <div key={tech.name} className="rounded-lg border border-field-border bg-field-card/60 px-3 py-2.5">
                    <div className="flex items-start gap-2 mb-1.5">
                      <p className="text-sm font-semibold text-white">{tech.name}</p>
                      <span className="text-xs text-gray-500 mt-0.5">— {tech.bestFor}</span>
                    </div>
                    <ul className="space-y-0.5">
                      {tech.cues.map((cue, ci) => (
                        <li key={ci} className="flex gap-2 text-xs text-gray-400">
                          <span className="text-brand-600 shrink-0">{ci + 1}.</span>
                          <span>{cue}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
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

// ─── Position config ──────────────────────────────────────────────────────────

const SUPPORTED_POSITIONS = ['RB', 'WR', 'QB', 'OL', 'TE', 'DL', 'LB', 'OLB', 'DB', 'CB', 'S'] as const
type SupportedPosition = typeof SUPPORTED_POSITIONS[number]

function isSupportedPosition(pos: string | null | undefined): pos is SupportedPosition {
  return SUPPORTED_POSITIONS.includes((pos?.toUpperCase() ?? '') as SupportedPosition)
}

function getAreaLabels(pos: SupportedPosition): Record<string, string> {
  if (pos === 'WR') return WR_AREA_LABELS
  if (pos === 'QB') return QB_AREA_LABELS
  if (pos === 'OL') return OL_AREA_LABELS
  if (pos === 'TE') return TE_AREA_LABELS
  if (pos === 'DL') return DL_AREA_LABELS
  if (pos === 'LB') return LB_AREA_LABELS
  if (pos === 'OLB') return OLB_AREA_LABELS
  if (pos === 'DB' || pos === 'CB' || pos === 'S') return DB_AREA_LABELS
  return RB_AREA_LABELS
}

function matchDrills(pos: SupportedPosition, issues: string[]): AnyDrill[] {
  const finder = pos === 'WR' ? findWRDrillsForPainPoint
    : pos === 'QB' ? findQBDrillsForPainPoint
    : pos === 'OL' ? findOLDrillsForPainPoint
    : pos === 'TE' ? findTEDrillsForPainPoint
    : pos === 'DL' ? findDLDrillsForPainPoint
    : pos === 'LB' ? findLBDrillsForPainPoint
    : pos === 'OLB' ? findOLBDrillsForPainPoint
    : (pos === 'DB' || pos === 'CB' || pos === 'S') ? findDBDrillsForPainPoint
    : findRBDrillsForPainPoint
  const scoreMap = new Map<string, { drill: AnyDrill; score: number }>()
  for (const issue of issues) {
    for (const drill of finder(issue)) {
      const entry = scoreMap.get(drill.name)
      if (entry) entry.score += 1
      else scoreMap.set(drill.name, { drill, score: 1 })
    }
  }
  return [...scoreMap.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(({ drill }) => drill)
}

function getTeachingStep(pos: SupportedPosition, area: string): AnyTeachingStep | undefined {
  if (pos === 'WR') return getWRTeachingStep(area as Parameters<typeof getWRTeachingStep>[0])
  if (pos === 'QB') return getQBTeachingStep(area as Parameters<typeof getQBTeachingStep>[0])
  if (pos === 'OL') return getOLTeachingStep(area as Parameters<typeof getOLTeachingStep>[0])
  if (pos === 'TE') return getTETeachingStep(area as Parameters<typeof getTETeachingStep>[0])
  if (pos === 'DL') return getDLTeachingStep(area as Parameters<typeof getDLTeachingStep>[0])
  if (pos === 'LB') return getLBTeachingStep(area as Parameters<typeof getLBTeachingStep>[0])
  if (pos === 'OLB') return getOLBTeachingStep(area as Parameters<typeof getOLBTeachingStep>[0])
  if (pos === 'DB' || pos === 'CB' || pos === 'S') return getDBTeachingStep(area as Parameters<typeof getDBTeachingStep>[0])
  return getRBTeachingStep(area as Parameters<typeof getRBTeachingStep>[0])
}

function matchTeachingSteps(pos: SupportedPosition, drills: AnyDrill[]): AnyTeachingStep[] {
  const seen = new Set<string>()
  const steps: AnyTeachingStep[] = []
  for (const drill of drills) {
    if (!seen.has(drill.technique_area)) {
      seen.add(drill.technique_area)
      const step = getTeachingStep(pos, drill.technique_area)
      if (step) steps.push(step)
    }
  }
  return steps.sort((a, b) => a.order - b.order)
}

// ─── Panel ────────────────────────────────────────────────────────────────────

export default function DrillReferencePanel({ position, issues }: DrillReferencePanelProps) {
  const pos = position?.toUpperCase() as SupportedPosition | undefined

  const matchedDrills = useMemo<AnyDrill[]>(() => {
    if (!pos || !isSupportedPosition(pos) || issues.length === 0) return []
    return matchDrills(pos, issues)
  }, [pos, issues])

  const teachingSteps = useMemo<AnyTeachingStep[]>(() => {
    if (!pos || !isSupportedPosition(pos)) return []
    return matchTeachingSteps(pos, matchedDrills)
  }, [pos, matchedDrills])

  if (!pos || !isSupportedPosition(pos)) return null
  if (matchedDrills.length === 0) return null

  const areaLabels = getAreaLabels(pos)
  const posLabel = pos

  return (
    <div className="mt-4 space-y-3">
      {/* ── Matched Drills ──────────────────────────────────────────── */}
      <div className="border border-brand-800/50 rounded-xl overflow-hidden">
        <div className="px-4 py-3 bg-brand-950/40 border-b border-brand-800/50 flex items-center gap-2">
          <span className="text-brand-400 text-base">🏈</span>
          <div>
            <p className="text-xs font-semibold text-brand-400 uppercase tracking-wide">
              {posLabel} Drill Library — Matched to Issues
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              {matchedDrills.length} drill{matchedDrills.length !== 1 ? 's' : ''} matched · tap to expand
            </p>
          </div>
        </div>
        <div className="divide-y divide-field-border bg-field-card/50">
          {matchedDrills.map(drill => (
            <DrillCard key={drill.name} drill={drill} areaLabels={areaLabels} />
          ))}
        </div>
      </div>

      {/* ── Coaching Notes (teaching progression) ───────────────────── */}
      {teachingSteps.length > 0 && (
        <div className="border border-field-border rounded-xl overflow-hidden">
          <div className="px-4 py-3 bg-field-card border-b border-field-border flex items-center gap-2">
            <span className="text-gray-400 text-base">📋</span>
            <div>
              <p className="text-xs font-semibold text-gray-300 uppercase tracking-wide">
                Coaching Notes
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                Teaching steps for the affected areas · tap to expand
              </p>
            </div>
          </div>
          <div className="divide-y divide-field-border bg-field-card/50">
            {teachingSteps.map(step => (
              <TeachingStepCard key={step.order} step={step} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
