'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import VideoUpload from '@/components/VideoUpload'
import VideoAnalysisCard from '@/components/VideoAnalysisCard'
import VideoComparison from '@/components/VideoComparison'
import type { SessionVideo } from '@/types'

export default function PlayerVideosPage() {
  const { coachId, playerId } = useParams<{ coachId: string; playerId: string }>()

  const [videos, setVideos]       = useState<SessionVideo[]>([])
  const [player, setPlayer]       = useState<{ name: string; position: string | null } | null>(null)
  const [loading, setLoading]     = useState(true)
  const [tab, setTab]             = useState<'library' | 'compare' | 'upload'>('library')
  const [pollingIds, setPollingIds] = useState<Set<string>>(new Set())

  const load = useCallback(async () => {
    const [vr, pr] = await Promise.all([
      fetch(`/api/videos?coachId=${coachId}&playerId=${playerId}`),
      fetch(`/api/players/${playerId}`),
    ])
    const [vd, pd] = await Promise.all([vr.json(), pr.json()])
    setVideos(vd.videos ?? [])
    setPlayer(pd.player ?? null)
    setLoading(false)
  }, [coachId, playerId])

  useEffect(() => { load() }, [load])

  // Poll for videos that are still processing
  useEffect(() => {
    const processing = videos.filter(v =>
      v.analysis_status === 'pending' || v.analysis_status === 'processing'
    )
    if (processing.length === 0) return

    const ids = new Set(processing.map(v => v.id))
    setPollingIds(ids)

    const timer = setInterval(async () => {
      const res = await fetch(`/api/videos?coachId=${coachId}&playerId=${playerId}`)
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
    // Re-fetch all videos so the new clip gets a fresh signed URL for playback
    await load()
    setTab('library')
  }, [load])

  const handleDelete = async (videoId: string) => {
    if (!confirm('Delete this video and its analysis?')) return
    await fetch(`/api/videos/${videoId}`, { method: 'DELETE' })
    setVideos(prev => prev.filter(v => v.id !== videoId))
  }

  const handleReanalyze = async (video: SessionVideo) => {
    // Re-trigger analysis — user will need to re-upload frames (no server-side storage)
    alert('To re-analyze, delete this video and upload the clip again. Frame extraction happens at upload time.')
  }

  const completedVideos = videos.filter(v => v.analysis_status === 'complete')

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
          <span className="text-gray-400">Video Analysis</span>
        </div>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">🎥 Video Analysis</h1>
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
          { key: 'library', label: `Library (${videos.length})` },
          { key: 'compare', label: `Progress Compare${completedVideos.length >= 2 ? '' : ' (2+ needed)'}` },
          { key: 'upload',  label: '+ Upload New' },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as typeof tab)}
            disabled={t.key === 'compare' && completedVideos.length < 2}
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
            videos.map(video => (
              <VideoAnalysisCard
                key={video.id}
                video={video}
                position={player?.position ?? null}
                onDelete={() => handleDelete(video.id)}
                onReanalyze={() => handleReanalyze(video)}
              />
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
        <div className="bg-field-card border border-field-border rounded-xl p-5">
          <h2 className="text-base font-semibold text-white mb-1">Upload Practice Clip</h2>
          <p className="text-gray-500 text-xs mb-4">
            AI extracts frames from the video, analyzes technique, identifies root causes, and suggests training plan modifications. Issues are automatically added to the session review.
          </p>
          <VideoUpload
            playerId={playerId}
            coachId={coachId}
            onUploaded={handleUploaded}
          />
        </div>
      )}
    </div>
  )
}
