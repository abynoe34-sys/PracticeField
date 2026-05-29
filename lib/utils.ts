import { v4 as uuidv4 } from 'uuid'

// ─── Coach ID Generator ───────────────────────────────────────────────────────
// Produces a memorable alphanumeric ID like "ABC123XYZ"

export function generateCoachId(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no confusable chars (0,O,1,I)
  let id = ''
  for (let i = 0; i < 9; i++) {
    id += chars[Math.floor(Math.random() * chars.length)]
  }
  return id
}

export function generateId(): string {
  return uuidv4()
}

// ─── Date Helpers ─────────────────────────────────────────────────────────────

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function todayISO(): string {
  return new Date().toISOString().split('T')[0]
}

export function weeksAgo(dateStr: string): number {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  return Math.floor(diffMs / (1000 * 60 * 60 * 24 * 7))
}

// ─── Plateau Detection ────────────────────────────────────────────────────────

export function detectPlateau(
  sessions: Array<{ session_date: string; improvements: string[] }>,
  thresholdWeeks = 3
): { plateaued: boolean; weeks: number; lastProgressDate: string | null } {
  if (sessions.length < 2) return { plateaued: false, weeks: 0, lastProgressDate: null }

  const sorted = [...sessions].sort(
    (a, b) => new Date(b.session_date).getTime() - new Date(a.session_date).getTime()
  )

  // Simple heuristic: if the most recent N sessions all share the same improvement areas,
  // there's no progress being made
  const recent = sorted.slice(0, Math.min(thresholdWeeks, sorted.length))
  const oldestRecent = recent[recent.length - 1]
  const weeks = weeksAgo(oldestRecent.session_date)

  if (weeks >= thresholdWeeks && recent.length >= thresholdWeeks) {
    const allSameImprovements = recent.every(
      s => JSON.stringify(s.improvements.sort()) === JSON.stringify(recent[0].improvements.sort())
    )
    if (allSameImprovements) {
      return {
        plateaued: true,
        weeks,
        lastProgressDate: sorted[sorted.length - 1]?.session_date ?? null,
      }
    }
  }

  return { plateaued: false, weeks, lastProgressDate: null }
}

// ─── Misc ─────────────────────────────────────────────────────────────────────

export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ')
}

export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

export function truncate(str: string, max = 80): string {
  return str.length > max ? str.slice(0, max - 1) + '…' : str
}
