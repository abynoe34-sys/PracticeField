import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getAdminClient } from '@/lib/supabase'
import { formatDate } from '@/lib/utils'
import PlayerCard from '@/components/PlayerCard'
import type { Player, Session } from '@/types'

interface DashboardProps {
  params: Promise<{ coachId: string }>
}

async function getOrCreateCoach(coachId: string) {
  const db = getAdminClient()
  const { data } = await db
    .from('coaches')
    .select('*')
    .eq('coach_id', coachId)
    .single()

  if (!data) {
    // Auto-create coach on first visit
    const { data: created, error } = await db
      .from('coaches')
      .insert({ coach_id: coachId, sport: 'american_football' })
      .select()
      .single()

    if (error) return null
    return created
  }
  return data
}

export default async function DashboardPage({ params }: DashboardProps) {
  const { coachId } = await params
  const db = getAdminClient()

  const coach = await getOrCreateCoach(coachId)
  if (!coach) redirect('/')

  // Fetch players and their recent sessions in parallel
  const [{ data: players }, { data: sessions }] = await Promise.all([
    db.from('players').select('*').eq('coach_id', coachId).order('name'),
    db
      .from('sessions')
      .select('*')
      .eq('coach_id', coachId)
      .order('session_date', { ascending: false }),
  ])

  const playerList: Player[] = players ?? []
  const sessionList: Session[] = sessions ?? []

  // Map sessions to players
  const sessionsByPlayer = sessionList.reduce<Record<string, Session[]>>((acc, s) => {
    if (!acc[s.player_id]) acc[s.player_id] = []
    acc[s.player_id].push(s)
    return acc
  }, {})

  const recentSessions = sessionList.slice(0, 5)

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Coach ID: <span className="text-brand-400 font-mono">{coachId}</span>
          </p>
        </div>
        <Link
          href={`/${coachId}/players`}
          className="bg-brand-600 hover:bg-brand-500 text-white font-semibold px-4 py-2 rounded-xl text-sm transition-colors"
        >
          + Add Player
        </Link>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Players', value: playerList.length, icon: '🏈' },
          { label: 'Sessions', value: sessionList.length, icon: '📋' },
          { label: 'This Week', value: sessionList.filter(s => {
            const d = new Date(s.session_date)
            const now = new Date()
            const diff = (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24)
            return diff <= 7
          }).length, icon: '📅' },
          { label: 'Active Plans', value: 0, icon: '🤖' },
        ].map(stat => (
          <div key={stat.label} className="bg-field-card border border-field-border rounded-xl p-4">
            <p className="text-2xl mb-1">{stat.icon}</p>
            <p className="text-2xl font-bold text-white">{stat.value}</p>
            <p className="text-xs text-gray-500">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Players */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-white">Your Players</h2>
          <Link href={`/${coachId}/players`} className="text-xs text-brand-400 hover:underline">
            View all →
          </Link>
        </div>

        {playerList.length === 0 ? (
          <div className="bg-field-card border border-dashed border-field-border rounded-xl p-8 text-center">
            <p className="text-3xl mb-2">🏈</p>
            <p className="text-gray-400 font-medium">No players yet</p>
            <p className="text-gray-600 text-sm mt-1">Add your first player to get started</p>
            <Link
              href={`/${coachId}/players`}
              className="inline-block mt-4 bg-brand-600 hover:bg-brand-500 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              Add First Player
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {playerList.slice(0, 6).map(p => (
              <PlayerCard
                key={p.id}
                player={p}
                latestSession={sessionsByPlayer[p.id]?.[0] ?? null}
                sessionCount={sessionsByPlayer[p.id]?.length ?? 0}
                coachId={coachId}
              />
            ))}
          </div>
        )}
      </section>

      {/* Recent Sessions */}
      {recentSessions.length > 0 && (
        <section>
          <h2 className="text-base font-semibold text-white mb-3">Recent Sessions</h2>
          <div className="space-y-2">
            {recentSessions.map(session => {
              const player = playerList.find(p => p.id === session.player_id)
              return (
                <Link
                  key={session.id}
                  href={`/${coachId}/players/${session.player_id}/sessions/${session.id}`}
                  className="flex items-center justify-between bg-field-card border border-field-border rounded-xl px-4 py-3 hover:border-brand-600 transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium text-white">{player?.name ?? 'Unknown Player'}</p>
                    <p className="text-xs text-gray-500">{formatDate(session.session_date)}</p>
                  </div>
                  <div className="flex gap-1.5">
                    {session.improvements.slice(0, 2).map((imp, i) => (
                      <span key={i} className="text-xs bg-red-950 text-red-400 border border-red-900 px-1.5 py-0.5 rounded hidden sm:inline">
                        {imp.length > 16 ? imp.slice(0, 16) + '…' : imp}
                      </span>
                    ))}
                    <span className="text-xs text-gray-600">→</span>
                  </div>
                </Link>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}
