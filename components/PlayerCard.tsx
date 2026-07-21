'use client'

import Link from 'next/link'
import { formatDate } from '@/lib/utils'
import type { Player, Session } from '@/types'

interface PlayerCardProps {
  player: Player
  latestSession?: Session | null
  sessionCount?: number
  coachId: string
}

const LEVEL_COLORS = {
  beginner:     'bg-blue-900 text-blue-300 border-blue-700',
  intermediate: 'bg-yellow-900 text-yellow-300 border-yellow-700',
  elite:        'bg-brand-900 text-brand-300 border-brand-700',
}

const LEVEL_LABELS = {
  beginner:     'Beginner',
  intermediate: 'Intermediate',
  elite:        'Elite',
}

export default function PlayerCard({ player, latestSession, sessionCount = 0, coachId }: PlayerCardProps) {
  const level = player.experience_level ?? 'beginner'
  const levelClass = LEVEL_COLORS[level] ?? LEVEL_COLORS.beginner

  return (
    <Link
      href={`/${coachId}/players/${player.id}`}
      className="block bg-field-card border border-field-border rounded-md p-4 hover:border-brand-600 transition-colors group"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-semibold text-white text-base truncate group-hover:text-brand-400 transition-colors">
            {player.name}
          </h3>
          {player.position && (
            <p className="text-gray-400 text-sm mt-0.5">{player.position}</p>
          )}
        </div>
        <span className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded border ${levelClass}`}>
          {LEVEL_LABELS[level]}
        </span>
      </div>

      <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
        <span>{sessionCount} note{sessionCount !== 1 ? 's' : ''}</span>
        {latestSession && (
          <span>Last: {formatDate(latestSession.session_date)}</span>
        )}
        {!latestSession && sessionCount === 0 && (
          <span className="text-yellow-600">No notes yet</span>
        )}
      </div>

      {latestSession?.improvements && latestSession.improvements.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {latestSession.improvements.slice(0, 2).map((imp, i) => (
            <span key={i} className="text-xs bg-brand-950 text-brand-300 border border-brand-800 px-1.5 py-0.5 rounded">
              {imp.length > 24 ? imp.slice(0, 24) + '…' : imp}
            </span>
          ))}
        </div>
      )}
    </Link>
  )
}
