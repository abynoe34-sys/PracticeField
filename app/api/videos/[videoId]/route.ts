import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/supabase'

type RouteContext = { params: Promise<{ videoId: string }> }

// GET /api/videos/[videoId] — fetch single video with fresh signed URL
export async function GET(_req: NextRequest, { params }: RouteContext) {
  try {
    const { videoId } = await params
    const db = getAdminClient()

    const { data: video, error } = await db
      .from('session_videos')
      .select('*')
      .eq('id', videoId)
      .single()

    if (error || !video) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 })
    }

    // Fresh 2-hour signed URL
    const { data: signed } = await db.storage
      .from('session-videos')
      .createSignedUrl(video.storage_path, 7200)

    return NextResponse.json({
      video: { ...video, public_url: signed?.signedUrl ?? null },
    })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/videos/[videoId] — update label, notes, drill type, baseline flag
export async function PATCH(req: NextRequest, { params }: RouteContext) {
  try {
    const { videoId } = await params
    const body = await req.json()
    const db = getAdminClient()

    const { data, error } = await db
      .from('session_videos')
      .update({
        label:      body.label,
        notes:      body.notes,
        drill_type: body.drill_type,
        is_baseline: body.is_baseline,
      })
      .eq('id', videoId)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ video: data })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/videos/[videoId] — delete video and storage file
export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  try {
    const { videoId } = await params
    const db = getAdminClient()

    const { data: video } = await db
      .from('session_videos')
      .select('storage_path')
      .eq('id', videoId)
      .single()

    if (video?.storage_path) {
      await db.storage.from('session-videos').remove([video.storage_path])
    }

    await db.from('session_videos').delete().eq('id', videoId)

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
