import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/supabase'
import type { LogProgressRequest } from '@/types'

// GET /api/progress?coachId=X&playerId=Y&metric=40-yard+dash
export async function GET(req: NextRequest) {
  try {
    const coachId = req.nextUrl.searchParams.get('coachId')
    const playerId = req.nextUrl.searchParams.get('playerId')
    const metric = req.nextUrl.searchParams.get('metric')

    if (!coachId) {
      return NextResponse.json({ error: 'coachId is required' }, { status: 400 })
    }

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
export async function POST(req: NextRequest) {
  try {
    const body: LogProgressRequest = await req.json()

    if (!body.player_id || !body.coach_id || !body.metric_name || body.value === undefined) {
      return NextResponse.json(
        { error: 'player_id, coach_id, metric_name, and value are required' },
        { status: 400 }
      )
    }

    const db = getAdminClient()
    const { data, error } = await db
      .from('progress_metrics')
      .insert({
        player_id: body.player_id,
        coach_id: body.coach_id,
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
