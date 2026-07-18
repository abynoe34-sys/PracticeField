'use client'

// components/ReferencePhotoUpload.tsx
//
// Feature B (BUILD_SPEC_photo_upload.md) — "Add reference photo": a plain
// image attached to a player and/or session for documentation/form-check.
// Deliberately NOT TwoClipUpload — no side/front slots, no pairing, no
// "Submit for Analysis" language, no drop zone. A single always-visible
// control with an explicit "not analyzed" label, so it can't be mistaken
// for the stance-analysis upload.

import { useState, useRef } from 'react'
import type { ReferencePhoto } from '@/types'

const MAX_BYTES = 20_971_520 // 20MB — matches the Feature A photo cap
const ALLOWED_MIME = ['image/jpeg', 'image/png']

interface ReferencePhotoUploadProps {
  coachId?:         string
  playerId?:        string
  playerAccountId?: string
  authToken?:       string
  sessionId?:       string
  onUploaded:       (photo: ReferencePhoto) => void
}

export default function ReferencePhotoUpload(props: ReferencePhotoUploadProps) {
  const { onUploaded, sessionId, playerId, coachId, playerAccountId, authToken } = props
  const [file, setFile] = useState<File | null>(null)
  const [caption, setCaption] = useState('')
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null!)

  const pick = (f: File) => {
    setError(null)
    if (!ALLOWED_MIME.includes(f.type)) {
      setError('Wrong file type — use JPEG or PNG.')
      return
    }
    if (f.size > MAX_BYTES) {
      setError('File too large — maximum size is 20 MB.')
      return
    }
    setFile(f)
  }

  const upload = async () => {
    if (!file) return
    setUploading(true)
    setError(null)

    try {
      const presignHeaders: HeadersInit = { 'Content-Type': 'application/json' }
      if (authToken) presignHeaders['Authorization'] = `Bearer ${authToken}`

      const presignRes = await fetch('/api/reference-photos/presign', {
        method:  'POST',
        headers: presignHeaders,
        body: JSON.stringify({
          session_id:  sessionId || undefined,
          caption:     caption.trim() || undefined,
          file_name:   file.name,
          file_type:   file.type,
          file_size:   file.size,
          ...(playerAccountId
            ? { player_account_id: playerAccountId }
            : { player_id: playerId, coach_id: coachId }),
        }),
      })
      const presignJson = await presignRes.json()
      if (!presignRes.ok) throw new Error(presignJson.error ?? 'Could not start upload.')

      const storageRes = await fetch(presignJson.signedUrl, {
        method:  'PUT',
        headers: { 'Content-Type': file.type },
        body:    file,
      })
      if (!storageRes.ok) throw new Error(`Storage upload failed (${storageRes.status})`)

      const confirmHeaders: HeadersInit = { 'Content-Type': 'application/json' }
      if (authToken) confirmHeaders['Authorization'] = `Bearer ${authToken}`

      const confirmRes = await fetch('/api/reference-photos/confirm', {
        method:  'POST',
        headers: confirmHeaders,
        body: JSON.stringify({ storage_path: presignJson.storagePath, ...presignJson.meta }),
      })
      const confirmJson = await confirmRes.json()
      if (!confirmRes.ok) throw new Error(confirmJson.error ?? 'Upload failed.')

      onUploaded(confirmJson.photo as ReferencePhoto)
      setFile(null)
      setCaption('')
      if (fileRef.current) fileRef.current.value = ''
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="border border-dashed border-field-border rounded-md p-4 space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-lg">🖼️</span>
        <div>
          <p className="text-sm font-medium text-white">Add reference photo</p>
          <p className="text-xs text-field-muted">For documentation or form-check — not analyzed.</p>
        </div>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png"
        className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) pick(f) }}
      />

      {!file ? (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="text-xs bg-field-card border border-field-border hover:border-brand-600 text-white px-3 py-1.5 rounded-md transition-colors"
        >
          Choose photo (JPEG/PNG, max 20 MB)
        </button>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center gap-3 bg-field-dark border border-field-border rounded-md px-3 py-2">
            <span className="text-sm text-white truncate flex-1">{file.name}</span>
            <span className="text-xs text-field-muted">{(file.size / 1024 / 1024).toFixed(1)} MB</span>
            <button
              type="button"
              onClick={() => { setFile(null); if (fileRef.current) fileRef.current.value = '' }}
              className="text-xs text-gray-500 hover:text-gray-300"
            >
              Remove
            </button>
          </div>
          <input
            type="text"
            value={caption}
            onChange={e => setCaption(e.target.value)}
            placeholder="Caption (optional)"
            className="w-full bg-field-card border border-field-border rounded-md px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-brand-600"
          />
          <button
            onClick={upload}
            disabled={uploading}
            className="w-full bg-field-card border border-field-border hover:border-brand-600 disabled:opacity-50 text-white font-medium py-2 rounded-md text-sm transition-colors"
          >
            {uploading ? 'Uploading…' : 'Add photo'}
          </button>
        </div>
      )}

      {error && <p className="text-xs text-brand-300">{error}</p>}
    </div>
  )
}
