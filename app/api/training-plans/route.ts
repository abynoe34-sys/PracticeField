import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/supabase'
import { generateTrainingPlanAI, generateTrainingPlanTemplate } from '@/lib/openai'
import { getImprovementTimeline } from '@/lib/training-templates'
import type { GenerateTrainingPlanRequest } from '@/types'

// GET /api/training-plans?coachId=X&playerId=Y
export async function GET(req: NextRequest) {
  try {
    const coachId = req.nextUrl.searchParams.get('coachId')
    const playerId = req.nextUrl.searchParams.get('playerId')

    if (!coachId) {
      return NextResponse.json({ error: 'coachId is required' }, { status: 400 })
    }

    const db = getAdminClient()
    let query = db
      .from('training_plans')
      .select('*')
      .eq('coach_id', coachId)
      .order('created_at', { ascending: false })

    if (playerId) {
      query = query.eq('player_id', playerId)
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ plans: data ?? [] })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/training-plans — generate a training plan
export async function POST(req: NextRequest) {
  try {
    const body: GenerateTrainingPlanRequest = await req.json()

    if (!body.player_id || !body.coach_id || !body.pain_points?.length) {
      return NextResponse.json(
        { error: 'player_id, coach_id, and pain_points are required' },
        { status: 400 }
      )
    }

    // Fetch player info for context
    const db = getAdminClient()
    const { data: player } = await db
      .from('players')
      .select('name, position, experience_level')
      .eq('id', body.player_id)
      .single()

    // Fetch recent strengths for context
    const { data: recentSessions } = await db
      .from('sessions')
      .select('strengths')
      .eq('player_id', body.player_id)
      .order('session_date', { ascending: false })
      .limit(3)

    const recentStrengths = [
      ...new Set(recentSessions?.flatMap(s => s.strengths ?? []) ?? []),
    ]

    const planParams = {
      playerName: player?.name ?? 'Player',
      position: player?.position ?? null,
      experienceLevel: body.experience_level,
      painPoints: body.pain_points,
      strengths: recentStrengths,
      commitmentWeeks: body.commitment_weeks,
    }

    // Use AI if requested and key is available, else fall back to templates
    const useAI = body.use_ai !== false && !!process.env.OPENAI_API_KEY
    const exercises = useAI
      ? await generateTrainingPlanAI(planParams)
      : generateTrainingPlanTemplate(planParams)

    const timeline = getImprovementTimeline(body.experience_level, body.pain_points)

    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + body.commitment_weeks * 7)

    const { data, error } = await db
      .from('training_plans')
      .insert({
        player_id: body.player_id,
        coach_id: body.coach_id,
        pain_points: body.pain_points,
        experience_level: body.experience_level,
        commitment_weeks: body.commitment_weeks,
        exercises,
        generated_by: useAI ? 'ai' : 'coach',
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ plan: data, timeline }, { status: 201 })
  } catch (err) {
    console.error('Training plan generation error:', err)
    return NextResponse.json({ error: 'Failed to generate training plan' }, { status: 500 })
  }
}
