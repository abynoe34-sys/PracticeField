// DEPRECATED 2026-07-14: Single-clip GPT-4o vision pipeline.
// Cost ~$0.018/call (2.5× the $0.007 target); superseded by two-clip MediaPipe path
// (TwoClipUpload → Inngest → Python service) with a planned GPT-4o text feedback step.
// Route is kept intact — analyzeVideoFrames() and extractFramesFromBuffer() logic is
// reference material for the text feedback writer. Do not delete without review.
// Nothing in the active codebase calls this route as of 2026-07-14.
import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient, getSupabaseClient } from '@/lib/supabase'
import { requireCoachSession } from '@/lib/require-coach'
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

    // ── Ownership (added 2026-07-19, security audit) ──────────────────────────
    // This route had no ownership check at all: any caller who knew a
    // video_id could trigger paid analysis on any coach's video and mutate
    // the linked session's improvements/root_causes/strengths. Derived from
    // the video row itself (coach_id XOR player_account_id), same pattern as
    // /api/videos/[videoId]'s checkOwnership().
    if (video.coach_id) {
      const auth = await requireCoachSession()
      if ('error' in auth) return auth.error
      if (video.coach_id !== auth.coachId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    } else if (video.player_account_id) {
      const jwt = req.headers.get('authorization')?.replace('Bearer ', '')
      if (!jwt) {
        return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
      }
      const { data: { user }, error: authError } =
        await getSupabaseClient().auth.getUser(jwt)
      if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
      }
      const { data: account, error: accountError } = await db
        .from('player_accounts')
        .select('id')
        .eq('id', video.player_account_id)
        .eq('auth_user_id', user.id)
        .single()
      if (accountError || !account) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    } else {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
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

    // Guard added 2026-07-19 (security/correctness audit, Gotcha #8's fourth
    // occurrence) — this used to cast `.analysis` to VideoAnalysis
    // unconditionally. session_videos.analysis also holds the two-clip
    // pipeline's raw MediaPipe measurement shape ({slope_deg_mean, ...}, no
    // overall_grade/issues), which would crash lib/openai.ts's
    // analyzeVideoFrames() at `baselineAnalysis.issues.map(...)`. A prior
    // video with the raw shape is treated as "no baseline" rather than
    // passed through as a lying cast.
    const rawPrior = priorVideos?.[0]?.analysis as VideoAnalysis | null | undefined
    const baselineAnalysis =
      rawPrior && typeof (rawPrior as unknown as Record<string, unknown>).summary === 'string'
        ? rawPrior
        : null

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
