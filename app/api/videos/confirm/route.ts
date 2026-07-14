import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/supabase'
import { inngest } from '@/lib/inngest'

// POST /api/videos/confirm
//
// Called after the browser has uploaded a file directly to Supabase Storage
// via the signed URL from /api/videos/presign. Writes the session_videos row
// and fires the Inngest analysis event when both clips are present.
//
// This is the tail of the old /api/videos/upload route — the consent gate
// ran in /presign, so it is not repeated here. The signed URL enforces that
// the file lands at the correct storage_path; only that path is accepted.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const {
      storage_path:      storagePath,
      player_id:         playerId,
      coach_id:          coachId,
      player_account_id: playerAccountId,
      session_id:        sessionId,
      view_angle:        viewAngle,
      label,
      drill_type:        drillType,
      notes,
      is_baseline:       isBaseline,
      recorded_at:       recordedAt,
      file_name:         fileName,
      file_size:         fileSize,
    } = body

    if (!storagePath) {
      return NextResponse.json({ error: 'storage_path is required.' }, { status: 400 })
    }

    const db = getAdminClient()

    // ── Determine initial analysis_status (same logic as the old upload route) ─
    const pairedView    = viewAngle === 'side' ? 'front' : 'side'
    const initialStatus = sessionId
      ? (viewAngle === 'side' ? 'awaiting_front' : 'awaiting_side')
      : 'awaiting_both'

    // ── Insert session_videos row ─────────────────────────────────────────────
    const { data: videoRow, error: dbError } = await db
      .from('session_videos')
      .insert({
        ...(playerAccountId
          ? { player_account_id: playerAccountId }
          : { player_id: playerId, coach_id: coachId }),
        session_id:      sessionId  || null,
        storage_path:    storagePath,
        file_name:       fileName   || null,
        file_size_bytes: fileSize   || null,
        label:           label      || fileName || null,
        drill_type:      drillType  || 'general',
        notes:           notes      || null,
        is_baseline:     isBaseline ?? false,
        recorded_at:     recordedAt || new Date().toISOString().split('T')[0],
        view_angle:      viewAngle  || null,
        analysis_status: initialStatus,
        frame_paths:     [],
      })
      .select()
      .single()

    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 500 })
    }

    // ── Paired-clip check ─────────────────────────────────────────────────────
    if (sessionId && viewAngle) {
      const { data: pairedClip } = await db
        .from('session_videos')
        .select('id')
        .eq('session_id', sessionId)
        .eq('view_angle', pairedView)
        .limit(1)
        .maybeSingle()

      if (pairedClip) {
        await db
          .from('session_videos')
          .update({ analysis_status: 'ready' })
          .eq('session_id', sessionId)
          .not('view_angle', 'is', null)

        await inngest.send({
          name: 'analysis/session.ready',
          data: {
            session_id:   sessionId,
            ...(playerAccountId
              ? { player_account_id: playerAccountId }
              : { player_id: playerId }),
            drill_type:   drillType    || 'general',
            triggered_at: new Date().toISOString(),
          },
        })

        return NextResponse.json(
          { video: { ...videoRow, analysis_status: 'ready' }, session_ready: true },
          { status: 201 }
        )
      }
    }

    return NextResponse.json({ video: videoRow }, { status: 201 })
  } catch (err) {
    console.error('Confirm error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
