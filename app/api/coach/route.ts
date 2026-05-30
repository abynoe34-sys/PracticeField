import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/supabase'
import { generateCoachId } from '@/lib/utils'
import type { CreateCoachRequest } from '@/types'

// POST /api/coach — create a new coach with unique ID
export async function POST(req: NextRequest) {
  try {
    const body: CreateCoachRequest = await req.json()
    const db = getAdminClient()

    const coachId = generateCoachId()

    const { data, error } = await db
      .from('coaches')
      .insert({
        coach_id: coachId,
        name: body.name ?? null,
        email: body.email ?? null,
        sport: 'american_football',
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ coach: data }, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/coach — update coach name and/or team name
export async function PATCH(req: NextRequest) {
  try {
    const body: { coachId: string; name?: string; team_name?: string } = await req.json()
    if (!body.coachId) {
      return NextResponse.json({ error: 'coachId is required' }, { status: 400 })
    }

    const db = getAdminClient()
    const updates: Record<string, string> = {}
    if (body.name      !== undefined) updates.name      = body.name
    if (body.team_name !== undefined) updates.team_name = body.team_name

    const { data, error } = await db
      .from('coaches')
      .update(updates)
      .eq('coach_id', body.coachId)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ coach: data })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET /api/coach?coachId=ABC123 — fetch or auto-create coach
export async function GET(req: NextRequest) {
  try {
    const coachId = req.nextUrl.searchParams.get('coachId')
    if (!coachId) {
      return NextResponse.json({ error: 'coachId is required' }, { status: 400 })
    }

    const db = getAdminClient()
    const { data, error } = await db
      .from('coaches')
      .select('*')
      .eq('coach_id', coachId)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Coach not found' }, { status: 404 })
    }

    return NextResponse.json({ coach: data })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
