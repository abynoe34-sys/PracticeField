'use client'

// app/player/sessions/[sessionId]/page.tsx
//
// The self-signup player's own analysis-results view — the solo mirror of the
// coach session page (app/[coachId]/players/[playerId]/sessions/[sessionId]).
// Same rendering (VideoAnalysisCard + FeedbackPanel + FrontMeasurements), but
// as a client page: it authenticates with the player's JWT and fetches
// /api/player-accounts/me/sessions/[sessionId] (ownership-checked server-side),
// and it polls itself while analysis/feedback is still in flight instead of
// leaning on the server-component SessionAutoRefresh island.

import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import type { Session } from '@supabase/supabase-js'
import { getSupabaseClient } from '@/lib/supabase'
import VideoAnalysisCard from '@/components/VideoAnalysisCard'
import SessionFeedback from '@/components/SessionFeedback'
import { formatDate } from '@/lib/utils'
import type { SessionVideo } from '@/types'

export default function PlayerSessionResultsPage() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const router = useRouter()

  const [token,   setToken]   = useState<string | null>(null)
  const [videos,  setVideos]  = useState<SessionVideo[]>([])
  const [sessionDate, setSessionDate] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [tab,     setTab]     = useState<'feedback' | 'clips'>('feedback')
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Resolve the current JWT once; redirect to login if there's no session.
  useEffect(() => {
    let active = true
    getSupabaseClient().auth.getSession().then(({ data: { session } }: { data: { session: Session | null } }) => {
      if (!active) return
      if (!session) { router.push('/player/login'); return }
      setToken(session.access_token)
    })
    return () => { active = false }
  }, [router])

  const fetchSession = useCallback(async (jwt: string) => {
    setLoadError(null)
    try {
      const res = await fetch(`/api/player-accounts/me/sessions/${sessionId}`, {
        headers: { Authorization: `Bearer ${jwt}` },
      })
      if (res.status === 404) {
        setLoadError('This session was not found, or it is not yours.')
        return
      }
      if (!res.ok) {
        setLoadError('Could not load this session. Please refresh to try again.')
        return
      }
      const json = await res.json()
      setVideos(json.videos ?? [])
      setSessionDate(json.session?.session_date ?? null)
    } catch (err) {
      console.error('Failed to load solo session', err)
      setLoadError('Could not load this session. Please refresh to try again.')
    } finally {
      setLoading(false)
    }
  }, [sessionId])

  useEffect(() => {
    if (token) fetchSession(token)
  }, [token, fetchSession])

  const sideVideos  = videos.filter(v => v.view_angle === 'side')
  const frontVideos = videos.filter(v => v.view_angle === 'front')

  // Poll while anything is still in flight: analysis not yet terminal, OR the
  // side row is complete but feedback is still pending/processing. Stops on a
  // fully terminal state (analysis failed/complete AND feedback terminal).
  const inFlight =
    sideVideos.length === 0 ||
    sideVideos.some(v =>
      (v.analysis_status !== 'complete' && v.analysis_status !== 'failed') ||
      (v.analysis_status === 'complete' &&
        (v.feedback_status === 'pending' || v.feedback_status === 'processing') &&
        !v.feedback)
    )

  useEffect(() => {
    if (!token || !inFlight) {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
      return
    }
    if (pollRef.current) return
    pollRef.current = setInterval(() => fetchSession(token), 4000)
    return () => {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
    }
  }, [token, inFlight, fetchSession])

  return (
    <main className="min-h-screen bg-field-dark">
      <div className="max-w-xl mx-auto px-4 py-8 space-y-6">
        <div>
          <Link href="/player/dashboard" className="text-sm text-brand-400 hover:text-brand-300 transition-colors">
            ← Back to dashboard
          </Link>
          <h1 className="text-2xl font-bold text-white mt-2">
            {sessionDate ? formatDate(sessionDate) : 'Analysis session'}
          </h1>
        </div>

        {loading ? (
          <p className="text-gray-500 text-sm text-center py-8">Loading…</p>
        ) : loadError ? (
          <div className="bg-field-card border border-brand-700 rounded-md p-6 text-center space-y-3">
            <p className="text-sm text-brand-300">{loadError}</p>
            <button
              onClick={() => { setLoading(true); if (token) fetchSession(token) }}
              className="bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium px-4 py-2 rounded-md transition-colors"
            >
              Retry
            </button>
          </div>
        ) : sideVideos.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-8">
            No analysis clips found for this session.
          </p>
        ) : (
          <>
            {/* Tab bar — mirrors the coach view: consolidated Feedback vs. the
                raw clips. Same SessionFeedback component underneath. */}
            <div className="flex border-b border-field-border">
              {([
                { key: 'feedback', label: 'Feedback' },
                { key: 'clips',    label: `Clips (${sideVideos.length + frontVideos.length})` },
              ] as const).map(t => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`flex-1 py-2.5 text-xs font-medium transition-colors ${
                    tab === t.key
                      ? 'text-brand-400 border-b-2 border-brand-500 -mb-px'
                      : 'text-gray-500 hover:text-gray-300'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {tab === 'feedback' ? (
              <SessionFeedback
                sideVideos={sideVideos}
                frontVideo={frontVideos[0]}
                sessionId={sessionId}
                authToken={token ?? undefined}
                onRetried={() => token && fetchSession(token)}
              />
            ) : (
              <section className="space-y-4">
                {sideVideos.map(video => (
                  <VideoAnalysisCard key={video.id} video={video} position={null} showFeedbackState={false} />
                ))}
                {frontVideos.map(video => (
                  <VideoAnalysisCard key={video.id} video={video} position={null} showFeedbackState={false} />
                ))}
              </section>
            )}
          </>
        )}
      </div>
    </main>
  )
}
