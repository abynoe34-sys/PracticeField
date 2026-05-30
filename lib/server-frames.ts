import { execFileSync } from 'child_process'
import { writeFileSync, readFileSync, existsSync, unlinkSync, chmodSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { randomUUID } from 'crypto'

let _ffmpegBin: string | null = null

/**
 * Get the FFmpeg binary path, copying it to /tmp if needed.
 * On Vercel, /var/task (node_modules) is read-only and webpack resolves paths
 * at build time — copying to /tmp guarantees a writable, executable binary at runtime.
 */
function getFFmpegBin(): string {
  if (_ffmpegBin) return _ffmpegBin

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const staticPath = require('ffmpeg-static') as string | null
  console.log('ffmpeg-static resolved path:', staticPath)

  if (!staticPath) throw new Error('ffmpeg-static package not found')

  // Copy to /tmp so we can set the executable bit (node_modules may be read-only)
  const tmpBin = join(tmpdir(), 'pf_ffmpeg')
  if (!existsSync(tmpBin)) {
    const binBuf = readFileSync(staticPath)
    writeFileSync(tmpBin, binBuf, { mode: 0o755 })
    console.log('FFmpeg binary copied to:', tmpBin)
  }

  _ffmpegBin = tmpBin
  return _ffmpegBin
}

/**
 * Extract N evenly-spaced frames from a video buffer using FFmpeg.
 * Handles any codec (H.264, HEVC/H.265, VP9, AV1, MOV, AVI, etc.).
 * Returns base64-encoded JPEG strings.
 */
export function extractFramesFromBuffer(
  videoBuffer: Buffer,
  fileExt: string,
  count = 8
): string[] {
  const FFMPEG_BIN = getFFmpegBin()
  console.log('Using FFmpeg binary:', FFMPEG_BIN, '| buffer size:', videoBuffer.length)

  const id      = randomUUID()
  const tmp     = tmpdir()
  const videoIn = join(tmp, `pf_${id}.${fileExt}`)
  const frames: string[] = []
  const errors: string[] = []

  writeFileSync(videoIn, videoBuffer)
  console.log('Video written to:', videoIn)

  try {
    // ── 1. Probe duration ──────────────────────────────────────────────────
    let duration = 7 // safe default for short clips
    try {
      execFileSync(FFMPEG_BIN, ['-i', videoIn, '-f', 'null', '-'], {
        stdio: ['ignore', 'ignore', 'pipe'],
        timeout: 15_000,
      })
    } catch (probeErr: unknown) {
      // ffmpeg exits 1 for -f null but writes Duration: to stderr
      const stderr = (probeErr as { stderr?: Buffer | string })?.stderr?.toString() ?? ''
      const m = stderr.match(/Duration:\s*(\d+):(\d+):(\d+\.?\d*)/)
      if (m) {
        duration = +m[1] * 3600 + +m[2] * 60 + +m[3]
        console.log('Probed duration:', duration, 's')
      } else {
        console.warn('Could not parse duration from ffprobe, using default. stderr snippet:', stderr.slice(0, 300))
      }
    }

    const interval = duration / (count + 1)
    console.log(`Extracting ${count} frames at interval ${interval.toFixed(2)}s`)

    // ── 2. Extract one frame per timestamp ────────────────────────────────
    for (let i = 1; i <= count; i++) {
      const ts       = (interval * i).toFixed(3)
      const frameOut = join(tmp, `pf_${id}_${i}.jpg`)
      try {
        execFileSync(FFMPEG_BIN, [
          '-ss', ts,
          '-i',  videoIn,
          '-vframes', '1',
          '-vf', 'scale=640:-2',
          '-q:v', '3',
          '-y',  frameOut,
        ], { timeout: 12_000 })

        if (existsSync(frameOut)) {
          frames.push(readFileSync(frameOut).toString('base64'))
          unlinkSync(frameOut)
        } else {
          errors.push(`frame ${i}: output file not created`)
        }
      } catch (frameErr: unknown) {
        const msg    = (frameErr as { message?: string }).message ?? 'unknown'
        const stderr = (frameErr as { stderr?: Buffer | string })?.stderr?.toString().slice(0, 200) ?? ''
        errors.push(`frame ${i} at ${ts}s: ${msg} | ${stderr}`)
      }
    }

    console.log(`Extracted ${frames.length}/${count} frames. Errors:`, errors)
  } finally {
    try { unlinkSync(videoIn) } catch { /* ignore cleanup */ }
  }

  if (frames.length === 0) {
    throw new Error(
      `FFmpeg could not extract any frames. Errors: ${errors.slice(0, 3).join(' | ')}`
    )
  }

  return frames
}
