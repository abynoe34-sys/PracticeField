import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/supabase'
import { TERMS_VERSION } from '@/lib/constants'
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

    if (!body.player_consent) {
      return NextResponse.json(
        { error: 'Player consent must be confirmed before adding a player.' },
        { status: 400 }
      )
    }

    const db = getAdminClient()

    // Compute is_minor client-side value to decide parental consent path.
    // The DB trigger will also compute/store it — this is just for consent logic.
    let isMinor = false
    if (body.date_of_birth) {
      const dob = new Date(body.date_of_birth)
      const cutoff = new Date()
      cutoff.setFullYear(cutoff.getFullYear() - 18)
      isMinor = dob > cutoff
    }

    if (isMinor && !body.parental_email) {
      return NextResponse.json(
        { error: 'parental_email is required for players under 18.' },
        { status: 400 }
      )
    }

    const { data, error } = await db
      .from('players')
      .insert({
        coach_id: body.coach_id,
        name: body.name.trim(),
        position: body.position ?? null,
        experience_level: body.experience_level ?? 'beginner',
        date_of_birth: body.date_of_birth ?? null,
        consent_status: 'obtained',
        parental_consent_status: isMinor ? 'obtained' : 'not_required',
        training_opt_in: body.training_opt_in ?? false,
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

    // Write consent records
    type ConsentRow = {
      coach_id: string
      player_id: string
      consent_type: string
      document_version: string
      accepted: boolean
      accepted_by_email: string | null
      ip_address: string | null
      user_agent: string | null
    }
    const consentRows: ConsentRow[] = [
      {
        coach_id: body.coach_id,
        player_id: data.id,
        consent_type: 'player_consent',
        document_version: TERMS_VERSION,
        accepted: true,
        accepted_by_email: null,
        ip_address: null,
        user_agent: null,
      },
    ]

    if (isMinor) {
      consentRows.push({
        coach_id: body.coach_id,
        player_id: data.id,
        consent_type: 'parental_consent',
        document_version: TERMS_VERSION,
        accepted: true,
        accepted_by_email: body.parental_email ?? null,
        ip_address: null,
        user_agent: null,
      })
    }

    if (body.training_opt_in) {
      consentRows.push({
        coach_id: body.coach_id,
        player_id: data.id,
        consent_type: 'training_opt_in',
        document_version: TERMS_VERSION,
        accepted: true,
        accepted_by_email: isMinor ? (body.parental_email ?? null) : null,
        ip_address: null,
        user_agent: null,
      })
    }

    await db.from('consent_records').insert(consentRows)

    return NextResponse.json({ player: data }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
