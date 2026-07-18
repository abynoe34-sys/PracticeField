// components/DeleteSessionButton.tsx
//
// Hard-deletes a session (both video rows, both storage files, the parent
// sessions row) via DELETE /api/sessions/[sessionId]. Server-side route
// does the actual ownership check and storage-first delete sequence — this
// component only confirms and calls it.
//
// Confirm dialog names what's being deleted, per the build spec: not a bare
// "Are you sure?", not type-to-confirm. A plain browser confirm() is
// intentional — it's the simplest thing that satisfies "names what will be
// deleted" without building a custom modal for a single irreversible action.

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface DeleteSessionButtonProps {
  coachId: string
  playerId: string
  sessionId: string
  sessionLabel: string // e.g. formatted session date, used in the confirm message
}

export default function DeleteSessionButton({ coachId, playerId, sessionId, sessionLabel }: DeleteSessionButtonProps) {
  const router = useRouter()
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    const confirmed = window.confirm(
      `Permanently delete this session (${sessionLabel}) and its videos? This cannot be undone.`
    )
    if (!confirmed) return

    setDeleting(true)
    try {
      const res = await fetch(`/api/sessions/${sessionId}?coachId=${encodeURIComponent(coachId)}`, {
        method: 'DELETE',
      })
      const json = await res.json()

      if (!res.ok) {
        window.alert(json.error ?? 'Failed to delete session.')
        setDeleting(false)
        return
      }

      router.push(`/${coachId}/players/${playerId}`)
      router.refresh()
    } catch {
      window.alert('Failed to delete session. Please try again.')
      setDeleting(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={deleting}
      className="text-xs text-red-500 hover:text-red-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      {deleting ? 'Deleting…' : '🗑 Delete session'}
    </button>
  )
}
