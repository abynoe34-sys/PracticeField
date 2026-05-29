import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/supabase'
import type { CreatePlayerRequest } from '@/types'

// GET /api/players?coachId=ABC123 — list all players for a coach
export async function GET(req: NextRequest) {
  try {
    const coachId = req.nextUrl.searchParams.get('coachId')
    if (!coachId) {
      return NextResponse.json({ error: 'coachId is required' }, { status: 400 })
    }

    const db = getAdminClient()
    const { data, error } = await db
      .from('players')
      .select('*')
      .eq('coach_id', coachId)
      .order('name')

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ players: data ?? [] })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/players — create a new player
export async function POST(req: NextRequest) {
  try {
    const body: CreatePlayerRequest = await req.json()

    if (!body.coach_id || !body.name) {
      return NextResponse.json({ error: 'coach_id and name are required' }, { status: 400 })
    }

    const db = getAdminClient()
    const { data, error } = await db
      .from('players')
      .insert({
        coach_id: body.coach_id,
        name: body.name.trim(),
        position: body.position ?? null,
        experience_level: body.experience_level ?? 'beginner',
      })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'A player with that name already exists for this coach.' },
          { status: 409 }
        )
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ player: data }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
