import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/supabase'
import { generateId } from '@/lib/utils'

// Allow up to 60 seconds for large file uploads to Supabase Storage
export const maxDuration = 60

// POST /api/videos/upload
// Receives multipart form data: file + metadata fields
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()

    const file      = formData.get('file') as File | null
    const playerId  = formData.get('player_id') as string
    const coachId   = formData.get('coach_id') as string
    const sessionId = formData.get('session_id') as string | null
    const label     = formData.get('label') as string | null
    const drillType = formData.get('drill_type') as string | null
    const notes     = formData.get('notes') as string | null
    const isBaseline = formData.get('is_baseline') === 'true'

    if (!file || !playerId || !coachId) {
      return NextResponse.json(
        { error: 'file, player_id, and coach_id are required' },
        { status: 400 }
      )
    }

    // Validate file type
    const allowed = ['video/mp4', 'video/quicktime', 'video/webm', 'video/x-msvideo']
    if (!allowed.includes(file.type)) {
      return NextResponse.json(
        { error: 'Unsupported file type. Use MP4, MOV, WebM, or AVI.' },
        { status: 400 }
      )
    }

    // Max 500MB
    if (file.size > 524_288_000) {
      return NextResponse.json({ error: 'File too large. Max 500MB.' }, { status: 400 })
    }

    const db = getAdminClient()
    const fileExt = file.name.split('.').pop() ?? 'mp4'
    const storagePath = `${coachId}/${playerId}/${generateId()}.${fileExt}`

    // Upload to Supabase Storage
    const bytes = await file.arrayBuffer()
    const { error: uploadError } = await db.storage
      .from('session-videos')
      .upload(storagePath, bytes, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) {
      return NextResponse.json({ error: `Storage upload failed: ${uploadError.message}` }, { status: 500 })
    }

    // Insert metadata row
    const { data: videoRow, error: dbError } = await db
      .from('session_videos')
      .insert({
        player_id:       playerId,
        coach_id:        coachId,
        session_id:      sessionId || null,
        storage_path:    storagePath,
        file_name:       file.name,
        file_size_bytes: file.size,
        label:           label || file.name,
        drill_type:      drillType || 'general',
        notes:           notes || null,
        is_baseline:     isBaseline,
        analysis_status: 'pending',
        frame_paths:     [],
      })
      .select()
      .single()

    if (dbError) {
      // Clean up orphaned storage file
      await db.storage.from('session-videos').remove([storagePath])
      return NextResponse.json({ error: dbError.message }, { status: 500 })
    }

    return NextResponse.json({ video: videoRow }, { status: 201 })
  } catch (err) {
    console.error('Video upload error:', err)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
