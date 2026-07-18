'use client'

import { useState, useRef } from 'react'
import type { SessionVideo } from '@/types'

// ── Types ─────────────────────────────────────────────────────────────────────

// The active slot tracks one in-progress upload at a time per view.
// Completed uploads accumulate in ViewState.uploaded.
type ActiveSlot =
  | { status: 'idle' }
  | { status: 'selected'; file: File }
  | { status: 'uploading'; file: File }
  | { status: 'failed'; error: string }

interface ViewState {
  uploaded: SessionVideo[]
  active:   ActiveSlot
}

const BLANK_VIEW: ViewState = { uploaded: [], active: { status: 'idle' } }

// NOTE: This component is named TwoClipUpload for historical reasons but
// supports any number of clips per view. Rename decision deferred to owner.
interface TwoClipUploadProps {
  // sessionId must reference an existing sessions.id row — FK enforced in DB.
  sessionId:        string
  drillType:        string
  // Coach-managed path: supply both playerId + coachId
  playerId?:        string
  coachId?:         string
  // Self-signup path: supply playerAccountId + authToken
  playerAccountId?: string
  authToken?:       string
  // Called when at least one side and one front clip have been uploaded.
  onSessionReady:   (sideVideos: SessionVideo[], frontVideos: SessionVideo[]) => void
}

// ── Constants ─────────────────────────────────────────────────────────────────

// Photos (Feature A — analyzed stance photos) flow into the exact same
// pipeline as video, just as a single-frame input — see
// BUILD_SPEC_photo_upload.md. Capped much lower than video's 500MB ceiling
// since a phone photo has no legitimate reason to approach that size.
const MAX_VIDEO_BYTES = 524_288_000
const MAX_PHOTO_BYTES = 20_971_520 // 20MB
const ALLOWED_VIDEO_MIME = ['video/mp4', 'video/quicktime', 'video/webm', 'video/x-msvideo']
const ALLOWED_PHOTO_MIME = ['image/jpeg', 'image/png']

type MediaType = 'video' | 'photo'

function mediaTypeOf(f: File): MediaType | null {
  if (ALLOWED_VIDEO_MIME.includes(f.type)) return 'video'
  if (ALLOWED_PHOTO_MIME.includes(f.type)) return 'photo'
  return null
}

const ANGLE_META: Record<'side' | 'front', { heading: string; body: string }> = {
  side: {
    heading: 'Side view',
    body:    'Camera at hip height, square to your side. Full body visible — head through feet, nothing cut off.',
  },
  front: {
    heading: 'Front view',
    body:    'Camera at hip height, facing straight at you. Full body in frame — feet flat on ground, top of helmet visible.',
  },
}

// ── Helpers ───────────────────────────────────────────────────────────────────

// requiredType is set once the OTHER slot already has a clip — side and front
// must be the same media_type for a given session (a mixed pair would leave
// the analysis path ambiguous: which running mode does the Python service
// use?). Enforced here client-side; lib/jobs/ol-stance-analysis.ts also
// re-checks this server-side as a backstop before calling /analyse.
function validateFile(f: File, requiredType: MediaType | null): string | null {
  const type = mediaTypeOf(f)
  if (!type) return 'Wrong file type — use MP4, MOV, WebM, AVI (video) or JPEG, PNG (photo).'
  if (requiredType && type !== requiredType) {
    return `This session already has a ${requiredType} clip — side and front must both be ${requiredType === 'video' ? 'videos' : 'photos'}, not a mix.`
  }
  const maxBytes = type === 'photo' ? MAX_PHOTO_BYTES : MAX_VIDEO_BYTES
  if (f.size > maxBytes) {
    return `File too large — maximum size is ${type === 'photo' ? '20 MB' : '500 MB'}.`
  }
  return null
}

// ── Sub-component: one view section ──────────────────────────────────────────

interface ViewSectionProps {
  angle:    'side' | 'front'
  state:    ViewState
  fileRef:  React.RefObject<HTMLInputElement>
  onPick:   (f: File) => void
  onUpload: () => void
  onReset:  () => void
}

function ViewSection({ angle, state, fileRef, onPick, onUpload, onReset }: ViewSectionProps) {
  const [dragOver, setDragOver] = useState(false)
  const { heading, body } = ANGLE_META[angle]
  const { uploaded, active } = state
  const count       = uploaded.length
  const hasUploaded = count > 0

  const borderCls =
    hasUploaded          ? 'border-green-800' :
    active.status === 'failed' ? 'border-red-900'  : 'border-field-border'

  return (
    <div className={`bg-field-card border ${borderCls} rounded-xl p-5 space-y-3 transition-colors`}>

      {/* Always-present hidden file input — shared by dropzone click and "Add another" button */}
      <input
        ref={fileRef}
        type="file"
        accept="video/*,image/jpeg,image/png"
        className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) onPick(f) }}
      />

      {/* Header row */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
            hasUploaded
              ? 'bg-green-900 text-green-300'
              : 'bg-field-dark text-gray-400 border border-field-border'
          }`}>
            {hasUploaded ? count : '·'}
          </span>
          <span className="text-sm font-semibold text-white">
            {heading}
            {hasUploaded && (
              <span className="text-gray-500 font-normal ml-1.5">
                ({count} uploaded)
              </span>
            )}
          </span>
        </div>

        {/* "Add another" only shown when at least one clip is uploaded and slot is idle */}
        {hasUploaded && active.status === 'idle' && (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="text-xs text-brand-400 hover:text-brand-300 transition-colors"
          >
            + Add another
          </button>
        )}
      </div>

      {/* Angle description */}
      <p className="text-xs text-gray-500 leading-relaxed pl-8">{body}</p>

      {/* Uploaded clip list */}
      {hasUploaded && (
        <ul className="pl-8 space-y-1">
          {uploaded.map(v => (
            <li key={v.id} className="flex items-center gap-2 text-xs">
              <span className="text-green-400">✓</span>
              <span>{v.media_type === 'photo' ? '📷' : '🎬'}</span>
              <span className="text-gray-400 truncate">{v.file_name ?? v.label ?? 'Clip'}</span>
            </li>
          ))}
        </ul>
      )}

      {/* Drop zone — only shown when no uploads yet and slot is idle */}
      {active.status === 'idle' && !hasUploaded && (
        <div
          onDrop={e => {
            e.preventDefault()
            setDragOver(false)
            const f = e.dataTransfer.files[0]
            if (f) onPick(f)
          }}
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onClick={() => fileRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
            dragOver
              ? 'border-brand-500 bg-brand-950'
              : 'border-field-border hover:border-brand-700 hover:bg-field-dark'
          }`}
        >
          <p className="text-sm text-gray-400">
            Drop clip or photo here or <span className="text-brand-400">browse</span>
          </p>
          <p className="text-xs text-gray-600 mt-1">Video: MP4, MOV, WebM, AVI · max 500 MB — Photo: JPEG, PNG · max 20 MB</p>
        </div>
      )}

      {/* Selected — file preview + upload button */}
      {active.status === 'selected' && (
        <div className="pl-8 space-y-3">
          <div className="flex items-center gap-3 bg-field-dark border border-field-border rounded-lg px-3 py-2.5">
            <span className="text-xl">{mediaTypeOf(active.file) === 'photo' ? '📷' : '🎬'}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white truncate">{active.file.name}</p>
              <p className="text-xs text-gray-500">{(active.file.size / 1024 / 1024).toFixed(1)} MB</p>
            </div>
            <button
              type="button"
              onClick={onReset}
              className="text-gray-600 hover:text-gray-300 text-xs px-2 py-1 rounded transition-colors"
            >
              Remove
            </button>
          </div>
          <button
            onClick={onUpload}
            className="w-full bg-brand-600 hover:bg-brand-500 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors"
          >
            Upload {heading.toLowerCase()} clip
          </button>
        </div>
      )}

      {/* Uploading */}
      {active.status === 'uploading' && (
        <div className="pl-8 flex items-center gap-3 py-2">
          <div className="w-4 h-4 border-2 border-brand-500 border-t-transparent rounded-full animate-spin flex-shrink-0" />
          <p className="text-sm text-gray-400">Uploading…</p>
        </div>
      )}

      {/* Failed */}
      {active.status === 'failed' && (
        <div className="pl-8 space-y-2.5">
          <p className="text-sm text-red-400 bg-red-950 border border-red-900 rounded-lg px-3 py-2 leading-snug">
            {active.error}
          </p>
          <button
            onClick={onReset}
            className="text-sm text-brand-400 hover:text-brand-300 hover:underline transition-colors"
          >
            Try again
          </button>
        </div>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

// The OTHER slot's already-committed media type (from an uploaded clip, or a
// file merely selected/uploading) — used to reject a mismatched pick before
// it ever reaches the server. Uploaded clips take priority since they're the
// only state that's actually durable.
function establishedMediaType(view: ViewState): MediaType | null {
  if (view.uploaded.length > 0) return view.uploaded[0].media_type
  if (view.active.status === 'selected' || view.active.status === 'uploading') {
    return mediaTypeOf(view.active.file)
  }
  return null
}

export default function TwoClipUpload(props: TwoClipUploadProps) {
  const { onSessionReady, sessionId, drillType } = props

  const [side,  setSide]  = useState<ViewState>(BLANK_VIEW)
  const [front, setFront] = useState<ViewState>(BLANK_VIEW)

  const sideRef  = useRef<HTMLInputElement>(null!)
  const frontRef = useRef<HTMLInputElement>(null!)

  // ── File picking ───────────────────────────────────────────────────────────

  const pickFile = (angle: 'side' | 'front', f: File) => {
    const setter    = angle === 'side' ? setSide : setFront
    const otherView = angle === 'side' ? front   : side
    const err = validateFile(f, establishedMediaType(otherView))
    if (err) {
      setter(prev => ({ ...prev, active: { status: 'failed', error: err } }))
      return
    }
    setter(prev => ({ ...prev, active: { status: 'selected', file: f } }))
  }

  const resetActive = (angle: 'side' | 'front') => {
    const setter = angle === 'side' ? setSide : setFront
    const ref    = angle === 'side' ? sideRef  : frontRef
    setter(prev => ({ ...prev, active: { status: 'idle' } }))
    if (ref.current) ref.current.value = ''
  }

  // ── Upload ─────────────────────────────────────────────────────────────────

  const uploadClip = async (angle: 'side' | 'front') => {
    const view   = angle === 'side' ? side  : front
    const setter = angle === 'side' ? setSide : setFront
    if (view.active.status !== 'selected') return
    const file = view.active.file

    setter(prev => ({ ...prev, active: { status: 'uploading', file } }))

    try {
      // 1. Presign — consent gate runs server-side, returns a signed upload URL
      const presignHeaders: HeadersInit = { 'Content-Type': 'application/json' }
      if (props.authToken) presignHeaders['Authorization'] = `Bearer ${props.authToken}`

      const presignRes = await fetch('/api/videos/presign', {
        method:  'POST',
        headers: presignHeaders,
        body: JSON.stringify({
          session_id:  sessionId,
          view_angle:  angle,
          drill_type:  drillType,
          file_name:   file.name,
          file_type:   file.type,
          file_size:   file.size,
          ...(props.playerAccountId
            ? { player_account_id: props.playerAccountId }
            : { player_id: props.playerId, coach_id: props.coachId }),
        }),
      })
      const presignJson = await presignRes.json()
      if (!presignRes.ok) throw new Error(presignJson.error ?? 'Could not start upload.')

      // 2. Upload directly to Supabase Storage — bypasses the Next.js API entirely
      const storageRes = await fetch(presignJson.signedUrl, {
        method:  'PUT',
        headers: { 'Content-Type': file.type },
        body:    file,
      })
      if (!storageRes.ok) throw new Error(`Storage upload failed (${storageRes.status})`)

      // 3. Confirm — write the DB row now that the file is in storage
      const confirmRes = await fetch('/api/videos/confirm', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storage_path: presignJson.storagePath, ...presignJson.meta }),
      })
      const confirmJson = await confirmRes.json()
      if (!confirmRes.ok) throw new Error(confirmJson.error ?? 'Upload failed.')

      const uploaded: SessionVideo = confirmJson.video
      setter(prev => ({
        uploaded: [...prev.uploaded, uploaded],
        active:   { status: 'idle' },
      }))
    } catch (err) {
      setter(prev => ({
        ...prev,
        active: {
          status: 'failed',
          error:  err instanceof Error ? err.message : 'Upload failed. Please try again.',
        },
      }))
    }
  }

  // ── Derived state ──────────────────────────────────────────────────────────

  // Session is ready when at least one clip of each view has been uploaded.
  const sideReady  = side.uploaded.length  >= 1
  const frontReady = front.uploaded.length >= 1
  const canSubmit  = sideReady && frontReady

  const handleSubmit = () => {
    if (canSubmit) onSessionReady(side.uploaded, front.uploaded)
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">

      {/* Status summary */}
      <div className="flex items-center gap-3 text-xs">
        <span className={sideReady  ? 'text-green-400 font-medium' : 'text-gray-500'}>
          Side {sideReady  ? `(${side.uploaded.length})` : '(none yet)'}
        </span>
        <span className="text-gray-700">·</span>
        <span className={frontReady ? 'text-green-400 font-medium' : 'text-gray-500'}>
          Front {frontReady ? `(${front.uploaded.length})` : '(none yet)'}
        </span>
      </div>

      <ViewSection
        angle="side"
        state={side}
        fileRef={sideRef}
        onPick={f  => pickFile('side', f)}
        onUpload={() => uploadClip('side')}
        onReset={() => resetActive('side')}
      />

      <ViewSection
        angle="front"
        state={front}
        fileRef={frontRef}
        onPick={f  => pickFile('front', f)}
        onUpload={() => uploadClip('front')}
        onReset={() => resetActive('front')}
      />

      <button
        onClick={handleSubmit}
        disabled={!canSubmit}
        className="w-full bg-brand-600 hover:bg-brand-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl text-sm transition-colors"
      >
        {canSubmit
          ? 'Submit for Analysis'
          : 'Upload at least one side and one front clip to continue'}
      </button>

    </div>
  )
}
