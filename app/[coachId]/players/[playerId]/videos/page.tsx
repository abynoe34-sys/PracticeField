'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import TwoClipUpload from '@/components/TwoClipUpload'
import VideoAnalysisCard from '@/components/VideoAnalysisCard'
import VideoComparison from '@/components/VideoComparison'
import SessionFeedback from '@/components/SessionFeedback'
import { mapToStancePosition, STANCE_POSITIONS, type StancePosition } from '@/lib/position'
import { formatDate } from '@/lib/utils'
import type { SessionVideo } from '@/types'

export default function PlayerVideosPage() {
  const { coachId, playerId } = useParams<{ coachId: string; playerId: string }>()

  const [videos, setVideos]     = useState<SessionVideo[]>([])
  const [player, setPlayer]     = useState<{
    name: string
    position: string | null
    coach_id: string
    is_minor: boolean | null
    parental_consent_status: string
    parent_email: string | null
  } | null>(null)
  const [loading, setLoading]   = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [tab, setTab]           = useState<'library' | 'feedback' | 'compare' | 'upload'>('library')
  const [pollingIds, setPollingIds] = useState<Set<string>>(new Set())

  // Two-clip (OL stance) session state
  const [olSessionCreating, setOlSessionCreating] = useState(false)
  const [olSessionError,    setOlSessionError]    = useState<string | null>(null)
  const [olSessionId,       setOlSessionId]       = useState<string | null>(null)
  const [olSuccess,         setOlSuccess]         = useState(false)

  // Per-session analysis stance-position (Position capture build). Defaults
  // from the player's profile position (mapped to the guard_tackle/center
  // vocabulary), overridable for this one session. '' = leave unset (null).
  const [stancePosition, setStancePosition] = useState<StancePosition | ''>('')
  const stanceTouched = useRef(false)

  // Resend consent state
  const [resendSaving, setResendSaving] = useState(false)
  const [resendSent,   setResendSent]   = useState(false)
  const [resendError,  setResendError]  = useState<string | null>(null)

  // try/catch/finally so a failed load surfaces an error instead of hanging
  // on "Loading…" forever (item 4 sweep).
  const load = useCallback(async () => {
    setLoadError(null)
    try {
      const [vr, pr] = await Promise.all([
        fetch(`/api/videos?playerId=${playerId}`),
        fetch(`/api/players/${playerId}`),
      ])
      const [vd, pd] = await Promise.all([vr.json(), pr.json()])
      setVideos(vd.videos ?? [])
      setPlayer(pd.player ?? null)
    } catch (err) {
      console.error('Failed to load videos page', err)
      setLoadError('Could not load this player’s videos. Please refresh to try again.')
    } finally {
      setLoading(false)
    }
  }, [coachId, playerId])

  useEffect(() => { load() }, [load])

  // Default the per-session stance position from the player's profile position
  // once it loads — only until the coach manually changes the selector.
  useEffect(() => {
    if (player && !stanceTouched.current) {
      setStancePosition(mapToStancePosition(player.position) ?? '')
    }
  }, [player])

  // Poll for videos that are still processing
  useEffect(() => {
    const processing = videos.filter(v =>
      v.analysis_status === 'pending' || v.analysis_status === 'processing'
    )
    if (processing.length === 0) return

    const ids = new Set(processing.map(v => v.id))
    setPollingIds(ids)

    const timer = setInterval(async () => {
      const res = await fetch(`/api/videos?playerId=${playerId}`)
      const data = await res.json()
      const updated: SessionVideo[] = data.videos ?? []
      setVideos(updated)
      const stillProcessing = updated.filter(v =>
        v.analysis_status === 'pending' || v.analysis_status === 'processing'
      )
      if (stillProcessing.length === 0) {
        clearInterval(timer)
        setPollingIds(new Set())
      }
    }, 4000)

    return () => clearInterval(timer)
  }, [videos, coachId, playerId])

  const handleUploaded = useCallback(async (_video: SessionVideo) => {
    await load()
    setTab('library')
  }, [load])

  const handleDelete = async (videoId: string) => {
    if (!confirm('Delete this video and its analysis?')) return
    await fetch(`/api/videos/${videoId}`, { method: 'DELETE' })
    setVideos(prev => prev.filter(v => v.id !== videoId))
  }

  const handleReanalyze = async (_video: SessionVideo) => {
    alert('To re-analyze, delete this video and upload the clip again. Frame extraction happens at upload time.')
  }

  const resendConsent = async () => {
    setResendSaving(true)
    setResendSent(false)
    setResendError(null)
    const res = await fetch(`/api/players/${playerId}/resend-consent`, { method: 'POST' })
    const json = await res.json()
    if (!res.ok) {
      setResendError(json.error ?? 'Failed to resend consent email.')
      setResendSaving(false)
      return
    }
    setResendSent(true)
    setResendSaving(false)
  }

  // Creates a sessions row so TwoClipUpload has a valid session_id FK, storing
  // the per-session stance position captured above (Position capture build).
  const createOlSession = useCallback(async () => {
    setOlSessionCreating(true)
    setOlSessionError(null)
    const res = await fetch('/api/sessions', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        coach_id:     coachId,
        player_id:    playerId,
        session_date: new Date().toISOString().slice(0, 10),
        position:     stancePosition || null,
      }),
    })
    const json = await res.json()
    if (!res.ok) {
      setOlSessionError(json.error ?? 'Failed to create session.')
      setOlSessionCreating(false)
      return
    }
    setOlSessionId(json.session.id)
    setOlSessionCreating(false)
  }, [coachId, playerId, stancePosition])

  const switchToTwoClip = useCallback(async () => {
    if (!olSessionId) {
      await createOlSession()
    }
  }, [olSessionId, createOlSession])

  const resetOlSession = useCallback(() => {
    // analysis_status of the completed session is 'ready' at this point —
    // set by the upload route when the second clip is received.
    // Resetting only clears local UI state; DB rows remain intact.
    setOlSessionId(null)
    setOlSuccess(false)
    setOlSessionError(null)
  }, [])

  const handleSessionReady = useCallback((_sides: SessionVideo[], _fronts: SessionVideo[]) => {
    setOlSuccess(true)
    load()
  }, [load])

  const needsParentalConsent =
    player?.is_minor && player.parental_consent_status !== 'obtained'

  const completedVideos = videos.filter(v => v.analysis_status === 'complete')

  // Group the flat video list into sessions for the Feedback tab. `videos` is
  // ordered created_at DESC by the API, so Map insertion order already yields
  // most-recent-session-first; only sessions that have a side clip (the
  // analysis subject) are shown. Feedback is session-level (the side+front
  // pair), so this fixes the per-clip presentation of the coaching assessment.
  const feedbackSessions = (() => {
    const bySession = new Map<string, SessionVideo[]>()
    for (const v of videos) {
      if (!v.session_id) continue
      const arr = bySession.get(v.session_id) ?? []
      arr.push(v)
      bySession.set(v.session_id, arr)
    }
    return [...bySession.entries()]
      .map(([sessionId, vids]) => ({
        sessionId,
        sideVideos: vids.filter(v => v.view_angle === 'side'),
        frontVideo: vids.find(v => v.view_angle === 'front'),
        recordedAt: vids.find(v => v.view_angle === 'side')?.recorded_at ?? vids[0]?.recorded_at ?? null,
      }))
      .filter(s => s.sideVideos.length > 0)
  })()

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div>
        <div className="flex items-center gap-1.5 text-sm text-gray-500 mb-1">
          <Link href={`/${coachId}/players`} className="hover:text-gray-300">Players</Link>
          <span>›</span>
          <Link href={`/${coachId}/players/${playerId}`} className="hover:text-gray-300">
            {player?.name ?? '…'}
          </Link>
          <span>›</span>
          <span className="text-gray-400">New Session</span>
        </div>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">🎥 New Session</h1>
            {player && (
              <p className="text-gray-500 text-sm">
                {player.name}{player.position ? ` · ${player.position}` : ''}
                {' · '}{videos.length} clip{videos.length !== 1 ? 's' : ''}
                {pollingIds.size > 0 && (
                  <span className="text-brand-400 ml-2 animate-pulse">· analyzing…</span>
                )}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-field-border">
        {[
          { key: 'library',  label: `Library (${videos.length})`, disabled: false },
          { key: 'feedback', label: `Feedback${feedbackSessions.length > 0 ? ` (${feedbackSessions.length})` : ''}`, disabled: false },
          { key: 'compare',  label: `Progress Compare${completedVideos.length >= 2 ? '' : ' (2+ needed)'}`, disabled: completedVideos.length < 2 },
          { key: 'upload',   label: needsParentalConsent ? '⚠ Consent Required' : '+ Upload New', disabled: false },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as typeof tab)}
            disabled={t.disabled}
            className={`flex-1 py-2.5 text-xs font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
              tab === t.key
                ? 'text-brand-400 border-b-2 border-brand-500 -mb-px'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Library */}
      {tab === 'library' && (
        <div className="space-y-4">
          {loading ? (
            <p className="text-gray-500 text-sm text-center py-8">Loading…</p>
          ) : loadError ? (
            <div className="bg-field-card border border-brand-700 rounded-md p-6 text-center space-y-3">
              <p className="text-sm text-brand-300">{loadError}</p>
              <button
                onClick={() => { setLoading(true); load() }}
                className="bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium px-4 py-2 rounded-md transition-colors"
              >
                Retry
              </button>
            </div>
          ) : videos.length === 0 ? (
            <div className="bg-field-card border border-dashed border-field-border rounded-xl p-10 text-center space-y-3">
              <p className="text-4xl">🎥</p>
              <p className="text-gray-400 font-medium">No videos yet</p>
              <p className="text-gray-600 text-sm">
                Upload a practice clip and AI will identify technique flaws, root causes, and training plan modifications.
              </p>
              <button
                onClick={() => setTab('upload')}
                className="inline-block bg-brand-600 hover:bg-brand-500 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
              >
                Upload First Clip
              </button>
            </div>
          ) : (
            <>
              {/* Feedback is session-level, not per-clip — the Library is now
                  just the clips + their status. Coaching assessment lives in
                  the Feedback tab (showFeedbackState=false suppresses the old
                  per-clip "feedback pending" placeholder here). */}
              {feedbackSessions.length > 0 && (
                <p className="text-xs text-field-muted">
                  Coaching feedback and front-view measurements are in the{' '}
                  <button
                    onClick={() => setTab('feedback')}
                    className="text-brand-400 hover:text-brand-300 underline transition-colors"
                  >
                    Feedback tab
                  </button>.
                </p>
              )}
              {videos.map(video => (
                <VideoAnalysisCard
                  key={video.id}
                  video={video}
                  position={player?.position ?? null}
                  showFeedbackState={false}
                  onDelete={() => handleDelete(video.id)}
                  onReanalyze={() => handleReanalyze(video)}
                />
              ))}
            </>
          )}
        </div>
      )}

      {/* Feedback — consolidated session-level assessment (side coaching
          feedback + front measurements), one block per session. */}
      {tab === 'feedback' && (
        <div className="space-y-6">
          {loading ? (
            <p className="text-gray-500 text-sm text-center py-8">Loading…</p>
          ) : feedbackSessions.length === 0 ? (
            <div className="bg-field-card border border-dashed border-field-border rounded-xl p-10 text-center space-y-2">
              <p className="text-3xl">📋</p>
              <p className="text-gray-400 font-medium">No feedback yet</p>
              <p className="text-gray-600 text-sm">
                Upload a side + front stance pair — once it&apos;s analyzed, the coaching
                assessment appears here.
              </p>
            </div>
          ) : (
            feedbackSessions.map(s => (
              <section key={s.sessionId} className="space-y-3">
                <div className="flex items-center justify-between gap-3 border-b border-field-border pb-2">
                  <h2 className="text-base font-semibold text-white">
                    {s.recordedAt ? formatDate(s.recordedAt) : 'Session'}
                  </h2>
                  <Link
                    href={`/${coachId}/players/${playerId}/sessions/${s.sessionId}`}
                    className="text-xs text-brand-400 hover:text-brand-300 transition-colors shrink-0"
                  >
                    Full details →
                  </Link>
                </div>
                <SessionFeedback
                  sideVideos={s.sideVideos}
                  frontVideo={s.frontVideo}
                  sessionId={s.sessionId}
                  onRetried={load}
                />
              </section>
            ))
          )}
        </div>
      )}

      {/* Progress Compare */}
      {tab === 'compare' && (
        <VideoComparison videos={completedVideos} />
      )}

      {/* Upload */}
      {tab === 'upload' && (
        needsParentalConsent ? (
          <div className="bg-field-card border border-amber-500/40 rounded-xl p-6 space-y-4">
            <div>
              <h2 className="text-base font-semibold text-amber-400 mb-1">Parental Consent Pending</h2>
              <p className="text-gray-400 text-sm">
                {player?.name} is under 18. A consent email was sent to{' '}
                <span className="text-gray-300">{player?.parent_email ?? 'the parent'}</span>.
                Uploads will unlock once the parent approves it.
              </p>
            </div>

            {resendSent ? (
              <p className="text-sm text-green-400">Consent email resent. ✓</p>
            ) : (
              <>
                {resendError && (
                  <p className="text-sm text-red-400">{resendError}</p>
                )}
                <button
                  onClick={resendConsent}
                  disabled={resendSaving}
                  className="w-full bg-field-dark border border-field-border hover:border-gray-600 disabled:opacity-50 text-gray-300 font-medium py-2.5 rounded-xl text-sm transition-colors"
                >
                  {resendSaving ? 'Sending…' : 'Resend consent email'}
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {olSessionError && (
              <p className="text-sm text-red-400">{olSessionError}</p>
            )}

            {!olSuccess && !olSessionId && (
              <div className="bg-field-card border border-field-border rounded-xl p-6 space-y-4">
                <div className="text-center">
                  <p className="text-white font-semibold text-sm">OL Stance Analysis</p>
                  <p className="text-gray-500 text-xs mt-1">
                    Upload a side-view and front-view clip. AI will analyze stance, lean angle, and technique.
                  </p>
                </div>

                {/* Per-session stance position — defaults from the player's
                    profile, overridable for this session. */}
                <div className="text-left">
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">
                    Position for this session
                  </label>
                  <select
                    value={stancePosition}
                    onChange={e => { stanceTouched.current = true; setStancePosition(e.target.value as StancePosition | '') }}
                    className="w-full bg-field-dark border border-field-border rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-600"
                  >
                    <option value="">Not specified</option>
                    {STANCE_POSITIONS.map(p => (
                      <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                  </select>
                  <p className="text-[11px] text-gray-600 mt-1">
                    Defaults from {player?.name ?? 'the player'}&apos;s profile
                    {player?.position ? ` (${player.position})` : ''}. Change it for a one-off different stance.
                  </p>
                </div>

                <button
                  onClick={switchToTwoClip}
                  disabled={olSessionCreating}
                  className="w-full bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white font-semibold py-3 rounded-md text-sm transition-colors"
                >
                  {olSessionCreating ? 'Starting…' : 'Start Analysis Session'}
                </button>
              </div>
            )}

            {olSessionId && !olSuccess && (
              <TwoClipUpload
                sessionId={olSessionId}
                drillType="ol_stance_3point"
                playerId={playerId}
                coachId={coachId}
                onSessionReady={handleSessionReady}
              />
            )}

            {olSuccess && (
              <div className="bg-field-card border border-green-500/40 rounded-xl p-6 text-center space-y-3">
                <p className="text-2xl">✓</p>
                <p className="text-green-400 font-semibold">Both clips submitted</p>
                <p className="text-gray-500 text-sm">
                  Side-view and front-view clips are ready for analysis.
                </p>
                <button
                  onClick={resetOlSession}
                  className="text-sm text-brand-400 hover:text-brand-300 transition-colors"
                >
                  Submit another session
                </button>
              </div>
            )}
          </div>
        )
      )}
    </div>
  )
}
