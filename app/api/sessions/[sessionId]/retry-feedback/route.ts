import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient, getSupabaseClient } from '@/lib/supabase'
import { requireCoachSession } from '@/lib/require-coach'

type RouteContext = { params: Promise<{ sessionId: string }> }

// POST /api/sessions/[sessionId]/retry-feedback
//
// Pipeline hardening (item 2): user-facing "try again" when GPT-4o feedback
// generation failed. Reuses the exact generation logic — it calls the Python
// service's /regenerate-feedback endpoint, which shares its core with the
// admin /feedback route (see service/main.py).
//
// Ownership-checked exactly like every other session-scoped route: the
// session's owner is coach_id XOR player_account_id (chk_sessions_has_owner),
// so a coach session must match coach_id, or a player-account JWT must match
// player_account_id. No client-supplied owner is trusted (security-audit
// discipline).
export async function POST(req: NextRequest, { params }: RouteContext) {
  try {
    const { sessionId } = await params
    const db = getAdminClient()

    const { data: session, error: sessionError } = await db
      .from('sessions')
      .select('id, coach_id, player_account_id')
      .eq('id', sessionId)
      .single()

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // ── Ownership ──────────────────────────────────────────────────────────
    if (session.coach_id) {
      const auth = await requireCoachSession()
      if ('error' in auth) return auth.error
      if (session.coach_id !== auth.coachId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    } else if (session.player_account_id) {
      const jwt = req.headers.get('authorization')?.replace('Bearer ', '')
      if (!jwt) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
      const { data: { user }, error: authError } =
        await getSupabaseClient().auth.getUser(jwt)
      if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
      }
      const { data: account, error: accountError } = await db
        .from('player_accounts')
        .select('id')
        .eq('id', session.player_account_id)
        .eq('auth_user_id', user.id)
        .single()
      if (accountError || !account) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    } else {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // ── Call the Python service's service-gated regenerate endpoint ──────────
    const serviceUrl    = process.env.ANALYSIS_SERVICE_URL
    const serviceSecret = process.env.ANALYSIS_SERVICE_SECRET
    if (!serviceUrl || !serviceSecret) {
      return NextResponse.json(
        { error: 'Feedback service is not configured.' },
        { status: 503 }
      )
    }

    // Mark it in-flight so the poller keeps refreshing and the UI shows a
    // "generating…" state rather than the stale failed one during the retry.
    await db
      .from('session_videos')
      .update({ feedback_status: 'processing', feedback_error: null })
      .eq('session_id', sessionId)
      .eq('view_angle', 'side')

    let res: Response
    try {
      // The analysis service does MediaPipe on other routes; feedback is just
      // an OpenAI call, but give it generous headroom so a slow model doesn't
      // surface as a confusing generic error.
      res = await fetch(`${serviceUrl}/regenerate-feedback`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'X-Service-Secret': serviceSecret },
        body:    JSON.stringify({ session_id: sessionId }),
        signal:  AbortSignal.timeout(60_000),
      })
    } catch (err) {
      // Network error / timeout — record failed so the UI reflects it.
      await db
        .from('session_videos')
        .update({ feedback_status: 'failed', feedback_error: `retry unreachable: ${String(err)}`.slice(0, 500) })
        .eq('session_id', sessionId)
        .eq('view_angle', 'side')
      return NextResponse.json(
        { error: 'Could not reach the feedback service. Please try again shortly.' },
        { status: 502 }
      )
    }

    if (!res.ok) {
      const detail = await res.text().catch(() => res.statusText)
      // The Python route already recorded feedback_status='failed' on a
      // generation error; surface a clean message to the caller.
      return NextResponse.json(
        { error: 'Feedback generation failed. Please try again.', detail },
        { status: 502 }
      )
    }

    const result = await res.json()
    return NextResponse.json({ success: true, feedback: result.feedback })
  } catch (err) {
    console.error('POST /api/sessions/[sessionId]/retry-feedback failed', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
