'use client'

import { useState, useRef, useEffect } from 'react'
import type { SessionVideo } from '@/types'

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
  | { status: 'selected'; file: File; precheck: Precheck }
  | { status: 'framepicker'; file: File }   // video file; user is picking a frame (item 3)
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

// ── Guided-capture framing aid (item 2) ───────────────────────────────────────
// A simple silhouette showing roughly how the body should sit in the frame,
// differing per angle (side profile vs front-on). A positioning aid, not an AR
// feature — the app uploads a file (no in-app live camera), so this shows the
// user how to frame the shot in their camera before they take it. Kept compact
// so it never crowds the capture controls on mobile.
function StanceSilhouette({ angle }: { angle: 'side' | 'front' }) {
  return (
    <svg
      viewBox="0 0 72 96"
      className="w-14 h-[74px] flex-shrink-0 text-brand-400"
      aria-label={`${angle} view framing guide`}
      role="img"
    >
      {/* Phone frame — dashed, subtle. Head must sit below the top edge and
          feet above the bottom edge (the "full body in frame" cue). */}
      <rect x="3" y="2" width="66" height="92" rx="7" fill="none"
            stroke="currentColor" strokeOpacity="0.35" strokeWidth="1.5" strokeDasharray="4 3" />
      <line x1="12" y1="84" x2="60" y2="84" stroke="currentColor" strokeOpacity="0.25" strokeWidth="1.5" />
      {angle === 'side' ? (
        // Side profile in a bent-over 3-point stance, facing right: hips high at
        // back, back sloping down to a low head, one hand reaching to the ground.
        <g fill="currentColor">
          <circle cx="49" cy="42" r="6" />
          {/* torso: rear hip (high) sloping forward-down to shoulders */}
          <path d="M22 40 Q34 34 45 46 L43 52 Q33 44 24 48 Z" />
          {/* down arm to ground */}
          <path d="M44 48 L52 82 L48 82 L40 50 Z" />
          {/* rear leg, bent */}
          <path d="M24 46 L20 66 L26 84 L30 82 L25 66 L29 48 Z" />
        </g>
      ) : (
        // Front-on athletic stance: head centred, wide shoulders, feet apart.
        <g fill="currentColor">
          <circle cx="36" cy="30" r="6.5" />
          {/* torso trapezoid (wide shoulders → hips) */}
          <path d="M24 40 L48 40 L44 62 L28 62 Z" />
          {/* arms down the sides */}
          <path d="M24 41 L19 62 L23 62 L28 44 Z" />
          <path d="M48 41 L53 62 L49 62 L44 44 Z" />
          {/* legs apart */}
          <path d="M29 61 L24 84 L29 84 L33 62 Z" />
          <path d="M43 61 L48 84 L43 84 L39 62 Z" />
        </g>
      )}
    </svg>
  )
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
}

function ViewSection({ angle, state, fileRef, onPick, onUpload, onReset, onEnterFramePicker, onCancelFramePicker }: ViewSectionProps) {
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

  // Capture the frame currently shown in the <video> as a JPEG and hand it back
  // as the selected file — it then flows through the exact same photo path as a
  // real photo (single-frame → reliable:false, and the item-1 precheck runs on
  // it). A single chosen instant is honestly a single sample.
  const useCurrentFrame = () => {
    const v = videoRef.current
    if (!v || !v.videoWidth) return
    const canvas = document.createElement('canvas')
    canvas.width  = v.videoWidth
    canvas.height = v.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(v, 0, 0, canvas.width, canvas.height)
    canvas.toBlob(blob => {
      if (!blob) return
      const t = v.currentTime.toFixed(2)
      onPick(new File([blob], `frame-${t}s.jpg`, { type: 'image/jpeg' }))
    }, 'image/jpeg', 0.92)
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
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="text-xs text-brand-400 hover:text-brand-300 transition-colors"
          >
            + Add another
          </button>
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

          {/* Frame-from-video (item 3): offer picking one key frame from a video */}
          {mediaTypeOf(active.file) === 'video' && (
            <button
              type="button"
              onClick={onEnterFramePicker}
              className="text-xs text-brand-400 hover:text-brand-300 transition-colors"
            >
              🎞️ Or pick one key frame (e.g. the bottom of your stance) →
            </button>
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

      {/* Frame picker (item 3) — scrub the video, capture one frame as the input */}
      {active.status === 'framepicker' && (
        <div className="pl-8 space-y-3">
          <p className="text-xs text-gray-400">
            Scrub to the exact moment (e.g. the bottom of your stance), then capture it.
            A single frame is analyzed like a photo — less precise than the full video.
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
              onClick={useCurrentFrame}
              className="flex-1 bg-brand-600 hover:bg-brand-500 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors"
            >
              📸 Use current frame
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

      <ViewSection
        angle="side"
        state={side}
        fileRef={sideRef}
        onPick={f  => pickFile('side', f)}
        onUpload={() => uploadClip('side')}
        onReset={() => resetActive('side')}
        onEnterFramePicker={() => enterFramePicker('side')}
        onCancelFramePicker={() => cancelFramePicker('side')}
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
