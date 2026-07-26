'use client'

// components/CameraCapture.tsx
//
// In-app camera capture (record-then-process). Opens a live camera view with
// the guided-capture silhouette overlaid (side vs front), records a clip (or
// takes a photo), lets the user review/retake, and hands the result back as a
// File. The caller (TwoClipUpload) then pushes that File through the EXACT same
// presign → storage → confirm path as a file upload — this component produces a
// File and nothing else; it does NOT touch the pipeline or ownership.
//
// Feasibility (Step 0, 2026-07-26): browser getUserMedia + MediaRecorder over
// HTTPS. iOS Safari records MP4/H.264 (== today's uploads); Android Chrome
// records WebM/VP8 — verified to decode in the pipeline, so no transcoding.
// Graceful fallback: if the browser lacks getUserMedia/MediaRecorder (e.g. iOS
// < 14.3), we surface an error and the user falls back to Upload.

import { useEffect, useRef, useState, useCallback } from 'react'
import StanceSilhouette from './StanceSilhouette'

type Mode = 'video' | 'photo'
type Phase = 'init' | 'ready' | 'recording' | 'review' | 'error'

interface CameraCaptureProps {
  angle:      'side' | 'front'
  authToken?: string            // solo player JWT — for the pose pre-check proxy
  onCapture:  (file: File) => void
  onCancel:   () => void
}

const supported =
  typeof navigator !== 'undefined' &&
  !!navigator.mediaDevices?.getUserMedia &&
  typeof MediaRecorder !== 'undefined'

// Prefer MP4 (universally decodable; iOS emits it anyway); fall back to WebM
// (Android). Both are accepted by the upload MIME list and decode in the
// pipeline (Step 0 verified). Empty string → let the browser choose.
function pickVideoMime(): string {
  if (typeof MediaRecorder === 'undefined') return ''
  for (const m of ['video/mp4', 'video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm']) {
    try { if (MediaRecorder.isTypeSupported(m)) return m } catch { /* isTypeSupported can throw */ }
  }
  return ''
}

export default function CameraCapture({ angle, authToken, onCapture, onCancel }: CameraCaptureProps) {
  const [phase, setPhase]   = useState<Phase>('init')
  const [mode, setMode]     = useState<Mode>('video')
  const [errorMsg, setErrorMsg]   = useState<string | null>(null)
  const [facing, setFacing]       = useState<'environment' | 'user'>('environment')
  const [seconds, setSeconds]     = useState(0)
  const [reviewUrl, setReviewUrl] = useState<string | null>(null)
  const [precheck, setPrecheck]   = useState<'idle' | 'checking' | 'good' | { warn: string }>('idle')

  const liveRef   = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const recRef    = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const blobRef   = useRef<Blob | null>(null)
  const mimeRef   = useRef<string>('')
  const timerRef  = useRef<ReturnType<typeof setInterval> | null>(null)

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
  }, [])

  // Start / restart the live camera for the current facing mode.
  const startCamera = useCallback(async () => {
    if (!supported) { setErrorMsg('This browser can’t record in-app. Use Upload instead.'); setPhase('error'); return }
    setPhase('init'); setErrorMsg(null)
    stopStream()
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      })
      streamRef.current = stream
      if (liveRef.current) {
        liveRef.current.srcObject = stream
        // iOS needs muted + playsInline (set in JSX) + an explicit play().
        await liveRef.current.play().catch(() => { /* autoplay may need the muted attr, which is set */ })
      }
      setPhase('ready')
    } catch (err) {
      const name = (err as { name?: string })?.name
      setErrorMsg(
        name === 'NotAllowedError'  ? 'Camera permission was denied. Allow camera access, or use Upload.'
        : name === 'NotFoundError' ? 'No camera found on this device. Use Upload instead.'
        : 'Couldn’t start the camera. Use Upload instead.'
      )
      setPhase('error')
    }
  }, [facing, stopStream])

  useEffect(() => { startCamera(); return () => { if (timerRef.current) clearInterval(timerRef.current); stopStream() } }, [startCamera, stopStream])
  useEffect(() => () => { if (reviewUrl) URL.revokeObjectURL(reviewUrl) }, [reviewUrl])

  // ── Record (video) ──────────────────────────────────────────────────────────
  const startRecording = () => {
    if (!streamRef.current) return
    chunksRef.current = []
    mimeRef.current = pickVideoMime()
    let rec: MediaRecorder
    try {
      rec = mimeRef.current ? new MediaRecorder(streamRef.current, { mimeType: mimeRef.current }) : new MediaRecorder(streamRef.current)
    } catch { setErrorMsg('Recording isn’t supported here. Use Upload instead.'); setPhase('error'); return }
    recRef.current = rec
    rec.ondataavailable = e => { if (e.data && e.data.size) chunksRef.current.push(e.data) }
    rec.onstop = () => {
      const type = mimeRef.current || (chunksRef.current[0]?.type ?? 'video/webm')
      const blob = new Blob(chunksRef.current, { type })
      finishToReview(blob)
    }
    rec.start()
    setPhase('recording'); setSeconds(0)
    timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000)
  }

  const stopRecording = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
    try { recRef.current?.stop() } catch { /* already stopped */ }
  }

  // ── Photo (single frame) ────────────────────────────────────────────────────
  const takePhoto = () => {
    const v = liveRef.current
    if (!v || !v.videoWidth) return
    const canvas = document.createElement('canvas')
    canvas.width = v.videoWidth; canvas.height = v.videoHeight
    canvas.getContext('2d')?.drawImage(v, 0, 0, canvas.width, canvas.height)
    canvas.toBlob(b => { if (b) { mimeRef.current = 'image/jpeg'; finishToReview(b) } }, 'image/jpeg', 0.92)
  }

  // Move to the review screen and run the pose pre-check (reusing the same
  // /api/videos/precheck endpoint the upload path uses) on a representative
  // frame — for a photo the blob itself, for a video a grabbed frame.
  const finishToReview = async (blob: Blob) => {
    blobRef.current = blob
    setReviewUrl(URL.createObjectURL(blob))
    setPhase('review')
    stopStream()  // release the camera while reviewing
    runPrecheck(blob)
  }

  const runPrecheck = async (blob: Blob) => {
    setPrecheck('checking')
    try {
      let imageBlob: Blob | null = mode === 'photo' ? blob : null
      if (!imageBlob) imageBlob = await grabFrameFromVideoBlob(blob)
      if (!imageBlob) { setPrecheck('idle'); return }
      const headers: HeadersInit = { 'Content-Type': 'image/jpeg' }
      if (authToken) headers['Authorization'] = `Bearer ${authToken}`
      const res = await fetch('/api/videos/precheck', { method: 'POST', headers, body: imageBlob })
      if (!res.ok) { setPrecheck('idle'); return }
      const v = await res.json()
      if (v.reason === 'check_unavailable' || v.detected === null) { setPrecheck('idle'); return }
      if (v.detected && v.full_body) { setPrecheck('good'); return }
      const missing = new Set<string>(v.missing ?? [])
      const msg = !v.detected
        ? 'We can’t see a person in this clip — make sure the whole body is in frame.'
        : missing.has('feet') && missing.has('head') ? 'Head and feet look cut off — step back so the whole body is in frame.'
        : missing.has('feet') ? 'Feet look cut off — step back or tilt down.'
        : missing.has('head') ? 'The head looks cut off — tilt up.'
        : 'Part of the body isn’t clearly visible — step back and get the whole body in frame.'
      setPrecheck({ warn: msg })
    } catch { setPrecheck('idle') }
  }

  const useIt = () => {
    const blob = blobRef.current
    if (!blob) return
    const ext = mode === 'photo' ? 'jpg' : (mimeRef.current.includes('mp4') ? 'mp4' : 'webm')
    const type = mode === 'photo' ? 'image/jpeg' : (blob.type || mimeRef.current || 'video/webm')
    onCapture(new File([blob], `${angle}-recording.${ext}`, { type }))
  }

  const retake = () => {
    if (reviewUrl) { URL.revokeObjectURL(reviewUrl); setReviewUrl(null) }
    blobRef.current = null; setPrecheck('idle')
    startCamera()
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  if (phase === 'error') {
    return (
      <div className="bg-field-dark border border-red-900 rounded-xl p-5 space-y-3 text-center">
        <p className="text-sm text-red-400">{errorMsg}</p>
        <button onClick={onCancel} className="text-sm text-brand-400 hover:text-brand-300 underline">Back to upload</button>
      </div>
    )
  }

  return (
    <div className="bg-black rounded-xl overflow-hidden">
      {phase === 'review' ? (
        <div className="space-y-3">
          <div className="relative bg-black">
            {mode === 'photo'
              ? <img src={reviewUrl ?? ''} alt="captured frame" className="w-full max-h-[60vh] object-contain" />
              : <video src={reviewUrl ?? ''} controls playsInline className="w-full max-h-[60vh] object-contain" />}
          </div>
          <div className="px-4 pb-4 space-y-3">
            {precheck === 'checking' && <p className="text-xs text-gray-400">Checking framing…</p>}
            {precheck === 'good' && <p className="text-xs text-green-400">✓ Looks good — full body visible.</p>}
            {typeof precheck === 'object' && <p className="text-xs text-yellow-300 bg-yellow-950 border border-yellow-800 rounded px-3 py-2">⚠️ {precheck.warn}</p>}
            <div className="flex gap-2">
              <button onClick={useIt} className="flex-1 bg-brand-600 hover:bg-brand-500 text-white font-semibold py-2.5 rounded-lg text-sm">
                Use this {mode === 'photo' ? 'photo' : 'clip'}
              </button>
              <button onClick={retake} className="bg-field-card border border-field-border hover:border-gray-500 text-gray-300 font-medium py-2.5 px-4 rounded-lg text-sm">Retake</button>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="relative bg-black">
            <video ref={liveRef} muted playsInline autoPlay className="w-full max-h-[60vh] object-contain" />
            {/* Guided-capture overlay on the LIVE view — side vs front (item 2 payoff) */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <StanceSilhouette angle={angle} className="h-[92%] text-white/40" />
            </div>
            {phase === 'recording' && (
              <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-black/60 rounded px-2 py-1">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <span className="text-xs text-white font-mono">{String(Math.floor(seconds / 60)).padStart(2, '0')}:{String(seconds % 60).padStart(2, '0')}</span>
              </div>
            )}
          </div>

          <div className="px-4 pb-4 space-y-3">
            <p className="text-xs text-gray-400 text-center">
              {angle === 'side' ? 'Line the player up side-on inside the outline — full body, head through feet.'
                                : 'Face the camera and fit the full body inside the outline.'}
            </p>

            {/* Video/photo mode toggle (photo optional per spec) */}
            {phase === 'ready' && (
              <div className="flex justify-center gap-1 text-xs">
                <button onClick={() => setMode('video')} className={`px-3 py-1 rounded ${mode === 'video' ? 'bg-brand-600 text-white' : 'bg-field-card text-gray-400 border border-field-border'}`}>🎬 Video</button>
                <button onClick={() => setMode('photo')} className={`px-3 py-1 rounded ${mode === 'photo' ? 'bg-brand-600 text-white' : 'bg-field-card text-gray-400 border border-field-border'}`}>📷 Photo</button>
              </div>
            )}

            <div className="flex items-center gap-2">
              {phase === 'init' && <p className="flex-1 text-sm text-gray-400 text-center">Starting camera…</p>}
              {phase === 'ready' && mode === 'video' && (
                <button onClick={startRecording} className="flex-1 bg-brand-600 hover:bg-brand-500 text-white font-semibold py-2.5 rounded-lg text-sm">● Record</button>
              )}
              {phase === 'ready' && mode === 'photo' && (
                <button onClick={takePhoto} className="flex-1 bg-brand-600 hover:bg-brand-500 text-white font-semibold py-2.5 rounded-lg text-sm">📷 Capture</button>
              )}
              {phase === 'recording' && (
                <button onClick={stopRecording} className="flex-1 bg-red-600 hover:bg-red-500 text-white font-semibold py-2.5 rounded-lg text-sm">■ Stop</button>
              )}
              {phase !== 'recording' && (
                <button onClick={() => setFacing(f => f === 'environment' ? 'user' : 'environment')} title="Flip camera"
                        className="bg-field-card border border-field-border hover:border-gray-500 text-gray-300 py-2.5 px-3 rounded-lg text-sm">🔄</button>
              )}
              <button onClick={() => { stopStream(); onCancel() }} className="bg-field-card border border-field-border hover:border-gray-500 text-gray-300 py-2.5 px-3 rounded-lg text-sm">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Grab one frame (~mid clip) from a recorded video blob as a JPEG, for the
// pose pre-check. Best-effort — returns null if it can't decode in time.
function grabFrameFromVideoBlob(blob: Blob): Promise<Blob | null> {
  return new Promise(resolve => {
    const url = URL.createObjectURL(blob)
    const v = document.createElement('video')
    v.muted = true; v.playsInline = true; v.src = url
    let done = false
    const cleanup = () => { URL.revokeObjectURL(url); }
    const fail = () => { if (done) return; done = true; cleanup(); resolve(null) }
    const timeout = setTimeout(fail, 6000)
    v.onloadedmetadata = () => { try { v.currentTime = Math.min(0.5, (v.duration || 1) / 2) } catch { fail() } }
    v.onseeked = () => {
      if (done) return; done = true; clearTimeout(timeout)
      try {
        const canvas = document.createElement('canvas')
        canvas.width = v.videoWidth || 640; canvas.height = v.videoHeight || 480
        canvas.getContext('2d')?.drawImage(v, 0, 0, canvas.width, canvas.height)
        canvas.toBlob(b => { cleanup(); resolve(b) }, 'image/jpeg', 0.9)
      } catch { cleanup(); resolve(null) }
    }
    v.onerror = fail
  })
}
