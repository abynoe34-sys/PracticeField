import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/supabase'
import type { CreateSessionRequest } from '@/types'

// GET /api/sessions?coachId=X&playerId=Y — list sessions
export async function GET(req: NextRequest) {
  try {
    const coachId = req.nextUrl.searchParams.get('coachId')
    const playerId = req.nextUrl.searchParams.get('playerId')

    if (!coachId) {
      return NextResponse.json({ error: 'coachId is required' }, { status: 400 })
    }

    const db = getAdminClient()
    let query = db
      .from('sessions')
      .select('*')
      .eq('coach_id', coachId)
      .order('session_date', { ascending: false })

    if (playerId) {
      query = query.eq('player_id', playerId)
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ sessions: data ?? [] })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/sessions — log a new session
export async function POST(req: NextRequest) {
  try {
    const body: CreateSessionRequest = await req.json()

    if (!body.player_id || !body.coach_id || !body.session_date) {
      return NextResponse.json(
        { error: 'player_id, coach_id, and session_date are required' },
        { status: 400 }
      )
    }

    const db = getAdminClient()
    const { data, error } = await db
      .from('sessions')
      .insert({
        player_id: body.player_id,
        coach_id: body.coach_id,
        session_date: body.session_date,
        strengths: body.strengths ?? [],
        improvements: body.improvements ?? [],
        root_causes: body.root_causes ?? {},
        notes: body.notes ?? null,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ session: data }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
