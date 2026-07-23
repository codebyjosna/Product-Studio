/** Shared video format presets (Edge copy — keep in sync with src/lib/videoFormat.ts). */

export type VideoDurationSec = 10 | 20 | 30 | 60
export type OmniAspectRatio = '16:9' | '9:16'

export const VIDEO_DURATIONS: readonly VideoDurationSec[] = [10, 20, 30, 60]

export const VIDEO_ASPECT_RATIOS = [
  '16:9',
  '9:16',
  '1:1',
  '4:5',
  '4:3',
  '3:4',
  '2:3',
  '21:9',
] as const

export function isVideoDuration(n: unknown): n is VideoDurationSec {
  return typeof n === 'number' && (VIDEO_DURATIONS as readonly number[]).includes(n)
}

export function isVideoAspectRatio(s: unknown): s is string {
  return typeof s === 'string' && (VIDEO_ASPECT_RATIOS as readonly string[]).includes(s)
}

export function toOmniAspectRatio(ratio: string): OmniAspectRatio {
  const [wRaw, hRaw] = ratio.split(':')
  const w = Number(wRaw)
  const h = Number(hRaw)
  if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) return '16:9'
  return h > w ? '9:16' : '16:9'
}

export function shotCeilingForDuration(durationSec: number): { min: number; max: number } {
  if (durationSec >= 60) return { min: 10, max: 24 }
  if (durationSec >= 30) return { min: 6, max: 16 }
  if (durationSec >= 20) return { min: 4, max: 12 }
  return { min: 2, max: 7 }
}

export function normalizeVideoFormat(body: {
  durationSec?: unknown
  aspectRatio?: unknown
}): { durationSec: VideoDurationSec; aspectRatio: string } {
  const durationSec = isVideoDuration(Number(body.durationSec))
    ? (Number(body.durationSec) as VideoDurationSec)
    : 10
  const aspectRatio = isVideoAspectRatio(body.aspectRatio) ? String(body.aspectRatio) : '16:9'
  return { durationSec, aspectRatio }
}
