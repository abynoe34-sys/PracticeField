'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import type { Player, Session, ExperienceLevel } from '@/types'

export default function GeneratePlanPage() {
  const { coachId, playerId } = useParams<{ coachId: string; playerId: string }>()
  const router = useRouter()

  const [player, setPlayer] = useState<Player | null>(null)
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [painPoints, setPainPoints] = useState<string[]>([])
  const [draft, setDraft] = useState('')
  const [level, setLevel] = useState<ExperienceLevel>('beginner')
  const [weeks, setWeeks] = useState(6)
  const [useAI, setUseAI] = useState(true)

  const load = useCallback(async () => {
    const [pr, sr] = await Promise.all([
      fetch(`/api/players/${playerId}`),
      fetch(`/api/sessions?coachId=${coachId}&playerId=${playerId}`),
    ])
    const [pd, sd] = await Promise.all([pr.json(), sr.json()])
    const p: Player = pd.player
    setPlayer(p)
    setLevel(p.experience_level ?? 'beginner')
    const sessionList: Session[] = sd.sessions ?? []
    setSessions(sessionList)
    // Pre-populate pain points from latest session
    if (sessionList[0]?.improvements.length) {
      setPainPoints(sessionList[0].improvements.slice(0, 5))
    }
    setLoading(false)
  }, [coachId, playerId])

  useEffect(() => { load() }, [load])

  const addPainPoint = () => {
    const t = draft.trim()
    if (t && !painPoints.includes(t)) setPainPoints(prev => [...prev, t])
    setDraft('')
  }

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (painPoints.length === 0) {
      setError('Add at least one area to target.')
      return
    }
    setGenerating(true)
    setError(null)

    const res = await fetch('/api/training-plans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        player_id: playerId,
        coach_id: coachId,
        pain_points: painPoints,
        experience_level: level,
        commitment_weeks: weeks,
        use_ai: useAI,
      }),
    })
    const json = await res.json()

    if (!res.ok) {
      setError(json.error ?? 'Failed to generate plan')
      setGenerating(false)
      return
    }

    router.push(`/${coachId}/training-plans/${json.plan.id}`)
  }

  if (loading) {
    return <div className="text-gray-500 text-sm py-12 text-center">Loading…</div>
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div>
        <Link href={`/${coachId}/players/${playerId}`} className="text-gray-500 hover:text-gray-300 text-sm">
          ← {player?.name}
        </Link>
        <h1 className="text-2xl font-bold text-white mt-1">Generate Training Plan</h1>
        <p className="text-gray-500 text-sm">AI builds a targeted plan based on performance gaps.</p>
      </div>

      <form onSubmit={handleGenerate} className="bg-field-card border border-field-border rounded-xl p-5 space-y-5">
        {/* Pain Points */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">
            Areas to Target *
          </label>
          {sessions[0]?.improvements.length > 0 && (
            <p className="text-xs text-gray-500 mb-2">Pre-filled from last session. Edit as needed.</p>
          )}
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addPainPoint() } }}
              placeholder="e.g. Slow first step off the line"
              className="flex-1 bg-field-dark border border-field-border rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-brand-600"
            />
            <button
              type="button"
              onClick={addPainPoint}
              className="px-3 py-2 bg-field-dark border border-field-border rounded-lg text-sm text-gray-300 hover:text-white hover:border-gray-500"
            >
              Add
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {painPoints.map((pp, i) => (
              <span key={i} className="flex items-center gap-1 text-xs bg-red-950 text-red-400 border border-red-900 px-2 py-1 rounded">
                {pp}
                <button type="button" onClick={() => setPainPoints(prev => prev.filter((_, j) => j !== i))} className="ml-0.5 font-bold opacity-70 hover:opacity-100">×</button>
              </span>
            ))}
          </div>
        </div>

        {/* Level + Weeks */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Experience Level</label>
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
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Commitment (weeks)</label>
            <select
              value={weeks}
              onChange={e => setWeeks(Number(e.target.value))}
              className="w-full bg-field-dark border border-field-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-600"
            >
              <option value={4}>4 weeks</option>
              <option value={6}>6 weeks</option>
              <option value={8}>8 weeks</option>
              <option value={12}>12 weeks</option>
            </select>
          </div>
        </div>

        {/* AI Toggle */}
        <div className="flex items-center justify-between bg-field-dark border border-field-border rounded-lg px-4 py-3">
          <div>
            <p className="text-sm font-medium text-white">Use AI (GPT-4o mini)</p>
            <p className="text-xs text-gray-500">Falls back to expert templates if unavailable</p>
          </div>
          <button
            type="button"
            onClick={() => setUseAI(v => !v)}
            className={`relative w-10 h-5 rounded-full transition-colors ${useAI ? 'bg-brand-600' : 'bg-gray-700'}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${useAI ? 'translate-x-5' : ''}`} />
          </button>
        </div>

        {error && (
          <p className="text-sm text-red-400 bg-red-950 border border-red-900 rounded-lg px-3 py-2">{error}</p>
        )}

        <button
          type="submit"
          disabled={generating || painPoints.length === 0}
          className="w-full bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors"
        >
          {generating ? '⚡ Generating…' : '🤖 Generate Training Plan'}
        </button>
      </form>
    </div>
  )
}
