import { NonRetriableError } from 'inngest'
import { inngest } from '@/lib/inngest'
import { getAdminClient } from '@/lib/supabase'

type SessionReadyData = {
  session_id:         string
  player_id?:         string | null
  player_account_id?: string | null
  drill_type:         string
  triggered_at:       string
}

// Triggered by 'analysis/session.ready' — fired by the upload route when
// a session first has at least one side clip and one front clip.
//
// Validates session state with a fresh DB read (never trusts the event
// payload alone), transitions status to 'processing', then stops cleanly —
// the MediaPipe service is not yet connected.
export const olStanceAnalysis = inngest.createFunction(
  {
    id:       'ol-stance-analysis',
    triggers: [{ event: 'analysis/session.ready' }],
  },
  async ({ event, step }) => {
    const { session_id } = event.data as SessionReadyData

    console.log(`[ol-stance-analysis] received event for session ${session_id}`)

    // ── Step 1: fresh DB read — validate session is genuinely ready ───────────
    const clips = await step.run('validate-session', async () => {
      const db = getAdminClient()

      const { data, error } = await db
        .from('session_videos')
        .select('id, view_angle, analysis_status')
        .eq('session_id', session_id)
        .not('view_angle', 'is', null)

      if (error) {
        throw new Error(`DB query failed: ${error.message}`)
      }

      console.log(
        `[ol-stance-analysis] session ${session_id}: ` +
        `found ${data?.length ?? 0} view-tagged clips`
      )

      const sideClips  = (data ?? []).filter(c => c.view_angle === 'side')
      const frontClips = (data ?? []).filter(c => c.view_angle === 'front')
      const readyClips = (data ?? []).filter(c => c.analysis_status === 'ready')

      console.log(
        `[ol-stance-analysis] side: ${sideClips.length}, ` +
        `front: ${frontClips.length}, ready: ${readyClips.length}`
      )

      // NonRetriableError: retries won't fix these — the data is genuinely missing
      // or the session is in the wrong state. Standard Error is used above for
      // DB connection failures where a retry might actually succeed.
      if (sideClips.length === 0) {
        throw new NonRetriableError('no side-view clips found for this session')
      }
      if (frontClips.length === 0) {
        throw new NonRetriableError('no front-view clips found for this session')
      }
      // Guards against stale or duplicate events firing after the session
      // has already been picked up by a previous job run.
      if (readyClips.length === 0) {
        throw new NonRetriableError(
          'no clips in ready status — session may already be processing or complete'
        )
      }

      return { sideCount: sideClips.length, frontCount: frontClips.length }
    })

    console.log(
      `[ol-stance-analysis] session ${session_id} passed validation — ` +
      `${clips.sideCount} side, ${clips.frontCount} front`
    )

    // ── Step 2: transition to 'processing' ────────────────────────────────────
    await step.run('mark-processing', async () => {
      const db = getAdminClient()

      const { error } = await db
        .from('session_videos')
        .update({
          analysis_status: 'processing',
          job_started_at:  new Date().toISOString(),
          analysis_error:  null,
        })
        .eq('session_id', session_id)
        .not('view_angle', 'is', null)

      if (error) {
        throw new Error(`Failed to mark session as processing: ${error.message}`)
      }

      console.log(`[ol-stance-analysis] session ${session_id} → processing`)
    })

    // ── Step 3: MediaPipe service stub ────────────────────────────────────────
    // The Python MediaPipe service is not yet connected.
    // This step is intentionally a no-op until the service is built.
    await step.run('dispatch-to-mediapipe', async () => {
      console.log(
        `[ol-stance-analysis] MediaPipe service not yet connected — ` +
        `job queued and waiting (session ${session_id})`
      )
    })

    return {
      session_id,
      status:  'queued',
      message: 'MediaPipe service not yet connected — job queued and waiting',
    }
  }
)
