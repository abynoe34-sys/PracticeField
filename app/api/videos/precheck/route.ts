import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient } from '@/lib/supabase'
import { requireCoachSession } from '@/lib/require-coach'

// POST /api/videos/precheck  (Photo feature item 1 — pre-upload pose validation)
//
// Detection-only pre-flight for a PHOTO the user is about to upload: reports
// whether a full-body pose is visible BEFORE they commit to an upload + full
// pipeline run. Proxies the raw image bytes to the Python service's /detect
// (which reuses the exact IMAGE-mode landmarker the real analysis uses, so the
// verdict can't drift). Writes nothing, stores nothing.
//
// Request body: the raw image bytes (Content-Type: image/jpeg | image/png).
// Response: the service's verdict { detected, full_body, reason, missing }.
//
// Auth: requires *some* authenticated caller (a coach session OR a valid player
// JWT) so this can't be abused as a free/anonymous pose-detection compute
// endpoint. No player-scoped data is read or written — this is angle-agnostic
// detection of an image the caller holds locally — so there is no per-resource
// ownership to check beyond "are you a real, signed-in user".
const ALLOWED_PHOTO = ['image/jpeg', 'image/png']
const MAX_PHOTO_BYTES = 20_971_520 // 20MB — matches the upload cap

async function isAuthenticated(req: NextRequest): Promise<boolean> {
  // Coach path: session cookie.
  const coach = await requireCoachSession()
  if (!('error' in coach)) return true
  // Self-signup player path: bearer JWT.
  const jwt = req.headers.get('authorization')?.replace('Bearer ', '')
  if (jwt) {
    const { data: { user } } = await getSupabaseClient().auth.getUser(jwt)
    if (user) return true
  }
  return false
}

export async function POST(req: NextRequest) {
  try {
    if (!(await isAuthenticated(req))) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
    }

    const contentType = req.headers.get('content-type') ?? ''
    if (!ALLOWED_PHOTO.includes(contentType)) {
      return NextResponse.json(
        { error: 'Pre-check accepts JPEG or PNG photos only.' },
        { status: 400 }
      )
    }

    const buf = Buffer.from(await req.arrayBuffer())
    if (buf.length === 0) {
      return NextResponse.json({ error: 'Empty image.' }, { status: 400 })
    }
    if (buf.length > MAX_PHOTO_BYTES) {
      return NextResponse.json({ error: 'Photo too large (max 20MB).' }, { status: 413 })
    }

    const serviceUrl    = process.env.ANALYSIS_SERVICE_URL
    const serviceSecret = process.env.ANALYSIS_SERVICE_SECRET
    if (!serviceUrl || !serviceSecret) {
      return NextResponse.json(
        { error: 'Analysis service not configured.' },
        { status: 500 }
      )
    }

    let res: Response
    try {
      res = await fetch(`${serviceUrl}/detect`, {
        method:  'POST',
        headers: { 'Content-Type': contentType, 'X-Service-Secret': serviceSecret },
        body:    buf,
        // Detection only (no download/aggregation/feedback), so it's fast —
        // but Railway can cold-start, so allow a generous ceiling.
        signal:  AbortSignal.timeout(30_000),
      })
    } catch {
      // Network error / timeout — the pre-check is best-effort. Tell the client
      // it couldn't run so it can let the user upload anyway (never a hard block).
      return NextResponse.json(
        { detected: null, full_body: null, reason: 'check_unavailable', missing: [] },
        { status: 200 }
      )
    }

    if (!res.ok) {
      return NextResponse.json(
        { detected: null, full_body: null, reason: 'check_unavailable', missing: [] },
        { status: 200 }
      )
    }

    const verdict = await res.json()
    return NextResponse.json(verdict)
  } catch (err) {
    console.error('Precheck error:', err)
    // Never hard-fail the caller — fall back to "couldn't check".
    return NextResponse.json(
      { detected: null, full_body: null, reason: 'check_unavailable', missing: [] },
      { status: 200 }
    )
  }
}
