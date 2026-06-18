import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/supabase'
import { TERMS_VERSION } from '@/lib/constants'

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

// PATCH /api/players/[playerId] — update player info or grant parental consent
//
// Normal update: { name?, position?, experience_level? }
// Consent grant:  { grant_parental_consent: true, parental_email: string, coach_id: string }
export async function PATCH(req: NextRequest, { params }: RouteContext) {
  try {
    const { playerId } = await params
    const body = await req.json()
    const db = getAdminClient()

    if (body.grant_parental_consent) {
      if (!body.parental_email || !body.coach_id) {
        return NextResponse.json(
          { error: 'parental_email and coach_id are required to grant parental consent.' },
          { status: 400 }
        )
      }

      const { data, error } = await db
        .from('players')
        .update({ parental_consent_status: 'obtained' })
        .eq('id', playerId)
        .select()
        .single()

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      await db.from('consent_records').insert({
        coach_id: body.coach_id,
        player_id: playerId,
        consent_type: 'parental_consent',
        document_version: TERMS_VERSION,
        accepted: true,
        accepted_by_email: body.parental_email,
        ip_address: null,
        user_agent: null,
      })

      return NextResponse.json({ player: data })
    }

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
