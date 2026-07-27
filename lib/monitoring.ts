// lib/monitoring.ts
//
// Lightweight pipeline monitoring (2026-07-27). Queries state the app ALREADY
// stores (no new instrumentation) and emails the owner when the pipeline breaks
// — immediately on a new failure/stall, plus a daily digest that also proves
// the monitor itself is alive. Deliberately small: "tell me when it breaks",
// not an observability platform.
//
// Detection (all over existing session_videos state):
//   1. analysis failures — analysis_status = 'failed' (Inngest onFailure writes these)
//   2. feedback failures — feedback_status = 'failed'
//   3. stalls — analysis_status still 'ready'/'processing' well past a sane window
//      (real timing ~80s video / ~7s photo, so > STALL_MINUTES = stuck)
//
// Dedup: session_videos.monitor_alerted_at (migration-v18). A row is alerted
// once; the marker is set so it isn't re-emailed every interval.
//
// Delivery: Resend (already in use). onboarding@resend.dev CAN deliver to the
// owner's OWN verified address, so this works today without the pinned custom
// domain — alerts only ever go to the owner. Migrate the sender to the verified
// domain when the email workstream lands (see CLAUDE.md email checklist).

import { Resend } from 'resend'
import { getAdminClient } from '@/lib/supabase'

const resend = new Resend(process.env.RESEND_API_KEY)

// Alerts only ever go to the owner. onboarding@resend.dev delivers to the
// Resend account's own verified address (this one). Override via env if needed.
const ALERT_TO   = process.env.MONITOR_ALERT_EMAIL ?? 'abynoe34@gmail.com'
const ALERT_FROM = 'Practice Field Monitor <onboarding@resend.dev>'

// Non-terminal past this = stuck (real runs finish in seconds/~80s).
const STALL_MINUTES = 15
// Only scan a short recent window — cheap (indexed), and avoids re-flagging
// ancient known-stuck rows as if they were new incidents.
const WINDOW_HOURS = 48

type Row = {
  id: string
  session_id: string | null
  view_angle: string | null
  media_type: string | null
  analysis_status: string
  feedback_status: string | null
  analysis_error: string | null
  feedback_error: string | null
  created_at: string
  job_started_at: string | null
}

type IssueType = 'analysis_failed' | 'feedback_failed' | 'stalled'
type Incident = { row: Row; types: IssueType[] }

function ageMinutes(iso: string): number {
  return Math.round((Date.now() - new Date(iso).getTime()) / 60000)
}

// ── Detection ─────────────────────────────────────────────────────────────────
async function detectNewIncidents(): Promise<Incident[]> {
  const db = getAdminClient()
  const since = new Date(Date.now() - WINDOW_HOURS * 3600_000).toISOString()

  const { data, error } = await db
    .from('session_videos')
    .select('id, session_id, view_angle, media_type, analysis_status, feedback_status, analysis_error, feedback_error, created_at, job_started_at')
    .gte('created_at', since)
    .is('monitor_alerted_at', null)
    .or('analysis_status.eq.failed,feedback_status.eq.failed,analysis_status.in.(ready,processing)')

  if (error) throw new Error(`monitor query failed: ${error.message}`)
  const rows = (data ?? []) as Row[]

  const stallCutoffMs = STALL_MINUTES * 60_000
  const byId = new Map<string, Incident>()
  const add = (row: Row, type: IssueType) => {
    const cur = byId.get(row.id) ?? { row, types: [] as IssueType[] }
    if (!cur.types.includes(type)) cur.types.push(type)
    byId.set(row.id, cur)
  }
  for (const r of rows) {
    if (r.analysis_status === 'failed') add(r, 'analysis_failed')
    if (r.feedback_status === 'failed') add(r, 'feedback_failed')
    if (['ready', 'processing'].includes(r.analysis_status)) {
      const startedMs = new Date(r.job_started_at ?? r.created_at).getTime()
      if (Date.now() - startedMs > stallCutoffMs) add(r, 'stalled')
    }
  }
  return [...byId.values()]
}

// ── Immediate check (every ~15-30 min) ──────────────────────────────────────
export async function runImmediateCheck(): Promise<{ alerted: number; sent: boolean }> {
  const incidents = await detectNewIncidents()
  if (incidents.length === 0) return { alerted: 0, sent: false }

  const db = getAdminClient()
  const ids = incidents.map(i => i.row.id)

  const group = (t: IssueType) => incidents.filter(i => i.types.includes(t))
  const analysis = group('analysis_failed'), feedback = group('feedback_failed'), stalls = group('stalled')

  const line = (i: Incident) => {
    const r = i.row
    const err = r.analysis_error || r.feedback_error
    return `<li><code>${r.session_id ?? '—'}</code> (${r.media_type ?? '?'}/${r.view_angle ?? '?'}) — ${i.types.join(', ')}, ${ageMinutes(r.created_at)} min old${err ? ` — ${escapeHtml(String(err).slice(0, 160))}` : ''}</li>`
  }
  const section = (title: string, list: Incident[]) =>
    list.length ? `<p><strong>${title} (${list.length})</strong></p><ul>${list.map(line).join('')}</ul>` : ''

  const html = `
    <p>⚠️ Practice Field pipeline — <strong>${incidents.length} new incident${incidents.length === 1 ? '' : 's'}</strong> detected.</p>
    ${section('Analysis failed', analysis)}
    ${section('Feedback failed', feedback)}
    ${section(`Stalled (non-terminal > ${STALL_MINUTES} min)`, stalls)}
    <p style="color:#888;font-size:12px">Detected ${new Date().toISOString()}. Each row is alerted once. Daily digest confirms the monitor is alive.</p>`

  await resend.emails.send({
    from: ALERT_FROM, to: ALERT_TO,
    subject: `⚠️ Practice Field: ${incidents.length} pipeline incident${incidents.length === 1 ? '' : 's'}`,
    html,
  })

  // Mark alerted AFTER a successful send so a send failure retries next interval.
  await db.from('session_videos').update({ monitor_alerted_at: new Date().toISOString() }).in('id', ids)
  return { alerted: incidents.length, sent: true }
}

// ── Daily digest (once daily; also proves the monitor is alive) ──────────────
export async function runDigest(): Promise<{ sent: boolean; counts: Record<string, number> }> {
  const db = getAdminClient()
  const since = new Date(Date.now() - 24 * 3600_000).toISOString()

  const { data, error } = await db
    .from('session_videos')
    .select('analysis_status, feedback_status, created_at, job_started_at')
    .gte('created_at', since)
  if (error) throw new Error(`digest query failed: ${error.message}`)
  const rows = (data ?? []) as Pick<Row, 'analysis_status' | 'feedback_status' | 'created_at' | 'job_started_at'>[]

  const stallCutoffMs = STALL_MINUTES * 60_000
  const counts = {
    processed:       rows.length,
    complete:        rows.filter(r => r.analysis_status === 'complete').length,
    analysis_failed: rows.filter(r => r.analysis_status === 'failed').length,
    feedback_failed: rows.filter(r => r.feedback_status === 'failed').length,
    stalled:         rows.filter(r => ['ready', 'processing'].includes(r.analysis_status)
                       && Date.now() - new Date(r.job_started_at ?? r.created_at).getTime() > stallCutoffMs).length,
  }
  const healthy = counts.analysis_failed === 0 && counts.feedback_failed === 0 && counts.stalled === 0

  const html = `
    <p>${healthy ? '✅ Practice Field pipeline — all healthy (last 24h).' : '⚠️ Practice Field pipeline — issues in the last 24h.'}</p>
    <ul>
      <li>Clips processed: ${counts.processed}</li>
      <li>Completed: ${counts.complete}</li>
      <li>Analysis failed: ${counts.analysis_failed}</li>
      <li>Feedback failed: ${counts.feedback_failed}</li>
      <li>Stalled (&gt; ${STALL_MINUTES} min): ${counts.stalled}</li>
    </ul>
    <p style="color:#888;font-size:12px">Daily digest — this email also confirms the monitor is running. ${new Date().toISOString()}</p>`

  await resend.emails.send({
    from: ALERT_FROM, to: ALERT_TO,
    subject: healthy ? '✅ Practice Field: pipeline healthy (daily)' : '⚠️ Practice Field: pipeline issues (daily digest)',
    html,
  })
  return { sent: true, counts }
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))
}
