import { inngest } from '@/lib/inngest'
import { runImmediateCheck, runDigest } from '@/lib/monitoring'

// Scheduled pipeline monitoring (2026-07-27). Inngest crons are the cleanest
// scheduler here: already wired, no interval limits, and triggered ONLY via the
// signing-key-gated /api/inngest endpoint — so there is no new publicly-
// triggerable surface to protect. (A protected manual/verification trigger also
// exists at POST /api/monitor/run — see that route.)
//
// ⚠️ ACTIVATION: like every Inngest function here, these must be SYNCED in the
// Inngest dashboard after deploy before the crons start firing (CLAUDE.md
// Gotcha #2 — apps do not auto-register). Until synced, use /api/monitor/run.

export const monitorImmediate = inngest.createFunction(
  { id: 'monitor-immediate', triggers: [{ cron: '*/20 * * * *' }] },
  async () => runImmediateCheck(),
)

export const monitorDigest = inngest.createFunction(
  { id: 'monitor-digest', triggers: [{ cron: '0 13 * * *' }] }, // once daily, ~13:00 UTC
  async () => runDigest(),
)
