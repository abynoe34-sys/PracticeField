import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getAdminClient } from '@/lib/supabase'
import { formatDate } from '@/lib/utils'

interface SessionDetailProps {
  params: Promise<{ coachId: string; playerId: string; sessionId: string }>
}

export default async function SessionDetailPage({ params }: SessionDetailProps) {
  const { coachId, playerId, sessionId } = await params
  const db = getAdminClient()

  const [{ data: session }, { data: player }] = await Promise.all([
    db.from('sessions').select('*').eq('id', sessionId).single(),
    db.from('players').select('*').eq('id', playerId).single(),
  ])

  if (!session || !player) notFound()

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
