export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getAdminClient } from '@/lib/supabase'
import { formatDate } from '@/lib/utils'
import VideoAnalysisCard from '@/components/VideoAnalysisCard'
import FeedbackCard from '@/components/FeedbackCard'
import type { SessionVideo } from '@/types'

interface SessionDetailProps {
  params: Promise<{ coachId: string; playerId: string; sessionId: string }>
}

export default async function SessionDetailPage({ params }: SessionDetailProps) {
  const { coachId, playerId, sessionId } = await params
  const db = getAdminClient()

  const [{ data: session }, { data: player }, { data: rawVideos }] = await Promise.all([
    db.from('sessions').select('*').eq('id', sessionId).single(),
    db.from('players').select('*').eq('id', playerId).single(),
    db.from('session_videos').select('*').eq('session_id', sessionId).order('created_at', { ascending: true }),
  ])

  if (!session || !player) notFound()

  // Generate signed URLs and separate side/front clips
  const allVideos: SessionVideo[] = await Promise.all(
    (rawVideos ?? []).map(async (v) => {
      if (!v.storage_path) return v as SessionVideo
      const { data: signed } = await db.storage
        .from('session-videos')
        .createSignedUrl(v.storage_path, 3600)
      return { ...v, public_url: signed?.signedUrl ?? null } as SessionVideo
    })
  )

  // Side-view rows carry the analysis JSONB; one per drill
  const sideVideos = allVideos.filter(v => v.view_angle === 'side')
  const frontVideos = allVideos.filter(v => v.view_angle === 'front')
  const frontBySession = new Map(frontVideos.map(v => [v.session_id, v]))

  const rootCauses: Record<string, string> = session.root_causes ?? {}

  return (
    <div className="max-w-xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <div>
        <div className="flex items-center gap-1.5 text-sm text-gray-500">
          <Link href={`/${coachId}/players`} className="hover:text-gray-300">Players</Link>
          <span>›</span>
          <Link href={`/${coachId}/players/${playerId}`} className="hover:text-gray-300">{player.name}</Link>
          <span>›</span>
          <span className="text-gray-400">Session</span>
        </div>
        <h1 className="text-2xl font-bold text-white mt-1">
          {formatDate(session.session_date)}
        </h1>
      </div>

      {/* Strengths */}
      {session.strengths.length > 0 && (
        <section className="bg-field-card border border-field-border rounded-xl p-5">
          <h2 className="text-sm font-semibold text-brand-400 uppercase tracking-wide mb-3">
            ✓ Strengths
          </h2>
          <ul className="space-y-1.5">
            {session.strengths.map((s: string, i: number) => (
              <li key={i} className="flex items-start gap-2 text-sm text-white">
                <span className="text-brand-500 mt-0.5">•</span>
                {s}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Improvements + Root Causes */}
      {session.improvements.length > 0 && (
        <section className="bg-field-card border border-field-border rounded-xl p-5">
          <h2 className="text-sm font-semibold text-red-400 uppercase tracking-wide mb-3">
            ↑ Areas to Improve
          </h2>
          <ul className="space-y-3">
            {session.improvements.map((imp: string, i: number) => (
              <li key={i}>
                <p className="text-sm text-white font-medium">• {imp}</p>
                {rootCauses[imp] && (
                  <p className="text-xs text-gray-500 mt-0.5 ml-3.5">
                    <span className="text-gray-600">Root cause:</span> {rootCauses[imp]}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Notes */}
      {session.notes && (
        <section className="bg-field-card border border-field-border rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-2">Notes</h2>
          <p className="text-sm text-gray-300 whitespace-pre-wrap">{session.notes}</p>
        </section>
      )}

      {/* Video Analysis */}
      {sideVideos.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-base font-semibold text-white">
            Video Analysis
            {sideVideos.length > 1 && (
              <span className="ml-2 text-xs font-normal text-gray-500">
                {sideVideos.length} drill{sideVideos.length !== 1 ? 's' : ''}
              </span>
            )}
          </h2>
          {sideVideos.map((video) => {
            const frontClip = frontBySession.get(video.session_id ?? '')
            return (
              <div key={video.id} className="space-y-1">
                <VideoAnalysisCard
                  video={video}
                  position={player.position ?? null}
                />
                <FeedbackCard feedback={video.feedback} />
                {frontClip?.public_url && (
                  <details className="group">
                    <summary className="text-xs text-gray-600 cursor-pointer hover:text-gray-400 transition-colors px-1">
                      ▶ Front-view clip
                    </summary>
                    <div className="mt-1 bg-black rounded-lg overflow-hidden">
                      <video
                        src={frontClip.public_url}
                        controls
                        className="w-full max-h-56 object-contain"
                        preload="metadata"
                      />
                    </div>
                  </details>
                )}
              </div>
            )
          })}
        </section>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <Link
          href={`/${coachId}/players/${playerId}/plan`}
          className="flex-1 bg-brand-600 hover:bg-brand-500 text-white font-semibold py-3 rounded-xl text-sm text-center transition-colors"
        >
          🤖 Virtual Training Coach
        </Link>
        <Link
          href={`/${coachId}/players/${playerId}`}
          className="bg-field-card border border-field-border hover:border-gray-500 text-white font-medium py-3 px-4 rounded-xl text-sm transition-colors"
        >
          Back
        </Link>
      </div>
    </div>
  )
}
