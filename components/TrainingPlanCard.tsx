'use client'

import { useState } from 'react'
import type { TrainingPlan, Exercise } from '@/types'
import { formatDate } from '@/lib/utils'

interface TrainingPlanCardProps {
  plan: TrainingPlan
  timeline?: {
    weeks: string
    reason: string
    pivot_at_weeks: number
  }
}

const CATEGORY_STYLES: Record<Exercise['category'], { label: string; color: string }> = {
  warmup:    { label: 'Warm-Up',   color: 'bg-orange-950 text-orange-300 border-orange-900' },
  speed:     { label: 'Speed',     color: 'bg-yellow-950 text-yellow-300 border-yellow-900' },
  agility:   { label: 'Agility',   color: 'bg-blue-950 text-blue-300 border-blue-900' },
  strength:  { label: 'Strength',  color: 'bg-red-950 text-red-400 border-red-900' },
  footwork:  { label: 'Footwork',  color: 'bg-purple-950 text-purple-300 border-purple-900' },
  technique: { label: 'Technique', color: 'bg-teal-950 text-teal-300 border-teal-900' },
  cooldown:  { label: 'Cool-Down', color: 'bg-gray-800 text-gray-400 border-gray-700' },
}

function ExerciseRow({ exercise, index }: { exercise: Exercise; index: number }) {
  const [open, setOpen] = useState(false)
  const style = CATEGORY_STYLES[exercise.category] ?? CATEGORY_STYLES.technique

  const volumeStr = exercise.duration
    ? exercise.duration
    : exercise.sets && exercise.reps
    ? `${exercise.sets} × ${exercise.reps}`
    : exercise.sets
    ? `${exercise.sets} sets`
    : ''

  return (
    <div className="border border-field-border rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-3 bg-field-card hover:bg-field-border/20 transition-colors text-left"
      >
        <span className="shrink-0 w-7 h-7 rounded-full bg-field-dark border border-field-border flex items-center justify-center text-xs font-bold text-gray-400">
          {index + 1}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate">{exercise.name}</p>
          {volumeStr && (
            <p className="text-xs text-gray-500 mt-0.5">{volumeStr}</p>
          )}
        </div>
        <span className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded border ${style.color}`}>
          {style.label}
        </span>
        <span className="text-gray-500 text-xs ml-1">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="px-4 py-4 bg-field-dark border-t border-field-border space-y-3">
          {/* Why this helps */}
          <div>
            <p className="text-xs font-semibold text-brand-400 uppercase tracking-wide mb-1">Why this helps</p>
            <p className="text-sm text-gray-300">{exercise.why}</p>
          </div>

          {/* Coaching cue */}
          {exercise.coaching_cue && (
            <div className="bg-yellow-950/50 border border-yellow-900/60 rounded-lg px-3 py-2">
              <p className="text-xs font-semibold text-yellow-400 uppercase tracking-wide mb-0.5">🗣 Coaching Cue</p>
              <p className="text-sm text-yellow-100 italic">&ldquo;{exercise.coaching_cue}&rdquo;</p>
            </div>
          )}

          {/* Demo video link */}
          {exercise.demo_url && (
            <a
              href={exercise.demo_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-xs text-red-400 hover:text-red-300 transition-colors"
              onClick={e => e.stopPropagation()}
            >
              <span className="text-base leading-none">▶</span>
              <span className="font-medium">Watch demo on YouTube</span>
              <span className="opacity-50">↗</span>
            </a>
          )}
        </div>
      )}
    </div>
  )
}

export default function TrainingPlanCard({ plan, timeline }: TrainingPlanCardProps) {
  return (
    <div className="space-y-5">
      {/* Plan Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs text-gray-500">
            Generated {formatDate(plan.created_at)} · {plan.generated_by === 'ai' ? '🤖 AI' : '👤 Coach'}
          </p>
          <p className="text-sm text-gray-400 mt-1">
            {plan.commitment_weeks}-week commitment · {plan.experience_level}
          </p>
        </div>
        {plan.expires_at && (
          <span className="text-xs bg-yellow-950 text-yellow-400 border border-yellow-900 px-2 py-0.5 rounded">
            Review by {formatDate(plan.expires_at)}
          </span>
        )}
      </div>

      {/* Pain Points */}
      {plan.pain_points.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Targeting</p>
          <div className="flex flex-wrap gap-1.5">
            {plan.pain_points.map((pp, i) => (
              <span key={i} className="text-xs bg-red-950 text-red-400 border border-red-900 px-2 py-0.5 rounded">
                {pp}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Timeline */}
      {timeline && (
        <div className="bg-brand-950 border border-brand-800 rounded-lg p-4">
          <p className="text-sm font-semibold text-brand-300">
            📅 Expected progress: {timeline.weeks}
          </p>
          <p className="text-xs text-brand-400 mt-1">{timeline.reason}</p>
          <p className="text-xs text-gray-500 mt-2">
            If no improvement after {timeline.pivot_at_weeks} weeks, re-evaluate the plan.
          </p>
        </div>
      )}

      {/* Exercises */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
          Exercises ({plan.exercises.length})
        </p>
        <div className="space-y-2">
          {plan.exercises.map((ex, i) => (
            <ExerciseRow key={i} exercise={ex} index={i} />
          ))}
        </div>
      </div>
    </div>
  )
}
