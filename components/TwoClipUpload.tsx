'use client'

import { useState, useRef, useEffect } from 'react'
import type { SessionVideo } from '@/types'
import StanceSilhouette from './StanceSilhouette'
import CameraCapture from './CameraCapture'

// ── Types ─────────────────────────────────────────────────────────────────────

// Pre-upload pose check (Photo feature item 1). Runs only for photos — a video
// has many frames to fall back on, a photo is a single sample, so a bad photo
// is worth catching BEFORE the upload + full pipeline run. Advisory only: the
// user can always "upload anyway" (detection is imperfect — warn, don't forbid).
type Precheck =
  | { phase: 'checking' }                    // request in flight
  | { phase: 'good' }                        // full body visible → proceed
  | { phase: 'warn'; message: string }       // problem found → guidance + upload-anyway
  | { phase: 'skipped' }                      // video, or the check couldn't run

// The active slot tracks one in-progress upload at a time per view.
// Completed uploads accumulate in ViewState.uploaded.
type ActiveSlot =
  | { status: 'idle' }
  // selectedFrameTime (item 3 Option B): when a moment was picked from a VIDEO,
  // the whole video is uploaded with this timestamp (seconds). /analyse then
  // windows around it and derives reliability from the neighbourhood's
  // consistency (item 4's aggregator) — not a client-extracted single still.
  | { status: 'selected'; file: File; precheck: Precheck; selectedFrameTime?: number }
  | { status: 'framepicker'; file: File }   // video file; user is picking a moment (item 3)
  | { status: 'recording' }                 // in-app camera capture open (2026-07-26)
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

const ANGLE_META: Record<'side' | 'front', { heading: string; body: string; tips: string[] }> = {
  side: {
    heading: 'Side view',
    body:    'Camera at hip height, square to your side. Full body visible — head through feet, nothing cut off.',
    tips:    ['Full body in frame', 'Camera ~hip height', 'Stand side-on'],
  },
  front: {
    heading: 'Front view',
    body:    'Camera at hip height, facing straight at you. Full body in frame — feet flat on ground, top of helmet visible.',
    tips:    ['Full body in frame', 'Camera ~hip height', 'Face the camera'],
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

// Map the /api/videos/precheck verdict to a Precheck UI state. Anything
// inconclusive (service unavailable, null result) falls through to 'skipped'
// so the user is never hard-blocked by a check that couldn't run.
interface PrecheckVerdict {
  detected:  boolean | null
  full_body: boolean | null
  reason:    string
  missing:   string[]
}

function verdictToPrecheck(v: PrecheckVerdict): Precheck {
  if (v.reason === 'check_unavailable' || v.detected === null) return { phase: 'skipped' }
  if (v.reason === 'unreadable') {
    return { phase: 'warn', message: "We couldn't read that image — try taking or choosing a different photo." }
  }
  if (!v.detected) {
    return { phase: 'warn', message: "We can't see a person in this photo — make sure your whole body is in the shot and well-lit." }
  }
  if (v.full_body) return { phase: 'good' }

  const m = new Set(v.missing ?? [])
  if (m.has('head') && m.has('feet')) {
    return { phase: 'warn', message: "We can't see your full body — step back so your head and feet are both in frame." }
  }
  if (m.has('feet')) {
    return { phase: 'warn', message: "Your feet look cut off — step back or tilt the camera down so your feet are in frame." }
  }
  if (m.has('head')) {
    return { phase: 'warn', message: "The top of your body looks cut off — tilt the camera up so your head is in frame." }
  }
  return { phase: 'warn', message: "Part of your body isn't clearly visible — step back and make sure your whole body is in frame, well-lit." }
}

// ── Sub-component: one view section ──────────────────────────────────────────

interface ViewSectionProps {
  angle:    'side' | 'front'
  state:    ViewState
  fileRef:  React.RefObject<HTMLInputElement>
  onPick:   (f: File) => void
  onUpload: () => void
  onReset:  () => void
  onEnterFramePicker:  () => void
  onCancelFramePicker: () => void
  onUseMoment:         (time: number) => void
  onStartRecording:    () => void
  authToken?:          string
}

function ViewSection({ angle, state, fileRef, onPick, onUpload, onReset, onEnterFramePicker, onCancelFramePicker, onUseMoment, onStartRecording, authToken }: ViewSectionProps) {
  const [dragOver, setDragOver] = useState(false)
  const { heading, body, tips } = ANGLE_META[angle]
  const { active } = state

  // Frame-picker (item 3): object URL for the video being scrubbed, created
  // once per framepicker file and revoked on exit (no per-render leak).
  const videoRef = useRef<HTMLVideoElement>(null)
  const [frameUrl, setFrameUrl] = useState<string | null>(null)
  const framepickerFile = active.status === 'framepicker' ? active.file : null
  useEffect(() => {
    if (!framepickerFile) { setFrameUrl(null); return }
    const url = URL.createObjectURL(framepickerFile)
    setFrameUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [framepickerFile])

  // Option B (item 3): capture the picked MOMENT (timestamp), not a client-side
  // still. The whole video is uploaded with this timestamp; /analyse windows
  // around it and derives reliability from the neighbourhood's consistency
  // (item 4's aggregator) — a held stance earns confidence, a transitional
  // moment does not. Reuses the video already selected, so no re-encode.
  const useCurrentMoment = () => {
    const v = videoRef.current
    if (!v) return
    onUseMoment(v.currentTime)
  }
  const { uploaded } = state
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
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onStartRecording}
              className="text-xs text-brand-400 hover:text-brand-300 transition-colors"
            >
              📹 Record
            </button>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="text-xs text-brand-400 hover:text-brand-300 transition-colors"
            >
              + Add another
            </button>
          </div>
        )}
      </div>

      {/* Angle guidance — framing silhouette (item 2) + text + quick tips */}
      <div className="flex items-start gap-3 pl-8">
        <StanceSilhouette angle={angle} />
        <div className="space-y-1.5 min-w-0">
          <p className="text-xs text-gray-500 leading-relaxed">{body}</p>
          <ul className="flex flex-wrap gap-x-2 gap-y-1">
            {tips.map(t => (
              <li key={t} className="text-[11px] text-gray-400 bg-field-dark border border-field-border rounded px-1.5 py-0.5 whitespace-nowrap">
                {t}
              </li>
            ))}
          </ul>
        </div>
      </div>

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

      {/* In-app record option (2026-07-26) — additional to upload, not a replacement */}
      {active.status === 'idle' && !hasUploaded && (
        <button
          type="button"
          onClick={onStartRecording}
          className="w-full flex items-center justify-center gap-2 bg-field-dark border border-field-border hover:border-brand-600 text-sm text-gray-300 py-2.5 rounded-xl transition-colors"
        >
          📹 Record with camera
        </button>
      )}

      {/* Live camera capture — produces a File, then flows through the same
          presign→storage→confirm path as an upload (onPick). */}
      {active.status === 'recording' && (
        <CameraCapture angle={angle} authToken={authToken} onCapture={onPick} onCancel={onReset} />
      )}

      {/* Selected — file preview + pose pre-check + upload button */}
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

          {/* Frame-from-video (item 3): pick a key moment from a video. When a
              moment is chosen the whole clip still uploads (server windows
              around it); otherwise the full clip is analyzed. */}
          {mediaTypeOf(active.file) === 'video' && (
            active.selectedFrameTime !== undefined ? (
              <p className="text-xs text-brand-300 flex items-center gap-2">
                🎯 Analyzing the moment at {active.selectedFrameTime.toFixed(1)}s
                <button type="button" onClick={onEnterFramePicker} className="text-brand-400 hover:text-brand-300 underline">
                  change
                </button>
              </p>
            ) : (
              <button
                type="button"
                onClick={onEnterFramePicker}
                className="text-xs text-brand-400 hover:text-brand-300 transition-colors"
              >
                🎯 Or focus on one key moment (e.g. the bottom of your stance) →
              </button>
            )
          )}

          {/* Pose pre-check verdict (photos only) */}
          {active.precheck.phase === 'checking' && (
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <div className="w-3.5 h-3.5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin flex-shrink-0" />
              Checking your photo…
            </div>
          )}
          {active.precheck.phase === 'good' && (
            <p className="text-xs text-green-400">✓ Looks good — full body visible.</p>
          )}
          {active.precheck.phase === 'warn' && (
            <p className="text-xs text-yellow-300 bg-yellow-950 border border-yellow-800 rounded-lg px-3 py-2 leading-snug">
              ⚠️ {active.precheck.message}
            </p>
          )}

          <button
            onClick={onUpload}
            disabled={active.precheck.phase === 'checking'}
            className="w-full bg-brand-600 hover:bg-brand-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-lg text-sm transition-colors"
          >
            {active.precheck.phase === 'checking'
              ? 'Checking…'
              : active.precheck.phase === 'warn'
                ? 'Upload anyway'
                : `Upload ${heading.toLowerCase()} clip`}
          </button>
        </div>
      )}

      {/* Frame picker (item 3, Option B) — scrub to the key moment; the whole
          clip uploads and the server analyzes the frames around this moment. */}
      {active.status === 'framepicker' && (
        <div className="pl-8 space-y-3">
          <p className="text-xs text-gray-400">
            Scrub to the key moment (e.g. the bottom of your stance), then lock it in.
            We analyze the frames right around it — a steady, held stance reads as
            more reliable than a moment mid-movement.
          </p>
          {frameUrl && (
            <video
              ref={videoRef}
              src={frameUrl}
              controls
              playsInline
              preload="auto"
              className="w-full max-h-64 bg-black rounded-lg"
            />
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={useCurrentMoment}
              className="flex-1 bg-brand-600 hover:bg-brand-500 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors"
            >
              🎯 Use this moment
            </button>
            <button
              type="button"
              onClick={onCancelFramePicker}
              className="bg-field-dark border border-field-border hover:border-gray-500 text-gray-300 font-medium py-2.5 px-4 rounded-lg text-sm transition-colors"
            >
              Cancel
            </button>
          </div>
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
    // Photos get a pre-upload pose check (item 1); videos skip it (many frames).
    const isPhoto = mediaTypeOf(f) === 'photo'
    setter(prev => ({
      ...prev,
      active: { status: 'selected', file: f, precheck: isPhoto ? { phase: 'checking' } : { phase: 'skipped' } },
    }))
    if (isPhoto) runPrecheck(angle, f)
  }

  // Pre-upload pose check for a selected photo. Best-effort + advisory — any
  // failure/inconclusive result becomes 'skipped' (upload still allowed). The
  // functional setter guards against a stale response (user removed/replaced
  // the file before the check returned): only apply if that exact file is
  // still the selected one.
  const runPrecheck = async (angle: 'side' | 'front', file: File) => {
    const setter = angle === 'side' ? setSide : setFront
    const apply = (precheck: Precheck) =>
      setter(prev =>
        prev.active.status === 'selected' && prev.active.file === file
          ? { ...prev, active: { ...prev.active, precheck } }
          : prev
      )
    try {
      const headers: HeadersInit = { 'Content-Type': file.type }
      if (props.authToken) headers['Authorization'] = `Bearer ${props.authToken}`
      const res = await fetch('/api/videos/precheck', { method: 'POST', headers, body: file })
      if (!res.ok) { apply({ phase: 'skipped' }); return }
      apply(verdictToPrecheck(await res.json()))
    } catch {
      apply({ phase: 'skipped' })
    }
  }

  const resetActive = (angle: 'side' | 'front') => {
    const setter = angle === 'side' ? setSide : setFront
    const ref    = angle === 'side' ? sideRef  : frontRef
    setter(prev => ({ ...prev, active: { status: 'idle' } }))
    if (ref.current) ref.current.value = ''
  }

  // Frame-from-video (item 3): enter/leave the frame picker for a selected video.
  const enterFramePicker = (angle: 'side' | 'front') => {
    const setter = angle === 'side' ? setSide : setFront
    setter(prev =>
      prev.active.status === 'selected' && mediaTypeOf(prev.active.file) === 'video'
        ? { ...prev, active: { status: 'framepicker', file: prev.active.file } }
        : prev
    )
  }
  const cancelFramePicker = (angle: 'side' | 'front') => {
    const setter = angle === 'side' ? setSide : setFront
    setter(prev =>
      prev.active.status === 'framepicker'
        ? { ...prev, active: { status: 'selected', file: prev.active.file, precheck: { phase: 'skipped' } } }
        : prev
    )
  }
  // In-app camera capture (2026-07-26): open the live camera for this slot.
  const startRecording = (angle: 'side' | 'front') => {
    const setter = angle === 'side' ? setSide : setFront
    setter(prev => ({ ...prev, active: { status: 'recording' } }))
  }

  // Option B (item 3): a moment was locked in — keep the VIDEO selected and tag
  // it with the timestamp. On upload the whole clip goes up with selectedFrameTime.
  const useMoment = (angle: 'side' | 'front', time: number) => {
    const setter = angle === 'side' ? setSide : setFront
    setter(prev =>
      prev.active.status === 'framepicker'
        ? { ...prev, active: { status: 'selected', file: prev.active.file, precheck: { phase: 'skipped' }, selectedFrameTime: time } }
        : prev
    )
  }

  // ── Upload ─────────────────────────────────────────────────────────────────

  const uploadClip = async (angle: 'side' | 'front') => {
    const view   = angle === 'side' ? side  : front
    const setter = angle === 'side' ? setSide : setFront
    if (view.active.status !== 'selected') return
    const file = view.active.file
    const selectedFrameTime = view.active.selectedFrameTime  // Option B (item 3)

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
          ...(selectedFrameTime !== undefined ? { selected_frame_time: selectedFrameTime } : {}),
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

      // 3. Confirm — write the DB row now that the file is in storage.
      // The self-signup path is JWT-authed (the confirm route re-verifies
      // player_account ownership from the token), so the auth header must be
      // forwarded here too — same as presign above. Coaches rely on the
      // session cookie and send no token.
      const confirmHeaders: HeadersInit = { 'Content-Type': 'application/json' }
      if (props.authToken) confirmHeaders['Authorization'] = `Bearer ${props.authToken}`

      const confirmRes = await fetch('/api/videos/confirm', {
        method:  'POST',
        headers: confirmHeaders,
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

      {/* Honest expectation-setting (item 5): video vs photo tradeoff, at the
          point where the user chooses which to provide. A nudge, not a block. */}
      <p className="text-xs text-gray-500 bg-field-dark border border-field-border rounded-md px-3 py-2">
        🎥 Video gives the most accurate feedback. 📷 Photos work too, but a single frame is less precise.
      </p>

      <ViewSection
        angle="side"
        state={side}
        fileRef={sideRef}
        onPick={f  => pickFile('side', f)}
        onUpload={() => uploadClip('side')}
        onReset={() => resetActive('side')}
        onEnterFramePicker={() => enterFramePicker('side')}
        onCancelFramePicker={() => cancelFramePicker('side')}
        onUseMoment={(t) => useMoment('side', t)}
        onStartRecording={() => startRecording('side')}
        authToken={props.authToken}
      />

      <ViewSection
        angle="front"
        state={front}
        fileRef={frontRef}
        onPick={f  => pickFile('front', f)}
        onUpload={() => uploadClip('front')}
        onReset={() => resetActive('front')}
        onEnterFramePicker={() => enterFramePicker('front')}
        onCancelFramePicker={() => cancelFramePicker('front')}
        onUseMoment={(t) => useMoment('front', t)}
        onStartRecording={() => startRecording('front')}
        authToken={props.authToken}
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
