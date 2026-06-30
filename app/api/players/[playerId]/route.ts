import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/supabase'

type RouteContext = { params: Promise<{ playerId: string }> }

// GET /api/players/[playerId] — fetch a single player
export async function GET(_req: NextRequest, { params }: RouteContext) {
  try {
    const { playerId } = await params
    const db = getAdminClient()
    const { data, error } = await db
      .from('players')
      .select('*')
      .eq('id', playerId)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 })
    }

    return NextResponse.json({ player: data })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/players/[playerId] — update player info
//
// Normal update: { name?, position?, experience_level? }
// Parental consent is handled exclusively via the /consent/[token] flow.
// Use POST /api/players/[playerId]/resend-consent to resend the consent email.
export async function PATCH(req: NextRequest, { params }: RouteContext) {
  try {
    const { playerId } = await params
    const body = await req.json()
    const db = getAdminClient()

    const { data, error } = await db
      .from('players')
      .update({
        name: body.name,
        position: body.position,
        experience_level: body.experience_level,
      })
      .eq('id', playerId)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ player: data })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/players/[playerId] — remove player (cascades to sessions/plans)
export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  try {
    const { playerId } = await params
    const db = getAdminClient()
    const { error } = await db
      .from('players')
      .delete()
      .eq('id', playerId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
