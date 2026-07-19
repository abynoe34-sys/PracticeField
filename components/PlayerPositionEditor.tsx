'use client'

// components/PlayerPositionEditor.tsx
//
// Coach-side inline editor for a player's profile position (Position capture
// build — "also editable afterward"). The player detail page is a server
// component; this is a small client island that swaps the static position
// label for a select + Save, PATCHing /api/players/[playerId] (ownership
// checked server-side via the coach session). router.refresh() re-runs the
// server page so the new value is reflected everywhere on it.

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { FOOTBALL_POSITIONS } from '@/lib/position'

interface Props {
  playerId:        string
  initialPosition: string | null
}

export default function PlayerPositionEditor({ playerId, initialPosition }: Props) {
  const router = useRouter()
  const [position, setPosition] = useState<string | null>(initialPosition)
  const [editing,  setEditing]  = useState(false)
  const [draft,    setDraft]    = useState(initialPosition ?? '')
  const [saving,   setSaving]   = useState(false)

  const save = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/players/${playerId}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ position: draft || null }),
      })
      if (res.ok) {
        const { player } = await res.json()
        setPosition(player.position ?? null)
        setEditing(false)
        router.refresh()
      }
    } finally {
      setSaving(false)
    }
  }

  if (editing) {
    return (
      <span className="inline-flex items-center gap-2">
        <select
          value={draft}
          onChange={e => setDraft(e.target.value)}
          className="bg-field-dark border border-field-border rounded-md px-2 py-1 text-xs text-white focus:outline-none focus:border-brand-600"
        >
          <option value="">No position</option>
          {FOOTBALL_POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <button
          onClick={save}
          disabled={saving}
          className="text-xs text-brand-400 hover:text-brand-300 disabled:opacity-60 transition-colors"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button
          onClick={() => { setDraft(position ?? ''); setEditing(false) }}
          className="text-xs text-gray-600 hover:text-gray-400 transition-colors"
        >
          Cancel
        </button>
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="text-sm text-gray-400">{position ?? 'No position'}</span>
      <button
        onClick={() => { setDraft(position ?? ''); setEditing(true) }}
        className="text-xs text-brand-400 hover:text-brand-300 transition-colors"
      >
        edit
      </button>
    </span>
  )
}
