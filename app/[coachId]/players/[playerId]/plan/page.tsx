'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import type { Player, Session, SessionVideo, ExperienceLevel } from '@/types'

type PainPointSource = 'video' | 'session' | 'manual'

export default function GeneratePlanPage() {
  const { coachId, playerId } = useParams<{ coachId: string; playerId: string }>()
  const router = useRouter()

  const [player,     setPlayer]     = useState<Player | null>(null)
  const [sessions,   setSessions]   = useState<Session[]>([])
  const [latestVideo, setLatestVideo] = useState<SessionVideo | null>(null)
  const [loading,    setLoading]    = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error,      setError]      = useState<string | null>(null)

  const [painPoints,  setPainPoints]  = useState<string[]>([])
  const [sources,     setSources]     = useState<Record<string, PainPointSource>>({})
  const [draft,       setDraft]       = useState('')
  const [level,       setLevel]       = useState<ExperienceLevel>('beginner')
  const [weeks,       setWeeks]       = useState(6)
  const [useAI,       setUseAI]       = useState(true)

  const load = useCallback(async () => {
    const [pr, sr, vr] = await Promise.all([
      fetch(`/api/players/${playerId}`),
      fetch(`/api/sessions?coachId=${coachId}&playerId=${playerId}`),
      fetch(`/api/videos?coachId=${coachId}&playerId=${playerId}`),
    ])
    const [pd, sd, vd] = await Promise.all([pr.json(), sr.json(), vr.json()])

    const p: Player = pd.player
    setPlayer(p)
    setLevel(p.experience_level ?? 'beginner')

    const sessionList: Session[] = sd.sessions ?? []
    setSessions(sessionList)

    // ── Pull issues from the most recent completed video analysis ─────────
    const videos: SessionVideo[] = vd.videos ?? []
    const latestAnalysed = videos.find(v => v.analysis_status === 'complete' && v.analysis) ?? null
    setLatestVideo(latestAnalysed)

    const videoIssues: string[] = latestAnalysed?.analysis?.issues
      .filter(i => i.severity === 'critical' || i.severity === 'high')
      .map(i => i.issue) ?? []

    // ── Session improvements from latest session ──────────────────────────
    const sessionImprovements: string[] = sessionList[0]?.improvements.slice(0, 5) ?? []

    // ── Merge — video issues first, then session (deduplicated) ───────────
    const seen = new Set<string>()
    const merged: string[] = []
    const newSources: Record<string, PainPointSource> = {}

    for (const issue of videoIssues) {
      if (!seen.has(issue)) {
        seen.add(issue)
        merged.push(issue)
        newSources[issue] = 'video'
      }
    }
    for (const imp of sessionImprovements) {
      if (!seen.has(imp)) {
        seen.add(imp)
        merged.push(imp)
        newSources[imp] = 'session'
      }
    }

    if (merged.length) {
      setPainPoints(merged)
      setSources(newSources)
    }

    setLoading(false)
  }, [coachId, playerId])

  useEffect(() => { load() }, [load])

  const addPainPoint = () => {
    const t = draft.trim()
    if (t && !painPoints.includes(t)) {
      setPainPoints(prev => [...prev, t])
      setSources(prev => ({ ...prev, [t]: 'manual' }))
    }
    setDraft('')
  }

  const removePainPoint = (i: number) => {
    const pp = painPoints[i]
    setPainPoints(prev => prev.filter((_, j) => j !== i))
    setSources(prev => { const s = { ...prev }; delete s[pp]; return s })
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
        player_id:         playerId,
        coach_id:          coachId,
        pain_points:       painPoints,
        experience_level:  level,
        commitment_weeks:  weeks,
        use_ai:            useAI,
        // Pass video issues separately so AI can weight them higher
        video_issues: painPoints.filter(p => sources[p] === 'video'),
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

  const sourceStyle: Record<PainPointSource, { pill: string; icon: string; tip: string }> = {
    video:   { pill: 'bg-brand-950 text-brand-400 border-brand-800',  icon: '🎥', tip: 'From video analysis' },
    session: { pill: 'bg-blue-950 text-blue-400 border-blue-800',     icon: '📋', tip: 'From session review'  },
    manual:  { pill: 'bg-gray-800 text-gray-300 border-gray-700',     icon: '',   tip: 'Added manually'      },
  }

  const hasVideoIssues  = painPoints.some(p => sources[p] === 'video')
  const hasSessionIssues = painPoints.some(p => sources[p] === 'session')

  if (loading) {
    return <div className="text-gray-500 text-sm py-12 text-center">Loading…</div>
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div>
        <Link href={`/${coachId}/players/${playerId}`} className="text-gray-500 hover:text-gray-300 text-sm">
          ← {player?.name}
        </Link>
        <h1 className="text-2xl font-bold text-white mt-1">Virtual Training Coach</h1>
        <p className="text-gray-500 text-sm">Builds a targeted plan based on your player's performance gaps.</p>
      </div>

      <form onSubmit={handleGenerate} className="bg-field-card border border-field-border rounded-xl p-5 space-y-5">

        {/* Areas to Target */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">
            Areas to Target *
          </label>

          {/* Source legend */}
          {(hasVideoIssues || hasSessionIssues) && (
            <div className="flex flex-wrap gap-2 mb-3">
              {hasVideoIssues && (
                <span className="flex items-center gap-1 text-xs text-brand-400 bg-brand-950 border border-brand-800 px-2 py-0.5 rounded">
                  🎥 From video analysis
                  {latestVideo?.analysis?.overall_grade && (
                    <span className="opacity-60">· Grade {latestVideo.analysis.overall_grade}</span>
                  )}
                </span>
              )}
              {hasSessionIssues && (
                <span className="flex items-center gap-1 text-xs text-blue-400 bg-blue-950 border border-blue-800 px-2 py-0.5 rounded">
                  📋 From session review
                </span>
              )}
            </div>
          )}

          {/* Tag chips */}
          {painPoints.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {painPoints.map((pp, i) => {
                const src = sources[pp] ?? 'manual'
                const style = sourceStyle[src]
                return (
                  <span key={i} className={`flex items-center gap-1 text-xs border px-2 py-1 rounded ${style.pill}`}
                    title={style.tip}>
                    {style.icon && <span>{style.icon}</span>}
                    {pp}
                    <button type="button" onClick={() => removePainPoint(i)}
                      className="ml-0.5 font-bold opacity-60 hover:opacity-100">×</button>
                  </span>
                )
              })}
            </div>
          )}

          {/* Add manually */}
          <div className="flex gap-2">
            <input
              type="text"
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addPainPoint() } }}
              placeholder="Add additional area…"
              className="flex-1 bg-field-dark border border-field-border rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-brand-600"
            />
            <button type="button" onClick={addPainPoint}
              className="px-3 py-2 bg-field-dark border border-field-border rounded-lg text-sm text-gray-300 hover:text-white hover:border-gray-500">
              Add
            </button>
          </div>

          {painPoints.length === 0 && (
            <p className="text-xs text-gray-600 mt-2">
              No video or session data found. Type an area above to get started.
            </p>
          )}
        </div>

        {/* Level + Weeks */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Experience Level</label>
            <select value={level} onChange={e => setLevel(e.target.value as ExperienceLevel)}
              className="w-full bg-field-dark border border-field-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-600">
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="elite">Elite</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Commitment (weeks)</label>
            <select value={weeks} onChange={e => setWeeks(Number(e.target.value))}
              className="w-full bg-field-dark border border-field-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-600">
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
          <button type="button" onClick={() => setUseAI(v => !v)}
            className={`relative w-10 h-5 rounded-full transition-colors ${useAI ? 'bg-brand-600' : 'bg-gray-700'}`}>
            <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${useAI ? 'translate-x-5' : ''}`} />
          </button>
        </div>

        {error && (
          <p className="text-sm text-red-400 bg-red-950 border border-red-900 rounded-lg px-3 py-2">{error}</p>
        )}

        <button type="submit" disabled={generating || painPoints.length === 0}
          className="w-full bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors">
          {generating ? '⚡ Generating…' : '🤖 Generate Virtual Plan'}
        </button>
      </form>
    </div>
  )
}
