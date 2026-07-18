'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import type { AuthChangeEvent, Session } from '@supabase/supabase-js'
import { getSupabaseClient } from '@/lib/supabase'

type AccountStatus = 'pending_minor_consent' | 'active' | 'restricted'

type PlayerAccount = {
  id: string
  display_name: string
  email: string
  account_status: AccountStatus
  is_minor: boolean
  training_opt_in: boolean
}

type VideoRow = {
  id: string
  file_name: string
  label: string
  drill_type: string
  recorded_at: string
  analysis_status: string
  storage_path: string
  public_url: string | null
}

export default function PlayerDashboard() {
  const router  = useRouter()
  const loadedRef = useRef(false)

  const [session,     setSession]     = useState<Session | null>(null)
  const [account,     setAccount]     = useState<PlayerAccount | null>(null)
  const [videos,      setVideos]      = useState<VideoRow[]>([])
  const [pageLoading, setPageLoading] = useState(true)
  const [uploading,   setUploading]   = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

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
          const vRes = await fetch('/api/player-accounts/me/videos', {
            headers: { Authorization: `Bearer ${sess.access_token}` },
          })
          if (vRes.ok) {
            const { videos: vids } = await vRes.json()
            setVideos(vids ?? [])
          }
        }

        setPageLoading(false)
      }
    )

    return () => {
      subscription.unsubscribe()
      loadedRef.current = false
    }
  }, [router])

  const logout = async () => {
    await getSupabaseClient().auth.signOut()
    router.push('/player/login')
  }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !account) return

    // Re-fetch the current session to guarantee a non-stale access token.
    const { data: { session: currentSession } } =
      await getSupabaseClient().auth.getSession()
    if (!currentSession) { router.push('/player/login'); return }

    setUploading(true)
    setUploadError(null)

    const form = new FormData()
    form.append('file', file)
    form.append('player_account_id', account.id)
    form.append('recorded_at', new Date().toISOString().split('T')[0])

    const res = await fetch('/api/videos/upload', {
      method:  'POST',
      headers: { Authorization: `Bearer ${currentSession.access_token}` },
      body:    form,
    })

    if (!res.ok) {
      const json = await res.json()
      setUploadError(json.error ?? 'Upload failed.')
    } else {
      const { video } = await res.json()
      setVideos(v => [{ ...video, public_url: null }, ...v])
    }

    setUploading(false)
    e.target.value = ''
  }

  // ── Loading ─────────────────────────────────────────────────────────────────

  if (pageLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-field-dark">
        <p className="text-sm text-gray-500">Loading…</p>
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

        {/* Upload row */}
        <div className="flex items-center justify-between">
          <h2 className="text-white font-semibold">My Videos</h2>
          <label
            className={`cursor-pointer bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium px-4 py-2 rounded-md transition-colors ${
              uploading ? 'opacity-60 pointer-events-none' : ''
            }`}
          >
            {uploading ? 'Uploading…' : '+ Upload Video'}
            <input
              type="file"
              accept="video/mp4,video/quicktime,video/webm,video/x-msvideo"
              className="hidden"
              onChange={handleUpload}
              disabled={uploading}
            />
          </label>
        </div>

        {uploadError && (
          <p className="text-sm text-red-400 leading-relaxed">{uploadError}</p>
        )}

        {/* Video list */}
        {videos.length === 0 ? (
          <div className="bg-field-card border border-field-border rounded-md p-10 text-center">
            <p className="text-gray-500 text-sm">
              No videos yet. Upload your first practice clip above.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {videos.map(v => (
              <div
                key={v.id}
                className="bg-field-card border border-field-border rounded-md p-4 flex items-center gap-4"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">
                    {v.label || v.file_name}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5 capitalize">
                    {v.drill_type.replace(/_/g, ' ')} · {v.recorded_at} ·{' '}
                    <span
                      className={
                        v.analysis_status === 'complete'
                          ? 'text-green-500'
                          : v.analysis_status === 'error'
                          ? 'text-red-400'
                          : 'text-gray-500'
                      }
                    >
                      {v.analysis_status}
                    </span>
                  </p>
                </div>
                {v.public_url && (
                  <a
                    href={v.public_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 text-xs text-brand-400 hover:text-brand-300 transition-colors whitespace-nowrap"
                  >
                    ▶ Play
                  </a>
                )}
              </div>
            ))}
          </div>
        )}

      </div>
    </main>
  )
}
