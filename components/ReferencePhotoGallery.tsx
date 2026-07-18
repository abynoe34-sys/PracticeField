'use client'

// components/ReferencePhotoGallery.tsx
//
// Feature B (BUILD_SPEC_photo_upload.md) — labeled thumbnail gallery for
// reference_photos rows. Click a thumbnail to enlarge. Clearly labeled as
// reference images, not analysis — deliberately does not reuse
// VideoAnalysisCard/FeedbackCard's presentation so it can't be mistaken for
// analyzed content.

import { useState } from 'react'
import type { ReferencePhoto } from '@/types'

interface ReferencePhotoGalleryProps {
  photos:     ReferencePhoto[]
  onDelete?:  (photoId: string) => void
}

export default function ReferencePhotoGallery({ photos, onDelete }: ReferencePhotoGalleryProps) {
  const [enlarged, setEnlarged] = useState<ReferencePhoto | null>(null)

  if (photos.length === 0) return null

  return (
    <div>
      <p className="text-xs font-semibold text-field-muted uppercase tracking-wide mb-2">
        📎 Reference Photos <span className="normal-case font-normal">— not analyzed</span>
      </p>
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {photos.map(p => (
          <button
            key={p.id}
            type="button"
            onClick={() => setEnlarged(p)}
            className="relative aspect-square bg-field-card border border-field-border rounded-md overflow-hidden hover:border-brand-600 transition-colors"
          >
            {p.public_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.public_url} alt={p.caption ?? 'Reference photo'} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-2xl">🖼️</div>
            )}
          </button>
        ))}
      </div>

      {enlarged && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex flex-col items-center justify-center p-4"
          onClick={() => setEnlarged(null)}
        >
          <div className="max-w-2xl w-full space-y-2" onClick={e => e.stopPropagation()}>
            {enlarged.public_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={enlarged.public_url} alt={enlarged.caption ?? 'Reference photo'} className="w-full max-h-[70vh] object-contain rounded-md" />
            )}
            <div className="flex items-center justify-between gap-3 bg-field-card border border-field-border rounded-md px-3 py-2">
              <p className="text-sm text-white truncate">{enlarged.caption || 'Reference photo'}</p>
              <div className="flex items-center gap-3 shrink-0">
                {onDelete && (
                  <button
                    type="button"
                    onClick={() => { onDelete(enlarged.id); setEnlarged(null) }}
                    className="text-xs text-brand-300 hover:text-brand-200"
                  >
                    🗑 Delete
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setEnlarged(null)}
                  className="text-xs text-field-muted hover:text-white"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
