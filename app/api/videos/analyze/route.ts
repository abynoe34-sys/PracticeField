import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/supabase'
import { analyzeVideoFrames } from '@/lib/openai'
import type { ExperienceLevel, VideoAnalysis } from '@/types'

// Allow up to 60 seconds — GPT-4o vision with 8 frames can take 30–50s
export const maxDuration = 60

// POST /api/videos/analyze
// Body: { video_id, frames: string[] (base64 JPEGs) }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { video_id, frames } = body as { video_id: string; frames: string[] }

    if (!video_id || !frames?.length) {
      return NextResponse.json(
        { error: 'video_id and frames array are required' },
        { status: 400 }
      )
    }

    if (frames.length > 12) {
      return NextResponse.json(
        { error: 'Maximum 12 frames per analysis' },
        { status: 400 }
      )
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured. Add OPENAI_API_KEY to .env.local to enable video analysis.' },
        { status: 503 }
      )
    }

    const db = getAdminClient()

    // Fetch video metadata
    const { data: video, error: videoError } = await db
      .from('session_videos')
      .select('*')
      .eq('id', video_id)
      .single()

    if (videoError || !video) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 })
    }

    // Fetch player info
    const { data: player } = await db
      .from('players')
      .select('name, position, experience_level')
      .eq('id', video.player_id)
      .single()

    // Fetch baseline analysis for comparison (oldest video marked as baseline, or first video)
    const { data: priorVideos } = await db
      .from('session_videos')
      .select('analysis')
      .eq('player_id', video.player_id)
      .eq('analysis_status', 'complete')
      .neq('id', video_id)
      .order('created_at', { ascending: true })
      .limit(1)

    const baselineAnalysis = (priorVideos?.[0]?.analysis as VideoAnalysis) ?? null

    // Mark as processing
    await db
      .from('session_videos')
      .update({ analysis_status: 'processing' })
      .eq('id', video_id)

    let analysis: VideoAnalysis

    try {
      analysis = await analyzeVideoFrames({
        frames,
        playerName:       player?.name ?? 'Player',
        position:         player?.position ?? null,
        experienceLevel:  (player?.experience_level as ExperienceLevel) ?? 'beginner',
        drillType:        video.drill_type ?? 'general',
        label:            video.label ?? 'Practice drill',
        baselineAnalysis,
      })
    } catch (aiError) {
      console.error('AI analysis error:', aiError)
      await db
        .from('session_videos')
        .update({ analysis_status: 'failed' })
        .eq('id', video_id)
      return NextResponse.json({ error: 'AI analysis failed' }, { status: 500 })
    }

    // Save analysis result
    const { data: updated, error: updateError } = await db
      .from('session_videos')
      .update({
        analysis_status: 'complete',
        analysis,
        frame_paths: [],  // frames were sent inline, not stored separately
      })
      .eq('id', video_id)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // Auto-update the linked session with AI-detected issues as improvements
    if (video.session_id && analysis.issues.length > 0) {
      const { data: session } = await db
        .from('sessions')
        .select('improvements, root_causes, strengths')
        .eq('id', video.session_id)
        .single()

      if (session) {
        const newImprovements = [
          ...new Set([
            ...(session.improvements ?? []),
            ...analysis.issues
              .filter(i => i.severity === 'critical' || i.severity === 'high')
              .map(i => i.issue),
          ]),
        ]
        const newRootCauses = {
          ...(session.root_causes ?? {}),
          ...Object.fromEntries(
            analysis.issues
              .filter(i => i.severity === 'critical' || i.severity === 'high')
              .map(i => [i.issue, i.root_cause])
          ),
        }
        const newStrengths = [
          ...new Set([
            ...(session.strengths ?? []),
            ...analysis.strengths.map(s => s.strength),
          ]),
        ]

        await db
          .from('sessions')
          .update({
            improvements: newImprovements,
            root_causes:  newRootCauses,
            strengths:    newStrengths,
          })
          .eq('id', video.session_id)
      }
    }

    return NextResponse.json({ video: updated, analysis })
  } catch (err) {
    console.error('Analysis route error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
