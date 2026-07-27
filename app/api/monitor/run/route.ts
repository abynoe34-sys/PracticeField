import { NextRequest, NextResponse } from 'next/server'
import { runImmediateCheck, runDigest } from '@/lib/monitoring'

// POST /api/monitor/run  { "mode": "immediate" | "digest" }
//
// Manual / verification / fallback trigger for the pipeline monitor. The PRIMARY
// scheduler is the Inngest crons (lib/jobs/monitoring.ts), which are triggered
// only via the signing-gated /api/inngest endpoint. This route exists so the
// monitor can be run on demand (and verified) — so it is gated by the internal
// service secret (reusing ANALYSIS_SERVICE_SECRET, already set on Vercel, the
// same secret Vercel↔Railway uses) via the X-Service-Secret header. It can NOT
// be triggered by an unauthenticated caller — no client-trusted surface.
export async function POST(req: NextRequest) {
  const secret = process.env.ANALYSIS_SERVICE_SECRET
  if (!secret) {
    return NextResponse.json({ error: 'monitor not configured' }, { status: 500 })
  }
  if (req.headers.get('x-service-secret') !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let mode: string | undefined
  try { mode = (await req.json())?.mode } catch { /* empty body ok */ }

  try {
    if (mode === 'digest') {
      const r = await runDigest()
      return NextResponse.json({ ok: true, mode: 'digest', ...r })
    }
    // default: immediate check
    const r = await runImmediateCheck()
    return NextResponse.json({ ok: true, mode: 'immediate', ...r })
  } catch (err) {
    console.error('[monitor/run] failed:', err)
    return NextResponse.json({ error: String((err as Error)?.message ?? err) }, { status: 500 })
  }
}
