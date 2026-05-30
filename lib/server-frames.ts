import { execFileSync } from 'child_process'
import { writeFileSync, readFileSync, existsSync, unlinkSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { randomUUID } from 'crypto'

// ffmpeg-static ships a prebuilt Linux x64 binary — works on Vercel's Node runtime
// eslint-disable-next-line @typescript-eslint/no-require-imports
const FFMPEG_PATH = require('ffmpeg-static') as string | null

/**
 * Extract N evenly-spaced frames from a video buffer using FFmpeg.
 * Handles any codec (H.264, HEVC/H.265, VP9, AV1, etc.).
 * Returns base64-encoded JPEG strings.
 */
export function extractFramesFromBuffer(
  videoBuffer: Buffer,
  fileExt: string,
  count = 8
): string[] {
  if (!FFMPEG_PATH) {
    throw new Error('ffmpeg-static binary not found — cannot extract frames server-side')
  }

  const id       = randomUUID()
  const tmp      = tmpdir()
  const videoIn  = join(tmp, `pf_${id}.${fileExt}`)
  const frames: string[] = []

  writeFileSync(videoIn, videoBuffer)

  try {
    // ── 1. Probe duration ────────────────────────────────────────────────────
    let duration = 7 // safe default for short clips
    try {
      execFileSync(FFMPEG_PATH, ['-i', videoIn, '-f', 'null', '-'], {
        stdio: ['ignore', 'ignore', 'pipe'],
        timeout: 15_000,
      })
    } catch (probeErr: unknown) {
      // ffmpeg exits 1 for -f null but writes Duration: to stderr
      const stderr = (probeErr as { stderr?: Buffer | string })?.stderr?.toString() ?? ''
      const m = stderr.match(/Duration:\s*(\d+):(\d+):(\d+\.?\d*)/)
      if (m) duration = +m[1] * 3600 + +m[2] * 60 + +m[3]
    }

    const interval = duration / (count + 1)

    // ── 2. Extract one frame per timestamp ───────────────────────────────────
    for (let i = 1; i <= count; i++) {
      const ts        = (interval * i).toFixed(3)
      const frameOut  = join(tmp, `pf_${id}_${i}.jpg`)
      try {
        execFileSync(FFMPEG_PATH, [
          '-ss', ts,
          '-i',  videoIn,
          '-vframes', '1',
          '-vf', 'scale=640:-2',   // 640px wide, height divisible by 2
          '-q:v', '3',             // ~75% JPEG quality
          '-y',  frameOut,
        ], { timeout: 12_000 })

        if (existsSync(frameOut)) {
          frames.push(readFileSync(frameOut).toString('base64'))
          unlinkSync(frameOut)
        }
      } catch {
        // Skip this timestamp if FFmpeg fails on it — still return whatever we got
      }
    }
  } finally {
    try { unlinkSync(videoIn) } catch { /* ignore cleanup errors */ }
  }

  if (frames.length === 0) {
    throw new Error('FFmpeg could not extract any frames from the video. Check the file is a valid video.')
  }

  return frames
}
