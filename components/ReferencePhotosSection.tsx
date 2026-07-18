'use client'

// components/ReferencePhotosSection.tsx
//
// Client island combining ReferencePhotoUpload + ReferencePhotoGallery with
// local state, so the server-rendered player/session pages don't need to be
// client components themselves. Reused across the player detail page, the
// session detail page, and the player's own self-signup dashboard — same
// upload/delete flow, just different owner props.

import { useState } from 'react'
import ReferencePhotoUpload from './ReferencePhotoUpload'
import ReferencePhotoGallery from './ReferencePhotoGallery'
import type { ReferencePhoto } from '@/types'

interface ReferencePhotosSectionProps {
  initialPhotos:    ReferencePhoto[]
  coachId?:         string
  playerId?:        string
  playerAccountId?: string
  authToken?:       string
  sessionId?:       string
}

export default function ReferencePhotosSection(props: ReferencePhotosSectionProps) {
  const { initialPhotos, ...uploadProps } = props
  const [photos, setPhotos] = useState<ReferencePhoto[]>(initialPhotos)

  const handleUploaded = (photo: ReferencePhoto) => {
    setPhotos(prev => [photo, ...prev])
  }

  const handleDelete = async (photoId: string) => {
    if (!confirm('Delete this reference photo?')) return
    const headers: HeadersInit = {}
    if (props.authToken) headers['Authorization'] = `Bearer ${props.authToken}`
    const res = await fetch(`/api/reference-photos/${photoId}`, { method: 'DELETE', headers })
    if (res.ok) {
      setPhotos(prev => prev.filter(p => p.id !== photoId))
    } else {
      const json = await res.json().catch(() => ({}))
      alert(json.error ?? 'Failed to delete photo.')
    }
  }

  return (
    <div className="space-y-3">
      <ReferencePhotoGallery photos={photos} onDelete={handleDelete} />
      <ReferencePhotoUpload {...uploadProps} onUploaded={handleUploaded} />
    </div>
  )
}
