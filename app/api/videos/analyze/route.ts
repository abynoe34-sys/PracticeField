import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/supabase'
import { analyzeVideoFrames } from '@/lib/openai'
import { extractFramesFromBuffer } from '@/lib/server-frames'
import type { ExperienceLevel, VideoAnalysis } from '@/types'

// Allow up to 60 seconds — download + FFmpeg extraction + GPT-4o vision
export const maxDuration = 60

// POST /api/videos/analyze
// Body: { video_id }
// Frames are now extracted server-side from Supabase Storage using FFmpeg
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { video_id } = body as { video_id: string }

    if (!video_id) {
      return NextResponse.json(
        { error: 'video_id is required' },
        { status: 400 }
      )
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured. Add OPENAI_API_KEY to environment variables.' },
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

    // Fetch baseline analysis for comparison
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

    // ── Download video from Supabase Storage ─────────────────────────────────
    let frames: string[]
    try {
      const { data: fileBlob, error: downloadError } = await db.storage
        .from('session-videos')
        .download(video.storage_path)

      if (downloadError || !fileBlob) {
        throw new Error(`Storage download failed: ${downloadError?.message ?? 'unknown'}`)
      }

      const videoBuffer = Buffer.from(await fileBlob.arrayBuffer())
      const fileExt = (video.file_name as string).split('.').pop() ?? 'mp4'

      console.log(`Extracting frames from ${video.file_name} (${(videoBuffer.length / 1024 / 1024).toFixed(1)} MB)`)
      frames = extractFramesFromBuffer(videoBuffer, fileExt, 8)
      console.log(`Extracted ${frames.length} frames`)
    } catch (extractErr: unknown) {
      const errMsg = extractErr instanceof Error ? extractErr.message : String(extractErr)
      console.error('Frame extraction error:', errMsg)
      await db.from('session_videos').update({ analysis_status: 'failed' }).eq('id', video_id)
      return NextResponse.json({ error: `Frame extraction failed: ${errMsg}` }, { status: 500 })
    }

    // ── Run AI analysis ───────────────────────────────────────────────────────
    let analysis: VideoAnalysis

    try {
      analysis = await analyzeVideoFrames({
        frames,
        playerName:      player?.name ?? 'Player',
        position:        player?.position ?? null,
        experienceLevel: (player?.experience_level as ExperienceLevel) ?? 'beginner',
        drillType:       video.drill_type ?? 'general',
        label:           video.label ?? 'Practice drill',
        baselineAnalysis,
      })
    } catch (aiError: unknown) {
      const errMsg = aiError instanceof Error ? aiError.message : String(aiError)
      const statusCode = (aiError as { status?: number })?.status
      console.error('AI analysis error:', errMsg, 'status:', statusCode)
      await db.from('session_videos').update({ analysis_status: 'failed' }).eq('id', video_id)
      return NextResponse.json({ error: `AI analysis failed: ${errMsg}` }, { status: 500 })
    }

    // ── Save result ───────────────────────────────────────────────────────────
    const { data: updated, error: updateError } = await db
      .from('session_videos')
      .update({ analysis_status: 'complete', analysis, frame_paths: [] })
      .eq('id', video_id)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // Auto-update the linked session with AI-detected issues
    if (video.session_id && analysis.issues.length > 0) {
      const { data: session } = await db
        .from('sessions')
        .select('improvements, root_causes, strengths')
        .eq('id', video.session_id)
        .single()

      if (session) {
        await db.from('sessions').update({
          improvements: [...new Set([
            ...(session.improvements ?? []),
            ...analysis.issues
              .filter(i => i.severity === 'critical' || i.severity === 'high')
              .map(i => i.issue),
          ])],
          root_causes: {
            ...(session.root_causes ?? {}),
            ...Object.fromEntries(
              analysis.issues
                .filter(i => i.severity === 'critical' || i.severity === 'high')
                .map(i => [i.issue, i.root_cause])
            ),
          },
          strengths: [...new Set([
            ...(session.strengths ?? []),
            ...analysis.strengths.map(s => s.strength),
          ])],
        }).eq('id', video.session_id)
      }
    }

    return NextResponse.json({ video: updated, analysis })
  } catch (err) {
    console.error('Analysis route error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
