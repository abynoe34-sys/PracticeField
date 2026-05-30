'use client'

import { useState, useRef, useCallback } from 'react'
import type { DrillType, SessionVideo } from '@/types'

interface VideoUploadProps {
  playerId: string
  coachId: string
  sessionId?: string
  onUploaded: (video: SessionVideo) => void
}

const DRILL_TYPES: { value: DrillType; label: string }[] = [
  { value: 'technique', label: 'Technique Drill' },
  { value: 'route',     label: 'Route Running'   },
  { value: 'agility',   label: 'Agility / COD'   },
  { value: 'speed',     label: 'Speed / Sprint'   },
  { value: 'strength',  label: 'Strength Work'    },
  { value: 'coverage',  label: 'Coverage'         },
  { value: 'blocking',  label: 'Blocking'         },
  { value: 'general',   label: 'General Practice' },
]

// Extract N evenly-spaced frames from a video as base64 JPEG strings
async function extractFrames(file: File, count = 8): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')!
    const url = URL.createObjectURL(file)
    const frames: string[] = []

    video.preload = 'metadata'
    video.muted = true
    video.src = url

    video.onloadedmetadata = () => {
      canvas.width  = 640   // resize for API efficiency
      canvas.height = Math.round(640 * (video.videoHeight / video.videoWidth))
      const duration = video.duration
      const interval = duration / (count + 1)
      let captured = 0

      const captureFrame = (time: number) => {
        video.currentTime = time
      }

      video.onseeked = () => {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
        frames.push(canvas.toDataURL('image/jpeg', 0.7).split(',')[1]) // base64 only
        captured++
        if (captured < count) {
          captureFrame(interval * (captured + 1))
        } else {
          URL.revokeObjectURL(url)
          resolve(frames)
        }
      }

      video.onerror = () => reject(new Error('Failed to load video'))
      captureFrame(interval)
    }

    video.onerror = () => reject(new Error('Invalid video file'))
  })
}

export default function VideoUpload({ playerId, coachId, sessionId, onUploaded }: VideoUploadProps) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [label, setLabel] = useState('')
  const [drillType, setDrillType] = useState<DrillType>('general')
  const [notes, setNotes] = useState('')
  const [isBaseline, setIsBaseline] = useState(false)
  const [stage, setStage] = useState<'idle' | 'ready' | 'extracting' | 'uploading' | 'analyzing' | 'done' | 'error'>('idle')
  const [progress, setProgress] = useState(0)
  const [errorMsg, setErrorMsg] = useState('')

  const pickFile = (f: File) => {
    if (!f.type.startsWith('video/')) {
      setErrorMsg('Please select a video file (MP4, MOV, WebM)')
      return
    }
    if (f.size > 524_288_000) {
      setErrorMsg('File too large. Max 500MB.')
      return
    }
    setFile(f)
    setLabel(f.name.replace(/\.[^.]+$/, ''))
    setStage('ready')
    setErrorMsg('')
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files[0]
    if (f) pickFile(f)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) return

    try {
      // 1. Extract frames from the video
      setStage('extracting')
      setProgress(20)
      const frames = await extractFrames(file, 8)
      setProgress(40)

      // 2. Upload video file to server
      setStage('uploading')
      const form = new FormData()
      form.append('file', file)
      form.append('player_id', playerId)
      form.append('coach_id', coachId)
      if (sessionId) form.append('session_id', sessionId)
      form.append('label', label || file.name)
      form.append('drill_type', drillType)
      form.append('notes', notes)
      form.append('is_baseline', String(isBaseline))

      const uploadRes = await fetch('/api/videos/upload', { method: 'POST', body: form })
      const uploadJson = await uploadRes.json()

      if (!uploadRes.ok) {
        throw new Error(uploadJson.error ?? 'Upload failed')
      }

      setProgress(70)

      // 3. Run AI analysis with extracted frames
      setStage('analyzing')
      const analyzeRes = await fetch('/api/videos/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ video_id: uploadJson.video.id, frames }),
      })

      const analyzeJson = await analyzeRes.json()

      if (!analyzeRes.ok) {
        // Analysis failed — surface the video but show a clear error so the user knows
        console.warn('Analysis failed:', analyzeJson.error)
        onUploaded(uploadJson.video)
        setStage('error')
        setErrorMsg(
          analyzeJson.error?.includes('OpenAI API key')
            ? 'AI analysis is not configured on the server. Contact your coach admin to add the OpenAI API key in Vercel settings.'
            : `Analysis failed: ${analyzeJson.error ?? 'Unknown error'}. Your video was saved — try re-uploading to retry analysis.`
        )
        return
      }

      onUploaded(analyzeJson.video)
      setProgress(100)
      setStage('done')
    } catch (err) {
      setStage('error')
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong')
    }
  }

  const reset = () => {
    setFile(null)
    setStage('idle')
    setProgress(0)
    setErrorMsg('')
    setLabel('')
  }

  // ── Progress stages UI
  const STAGE_LABELS: Record<typeof stage, string> = {
    idle:      '',
    ready:     '',
    extracting:'Extracting frames…',
    uploading: 'Uploading video…',
    analyzing: '🤖 AI analyzing technique…',
    done:      '✅ Analysis complete!',
    error:     '❌ Error',
  }

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      {stage === 'idle' && (
        <div
          onDrop={onDrop}
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onClick={() => fileRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
            dragOver
              ? 'border-brand-500 bg-brand-950'
              : 'border-field-border hover:border-brand-700 hover:bg-field-card'
          }`}
        >
          <div className="text-4xl mb-3">🎥</div>
          <p className="text-white font-semibold text-sm">Drop a video clip here</p>
          <p className="text-gray-500 text-xs mt-1">MP4, MOV, WebM · max 500MB</p>
          <p className="text-gray-600 text-xs mt-1">AI will extract frames & analyze technique automatically</p>
          <input
            ref={fileRef}
            type="file"
            accept="video/*"
            className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) pickFile(f) }}
          />
        </div>
      )}

      {/* File ready — show form */}
      {stage === 'ready' && file && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center gap-3 bg-field-card border border-field-border rounded-xl px-4 py-3">
            <span className="text-2xl">🎬</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{file.name}</p>
              <p className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
            </div>
            <button type="button" onClick={reset} className="text-gray-500 hover:text-white text-sm">✕</button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs text-gray-500 mb-1">Label / Drill Name</label>
              <input
                type="text"
                value={label}
                onChange={e => setLabel(e.target.value)}
                placeholder="e.g. Route tree reps — practice 5/28"
                className="w-full bg-field-dark border border-field-border rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-brand-600"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">Drill Type</label>
              <select
                value={drillType}
                onChange={e => setDrillType(e.target.value as DrillType)}
                className="w-full bg-field-dark border border-field-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-600"
              >
                {DRILL_TYPES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
              </select>
            </div>

            <div className="flex items-end pb-0.5">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isBaseline}
                  onChange={e => setIsBaseline(e.target.checked)}
                  className="w-4 h-4 accent-brand-500"
                />
                <span className="text-xs text-gray-400">Set as baseline video</span>
              </label>
            </div>

            <div className="col-span-2">
              <label className="block text-xs text-gray-500 mb-1">Coach Notes (optional)</label>
              <input
                type="text"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Context for this clip…"
                className="w-full bg-field-dark border border-field-border rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-brand-600"
              />
            </div>
          </div>

          {errorMsg && (
            <p className="text-sm text-red-400 bg-red-950 border border-red-900 rounded-lg px-3 py-2">{errorMsg}</p>
          )}

          <button
            type="submit"
            className="w-full bg-brand-600 hover:bg-brand-500 text-white font-semibold py-3 rounded-xl text-sm transition-colors"
          >
            🤖 Upload & Analyze
          </button>
        </form>
      )}

      {/* Processing */}
      {['extracting', 'uploading', 'analyzing'].includes(stage) && (
        <div className="space-y-4 py-4">
          <div className="text-center">
            <div className="text-4xl mb-3 animate-pulse">
              {stage === 'analyzing' ? '🧠' : '⚡'}
            </div>
            <p className="text-white font-semibold text-sm">{STAGE_LABELS[stage]}</p>
            {stage === 'analyzing' && (
              <p className="text-gray-500 text-xs mt-1">Identifying technique flaws, root causes & training modifications…</p>
            )}
          </div>
          <div className="bg-field-border rounded-full h-2 overflow-hidden">
            <div
              className="h-2 bg-brand-500 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-gray-600 text-center">{progress}%</p>
        </div>
      )}

      {/* Done */}
      {stage === 'done' && (
        <div className="text-center py-4 space-y-3">
          <div className="text-4xl">✅</div>
          <p className="text-white font-semibold">Analysis complete!</p>
          <p className="text-gray-500 text-xs">Session review has been updated with AI-detected issues.</p>
          <button onClick={reset} className="text-brand-400 text-sm hover:underline">
            Upload another clip
          </button>
        </div>
      )}

      {/* Error */}
      {stage === 'error' && (
        <div className="text-center py-4 space-y-3">
          <p className="text-red-400 text-sm">{errorMsg}</p>
          <button onClick={reset} className="text-brand-400 text-sm hover:underline">Try again</button>
        </div>
      )}
    </div>
  )
}
