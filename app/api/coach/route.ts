import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/supabase'
import { generateCoachId } from '@/lib/utils'
import { TERMS_VERSION } from '@/lib/constants'
import type { CreateCoachRequest } from '@/types'

// POST /api/coach — create a new coach with unique ID
export async function POST(req: NextRequest) {
  try {
    const body: CreateCoachRequest & { termsAgreed?: boolean; trainingOptIn?: boolean } = await req.json()

    if (!body.termsAgreed) {
      return NextResponse.json(
        { error: 'You must accept the Terms of Service and Privacy Policy to continue.' },
        { status: 400 }
      )
    }

    const db = getAdminClient()
    const coachId = generateCoachId()
    const now = new Date().toISOString()

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      ?? req.headers.get('x-real-ip')
      ?? null
    const ua = req.headers.get('user-agent') ?? null

    const { data, error } = await db
      .from('coaches')
      .insert({
        coach_id: coachId,
        name: body.name ?? null,
        email: body.email ?? null,
        sport: 'american_football',
        terms_version: TERMS_VERSION,
        terms_accepted_at: now,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Append consent_records for ToS, Privacy Policy, and optional training opt-in
    const consentRows: {
      coach_id: string
      player_id: null
      consent_type: string
      document_version: string
      accepted: boolean
      accepted_by_email: string | null
      ip_address: string | null
      user_agent: string | null
    }[] = [
      {
        coach_id: coachId,
        player_id: null,
        consent_type: 'terms_of_service',
        document_version: TERMS_VERSION,
        accepted: true,
        accepted_by_email: body.email ?? null,
        ip_address: ip,
        user_agent: ua,
      },
      {
        coach_id: coachId,
        player_id: null,
        consent_type: 'privacy_policy',
        document_version: TERMS_VERSION,
        accepted: true,
        accepted_by_email: body.email ?? null,
        ip_address: ip,
        user_agent: ua,
      },
    ]

    if (body.trainingOptIn) {
      consentRows.push({
        coach_id: coachId,
        player_id: null,
        consent_type: 'training_opt_in',
        document_version: TERMS_VERSION,
        accepted: true,
        accepted_by_email: body.email ?? null,
        ip_address: ip,
        user_agent: ua,
      })
    }

    await db.from('consent_records').insert(consentRows)

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
