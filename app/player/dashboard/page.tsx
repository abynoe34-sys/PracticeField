'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import type { AuthChangeEvent, Session } from '@supabase/supabase-js'
import { getSupabaseClient } from '@/lib/supabase'
import ReferencePhotosSection from '@/components/ReferencePhotosSection'
import TwoClipUpload from '@/components/TwoClipUpload'
import { mapToStancePosition, STANCE_POSITIONS, FOOTBALL_POSITIONS, type StancePosition } from '@/lib/position'
import type { ReferencePhoto, SessionVideo } from '@/types'

type AccountStatus = 'pending_minor_consent' | 'active' | 'restricted'

type PlayerAccount = {
  id: string
  display_name: string
  email: string
  account_status: AccountStatus
  is_minor: boolean
  training_opt_in: boolean
  position: string | null
}

type SessionRow = {
  id: string
  session_date: string
  position: string | null
  created_at: string
  analysis_status: string
  feedback_status: string
  has_feedback: boolean
}

export default function PlayerDashboard() {
  const router  = useRouter()
  const loadedRef = useRef(false)

  const [session,     setSession]     = useState<Session | null>(null)
  const [account,     setAccount]     = useState<PlayerAccount | null>(null)
  const [sessions,    setSessions]    = useState<SessionRow[]>([])
  const [refPhotos,   setRefPhotos]   = useState<ReferencePhoto[]>([])
  const [pageLoading, setPageLoading] = useState(true)
  const [loadError,   setLoadError]   = useState<string | null>(null)

  // Stance-analysis session flow (mirrors the coach videos page's upload tab)
  const [sessionCreating, setSessionCreating] = useState(false)
  const [sessionError,    setSessionError]    = useState<string | null>(null)
  const [analysisSessionId, setAnalysisSessionId] = useState<string | null>(null)

  // Per-session stance position (defaults from profile, overridable)
  const [stancePosition, setStancePosition] = useState<StancePosition | ''>('')
  const stanceTouched = useRef(false)

  // Profile position editor
  const [editingPosition, setEditingPosition] = useState(false)
  const [positionDraft,   setPositionDraft]   = useState('')
  const [savingPosition,  setSavingPosition]  = useState(false)

  useEffect(() => {
    const supabase = getSupabaseClient()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event: AuthChangeEvent, sess: Session | null) => {
        if (!sess) {
          router.push('/player/login')
          return
        }

        // Always keep the session current so the upload handler uses a fresh token
        // after silent token refreshes.
        setSession(sess)

        // Only fetch account data on the first fire — avoids double-fetch on
        // subsequent onAuthStateChange events (e.g., TOKEN_REFRESHED).
        if (loadedRef.current) return
        loadedRef.current = true

        // try/catch/finally so a network error during load surfaces an error
        // state instead of hanging on "Loading…" forever (item 4 sweep — the
        // fetches below could throw and skip setPageLoading(false)).
        try {
          const res = await fetch('/api/player-accounts/me', {
            headers: { Authorization: `Bearer ${sess.access_token}` },
          })
          if (!res.ok) {
            router.push('/player/login')
            return
          }
          const { account: acc } = (await res.json()) as { account: PlayerAccount }
          setAccount(acc)

          if (acc.account_status === 'active') {
            const sRes = await fetch('/api/player-accounts/me/sessions', {
              headers: { Authorization: `Bearer ${sess.access_token}` },
            })
            if (sRes.ok) {
              const { sessions: sess2 } = await sRes.json()
              setSessions(sess2 ?? [])
            }

            const pRes = await fetch(`/api/reference-photos?playerAccountId=${acc.id}`, {
              headers: { Authorization: `Bearer ${sess.access_token}` },
            })
            if (pRes.ok) {
              const { photos } = await pRes.json()
              setRefPhotos(photos ?? [])
            }
          }
        } catch (err) {
          console.error('Failed to load player dashboard', err)
          setLoadError('Could not load your dashboard. Please refresh to try again.')
        } finally {
          setPageLoading(false)
        }
      }
    )

    return () => {
      subscription.unsubscribe()
      loadedRef.current = false
    }
  }, [router])

  // Default the per-session stance position from the profile once the account
  // loads — only until the player manually changes the selector.
  useEffect(() => {
    if (account && !stanceTouched.current) {
      setStancePosition(mapToStancePosition(account.position) ?? '')
    }
  }, [account])

  const logout = async () => {
    await getSupabaseClient().auth.signOut()
    router.push('/player/login')
  }

  const savePosition = async () => {
    if (!session) return
    setSavingPosition(true)
    try {
      const res = await fetch('/api/player-accounts/me', {
        method:  'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization:  `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ position: positionDraft || null }),
      })
      if (res.ok) {
        const { account: acc } = await res.json()
        setAccount(acc)
        // Re-default the per-session selector to the new profile value unless
        // the player already overrode it this session.
        if (!stanceTouched.current) setStancePosition(mapToStancePosition(acc.position) ?? '')
        setEditingPosition(false)
      }
    } finally {
      setSavingPosition(false)
    }
  }

  // Creates a solo analysis session (player_account_id path, JWT-authed) so
  // TwoClipUpload has a valid sessions.id FK — the solo mirror of the coach
  // videos page's createOlSession. This replaces the old dead-end single-clip
  // /api/videos/upload path (which never set a view_angle, so it never paired
  // or triggered analysis).
  const startAnalysisSession = async () => {
    if (!account) return
    const { data: { session: currentSession } } =
      await getSupabaseClient().auth.getSession()
    if (!currentSession) { router.push('/player/login'); return }

    setSessionCreating(true)
    setSessionError(null)
    try {
      const res = await fetch('/api/sessions', {
        method:  'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization:  `Bearer ${currentSession.access_token}`,
        },
        body: JSON.stringify({
          player_account_id: account.id,
          session_date:      new Date().toISOString().slice(0, 10),
          position:          stancePosition || null,
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        setSessionError(json.error ?? 'Could not start a session.')
        return
      }
      setAnalysisSessionId(json.session.id)
    } catch {
      setSessionError('Network error. Please try again.')
    } finally {
      setSessionCreating(false)
    }
  }

  // Both clips uploaded — hand off to the results view, which polls the
  // pipeline (Inngest → analyse → auto-feedback) to completion.
  const handleSessionReady = (_sides: SessionVideo[], _fronts: SessionVideo[]) => {
    if (analysisSessionId) router.push(`/player/sessions/${analysisSessionId}`)
  }

  // ── Loading ─────────────────────────────────────────────────────────────────

  if (pageLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-field-dark">
        <p className="text-sm text-gray-500">Loading…</p>
      </main>
    )
  }

  // ── Load error (item 4) — surface instead of a blank/half-rendered page ──────
  if (loadError) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4 bg-field-dark">
        <div className="bg-field-card border border-brand-700 rounded-md p-6 text-center space-y-3 max-w-sm">
          <p className="text-sm text-brand-300">{loadError}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium px-4 py-2 rounded-md transition-colors"
          >
            Refresh
          </button>
        </div>
      </main>
    )
  }

  // ── pending_minor_consent ───────────────────────────────────────────────────
  // Parent hasn't responded yet. No content is accessible.

  if (account?.account_status === 'pending_minor_consent') {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-4 bg-field-dark">
        <div className="w-full max-w-sm space-y-4">
          <div className="bg-amber-950/40 border border-amber-700/50 rounded-md p-7 text-center space-y-3">
            <div className="text-4xl">⏳</div>
            <h1 className="text-xl font-bold text-white">Your account is almost ready</h1>
            <p className="text-sm text-amber-200 leading-relaxed">
              We&apos;ve sent a consent request to your parent or guardian. Once they approve,
              your account will be fully activated and you&apos;ll be able to upload videos and
              access training features.
            </p>
            <p className="text-xs text-amber-400/70 leading-relaxed">
              If they haven&apos;t received the email, ask them to check their spam folder.
              If you need to update the parent email address, contact your coach.
            </p>
          </div>
          <button
            onClick={logout}
            className="w-full text-xs text-gray-600 hover:text-gray-400 py-2 transition-colors"
          >
            Sign out
          </button>
        </div>
      </main>
    )
  }

  // ── restricted ─────────────────────────────────────────────────────────────
  // Parent declined. No content is accessible.

  if (account?.account_status === 'restricted') {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-4 bg-field-dark">
        <div className="w-full max-w-sm space-y-4">
          <div className="bg-red-950/40 border border-red-700/50 rounded-md p-7 text-center space-y-3">
            <div className="text-4xl">🚫</div>
            <h1 className="text-xl font-bold text-white">Account restricted</h1>
            <p className="text-sm text-red-200 leading-relaxed">
              Your parent or guardian has declined consent. You are not able to upload
              videos or access training features.
            </p>
            <p className="text-xs text-red-400/70 leading-relaxed">
              If you believe this is an error, speak with your parent or guardian. They
              can contact your coach to request a new consent link.
            </p>
          </div>
          <button
            onClick={logout}
            className="w-full text-xs text-gray-600 hover:text-gray-400 py-2 transition-colors"
          >
            Sign out
          </button>
        </div>
      </main>
    )
  }

  // ── active ─────────────────────────────────────────────────────────────────

  return (
    <main className="min-h-screen bg-field-dark">

      <header className="border-b border-field-border px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Image src="/practice-field-mark.png" alt="" width={28} height={28} className="rounded-md" />
          <span className="text-white font-bold">Practice Field</span>
          <span className="text-field-muted text-sm hidden sm:inline">
            Welcome, {account?.display_name}
          </span>
        </div>
        <button
          onClick={logout}
          className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
        >
          Sign out
        </button>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-5">

        {/* Welcome (mobile) */}
        <p className="text-gray-400 text-sm sm:hidden">
          Welcome, {account?.display_name}
        </p>

        {/* Profile — position (editable) */}
        <div className="bg-field-card border border-field-border rounded-md px-4 py-3 flex items-center justify-between gap-3">
          {editingPosition ? (
            <>
              <div className="flex-1">
                <label className="block text-xs text-field-muted mb-1">Position</label>
                <select
                  value={positionDraft}
                  onChange={e => setPositionDraft(e.target.value)}
                  className="w-full bg-field-dark border border-field-border rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-600"
                >
                  <option value="">Not set</option>
                  {FOOTBALL_POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div className="flex gap-2 pt-5">
                <button
                  onClick={savePosition}
                  disabled={savingPosition}
                  className="bg-brand-600 hover:bg-brand-500 disabled:opacity-60 text-white text-xs font-medium px-3 py-2 rounded-md transition-colors"
                >
                  {savingPosition ? 'Saving…' : 'Save'}
                </button>
                <button
                  onClick={() => setEditingPosition(false)}
                  className="text-xs text-gray-500 hover:text-gray-300 px-2 py-2 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm text-white">
                <span className="text-field-muted">Position:</span>{' '}
                {account?.position ?? <span className="text-gray-600">not set</span>}
              </p>
              <button
                onClick={() => { setPositionDraft(account?.position ?? ''); setEditingPosition(true) }}
                className="text-xs text-brand-400 hover:text-brand-300 transition-colors"
              >
                Edit
              </button>
            </>
          )}
        </div>

        {/* Stance Analysis — the two-clip pipeline, same as the coach flow */}
        <section className="space-y-4">
          <div>
            <h2 className="text-white font-semibold">Stance Analysis</h2>
            <p className="text-xs text-field-muted mt-0.5">
              Upload a side-view and front-view clip (or photo). AI analyzes your
              3-point stance, lean angle, and technique.
            </p>
          </div>

          {sessionError && (
            <p className="text-sm text-brand-300 leading-relaxed">{sessionError}</p>
          )}

          {!analysisSessionId ? (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-field-muted mb-1.5">
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
                  Defaults from your profile{account?.position ? ` (${account.position})` : ''}. Change it for a one-off different stance.
                </p>
              </div>
              <button
                onClick={startAnalysisSession}
                disabled={sessionCreating}
                className="w-full bg-brand-600 hover:bg-brand-500 disabled:opacity-60 text-white font-semibold py-3 rounded-md text-sm transition-colors"
              >
                {sessionCreating ? 'Starting…' : '+ New Stance Analysis'}
              </button>
            </div>
          ) : (
            <TwoClipUpload
              sessionId={analysisSessionId}
              drillType="ol_stance_3point"
              playerAccountId={account?.id}
              authToken={session?.access_token}
              onSessionReady={handleSessionReady}
            />
          )}
        </section>

        {/* Past sessions */}
        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-field-muted uppercase tracking-wide">
            My Sessions
          </h3>
          {sessions.length === 0 ? (
            <div className="bg-field-card border border-field-border rounded-md p-8 text-center">
              <p className="text-gray-500 text-sm">
                No analysis sessions yet. Start one above.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {sessions.map(s => {
                const label =
                  s.analysis_status === 'failed' ? 'analysis failed'
                  : s.analysis_status !== 'complete' ? 'analyzing…'
                  : s.has_feedback ? 'feedback ready'
                  : s.feedback_status === 'failed' ? 'feedback failed'
                  : s.feedback_status === 'skipped' ? 'complete'
                  : 'generating feedback…'
                const labelCls =
                  s.analysis_status === 'failed' || s.feedback_status === 'failed' ? 'text-red-400'
                  : label === 'feedback ready' || label === 'complete' ? 'text-green-500'
                  : 'text-brand-400'
                return (
                  <button
                    key={s.id}
                    onClick={() => router.push(`/player/sessions/${s.id}`)}
                    className="w-full text-left bg-field-card border border-field-border hover:border-gray-600 rounded-md p-4 flex items-center justify-between gap-4 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-white text-sm font-medium">{s.session_date}</p>
                      <p className="text-xs mt-0.5">
                        <span className={labelCls}>{label}</span>
                        {s.position && (
                          <span className="text-field-muted"> · {s.position.replace(/_/g, '/')}</span>
                        )}
                      </p>
                    </div>
                    <span className="text-brand-400 text-sm shrink-0">View →</span>
                  </button>
                )
              })}
            </div>
          )}
        </section>

        {/* Reference Photos */}
        <ReferencePhotosSection
          initialPhotos={refPhotos}
          playerAccountId={account?.id}
          authToken={session?.access_token}
        />

      </div>
    </main>
  )
}
