import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/supabase'

type RouteContext = { params: Promise<{ sessionId: string }> }

// GET /api/sessions/[sessionId]
export async function GET(_req: NextRequest, { params }: RouteContext) {
  try {
    const { sessionId } = await params
    const db = getAdminClient()
    const { data, error } = await db
      .from('sessions')
      .select('*')
      .eq('id', sessionId)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    return NextResponse.json({ session: data })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/sessions/[sessionId] — update session notes/areas
export async function PATCH(req: NextRequest, { params }: RouteContext) {
  try {
    const { sessionId } = await params
    const body = await req.json()
    const db = getAdminClient()

    const { data, error } = await db
      .from('sessions')
      .update({
        strengths: body.strengths,
        improvements: body.improvements,
        root_causes: body.root_causes,
        notes: body.notes,
      })
      .eq('id', sessionId)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ session: data })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/sessions/[sessionId]
export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  try {
    const { sessionId } = await params
    const db = getAdminClient()
    const { error } = await db
      .from('sessions')
      .delete()
      .eq('id', sessionId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
