import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient, getSupabaseClient } from '@/lib/supabase'
import { requireCoachSession } from '@/lib/require-coach'

type RouteContext = { params: Promise<{ photoId: string }> }
const STORAGE_BUCKET = 'session-videos'

// DELETE /api/reference-photos/[photoId] — storage-first delete, ownership
// checked (coach who owns the player, or the player themself). Same
// discipline as DELETE /api/players/[playerId] and DELETE
// /api/sessions/[sessionId]: remove the Storage object before touching the
// DB row, so a storage failure never orphans nothing (aborts before any DB
// row is touched) and a DB failure after a successful storage delete is
// logged clearly rather than silently swallowed.
export async function DELETE(req: NextRequest, { params }: RouteContext) {
  try {
    const { photoId } = await params
    const db = getAdminClient()

    const { data: photo, error: photoError } = await db
      .from('reference_photos')
      .select('id, coach_id, player_account_id, storage_path')
      .eq('id', photoId)
      .single()

    if (photoError || !photo) {
      return NextResponse.json({ error: 'Reference photo not found.' }, { status: 404 })
    }

    // ── Ownership — coach-managed vs self-signup, same fresh-read discipline
    //    as every other delete route in this app ──────────────────────────────
    if (photo.coach_id) {
      const auth = await requireCoachSession()
      if ('error' in auth) return auth.error
      if (photo.coach_id !== auth.coachId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    } else {
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
        .eq('id', photo.player_account_id)
        .eq('auth_user_id', user.id)
        .single()
      if (accountError || !account) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    if (photo.storage_path) {
      const { error: storageError } = await db.storage
        .from(STORAGE_BUCKET)
        .remove([photo.storage_path])
      if (storageError) {
        console.error(
          `[DELETE /api/reference-photos/${photoId}] storage delete failed, aborting — no DB row touched`,
          storageError
        )
        return NextResponse.json(
          { error: `Failed to delete storage file: ${storageError.message}` },
          { status: 500 }
        )
      }
    }

    const { error: deleteError } = await db
      .from('reference_photos')
      .delete()
      .eq('id', photoId)

    if (deleteError) {
      console.error(
        `[DELETE /api/reference-photos/${photoId}] storage file deleted but DB delete failed — needs manual reconciliation`,
        deleteError
      )
      return NextResponse.json(
        { error: `Storage file deleted but database cleanup failed: ${deleteError.message}. This needs manual reconciliation.` },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('DELETE /api/reference-photos/[photoId] failed', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
