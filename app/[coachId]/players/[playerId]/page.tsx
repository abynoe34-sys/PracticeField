import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getAdminClient } from '@/lib/supabase'
import { formatDate, detectPlateau } from '@/lib/utils'
import PerformanceChart from '@/components/PerformanceChart'
import type { Session, ProgressMetric } from '@/types'

interface PlayerDetailProps {
  params: Promise<{ coachId: string; playerId: string }>
}

const LEVEL_LABELS = { beginner: 'Beginner', intermediate: 'Intermediate', elite: 'Elite' }
const LEVEL_COLORS = {
  beginner:     'bg-blue-900 text-blue-300 border-blue-700',
  intermediate: 'bg-yellow-900 text-yellow-300 border-yellow-700',
  elite:        'bg-brand-900 text-brand-300 border-brand-700',
}

export default async function PlayerDetailPage({ params }: PlayerDetailProps) {
  const { coachId, playerId } = await params
  const db = getAdminClient()

  const [{ data: player }, { data: sessions }, { data: metrics }, { data: plans }] =
    await Promise.all([
      db.from('players').select('*').eq('id', playerId).single(),
      db.from('sessions').select('*').eq('player_id', playerId).order('session_date', { ascending: false }),
      db.from('progress_metrics').select('*').eq('player_id', playerId).order('measured_at'),
      db.from('training_plans').select('*').eq('player_id', playerId).order('created_at', { ascending: false }),
    ])

  if (!player) notFound()

  const sessionList: Session[] = sessions ?? []
  const metricList: ProgressMetric[] = metrics ?? []

  // Group metrics by name
  const metricGroups = metricList.reduce<Record<string, ProgressMetric[]>>((acc, m) => {
    if (!acc[m.metric_name]) acc[m.metric_name] = []
    acc[m.metric_name].push(m)
    return acc
  }, {})

  const plateau = detectPlateau(sessionList, 3)
  const latestPlan = plans?.[0] ?? null
  const level = player.experience_level ?? 'beginner'

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href={`/${coachId}/players`} className="text-gray-500 hover:text-gray-300 text-sm">
              ← Players
            </Link>
          </div>
          <h1 className="text-2xl font-bold text-white">{player.name}</h1>
          <div className="flex items-center gap-2 mt-1">
            {player.position && (
              <span className="text-sm text-gray-400">{player.position}</span>
            )}
            <span className={`text-xs font-medium px-2 py-0.5 rounded border ${LEVEL_COLORS[level as keyof typeof LEVEL_COLORS] ?? LEVEL_COLORS.beginner}`}>
              {LEVEL_LABELS[level as keyof typeof LEVEL_LABELS] ?? level}
            </span>
          </div>
        </div>
        <div className="flex gap-2 flex-col sm:flex-row">
          <Link
            href={`/${coachId}/players/${playerId}/sessions/new`}
            className="bg-brand-600 hover:bg-brand-500 text-white font-semibold px-4 py-2 rounded-xl text-sm transition-colors text-center"
          >
            + New Session
          </Link>
          <Link
            href={`/${coachId}/players/${playerId}/videos`}
            className="bg-field-card border border-field-border hover:border-brand-600 text-white font-medium px-4 py-2 rounded-xl text-sm transition-colors text-center"
          >
            🎥 Videos
          </Link>
          <Link
            href={`/${coachId}/players/${playerId}/plan`}
            className="bg-field-card border border-field-border hover:border-brand-600 text-white font-medium px-4 py-2 rounded-xl text-sm transition-colors text-center"
          >
            🤖 Generate Plan
          </Link>
        </div>
      </div>

      {/* Plateau Warning */}
      {plateau.plateaued && (
        <div className="bg-yellow-950 border border-yellow-800 rounded-xl p-4">
          <p className="text-yellow-300 font-semibold text-sm">⚠️ Plateau Detected</p>
          <p className="text-yellow-500 text-xs mt-1">
            Same improvement areas for {plateau.weeks}+ weeks. Consider asking the Virtual Training Coach for a new plan to break the pattern.
          </p>
          <Link
            href={`/${coachId}/players/${playerId}/plan`}
            className="inline-block mt-2 text-xs text-yellow-300 underline hover:no-underline"
          >
            Generate new plan →
          </Link>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-field-card border border-field-border rounded-xl p-4">
          <p className="text-xl font-bold text-white">{sessionList.length}</p>
          <p className="text-xs text-gray-500">Sessions</p>
        </div>
        <div className="bg-field-card border border-field-border rounded-xl p-4">
          <p className="text-xl font-bold text-white">{plans?.length ?? 0}</p>
          <p className="text-xs text-gray-500">Plans</p>
        </div>
        <div className="bg-field-card border border-field-border rounded-xl p-4">
          <p className="text-xl font-bold text-white">{sessionList[0] ? formatDate(sessionList[0].session_date) : '—'}</p>
          <p className="text-xs text-gray-500">Last Session</p>
        </div>
      </div>

      {/* Progress Charts */}
      {Object.keys(metricGroups).length > 0 && (
        <section>
          <h2 className="text-base font-semibold text-white mb-3">Performance Metrics</h2>
          <div className="space-y-3">
            {Object.entries(metricGroups).map(([name, points]) => (
              <PerformanceChart
                key={name}
                metrics={points}
                metricName={name}
                lowerIsBetter={name.toLowerCase().includes('40') || name.toLowerCase().includes('time')}
              />
            ))}
          </div>
        </section>
      )}

      {/* Latest Training Plan */}
      {latestPlan && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-white">Virtual Training Plan</h2>
            <Link
              href={`/${coachId}/training-plans/${latestPlan.id}`}
              className="text-xs text-brand-400 hover:underline"
            >
              View full plan →
            </Link>
          </div>
          <div className="bg-field-card border border-field-border rounded-xl p-4">
            <p className="text-sm text-gray-300">
              {latestPlan.exercises.length} exercises · {latestPlan.commitment_weeks}-week plan
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {(latestPlan.pain_points as string[]).map((pp, i) => (
                <span key={i} className="text-xs bg-red-950 text-red-400 border border-red-900 px-1.5 py-0.5 rounded">
                  {pp}
                </span>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Session History */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-white">Session History</h2>
          <span className="text-xs text-gray-500">{sessionList.length} total</span>
        </div>

        {sessionList.length === 0 ? (
          <div className="bg-field-card border border-dashed border-field-border rounded-xl p-8 text-center">
            <p className="text-gray-500 text-sm">No sessions logged yet.</p>
            <Link
              href={`/${coachId}/players/${playerId}/sessions/new`}
              className="inline-block mt-3 text-xs text-brand-400 underline hover:no-underline"
            >
              Log first session →
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {sessionList.map(session => (
              <Link
                key={session.id}
                href={`/${coachId}/players/${playerId}/sessions/${session.id}`}
                className="flex items-center justify-between bg-field-card border border-field-border rounded-xl px-4 py-3 hover:border-brand-600 transition-colors"
              >
                <div>
                  <p className="text-sm font-medium text-white">{formatDate(session.session_date)}</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {session.strengths.slice(0, 1).map((s, i) => (
                      <span key={i} className="text-xs text-brand-400">✓ {s.length > 20 ? s.slice(0, 20) + '…' : s}</span>
                    ))}
                    {session.improvements.slice(0, 1).map((s, i) => (
                      <span key={i} className="text-xs text-red-400">↑ {s.length > 20 ? s.slice(0, 20) + '…' : s}</span>
                    ))}
                  </div>
                </div>
                <span className="text-xs text-gray-600 ml-2">→</span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
