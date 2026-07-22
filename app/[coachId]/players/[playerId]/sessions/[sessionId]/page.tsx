export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getAdminClient } from '@/lib/supabase'
import { formatDate } from '@/lib/utils'
import VideoAnalysisCard from '@/components/VideoAnalysisCard'
import FeedbackPanel from '@/components/FeedbackPanel'
import FrontMeasurements from '@/components/FrontMeasurements'
import SessionAutoRefresh from '@/components/SessionAutoRefresh'
import DeleteSessionButton from '@/components/DeleteSessionButton'
import ReferencePhotosSection from '@/components/ReferencePhotosSection'
import type { SessionVideo, ReferencePhoto } from '@/types'

interface SessionDetailProps {
  params: Promise<{ coachId: string; playerId: string; sessionId: string }>
}

export default async function SessionDetailPage({ params }: SessionDetailProps) {
  const { coachId, playerId, sessionId } = await params
  const db = getAdminClient()

  const [{ data: session }, { data: player }, { data: rawVideos }, { data: rawPhotos }] = await Promise.all([
    // Scope both by coachId (the layout-verified owner) so a coach can't view
    // another coach's session or player by id (IDOR). player_id on the session
    // also pins it to the URL's player. A non-owned id → null → notFound() below.
    db.from('sessions').select('*').eq('id', sessionId).eq('coach_id', coachId).eq('player_id', playerId).single(),
    db.from('players').select('*').eq('id', playerId).eq('coach_id', coachId).single(),
    db.from('session_videos').select('*').eq('session_id', sessionId).order('created_at', { ascending: true }),
    db.from('reference_photos').select('*').eq('session_id', sessionId).order('created_at', { ascending: false }),
  ])

  if (!session || !player) notFound()

  const referencePhotos: ReferencePhoto[] = await Promise.all(
    (rawPhotos ?? []).map(async (p) => {
      const { data: signed } = await db.storage
        .from('session-videos')
        .createSignedUrl(p.storage_path, 3600)
      return { ...p, public_url: signed?.signedUrl ?? null } as ReferencePhoto
    })
  )

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

  // Drives SessionAutoRefresh. Analysis-status half: keep polling while any
  // side video hasn't reached a terminal analysis status.
  const anyFailed = sideVideos.some(v => v.analysis_status === 'failed')
  const anyInProgress =
    sideVideos.length === 0 ||
    sideVideos.some(v => v.analysis_status !== 'complete' && v.analysis_status !== 'failed')
  const pollStatus: 'processing' | 'complete' | 'failed' =
    anyInProgress ? 'processing' : anyFailed ? 'failed' : 'complete'
  // Feedback half (item 2): keep polling while feedback is genuinely still in
  // flight — feedback_status pending/processing on a completed side row. Now
  // a real terminal signal, not the old "one grace poll then give up" hack:
  // 'failed'/'skipped'/'complete' all stop the poll (the failed state is
  // shown by FeedbackPanel, with a retry, rather than polled forever).
  const feedbackInFlight = sideVideos.some(
    v => v.analysis_status === 'complete' &&
         (v.feedback_status === 'pending' || v.feedback_status === 'processing') &&
         !v.feedback
  )

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <SessionAutoRefresh status={pollStatus} feedbackInFlight={feedbackInFlight} />
      {/* Breadcrumb */}
      <div>
        <div className="flex items-center gap-1.5 text-sm text-gray-500">
          <Link href={`/${coachId}/players`} className="hover:text-gray-300">Players</Link>
          <span>›</span>
          <Link href={`/${coachId}/players/${playerId}`} className="hover:text-gray-300">{player.name}</Link>
          <span>›</span>
          <span className="text-gray-400">Coaches Notes</span>
        </div>
        <div className="flex items-center justify-between mt-1">
          <h1 className="text-2xl font-bold text-white">
            {formatDate(session.session_date)}
          </h1>
          <DeleteSessionButton
            coachId={coachId}
            playerId={playerId}
            sessionId={sessionId}
            sessionLabel={formatDate(session.session_date)}
          />
        </div>
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
            Stance Analysis
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
                  showFeedbackState={false}
                />
                <FeedbackPanel video={video} sessionId={sessionId} />
                <FrontMeasurements analysis={frontClip?.analysis} />
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

      {/* Reference Photos */}
      <section>
        <ReferencePhotosSection
          initialPhotos={referencePhotos}
          coachId={coachId}
          playerId={playerId}
          sessionId={sessionId}
        />
      </section>

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
