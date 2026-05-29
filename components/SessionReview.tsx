'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { todayISO } from '@/lib/utils'
import type { Player } from '@/types'

interface SessionReviewProps {
  player: Player
  coachId: string
  onSuccess?: (sessionId: string) => void
}

type TagInputProps = {
  label: string
  items: string[]
  onChange: (items: string[]) => void
  placeholder?: string
  colorClass?: string
}

function TagInput({ label, items, onChange, placeholder, colorClass = 'bg-brand-950 text-brand-300 border-brand-800' }: TagInputProps) {
  const [draft, setDraft] = useState('')

  const add = () => {
    const trimmed = draft.trim()
    if (trimmed && !items.includes(trimmed)) {
      onChange([...items, trimmed])
    }
    setDraft('')
  }

  const remove = (idx: number) => {
    onChange(items.filter((_, i) => i !== idx))
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-1.5">{label}</label>
      <div className="flex gap-2">
        <input
          type="text"
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add() } }}
          placeholder={placeholder}
          className="flex-1 bg-field-dark border border-field-border rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-brand-600"
        />
        <button
          type="button"
          onClick={add}
          className="px-3 py-2 bg-field-card border border-field-border rounded-lg text-sm text-gray-300 hover:text-white hover:border-gray-500 transition-colors"
        >
          Add
        </button>
      </div>
      {items.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {items.map((item, i) => (
            <span key={i} className={`flex items-center gap-1 text-xs px-2 py-1 rounded border ${colorClass}`}>
              {item}
              <button
                type="button"
                onClick={() => remove(i)}
                className="opacity-60 hover:opacity-100 ml-0.5 font-bold"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

export default function SessionReview({ player, coachId, onSuccess }: SessionReviewProps) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [sessionDate, setSessionDate] = useState(todayISO())
  const [strengths, setStrengths] = useState<string[]>([])
  const [improvements, setImprovements] = useState<string[]>([])
  const [rootCauses, setRootCauses] = useState<Record<string, string>>({})
  const [notes, setNotes] = useState('')

  // Keep root_causes in sync when improvements change
  const updateImprovement = (newList: string[]) => {
    setImprovements(newList)
    // Remove root causes for removed improvements
    const updated: Record<string, string> = {}
    for (const imp of newList) {
      updated[imp] = rootCauses[imp] ?? ''
    }
    setRootCauses(updated)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (improvements.length === 0 && strengths.length === 0) {
      setError('Add at least one strength or area to improve.')
      return
    }
    setSaving(true)
    setError(null)

    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          player_id: player.id,
          coach_id: coachId,
          session_date: sessionDate,
          strengths,
          improvements,
          root_causes: rootCauses,
          notes: notes.trim() || null,
        }),
      })

      const json = await res.json()

      if (!res.ok) {
        setError(json.error ?? 'Failed to save session')
        return
      }

      if (onSuccess) {
        onSuccess(json.session.id)
      } else {
        router.push(`/${coachId}/players/${player.id}`)
        router.refresh()
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Session Date */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1.5">Session Date</label>
        <input
          type="date"
          value={sessionDate}
          onChange={e => setSessionDate(e.target.value)}
          required
          className="bg-field-dark border border-field-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-600"
        />
      </div>

      {/* Strengths */}
      <TagInput
        label="Strengths (what's working well)"
        items={strengths}
        onChange={setStrengths}
        placeholder="e.g. Route running timing"
        colorClass="bg-brand-950 text-brand-300 border-brand-800"
      />

      {/* Improvements */}
      <TagInput
        label="Areas to Improve (pain points)"
        items={improvements}
        onChange={updateImprovement}
        placeholder="e.g. Slow off the line"
        colorClass="bg-red-950 text-red-400 border-red-900"
      />

      {/* Root Causes */}
      {improvements.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-medium text-gray-300">Root Causes (WHY does each issue exist?)</p>
          {improvements.map(imp => (
            <div key={imp}>
              <label className="block text-xs text-gray-500 mb-1">{imp}</label>
              <input
                type="text"
                value={rootCauses[imp] ?? ''}
                onChange={e => setRootCauses(prev => ({ ...prev, [imp]: e.target.value }))}
                placeholder="e.g. Hip flexor tightness causes slow first step"
                className="w-full bg-field-dark border border-field-border rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-brand-600"
              />
            </div>
          ))}
        </div>
      )}

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1.5">Additional Notes</label>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Any other observations, context, or reminders..."
          rows={3}
          className="w-full bg-field-dark border border-field-border rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-brand-600 resize-none"
        />
      </div>

      {error && (
        <p className="text-sm text-red-400 bg-red-950 border border-red-900 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={saving}
        className="w-full bg-brand-600 hover:bg-brand-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors"
      >
        {saving ? 'Saving…' : 'Save Session'}
      </button>
    </form>
  )
}
