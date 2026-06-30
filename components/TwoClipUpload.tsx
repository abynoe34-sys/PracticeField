'use client'

import { useState, useRef } from 'react'
import type { SessionVideo } from '@/types'

// ── Types ─────────────────────────────────────────────────────────────────────

type ClipStatus = 'idle' | 'selected' | 'uploading' | 'uploaded' | 'failed'

interface ClipState {
  status:  ClipStatus
  file:    File | null
  video:   SessionVideo | null
  error:   string | null
}

const BLANK_CLIP: ClipState = { status: 'idle', file: null, video: null, error: null }

interface TwoClipUploadProps {
  // sessionId must reference an existing sessions.id row — FK enforced in DB.
  // The calling page is responsible for creating the session before rendering
  // this component and passing the resulting ID here.
  sessionId:        string
  // Required — prevents silent mislabeling if reused for a different drill.
  drillType:        string
  // Coach-managed path: supply both playerId + coachId
  playerId?:        string
  coachId?:         string
  // Self-signup path: supply playerAccountId + authToken
  playerAccountId?: string
  authToken?:       string
  onBothUploaded:   (sideVideo: SessionVideo, frontVideo: SessionVideo) => void
}

// ── Constants ─────────────────────────────────────────────────────────────────

const MAX_BYTES   = 524_288_000  // 500 MB
const ALLOWED_MIME = ['video/mp4', 'video/quicktime', 'video/webm', 'video/x-msvideo']

const ANGLE_DESCRIPTIONS: Record<'side' | 'front', { heading: string; body: string }> = {
  side: {
    heading: 'Side view',
    body:    'Camera at hip height, square to your side. Your full body should be visible — head through feet, nothing cut off.',
  },
  front: {
    heading: 'Front view',
    body:    'Camera at hip height, facing straight at you. Full body in frame — feet flat on the ground, top of helmet visible.',
  },
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function validateFile(f: File): string | null {
  if (!ALLOWED_MIME.includes(f.type)) {
    return 'Wrong file type — use MP4, MOV, WebM, or AVI.'
  }
  if (f.size > MAX_BYTES) {
    return 'File too large — maximum size is 500 MB.'
  }
  return null
}

// ── Sub-component: single clip step ──────────────────────────────────────────

interface ClipStepProps {
  step:      1 | 2
  angle:     'side' | 'front'
  clip:      ClipState
  locked:    boolean
  fileRef:   React.RefObject<HTMLInputElement>
  onPick:    (f: File) => void
  onUpload:  () => void
  onReset:   () => void
}

function ClipStep({ step, angle, clip, locked, fileRef, onPick, onUpload, onReset }: ClipStepProps) {
  const [dragOver, setDragOver] = useState(false)
  const { heading, body } = ANGLE_DESCRIPTIONS[angle]

  const statusChip: Record<ClipStatus, { label: string; cls: string }> = {
    idle:      { label: 'Waiting',          cls: 'text-gray-500'  },
    selected:  { label: 'Ready to upload',  cls: 'text-brand-400' },
    uploading: { label: 'Uploading…',       cls: 'text-brand-400' },
    uploaded:  { label: 'Uploaded',         cls: 'text-green-400' },
    failed:    { label: 'Failed',           cls: 'text-red-400'   },
  }

  const { label: chipLabel, cls: chipCls } = statusChip[clip.status]

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files[0]
    if (f) onPick(f)
  }

  const borderCls = clip.status === 'uploaded'
    ? 'border-green-800'
    : clip.status === 'failed'
      ? 'border-red-900'
      : 'border-field-border'

  const containerCls = locked && clip.status === 'idle'
    ? 'opacity-50 pointer-events-none'
    : ''

  return (
    <div className={`bg-field-card border ${borderCls} rounded-xl p-5 space-y-3 transition-colors ${containerCls}`}>

      {/* Header row */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
            clip.status === 'uploaded'
              ? 'bg-green-900 text-green-300'
              : 'bg-field-dark text-gray-400 border border-field-border'
          }`}>
            {clip.status === 'uploaded' ? '✓' : step}
          </span>
          <span className="text-sm font-semibold text-white">{heading}</span>
        </div>
        <span className={`text-xs font-medium ${chipCls}`}>{chipLabel}</span>
      </div>

      {/* Angle description */}
      <p className="text-xs text-gray-500 leading-relaxed pl-8">{body}</p>

      {/* ── Idle / locked ── */}
      {clip.status === 'idle' && (
        locked ? (
          <p className="text-xs text-gray-600 text-center py-3">Complete Step 1 first</p>
        ) : (
          <div
            onDrop={handleDrop}
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onClick={() => fileRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
              dragOver
                ? 'border-brand-500 bg-brand-950'
                : 'border-field-border hover:border-brand-700 hover:bg-field-dark'
            }`}
          >
            <p className="text-sm text-gray-400">Drop clip here or <span className="text-brand-400">browse</span></p>
            <p className="text-xs text-gray-600 mt-1">MP4, MOV, WebM, AVI · max 500 MB</p>
            <input
              ref={fileRef}
              type="file"
              accept="video/*"
              className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) onPick(f) }}
            />
          </div>
        )
      )}

      {/* ── Selected — file preview + upload button ── */}
      {clip.status === 'selected' && clip.file && (
        <div className="space-y-3">
          <div className="flex items-center gap-3 bg-field-dark border border-field-border rounded-lg px-3 py-2.5">
            <span className="text-xl">🎬</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white truncate">{clip.file.name}</p>
              <p className="text-xs text-gray-500">{(clip.file.size / 1024 / 1024).toFixed(1)} MB</p>
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
            Upload {heading} clip
          </button>
        </div>
      )}

      {/* ── Uploading ── */}
      {clip.status === 'uploading' && (
        <div className="flex items-center gap-3 py-2 px-1">
          <div className="w-4 h-4 border-2 border-brand-500 border-t-transparent rounded-full animate-spin flex-shrink-0" />
          <p className="text-sm text-gray-400">Uploading…</p>
        </div>
      )}

      {/* ── Uploaded ── */}
      {clip.status === 'uploaded' && (
        <div className="flex items-center gap-2 py-1 px-1">
          <span className="text-green-400 text-base leading-none">✓</span>
          <p className="text-sm text-green-400">Clip received</p>
        </div>
      )}

      {/* ── Failed — error + retry ── */}
      {clip.status === 'failed' && (
        <div className="space-y-2.5">
          <p className="text-sm text-red-400 bg-red-950 border border-red-900 rounded-lg px-3 py-2 leading-snug">
            {clip.error}
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

export default function TwoClipUpload(props: TwoClipUploadProps) {
  const { onBothUploaded, sessionId, drillType } = props

  const [side,  setSide]  = useState<ClipState>(BLANK_CLIP)
  const [front, setFront] = useState<ClipState>(BLANK_CLIP)

  const sideRef  = useRef<HTMLInputElement>(null!)
  const frontRef = useRef<HTMLInputElement>(null!)

  // ── File picking ───────────────────────────────────────────────────────────

  const pickFile = (angle: 'side' | 'front', f: File) => {
    const setter = angle === 'side' ? setSide : setFront
    const err = validateFile(f)
    if (err) {
      setter({ status: 'failed', file: null, video: null, error: err })
      return
    }
    setter({ status: 'selected', file: f, video: null, error: null })
  }

  const resetClip = (angle: 'side' | 'front') => {
    const setter = angle === 'side' ? setSide : setFront
    setter(BLANK_CLIP)
    // Also clear the file input so the same file can be re-selected
    const ref = angle === 'side' ? sideRef : frontRef
    if (ref.current) ref.current.value = ''
  }

  // ── Upload ─────────────────────────────────────────────────────────────────

  const uploadClip = async (angle: 'side' | 'front') => {
    const clip   = angle === 'side' ? side : front
    const setter = angle === 'side' ? setSide : setFront
    if (!clip.file) return

    setter(prev => ({ ...prev, status: 'uploading', error: null }))

    try {
      const form = new FormData()
      form.append('file',       clip.file)
      form.append('session_id', sessionId)
      form.append('view_angle', angle)
      form.append('drill_type', drillType)

      if (props.playerAccountId) {
        form.append('player_account_id', props.playerAccountId)
      } else if (props.playerId && props.coachId) {
        form.append('player_id', props.playerId)
        form.append('coach_id',  props.coachId)
      }

      const headers: HeadersInit = {}
      if (props.authToken) {
        headers['Authorization'] = `Bearer ${props.authToken}`
      }

      const res  = await fetch('/api/videos/upload', { method: 'POST', body: form, headers })
      const json = await res.json()

      if (!res.ok) {
        throw new Error(json.error ?? 'Upload failed.')
      }

      const uploaded: SessionVideo = json.video
      setter({ status: 'uploaded', file: clip.file, video: uploaded, error: null })

    } catch (err) {
      setter(prev => ({
        ...prev,
        status: 'failed',
        error:  err instanceof Error ? err.message : 'Upload failed. Please try again.',
      }))
    }
  }

  // ── Derived state ──────────────────────────────────────────────────────────

  const sideUploaded  = side.status  === 'uploaded'
  const frontUploaded = front.status === 'uploaded'
  const bothUploaded  = sideUploaded && frontUploaded

  const handleSubmit = () => {
    if (side.video && front.video) {
      onBothUploaded(side.video, front.video)
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">

      {/* Progress indicator */}
      <div className="flex items-center gap-2 text-xs text-gray-500">
        <span className={sideUploaded ? 'text-green-400 font-medium' : 'text-gray-400'}>
          1 · Side view
        </span>
        <span className="text-gray-700">→</span>
        <span className={frontUploaded ? 'text-green-400 font-medium' : 'text-gray-400'}>
          2 · Front view
        </span>
        <span className="text-gray-700">→</span>
        <span className={bothUploaded ? 'text-brand-400 font-medium' : 'text-gray-600'}>
          Submit
        </span>
      </div>

      {/* Step 1 — side */}
      <ClipStep
        step={1}
        angle="side"
        clip={side}
        locked={false}
        fileRef={sideRef}
        onPick={f  => pickFile('side', f)}
        onUpload={() => uploadClip('side')}
        onReset={() => resetClip('side')}
      />

      {/* Step 2 — front */}
      <ClipStep
        step={2}
        angle="front"
        clip={front}
        locked={!sideUploaded}
        fileRef={frontRef}
        onPick={f  => pickFile('front', f)}
        onUpload={() => uploadClip('front')}
        onReset={() => resetClip('front')}
      />

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={!bothUploaded}
        className="w-full bg-brand-600 hover:bg-brand-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl text-sm transition-colors"
      >
        {bothUploaded ? 'Submit for Analysis' : 'Upload both clips to continue'}
      </button>

    </div>
  )
}
