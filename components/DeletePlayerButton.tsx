// components/DeletePlayerButton.tsx
//
// Hard-deletes a player (all sessions, all video rows, all storage files,
// the player row) via DELETE /api/players/[playerId]. Server-side route
// does the actual ownership check and storage-first delete sequence — this
// component only confirms and calls it. Consent records are retained by
// the server route (see migration-v11) — not this component's concern.
//
// Confirm dialog names what's being deleted, per the build spec.

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface DeletePlayerButtonProps {
  coachId: string
  playerId: string
  playerName: string
  sessionCount: number
}

export default function DeletePlayerButton({ coachId, playerId, playerName, sessionCount }: DeletePlayerButtonProps) {
  const router = useRouter()
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    const sessionPhrase = sessionCount === 1 ? '1 session' : `${sessionCount} sessions`
    const confirmed = window.confirm(
      `Permanently delete ${playerName} and all ${sessionPhrase} and videos? This cannot be undone.`
    )
    if (!confirmed) return

    setDeleting(true)
    try {
      const res = await fetch(`/api/players/${playerId}`, {
        method: 'DELETE',
      })
      const json = await res.json()

      if (!res.ok) {
        window.alert(json.error ?? 'Failed to delete player.')
        setDeleting(false)
        return
      }

      router.push(`/${coachId}/players`)
      router.refresh()
    } catch {
      window.alert('Failed to delete player. Please try again.')
      setDeleting(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={deleting}
      className="bg-field-card border border-red-900 hover:border-red-700 text-red-500 hover:text-red-400 font-medium px-4 py-2 rounded-xl text-sm transition-colors text-center disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {deleting ? 'Deleting…' : '🗑 Delete Player'}
    </button>
  )
}
