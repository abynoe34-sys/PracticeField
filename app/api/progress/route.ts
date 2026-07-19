import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/supabase'
import { requireCoachSession } from '@/lib/require-coach'
import type { LogProgressRequest } from '@/types'

// GET /api/progress?playerId=Y&metric=40-yard+dash
//
// Ownership added 2026-07-19 (security audit) — coachId was trusted from a
// query param with zero verification, leaking progress metrics for any
// coach whose id you knew. coachId is now derived from the session;
// playerId/metric remain pure filters.
export async function GET(req: NextRequest) {
  try {
    const auth = await requireCoachSession()
    if ('error' in auth) return auth.error
    const { coachId } = auth

    const playerId = req.nextUrl.searchParams.get('playerId')
    const metric = req.nextUrl.searchParams.get('metric')

    const db = getAdminClient()
    let query = db
      .from('progress_metrics')
      .select('*')
      .eq('coach_id', coachId)
      .order('measured_at', { ascending: true })

    if (playerId) query = query.eq('player_id', playerId)
    if (metric) query = query.eq('metric_name', metric)

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Group by metric name for chart-ready output
    const grouped: Record<string, typeof data> = {}
    for (const row of data ?? []) {
      if (!grouped[row.metric_name]) grouped[row.metric_name] = []
      grouped[row.metric_name].push(row)
    }

    return NextResponse.json({ metrics: data ?? [], grouped })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/progress — log a new performance metric
//
// Ownership added 2026-07-19 (security audit) — previously trusted both
// coach_id AND player_id from the body with no relationship check at all.
// coachId is now derived from the session; player_id is verified to
// belong to it below.
export async function POST(req: NextRequest) {
  try {
    const auth = await requireCoachSession()
    if ('error' in auth) return auth.error
    const { coachId } = auth

    const body: LogProgressRequest = await req.json()

    if (!body.player_id || !body.metric_name || body.value === undefined) {
      return NextResponse.json(
        { error: 'player_id, metric_name, and value are required' },
        { status: 400 }
      )
    }

    const db = getAdminClient()

    const { data: player, error: playerError } = await db
      .from('players')
      .select('id')
      .eq('id', body.player_id)
      .eq('coach_id', coachId)
      .single()

    if (playerError || !player) {
      return NextResponse.json({ error: 'Player not found.' }, { status: 404 })
    }

    const { data, error } = await db
      .from('progress_metrics')
      .insert({
        player_id: body.player_id,
        coach_id: coachId,
        metric_name: body.metric_name,
        value: body.value,
        measured_at: body.measured_at,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ metric: data }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
