'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import PlayerCard from '@/components/PlayerCard'
import type { Player, Session, FootballPosition, ExperienceLevel } from '@/types'

const POSITIONS: FootballPosition[] = [
  // Offense
  'QB','RB','FB','WR','TE',
  // Offensive Line
  'OL','C','OG','OT',
  // Defensive Line
  'DE','DT','NT',
  // Linebackers
  'MLB','ILB','OLB',
  // Secondary
  'CB','NB','SS','FS',
  // Specialists
  'K','P','LS','H','PR','KR',
  // Other
  'Athlete',
]

export default function PlayersPage() {
  const { coachId } = useParams<{ coachId: string }>()
  const router = useRouter()

  const [players, setPlayers] = useState<Player[]>([])
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [position, setPosition] = useState<FootballPosition | ''>('')
  const [level, setLevel] = useState<ExperienceLevel>('beginner')
  const [dob, setDob] = useState('')
  const [playerConsent, setPlayerConsent] = useState(false)
  const [parentalEmail, setParentalEmail] = useState('')
  const [trainingOptIn, setTrainingOptIn] = useState(false)

  const isMinor = (() => {
    if (!dob) return false
    const cutoff = new Date()
    cutoff.setFullYear(cutoff.getFullYear() - 18)
    return new Date(dob) > cutoff
  })()

  const load = useCallback(async () => {
    setLoading(true)
    const [pr, sr] = await Promise.all([
      fetch(`/api/players?coachId=${coachId}`),
      fetch(`/api/sessions?coachId=${coachId}`),
    ])
    const [pd, sd] = await Promise.all([pr.json(), sr.json()])
    setPlayers(pd.players ?? [])
    setSessions(sd.sessions ?? [])
    setLoading(false)
  }, [coachId])

  useEffect(() => { load() }, [load])

  const sessionsByPlayer = sessions.reduce<Record<string, Session[]>>((acc, s) => {
    if (!acc[s.player_id]) acc[s.player_id] = []
    acc[s.player_id].push(s)
    return acc
  }, {})

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    setFormError(null)
    const res = await fetch('/api/players', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        coach_id: coachId,
        name: name.trim(),
        position: position || undefined,
        experience_level: level,
        date_of_birth: dob || undefined,
        player_consent: playerConsent,
        parental_email: isMinor ? parentalEmail.trim() || undefined : undefined,
        training_opt_in: trainingOptIn,
      }),
    })
    const json = await res.json()
    if (!res.ok) {
      setFormError(json.error ?? 'Failed to add player')
      setSaving(false)
      return
    }
    setName('')
    setPosition('')
    setLevel('beginner')
    setDob('')
    setPlayerConsent(false)
    setParentalEmail('')
    setTrainingOptIn(false)
    setShowForm(false)
    setSaving(false)
    load()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Players</h1>
        <button
          onClick={() => setShowForm(s => !s)}
          className="bg-brand-600 hover:bg-brand-500 text-white font-semibold px-4 py-2 rounded-xl text-sm transition-colors"
        >
          {showForm ? '✕ Cancel' : '+ Add Player'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="bg-field-card border border-field-border rounded-xl p-5 space-y-4">
          <h2 className="text-base font-semibold text-white">New Player</h2>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Name *</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Marcus Johnson"
              required
              className="w-full bg-field-dark border border-field-border rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-brand-600"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Position</label>
              <select
                value={position}
                onChange={e => setPosition(e.target.value as FootballPosition | '')}
                className="w-full bg-field-dark border border-field-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-600"
              >
                <option value="">Select position</option>
                {POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Experience</label>
              <select
                value={level}
                onChange={e => setLevel(e.target.value as ExperienceLevel)}
                className="w-full bg-field-dark border border-field-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-600"
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="elite">Elite</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              Date of Birth <span className="text-gray-500 font-normal">(optional)</span>
            </label>
            <input
              type="date"
              value={dob}
              onChange={e => setDob(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
              className="w-full bg-field-dark border border-field-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-600"
            />
            {isMinor && (
              <p className="text-xs text-amber-400 mt-1">Player is under 18 — parental consent required.</p>
            )}
          </div>

          {isMinor && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                Parent / Guardian Email *
              </label>
              <input
                type="email"
                value={parentalEmail}
                onChange={e => setParentalEmail(e.target.value)}
                placeholder="parent@example.com"
                required={isMinor}
                className="w-full bg-field-dark border border-field-border rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-brand-600"
              />
            </div>
          )}

          <div className="space-y-3 pt-1">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={playerConsent}
                onChange={e => setPlayerConsent(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-field-border bg-field-dark accent-brand-600 cursor-pointer"
              />
              <span className="text-xs text-gray-400 leading-relaxed">
                {isMinor
                  ? 'Parent / guardian has consented to this player being added and their performance data being recorded. *'
                  : 'Player has consented to being added and their performance data being recorded. *'}
              </span>
            </label>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={trainingOptIn}
                onChange={e => setTrainingOptIn(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-field-border bg-field-dark accent-brand-600 cursor-pointer"
              />
              <span className="text-xs text-gray-400 leading-relaxed">
                {isMinor
                  ? 'Parent / guardian opts in to AI-powered training analysis for this player.'
                  : 'Player opts in to AI-powered training analysis (video processing and recommendations).'}
              </span>
            </label>
          </div>

          {formError && (
            <p className="text-sm text-red-400">{formError}</p>
          )}

          <button
            type="submit"
            disabled={saving || !name.trim() || !playerConsent || (isMinor && !parentalEmail.trim())}
            className="w-full bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors"
          >
            {saving ? 'Adding…' : 'Add Player'}
          </button>
        </form>
      )}

      {loading ? (
        <div className="text-gray-500 text-sm py-8 text-center">Loading players…</div>
      ) : players.length === 0 ? (
        <div className="bg-field-card border border-dashed border-field-border rounded-xl p-10 text-center">
          <p className="text-3xl mb-2">🏈</p>
          <p className="text-gray-400 font-medium">No players yet</p>
          <p className="text-gray-600 text-sm mt-1">Click &quot;Add Player&quot; to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {players.map(p => (
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
    </div>
  )
}
