import { NonRetriableError } from 'inngest'
import { inngest } from '@/lib/inngest'
import { getAdminClient } from '@/lib/supabase'

type SessionReadyData = {
  session_id:         string
  player_id?:         string | null
  player_account_id?: string | null
  drill_type:         string
  // fault_type / line_side / position — the stance-analysis context that the
  // deferred calibration/ruleset work will judge against. IMPORTANT (item 3,
  // 2026-07-19): nothing in the app captures these yet — no film-time form, no
  // field on upload. The confirm route that fires this event does NOT include
  // them, so in practice they arrive undefined. They are passed through as-is
  // (undefined → null) and must NOT be back-filled with fabricated defaults:
  // doing so ('guard_tackle'/'right'/'none') made feedback confidently label
  // every session — e.g. "as a guard or tackle…" for a center — which is
  // exactly the fabrication the 2026-07-17 honest-feedback fix removed
  // upstream. Passing null lets service/feedback.py's UNKNOWN hedging apply.
  // See CLAUDE.md "position/line_side/fault_type not captured" for the
  // capture-point finding.
  fault_type?:        string
  line_side?:         string
  position?:          string
  triggered_at:       string
}

// Triggered by 'analysis/session.ready' — fired by the upload route when
// a session first has at least one side clip and one front clip.
//
// Validates session state with a fresh DB read (never trusts the event
// payload alone), transitions status to 'processing', then calls the
// Python analysis service with both clip storage paths.
export const olStanceAnalysis = inngest.createFunction(
  {
    id:       'ol-stance-analysis',
    triggers: [{ event: 'analysis/session.ready' }],
  },
  async ({ event, step }) => {
    const data = event.data as SessionReadyData
    const { session_id } = data

    console.log(`[ol-stance-analysis] received event for session ${session_id}`)

    // ── Step 1: fresh DB read — validate session is genuinely ready ───────────
    const clips = await step.run('validate-session', async () => {
      const db = getAdminClient()

      const { data: rows, error } = await db
        .from('session_videos')
        .select('id, view_angle, analysis_status, storage_path, drill_type, media_type')
        .eq('session_id', session_id)
        .not('view_angle', 'is', null)

      if (error) {
        throw new Error(`DB query failed: ${error.message}`)
      }

      console.log(
        `[ol-stance-analysis] session ${session_id}: ` +
        `found ${rows?.length ?? 0} view-tagged clips`
      )

      const sideClips  = (rows ?? []).filter(c => c.view_angle === 'side')
      const frontClips = (rows ?? []).filter(c => c.view_angle === 'front')
      const readyClips = (rows ?? []).filter(c => c.analysis_status === 'ready')

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
      if (readyClips.length === 0) {
        throw new NonRetriableError(
          'no clips in ready status — session may already be processing or complete'
        )
      }

      // Feature A (analyzed stance photos) server-side backstop: TwoClipUpload.tsx
      // already prevents picking a mismatched pair client-side, but this is a
      // fresh DB read, not the event payload — the same "never trust, always
      // re-verify" discipline this step already applies to pairing/readiness.
      // A mixed pair has no well-defined analysis path (which MediaPipe running
      // mode would /analyse even use?), so it's rejected rather than guessed at.
      const sideMediaType  = sideClips[0].media_type  as string
      const frontMediaType = frontClips[0].media_type as string
      if (sideMediaType !== frontMediaType) {
        throw new NonRetriableError(
          `side and front clips have different media_type (${sideMediaType} vs ${frontMediaType}) — a session's pair must be all-video or all-photo`
        )
      }

      return {
        sideCount:      sideClips.length,
        frontCount:     frontClips.length,
        sideClipPath:   sideClips[0].storage_path  as string,
        frontClipPath:  frontClips[0].storage_path as string,
        drillType:      (sideClips[0].drill_type ?? data.drill_type) as string,
        mediaType:      sideMediaType,
      }
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

    // ── Step 3: call the Python analysis service ──────────────────────────────
    await step.run('call-analysis-service', async () => {
      const serviceUrl    = process.env.ANALYSIS_SERVICE_URL
      const serviceSecret = process.env.ANALYSIS_SERVICE_SECRET

      if (!serviceUrl || !serviceSecret) {
        throw new NonRetriableError(
          'ANALYSIS_SERVICE_URL and ANALYSIS_SERVICE_SECRET must be set'
        )
      }

      const body = {
        session_id:      session_id,
        side_clip_path:  clips.sideClipPath,
        front_clip_path: clips.frontClipPath,
        drill_type:      clips.drillType,
        // Honest passthrough (item 3) — NOT fabricated defaults. null when
        // uncaptured, so /feedback hedges instead of inventing a position.
        fault_type:      data.fault_type  ?? null,
        line_side:       data.line_side   ?? null,
        position:        data.position    ?? null,
        media_type:      clips.mediaType,
      }

      console.log(
        `[ol-stance-analysis] calling analysis service at ${serviceUrl}/analyse`,
        { session_id, side_clip_path: clips.sideClipPath }
      )

      let res: Response
      try {
        res = await fetch(`${serviceUrl}/analyse`, {
          method:  'POST',
          headers: {
            'Content-Type':     'application/json',
            'X-Service-Secret': serviceSecret,
          },
          body: JSON.stringify(body),
        })
      } catch (err) {
        // Network-level error — service unreachable. Retriable.
        throw new Error(`Analysis service unreachable: ${String(err)}`)
      }

      if (!res.ok) {
        const detail = await res.text().catch(() => res.statusText)
        // Service returned an error — retriable (might be transient).
        throw new Error(
          `Analysis service returned ${res.status}: ${detail}`
        )
      }

      const result = await res.json()
      console.log(
        `[ol-stance-analysis] analysis service completed for session ${session_id}`,
        { status: result.status }
      )

      return result
    })

    return {
      session_id,
      status:  'complete',
      message: 'analysis service call succeeded',
    }
  }
)
